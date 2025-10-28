import React from "react";
import { useTranslation } from "react-i18next";
import { MediaUploader } from "./MediaUploader";
import { MediaLibrary } from "./MediaLibrary";
import { MediaItem, TimelineClip } from "../types";
import { Button } from "antd";
import { ThinScrollbar } from "../utils/Scrollbar";

interface LeftPanelProps {
  activePanel: string | null;
  mediaItems: MediaItem[];
  onMediaAdd: (item: MediaItem) => void;
  onMediaRemove: (id: string) => void;
  onAddToTimeline: (clip: TimelineClip) => void;
  onMediaAndClipAdd: (media: MediaItem, clip: TimelineClip) => void;
  existingClips: TimelineClip[];
  currentTime: number;
}

// 添加文本到时间轴的工具函数（导出供其他组件使用）
export const createTextClip = (
  text: string,
  mediaItems: MediaItem[],
  onAddToTimeline: (clip: TimelineClip) => void,
  startTime: number = 0
) => {
  // 查找已存在的文字素材，或使用默认ID
  const existingTextMedia = mediaItems.find((item) => item.type === "text");
  const textMediaId = existingTextMedia?.id || "default-text-media";

  // 获取画布尺寸（基准尺寸1920x1080）
  const canvasWidth = 1920;
  const canvasHeight = 1080;
  const textWidth = 300;
  const textHeight = 80;

  // 创建文本片段
  const textClip: TimelineClip = {
    id: `clip-${Date.now()}-${Math.random()}`,
    mediaId: textMediaId,
    type: "text", // 添加类型字段
    start: startTime,
    end: startTime + 5,
    trackIndex: 0,
    text: text,
    width: textWidth,
    height: textHeight,
    x: (canvasWidth - textWidth) / 2,
    y: (canvasHeight - textHeight) / 2,
    textStyle: {
      fontSize: 48,
      fontFamily: "Arial",
      color: "#FFFFFF",
      textAlign: "center",
    },
  };

  // 只添加片段到时间轴，不添加素材到素材库
  onAddToTimeline(textClip);
};

