import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { port: 5173, host: "127.0.0.1" },
  build: {
    // 把体积大、更新频率低的依赖拆出去：业务代码改动时用户只重下小包
    rollupOptions: {
      output: {
        /**
         * 只拆「体积大、更新少」的两个库。
         * 不要把 react 单独拆出去：React 19 与 Recharts/Framer 之间存在运行时
         * 互相写入的初始化顺序依赖，独立 chunk 会偶发
         * `Cannot set properties of undefined (setting 'Activity')`。
         * 注意判断顺序：recharts 路径里也含 "react"。
         */
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          if (id.includes("recharts") || id.includes("d3-")) return "charts";
          if (id.includes("framer-motion") || id.includes("motion-dom")) return "motion";
        },
      },
    },
    // 拆分后单块仍可能接近 500 kB，把告警阈值调到 600 以免噪声淹没真实问题
    chunkSizeWarningLimit: 600,
  },
});
