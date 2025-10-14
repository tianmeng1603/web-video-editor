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
}

// 添加文本到时间轴的工具函数
const createTextClip = (
  existingClips: TimelineClip[],
  onMediaAndClipAdd: (media: MediaItem, clip: TimelineClip) => void
) => {
  // 创建文本素材
  const textMediaId = `text-media-${Date.now()}`;
  const textMedia: MediaItem = {
    id: textMediaId,
    name: "Text", // 使用英文，作为默认标识符
    type: "text",
    url: "",
    file: new File([], "text.txt"),
    duration: 5,
  };

  // 获取画布尺寸（基准尺寸1920x1080）
  const canvasWidth = 1920;
  const canvasHeight = 1080;
  const textWidth = 200;
  const textHeight = 60;

  // 创建文本片段
  const textClip: TimelineClip = {
    id: `clip-${Date.now()}-${Math.random()}`,
    mediaId: textMediaId,
    start: 0,
    end: 5,
    trackIndex: 0,
    text: "Text",
    width: textWidth, // 设置初始宽度，使右中控制点可以工作
    height: textHeight, // 设置初始高度
    // 设置默认位置（居中）
    x: (canvasWidth - textWidth) / 2,
    y: (canvasHeight - textHeight) / 2,
  };

  // 原子操作：同时添加素材和片段
  onMediaAndClipAdd(textMedia, textClip);
};

const LeftPanelComponent: React.FC<LeftPanelProps> = ({
  activePanel,
  mediaItems,
  onMediaAdd,
  onMediaRemove,
  onAddToTimeline,
  onMediaAndClipAdd,
  existingClips,
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

        return (
          <div className="flex flex-col h-full">
            <div className="p-4 border-b">
              <MediaUploader onMediaAdd={onMediaAdd} />
            </div>
            <ThinScrollbar className="flex-1 h-full">
              {/* 文字分组 */}
              <div className="mb-2">
                <div className="px-4 py-2 text-sm font-semibold text-gray-700">
                  {t("mediaLibrary.textSection")}
                </div>
                <div className="px-4">
                  <Button
                    block
                    onClick={() =>
                      createTextClip(existingClips, onMediaAndClipAdd)
                    }
                  >
                    {t("mediaLibrary.addText")}
                  </Button>
                </div>
              </div>
              {/* 图片分组 */}
              {imageItems.length > 0 && (
                <div className="mb-2">
                  <div className="px-4 py-2 text-sm font-semibold text-gray-700">
                    {t("mediaLibrary.imageSection")} ({imageItems.length})
                  </div>
                  <MediaLibrary
                    mediaItems={imageItems}
                    onMediaRemove={onMediaRemove}
                    onAddToTimeline={onAddToTimeline}
                    existingClips={existingClips}
                    useScrollbar={false}
                  />
                </div>
              )}

              {/* 视频分组 */}
              {videoItems.length > 0 && (
                <div className="mb-2">
                  <div className="px-4 py-2 text-sm font-semibold text-gray-700">
                    {t("mediaLibrary.videoSection")} ({videoItems.length})
                  </div>
                  <div>
                    <MediaLibrary
                      mediaItems={videoItems}
                      onMediaRemove={onMediaRemove}
                      onAddToTimeline={onAddToTimeline}
                      existingClips={existingClips}
                      useScrollbar={false}
                    />
                  </div>
                </div>
              )}

              {/* 音频分组 */}
              {audioItems.length > 0 && (
                <div className="mb-2">
                  <div className="px-4 py-2 text-sm font-semibold text-gray-700">
                    {t("mediaLibrary.audioSection")} ({audioItems.length})
                  </div>
                  <MediaLibrary
                    mediaItems={audioItems}
                    onMediaRemove={onMediaRemove}
                    onAddToTimeline={onAddToTimeline}
                    existingClips={existingClips}
                    useScrollbar={false}
                  />
                </div>
              )}

              {/* 空状态 */}
              {mediaItems.length === 0 && (
                <div className="px-4 py-8 text-center text-gray-400">
                  <p className="text-sm">{t("mediaLibrary.noMedia")}</p>
                  <p className="mt-2 text-xs">
                    {t("mediaLibrary.uploadPrompt")}
                  </p>
                </div>
              )}
            </ThinScrollbar>
          </div>
        );
      case "text":
        return (
          <div className="p-4">
            <div className="mb-2 text-sm font-semibold">
              {t("toolbar.text")}
            </div>
            <Button
              block
              className="mb-4"
              onClick={() => createTextClip(existingClips, onMediaAndClipAdd)}
            >
              {t("mediaLibrary.addText")}
            </Button>
          </div>
        );
      case "videos":
      case "audio":
      case "images":
        return (
          <div className="flex flex-col h-full">
            <div className="p-4 border-b">
              <div className="mb-4 text-sm font-semibold">
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
      style={{ width: "280px" }}
    >
      {renderContent()}
    </div>
  );
};

export const LeftPanel = React.memo(LeftPanelComponent);
