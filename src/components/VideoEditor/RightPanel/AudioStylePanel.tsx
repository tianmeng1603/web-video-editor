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
  const [audioVolume, setAudioVolume] = React.useState(
    selectedClip.volume ?? 100
  );
  const [audioSpeed, setAudioSpeed] = React.useState(selectedClip.speed ?? 1);
  const [volumeInput, setVolumeInput] = React.useState(
    String(selectedClip.volume ?? 100)
  );
  const [speedInput, setSpeedInput] = React.useState(
    String(selectedClip.speed ?? 1)
  );

  // 当选中素材改变时，更新状态
  React.useEffect(() => {
    setAudioVolume(selectedClip.volume ?? 100);
    setAudioSpeed(selectedClip.speed ?? 1);
    setVolumeInput(String(selectedClip.volume ?? 100));
    setSpeedInput(String(selectedClip.speed ?? 1));
  }, [selectedClip.id, selectedClip.volume, selectedClip.speed]);

  const handleVolumeChange = (value: number) => {
    onClipUpdate(selectedClip.id, { volume: value });
  };

  const handleSpeedChange = (value: number) => {
    onClipUpdate(selectedClip.id, { speed: value });
  };

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <div className="font-semibold" style={{ fontSize: "12px" }}>
          {t("toolbar.audio")}
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
          <CloseOutlined style={{ fontSize: "12px" }} />
        </button>
      </div>
      <div className="space-y-3">
        {/* 音量控制 */}
        <div className="flex items-center justify-between">
          <label className="text-gray-600" style={{ fontSize: "12px" }}>
            {t("audioStyle.volume")}
          </label>
          <div className="flex items-center gap-2">
            <Input
              value={volumeInput}
              onChange={(e) => setVolumeInput(e.target.value)}
              onBlur={() => {
                const val = parseFloat(volumeInput);
                const finalValue = isNaN(val)
                  ? 100
                  : Math.max(0, Math.min(200, val));
                setVolumeInput(String(finalValue));
                setAudioVolume(finalValue);
                handleVolumeChange(finalValue);
              }}
              onPressEnter={(e) => e.currentTarget.blur()}
              className="text-center"
              style={{
                width: "35px",
                height: "26px",
                fontSize: "12px",
                padding: "4px",
                borderRadius: "4px",
              }}
            />
            <div className="w-32" style={{ paddingRight: "10px" }}>
              <Slider
                value={audioVolume}
                onChange={(value) => {
                  setAudioVolume(value);
                  setVolumeInput(String(value));
                  handleVolumeChange(value);
                }}
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
          <label className="text-gray-600" style={{ fontSize: "12px" }}>
            {t("audioStyle.speed")}
          </label>
          <div className="flex items-center gap-2">
            <Input
              value={speedInput}
              onChange={(e) => setSpeedInput(e.target.value)}
              onBlur={() => {
                const val = parseFloat(speedInput);
                const finalValue = isNaN(val)
                  ? 1
                  : Math.max(0.25, Math.min(4, val));
                setSpeedInput(String(finalValue));
                setAudioSpeed(finalValue);
                handleSpeedChange(finalValue);
              }}
              onPressEnter={(e) => e.currentTarget.blur()}
              className="text-center"
              style={{
                width: "35px",
                height: "26px",
                fontSize: "12px",
                padding: "4px",
                borderRadius: "4px",
              }}
            />
            <div className="w-32" style={{ paddingRight: "10px" }}>
              <Slider
                value={audioSpeed}
                onChange={(value) => {
                  setAudioSpeed(value);
                  setSpeedInput(String(value));
                  handleSpeedChange(value);
                }}
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
