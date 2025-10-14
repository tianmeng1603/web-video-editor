import { message } from "antd";
import { useTranslation } from "react-i18next";
import { MediaItem, TimelineClip } from "../types";

interface UseClipOperationsProps {
  clips: TimelineClip[];
  mediaItems: MediaItem[];
  selectedClipId: string | null;
  currentTime: number;
  setClips: (clips: TimelineClip[]) => void;
  setMediaItems: (items: MediaItem[]) => void;
  setSelectedClipId: (id: string | null) => void;
  setCurrentTime: (time: number) => void;
  saveToHistory: (
    description: string,
    newClips?: TimelineClip[],
    newMediaItems?: MediaItem[],
    newSelectedClipId?: string | null
  ) => void;
}

/**
 * 片段操作 Hook
 * 管理所有片段相关的操作
 */
export const useClipOperations = ({
  clips,
  mediaItems,
  selectedClipId,
  currentTime,
  setClips,
  setMediaItems,
  setSelectedClipId,
  setCurrentTime,
  saveToHistory,
}: UseClipOperationsProps) => {
  const { t } = useTranslation();
  
  // 素材管理
  const handleMediaAdd = (item: MediaItem) => {
    const newMediaItems = [...mediaItems, item];
    setMediaItems(newMediaItems);
  };

  const handleMediaRemove = (id: string) => {
    const mediaToRemove = mediaItems.find((item) => item.id === id);
    const newMediaItems = mediaItems.filter((item) => item.id !== id);
    const newClips = clips.filter((clip) => clip.mediaId !== id);
    saveToHistory(
      `删除素材: ${mediaToRemove?.name || id}`,
      newClips,
      newMediaItems,
      selectedClipId
    );
    setMediaItems(newMediaItems);
    setClips(newClips);
    message.info(t("message.mediaDeleted"));
  };

  // 片段管理 - 添加到轨道
  const handleClipAdd = (clip: TimelineClip) => {
    let newClips: TimelineClip[];
    if (clip.trackIndex === 0) {
      const updatedClips = clips.map((c) => ({
        ...c,
        trackIndex: c.trackIndex + 1,
      }));
      newClips = [clip, ...updatedClips];
    } else {
      newClips = [...clips, clip];
    }

    saveToHistory(`添加片段到轨道`, newClips, mediaItems, selectedClipId);
    setClips(newClips);
    setCurrentTime(0);
    message.success(t("message.addedToTimeline"));
  };

  // 同时添加素材和片段
  const handleMediaAndClipAdd = (media: MediaItem, clip: TimelineClip) => {
    const newMediaItems = [...mediaItems, media];

    let newClips: TimelineClip[];
    if (clip.trackIndex === 0) {
      const updatedClips = clips.map((c) => ({
        ...c,
        trackIndex: c.trackIndex + 1,
      }));
      newClips = [clip, ...updatedClips];
    } else {
      newClips = [...clips, clip];
    }

    saveToHistory(`添加到时间轴`, newClips, newMediaItems, selectedClipId);
    setMediaItems(newMediaItems);
    setClips(newClips);
    setCurrentTime(0);
    message.success(t("message.addedToTimeline"));
  };

  const handleClipUpdate = (
    id: string,
    updates: Partial<TimelineClip>,
    options?: { skipHistory?: boolean; historyDescription?: string }
  ) => {
    const newClips = clips.map((clip) =>
      clip.id === id ? { ...clip, ...updates } : clip
    );

    const skipHistory = options?.skipHistory ?? false;
    const historyDescription = options?.historyDescription ?? "更新片段属性";

    if (!skipHistory) {
      saveToHistory(historyDescription, newClips, mediaItems, selectedClipId);
    }

    setClips(newClips);
  };

  const handleClipRemove = (id: string) => {
    const newClips = clips.filter((clip) => clip.id !== id);
    const newSelectedClipId = selectedClipId === id ? null : selectedClipId;
    saveToHistory(`删除片段`, newClips, mediaItems, newSelectedClipId);
    setClips(newClips);
    if (selectedClipId === id) {
      setSelectedClipId(null);
    }
  };

  // 编辑工具功能
  const handleCopyClip = () => {
    if (!selectedClipId) return;

    const clipToCopy = clips.find((c) => c.id === selectedClipId);
    if (!clipToCopy) return;

    // 创建复制的片段，放置在轨道最上方（trackIndex = 0）
    const newClip: TimelineClip = {
      ...clipToCopy,
      id: `clip-${Date.now()}-${Math.random()}`,
      trackIndex: 0,
    };

    // 将所有现有片段的轨道索引 + 1，为新片段腾出空间
    const updatedClips = clips.map((c) => ({
      ...c,
      trackIndex: c.trackIndex + 1,
    }));

    // 将新片段添加到列表开头
    const newClips = [newClip, ...updatedClips];
    saveToHistory(`复制片段`, newClips, mediaItems, newClip.id);

    setClips(newClips);
    setSelectedClipId(newClip.id);
    message.success(t("message.clipCopied"));
  };

  const handleSplitClip = () => {
    if (!selectedClipId) return;

    const clipToSplit = clips.find((c) => c.id === selectedClipId);
    if (!clipToSplit) return;

    if (currentTime <= clipToSplit.start || currentTime >= clipToSplit.end) {
      message.warning(t("message.movePlayheadToSplit"));
      return;
    }

    const media = mediaItems.find((m) => m.id === clipToSplit.mediaId);
    const mediaDuration = media?.duration || 0;

    const oldTrimStart = clipToSplit.trimStart || 0;
    const oldTrimEnd = clipToSplit.trimEnd || mediaDuration;

    const timelineOffset = currentTime - clipToSplit.start;
    const splitVideoTime = oldTrimStart + timelineOffset;

    const clip1: TimelineClip = {
      ...clipToSplit,
      id: `clip-${Date.now()}-${Math.random()}-1`,
      end: currentTime,
      trimStart: oldTrimStart,
      trimEnd: splitVideoTime,
    };

    const clip2: TimelineClip = {
      ...clipToSplit,
      id: `clip-${Date.now()}-${Math.random()}-2`,
      start: currentTime,
      trimStart: splitVideoTime,
      trimEnd: oldTrimEnd,
    };

    const newClips = clips
      .filter((c) => c.id !== selectedClipId)
      .concat([clip1, clip2]);
    saveToHistory(`分割片段`, newClips, mediaItems, clip2.id);
    setClips(newClips);
    setSelectedClipId(clip2.id);
    message.success(t("message.clipSplit"));
  };

  const handleDeleteClip = () => {
    if (!selectedClipId) return;
    handleClipRemove(selectedClipId);
    message.success(t("message.clipDeleted"));
  };

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

    let updates: Partial<TimelineClip> = {
      start: newStart,
      end: newEnd,
    };

    // 只对视频和音频进行裁剪处理
    if (media.type === "video" || media.type === "audio") {
      const oldTrimStart = clip.trimStart || 0;
      // 如果没有设置trimEnd或media.duration，使用当前片段长度作为默认值
      const currentClipDuration = clip.end - clip.start;
      const oldTrimEnd = clip.trimEnd || (media.duration ? media.duration : oldTrimStart + currentClipDuration);
      const originalDuration = media.duration || Math.max(oldTrimEnd, oldTrimStart + currentClipDuration);

      if (edge === "left") {
        // 拖动左边缘：调整 trimStart
        const startDelta = newStart - clip.start;
        let newTrimStart = oldTrimStart + startDelta;
        
        // 限制在合理范围内，且不能超过 trimEnd
        newTrimStart = Math.max(0, Math.min(newTrimStart, oldTrimEnd - 0.1));
        
        updates.trimStart = newTrimStart;
        
        console.log(`✂️ 左边缘裁剪: trimStart=${oldTrimStart.toFixed(2)}s → ${newTrimStart.toFixed(2)}s`);
      } else {
        // 拖动右边缘：调整 trimEnd
        const endDelta = newEnd - clip.end;
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
        
        updates.trimEnd = newTrimEnd;
        
        console.log(`✂️ 右边缘裁剪: trimEnd=${oldTrimEnd.toFixed(2)}s → ${newTrimEnd.toFixed(2)}s`);
      }
    }

    const newClips = clips.map((c) =>
      c.id === clipId ? { ...c, ...updates } : c
    );
    setClips(newClips);
  };

  const handleClipResizeEnd = () => {
    saveToHistory(`调整片段大小`, clips, mediaItems, selectedClipId);
  };

  return {
    handleMediaAdd,
    handleMediaRemove,
    handleClipAdd,
    handleMediaAndClipAdd,
    handleClipUpdate,
    handleClipRemove,
    handleCopyClip,
    handleSplitClip,
    handleDeleteClip,
    handleClipResize,
    handleClipResizeEnd,
  };
};

