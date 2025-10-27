import React, {
  useRef,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useImperativeHandle,
  forwardRef,
} from "react";
import { useDebounce } from "use-debounce";
import "./VirtualList.css";

// 常量定义
const DEFAULT_ESTIMATED_HEIGHT = 80;
const BUFFER_SIZE = 5;
const OVERSCAN_SIZE = 1000;
const MAX_CACHE_SIZE = 100;
const LOADING_OFFSET = 26;
const SCROLL_THRESHOLD = 26;
const DOM_CLEANUP_INTERVAL = 60000;

// 类型定义
export interface VirtualListProps<T> {
  items: T[];
  estimatedItemHeight?: number;
  buffer?: number;
  isLoadingMore?: boolean;
  isLast?: boolean;
  listKey?: string | number;
  renderItem: (item: T, index: number) => React.ReactNode;
  onScroll?: (event: React.UIEvent) => void;
  onScrollDirectionChange?: (direction: "up" | "down") => void;
  onLoadMore?: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  onVisibleItemsChange?: (ids: string[]) => void;
}

export interface VirtualListRef {
  scrollTo: (options: {
    index?: number;
    position?: "top" | "bottom";
    behavior?: ScrollBehavior;
  }) => void;
  getContainer: () => HTMLElement | null;
}

interface VisibleRange {
  start: number;
  end: number;
}

type VirtualItem<T> = T & {
  _index: number;
  message?: { id?: string | number };
};

