import { useCallback } from "react";
import { message } from "antd";
import VideoEditor from "../components/VideoEditor";
import { ProjectData } from "../components/VideoEditor/utils/projectData";
import mockProjectData from "../mock/mockProject.json";

function Home() {
  // 直接使用导入的 JSON 数据
  const initialData = mockProjectData as ProjectData;

  // 如果不需要初始数据，传 undefined 即可
  // const initialData = undefined;

  // 保存回调函数 - 在这里处理保存的数据
  const handleSave = useCallback(async (projectData: ProjectData) => {
    console.log("📦 自动保存触发，项目数据:", projectData);

    const hideLoading = message.loading("正在保存...", 0);

    // TODO: 在这里实现你的保存逻辑
    // 例如：上传到服务器
    try {
      // 示例：保存到 localStorage
      localStorage.setItem(
        "video-project-autosave",
        JSON.stringify(projectData)
      );
      console.log("✅ 项目数据已保存到 localStorage");

      // 示例：上传到服务器
      // const response = await fetch('/api/projects/save', {
      //   method: 'POST',
      //   headers: {
      //     'Content-Type': 'application/json',
      //   },
      //   body: JSON.stringify(projectData),
      // });
      //
      // if (!response.ok) {
      //   throw new Error('保存失败');
      // }
      //
      // console.log("✅ 项目数据已上传到服务器");

      hideLoading();
      message.success("保存成功");
    } catch (error) {
      hideLoading();
      console.error("❌ 保存失败:", error);
      message.error("保存失败");
      throw error; // 抛出错误以便组件可以处理
    }
  }, []);

  return (
    <div className="min-h-screen">
      <VideoEditor
        initialData={initialData}
        onSave={handleSave}
        autoSaveDelay={3000} // 3秒自动保存（可选，默认3000）
        enableAutoSave={true} // 启用自动保存（可选，默认true）
      />
    </div>
  );
}

export default Home;
