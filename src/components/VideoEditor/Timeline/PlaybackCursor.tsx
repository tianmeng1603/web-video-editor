import React, { useState, useEffect } from "react";
import { TimelineClip } from "../types";

interface PlaybackCursorProps {
  currentTime: number;
  clips: TimelineClip[];
  pixelsPerSecond: number;
  onTimeChange: (time: number) => void;
  onShowSnapLines: (lines: number[]) => void;
  containerRef: React.RefObject<HTMLDivElement | null>;
}

const PlaybackCursorComponent: React.FC<PlaybackCursorProps> = ({
  currentTime,
  clips,
  pixelsPerSecond,
  onTimeChange,
  onShowSnapLines,
  containerRef,
}) => {
  const [scrollLeft, setScrollLeft] = useState(0);

  // 监听容器滚动
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      setScrollLeft(container.scrollLeft);
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [containerRef]);
  // 播放头位置，考虑滚动偏移
  const playheadLeft = currentTime * pixelsPerSecond + 20 - scrollLeft;

  const handleCursorDragStart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startTime = currentTime;
    const startScrollLeft = containerRef.current?.scrollLeft || 0;

    document.body.style.cursor = "ew-resize";
    document.body.style.userSelect = "none";

    const handleMouseMove = (moveEvent: MouseEvent) => {
      moveEvent.preventDefault();
      const currentScrollLeft = containerRef.current?.scrollLeft || 0;
      const scrollDelta = currentScrollLeft - startScrollLeft;
      const deltaX = moveEvent.clientX - startX + scrollDelta;
      const deltaTime = deltaX / pixelsPerSecond;

      // 限制在素材最大长度内（减去播放头宽度对应的时间）
      const maxClipEnd =
        clips.length > 0 ? Math.max(...clips.map((c) => c.end)) : 0;
      const playheadWidthTime = 2 / pixelsPerSecond; // 播放头宽度2px对应的时间
      const maxDragTime = maxClipEnd - playheadWidthTime;
      const rawTime = Math.max(0, Math.min(maxDragTime, startTime + deltaTime));

      // 收集吸附点
      const snapPoints: number[] = [];
      clips.forEach((clip) => {
        snapPoints.push(clip.start);
        snapPoints.push(clip.end);
      });

      // 吸附逻辑
      const snapThreshold = 0.1;
      let snappedTime = rawTime;
      let minDistance = Infinity;

      snapPoints.forEach((point) => {
        const distance = Math.abs(rawTime - point);
        if (distance < snapThreshold && distance < minDistance) {
          minDistance = distance;
          snappedTime = point;
        }
      });

      // 显示吸附线
      if (minDistance < snapThreshold) {
        onShowSnapLines([snappedTime]);
      } else {
        onShowSnapLines([]);
      }

      onTimeChange(snappedTime);
    };

    const handleMouseUp = () => {
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      onShowSnapLines([]);
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  return (
    <>
      {/* 可拖动区域（扩大交互面积） - 最上层但透明 */}
      <div
        style={{
          position: "absolute",
          left: `${playheadLeft - 10}px`,
          top: "-10px", // 从顶部图标开始（18px 图标空间 + 32px 刻度）
          height: "calc(100% + 50px)", // 覆盖所有区域
          width: "20px",
          zIndex: 1, // 在父级容器内最上层
          cursor: "ew-resize",
          userSelect: "none",
          pointerEvents: "auto", // 允许交互
        }}
        onMouseDown={handleCursorDragStart}
      />

      {/* 播放头顶部图标 - 显示在最顶部 */}
      <div
        style={{
          position: "absolute",
          left: `${playheadLeft - 4}px`,
          top: "-18px", // 在顶部图标区域
          width: "10px",
          height: "18px",
          backgroundColor: "#18181B",
          borderRadius: "0 0 5px 5px",
          boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
          zIndex: 2, // 在拖动区域之上
          pointerEvents: "none",
        }}
      />

      {/* 播放头线条（视觉元素，不可交互） */}
      <div
        style={{
          position: "absolute",
          left: `${playheadLeft}px`,
          top: "-32px", // 从刻度顶部开始
          height: "calc(100% + 32px)", // 延伸到刻度和轨道
          width: "2px",
          backgroundColor: "#848689",
          zIndex: 0, // 在最底层
          pointerEvents: "none",
          userSelect: "none",
        }}
      />
    </>
  );
};

export const PlaybackCursor = React.memo(PlaybackCursorComponent);
