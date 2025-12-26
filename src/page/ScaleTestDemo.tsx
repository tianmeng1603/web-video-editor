import { useState, useCallback } from "react";
import { message } from "antd";
import VideoEditor from "../components/VideoEditor";
import { ProjectData } from "@/components/VideoEditor/utils/projectData";
import mockProjectData from "../mock/mockProject.json";

function ScaleTestDemo() {
  // 直接使用导入的 JSON 数据
  const initialData = mockProjectData as ProjectData;

  // 缩放系数状态（模拟 ReactFlow 的缩放）
  const [reactflowScale] = useState<number>(0.5);

  // 保存回调函数
  const handleSave = useCallback(async (projectData: ProjectData) => {
    console.log("📦 自动保存触发，项目数据:", projectData);
    const hideLoading = message.loading("正在保存...", 0);

    try {
      localStorage.setItem(
        "video-project-autosave",
        JSON.stringify(projectData)
      );
      console.log("✅ 项目数据已保存到 localStorage");

      hideLoading();
      message.success("保存成功");
    } catch (error) {
      hideLoading();
      console.error("❌ 保存失败:", error);
      message.error("保存失败");
      throw error;
    }
  }, []);

  // 关闭回调函数
  const handleClose = useCallback(() => {
    console.log("🔴 关闭按钮点击");
    message.info("关闭视频编辑器");
  }, []);

  return (
    <div className="min-h-screen p-4 bg-gray-100">
      {/* 应用缩放系数到 VideoEditor 容器 */}
      <div
        style={{
          transform: `scale(${reactflowScale})`,
          transformOrigin: "top left",
          width: `${100 / reactflowScale}%`,
          height: `${100 / reactflowScale}%`,
        }}
      >
        <VideoEditor
          initialData={initialData}
          onSave={handleSave}
          onClose={handleClose}
          reactflowScale={reactflowScale} // 传递缩放系数给组件
          autoSaveDelay={3000}
          enableAutoSave={true}
        />
      </div>
    </div>
  );
}

export default ScaleTestDemo;
