# 思维无限画布

建筑 / 室内 / 景观效果图 AI 画布前端演示（Mock 生图，不接真实模型）。

## 技术栈

- Vite + React + TypeScript
- Tailwind CSS v4
- `@xyflow/react`（React Flow）无限画布

## 快速开始

```bash
cd thinking-canvas
npm install
npm run dev
```

默认地址：`http://localhost:5173`  
局域网预览：`npm run dev -- --host 0.0.0.0`

构建：

```bash
npm run build
```

## 功能说明（演示）

- 无限平移 / 缩放画布，深色建筑审美
- 节点：参考/户型上传、提示词、视角·风格参数、生成、结果
- 可连线；简单防环
- 生成：排队 → 生成中 → 2–4 秒后出占位建筑效果 SVG
- 顶栏：保存（localStorage）、新建、载入演示、额度徽章（Mock）
- 结果卡：作参考再改、复制提示

## 主要目录

```
src/
  App.tsx                 # 画布主逻辑
  types.ts                # 节点与参数类型
  demoData.ts             # 首次演示节点
  mockGenerate.ts         # 占位效果图 SVG
  storage.ts              # localStorage
  components/
    TopBar.tsx
    Toolbar.tsx
    EmptyState.tsx
    nodes/                # 各类自定义节点
```

## 已知限制

- 生图为本地 Mock，非真实模型
- 未接 Cloudflare 队列 / 登录 / 计费 / 协作
- 上传图仅浏览器本地预览（blob URL），刷新后需重新选择（除非整图已进结果 SVG）
- 桌面 Chrome 优先；移动端未专门适配

## 真实生图（「开始生成」）

开发态通过 Vite 中间件代理调用后端生图接口，密钥只用进程 / Worker 环境变量（见 `worker` 中的 secrets 绑定），不会进前端。

```bash
cd /workspace/thinking-canvas
npm run dev -- --host 0.0.0.0 --port 5173
```

```bash
curl -sS -X POST http://127.0.0.1:5173/api/scapi/generate \
  -H 'Content-Type: application/json' \
  -d '{"prompt":"modern villa exterior","size":"1K","aspectRatio":"16:9"}'
```

本地 `/demo/line_sketch.png` 会映射到 `output/line_to_render_meta.json` 里的公开 `line_url`；任意 blob/data 参考图无法被远端接口拉取，会退化为纯文生图。设 `VITE_USE_MOCK=1` 可回退占位图。
