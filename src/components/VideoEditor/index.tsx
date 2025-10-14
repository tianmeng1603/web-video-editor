import React, { useMemo, useState, useEffect } from "react";
import { Button, Popover, Modal, Select, Input } from "antd";
import {
  BorderOutlined,
  DownloadOutlined,
  CloseOutlined,
  CheckCircleOutlined,
} from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { Toolbar } from "./Sidebar/Toolbar";
import { LeftPanel } from "./Sidebar/LeftPanel";
import { RightPanel } from "./RightPanel/RightPanel";
import { PreviewCanvas } from "./Preview/PreviewCanvas";
import { PlaybackControls } from "./Controls/PlaybackControls";
import { TimelineEditor } from "./Timeline/TimelineEditor";
import { ProjectData } from "./utils/projectData";
import { useProjectState } from "./hooks/useProjectState";
import { useHistoryOperations } from "./hooks/useHistoryOperations";
import { useClipOperations } from "./hooks/useClipOperations";
import { useExport } from "./hooks/useExport";
import { usePlaybackControl } from "./hooks/usePlaybackControl";
import { useInitialData } from "./hooks/useInitialData";
import { useAutoSave } from "./hooks/useAutoSave";
import LanguageSwitcher from "../LanguageSwitcher";

interface VideoEditorProps {
  initialData?: ProjectData;
  onSave?: (projectData: ProjectData) => void | Promise<void>;
  autoSaveDelay?: number;
  enableAutoSave?: boolean;
}

