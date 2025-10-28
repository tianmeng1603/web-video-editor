import { useState, useRef } from "react";
import { MediaItem, TimelineClip } from "../types";

/**
 * 项目状态管理自定义Hook
 * 
 * 集中管理视频编辑器的所有状态，包括：
 * 
 * 核心数据状态：
 * - 媒体素材列表（mediaItems）
 * - 时间轴片段列表（clips）
 * - 项目名称（projectName）
 * 
 * 播放器状态：
 * - 当前播放时间（currentTime）
 * - 播放状态（isPlaying）
 * - 时间轴缩放等级（scale: 1-10）
 * 
 * UI状态：
 * - 选中片段ID（selectedClipId）
 * - 活动侧边栏面板（activePanel）
 * - 画布比例（canvasRatio: "16:9", "9:16", "1:1"）
 * 
 * Refs：
 * - 文本片段强制更新引用（forceUpdateTextRef）
 * - 撤销/重做进行中标志（isUndoRedoInProgress）
 * 
 * @returns 包含所有状态和setter函数的对象
 * 
 * @example
 * ```tsx
 * const {
 *   clips,
 *   setClips,
 *   mediaItems,
 *   currentTime,
 *   isPlaying,
 *   selectedClipId,
 *   canvasRatio
 * } = useProjectState();
 * ```
 */
export const useProjectState = () => {
  // 核心数据状态
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [clips, setClips] = useState<TimelineClip[]>([]);
  const [projectName, setProjectName] = useState<string>("我的视频项目");

  // 播放器状态
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [scale, setScale] = useState(8); // 默认档位8（2秒/刻度）

  // UI 状态
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);
  const [activePanel, setActivePanel] = useState<string | null>("folder");
  const [canvasRatio, setCanvasRatio] = useState<string>("16:9");

  // Refs
  const forceUpdateTextRef = useRef<(() => void) | null>(null);
  const isUndoRedoInProgress = useRef(false);

  return {
    // 数据状态
    mediaItems,
    setMediaItems,
    clips,
    setClips,
    projectName,
    setProjectName,

    // 播放器状态
    currentTime,
    setCurrentTime,
    isPlaying,
    setIsPlaying,
    scale,
    setScale,

    // UI 状态
    selectedClipId,
    setSelectedClipId,
    activePanel,
    setActivePanel,
    canvasRatio,
    setCanvasRatio,

    // Refs
    forceUpdateTextRef,
    isUndoRedoInProgress,
  };
};