// 主组件
function VirtualListInner<T extends { message?: { id?: string | number } }>(
  {
    items,
    estimatedItemHeight = DEFAULT_ESTIMATED_HEIGHT,
    buffer = BUFFER_SIZE,
    isLoadingMore = false,
    isLast = false,
    listKey,
    renderItem,
    onScroll,
    onScrollDirectionChange,
    onLoadMore,
    onMouseEnter,
    onMouseLeave,
    onVisibleItemsChange,
  }: VirtualListProps<T>,
  ref: React.Ref<VirtualListRef>
) {
  // DOM 引用
  const containerRef = useRef<HTMLDivElement>(null);
  const phantomRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // 响应式状态 - 只保留必要的状态
  const [heights, setHeights] = useState<Map<string, number>>(new Map());
  const [visibleRange, setVisibleRange] = useState<VisibleRange>({
    start: 0,
    end: 0,
  });
  const [hideScrollbar, setHideScrollbar] = useState(true);

  // 非响应式变量 - 参考Vue版本,使用ref存储频繁变化的值
  const offsetRef = useRef(0);
  const rafIdRef = useRef<number | null>(null);
  const lastScrollTopRef = useRef(0);
  const consecutiveStaticFramesRef = useRef(0);
  const needsHeightRecalculationRef = useRef(true);
  const cleanupTimerIdRef = useRef<number | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const bottomLockRafIdRef = useRef<number | null>(null);
  const accumulatedHeightsRef = useRef<number[]>([]);
  const previousVisibleIdsRef = useRef<Set<string>>(new Set());
  const isScrollingRef = useRef(false);

  // 防抖的滚动事件处理
  const [debouncedScrollEvent] = useDebounce(
    useCallback(
      (event: React.UIEvent) => {
        onScroll?.(event);
      },
      [onScroll]
    ),
    16
  );

  // 直接更新phantom元素高度
  const updatePhantomHeight = useCallback((height: number) => {
    if (phantomRef.current) {
      phantomRef.current.style.height = `${height}px`;
    }
  }, []);

  // 直接更新content元素偏移
  const updateContentOffset = useCallback((offsetValue: number) => {
    if (contentRef.current) {
      contentRef.current.style.transform = `translateY(${offsetValue}px)`;
    }
  }, []);

  // 取消底部锁定
  const cancelBottomLock = useCallback(() => {
    if (bottomLockRafIdRef.current !== null) {
      cancelAnimationFrame(bottomLockRafIdRef.current);
      bottomLockRafIdRef.current = null;
    }
  }, []);

  // 启动底部锁定
  const lockBottomUntilStable = useCallback(
    (timeoutMs = 450, stableFrames = 3) => {
      const container = containerRef.current;
      if (!container) return;

      cancelBottomLock();

      let lastHeight = container.scrollHeight;
      let stable = 0;
      const start = performance.now();

      const tick = () => {
        if (!containerRef.current) {
          cancelBottomLock();
          return;
        }

        const el = containerRef.current;
        const now = performance.now();
        if (now - start > timeoutMs) {
          cancelBottomLock();
          return;
        }

        const target = Math.max(0, el.scrollHeight - el.clientHeight);
        if (el.scrollTop !== target) {
          el.scrollTop = target;
        }

        const currentHeight = el.scrollHeight;
        const heightDelta = Math.abs(currentHeight - lastHeight);
        const distanceFromBottom =
          el.scrollHeight - el.scrollTop - el.clientHeight;

        if (heightDelta <= 1 && distanceFromBottom <= 1) {
          stable++;
        } else {
          stable = 0;
        }

        lastHeight = currentHeight;

        if (stable >= stableFrames) {
          cancelBottomLock();
          return;
        }

        bottomLockRafIdRef.current = requestAnimationFrame(tick);
      };

      bottomLockRafIdRef.current = requestAnimationFrame(tick);
    },
    [cancelBottomLock]
  );

  // 鼠标事件处理
  const handleMouseEnter = useCallback(() => {
    onMouseEnter?.();
    setHideScrollbar(false);
  }, [onMouseEnter]);

  const handleMouseLeave = useCallback(() => {
    onMouseLeave?.();
    setHideScrollbar(true);
  }, [onMouseLeave]);

  // 清理过期的高度缓存
  const cleanupHeightCache = useCallback(() => {
    if (heights.size > MAX_CACHE_SIZE) {
      const keys = Array.from(heights.keys());
      const visibleKeys = new Set(
        items
          .slice(
            Math.max(0, visibleRange.start - buffer),
            visibleRange.end + buffer + 1
          )
          .map((item) => item.message?.id?.toString())
          .filter(Boolean)
      );

      const keysToDelete = keys.filter((key) => !visibleKeys.has(key));
      const deleteCount = keysToDelete.length - MAX_CACHE_SIZE / 2;

      if (deleteCount > 0) {
        setHeights((prev) => {
          const newHeights = new Map(prev);
          for (const key of keysToDelete.slice(0, deleteCount)) {
            newHeights.delete(key);
          }
          needsHeightRecalculationRef.current = true;
          return newHeights;
        });
      }
    }
  }, [heights, items, visibleRange, buffer]);

  // 更新累积高度缓存
  const updateAccumulatedHeights = useCallback(() => {
    accumulatedHeightsRef.current = [];
    let totalHeight = 0;

    items.forEach((item) => {
      const height =
        heights.get(item.message?.id?.toString() || "") || estimatedItemHeight;
      totalHeight += height;
      accumulatedHeightsRef.current.push(totalHeight);
    });
  }, [items, heights, estimatedItemHeight]);

  // 计算可见项目
  const visibleData = useMemo((): VirtualItem<T>[] => {
    return items
      .slice(visibleRange.start, visibleRange.end + 1)
      .map((item, index) => ({
        ...item,
        _index: visibleRange.start + index,
      }));
  }, [items, visibleRange]);

  // 计算列表总高度
  const totalHeight = useMemo(() => {
    if (needsHeightRecalculationRef.current) {
      updateAccumulatedHeights();
      needsHeightRecalculationRef.current = false;
    }

    if (
      accumulatedHeightsRef.current.length > 0 &&
      accumulatedHeightsRef.current.length === items.length
    ) {
      return accumulatedHeightsRef.current[
        accumulatedHeightsRef.current.length - 1
      ];
    }

    return items.reduce((total, item) => {
      return (
        total +
        (heights.get(item.message?.id?.toString() || "") || estimatedItemHeight)
      );
    }, 0);
  }, [items, heights, estimatedItemHeight, updateAccumulatedHeights]);

  // 根据滚动位置计算起始索引
  const getStartIndex = useCallback(
    (scrollTop: number) => {
      // ✅ 确保累积高度已更新
      if (needsHeightRecalculationRef.current) {
        updateAccumulatedHeights();
        needsHeightRecalculationRef.current = false;
      }

      let left = 0;
      let right = accumulatedHeightsRef.current.length - 1;
      const target = scrollTop - OVERSCAN_SIZE;

      while (left <= right) {
        const mid = Math.floor((left + right) / 2);
        if ((accumulatedHeightsRef.current[mid] ?? 0) < target) {
          left = mid + 1;
        } else {
          right = mid - 1;
        }
      }

      return Math.max(0, left - buffer);
    },
    [buffer, updateAccumulatedHeights]
  );

  // 计算指定索引的偏移量
  const getOffsetForIndex = useCallback(
    (index: number) => {
      // ✅ 确保累积高度已更新
      if (needsHeightRecalculationRef.current) {
        updateAccumulatedHeights();
        needsHeightRecalculationRef.current = false;
      }

      if (index > 0 && index < accumulatedHeightsRef.current.length) {
        return accumulatedHeightsRef.current[index - 1] || 0;
      }

      let total = 0;
      for (let i = 0; i < index; i++) {
        const item = items[i];
        if (item) {
          const itemHeight =
            heights.get(item.message?.id?.toString() || "") ||
            estimatedItemHeight;
          total += itemHeight;
        }
      }
      return total;
    },
    [heights, items, estimatedItemHeight, updateAccumulatedHeights]
  );

  // 更新可见范围
  const updateVisibleRange = useCallback(() => {
    if (!containerRef.current) return;

    const scrollTop = containerRef.current.scrollTop;
    const clientHeight = containerRef.current.clientHeight;

    const start = getStartIndex(scrollTop);
    let total = 0;
    let end = start;

    while (total < clientHeight + OVERSCAN_SIZE * 2 && end < items.length) {
      const item = items[end];
      if (item) {
        const itemHeight = getOffsetForIndex(end + 1) - getOffsetForIndex(end);
        total += itemHeight;
      }
      end++;
    }

    end = Math.min(items.length - 1, end + buffer);

    // ✅ 只有当范围真正变化时才更新
    setVisibleRange((prev) => {
      if (prev.start === start && prev.end === end) {
        return prev;
      }
      return { start, end };
    });

    const topOffset =
      (!isLoadingMore && isLast) || (isLoadingMore && !isLast) ? 32 : 0;
    const newOffset =
      getOffsetForIndex(start) +
      (isLoadingMore && !isLast ? LOADING_OFFSET : 0) +
      topOffset;

    // ✅ 避免微小抖动:只有变化超过1px才更新
    if (Math.abs(offsetRef.current - newOffset) > 1) {
      offsetRef.current = newOffset;
      updateContentOffset(newOffset);
    }
  }, [
    getStartIndex,
    getOffsetForIndex,
    items.length,
    buffer,
    isLoadingMore,
    isLast,
    updateContentOffset,
  ]);

  // 更新项目实际高度
  const updateItemHeight = useCallback(() => {
    if (!containerRef.current) return;

    let hasUpdate = false;
    const newHeights = new Map(heights);

    for (const item of visibleData) {
      const id = item.message?.id?.toString();
      if (!id) continue;

      const el = document.getElementById(`item-${id}`);
      if (el) {
        const height = el.getBoundingClientRect().height;
        const oldHeight = newHeights.get(id);

        if (oldHeight !== height) {
          newHeights.set(id, height);
          hasUpdate = true;
        }
      }
    }

    if (hasUpdate) {
      setHeights(newHeights);
      needsHeightRecalculationRef.current = true;
    }

    cleanupHeightCache();

    // ✅ 移除自动更新可见范围,避免闪烁
    // 让滚动事件或数据变化自然触发更新
  }, [visibleData, heights, cleanupHeightCache]);

  // 清理不可见的DOM节点
  const cleanupInvisibleDOMNodes = useCallback(() => {
    if (!containerRef.current) return;

    const currentVisibleIds = new Set(
      visibleData
        .map((item) => item.message?.id?.toString())
        .filter((id): id is string => Boolean(id))
    );

    const invisibleIds = Array.from(previousVisibleIdsRef.current).filter(
      (id) => !currentVisibleIds.has(id)
    );

    previousVisibleIdsRef.current = currentVisibleIds;

    if (invisibleIds.length === 0) return;

    const contentEl = containerRef.current?.querySelector(
      ".virtual-list-content"
    );
    if (!contentEl) return;

    let removedCount = 0;
    for (const id of invisibleIds) {
      const el = document.getElementById(`item-${id}`);
      if (el && !el.hasAttribute("data-preserved")) {
        el.remove();
        removedCount++;
      }
    }

    if (removedCount > 0 && (window as any).gc) {
      try {
        (window as any).gc();
      } catch (e) {
        // 忽略错误
      }
    }
  }, [visibleData]);

  // 定时清理DOM节点
  const startDOMCleanupTimer = useCallback(() => {
    if (cleanupTimerIdRef.current !== null) {
      clearInterval(cleanupTimerIdRef.current);
    }

    cleanupTimerIdRef.current = window.setInterval(() => {
      cleanupInvisibleDOMNodes();
    }, DOM_CLEANUP_INTERVAL);
  }, [cleanupInvisibleDOMNodes]);

  // 更新可见范围的帧动画处理
  const updateFrame = useCallback(() => {
    if (!containerRef.current) return;

    const currentScrollTop = containerRef.current.scrollTop;

    if (currentScrollTop < SCROLL_THRESHOLD && !isLoadingMore && !isLast) {
      onLoadMore?.();
    }

    if (currentScrollTop !== lastScrollTopRef.current) {
      consecutiveStaticFramesRef.current = 0;
      if (currentScrollTop < lastScrollTopRef.current) {
        onScrollDirectionChange?.("up");
      } else if (currentScrollTop > lastScrollTopRef.current) {
        onScrollDirectionChange?.("down");
      }
      updateVisibleRange();
      lastScrollTopRef.current = currentScrollTop;
    } else {
      consecutiveStaticFramesRef.current++;

      if (consecutiveStaticFramesRef.current >= 3) {
        isScrollingRef.current = false;
        updateItemHeight();
        if (rafIdRef.current !== null) {
          cancelAnimationFrame(rafIdRef.current);
          rafIdRef.current = null;
        }
        return;
      }
    }

    rafIdRef.current = requestAnimationFrame(updateFrame);
  }, [
    isLoadingMore,
    isLast,
    onLoadMore,
    onScrollDirectionChange,
    updateVisibleRange,
    updateItemHeight,
  ]);

  const emitVisibleItems = useCallback(() => {
    const visibleIds = visibleData
      .map((item) => item.message?.id?.toString())
      .filter(Boolean) as string[];
    onVisibleItemsChange?.(visibleIds);
  }, [visibleData, onVisibleItemsChange]);

  // 滚动事件处理
  const handleScroll = useCallback(
    (event: React.UIEvent) => {
      debouncedScrollEvent(event);
      emitVisibleItems();

      if (!isScrollingRef.current) {
        isScrollingRef.current = true;
        consecutiveStaticFramesRef.current = 0;
        if (rafIdRef.current === null) {
          rafIdRef.current = requestAnimationFrame(updateFrame);
        }
      }
    },
    [debouncedScrollEvent, emitVisibleItems, updateFrame]
  );

  // 监听列表数据变化
  useEffect(() => {
    if (items.length === 0) {
      setHeights(new Map());
      accumulatedHeightsRef.current = [];
      previousVisibleIdsRef.current.clear();
    }

    needsHeightRecalculationRef.current = true;
    updateVisibleRange();

    // 延迟更新高度
    const timer = setTimeout(() => {
      updateItemHeight();
    }, 0);

    return () => clearTimeout(timer);
  }, [items.length, listKey]);

  // 监听totalHeight变化
  useEffect(() => {
    if (typeof totalHeight === "number") {
      updatePhantomHeight(totalHeight);
    }
  }, [totalHeight, updatePhantomHeight]);

  // 生命周期管理
  useEffect(() => {
    // 初始化
    updateVisibleRange();

    const initTimer = setTimeout(() => {
      if (totalHeight !== undefined) {
        updatePhantomHeight(totalHeight);
      }
      updateContentOffset(offsetRef.current);
    }, 0);

    if (containerRef.current) {
      resizeObserverRef.current = new ResizeObserver(() => {
        updateVisibleRange();
        setTimeout(() => updateItemHeight(), 0);
      });
      resizeObserverRef.current.observe(containerRef.current);
    }

    startDOMCleanupTimer();

    return () => {
      clearTimeout(initTimer);

      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }

      if (bottomLockRafIdRef.current !== null) {
        cancelAnimationFrame(bottomLockRafIdRef.current);
        bottomLockRafIdRef.current = null;
      }

      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
        resizeObserverRef.current = null;
      }

      if (cleanupTimerIdRef.current !== null) {
        clearInterval(cleanupTimerIdRef.current);
        cleanupTimerIdRef.current = null;
      }

      setHeights(new Map());
      accumulatedHeightsRef.current = [];
      previousVisibleIdsRef.current.clear();
    };
  }, []);

  // 暴露方法
  useImperativeHandle(
    ref,
    () => ({
      scrollTo: (options: {
        index?: number;
        position?: "top" | "bottom";
        behavior?: ScrollBehavior;
      }) => {
        if (!containerRef.current) return;

        const executeScroll = () => {
          if (!containerRef.current) return;

          if (options.position === "bottom") {
            setTimeout(() => {
              updateItemHeight();
              if (needsHeightRecalculationRef.current) {
                updateAccumulatedHeights();
                needsHeightRecalculationRef.current = false;
              }
              setTimeout(() => {
                if (containerRef.current) {
                  const scrollHeight = containerRef.current.scrollHeight;
                  const clientHeight = containerRef.current.clientHeight;
                  const targetScrollTop = Math.max(
                    0,
                    scrollHeight - clientHeight
                  );

                  containerRef.current.scrollTo({
                    top: targetScrollTop,
                    behavior: options.behavior || "auto",
                  });

                  lockBottomUntilStable();
                }
              }, 0);
            }, 0);
          } else if (options.position === "top") {
            containerRef.current.scrollTo({
              top: 0,
              behavior: options.behavior || "auto",
            });
          } else if (typeof options.index === "number") {
            if (needsHeightRecalculationRef.current) {
              updateAccumulatedHeights();
              needsHeightRecalculationRef.current = false;
            }
            const offset = getOffsetForIndex(options.index ?? 0);
            containerRef.current.scrollTo({
              top: offset,
              behavior: options.behavior || "auto",
            });
          }
        };

        executeScroll();
        if (options.behavior === "smooth") {
          setTimeout(executeScroll, 100);
        }
      },
      getContainer: () => containerRef.current,
    }),
    [
      updateItemHeight,
      lockBottomUntilStable,
      getOffsetForIndex,
      updateAccumulatedHeights,
    ]
  );

  return (
    <div
      ref={containerRef}
      className={`virtual-list-container ${
        hideScrollbar ? "hide-scrollbar" : ""
      }`}
      onScroll={handleScroll}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {!isLoadingMore && isLast && (
        <div className="flex justify-center absolute left-1/2 transform -translate-x-1/2 pt-2.5">
          <span className="text-xs text-gray-500">以下是全部消息内容</span>
        </div>
      )}
      {isLoadingMore && !isLast && (
        <div className="flex justify-center items-center absolute left-1/2 transform -translate-x-1/2 pt-2.5">
          <div className="w-4 h-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600 mr-2"></div>
          <span className="text-sm text-gray-500">加载中</span>
        </div>
      )}

      <div ref={phantomRef} className="virtual-list-phantom" />

      <div ref={contentRef} className="virtual-list-content">
        {visibleData.map((item) => (
          <div
            key={item.message?.id || item._index}
            id={`item-${item.message?.id}`}
            data-item-index={item._index}
          >
            {renderItem(item as unknown as T, item._index)}
          </div>
        ))}
      </div>
    </div>
  );
}

export const VirtualList = forwardRef(VirtualListInner) as <
  T extends { message?: { id?: string | number } }
>(
  props: VirtualListProps<T> & { ref?: React.Ref<VirtualListRef> }
) => React.ReactElement;
