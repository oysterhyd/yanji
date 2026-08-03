# 研迹

研迹是一个 PC 优先的本地错题收集与复习工作台，面向考研数学和计算机专业基础综合（408）。它支持图片转写、Markdown + LaTeX 排版、错题检索、原图对照和基于 SM-2 的间隔复习。

## 功能

- **错题工作台**：使用侧栏导航、紧凑列表、搜索和科目/分类/标签筛选管理错题。
- **题目 OCR**：题目图片只转写题干、选项、表格和题图说明，不自动解题或生成答案。
- **答案 OCR**：答案图片独立转写已有答案与解析，支持追加、替换或忽略识别结果。
- **Markdown + LaTeX**：支持行内公式、独立公式、多行 `aligned`/`cases`/矩阵环境、表格和代码块，并为超宽公式提供横向滚动。
- **原图对照**：题目图和答案图分开保存，在详情页和复习页按内容分别展示。
- **复习计划**：新录入错题默认次日首次复习，之后根据评分更新 SM-2 间隔、复习次数和遗忘次数。
- **本地数据**：SQLite 和图片都保存在本机，不需要账号或云服务。

## 技术栈

Next.js 16 App Router、React 19、TypeScript、Tailwind CSS 4、React Markdown、remark-gfm、remark-math、KaTeX、SQLite（`better-sqlite3`）和 Vitest。

## 项目结构

```text
src/app/              页面、布局和 API Route Handlers
src/app/api/          上传、临时附件清理、OCR、错题和复习接口
src/components/       工作台、OCR 上传、详情、编辑和复习组件
src/lib/              SQLite、图片存储、OCR、SM-2、Markdown 辅助逻辑
public/               静态资源
data/                 SQLite 数据库、WAL 文件、临时图片和已保存图片
```

## 快速开始

需要 Node.js 和 npm。在 PowerShell 中运行：

```powershell
cd D:\opencode
npm install
npm run dev
```

然后访问 <http://localhost:3000>。如果 3000 端口被占用，Next.js 会在终端显示实际使用的端口。

常用命令：

```powershell
npm test          # 运行 Vitest 回归测试
npm run lint      # 运行 ESLint
npm run build     # 生产构建并进行类型检查
npm start         # 启动生产版本
```

## OCR 配置

在项目根目录创建 `.env.local`，填写一个兼容 `/chat/completions` 且支持图片输入的视觉模型接口：

```env
OCR_API_BASE=https://your-endpoint.example/v1
OCR_API_KEY=your-api-key
OCR_MODEL=your-vision-model
```

`.env.local` 已被 Git 忽略，密钥不得提交到仓库。未配置 OCR 时，仍可以手动输入和编辑 Markdown + LaTeX 内容。

## 数据存储

应用首次运行时会在 `data/errors.db` 创建 SQLite 数据库。新上传的图片先写入 `data/tmp-images/`，保存错题后才移动到 `data/images/`；取消或过期的临时附件会被清理。

`data/` 属于本地运行数据，已加入 Git 忽略规则。需要迁移或备份时，请一并保存数据库、WAL 文件和图片目录，不要将包含个人内容的数据提交到公共仓库。
