import React, { useState, useEffect, useRef } from "react";
import { CloseOutlined, LoadingOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import { fontManager, FontFamily } from "../utils/fontDetector";
import { DarkScrollbar } from "../utils/Scrollbar";
import searchIcon from "../../../assets/search.png";

interface FontSelectorProps {
  visible: boolean;
  position: { x: number; y: number };
  currentFont: string;
  onFontSelect: (font: string) => void;
  onClose: () => void;
  onFontWeightsDetected?: (font: string, weights: string[]) => void;
}

const FontSelectorComponent: React.FC<FontSelectorProps> = ({
  visible,
  position,
  currentFont,
  onFontSelect,
  onClose,
  onFontWeightsDetected,
}) => {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState("");
  const [fontFamilies, setFontFamilies] = useState<FontFamily[]>([]);
  const [filteredFonts, setFilteredFonts] = useState<FontFamily[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // 初始化字体管理器
  useEffect(() => {
    if (visible && !fontManager.isReady() && !isLoading) {
      loadFonts();
    } else if (visible && fontManager.isReady()) {
      setFontFamilies(fontManager.getFontFamilies());
    }
  }, [visible, isLoading]);

  // 过滤字体
  useEffect(() => {
    if (!searchTerm) {
      setFilteredFonts(fontFamilies);
    } else {
      const filtered = fontFamilies.filter(
        (font) =>
          font.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          font.family.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredFonts(filtered);
    }
  }, [searchTerm, fontFamilies]);

  // 加载字体配置
  const loadFonts = async () => {
    setIsLoading(true);
    setLoadError(false);

    try {
      await fontManager.initialize();
      const fonts = fontManager.getFontFamilies();
      setFontFamilies(fonts);
      console.log("✅ 字体加载成功:", fonts.length, "个");
    } catch (error) {
      console.error("❌ 字体加载失败:", error);
      setLoadError(true);
    } finally {
      setIsLoading(false);
    }
  };

  // 点击外部关闭面板
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        panelRef.current &&
        !panelRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    };

    if (visible) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [visible, onClose]);

  if (!visible) return null;

  return (
    <div
      ref={panelRef}
      className="fixed z-50 border border-gray-600 rounded-lg shadow-lg"
      style={{
        left: position.x,
        top: position.y,
        width: "250px",
        height: "490px",
        overflow: "hidden",
        backgroundColor: "#333333",
      }}
    >
      {/* 标题栏 */}
      <div className="flex items-center justify-between p-3 border-b border-gray-600">
        <h3 className="text-sm font-semibold text-white">
          {t("fontSelector.title")}
        </h3>
        <button
          onClick={onClose}
          className="text-xs text-gray-400 transition-colors hover:text-white"
        >
          <CloseOutlined />
        </button>
      </div>

      {/* 搜索框 */}
      <div className="px-3 py-2">
        <div className="relative">
          <img
            src={searchIcon}
            alt="search"
            className="absolute left-0 w-4 h-4 transform -translate-y-1/2 opacity-60 top-1/2"
          />
          <input
            type="text"
            placeholder={t("fontSelector.searchPlaceholder")}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full py-2 pl-6 text-sm text-white placeholder-gray-400 bg-transparent focus:outline-none"
          />
        </div>
      </div>

      {/* 字体列表 */}
      <DarkScrollbar
        style={{
          height: "370px",
        }}
      >
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <LoadingOutlined className="mr-2 text-lg text-blue-400" />
            <span className="text-sm text-gray-400">
              {t("fontSelector.detecting")}
            </span>
          </div>
        ) : loadError ? (
          <div className="px-3 py-4 text-center">
            <div className="mb-2 text-sm text-red-400">
              {t("fontSelector.detectFailed")}
            </div>
            <button
              onClick={loadFonts}
              className="text-xs text-blue-400 transition-colors hover:text-blue-300"
            >
              {t("fontSelector.retry")}
            </button>
          </div>
        ) : filteredFonts.length === 0 ? (
          <div className="px-3 py-4 text-sm text-center text-gray-400">
            {t("fontSelector.noFontsFound")}
          </div>
        ) : (
          filteredFonts.map((fontFamily, index) => {
            const isSelected = currentFont === fontFamily.family;
            const previewWeight =
              fontFamily.variants.find((v) => v.weight === "400")?.weight ||
              fontFamily.variants[0]?.weight.split("-")[0] ||
              "400";

            return (
              <div
                key={index}
                className="px-3 py-2 transition-colors cursor-pointer"
                style={{
                  backgroundColor: isSelected
                    ? "rgba(255, 255, 255, 0.1)"
                    : "transparent",
                  color: "#ffffff",
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.backgroundColor =
                      "rgba(255, 255, 255, 0.05)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.backgroundColor = "transparent";
                  }
                }}
                onClick={() => {
                  onFontSelect(fontFamily.family);

                  if (onFontWeightsDetected) {
                    const weights = fontManager.getFontWeights(
                      fontFamily.family
                    );
                    onFontWeightsDetected(fontFamily.family, weights);
                  }

                  onClose();
                }}
              >
                <div
                  style={{
                    fontFamily: fontFamily.family,
                    fontSize: "16px",
                    fontWeight: previewWeight,
                  }}
                  className="truncate"
                >
                  {fontFamily.displayName}
                </div>
              </div>
            );
          })
        )}
      </DarkScrollbar>
    </div>
  );
};

export const FontSelector = React.memo(FontSelectorComponent);
