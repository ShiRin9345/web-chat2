// 存储在线用户 Map<userId, socketId>
const onlineUsers = new Map<string, string>();
// 反向映射 Map<socketId, userId> 用于断开连接时查找用户
const socketToUser = new Map<string, string>();

export const onlineUserService = {
  // 添加在线用户
  addUser: (userId: string, socketId: string) => {
    onlineUsers.set(userId, socketId);
    socketToUser.set(socketId, userId);
    console.log(`用户 ${userId} 上线，socketId: ${socketId}`);
  },

  // 移除在线用户
  removeUser: (userId: string) => {
    const socketId = onlineUsers.get(userId);
    if (socketId) {
      onlineUsers.delete(userId);
      socketToUser.delete(socketId);
      console.log(`用户 ${userId} 下线，socketId: ${socketId}`);
    }
  },

  // 根据 socketId 移除用户
  removeUserBySocketId: (socketId: string) => {
    const userId = socketToUser.get(socketId);
    if (userId) {
      onlineUsers.delete(userId);
      socketToUser.delete(socketId);
      console.log(`用户 ${userId} 下线，socketId: ${socketId}`);
      return userId;
    }
    return null;
  },

  // 检查用户是否在线
  isUserOnline: (userId: string) => {
    return onlineUsers.has(userId);
  },

  // 获取在线好友列表
  getOnlineFriends: (friendIds: string[]) => {
    return friendIds.filter((id) => onlineUsers.has(id));
  },

  // 获取用户socketId
  getSocketId: (userId: string) => {
    return onlineUsers.get(userId);
  },

  // 获取所有在线用户
  getAllOnlineUsers: () => {
    return Array.from(onlineUsers.keys());
  },

  // 获取在线用户数量
  getOnlineCount: () => {
    return onlineUsers.size;
  },
};
