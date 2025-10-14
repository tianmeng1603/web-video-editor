import { useState, useEffect } from "react";
import { MediaItem, TimelineClip } from "../types";
import { historyManager } from "../utils/HistoryManager";

interface UseHistoryOperationsProps {
  clips: TimelineClip[];
  mediaItems: MediaItem[];
  selectedClipId: string | null;
  setClips: (clips: TimelineClip[]) => void;
  setMediaItems: (items: MediaItem[]) => void;
  setSelectedClipId: (id: string | null) => void;
  isUndoRedoInProgress: React.MutableRefObject<boolean>;
  forceUpdateTextRef: React.MutableRefObject<(() => void) | null>;
}

/**
 * 历史记录操作 Hook
 * 管理撤销/重做功能
 */
export const useHistoryOperations = ({
  clips,
  mediaItems,
  selectedClipId,
  setClips,
  setMediaItems,
  setSelectedClipId,
  isUndoRedoInProgress,
  forceUpdateTextRef,
}: UseHistoryOperationsProps) => {
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const updateHistoryButtons = () => {
    const info = historyManager.getInfo();
    setCanUndo(info.canUndo);
    setCanRedo(info.canRedo);
  };

  const saveToHistory = (
    description: string,
    newClips?: TimelineClip[],
    newMediaItems?: MediaItem[],
    newSelectedClipId?: string | null
  ) => {
    const clipsToSave = newClips ?? clips;
    const mediaItemsToSave = newMediaItems ?? mediaItems;

    console.log("💾 [保存历史]", description, {
      clips数量: clipsToSave.length,
      clipIds: clipsToSave.map((c) => c.id),
      mediaItems数量: mediaItemsToSave.length,
      mediaIds: mediaItemsToSave.map((m) => m.id),
    });

    historyManager.push(
      clipsToSave,
      mediaItemsToSave,
      newSelectedClipId ?? selectedClipId,
      description
    );
    updateHistoryButtons();
  };

  const handleUndo = () => {
    const state = historyManager.undo();
    if (state) {
      console.log("🔙 [撤销] 开始撤销操作:", state.description);

      isUndoRedoInProgress.current = true;

      setClips(state.clips);
      setMediaItems(state.mediaItems);
      setSelectedClipId(state.selectedClipId);
      updateHistoryButtons();

      setTimeout(() => {
        forceUpdateTextRef.current?.();
        isUndoRedoInProgress.current = false;
      }, 50);
    }
  };

  const handleRedo = () => {
    const state = historyManager.redo();
    if (state) {
      console.log("🔜 [重做] 开始重做操作:", state.description);

      isUndoRedoInProgress.current = true;

      setClips(state.clips);
      setMediaItems(state.mediaItems);
      setSelectedClipId(state.selectedClipId);
      updateHistoryButtons();

      setTimeout(() => {
        forceUpdateTextRef.current?.();
        isUndoRedoInProgress.current = false;
      }, 50);
    }
  };

  // 初始化：保存初始空状态（仅一次）
  useEffect(() => {
    const info = historyManager.getInfo();
    if (info.size === 0) {
      historyManager.push(clips, mediaItems, selectedClipId, "初始状态");
      updateHistoryButtons();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    canUndo,
    canRedo,
    saveToHistory,
    handleUndo,
    handleRedo,
    updateHistoryButtons,
  };
};

