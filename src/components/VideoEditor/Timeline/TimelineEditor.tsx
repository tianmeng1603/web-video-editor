import React, { useMemo, useState, useRef, useEffect } from "react";
import {
  DndContext,
  DragEndEvent,
  closestCenter,
  Modifier,
} from "@dnd-kit/core";
import { useTranslation } from "react-i18next";
import { MediaItem, TimelineClip } from "../types";
import { TimelineScale } from "./TimelineScale";
import { DroppableTrackRow } from "./DroppableTrackRow";
import { PlaybackCursor } from "./PlaybackCursor";
import { ThinScrollbar } from "../utils/Scrollbar";

interface TimelineEditorProps {
  clips: TimelineClip[];
  mediaItems: MediaItem[];
  currentTime: number;
  duration: number;
  scale: number;
  selectedClipId: string | null;
  onClipUpdate: (
    id: string,
    updates: Partial<TimelineClip>,
    options?: { skipHistory?: boolean; historyDescription?: string }
  ) => void;
  onClipRemove: (id: string) => void;
  onClipResize: (
    clipId: string,
    newStart: number,
    newEnd: number,
    edge: "left" | "right"
  ) => void;
  onClipResizeEnd?: () => void;
  onTimeChange: (time: number) => void;
  onScaleChange: (scale: number) => void;
  onClipSelect: (id: string | null) => void;
  onCursorDragStart?: (time: number) => void;
  onCursorDragEnd?: (time: number) => void;
  onTracksRemapped?: (trackIndexMap: { [oldIndex: number]: number }) => void;
  onDragStart?: () => void;
  onDragEnd?: () => void;
}

