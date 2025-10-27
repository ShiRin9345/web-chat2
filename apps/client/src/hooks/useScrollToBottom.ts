import { useCallback, useEffect, useRef, useState } from "react";

/**
 * 管理滚动到底部的 Hook
 * 支持自动滚动、显示"回到底部"按钮
 */
export function useScrollToBottom() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const lastScrollHeightRef = useRef(0);

  // 检查是否在底部
  const checkIfAtBottom = useCallback(() => {
    const container = containerRef.current;
    if (!container) return false;

    const { scrollTop, scrollHeight, clientHeight } = container;
    const threshold = 200; // 距离底部200px以内视为"在底部"
    const atBottom = scrollHeight - scrollTop - clientHeight < threshold;
    
    setIsAtBottom(atBottom);
    setShowScrollButton(!atBottom);
    
    return atBottom;
  }, []);

  // 滚动到底部
  const scrollToBottom = useCallback((smooth = true) => {
    const container = containerRef.current;
    if (!container) return;

    container.scrollTo({
      top: container.scrollHeight,
      behavior: smooth ? "smooth" : "auto",
    });
  }, []);

  // 保持滚动位置（加载更多消息时使用）
  const maintainScrollPosition = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const oldScrollHeight = lastScrollHeightRef.current;
    
    // 使用 requestAnimationFrame 确保 DOM 已更新
    requestAnimationFrame(() => {
      const newScrollHeight = container.scrollHeight;
      const heightDiff = newScrollHeight - oldScrollHeight;

      if (heightDiff > 0) {
        // 调整滚动位置，保持用户视角不变
        container.scrollTop += heightDiff;
      }

      lastScrollHeightRef.current = newScrollHeight;
    });
  }, []);

  // 更新滚动高度记录
  const updateScrollHeight = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    lastScrollHeightRef.current = container.scrollHeight;
  }, []);

  // 监听滚动事件
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      checkIfAtBottom();
    };

    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, [checkIfAtBottom]);

  // 初始化滚动高度
  useEffect(() => {
    updateScrollHeight();
  }, [updateScrollHeight]);

  return {
    containerRef,
    showScrollButton,
    isAtBottom,
    scrollToBottom,
    maintainScrollPosition,
    updateScrollHeight,
    checkIfAtBottom,
  };
}
