import { useEffect } from "react";
import { MediaItem, TimelineClip } from "../types";
import { loadProjectData, ProjectData } from "../utils/projectData";
import { historyManager } from "../utils/HistoryManager";
import {
  getAudioDuration,
} from "../utils/mediaProcessor";

interface UseInitialDataProps {
  initialData?: ProjectData;
  setMediaItems: (items: MediaItem[]) => void;
  setClips: (clips: TimelineClip[]) => void;
  setCanvasRatio: (ratio: string) => void;
  setScale: (scale: number) => void;
  setCurrentTime: (time: number) => void;
  setSelectedClipId: (id: string | null) => void;
  setProjectName: (name: string) => void;
  updateHistoryButtons: () => void;
  forceUpdateTextRef: React.MutableRefObject<(() => void) | null>;
}

/**
 * 初始数据加载 Hook
 * 处理组件初始化时的数据加载
 */
export const useInitialData = ({
  initialData,
  setMediaItems,
  setClips,
  setCanvasRatio,
  setScale,
  setCurrentTime,
  setSelectedClipId,
  setProjectName,
  updateHistoryButtons,
  forceUpdateTextRef,
}: UseInitialDataProps) => {
  useEffect(() => {
    if (initialData) {
      const {
        mediaItems: loadedMediaItems,
        clips: loadedClips,
        canvas,
        timeline,
        editor,
      } = loadProjectData(initialData);

      // 为缺失封面/波形的媒体生成
      const processMediaItems = async () => {
        const processedItems = [...loadedMediaItems];
        let hasChanges = false;

        // 逐个处理媒体项
        for (let i = 0; i < processedItems.length; i++) {
          const item = processedItems[i];
          
          // 视频不再动态生成封面，直接使用 thumbnail 字段
          // 如果 thumbnail 为空则显示为空
          
          // 如果是音频且没有时长，获取时长（波形图使用静态图片）
          if (item.type === "audio" && !item.duration) {
            const duration = await getAudioDuration(item.url);
            processedItems[i] = { ...item, duration };
            hasChanges = true;
            
            // 立即更新以显示进度
            setMediaItems([...processedItems]);
          }
        }

        // 如果有更改，最终更新历史记录并强制刷新clips
        if (hasChanges) {
          // 强制刷新clips，触发时间轨道重新渲染
          setClips([...loadedClips]);
          
          historyManager.clear();
          historyManager.push(
            loadedClips,
            processedItems,
            editor.selectedClipId,
            "初始状态"
          );
          updateHistoryButtons();
        }
      };

      // 先设置初始数据
      setMediaItems(loadedMediaItems);
      setClips(loadedClips);
      setCanvasRatio(canvas.ratio);
      setScale(timeline.scale);
      setCurrentTime(timeline.currentTime);
      setSelectedClipId(editor.selectedClipId);
      setProjectName(initialData.projectName);

      historyManager.clear();
      historyManager.push(
        loadedClips,
        loadedMediaItems,
        editor.selectedClipId,
        "初始状态"
      );
      updateHistoryButtons();

      // 异步处理媒体项（生成封面/波形）
      processMediaItems();

      setTimeout(() => {
        forceUpdateTextRef.current?.();
      }, 100);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialData]);
};

