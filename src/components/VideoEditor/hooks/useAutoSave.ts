import { useEffect, useRef, useCallback } from "react";
import { MediaItem, TimelineClip } from "../types";
import { saveProjectData, ProjectData } from "../utils/projectData";

interface UseAutoSaveProps {
  mediaItems: MediaItem[];
  clips: TimelineClip[];
  projectName: string;
  canvasRatio: string;
  scale: number;
  currentTime: number;
  selectedClipId: string | null;
  onSave?: (projectData: ProjectData) => void | Promise<void>;
  autoSaveDelay?: number; // 自动保存延迟时间，默认3秒
  enabled?: boolean; // 是否启用自动保存，默认true
}

/**
 * 自动保存 Hook
 * 提供自动保存和快捷键保存功能
 */
export const useAutoSave = ({
  mediaItems,
  clips,
  projectName,
  canvasRatio,
  scale,
  currentTime,
  selectedClipId,
  onSave,
  autoSaveDelay = 3000,
  enabled = true,
}: UseAutoSaveProps) => {
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const hasUnsavedChangesRef = useRef(false);
  const isInitializedRef = useRef(false);
  const lastSavedDataRef = useRef<string>("");
  const isSavingRef = useRef(false);
  const isManualSaveRef = useRef(false);
  const isReadyForAutoSaveRef = useRef(false);

  // 生成当前数据的快照用于比较
  const generateDataSnapshot = useCallback(() => {
    return JSON.stringify({
      mediaItems: mediaItems.map(item => ({
        id: item.id,
        name: item.name,
        type: item.type,
        url: item.url,
      })),
      clips: clips.map(clip => ({
        id: clip.id,
        mediaId: clip.mediaId,
        start: clip.start,
        end: clip.end,
        trackIndex: clip.trackIndex,
        x: clip.x,
        y: clip.y,
        width: clip.width,
        height: clip.height,
        text: clip.text,
      })),
      canvasRatio,
      projectName,
    });
  }, [mediaItems, clips, canvasRatio, projectName]);

  // 执行保存操作
  const performSave = useCallback(async (isManual = false) => {
    if (isSavingRef.current || !onSave) return;

    try {
      isSavingRef.current = true;

      // 计算项目总时长
      const maxClipEnd = clips.length > 0 ? Math.max(...clips.map(c => c.end)) : 0;
      const projectDuration = Math.max(maxClipEnd, currentTime);

      // 根据画布比例计算尺寸
      const canvasSizeMap: Record<string, { width: number; height: number }> = {
        "16:9": { width: 1920, height: 1080 },
        "9:16": { width: 1080, height: 1920 },
        "1:1": { width: 1080, height: 1080 },
      };
      const canvasSize = canvasSizeMap[canvasRatio] || canvasSizeMap["16:9"];

      const projectData = await saveProjectData(
        projectName,
        mediaItems,
        clips,
        {
          width: canvasSize.width,
          height: canvasSize.height,
          backgroundColor: "#000000",
          ratio: canvasRatio,
        },
        {
          scale,
          currentTime,
          duration: projectDuration,
        },
        {
          selectedClipId,
          playState: "paused",
        }
      );

      await onSave(projectData);

      // 更新最后保存的数据快照
      lastSavedDataRef.current = generateDataSnapshot();
      hasUnsavedChangesRef.current = false;
    } catch (error) {
      console.error("保存失败:", error);
      throw error;
    } finally {
      isSavingRef.current = false;
    }
  }, [
    mediaItems,
    clips,
    projectName,
    canvasRatio,
    scale,
    currentTime,
    selectedClipId,
    onSave,
    generateDataSnapshot,
  ]);

  // 触发自动保存
  const triggerAutoSave = useCallback(() => {
    if (!enabled || !onSave) return;

    // 清除现有的定时器
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    // 设置新的定时器
    autoSaveTimerRef.current = setTimeout(() => {
      if (hasUnsavedChangesRef.current) {
        performSave();
      }
    }, autoSaveDelay);
  }, [enabled, onSave, autoSaveDelay, performSave]);

  // 初始化完成后延迟启用自动保存（避免加载初始数据时触发保存）
  useEffect(() => {
    const timer = setTimeout(() => {
      isReadyForAutoSaveRef.current = true;
    }, 1000); // 1秒后才开始监听自动保存

    return () => clearTimeout(timer);
  }, []);

  // 监听数据变化
  useEffect(() => {
    const currentSnapshot = generateDataSnapshot();
    
    if (!isInitializedRef.current) {
      // 首次初始化，记录初始数据但不触发保存
      lastSavedDataRef.current = currentSnapshot;
      isInitializedRef.current = true;
      return;
    }

    // 只有在准备好接受自动保存时才触发
    if (!isReadyForAutoSaveRef.current) {
      // 更新快照但不触发保存
      lastSavedDataRef.current = currentSnapshot;
      return;
    }

    // 比较当前数据和最后保存的数据
    if (currentSnapshot !== lastSavedDataRef.current) {
      hasUnsavedChangesRef.current = true;
      triggerAutoSave();
    }
  }, [mediaItems, clips, canvasRatio, projectName]); // 只依赖实际数据，不依赖函数

  // 监听 Ctrl+S 快捷键
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (hasUnsavedChangesRef.current || clips.length > 0) {
          isManualSaveRef.current = true;
          performSave(true); // 手动保存
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [performSave, clips.length]);

  // 清理定时器
  useEffect(() => {
    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, []);

  return {
    hasUnsavedChanges: hasUnsavedChangesRef.current,
    performSave,
  };
};

