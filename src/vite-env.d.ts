/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** 麦当劳 MCP Server 地址；留空则使用本地 mock（离线可跑） */
  readonly VITE_MCD_MCP_URL?: string;
  /** 演示用访问令牌占位，真实密钥绝不要提交到仓库 */
  readonly VITE_MCD_MCP_TOKEN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
