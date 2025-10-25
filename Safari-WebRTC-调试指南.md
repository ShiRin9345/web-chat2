# Safari WebRTC 调试指南

## 问题：仍然出现 "no pending remote description" 错误

如果在 Safari 浏览器作为接收方时仍然出现错误，请按照以下步骤进行调试：

## 第一步：查看完整的控制台日志

在 Safari 控制台中，你应该看到以下日志序列：

### 正常情况（应该看到的）：

```
收到 Offer: {offer: {...}, fromUserId: "..."}
🔵 设置远程描述 (Offer), 当前 signalingState: stable
✅ 远程描述设置成功，signalingState: have-remote-offer
✅ 状态已稳定，可以创建 Answer
处理缓存的 ICE candidates, 数量: 0
准备创建 Answer, signalingState: have-remote-offer
🔵 开始创建 Answer, PeerConnection 状态: have-remote-offer
📝 调用 createAnswer()...
✅ 创建 Answer 成功: answer
📝 设置本地描述...
✅ 设置本地描述成功, 状态: stable
📤 发送 Answer 给好友: xxx
```

### 异常情况（如果看到这些）：

**情况 1：状态卡在等待**
```
收到 Offer
设置远程描述 (Offer), 当前 signalingState: stable
远程描述设置成功，signalingState: stable  ❌ 应该是 have-remote-offer
⏳ 等待状态转换... stable
⏳ 等待状态转换... stable
...
```

**情况 2：状态是 have-local-offer**
```
收到 Offer
设置远程描述 (Offer), 当前 signalingState: have-local-offer  ❌ 不应该
```

**情况 3：remoteDescription 为空**
```
🔵 开始创建 Answer, PeerConnection 状态: have-remote-offer
❌ 没有远程描述  ❌ remoteDescription 丢失
```

## 第二步：根据日志定位问题

### 问题 A：状态一直是 stable，没有转换到 have-remote-offer

**可能原因：**
- Offer 格式不正确
- PeerConnection 已经有其他操作在进行
- Safari 版本太旧

**解决方法：**

在 Safari 控制台手动执行以下代码，查看 Offer 的内容：

```javascript
// 在收到 Offer 后，复制控制台中的 Offer 对象
console.log('Offer SDP:', offer.sdp);
console.log('Offer type:', offer.type);
```

检查：
- `offer.type` 必须是 `"offer"`
- `offer.sdp` 必须包含 `v=0`, `m=audio`, `m=video` 等

### 问题 B：signalingState 是 have-local-offer

**可能原因：**
- PeerConnection 被多次使用
- 之前的连接没有正确清理

**解决方法：**

1. 检查是否多次创建了 PeerConnection
2. 在控制台执行：

```javascript
// 查看当前所有 PeerConnection
console.log('当前 PC 状态:', pc.signalingState);
console.log('localDescription:', pc.localDescription);
console.log('remoteDescription:', pc.remoteDescription);
```

3. 如果发现有 localDescription，说明之前有残留，需要重置：

```javascript
// 尝试 rollback
await pc.setLocalDescription({type: 'rollback'});
console.log('rollback 后状态:', pc.signalingState);
```

### 问题 C：remoteDescription 为 null

**可能原因：**
- `setRemoteDescription` 调用失败但没有抛出错误
- Safari 的异步处理问题

**解决方法：**

添加额外的验证代码，在 `handleReceiveOffer` 中：

```typescript
await pc.setRemoteDescription(new RTCSessionDescription(data.offer));

// 立即检查
if (!pc.remoteDescription) {
  console.error('❌ setRemoteDescription 成功但 remoteDescription 为 null！');
  console.log('尝试重新设置...');
  await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
}

console.log('remoteDescription 验证:', {
  type: pc.remoteDescription?.type,
  hasSdp: !!pc.remoteDescription?.sdp,
});
```

## 第三步：Safari 特定的调试

### 1. 检查 Safari 版本

Safari 的 WebRTC 实现在不同版本有差异：

```javascript
console.log('Safari 版本:', navigator.userAgent);
console.log('WebRTC 支持:', {
  RTCPeerConnection: !!window.RTCPeerConnection,
  getUserMedia: !!navigator.mediaDevices?.getUserMedia,
});
```

**要求：**
- Safari 14.1+ （macOS Big Sur 或更高）
- Safari 14.5+ （iOS 14.5 或更高）

### 2. 启用 Safari 的详细日志

在 Safari 中：
1. 开发 → 实验性功能 → 启用 "WebRTC mDNS ICE candidates"
2. 开发 → 实验性功能 → 启用 "WebRTC Unified Plan"

### 3. 使用 Safari 的 WebRTC Internals

Safari 没有像 Chrome 那样的 `chrome://webrtc-internals`，但可以手动监听事件：

