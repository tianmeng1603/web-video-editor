import React from "react";
import { Input, Slider } from "antd";
import { CloseOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import { TimelineClip } from "../types";

interface AudioStylePanelProps {
  selectedClip: TimelineClip;
  onClose: () => void;
  onClipUpdate: (id: string, updates: Partial<TimelineClip>) => void;
}

const AudioStylePanelComponent: React.FC<AudioStylePanelProps> = ({
  selectedClip,
  onClose,
  onClipUpdate,
}) => {
  const { t } = useTranslation();
  const audioVolume = selectedClip.volume ?? 100;
  const audioSpeed = selectedClip.speed ?? 1;

  const handleVolumeChange = (value: number) => {
    onClipUpdate(selectedClip.id, { volume: value });
  };

  const handleSpeedChange = (value: number) => {
    onClipUpdate(selectedClip.id, { speed: value });
  };

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm font-semibold">{t("toolbar.audio")}</div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
          <CloseOutlined />
        </button>
      </div>
      <div className="space-y-3">
        {/* 音量控制 */}
        <div className="flex items-center justify-between">
          <label className="text-xs text-gray-600">
            {t("audioStyle.volume")}
          </label>
          <div className="flex items-center gap-2">
            <Input
              value={audioVolume}
              onChange={(e) => {
                const val = parseFloat(e.target.value) || 0;
                handleVolumeChange(Math.max(0, Math.min(200, val)));
              }}
              className="text-center"
              style={{
                width: "30px",
                height: "30px",
                padding: "4px",
                borderRadius: "4px",
              }}
            />
            <div className="w-32">
              <Slider
                value={audioVolume}
                onChange={handleVolumeChange}
                min={0}
                max={200}
                trackStyle={{ backgroundColor: "#18181b" }}
                handleStyle={{ borderColor: "#18181b" }}
              />
            </div>
          </div>
        </div>

        {/* 速度控制 */}
        <div className="flex items-center justify-between">
          <label className="text-xs text-gray-600">
            {t("audioStyle.speed")}
          </label>
          <div className="flex items-center gap-2">
            <Input
              value={audioSpeed}
              onChange={(e) => {
                const val = parseFloat(e.target.value) || 1;
                handleSpeedChange(Math.max(0.25, Math.min(4, val)));
              }}
              className="text-center"
              style={{
                width: "30px",
                height: "30px",
                padding: "4px",
                borderRadius: "4px",
              }}
            />
            <div className="w-32">
              <Slider
                value={audioSpeed}
                onChange={handleSpeedChange}
                min={0.25}
                max={4}
                step={0.25}
                trackStyle={{ backgroundColor: "#18181b" }}
                handleStyle={{ borderColor: "#18181b" }}
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export const AudioStylePanel = React.memo(AudioStylePanelComponent);
