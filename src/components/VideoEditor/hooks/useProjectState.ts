import { useState, useRef } from "react";
import { MediaItem, TimelineClip } from "../types";

/**
 * 项目状态管理 Hook
 * 管理所有项目相关的状态
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