const TimelineEditorComponent: React.FC<TimelineEditorProps> = ({
  clips,
  mediaItems,
  currentTime,
  duration,
  scale,
  selectedClipId,
  onClipUpdate,
  onClipRemove,
  onClipResize,
  onClipResizeEnd,
  onTimeChange,
  onScaleChange,
  onClipSelect,
  onCursorDragStart,
  onCursorDragEnd,
  onTracksRemapped,
  onDragStart,
  onDragEnd,
}) => {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const [snapLines, setSnapLines] = useState<number[]>([]); // 辅助吸附线
  const [isDragging, setIsDragging] = useState(false);
  const [scaleScrollLeft, setScaleScrollLeft] = useState(0); // 刻度滚动偏移
  const [draggingMaxEnd, setDraggingMaxEnd] = useState<number>(0); // 拖动过程中的最大结束位置
  const lastSnapRef = useRef<{ time: number; isSnapped: boolean }>({
    time: 0,
    isSnapped: false,
  });

  // 调试：监控 TimelineEditor 渲染
  useEffect(() => {
    console.log("🎞️ [TimelineEditor] clips 状态更新:", {
      clips数量: clips.length,
      clipIds: clips.map((c) => c.id),
    });
  }, [clips]);

  // 监听轨道区域滚动，同步刻度
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      setScaleScrollLeft(container.scrollLeft);
    };

    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, []);

  // 按轨道分组
  const trackData = useMemo(() => {
    const tracks: { [key: number]: TimelineClip[] } = {};
    clips.forEach((clip) => {
      if (!tracks[clip.trackIndex]) {
        tracks[clip.trackIndex] = [];
      }
      tracks[clip.trackIndex].push(clip);
    });

    // 只获取有内容的轨道索引，并排序
    const usedTrackIndexes = Object.keys(tracks)
      .map(Number)
      .filter((index) => tracks[index].length > 0)
      .sort((a, b) => a - b);

    const trackCount = usedTrackIndexes.length;

    // 重新映射轨道索引，消除空轨道
    const trackIndexMap: { [oldIndex: number]: number } = {};
    usedTrackIndexes.forEach((oldIndex, newIndex) => {
      trackIndexMap[oldIndex] = newIndex;
    });

    // 创建新的轨道数据，使用连续的索引
    const remappedTracks: { [key: number]: TimelineClip[] } = {};
    usedTrackIndexes.forEach((oldIndex, newIndex) => {
      remappedTracks[newIndex] = tracks[oldIndex];
    });

    return {
      tracks: remappedTracks,
      trackCount,
      trackIndexMap, // 用于更新片段的轨道索引
    };
  }, [clips]);

  // 监听轨道映射变化，通知父组件更新片段轨道索引
  useEffect(() => {
    if (trackData.trackIndexMap && onTracksRemapped) {
      // 检查是否需要重新映射轨道索引
      const needsRemapping = Object.keys(trackData.trackIndexMap).some(
        (oldIndex) =>
          Number(oldIndex) !== trackData.trackIndexMap[Number(oldIndex)]
      );

      if (needsRemapping) {
        onTracksRemapped(trackData.trackIndexMap);
      }
    }
  }, [trackData.trackIndexMap, onTracksRemapped]);

  // 定义10个缩放档位，每个档位对应一个整数刻度值（秒）
  // scale: 1-10，刻度从大到小：60秒 → 1秒
  const getScaleParams = (scale: number) => {
    let timeScaleValue: number;
    let fixedScaleWidth: number;

    switch (scale) {
      case 1:
        timeScaleValue = 60; // 60秒/刻度
        fixedScaleWidth = 100;
        break;
      case 2:
        timeScaleValue = 30; // 30秒/刻度
        fixedScaleWidth = 100;
        break;
      case 3:
        timeScaleValue = 20; // 20秒/刻度
        fixedScaleWidth = 100;
        break;
      case 4:
        timeScaleValue = 15; // 15秒/刻度
        fixedScaleWidth = 100;
        break;
      case 5:
        timeScaleValue = 10; // 10秒/刻度
        fixedScaleWidth = 100;
        break;
      case 6:
        timeScaleValue = 5; // 5秒/刻度
        fixedScaleWidth = 100;
        break;
      case 7:
        timeScaleValue = 3; // 3秒/刻度
        fixedScaleWidth = 100;
        break;
      case 8:
        timeScaleValue = 2; // 2秒/刻度
        fixedScaleWidth = 100;
        break;
      case 9:
        timeScaleValue = 1; // 1秒/刻度
        fixedScaleWidth = 100;
        break;
      case 10:
        timeScaleValue = 1; // 1秒/刻度（更精细显示，刻度更宽）
        fixedScaleWidth = 150;
        break;
      default:
        timeScaleValue = 10;
        fixedScaleWidth = 100;
    }

    const pixelsPerSecond = fixedScaleWidth / timeScaleValue;

    return { timeScaleValue, pixelsPerSecond, fixedScaleWidth };
  };

  const scaleParams = getScaleParams(scale);
  const pixelsPerSecond = scaleParams.pixelsPerSecond;
  const timeScaleValue = scaleParams.timeScaleValue;
  const fixedScaleWidth = scaleParams.fixedScaleWidth;

  // 智能吸附功能（吸附到播放头、其他素材边缘、网格）
  const snapToPosition = (
    time: number,
    currentClipId?: string
  ): { time: number; snapLines: number[] } => {
    const snapThreshold = 0.1; // 吸附阈值：0.1秒（约5像素在scale=1时）
    const detectedSnapLines: number[] = [];
    let snappedTime = time;
    let minDistance = Infinity;

    // 收集所有可能的吸附点
    const snapPoints: { time: number; label: string }[] = [];

    // 1. 播放头位置
    snapPoints.push({ time: currentTime, label: "cursor" });

    // 2. 其他素材的开始和结束位置
    clips.forEach((clip) => {
      if (clip.id !== currentClipId) {
        snapPoints.push({ time: clip.start, label: "clip-start" });
        snapPoints.push({ time: clip.end, label: "clip-end" });
      }
    });

    // 3. 找到最近的吸附点
    snapPoints.forEach((point) => {
      const distance = Math.abs(time - point.time);
      if (distance < snapThreshold && distance < minDistance) {
        minDistance = distance;
        snappedTime = point.time;
        if (!detectedSnapLines.includes(point.time)) {
          detectedSnapLines.push(point.time);
        }
      }
    });

    // 如果没有找到吸附点，不吸附（保持原始时间）
    // if (minDistance === Infinity) {
    //   const gridSize = 0.5;
    //   snappedTime = Math.round(time / gridSize) * gridSize;
    // }

    return { time: snappedTime, snapLines: detectedSnapLines };
  };

  // 处理边缘调整大小（裁剪素材）
  const handleClipResize = (
    clipId: string,
    newStart: number,
    newEnd: number,
    edge: "left" | "right"
  ) => {
    const clip = clips.find((c) => c.id === clipId);
    if (!clip) return;

    const media = mediaItems.find((m) => m.id === clip.mediaId);
    if (!media) return;

    const snappedStart = snapToPosition(newStart, clipId).time;
    const snappedEnd = snapToPosition(newEnd, clipId).time;

    const oldTrimStart = clip.trimStart || 0;
    // 如果没有设置trimEnd或media.duration，使用当前片段长度作为默认值
    const currentClipDuration = clip.end - clip.start;
    const oldTrimEnd =
      clip.trimEnd ||
      (media.duration ? media.duration : oldTrimStart + currentClipDuration);
    const originalDuration =
      media.duration ||
      Math.max(oldTrimEnd, oldTrimStart + currentClipDuration);

    let finalStart = snappedStart;
    let finalEnd = snappedEnd;

    // 只对视频和音频进行裁剪处理
    if (media.type === "video" || media.type === "audio") {
      if (edge === "left") {
        // 拖动左边缘：调整 start 和 trimStart
        const startDelta = snappedStart - clip.start;
        let newTrimStart = oldTrimStart + startDelta;

        // 限制在原始时长内，且不能超过 trimEnd
        newTrimStart = Math.max(0, Math.min(newTrimStart, oldTrimEnd - 0.1));

        const trimmedDuration = oldTrimEnd - newTrimStart;

        finalStart = snappedStart;
        finalEnd = snappedStart + trimmedDuration;

        console.log(
          `✂️ 左边缘裁剪: trimStart=${oldTrimStart.toFixed(
            2
          )}s → ${newTrimStart.toFixed(2)}s, trimEnd保持=${oldTrimEnd.toFixed(
            2
          )}s`
        );
      } else {
        // 拖动右边缘：调整 end 和 trimEnd
        const endDelta = snappedEnd - clip.end;
        let newTrimEnd = oldTrimEnd + endDelta;

        // 如果有原始时长限制则使用，否则允许自由调整但不能小于trimStart
        if (media.duration) {
          newTrimEnd = Math.max(
            oldTrimStart + 0.1,
            Math.min(newTrimEnd, originalDuration)
          );
        } else {
          // 没有原始时长限制时，只确保不小于trimStart
          newTrimEnd = Math.max(oldTrimStart + 0.1, newTrimEnd);
        }

        const trimmedDuration = newTrimEnd - oldTrimStart;

        finalStart = clip.start;
        finalEnd = clip.start + trimmedDuration;

        console.log(
          `✂️ 右边缘裁剪: trimStart保持=${oldTrimStart.toFixed(
            2
          )}s, trimEnd=${oldTrimEnd.toFixed(2)}s → ${newTrimEnd.toFixed(2)}s`
        );
      }
    } else {
      // 图片等静态素材，直接调整时间轴位置
      finalStart = snappedStart;
      finalEnd = snappedEnd;
    }

    // 检查碰撞
    const willCollide = checkCollision(
      clipId,
      clip.trackIndex,
      finalStart,
      finalEnd
    );

    if (willCollide) {
      // 发生碰撞，不允许调整到此大小
      console.warn("⚠️ 碰撞检测：无法调整素材大小（会与其他素材重叠）");
      return;
    }

    // 调用传入的onClipResize函数
    onClipResize(clipId, finalStart, finalEnd, edge);

    // 清除辅助线
    setSnapLines([]);
  };

  // 处理拖动开始
  const handleDragStart = () => {
    setIsDragging(true);
    setDraggingMaxEnd(0); // 重置拖动最大位置
    lastSnapRef.current = { time: 0, isSnapped: false };
    // 调用拖拽开始回调
    onDragStart?.();
  };

  // 处理拖动过程（显示辅助线）
  const handleDragMove = (event: any) => {
    const { active, delta } = event;
    const itemId = active.id as string;
    const clip = clips.find((c) => c.id === itemId);
    if (!clip) return;

    const deltaTime = delta.x / pixelsPerSecond;
    const newStart = Math.max(0, clip.start + deltaTime);
    const clipDuration = clip.end - clip.start;
    const newEnd = newStart + clipDuration;

    // 更新拖动过程中的最大结束位置
    setDraggingMaxEnd((prev) => Math.max(prev, newEnd));

    // 检测开始位置的吸附
    const snapResultStart = snapToPosition(newStart, itemId);
    // 检测结束位置的吸附
    const snapResultEnd = snapToPosition(newEnd, itemId);

    // 合并所有辅助线（去重）
    const allSnapLines = Array.from(
      new Set([...snapResultStart.snapLines, ...snapResultEnd.snapLines])
    );
    setSnapLines(allSnapLines);
  };

  // 自定义吸附修饰器 - 在拖动过程中实时吸附
  const snapModifier: Modifier = ({ transform, active }: any) => {
    if (!isDragging) return transform;

    const itemId = active.id as string;
    const clip = clips.find((c) => c.id === itemId);
    if (!clip) return transform;

    // 计算当前拖动后的时间位置
    const deltaTime = transform.x / pixelsPerSecond;
    const newStart = Math.max(0, clip.start + deltaTime);

    // 使用吸附逻辑获取吸附后的位置
    const snapResult = snapToPosition(newStart, itemId);
    const snappedStart = snapResult.time;

    // 吸附距离检测
    const snapDistance = Math.abs(newStart - snappedStart);
    const breakAwayThreshold = 0.15; // 脱离阈值：0.15秒（需要更明显的拖动才能脱离）

    // 如果当前已吸附，需要拖动超过脱离阈值才能脱离
    if (lastSnapRef.current.isSnapped) {
      const distanceFromLastSnap = Math.abs(
        newStart - lastSnapRef.current.time
      );

      // 如果拖动距离小于脱离阈值，保持吸附
      if (distanceFromLastSnap < breakAwayThreshold) {
        return {
          ...transform,
          x: (lastSnapRef.current.time - clip.start) * pixelsPerSecond,
        };
      } else {
        // 脱离吸附
        lastSnapRef.current.isSnapped = false;
      }
    }

    // 检查是否应该吸附（距离足够近）
    if (snapDistance < 0.1 && snapResult.snapLines.length > 0) {
      lastSnapRef.current = { time: snappedStart, isSnapped: true };
      const snapOffset = (snappedStart - clip.start) * pixelsPerSecond;
      return {
        ...transform,
        x: snapOffset,
      };
    }

    // 不吸附，自由拖动
    return transform;
  };

  // 处理拖动结束
  // 检查碰撞：是否与同一轨道上的其他素材重叠
  const checkCollision = (
    clipId: string,
    trackIndex: number,
    start: number,
    end: number
  ): boolean => {
    // 获取目标轨道上的所有其他素材
    const tracksClips = clips.filter(
      (c) => c.trackIndex === trackIndex && c.id !== clipId
    );

    // 检查是否有重叠
    for (const otherClip of tracksClips) {
      // 重叠条件：start < otherClip.end && end > otherClip.start
      if (start < otherClip.end && end > otherClip.start) {
        return true; // 发生碰撞
      }
    }

    return false; // 没有碰撞
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over, delta } = event;

    // 清除辅助线和拖动状态
    setSnapLines([]);
    setIsDragging(false);
    setDraggingMaxEnd(0); // 重置拖动最大位置

    if (!over) {
      return;
    }

    const itemId = active.id as string;
    const newRowId = over.id as string;
    const newTrackIndex = parseInt(newRowId.replace("track-", ""));

    const clip = clips.find((c) => c.id === itemId);
    if (!clip) return;

    // 计算时间偏移（根据水平拖动距离）
    const deltaTime = delta.x / pixelsPerSecond;
    const newStart = Math.max(0, clip.start + deltaTime);
    const clipDuration = clip.end - clip.start;

    // 同时更新轨道和时间（带吸附）
    const updates: Partial<TimelineClip> = {};

    // 应用吸附
    let finalStart = newStart;
    let finalEnd = newStart + clipDuration;

    if (Math.abs(deltaTime) > 0.01) {
      const snapResult = snapToPosition(newStart, itemId);
      finalStart = snapResult.time;
      finalEnd = finalStart + clipDuration;
    }

    // 检查碰撞
    const willCollide = checkCollision(
      itemId,
      newTrackIndex,
      finalStart,
      finalEnd
    );

    if (willCollide) {
      // 发生碰撞，不允许拖动到此位置
      console.warn("⚠️ 碰撞检测：无法将素材移动到此位置（与其他素材重叠）");
      return;
    }

    // 更新轨道
    if (clip.trackIndex !== newTrackIndex) {
      updates.trackIndex = newTrackIndex;
    }

    // 更新时间
    if (Math.abs(deltaTime) > 0.01) {
      updates.start = finalStart;
      updates.end = finalEnd;
    }

    if (Object.keys(updates).length > 0) {
      // 更新片段并保存历史记录（使用"移动片段"描述）
      onClipUpdate(itemId, updates, { historyDescription: "移动片段" });
    }

    // 调用拖拽结束回调
    onDragEnd?.();
  };

  // 计算时间刻度宽度
  const { displayDuration, scaleContainerWidth } = useMemo(() => {
    console.log(
      "containerRef.current?.clientWidth",
      containerRef.current?.clientWidth,
      window.innerWidth
    );
    const containerWidth =
      containerRef.current?.clientWidth || window.innerWidth - 270;
    const startLeftOffset = 20;
    const endRightOffset = 20; // 右侧安全距离
    const availableWidth = containerWidth - startLeftOffset - endRightOffset;

    // 计算素材的最远位置（考虑拖动中的位置）
    const maxClipEnd =
      clips.length > 0 ? Math.max(...clips.map((c) => c.end)) : 0;
    const actualMaxEnd = Math.max(maxClipEnd, draggingMaxEnd);

    // 时间轴长度比最大素材长5秒
    const minTimelineDuration = actualMaxEnd + 5;

    // 容器宽度对应的时长
    const containerDisplayTime = availableWidth / pixelsPerSecond;

    // 使用素材时长+5秒和容器时长的最大值
    const displayDuration = Math.max(minTimelineDuration, containerDisplayTime);

    const requiredWidth =
      displayDuration * pixelsPerSecond + startLeftOffset + endRightOffset;
    const width = Math.max(requiredWidth, containerWidth);

    return {
      displayDuration,
      scaleContainerWidth: width,
    };
  }, [clips, pixelsPerSecond, draggingMaxEnd]);

  // 自动滚动：保持播放头在可见区域内
  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const playheadPosition = currentTime * pixelsPerSecond + 20;
    const scrollLeft = container.scrollLeft;
    const containerWidth = container.clientWidth;
    const visibleLeft = scrollLeft;
    const visibleRight = scrollLeft + containerWidth;

    // 如果播放头在可见区域左侧之外
    if (playheadPosition < visibleLeft + 50) {
      container.scrollTo({
        left: Math.max(0, playheadPosition - 100),
        behavior: "smooth",
      });
    }
    // 如果播放头在可见区域右侧之外
    else if (playheadPosition > visibleRight - 50) {
      container.scrollTo({
        left: playheadPosition - containerWidth + 100,
        behavior: "smooth",
      });
    }
  }, [currentTime, pixelsPerSecond]);

  return (
    <div
      className="relative flex flex-col h-full bg-white"
      onClick={() => onClipSelect(null)} // 点击空白处取消选中
    >
      {/* 顶部固定区域：播放头图标空间 */}
      <div
        style={{
          height: "10px",
          backgroundColor: "#ffffff",
          flexShrink: 0,
          position: "relative",
        }}
      />

      {/* 时间刻度 - 固定在顶部 */}
      <div
        style={{
          position: "sticky",
          top: 0,
          width: "100%", // 占满整个容器宽度
          height: "32px",
          backgroundColor: "#ffffff",
          flexShrink: 0,
          zIndex: 100,
          cursor: "pointer",
          overflow: "hidden", // 隐藏超出的刻度
        }}
        onClick={(e) => {
          // 点击刻度时定位播放头（不能超出素材最大长度，减去播放头宽度）
          const containerRect = containerRef.current?.getBoundingClientRect();
          if (!containerRect) return;
          const clickX =
            e.clientX -
            containerRect.left -
            20 +
            (containerRef.current?.scrollLeft || 0);
          const maxClipEnd =
            clips.length > 0 ? Math.max(...clips.map((c) => c.end)) : 0;
          const playheadWidthTime = 2 / pixelsPerSecond; // 播放头宽度2px对应的时间
          const maxClickTime = maxClipEnd - playheadWidthTime;
          const clickTime = Math.max(
            0,
            Math.min(clickX / pixelsPerSecond, maxClickTime)
          );
          onTimeChange(clickTime);
        }}
      >
        <div style={{ transform: `translateX(-${scaleScrollLeft}px)` }}>
          <TimelineScale
            scale={timeScaleValue}
            scaleSplitCount={5}
            scaleWidth={fixedScaleWidth}
            startLeft={20}
            duration={displayDuration}
            width={scaleContainerWidth}
            height={32}
          />
        </div>
      </div>

      {/* 轨道滚动区域 */}
      <ThinScrollbar className="flex-1" style={{ position: "relative" }}>
        <div ref={containerRef}>
          <DndContext
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragMove={handleDragMove}
            modifiers={[snapModifier]}
            collisionDetection={closestCenter}
          >
            <div
              style={{
                position: "relative",
                minWidth: `${scaleContainerWidth}px`,
                paddingTop: "10px",
                overflow: "visible", // 允许拖动的素材显示在容器外
              }}
            >
              {/* 轨道 - 只显示有素材的轨道 */}
              {trackData.trackCount === 0 ? (
                <div
                  style={{
                    textAlign: "center",
                    padding: "40px",
                    color: "#9ca3af",
                    fontSize: "14px",
                  }}
                >
                  {t("timeline.addMediaPrompt")}
                </div>
              ) : (
                Array.from({ length: trackData.trackCount }).map((_, index) => (
                  <DroppableTrackRow
                    key={`track-${index}`}
                    trackIndex={index}
                    clips={trackData.tracks[index] || []}
                    allClips={clips}
                    mediaItems={mediaItems}
                    selectedClipId={selectedClipId}
                    pixelsPerSecond={pixelsPerSecond}
                    containerRef={containerRef}
                    onClipSelect={onClipSelect}
                    onClipResize={handleClipResize}
                    onClipResizeEnd={onClipResizeEnd}
                    onShowSnapLines={setSnapLines}
                  />
                ))
              )}
            </div>
          </DndContext>
        </div>

        {/* 吸附辅助线（虚线）- 覆盖整个容器高度 */}
        {snapLines.map((snapTime) => (
          <div
            key={`snap-${snapTime}`}
            style={{
              position: "absolute",
              left: `${snapTime * pixelsPerSecond + 20}px`,
              top: 0,
              height: "100%",
              width: "0",
              zIndex: 45,
              pointerEvents: "none",
              borderLeft: "2px dashed #3b82f6",
              opacity: 0.8,
            }}
          />
        ))}
      </ThinScrollbar>

      {/* 播放头游标 - 固定不滚动，跟随横向滚动 */}
      {trackData.trackCount > 0 && (
        <div
          style={{
            position: "absolute",
            top: "18px", // 从顶部图标区域下方开始
            left: 0,
            right: 0,
            bottom: 0,
            pointerEvents: "none", // 不阻挡鼠标事件
            zIndex: 105,
          }}
        >
          <PlaybackCursor
            currentTime={currentTime}
            clips={clips}
            pixelsPerSecond={pixelsPerSecond}
            onTimeChange={onTimeChange}
            onShowSnapLines={setSnapLines}
            containerRef={containerRef}
          />
        </div>
      )}
    </div>
  );
};

// 自定义比较函数，确保 clips 变化时强制重新渲染
const arePropsEqual = (
  prevProps: TimelineEditorProps,
  nextProps: TimelineEditorProps
) => {
  // clips 数组引用变化或长度变化时，必须重新渲染
  const clipsChanged =
    prevProps.clips !== nextProps.clips ||
    prevProps.clips.length !== nextProps.clips.length;

  if (clipsChanged) {
    console.log("🔄 [TimelineEditor] clips 变化，强制重新渲染", {
      prevLength: prevProps.clips.length,
      nextLength: nextProps.clips.length,
      相同引用: prevProps.clips === nextProps.clips,
    });
    return false; // 返回 false 表示需要重新渲染
  }

  // 其他关键 props 的比较
  return (
    prevProps.currentTime === nextProps.currentTime &&
    prevProps.duration === nextProps.duration &&
    prevProps.scale === nextProps.scale &&
    prevProps.selectedClipId === nextProps.selectedClipId &&
    prevProps.mediaItems === nextProps.mediaItems
  );
};

export const TimelineEditor = React.memo(
  TimelineEditorComponent,
  arePropsEqual
);