const LeftPanelComponent: React.FC<LeftPanelProps> = ({
  activePanel,
  mediaItems,
  onMediaAdd,
  onMediaRemove,
  onAddToTimeline,
  onMediaAndClipAdd,
  existingClips,
  currentTime,
}) => {
  const { t } = useTranslation();

  if (!activePanel) return null;

  const renderContent = () => {
    switch (activePanel) {
      case "folder":
        // 按类型分组素材
        const videoItems = mediaItems.filter((item) => item.type === "video");
        const audioItems = mediaItems.filter((item) => item.type === "audio");
        const imageItems = mediaItems.filter((item) => item.type === "image");
        const folderTextItems = mediaItems.filter(
          (item) => item.type === "text"
        );

        return (
          <div className="flex flex-col h-full">
            <div style={{ padding: "10px" }} className="border-b">
              <MediaUploader onMediaAdd={onMediaAdd} />
            </div>
            <ThinScrollbar className="flex-1 h-full">
              {/* 文字分组 */}
              <div style={{ marginBottom: "10px" }}>
                <div
                  style={{
                    paddingLeft: "10px",
                    paddingRight: "10px",
                    paddingTop: "10px",
                    marginBottom: "10px",
                    fontSize: "12px",
                  }}
                  className="font-semibold text-gray-700"
                >
                  {t("mediaLibrary.textSection")}
                </div>
                <div style={{ paddingLeft: "10px", paddingRight: "10px" }}>
                  <Button
                    block
                    style={{
                      height: "26px",
                      fontSize: "12px",
                      borderRadius: "4px",
                    }}
                    onClick={() =>
                      createTextClip(
                        "Text",
                        mediaItems,
                        onAddToTimeline,
                        currentTime
                      )
                    }
                  >
                    {t("mediaLibrary.addText")}
                  </Button>
                </div>
                {folderTextItems.length > 0 && (
                  <MediaLibrary
                    mediaItems={folderTextItems}
                    onMediaRemove={onMediaRemove}
                    onAddToTimeline={onAddToTimeline}
                    existingClips={existingClips}
                    useScrollbar={false}
                    currentTime={currentTime}
                  />
                )}
              </div>
              {/* 图片分组 */}
              {imageItems.length > 0 && (
                <div style={{ marginBottom: "10px" }}>
                  <div
                    style={{
                      paddingLeft: "10px",
                      paddingRight: "10px",
                      marginBottom: "10px",
                      fontSize: "12px",
                    }}
                    className="font-semibold text-gray-700"
                  >
                    {t("mediaLibrary.imageSection")} ({imageItems.length})
                  </div>
                  <MediaLibrary
                    mediaItems={imageItems}
                    onMediaRemove={onMediaRemove}
                    onAddToTimeline={onAddToTimeline}
                    existingClips={existingClips}
                    useScrollbar={false}
                    currentTime={currentTime}
                  />
                </div>
              )}

              {/* 视频分组 */}
              {videoItems.length > 0 && (
                <div style={{ marginBottom: "10px" }}>
                  <div
                    style={{
                      paddingLeft: "10px",
                      paddingRight: "10px",
                      marginBottom: "10px",
                      fontSize: "12px",
                    }}
                    className="font-semibold text-gray-700"
                  >
                    {t("mediaLibrary.videoSection")} ({videoItems.length})
                  </div>
                  <div>
                    <MediaLibrary
                      mediaItems={videoItems}
                      onMediaRemove={onMediaRemove}
                      onAddToTimeline={onAddToTimeline}
                      existingClips={existingClips}
                      useScrollbar={false}
                      currentTime={currentTime}
                    />
                  </div>
                </div>
              )}

              {/* 音频分组 */}
              {audioItems.length > 0 && (
                <div style={{ marginBottom: "10px" }}>
                  <div
                    style={{
                      paddingLeft: "10px",
                      paddingRight: "10px",
                      marginBottom: "10px",
                      fontSize: "12px",
                    }}
                    className="font-semibold text-gray-700"
                  >
                    {t("mediaLibrary.audioSection")} ({audioItems.length})
                  </div>
                  <MediaLibrary
                    mediaItems={audioItems}
                    onMediaRemove={onMediaRemove}
                    onAddToTimeline={onAddToTimeline}
                    existingClips={existingClips}
                    useScrollbar={false}
                    currentTime={currentTime}
                  />
                </div>
              )}

              {/* 空状态 */}
              {mediaItems.length === 0 && (
                <div
                  style={{ padding: "10px 10px 20px 10px" }}
                  className="text-center text-gray-400"
                >
                  <p style={{ fontSize: "12px" }}>
                    {t("mediaLibrary.noMedia")}
                  </p>
                  <p style={{ marginTop: "10px" }} className="text-xs">
                    {t("mediaLibrary.uploadPrompt")}
                  </p>
                </div>
              )}
            </ThinScrollbar>
          </div>
        );
      case "text":
        // 获取文字模板
        const textItems = mediaItems.filter((item) => item.type === "text");
        console.log("📝 文字面板 - textItems:", textItems);
        return (
          <div className="flex flex-col h-full">
            <div style={{ padding: "10px 10px 0 10px" }}>
              <div
                style={{ marginBottom: "10px", fontSize: "12px" }}
                className="font-semibold"
              >
                {t("toolbar.text")}
              </div>
              <Button
                block
                style={{
                  height: "26px",
                  fontSize: "12px",
                  borderRadius: "4px",
                }}
                onClick={() =>
                  createTextClip(
                    "Text",
                    mediaItems,
                    onAddToTimeline,
                    currentTime
                  )
                }
              >
                {t("mediaLibrary.addText")}
              </Button>
            </div>
            {textItems.length > 0 && (
              <div className="flex-1">
                <MediaLibrary
                  mediaItems={textItems}
                  onMediaRemove={onMediaRemove}
                  onAddToTimeline={onAddToTimeline}
                  existingClips={existingClips}
                  currentTime={currentTime}
                />
              </div>
            )}
          </div>
        );
      case "videos":
      case "audio":
      case "images":
        return (
          <div className="flex flex-col h-full">
            <div style={{ padding: "10px" }} className="border-b">
              <div
                style={{ marginBottom: "10px", fontSize: "12px" }}
                className="font-semibold"
              >
                {activePanel === "videos"
                  ? t("toolbar.video")
                  : activePanel === "audio"
                  ? t("toolbar.audio")
                  : t("toolbar.image")}
              </div>
              <MediaUploader onMediaAdd={onMediaAdd} />
            </div>
            <MediaLibrary
              mediaItems={mediaItems.filter((item) => {
                if (activePanel === "videos") return item.type === "video";
                if (activePanel === "audio") return item.type === "audio";
                if (activePanel === "images") return item.type === "image";
                return true;
              })}
              onMediaRemove={onMediaRemove}
              onAddToTimeline={onAddToTimeline}
              existingClips={existingClips}
              currentTime={currentTime}
            />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div
      className="flex flex-col bg-white border-r border-gray-300"
      style={{ width: "240px" }}
    >
      {renderContent()}
    </div>
  );
};

export const LeftPanel = React.memo(LeftPanelComponent);
