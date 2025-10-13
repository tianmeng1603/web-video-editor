import React from "react";
import { useTranslation } from "react-i18next";
import { Select } from "antd";
import { GlobalOutlined } from "@ant-design/icons";

const LanguageSwitcher: React.FC = () => {
  const { i18n } = useTranslation();

  const handleChange = (value: string) => {
    i18n.changeLanguage(value);
    // 保存到 localStorage
    localStorage.setItem("language", value);
  };

  return (
    <Select
      value={i18n.language}
      onChange={handleChange}
      style={{ width: 120 }}
      className="{ h-7 }"
      suffixIcon={<GlobalOutlined />}
      options={[
        { value: "zh", label: "简体中文" },
        { value: "zh-TW", label: "繁體中文" },
        { value: "en", label: "English" },
        { value: "ja", label: "日本語" },
      ]}
    />
  );
};

export default LanguageSwitcher;
