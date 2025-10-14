import { useEffect, useRef, useCallback, useState } from "react";
import { MediaItem, TimelineClip } from "../types";
import { ProjectData } from "../utils/projectData";
import { createAutoSaveWorker, generateDataSnapshot, prepareProjectSaveData } from "../utils/autoSaveWorker";

interface UseAutoSaveWithWorkerProps {
  mediaItems: MediaItem[];
  clips: TimelineClip[];
  projectName: string;
  canvasRatio: string;
  scale: number;
  currentTime: number;
  selectedClipId: string | null;
  onSave?: (projectData: ProjectData) => void | Promise<void>;
  autoSaveDelay?: number;
  enabled?: boolean;
  useWorker?: boolean; // 是否使用 Web Worker
}

/**
 * 增强版自动保存 Hook
 * 支持可选的 Web Worker 模式，自动降级到主线程模式
 */
export const useAutoSaveWithWorker = ({
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
  useWorker = true,
}: UseAutoSaveWithWorkerProps) => {
  const workerRef = useRef<Worker | null>(null);
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const hasUnsavedChangesRef = useRef(false);
  const isInitializedRef = useRef(false);
  const lastSavedDataRef = useRef<string>("");
  const isSavingRef = useRef(false);
  const isReadyForAutoSaveRef = useRef(false);
  const [workerAvailable, setWorkerAvailable] = useState(false);

  // 初始化 Web Worker
  useEffect(() => {
    if (!useWorker) return;

    const worker = createAutoSaveWorker();
    if (worker) {
      workerRef.current = worker;
      setWorkerAvailable(true);

      worker.addEventListener("message", handleWorkerMessage);
      worker.addEventListener("error", (error) => {
        console.error("❌ Web Worker 错误:", error);
        setWorkerAvailable(false);
      });
    } else {
      console.warn("⚠️ Web Worker 不可用，使用主线程模式");
    }

    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
        console.log("🛑 自动保存 Web Worker 已终止");
        workerRef.current = null;
      }
    };
  }, [useWorker]);

  // 处理 Worker 消息
  const handleWorkerMessage = useCallback((event: MessageEvent) => {
    const { type, payload } = event.data;

    switch (type) {
      case "SNAPSHOT_READY":
        handleSnapshotReady(payload);
        break;

      case "SAVE_READY":
        handleSaveReady(payload);
        break;

      case "ERROR":
        console.error("Worker 错误:", payload.message);
        isSavingRef.current = false;
        break;
    }
  }, []);

  // 处理快照生成完成
  const handleSnapshotReady = useCallback((snapshot: string) => {
    if (!isInitializedRef.current) {
      lastSavedDataRef.current = snapshot;
      isInitializedRef.current = true;
      return;
    }

    if (!isReadyForAutoSaveRef.current) {
      lastSavedDataRef.current = snapshot;
      return;
    }

    if (snapshot !== lastSavedDataRef.current) {
      hasUnsavedChangesRef.current = true;
      triggerAutoSave();
    }
  }, []);

  // 处理保存数据准备完成
  const handleSaveReady = useCallback(
    async (projectData: ProjectData) => {
      if (!onSave) {
        isSavingRef.current = false;
        return;
      }

      try {
        await onSave(projectData);

        // 保存成功后，重新生成快照
        const snapshot = generateDataSnapshot(
          mediaItems,
          clips,
          canvasRatio,
          projectName
        );
        lastSavedDataRef.current = snapshot;
        hasUnsavedChangesRef.current = false;
      } catch (error) {
        console.error("保存失败:", error);
      } finally {
        isSavingRef.current = false;
      }
    },
    [onSave, mediaItems, clips, canvasRatio, projectName]
  );

  // 执行保存操作
  const performSave = useCallback(
    async (isManual = false) => {
      if (isSavingRef.current || !onSave) return;

      try {
        isSavingRef.current = true;

        const maxClipEnd =
          clips.length > 0 ? Math.max(...clips.map((c) => c.end)) : 0;
        const projectDuration = Math.max(maxClipEnd, currentTime);

        const canvasSizeMap: Record<
          string,
          { width: number; height: number }
        > = {
          "16:9": { width: 1920, height: 1080 },
          "9:16": { width: 1080, height: 1920 },
          "1:1": { width: 1080, height: 1080 },
        };
        const canvasSize = canvasSizeMap[canvasRatio] || canvasSizeMap["16:9"];

        // 如果 Worker 可用，使用 Worker
        if (workerAvailable && workerRef.current) {
          workerRef.current.postMessage({
            type: "PREPARE_SAVE",
            payload: {
              projectName,
              mediaItems,
              clips,
              canvas: {
                width: canvasSize.width,
                height: canvasSize.height,
                backgroundColor: "#000000",
                ratio: canvasRatio,
              },
              timeline: {
                scale,
                currentTime,
                duration: projectDuration,
              },
              ui: {
                selectedClipId,
                playState: "paused",
              },
            },
          });
        } else {
          // 降级到主线程
          const projectData = prepareProjectSaveData(
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

          await handleSaveReady(projectData);
        }
      } catch (error) {
        console.error("保存准备失败:", error);
        isSavingRef.current = false;
      }
    },
    [
      mediaItems,
      clips,
      projectName,
      canvasRatio,
      scale,
      currentTime,
      selectedClipId,
      onSave,
      workerAvailable,
      handleSaveReady,
    ]
  );

  // 触发自动保存
  const triggerAutoSave = useCallback(() => {
    if (!enabled || !onSave) return;

    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    autoSaveTimerRef.current = setTimeout(() => {
      if (hasUnsavedChangesRef.current) {
        performSave();
      }
    }, autoSaveDelay);
  }, [enabled, onSave, autoSaveDelay, performSave]);

  // 初始化完成后延迟启用自动保存
  useEffect(() => {
    const timer = setTimeout(() => {
      isReadyForAutoSaveRef.current = true;
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  // 监听数据变化
  useEffect(() => {
    // 生成快照
    if (workerAvailable && workerRef.current) {
      // 使用 Worker 生成快照
      workerRef.current.postMessage({
        type: "GENERATE_SNAPSHOT",
        payload: {
          mediaItems,
          clips,
          canvasRatio,
          projectName,
        },
      });
    } else {
      // 主线程生成快照
      const currentSnapshot = generateDataSnapshot(
        mediaItems,
        clips,
        canvasRatio,
        projectName
      );

      if (!isInitializedRef.current) {
        lastSavedDataRef.current = currentSnapshot;
        isInitializedRef.current = true;
        return;
      }

      if (!isReadyForAutoSaveRef.current) {
        lastSavedDataRef.current = currentSnapshot;
        return;
      }

      if (currentSnapshot !== lastSavedDataRef.current) {
        hasUnsavedChangesRef.current = true;
        triggerAutoSave();
      }
    }
  }, [mediaItems, clips, canvasRatio, projectName, workerAvailable, triggerAutoSave]);

  // 监听 Ctrl+S 快捷键
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        if (hasUnsavedChangesRef.current || clips.length > 0) {
          performSave(true);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
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
    workerAvailable, // 返回 Worker 状态供调试
  };
};