```javascript
pc.addEventListener('signalingstatechange', () => {
  console.log('📊 signalingstatechange:', pc.signalingState);
});

pc.addEventListener('iceconnectionstatechange', () => {
  console.log('🧊 iceconnectionstatechange:', pc.iceConnectionState);
});

pc.addEventListener('connectionstatechange', () => {
  console.log('🔗 connectionstatechange:', pc.connectionState);
});

pc.addEventListener('negotiationneeded', () => {
  console.log('🤝 negotiationneeded');
});
```

## 第四步：临时添加更详细的日志

修改 `handleReceiveOffer` 添加更详细的调试：

```typescript
const handleReceiveOffer = async (data) => {
  const pc = peerConnectionRef.current;
  
  console.log('=== 开始处理 Offer ===');
  console.log('1️⃣ PC 初始状态:', {
    signalingState: pc.signalingState,
    iceConnectionState: pc.iceConnectionState,
    iceGatheringState: pc.iceGatheringState,
    connectionState: pc.connectionState,
    hasLocalDescription: !!pc.localDescription,
    hasRemoteDescription: !!pc.remoteDescription,
  });
  
  console.log('2️⃣ Offer 内容:', {
    type: data.offer.type,
    sdpLength: data.offer.sdp?.length,
    sdpFirst100: data.offer.sdp?.substring(0, 100),
  });
  
  try {
    console.log('3️⃣ 调用 setRemoteDescription...');
    await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
    
    console.log('4️⃣ setRemoteDescription 完成后:', {
      signalingState: pc.signalingState,
      remoteDescription: {
        type: pc.remoteDescription?.type,
        hasSdp: !!pc.remoteDescription?.sdp,
      },
    });
    
    // 等待状态稳定...
    
    console.log('5️⃣ 准备创建 Answer:', {
      signalingState: pc.signalingState,
      canCreateAnswer: pc.signalingState === 'have-remote-offer',
    });
    
    await createAnswer(pc);
    
    console.log('=== Offer 处理完成 ===');
  } catch (err) {
    console.error('❌ 处理失败:', err);
    console.error('失败时状态:', {
      signalingState: pc.signalingState,
      hasRemoteDescription: !!pc.remoteDescription,
    });
  }
};
```

## 第五步：可能的解决方案

### 方案 1：使用 Perfect Negotiation 模式

如果问题持续存在，考虑使用 WebRTC 的 Perfect Negotiation 模式：

```typescript
// 这是一个更健壮的实现
const handleReceiveOffer = async (data) => {
  const pc = peerConnectionRef.current;
  const isStable = pc.signalingState === 'stable' || 
                   pc.signalingState === 'have-local-offer';
  
  const offerCollision = !isStable;
  
  if (offerCollision) {
    console.log('检测到 Offer 冲突，执行 rollback');
    await pc.setLocalDescription({type: 'rollback'});
  }
  
  await pc.setRemoteDescription(data.offer);
  await createAnswer(pc);
};
```

### 方案 2：添加重试机制

```typescript
const createAnswerWithRetry = async (pc, maxRetries = 3) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      console.log(`尝试创建 Answer (${i + 1}/${maxRetries})`);
      
      if (pc.signalingState !== 'have-remote-offer') {
        console.warn(`状态不正确: ${pc.signalingState}，等待...`);
        await new Promise(resolve => setTimeout(resolve, 200 * (i + 1)));
        continue;
      }
      
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      
      console.log('✅ Answer 创建成功');
      return answer;
    } catch (err) {
      console.error(`第 ${i + 1} 次尝试失败:`, err);
      if (i === maxRetries - 1) throw err;
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
};
```

### 方案 3：完全重置 PeerConnection

如果上述方案都不行，考虑在接收 Offer 前重置 PeerConnection：

```typescript
const handleReceiveOffer = async (data) => {
  let pc = peerConnectionRef.current;
  
  // 如果状态异常，重新创建 PeerConnection
  if (pc.signalingState !== 'stable') {
    console.warn('状态异常，重新创建 PeerConnection');
    pc.close();
    pc = createPeerConnection();
    // 重新添加本地流...
  }
  
  await pc.setRemoteDescription(data.offer);
  await createAnswer(pc);
};
```

## 第六步：联系我提供日志

如果以上所有方法都不行，请提供以下信息：

1. **Safari 版本：** 
2. **完整的控制台日志：**（从 "收到 Offer" 到错误发生）
3. **PC 状态信息：**
   ```javascript
   console.log({
     signalingState: pc.signalingState,
     iceConnectionState: pc.iceConnectionState,
     connectionState: pc.connectionState,
     hasLocalDescription: !!pc.localDescription,
     hasRemoteDescription: !!pc.remoteDescription,
   });
   ```
4. **是否出现其他错误或警告**

## 快速检查清单

在测试前，请确认：

- [ ] Safari 版本 ≥ 14.1
- [ ] 已清除浏览器缓存
- [ ] 已允许摄像头和麦克风权限
- [ ] 没有其他 WebRTC 连接同时运行
- [ ] 控制台没有其他 JavaScript 错误
- [ ] 网络连接稳定
- [ ] Chrome 作为接收方时正常工作（排除后端问题）

通过这些步骤，我们应该能定位到 Safari 的具体问题所在！
