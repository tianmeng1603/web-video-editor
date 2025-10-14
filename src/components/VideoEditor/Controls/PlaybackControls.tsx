import React from "react";
import { Slider } from "antd";
import { Divider } from "antd";
import {
  StepBackwardOutlined,
  CaretRightOutlined,
  PauseOutlined,
  StepForwardOutlined,
  ZoomInOutlined,
  ZoomOutOutlined,
  DeleteOutlined,
} from "@ant-design/icons";

interface PlaybackControlsProps {
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  scale: number;
  selectedClipId: string | null;
  onTimeChange: (time: number) => void;
  onPlayPause: () => void;
  onScaleChange: (scale: number) => void;
  onCopyClip: () => void;
  onSplitClip: () => void;
  onDeleteClip: () => void;
}

const PlaybackControlsComponent: React.FC<PlaybackControlsProps> = ({
  currentTime,
  duration,
  isPlaying,
  scale,
  selectedClipId,
  onTimeChange,
  onPlayPause,
  onScaleChange,
  onCopyClip,
  onSplitClip,
  onDeleteClip,
}) => {
  const formatTime = (seconds: number) => {
    if (seconds < 3600) {
      // 小于1小时，显示分:秒
      const mins = Math.floor(seconds / 60);
      const secs = Math.floor(seconds % 60);
      return `${mins.toString().padStart(2, "0")}:${secs
        .toString()
        .padStart(2, "0")}`;
    } else {
      // 大于等于1小时，显示时:分:秒
      const hours = Math.floor(seconds / 3600);
      const mins = Math.floor((seconds % 3600) / 60);
      const secs = Math.floor(seconds % 60);
      return `${hours}:${mins.toString().padStart(2, "0")}:${secs
        .toString()
        .padStart(2, "0")}`;
    }
  };

  return (
    <div
      className="flex items-center justify-between px-4 py-3 bg-white border-t border-b border-gray-300"
      style={{ zIndex: 10, height: "50px" }}
    >
      {/* 左侧：编辑工具 */}
      <div className="flex items-center gap-6">
        <img
          src={require("../../../assets/switch-contrast.png")}
          alt="分割片段"
          className={`w-4 h-4 ${
            selectedClipId
              ? "cursor-pointer hover:opacity-70"
              : "opacity-30 cursor-not-allowed"
          }`}
          onClick={selectedClipId ? onSplitClip : undefined}
          title="分割片段"
        />
        <img
          src={require("../../../assets/copy.png")}
          alt="复制片段"
          className={`w-3.5 h-3.5 ${
            selectedClipId
              ? "cursor-pointer hover:opacity-70"
              : "opacity-30 cursor-not-allowed"
          }`}
          onClick={selectedClipId ? onCopyClip : undefined}
          title="复制片段"
        />
        <DeleteOutlined
          className={`text-sm ${
            selectedClipId
              ? "cursor-pointer hover:text-red-500"
              : "opacity-30 cursor-not-allowed"
          }`}
          style={{ color: selectedClipId ? "#181818" : "#71717a" }}
          onClick={selectedClipId ? onDeleteClip : undefined}
          title="删除片段"
        />
      </div>

      {/* 中间：播放控制和时间显示 */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3">
          <StepBackwardOutlined
            className={`text-lg ${
              duration > 0
                ? "cursor-pointer hover:text-blue-500"
                : "opacity-30 cursor-not-allowed"
            }`}
            style={{ color: "#181818" }}
            onClick={
              duration > 0
                ? () => onTimeChange(Math.max(0, currentTime - 1))
                : undefined
            }
          />
          <div
            className={`flex items-center justify-center w-10 h-10 rounded-full ${
              duration > 0
                ? "cursor-pointer hover:bg-blue-50"
                : "opacity-30 cursor-not-allowed"
            }`}
            onClick={duration > 0 ? onPlayPause : undefined}
          >
            {isPlaying ? (
              <PauseOutlined className="text-sm" style={{ color: "#181818" }} />
            ) : (
              <CaretRightOutlined
                className="text-lg"
                style={{ color: "#181818" }}
              />
            )}
          </div>
          <StepForwardOutlined
            className={`text-lg ${
              duration > 0
                ? "cursor-pointer hover:text-blue-500"
                : "opacity-30 cursor-not-allowed"
            }`}
            style={{ color: "#181818" }}
            onClick={
              duration > 0
                ? () => onTimeChange(Math.min(duration, currentTime + 1))
                : undefined
            }
          />
        </div>

        {/* 时间显示 */}
        <div className="flex items-center gap-2 font-mono text-sm text-gray-600">
          <span style={{ color: "#71717a" }}>{formatTime(currentTime)}</span>
          <span>/</span>
          <span style={{ color: "#e4e4e7" }}>{formatTime(duration)}</span>
        </div>
      </div>

      {/* 右侧：缩放控制 */}
      <div className="flex items-center gap-2">
        <Divider type="vertical" />
        <ZoomOutOutlined
          className="text-base cursor-pointer hover:text-blue-500"
          style={{ color: "#181818" }}
          onClick={() => onScaleChange(Math.max(1, scale - 1))}
        />
        <Slider
          min={1}
          max={10}
          step={1}
          value={scale}
          onChange={onScaleChange}
          marks={{
            1: "",
            2: "",
            3: "",
            4: "",
            5: "",
            6: "",
            7: "",
            8: "",
            9: "",
            10: "",
          }}
          className="w-32"
          styles={{ track: { backgroundColor: "#18181b" } }}
        />
        <ZoomInOutlined
          className="text-base cursor-pointer hover:text-blue-500"
          style={{ color: "#181818" }}
          onClick={() => onScaleChange(Math.min(10, scale + 1))}
        />
      </div>
    </div>
  );
};

export const PlaybackControls = React.memo(PlaybackControlsComponent);
