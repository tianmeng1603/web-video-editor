import { useState } from "react";
import { message } from "antd";
import { useTranslation } from "react-i18next";
import { MediaItem, TimelineClip } from "../types";
import {
  exportProjectAsJSON,
  importProjectFromJSON,
  loadProjectData,
  ProjectData,
} from "../utils/projectData";
import { historyManager } from "../utils/HistoryManager";
import { exportFrameAsPNG } from "../utils/etroExporter";
import { exportAsMP4 } from "../utils/ffmpegExporter";

interface UseExportProps {
  clips: TimelineClip[];
  mediaItems: MediaItem[];
  projectName: string;
  canvasRatio: string;
  scale: number;
  currentTime: number;
  selectedClipId: string | null;
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
 * 导出和项目管理 Hook
 * 管理项目保存、加载、导出等功能
 */
export const useExport = ({
  clips,
  mediaItems,
  projectName,
  canvasRatio,
  scale,
  currentTime,
  selectedClipId,
  setMediaItems,
  setClips,
  setCanvasRatio,
  setScale,
  setCurrentTime,
  setSelectedClipId,
  setProjectName,
  updateHistoryButtons,
  forceUpdateTextRef,
}: UseExportProps) => {
  const { t } = useTranslation();
  const [exportProgress, setExportProgress] = useState<number>(0);
  const [isExporting, setIsExporting] = useState(false);
  const [exportComplete, setExportComplete] = useState(false);
  const [exportedBlob, setExportedBlob] = useState<Blob | null>(null);
  const [exportedFormat, setExportedFormat] = useState<string>("");
  const [exportPopoverVisible, setExportPopoverVisible] = useState(false);
  const [exportFormat, setExportFormat] = useState<string>("MP4");
  
  // 导出配置选项
  const [exportResolution, setExportResolution] = useState<string>("1920x1080");
  const [exportFrameRate, setExportFrameRate] = useState<number>(30);
  const [exportBitrate, setExportBitrate] = useState<string>("recommended");
  const [exportBitrateMode, setExportBitrateMode] = useState<string>("CBR");
  const [exportCustomBitrate, setExportCustomBitrate] = useState<string>("5000");
  const [exportCodec, setExportCodec] = useState<string>("libx264");
  const [exportAudioSampleRate, setExportAudioSampleRate] = useState<number>(44100);
  const [exportAudioQuality, setExportAudioQuality] = useState<string>("aac_192");

  // 保存项目为JSON
  const handleSaveProject = async () => {
    try {
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

      await exportProjectAsJSON(
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
      message.success(t("message.projectSaved"));
    } catch (error) {
      console.error("保存项目失败:", error);
      message.error(t("message.saveProjectFailed"));
    }
  };

  // 加载项目
  const handleLoadProject = async (file: File) => {
    try {
      const projectData = await importProjectFromJSON(file);
      const {
        mediaItems: loadedMediaItems,
        clips: loadedClips,
        canvas,
        timeline,
        editor,
      } = loadProjectData(projectData);

      setMediaItems(loadedMediaItems);
      setClips(loadedClips);
      setCanvasRatio(canvas.ratio);
      setScale(timeline.scale);
      setCurrentTime(timeline.currentTime);
      setSelectedClipId(editor.selectedClipId);
      setProjectName(projectData.projectName);

      historyManager.clear();
      historyManager.push(
        loadedClips,
        loadedMediaItems,
        editor.selectedClipId,
        "加载项目"
      );
      updateHistoryButtons();

      setTimeout(() => {
        forceUpdateTextRef.current?.();
      }, 100);

      message.success(`${t("message.projectLoaded")}: "${projectData.projectName}"`);
    } catch (error) {
      console.error("加载项目失败:", error);
      message.error(
        `${t("message.loadProjectFailed")}: ` + (error instanceof Error ? error.message : t("message.unknownError"))
      );
    }
  };

  // 加载Mock数据
  const handleLoadMockData = async () => {
    try {
      const response = await fetch("/mockProject.json");
      let projectData: ProjectData;

      if (!response.ok) {
        const mockData = await import("../../../mock/mockProject.json");
        projectData = mockData.default as ProjectData;
      } else {
        projectData = (await response.json()) as ProjectData;
      }

      const {
        mediaItems: loadedMediaItems,
        clips: loadedClips,
        canvas,
        timeline,
        editor,
      } = loadProjectData(projectData);

      setMediaItems(loadedMediaItems);
      setClips(loadedClips);
      setCanvasRatio(canvas.ratio);
      setScale(timeline.scale);
      setCurrentTime(timeline.currentTime);
      setSelectedClipId(editor.selectedClipId);
      setProjectName(projectData.projectName);

      historyManager.clear();
      historyManager.push(
        loadedClips,
        loadedMediaItems,
        editor.selectedClipId,
        "加载Mock数据"
      );
      updateHistoryButtons();

      setTimeout(() => {
        forceUpdateTextRef.current?.();
      }, 100);

      message.success(t("message.mockDataLoaded"));
    } catch (error) {
      console.error("加载Mock数据失败:", error);
      message.error(t("message.loadMockDataFailed"));
    }
  };

  // 导出功能
  const handleExportConfirm = async () => {
    setExportPopoverVisible(false);

    if (clips.length === 0) {
      message.warning(t("message.noContentToExport"));
      return;
    }

    setIsExporting(true);
    setExportProgress(0);
    setExportComplete(false);
    setExportedBlob(null);
    setExportedFormat(exportFormat);

    try {
      if (exportFormat === "PNG") {
        await exportAsImage();
      } else if (exportFormat === "MP4" || exportFormat === "MOV") {
        await exportAsVideo();
      }
    } catch (error) {
      console.error("导出失败:", error);
      setIsExporting(false);
      message.error(
        `${t("export.failed")}: ${error instanceof Error ? error.message : t("message.unknownError")}`
      );
    }
  };

  const handleDownload = () => {
    if (!exportedBlob) return;

    const url = URL.createObjectURL(exportedBlob);
    const link = document.createElement("a");
    link.href = url;
    let extension = "mp4";
    if (exportedFormat === "PNG") extension = "png";
    else if (exportedFormat === "MOV") extension = "mov";
    else if (exportedFormat === "MP4") extension = "mp4";
    link.download = `video-editor-${Date.now()}.${extension}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setIsExporting(false);
    setExportProgress(0);
    setExportComplete(false);
    setExportedBlob(null);
  };

  const exportAsImage = async () => {
    try {
      const blob = await exportFrameAsPNG(
        clips,
        mediaItems,
        currentTime,
        canvasRatio,
        setExportProgress
      );

      setExportedBlob(blob);
      setExportProgress(100);
      
      // 在100%停顿2秒后再显示下载页面
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setExportComplete(true);
    } catch (error) {
      console.error("导出图片错误:", error);
      setIsExporting(false);
      message.error(`${t("message.exportImageFailed")}: ` + (error instanceof Error ? error.message : t("message.unknownError")));
    }
  };

  const exportAsVideo = async () => {
    try {
      // 确定实际使用的码率
      let actualBitrate = exportBitrate;
      if (exportBitrate === "custom") {
        // 将 KBPS 转换为 FFmpeg 格式（k 为单位）
        actualBitrate = `${exportCustomBitrate}k`;
      }
      
      const blob = await exportAsMP4(
        clips,
        mediaItems,
        canvasRatio,
        setExportProgress,
        {
          resolution: exportResolution,
          frameRate: exportFrameRate,
          bitrate: actualBitrate,
          bitrateMode: exportBitrateMode,
          codec: exportCodec,
          audioSampleRate: exportAudioSampleRate,
          audioQuality: exportAudioQuality,
          format: exportFormat,
        }
      );

      setExportedBlob(blob);
      setExportProgress(100);
      
      // 在100%停顿1秒后再显示下载页面
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setExportComplete(true);
    } catch (error) {
      console.error("导出视频错误:", error);
      setIsExporting(false);
      message.error(`${t("message.exportVideoFailed")}: ` + (error instanceof Error ? error.message : t("message.unknownError")));
    }
  };

  return {
    // 状态
    exportProgress,
    isExporting,
    setIsExporting,
    exportComplete,
    setExportComplete,
    exportedBlob,
    setExportedBlob,
    exportedFormat,
    exportPopoverVisible,
    setExportPopoverVisible,
    exportFormat,
    setExportFormat,
    setExportProgress,
    
    // 导出配置
    exportResolution,
    setExportResolution,
    exportFrameRate,
    setExportFrameRate,
    exportBitrate,
    setExportBitrate,
    exportBitrateMode,
    setExportBitrateMode,
    exportCustomBitrate,
    setExportCustomBitrate,
    exportCodec,
    setExportCodec,
    exportAudioSampleRate,
    setExportAudioSampleRate,
    exportAudioQuality,
    setExportAudioQuality,

    // 方法
    handleSaveProject,
    handleLoadProject,
    handleLoadMockData,
    handleExportConfirm,
    handleDownload,
  };
};