const VideoEditor: React.FC<VideoEditorProps> = ({
  initialData,
  onSave,
  autoSaveDelay = 3000,
  enableAutoSave = true,
}) => {
  const { t } = useTranslation();

  // 1. 项目状态
  const projectState = useProjectState();
  const {
    mediaItems,
    setMediaItems,
    clips,
    setClips,
    projectName,
    setProjectName,
    currentTime,
    setCurrentTime,
    isPlaying,
    setIsPlaying,
    scale,
    setScale,
    selectedClipId,
    setSelectedClipId,
    activePanel,
    setActivePanel,
    canvasRatio,
    setCanvasRatio,
    forceUpdateTextRef,
    isUndoRedoInProgress,
  } = projectState;

  // 2. 历史记录管理
  const historyOps = useHistoryOperations({
    clips,
    mediaItems,
    selectedClipId,
    setClips,
    setMediaItems,
    setSelectedClipId,
    isUndoRedoInProgress,
    forceUpdateTextRef,
  });
  const {
    canUndo,
    canRedo,
    saveToHistory,
    handleUndo,
    handleRedo,
    updateHistoryButtons,
  } = historyOps;

  // 3. 片段操作
  const clipOps = useClipOperations({
    clips,
    mediaItems,
    selectedClipId,
    currentTime,
    setClips,
    setMediaItems,
    setSelectedClipId,
    setCurrentTime,
    saveToHistory,
  });

  // 4. 导出功能
  const exportOps = useExport({
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
  });

  // 5. 播放控制
  const actualDuration = useMemo(() => {
    if (clips.length === 0) return 0;
    return Math.max(...clips.map((c) => c.end));
  }, [clips]);

  const playbackControl = usePlaybackControl({
    isPlaying,
    currentTime,
    actualDuration,
    scale,
    setCurrentTime,
    setIsPlaying,
  });

  // 6. 加载初始数据
  useInitialData({
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
  });

  // 7. 自动保存
  useAutoSave({
    mediaItems,
    clips,
    projectName,
    canvasRatio,
    scale,
    currentTime,
    selectedClipId,
    onSave,
    autoSaveDelay,
    enabled: enableAutoSave,
  });

  // 8. 键盘事件监听（Delete 键删除元素）
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 检查是否按下 Delete 或 Backspace 键
      if (e.key === "Delete" || e.key === "Backspace") {
        // 排除在输入框、文本框等可编辑元素中的按键事件
        const target = e.target as HTMLElement;
        const isEditableElement =
          target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable;

        // 如果在可编辑元素中，不处理删除
        if (isEditableElement) {
          return;
        }

        // 如果有选中的元素，删除它
        if (selectedClipId) {
          e.preventDefault(); // 阻止浏览器默认行为（如后退）
          clipOps.handleDeleteClip();
        }
      }
    };

    // 添加事件监听
    window.addEventListener("keydown", handleKeyDown);

    // 清理函数：组件卸载时移除监听器
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [selectedClipId, clipOps]);

  // 9. 其他功能
  const [ratioPopoverVisible, setRatioPopoverVisible] = useState(false);

  const handleResizeChange = (ratio: string) => {
    // 先取消选中的元素
    setSelectedClipId(null);
    // 再切换画布比例
    setCanvasRatio(ratio);
  };

  // 轨道重新映射
  const handleTracksRemapped = (trackIndexMap: {
    [oldIndex: number]: number;
  }) => {
    if (isUndoRedoInProgress.current) {
      console.log("⏸️ 撤销/重做期间跳过轨道重新映射");
      return;
    }
    setClips((prev) =>
      prev.map((clip) => ({
        ...clip,
        trackIndex: trackIndexMap[clip.trackIndex] ?? clip.trackIndex,
      }))
    );
  };

  // 获取选中的片段
  const selectedClip = clips.find((c) => c.id === selectedClipId) || null;

  // 事件处理函数
  const handleRatioMenuItemClick = (itemOnClick: () => void) => {
    itemOnClick();
    setRatioPopoverVisible(false);
  };

  const handleTimelineClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      setSelectedClipId(null);
    }
  };

  const handleCloseClick = () => {
    // 关闭按钮点击事件（暂无功能）
  };

  // 画布比例菜单
  const resizeMenuItems = [
    {
      key: "16:9",
      label: (
        <div className="flex items-center justify-between w-48">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-5 h-5 border border-gray-400 rounded">
              <div className="w-4 h-2 bg-gray-300"></div>
            </div>
            <span>{t("canvas.ratio169")}</span>
          </div>
          <span className="text-xs text-gray-500">{t("canvas.youtube")}</span>
        </div>
      ),
      onClick: () => handleResizeChange("16:9"),
    },
    {
      key: "9:16",
      label: (
        <div className="flex items-center justify-between w-48">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-5 h-5 border border-gray-400 rounded">
              <div className="w-2 h-4 bg-gray-300"></div>
            </div>
            <span>{t("canvas.ratio916")}</span>
          </div>
          <span className="text-xs text-gray-500">{t("canvas.tiktok")}</span>
        </div>
      ),
      onClick: () => handleResizeChange("9:16"),
    },
    {
      key: "1:1",
      label: (
        <div className="flex items-center justify-between w-48">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-5 h-5 border border-gray-400 rounded">
              <div className="w-3 h-3 bg-gray-300"></div>
            </div>
            <span>{t("canvas.ratio11")}</span>
          </div>
          <span className="text-xs text-gray-500">{t("canvas.instagram")}</span>
        </div>
      ),
      onClick: () => handleResizeChange("1:1"),
    },
  ];

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* 顶部标题栏 */}
      <div className="relative flex items-center justify-between px-4 py-2 bg-white border-b border-gray-300">
        <div className="flex items-center gap-3">
          <img
            src={require("../../assets/return.png")}
            alt={t("common.previous")}
            className={`w-4 h-4 cursor-pointer transition-opacity ${
              canUndo ? "hover:opacity-70" : "opacity-30 cursor-not-allowed"
            }`}
            onClick={canUndo ? handleUndo : undefined}
          />
          <img
            src={require("../../assets/go-on.png")}
            alt={t("common.next")}
            className={`w-4 h-4 ml-4 cursor-pointer transition-opacity ${
              canRedo ? "hover:opacity-70" : "opacity-30 cursor-not-allowed"
            }`}
            onClick={canRedo ? handleRedo : undefined}
          />
        </div>

        <div
          className="absolute transform -translate-x-1/2 left-1/2"
          style={{ color: "#71717a" }}
        >
          {t("common.appTitle")}
        </div>

        <div className="flex items-center gap-4">
          <LanguageSwitcher />

          <Popover
            content={
              <div className="mt-2">
                {resizeMenuItems.map((item) => (
                  <div
                    key={item.key}
                    className="px-2 py-2 cursor-pointer hover:bg-gray-100"
                    onClick={() => handleRatioMenuItemClick(item.onClick)}
                  >
                    {item.label}
                  </div>
                ))}
              </div>
            }
            trigger="click"
            open={ratioPopoverVisible}
            onOpenChange={setRatioPopoverVisible}
            placement="bottomRight"
          >
            <Button
              className="text-xs h-7"
              size="small"
              icon={<BorderOutlined />}
            >
              {t("canvas.resize")}
            </Button>
          </Popover>

          <Popover
            content={
              <div className="w-64" style={{ padding: "12px" }}>
                <div className="mb-3 text-sm font-medium text-gray-900">
                  {t("export.title")}
                </div>

                {/* 格式选择 */}
                <div className="mb-3">
                  <label className="block mb-1 text-xs text-gray-600">
                    {t("export.format")}
                  </label>
                  <Select
                    value={exportOps.exportFormat}
                    onChange={exportOps.setExportFormat}
                    style={{ width: "100%" }}
                    options={[
                      { value: "MP4", label: "MP4" },
                      { value: "MOV", label: "MOV" },
                      { value: "PNG", label: "PNG" },
                    ]}
                  />
                </div>

                {/* MP4/MOV 配置选项 */}
                {(exportOps.exportFormat === "MP4" ||
                  exportOps.exportFormat === "MOV") && (
                  <>
                    {/* 分辨率 */}
                    <div className="mb-3">
                      <label className="block mb-1 text-xs text-gray-600">
                        {t("export.resolution")}
                      </label>
                      <Select
                        value={exportOps.exportResolution}
                        onChange={exportOps.setExportResolution}
                        style={{ width: "100%" }}
                        options={[
                          { value: "7680x4320", label: "8K (7680x4320)" },
                          { value: "3840x2160", label: "4K (3840x2160)" },
                          { value: "2560x1440", label: "2K (2560x1440)" },
                          { value: "1920x1080", label: "1080P (1920x1080)" },
                          { value: "1280x720", label: "720P (1280x720)" },
                          { value: "854x480", label: "480P (854x480)" },
                        ]}
                      />
                    </div>

                    {/* 帧率 */}
                    <div className="mb-3">
                      <label className="block mb-1 text-xs text-gray-600">
                        {t("export.frameRate")}
                      </label>
                      <Select
                        value={exportOps.exportFrameRate}
                        onChange={exportOps.setExportFrameRate}
                        style={{ width: "100%" }}
                        options={[
                          { value: 24, label: "24 fps" },
                          { value: 25, label: "25 fps" },
                          { value: 29.97, label: "29.97 fps" },
                          { value: 30, label: "30 fps" },
                          { value: 50, label: "50 fps" },
                          { value: 59.94, label: "59.94 fps" },
                          { value: 60, label: "60 fps" },
                        ]}
                      />
                    </div>

                    {/* 视频码率 */}
                    <div className="mb-3">
                      <label className="block mb-1 text-xs text-gray-600">
                        {t("export.bitrate")}
                      </label>
                      <Select
                        value={exportOps.exportBitrate}
                        onChange={exportOps.setExportBitrate}
                        style={{ width: "100%" }}
                        options={[
                          {
                            value: "lower",
                            label: t("export.bitrateOptions.lower"),
                          },
                          {
                            value: "recommended",
                            label: t("export.bitrateOptions.recommended"),
                          },
                          {
                            value: "higher",
                            label: t("export.bitrateOptions.higher"),
                          },
                          {
                            value: "custom",
                            label: t("export.bitrateOptions.custom"),
                          },
                        ]}
                      />
                    </div>

                    {/* 自定义码率 */}
                    {exportOps.exportBitrate === "custom" && (
                      <>
                        <div className="mb-3">
                          <label className="block mb-1 text-xs text-gray-600">
                            {t("export.bitrateMode")}
                          </label>
                          <Select
                            value={exportOps.exportBitrateMode}
                            onChange={exportOps.setExportBitrateMode}
                            style={{ width: "100%" }}
                            options={[
                              {
                                value: "CBR",
                                label: t("export.bitrateModeOptions.cbr"),
                              },
                              {
                                value: "VBR",
                                label: t("export.bitrateModeOptions.vbr"),
                              },
                            ]}
                          />
                        </div>
                        <div className="mb-3">
                          <label className="block mb-1 text-xs text-gray-600">
                            {t("export.customBitrate")} (KBPS)
                          </label>
                          <Input
                            type="number"
                            value={exportOps.exportCustomBitrate}
                            onChange={(e) =>
                              exportOps.setExportCustomBitrate(e.target.value)
                            }
                            placeholder="5000"
                            min={100}
                            max={100000}
                            style={{ width: "100%" }}
                          />
                        </div>
                      </>
                    )}

                    {/* 视频编码 */}
                    <div className="mb-3">
                      <label className="block mb-1 text-xs text-gray-600">
                        {t("export.codec")}
                      </label>
                      <Select
                        value={exportOps.exportCodec}
                        onChange={exportOps.setExportCodec}
                        style={{ width: "100%" }}
                        options={[
                          { value: "libx264", label: "H.264" },
                          { value: "libx265", label: "HEVC" },
                          { value: "libx265_alpha", label: "HEVC (Alpha)" },
                          { value: "libx265_422", label: "HEVC (422)" },
                          { value: "libaom-av1", label: "AV1" },
                          { value: "rle", label: "RLE" },
                        ]}
                      />
                    </div>

                    {/* 音频采样率 */}
                    <div className="mb-3">
                      <label className="block mb-1 text-xs text-gray-600">
                        {t("export.audioSampleRate")}
                      </label>
                      <Select
                        value={exportOps.exportAudioSampleRate}
                        onChange={exportOps.setExportAudioSampleRate}
                        style={{ width: "100%" }}
                        options={[
                          { value: 44100, label: "44100 Hz" },
                          { value: 48000, label: "48000 Hz" },
                        ]}
                      />
                    </div>

                    {/* 音频质量 */}
                    <div className="mb-3">
                      <label className="block mb-1 text-xs text-gray-600">
                        {t("export.audioQuality")}
                      </label>
                      <Select
                        value={exportOps.exportAudioQuality}
                        onChange={exportOps.setExportAudioQuality}
                        style={{ width: "100%" }}
                        options={[
                          { value: "aac_192", label: "AAC 192 kbps" },
                          { value: "aac_256", label: "AAC 256 kbps" },
                          { value: "aac_320", label: "AAC 320 kbps" },
                          {
                            value: "pcm",
                            label: t("export.audioQualityOptions.pcm"),
                          },
                        ]}
                      />
                    </div>
                  </>
                )}

                <Button
                  type="primary"
                  className="w-full mt-3 text-white bg-black border-black hover:bg-gray-800"
                  onClick={exportOps.handleExportConfirm}
                >
                  {t("common.export")}
                </Button>
              </div>
            }
            trigger="click"
            open={exportOps.exportPopoverVisible}
            onOpenChange={exportOps.setExportPopoverVisible}
            placement="bottomRight"
          >
            <Button
              icon={<DownloadOutlined />}
              className="text-xs text-white bg-black border-black h-7"
            >
              {t("common.export")}
            </Button>
          </Popover>

          <div
            className="flex items-center justify-center transition-colors bg-white border border-gray-300 rounded-full cursor-pointer w-7 h-7 hover:border-gray-400"
            onClick={handleCloseClick}
          >
            <CloseOutlined className="text-xs text-gray-600" />
          </div>
        </div>
      </div>

      {/* 主要内容区域 */}
      <div className="flex flex-1 overflow-hidden">
        <div className="flex flex-col flex-1 overflow-hidden">
          <PanelGroup direction="vertical">
            <Panel defaultSize={65} minSize={30}>
              <div className="flex h-full overflow-hidden">
                <div className="flex">
                  <Toolbar
                    activePanel={activePanel}
                    onPanelChange={setActivePanel}
                  />
                  <LeftPanel
                    activePanel={activePanel}
                    mediaItems={mediaItems}
                    onMediaAdd={clipOps.handleMediaAdd}
                    onMediaRemove={clipOps.handleMediaRemove}
                    onAddToTimeline={clipOps.handleClipAdd}
                    onMediaAndClipAdd={clipOps.handleMediaAndClipAdd}
                    existingClips={clips}
                  />
                </div>

                <div className="flex-1 overflow-hidden">
                  <PreviewCanvas
                    currentTime={currentTime}
                    clips={clips}
                    mediaItems={mediaItems}
                    isPlaying={isPlaying}
                    canvasRatio={canvasRatio}
                    selectedClipId={selectedClipId}
                    onClipUpdate={clipOps.handleClipUpdate}
                    onClipSelect={setSelectedClipId}
                    forceUpdateTextRef={forceUpdateTextRef}
                  />
                </div>
              </div>
            </Panel>

            <PanelResizeHandle className="bg-gray-300 hover:bg-blue-400 cursor-row-resize" />

            <Panel defaultSize={30} minSize={20}>
              <div className="flex flex-col h-full">
                <PlaybackControls
                  currentTime={currentTime}
                  duration={actualDuration}
                  isPlaying={isPlaying}
                  scale={scale}
                  selectedClipId={selectedClipId}
                  onTimeChange={playbackControl.handleTimeChange}
                  onPlayPause={playbackControl.handlePlayPause}
                  onScaleChange={setScale}
                  onCopyClip={clipOps.handleCopyClip}
                  onSplitClip={clipOps.handleSplitClip}
                  onDeleteClip={clipOps.handleDeleteClip}
                />

                <div
                  className="flex-1 overflow-hidden"
                  onClick={handleTimelineClick}
                >
                  <TimelineEditor
                    clips={clips}
                    mediaItems={mediaItems}
                    currentTime={currentTime}
                    duration={actualDuration}
                    scale={scale}
                    selectedClipId={selectedClipId}
                    onClipUpdate={clipOps.handleClipUpdate}
                    onClipRemove={clipOps.handleClipRemove}
                    onClipResize={clipOps.handleClipResize}
                    onClipResizeEnd={clipOps.handleClipResizeEnd}
                    onTimeChange={playbackControl.handleTimeChange}
                    onScaleChange={setScale}
                    onClipSelect={setSelectedClipId}
                    onCursorDragStart={playbackControl.handleCursorDragStart}
                    onCursorDragEnd={playbackControl.handleCursorDragEnd}
                    onTracksRemapped={handleTracksRemapped}
                    onDragStart={() => console.log("开始拖拽片段")}
                    onDragEnd={() => console.log("结束拖拽片段")}
                  />
                </div>
              </div>
            </Panel>
          </PanelGroup>
        </div>

        <RightPanel
          selectedClip={selectedClip}
          mediaItems={mediaItems}
          onClipUpdate={clipOps.handleClipUpdate}
          onClipDeselect={() => setSelectedClipId(null)}
        />
      </div>

      {/* 导出进度Modal */}
      <Modal
        title={t("export.download")}
        open={exportOps.isExporting}
        onCancel={() => {
          if (exportOps.exportComplete) {
            // 下载页面：直接关闭
            exportOps.setIsExporting(false);
            exportOps.setExportProgress(0);
            exportOps.setExportComplete(false);
            exportOps.setExportedBlob(null);
          } else {
            // 导出中：显示确认对话框
            Modal.confirm({
              title: t("export.cancelTitle"),
              content: t("export.cancelMessage"),
              okText: t("common.confirm"),
              cancelText: t("common.cancel"),
              zIndex: 10000,
              okButtonProps: {
                className: "bg-black border-black hover:bg-gray-800",
              },
              onOk: () => {
                // 重置导出状态，取消导出
                exportOps.setIsExporting(false);
                exportOps.setExportProgress(0);
                exportOps.setExportComplete(false);
                exportOps.setExportedBlob(null);
              },
            });
          }
        }}
        footer={null}
        closable={true}
        width={700}
        centered
        zIndex={9999}
      >
        <div
          className="flex flex-col items-center justify-center"
          style={{ height: "400px" }}
        >
          {exportOps.exportComplete ? (
            <>
              <CheckCircleOutlined className="mb-2 text-2xl" />
              <div className="mb-2 text-lg text-gray-900">
                {t("export.success")}
              </div>
              <div className="mb-8 text-sm text-gray-500">
                {exportOps.exportedFormat === "PNG"
                  ? t("export.exportingImage")
                  : t("export.exportingVideo")}
              </div>
              <Button
                type="primary"
                size="large"
                className="w-24 bg-black border-black hover:bg-gray-800"
                onClick={exportOps.handleDownload}
              >
                {t("export.download")}
              </Button>
            </>
          ) : (
            <>
              <div className="mb-6 text-6xl font-bold text-gray-900">
                {exportOps.exportProgress}%
              </div>
              <div className="mb-2 text-lg text-gray-900">
                {t("export.exporting")}
              </div>
              <div className="text-sm text-gray-500">
                {t("export.progress")}
              </div>
            </>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default VideoEditor;
