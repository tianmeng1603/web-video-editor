import Home from "../page/Home";
import { createBrowserRouter } from "react-router-dom";

const router = createBrowserRouter(
  [
    { path: "/", element: <Home /> },
    { path: "*", element: <div>404</div> },
  ],
  { basename: '/web-video-editor' }   // ← 前后都要带 /，不能多也不能少
);

export default router;
