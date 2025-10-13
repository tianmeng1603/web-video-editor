import React, { useState, useEffect, useRef } from "react";
import { Input, Select, Slider, ColorPicker } from "antd";
import { CloseOutlined, DownOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import { TimelineClip } from "../types";
import { FontSelector } from "./FontSelector";
import { fontManager } from "../utils/fontDetector";

interface TextStylePanelProps {
  selectedClip: TimelineClip;
  onClose: () => void;
  onClipUpdate: (id: string, updates: Partial<TimelineClip>) => void;
}

const TextStylePanelComponent: React.FC<TextStylePanelProps> = ({
  selectedClip,
  onClose,
  onClipUpdate,
}) => {
  const { t } = useTranslation();
  const [textStyle, setTextStyle] = useState(selectedClip.textStyle || {});
  const [opacity, setOpacity] = useState(selectedClip.opacity ?? 100);
  const [fontSelectorVisible, setFontSelectorVisible] = useState(false);
  const [availableFontWeights, setAvailableFontWeights] = useState<
    { value: string; label: string }[]
  >([
    { value: "400", label: t("textStyle.fontWeightNormal") },
    { value: "700", label: t("textStyle.fontWeightBold") },
    { value: "300", label: t("textStyle.fontWeightLight") },
  ]);

  // 检查文本内容是否包含中文字符
  const isChineseText = (text: string): boolean => {
    if (!text) return false;

    // 中文字符的Unicode范围（简化版本，兼容性更好）
    const chineseRegex =
      /[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff\u3300-\u33ff\ufe30-\ufe4f]/;

    return chineseRegex.test(text);
  };
  const [fontSelectorPosition, setFontSelectorPosition] = useState({
    x: 0,
    y: 0,
  });
  const fontButtonRef = useRef<HTMLButtonElement>(null);

  // 当选中素材改变时，更新状态
  useEffect(() => {
    setTextStyle(selectedClip.textStyle || {});
    setOpacity(selectedClip.opacity ?? 100);
  }, [selectedClip.id, selectedClip.textStyle, selectedClip.opacity]);

  // 获取字体的显示名称
  const getFontDisplayName = (fontFamily: string): string => {
    if (!fontFamily) return "Arial";

    // 如果字体管理器已初始化，从中获取 displayName
    if (fontManager.isReady()) {
      const fontFamilies = fontManager.getFontFamilies();
      const font = fontFamilies.find((f) => f.family === fontFamily);
      if (font) {
        return font.displayName;
      }
    }

    // 否则返回原始字体名称
    return fontFamily;
  };

  // 更新文字样式
  const updateTextStyle = (updates: Partial<typeof textStyle>) => {
    const newTextStyle = { ...textStyle, ...updates };
    setTextStyle(newTextStyle);
    onClipUpdate(selectedClip.id, { textStyle: newTextStyle });
  };

  // 更新不透明度
  const updateOpacity = (value: number) => {
    setOpacity(value);
    onClipUpdate(selectedClip.id, { opacity: value });
  };

  // 装饰按钮状态
  const [textDecoration, setTextDecoration] = useState({
    underline: false,
    lineThrough: false,
    overline: false,
  });

  // 处理装饰按钮点击
  const handleDecorationClick = (
    type: "underline" | "lineThrough" | "overline"
  ) => {
    const newDecoration = { ...textDecoration, [type]: !textDecoration[type] };
    setTextDecoration(newDecoration);

    // 构建装饰样式字符串
    const decorationArray = [];
    if (newDecoration.underline) decorationArray.push("underline");
    if (newDecoration.lineThrough) decorationArray.push("line-through");
    if (newDecoration.overline) decorationArray.push("overline");

    updateTextStyle({ textDecoration: decorationArray.join(" ") || "none" });
  };

  // 处理字体选择器显示
  const handleFontButtonClick = () => {
    if (fontButtonRef.current) {
      const rect = fontButtonRef.current.getBoundingClientRect();
      // 计算位置：距离右侧面板上右都是10px
      // 右侧面板宽度270px，字体面板宽度250px
      const x = rect.left - 370; // 右侧面板宽度270px + 间距10px
      const y = rect.top - 45; // 与按钮顶部对齐

      // 确保面板不超出屏幕边界
      const adjustedX = Math.max(10, x);
      const adjustedY = Math.max(10, y);

      setFontSelectorPosition({ x: adjustedX, y: adjustedY });
      setFontSelectorVisible(true);
    }
  };

  // 处理字体选择
  const handleFontSelect = (font: string) => {
    updateTextStyle({ fontFamily: font });

    // 切换字体时重置字重选项为默认值
    setAvailableFontWeights([
      { value: "400", label: "正常" },
      { value: "700", label: "粗体" },
      { value: "300", label: "细体" },
    ]);
  };

  // 处理字重检测结果
  const handleFontWeightsDetected = (font: string, weights: string[]) => {
    console.log(`字体 ${font} 支持的字重:`, weights);

    // 将数字字重转换为用户友好的标签
    const weightOptions = weights.map((weight) => {
      switch (weight) {
        case "100":
          return { value: "100", label: t("textStyle.fontWeightThin") };
        case "200":
          return { value: "200", label: t("textStyle.fontWeightExtraLight") };
        case "300":
          return { value: "300", label: t("textStyle.fontWeightLight") };
        case "400":
          return { value: "400", label: t("textStyle.fontWeightNormal") };
        case "500":
          return { value: "500", label: t("textStyle.fontWeightMedium") };
        case "600":
          return { value: "600", label: t("textStyle.fontWeightSemiBold") };
        case "700":
          return { value: "700", label: t("textStyle.fontWeightBold") };
        case "800":
          return { value: "800", label: t("textStyle.fontWeightExtraBold") };
        case "900":
          return { value: "900", label: t("textStyle.fontWeightBlack") };
        default:
          return { value: weight, label: weight };
      }
    });

    // 更新字重选项
    setAvailableFontWeights(weightOptions);

    // 如果当前字重不在新字重列表中，重置为第一个可用字重
    const currentWeight = textStyle.fontWeight;
    const currentWeightExists = weightOptions.some(
      (option) => option.value === currentWeight
    );

    if (!currentWeightExists && weightOptions.length > 0) {
      const newWeight = weightOptions[0].value;
      console.log(
        `字体 ${font} 不支持当前字重 ${currentWeight}，重置为 ${newWeight}`
      );
      updateTextStyle({ fontWeight: newWeight });
    }
  };

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold">{t("textStyle.title")}</h3>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
          <CloseOutlined />
        </button>
      </div>
      <div className="space-y-4">
        {/* 字体 */}
        <div className="flex items-center justify-between">
          <label className="text-sm text-gray-600">{t("textStyle.font")}</label>
          <div className="w-36">
            <button
              ref={fontButtonRef}
              onClick={handleFontButtonClick}
              className="flex items-center justify-between w-full px-3 text-sm text-left transition-colors border border-gray-300 rounded hover:border-blue-400 hover:bg-blue-50"
              style={{
                fontFamily: "Arial", // 固定字体，不跟随选中字体改变
                height: "24.46px",
              }}
            >
              <span className="truncate">
                {getFontDisplayName(textStyle.fontFamily || "Arial")}
              </span>
              <DownOutlined
                className="ml-2 text-xs"
                style={{ color: "#BFBFBF" }}
              />
            </button>
          </div>
        </div>

        {/* 字重 */}
        <div className="flex items-center justify-between">
          <label className="text-sm text-gray-600">
            {t("textStyle.fontWeight")}
          </label>
          <Select
            value={textStyle.fontWeight || "400"}
            onChange={(value) => updateTextStyle({ fontWeight: value })}
            className="w-36"
            size="small"
            style={{ height: "24.46px" }}
            options={availableFontWeights}
          />
        </div>

        {/* 字号 */}
        <div className="flex items-center justify-between">
          <label className="text-sm text-gray-600">
            {t("textStyle.fontSize")}
          </label>
          <Input
            type="number"
            value={
              textStyle.fontSize !== undefined
                ? Math.round(textStyle.fontSize)
                : ""
            }
            onChange={(e) => {
              const inputValue = e.target.value;
              if (inputValue === "") {
                updateTextStyle({ fontSize: undefined });
              } else {
                const value = Math.round(Number(inputValue));
                updateTextStyle({ fontSize: value });
              }
            }}
            className="w-36"
            size="small"
            style={{ height: "24.46px" }}
            step={1}
          />
        </div>

        {/* 颜色 */}
        <div className="flex items-center justify-between">
          <label className="text-sm text-gray-600">
            {t("textStyle.color")}
          </label>
          <div className="w-36">
            <ColorPicker
              value={textStyle.color || "#ffffff"}
              onChange={(color) =>
                updateTextStyle({ color: color.toHexString() })
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

        {/* 对齐 */}
        <div className="flex items-center justify-between">
          <label className="text-sm text-gray-600">
            {t("textStyle.align")}
          </label>
          <Select
            value={textStyle.textAlign || "center"}
            onChange={(value) => updateTextStyle({ textAlign: value })}
            className="w-36"
            size="small"
            options={[
              { value: "left", label: t("textStyle.alignLeft") },
              { value: "center", label: t("textStyle.alignCenter") },
              { value: "right", label: t("textStyle.alignRight") },
            ]}
          />
        </div>

        {/* 装饰 */}
        <div className="flex items-center justify-between">
          <label className="text-sm text-gray-600">
            {t("textStyle.decoration")}
          </label>
          <div className="flex gap-2 w-36">
            <button
              className={`flex-1 h-8 text-sm border rounded hover:bg-gray-100 flex items-center justify-center ${
                textDecoration.underline ? "bg-blue-100 border-blue-300" : ""
              }`}
              onClick={() => handleDecorationClick("underline")}
            >
              <u>U</u>
            </button>
            <button
              className={`flex-1 h-8 text-sm border rounded hover:bg-gray-100 flex items-center justify-center ${
                textDecoration.lineThrough ? "bg-blue-100 border-blue-300" : ""
              }`}
              onClick={() => handleDecorationClick("lineThrough")}
            >
              <s>S</s>
            </button>
            <button
              className={`flex-1 h-8 text-sm border rounded hover:bg-gray-100 flex items-center justify-center ${
                textDecoration.overline ? "bg-blue-100 border-blue-300" : ""
              }`}
              onClick={() => handleDecorationClick("overline")}
            >
              <span
                style={{
                  textDecoration: "overline",
                  fontSize: "13px",
                  position: "relative",
                  top: "4px",
                }}
              >
                U
              </span>
            </button>
          </div>
        </div>

        {/* Case */}
        <div className="flex items-center justify-between">
          <label className="text-sm text-gray-600">{t("textStyle.case")}</label>
          <Select
            value={textStyle.textTransform || "none"}
            onChange={(value) => updateTextStyle({ textTransform: value })}
            className="w-36"
            size="small"
            style={{ height: "24.46px" }}
            disabled={isChineseText(selectedClip.text || "")}
            options={[
              { value: "none", label: t("textStyle.caseNone") },
              { value: "uppercase", label: t("textStyle.caseUppercase") },
              { value: "lowercase", label: t("textStyle.caseLowercase") },
              { value: "capitalize", label: t("textStyle.caseCapitalize") },
            ]}
          />
        </div>

        {/* 不透明度 */}
        <div className="flex items-center justify-between">
          <label className="text-sm text-gray-600">
            {t("textStyle.opacity")}
          </label>
          <div className="flex items-center gap-2 w-36">
            <Input
              value={opacity}
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
                value={opacity}
                onChange={updateOpacity}
                min={0}
                max={100}
                trackStyle={{ backgroundColor: "#18181b" }}
              />
            </div>
          </div>
        </div>

        {/* 字体描边 */}
        <div className="pt-3 mt-3 border-t border-gray-200">
          <h4 className="mb-3 text-sm font-semibold text-gray-900">
            {t("textStyle.stroke")}
          </h4>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs text-gray-600">
                {t("textStyle.strokeColor")}
              </label>
              <div className="w-36">
                <ColorPicker
                  value={textStyle.strokeColor || "#000000"}
                  onChange={(color) =>
                    updateTextStyle({ strokeColor: color.toHexString() })
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
                {t("textStyle.strokeWidth")}
              </label>
              <Input
                type="number"
                value={textStyle.strokeWidth || 0}
                onChange={(e) =>
                  updateTextStyle({ strokeWidth: Number(e.target.value) })
                }
                className="w-36"
                size="small"
              />
            </div>
          </div>
        </div>

        {/* 字体阴影 */}
        <div className="pt-3 mt-3 border-t border-gray-200">
          <h4 className="mb-3 text-sm font-semibold text-gray-900">
            {t("textStyle.shadow")}
          </h4>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs text-gray-600">
                {t("textStyle.shadowColor")}
              </label>
              <div className="w-36">
                <ColorPicker
                  value={textStyle.shadowColor || "#ffffff"}
                  onChange={(color) =>
                    updateTextStyle({ shadowColor: color.toHexString() })
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
                {t("textStyle.shadowX")}
              </label>
              <Input
                type="number"
                value={textStyle.shadowOffsetX || 0}
                onChange={(e) =>
                  updateTextStyle({ shadowOffsetX: Number(e.target.value) })
                }
                className="w-36"
                size="small"
              />
            </div>
            <div className="flex items-center justify-between">
              <label className="text-xs text-gray-600">
                {t("textStyle.shadowY")}
              </label>
              <Input
                type="number"
                value={textStyle.shadowOffsetY || 0}
                onChange={(e) =>
                  updateTextStyle({ shadowOffsetY: Number(e.target.value) })
                }
                className="w-36"
                size="small"
              />
            </div>
            <div className="flex items-center justify-between">
              <label className="text-xs text-gray-600">
                {t("textStyle.shadowBlur")}
              </label>
              <Input
                type="number"
                value={textStyle.shadowBlur || 0}
                onChange={(e) =>
                  updateTextStyle({ shadowBlur: Number(e.target.value) })
                }
                className="w-36"
                size="small"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 字体选择器 */}
      <FontSelector
        visible={fontSelectorVisible}
        position={fontSelectorPosition}
        currentFont={textStyle.fontFamily || "Arial"}
        onFontSelect={handleFontSelect}
        onClose={() => setFontSelectorVisible(false)}
        onFontWeightsDetected={handleFontWeightsDetected}
      />
    </>
  );
};

export const TextStylePanel = React.memo(TextStylePanelComponent);
