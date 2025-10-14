import React, { useState, useEffect } from "react";
import { Input, Slider, ColorPicker } from "antd";
import { CloseOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import { TimelineClip, MediaItem } from "../types";
import { CropModal } from "./CropModal";

interface VideoStylePanelProps {
  selectedClip: TimelineClip;
  mediaItem: MediaItem;
  onClose: () => void;
  onClipUpdate: (id: string, updates: Partial<TimelineClip>) => void;
}

const VideoStylePanelComponent: React.FC<VideoStylePanelProps> = ({
  selectedClip,
  mediaItem,
  onClose,
  onClipUpdate,
}) => {
  const { t } = useTranslation();
  const [mediaStyle, setMediaStyle] = useState(selectedClip.mediaStyle || {});
  const [volume, setVolume] = useState(selectedClip.volume ?? 100);
  const [videoOpacity, setVideoOpacity] = useState(selectedClip.opacity ?? 100);
  const [cropModalVisible, setCropModalVisible] = useState(false);

  // 当选中素材改变时，更新状态
  useEffect(() => {
    setMediaStyle(selectedClip.mediaStyle || {});
    setVolume(selectedClip.volume ?? 100);
    setVideoOpacity(selectedClip.opacity ?? 100);
  }, [
    selectedClip.id,
    selectedClip.mediaStyle,
    selectedClip.volume,
    selectedClip.opacity,
  ]);

  // 更新媒体样式
  const updateMediaStyle = (updates: Partial<typeof mediaStyle>) => {
    const newMediaStyle = { ...mediaStyle, ...updates };
    setMediaStyle(newMediaStyle);
    onClipUpdate(selectedClip.id, { mediaStyle: newMediaStyle });
  };

  // 更新音量
  const updateVolume = (value: number) => {
    setVolume(value);
    onClipUpdate(selectedClip.id, { volume: value });
  };

  // 更新不透明度
  const updateOpacity = (value: number) => {
    setVideoOpacity(value);
    onClipUpdate(selectedClip.id, { opacity: value });
  };

  return (
    <>
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold">{t("toolbar.video")}</div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
          <CloseOutlined />
        </button>
      </div>
      <div className="space-y-4">
        {/* 裁剪按钮 */}
        <div className="flex items-center py-3 border-b border-gray-200">
          <div
            className="p-2 transition-colors rounded cursor-pointer hover:bg-gray-200"
            style={{ backgroundColor: "#F4F4F5" }}
            onClick={() => setCropModalVisible(true)}
          >
            <img
              src={require("../../../assets/tailoring.png")}
              alt={t("videoStyle.crop")}
              className="w-4 h-4"
            />
          </div>
        </div>

        {/* Basic */}
        <div>
          <h4 className="mb-3 text-sm font-semibold text-gray-900">
            {t("videoStyle.title")}
          </h4>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs text-gray-600">
                {t("videoStyle.volume")}
              </label>
              <div className="flex items-center gap-2 w-36">
                <Input
                  value={volume}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value) || 0;
                    updateVolume(Math.max(0, Math.min(100, val)));
                  }}
                  className="text-center"
                  style={{
                    width: "30px",
                    height: "30px",
                    padding: "4px",
                    borderRadius: "4px",
                  }}
                />
                <div style={{ flex: 1 }}>
                  <Slider
                    value={volume}
                    onChange={updateVolume}
                    min={0}
                    max={100}
                    styles={{ track: { backgroundColor: "#18181b" } }}
                  />
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <label className="text-xs text-gray-600">
                {t("videoStyle.opacity")}
              </label>
              <div className="flex items-center gap-2 w-36">
                <Input
                  value={videoOpacity}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value) || 0;
                    updateOpacity(Math.max(0, Math.min(100, val)));
                  }}
                  className="text-center"
                  style={{
                    width: "30px",
                    height: "30px",
                    padding: "4px",
                    borderRadius: "4px",
                  }}
                />
                <div style={{ flex: 1 }}>
                  <Slider
                    value={videoOpacity}
                    onChange={updateOpacity}
                    min={0}
                    max={100}
                    styles={{ track: { backgroundColor: "#18181b" } }}
                  />
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <label className="text-xs text-gray-600">
                {t("videoStyle.borderRadius")}
              </label>
              <div className="flex items-center gap-2 w-36">
                <Input
                  value={mediaStyle.borderRadius || 0}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value) || 0;
                    updateMediaStyle({
                      borderRadius: Math.max(0, Math.min(100, val)),
                    });
                  }}
                  className="text-center"
                  style={{
                    width: "30px",
                    height: "30px",
                    padding: "4px",
                    borderRadius: "4px",
                  }}
                />
                <div style={{ flex: 1 }}>
                  <Slider
                    value={mediaStyle.borderRadius || 0}
                    onChange={(value) =>
                      updateMediaStyle({ borderRadius: value })
                    }
                    min={0}
                    max={100}
                    styles={{ track: { backgroundColor: "#18181b" } }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Outline */}
        <div className="pt-3 mt-3 border-t border-gray-200">
          <h4 className="mb-3 text-sm font-semibold text-gray-900">
            {t("videoStyle.outline")}
          </h4>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs text-gray-600">
                {t("videoStyle.outlineColor")}
              </label>
              <div className="w-36">
                <ColorPicker
                  value={mediaStyle.outlineColor || "#000000"}
                  onChange={(color) =>
                    updateMediaStyle({ outlineColor: color.toHexString() })
                  }
                  size="small"
                  showText
                  style={{
                    width: "100%",
                    justifyContent: "left",
                    padding: "4px 7px",
                  }}
                />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <label className="text-xs text-gray-600">
                {t("videoStyle.outlineWidth")}
              </label>
              <Input
                type="number"
                value={mediaStyle.outlineWidth || 0}
                onChange={(e) =>
                  updateMediaStyle({ outlineWidth: Number(e.target.value) })
                }
                className="w-36"
                size="small"
              />
            </div>
          </div>
        </div>

        {/* Shadow */}
        <div className="pt-3 mt-3 border-t border-gray-200">
          <h4 className="mb-3 text-sm font-semibold text-gray-900">
            {t("videoStyle.shadow")}
          </h4>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs text-gray-600">
                {t("videoStyle.shadowColor")}
              </label>
              <div className="w-36">
                <ColorPicker
                  value={mediaStyle.shadowColor || "#000000"}
                  onChange={(color) =>
                    updateMediaStyle({ shadowColor: color.toHexString() })
                  }
                  size="small"
                  showText
                  style={{
                    width: "100%",
                    justifyContent: "left",
                    padding: "4px 7px",
                  }}
                />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <label className="text-xs text-gray-600">
                {t("videoStyle.shadowX")}
              </label>
              <Input
                type="number"
                value={mediaStyle.shadowOffsetX || 0}
                onChange={(e) =>
                  updateMediaStyle({ shadowOffsetX: Number(e.target.value) })
                }
                className="w-36"
                size="small"
              />
            </div>
            <div className="flex items-center justify-between">
              <label className="text-xs text-gray-600">
                {t("videoStyle.shadowY")}
              </label>
              <Input
                type="number"
                value={mediaStyle.shadowOffsetY || 0}
                onChange={(e) =>
                  updateMediaStyle({ shadowOffsetY: Number(e.target.value) })
                }
                className="w-36"
                size="small"
              />
            </div>
            <div className="flex items-center justify-between">
              <label className="text-xs text-gray-600">
                {t("videoStyle.shadowBlur")}
              </label>
              <Input
                type="number"
                value={mediaStyle.shadowBlur || 0}
                onChange={(e) =>
                  updateMediaStyle({ shadowBlur: Number(e.target.value) })
                }
                className="w-36"
                size="small"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 裁剪模态框 */}
      <CropModal
        visible={cropModalVisible}
        mediaUrl={mediaItem.url}
        mediaType="video"
        mediaThumbnail={mediaItem.thumbnail}
        mediaWidth={mediaItem.width}
        mediaHeight={mediaItem.height}
        existingCrop={selectedClip.cropArea}
        onClose={() => setCropModalVisible(false)}
        onApply={(croppedVideoUrl: any, cropData: any) => {
          console.log("🎯 VideoStylePanel - 视频裁剪完成:", croppedVideoUrl);

          // 🎯 CSS 坐标裁剪：容器尺寸要合理，且宽高比匹配裁剪区域
          const currentWidth = selectedClip.width;
          const currentHeight = selectedClip.height;

          // 计算裁剪区域的宽高比
          const cropRatio = cropData.width / cropData.height;

          let newWidth, newHeight;

          if (currentWidth && currentHeight) {
            // 已有容器：保持面积相近，但调整宽高比为裁剪区域的比例
            const currentArea = currentWidth * currentHeight;
            // 根据裁剪区域的宽高比，重新计算容器尺寸
            newHeight = Math.sqrt(currentArea / cropRatio);
            newWidth = newHeight * cropRatio;

            console.log("  基于现有容器调整:");
            console.log(
              "    原容器:",
              currentWidth.toFixed(2),
              "x",
              currentHeight.toFixed(2)
            );
            console.log("    原面积:", currentArea.toFixed(2));
          } else {
            // 首次裁剪：模拟 MediaElement 的默认尺寸计算逻辑
            const canvasElement = document.getElementById("preview-canvas-bg");
            let canvasWidth = 1920;
            let canvasHeight = 1080;

            if (canvasElement) {
              canvasWidth = parseFloat(
                canvasElement.getAttribute("data-width") || "1920"
              );
              canvasHeight = parseFloat(
                canvasElement.getAttribute("data-height") || "1080"
              );
            }

            const maxWidth = canvasWidth * 0.5;
            const maxHeight = canvasHeight * 0.5;
            const mediaWidth = mediaItem?.width || cropData.width;
            const mediaHeight = mediaItem?.height || cropData.height;
            const mediaRatio = mediaWidth / mediaHeight;

            // 计算视频未裁剪时的默认显示尺寸
            let originalDisplayWidth: number;
            let originalDisplayHeight: number;
            if (mediaWidth > maxWidth || mediaHeight > maxHeight) {
              // 原始尺寸超过画布50%，需要缩放
              if (mediaRatio > maxWidth / maxHeight) {
                originalDisplayWidth = maxWidth;
                originalDisplayHeight = maxWidth / mediaRatio;
              } else {
                originalDisplayHeight = maxHeight;
                originalDisplayWidth = maxHeight * mediaRatio;
              }
            } else {
              // 原始尺寸小于画布50%，使用原始尺寸
              originalDisplayWidth = mediaWidth;
              originalDisplayHeight = mediaHeight;
            }

            // 计算裁剪比例（裁剪区域占原始视频的比例）
            const cropWidthRatio = cropData.width / mediaWidth;
            const cropHeightRatio = cropData.height / mediaHeight;

            // 裁剪后的容器 = 默认显示尺寸 × 裁剪比例
            newWidth = originalDisplayWidth * cropWidthRatio;
            newHeight = originalDisplayHeight * cropHeightRatio;

            console.log("  首次裁剪计算:");
            console.log("    画布尺寸:", canvasWidth, "x", canvasHeight);
            console.log("    原始视频:", mediaWidth, "x", mediaHeight);
            console.log(
              "    未裁剪显示尺寸:",
              originalDisplayWidth.toFixed(2),
              "x",
              originalDisplayHeight.toFixed(2)
            );
            console.log(
              "    裁剪比例:",
              cropWidthRatio.toFixed(4),
              "x",
              cropHeightRatio.toFixed(4)
            );
          }

          console.log("  裁剪区域比例:", cropRatio.toFixed(4));
          console.log(
            "  裁剪后容器:",
            newWidth.toFixed(2),
            "x",
            newHeight.toFixed(2)
          );
          console.log("  容器比例:", (newWidth / newHeight).toFixed(4));

          // CSS 裁剪只保存坐标，不保存 croppedUrl
          onClipUpdate(selectedClip.id, {
            cropArea: cropData,
            width: newWidth,
            height: newHeight,
          });
        }}
      />
    </>
  );
};

export const VideoStylePanel = React.memo(VideoStylePanelComponent);
