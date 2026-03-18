# Film Reprocess 技术路线

## 1. 目标与边界

本项目的目标不是做一个“在线修图网站”，而是做一个适合胶片扫描再处理的本地优先 Web 工具。

最终目标：

- 运行在浏览器中
- 可部署在 GitHub Pages
- 支持桌面、平板、手机
- 支持中英文
- 支持本地导入、批量元数据编辑、半格拆分、去色罩、基础调色、批量导出

明确边界：

- 不做服务端
- 不做云同步
- 不直接改写原始文件
- 不把原图上传到第三方服务器
- 首版不做 RAW 解码
- 首版不做复杂 AI 自动调色

## 2. 最终技术架构

### 2.1 架构原则

整个项目按 6 个原则落地：

1. `静态部署优先`
   - 所有页面和逻辑都能通过静态站点部署。
2. `本地优先`
   - 用户文件只在本地浏览器中处理。
3. `参数化编辑`
   - 原图不改，所有改动记录为 recipe。
4. `预览与导出分离`
   - 页面使用代理图和缩略图预览，导出时再跑高精度处理。
5. `主线程轻量化`
   - 重计算全部放 Worker。
6. `可回退`
   - 任何自动识别都必须可人工覆盖。

### 2.2 最终架构图

```text
GitHub Pages
  -> Vite SPA
     -> React UI Layer
     -> Zustand App State
     -> Dexie / IndexedDB Persistence
     -> Web Workers Processing Pipeline
        -> Thumbnail Engine
        -> Split Detection Engine
        -> Crop / Rotate Engine
        -> Negative / Mask Removal Engine
        -> Histogram / Curve Engine
        -> Export Engine
     -> Browser APIs
        -> File System Access API (desktop preferred)
        -> File Input / Directory Input (fallback)
        -> Canvas / OffscreenCanvas / ImageBitmap
        -> Blob / ZIP Download
     -> Leaflet + OSM Map
```

## 3. 技术选型

### 3.1 前端基础栈

- `React + TypeScript`
  - 复杂交互、状态联动、组件复用更稳定。
- `Vite`
  - 构建快，适合静态部署和 Worker 集成。
- `Hash Router`
  - GitHub Pages 下最省心，避免 history 路由 404 问题。
- `pnpm`
  - 依赖安装快，适合长期维护。

理由：

- React 生态对图像编辑器、响应式组件、Worker 通信方案更成熟。
- Vite 对静态资源、Worker、GitHub Pages 部署都更顺手。
- Hash Router 可以避免为了 GitHub Pages 额外维护 404 回退逻辑。

### 3.2 UI 与样式

- `CSS Modules + CSS Variables`
- `Design Tokens`
- `少量原生语义组件 + 自定义无样式业务组件`

不建议首版引入重型 UI 框架，原因是：

- 这个产品的工作区布局很强，和普通表单站点不同。
- 半格裁剪、调色面板、移动端抽屉都需要高度定制。
- 后续如果引入曲线工具、直方图、触控手势，重型 UI 框架反而会限制结构。

样式策略：

- `tokens.css`
  - 颜色、间距、圆角、阴影、断点
- `globals.css`
  - 排版、滚动条、基础元素
- `responsive.css`
  - 桌面/平板/手机布局切换

### 3.3 状态与本地存储

- `Zustand`
  - 管 UI 状态、选中状态、任务状态
- `Dexie`
  - 作为 IndexedDB 的访问层

状态拆分：

- `ui.store`
  - 当前页面、语言、面板状态、选择状态
- `project.store`
  - 图片列表、元数据、recipe、导出设置
- `job.store`
  - 自动识别、导出、批处理任务状态

数据持久化策略：

- `Project Manifest`
  - 保存到 IndexedDB
- `Thumbnails / Preview Cache`
  - 保存到 IndexedDB
- `Source File Handle`
  - 桌面 Chromium 浏览器优先保存句柄
- `Fallback`
  - 不支持 File System Access 的环境，允许重新关联源文件

这个策略的核心是：

- 不默认复制原图到浏览器数据库
- 只保存项目结构、缩略图、参数和必要缓存
- 避免大批量底片扫描把浏览器存储写爆

### 3.4 图像处理栈

- `createImageBitmap`
  - 做解码入口
- `Canvas 2D`
  - 首版图像处理基线
- `OffscreenCanvas`
  - Worker 中做预览和导出计算
- `Web Worker`
  - 承载重计算
- `OpenCV.js`
  - 第二阶段增强半格自动识别

路线选择：

- 首版先用 `Canvas 2D + Worker + 手写检测算法`
- 当自动识别规则稳定后，再决定是否引入 OpenCV.js

原因：

- OpenCV.js 包体积大，首版直接引入会拖慢加载。
- 半格拆分的实际场景规则比较强，先用启发式方法更容易验证。

### 3.5 地图栈

- `Leaflet`
- `OpenStreetMap` 底图

路线说明：

- 首版先做拖点选位和坐标保存
- 地点名称反查和地点搜索做成可插拔 geocoder
- 默认以低频搜索为前提

重要限制：

- 如果未来公开部署给很多用户使用，不建议直接把大流量地点搜索压到公共 OSM/Nominatim 服务上
- 需要预留 geocoder provider 抽象层，后续可切换到自托管或商用服务

### 3.6 导出栈

- `Canvas / OffscreenCanvas`
- `Blob`
- `JSZip`
- `File System Access API`

导出策略：

- 桌面 Chromium：优先导出到用户选择目录
- Safari / iOS / 兼容模式：ZIP 下载
- sidecar：优先 `json`
- 后续可扩展 `xmp`

## 4. 功能架构与模块分层

### 4.1 顶层模块

```text
src/
  app/
  pages/
  features/
    import/
    library/
    metadata/
    split/
    color/
    export/
    map/
    i18n/
  components/
  store/
  workers/
  services/
  utils/
  types/
```

### 4.2 模块职责

- `features/import`
  - 文件导入、目录导入、导入结果归档、缩略图生成
- `features/library`
  - 缩略图墙、筛选、排序、多选、批量入口
- `features/metadata`
  - 单张编辑、批量编辑、字段合并策略
- `features/split`
  - 半格识别、裁剪框编辑、旋转、命名预览
- `features/color`
  - 反相、去色罩、曝光/对比度/色温/曲线、直方图
- `features/export`
  - 导出范围、命名模板、格式与质量、任务进度
- `features/map`
  - 地图显示、拖点、反向地理编码 provider

### 4.3 服务层

- `services/persistence`
  - Dexie schema、项目读写、缩略图缓存
- `services/file-access`
  - File System Access 与 input 兼容层
- `services/image-codec`
  - 解码、代理图生成、像素读写
- `services/split-detection`
  - 半格识别算法
- `services/color-engine`
  - 去色罩、色彩参数、曲线 LUT
- `services/export`
  - 输出编码、ZIP 打包、下载
- `services/naming`
  - L/R 命名模板引擎
- `services/i18n`
  - 语言包加载

## 5. 核心数据模型

### 5.1 项目对象

```ts
type Project = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  locale: "zh-CN" | "en-US";
  assets: string[];
  exportPreset: ExportPreset;
};
```

### 5.2 图片对象

```ts
type Asset = {
  id: string;
  originalName: string;
  source: AssetSource;
  width: number;
  height: number;
  metadata: AssetMetadata;
  recipe: ProcessingRecipe;
  splitOutputs: SplitOutput[];
  flags: AssetFlags;
};
```

### 5.3 来源对象

```ts
type AssetSource = {
  mode: "file-handle" | "file-import";
  handleKey?: string;
  sessionRef?: string;
  mimeType: string;
  byteSize: number;
};
```

### 5.4 规则与结果

```ts
type ProcessingRecipe = {
  split?: SplitRecipe;
  color?: ColorRecipe;
};

type SplitRecipe = {
  mode: "single" | "half-frame";
  detectorVersion: string;
  confidence?: number;
  leftCrop?: Rect;
  rightCrop?: Rect;
  leftRotation?: number;
  rightRotation?: number;
};

type ColorRecipe = {
  invertNegative: boolean;
  removeMask: boolean;
  maskSampleMode: "auto-border" | "manual";
  exposure: number;
  contrast: number;
  saturation: number;
  temperature: number;
  tint: number;
  blackPoint: number;
  whitePoint: number;
  curve: Array<{ x: number; y: number }>;
};
```

关键原则：

- 图片对象永远指向原图
- 拆分结果和调色结果都由 recipe 推导
- 导出时再真正生成文件

## 6. 图像处理技术路线

### 6.1 导入与缩略图

处理步骤：

1. 用户选择文件或目录
2. 校验扩展名和 MIME
3. 使用 `createImageBitmap` 解码
4. 生成缩略图
5. 保存项目记录
6. 在图库中按懒加载展示

策略：

- 缩略图控制在统一长边，避免图库滚动卡顿
- 原图不立即全部解码
- 大批量导入时分批处理并显示任务进度

### 6.2 半格自动识别

首版算法路线：

1. 将图片缩小到分析尺寸
2. 计算亮度图
3. 在图像中部区域做垂直投影扫描
4. 查找可能的左右边界和中缝位置
5. 结合边缘密度、留白、长宽比生成两个候选框
6. 计算置信度
7. 回传裁剪框与推荐角度

首版不追求“永远自动正确”，而追求：

- 大部分常见扫描版式能给出可编辑初值
- 用户总能快速手动修正

第二阶段增强：

- 引入 `OpenCV.js`
- Canny 边缘检测
- 轮廓提取
- 直线检测
- 模板化处理常见扫描店输出

### 6.3 裁剪与旋转

技术路线：

- 主预览画布负责显示原图和裁剪框
- 拖拽时只改 recipe，不直接生成结果图
- 旋转角度支持任意角度
- 预览用代理图实时渲染
- 导出时用原图按最终参数渲染

这样能保证：

- 编辑体验流畅
- 导出质量不受预览图影响

### 6.4 去色罩与调色

首版调色引擎按下面顺序处理：

1. 反相
2. 去色罩
3. 黑白场
4. 曝光
5. 对比度
6. 色温 / 色调
7. 饱和度
8. 曲线

去色罩技术路线：

- `V1`
  - 自动从边缘区域采样橙色底色
  - 得到每通道偏移量
  - 允许手动微调
- `V2`
  - 增加采样点工具
  - 允许用户自己框选无曝光底片区域

直方图路线：

- 预览图级别计算
- 支持 RGB 通道叠加显示
- 参数变化后局部重算

曲线路线：

- 首版用分段线性曲线
- 转换成 256 或 1024 点 LUT
- 保证性能和可控性

## 7. 元数据与地图路线

### 7.1 元数据字段

首版统一支持：

- 拍摄地点
- 拍摄时间
- 相机机型
- 扫描仪机型
- 备注
- 标签

### 7.2 批量编辑逻辑

批量编辑不是简单覆盖，需要做字段策略：

- 空值填充
- 全量覆盖
- 仅覆盖已选字段

例如：

- 用户只改“扫描仪机型”，则不应重写拍摄时间
- 用户只给 20 张图补地点，不应清空其他字段

### 7.3 地图路线

`V1`

- 地图显示
- 拖动标记点
- 回填经纬度
- 显示可编辑地点名

`V1.1`

- 地点搜索
- 反向地理编码

`V2`

- 保存常用地点
- 最近地点快捷选择

## 8. 导出与命名路线

### 8.1 导出能力

首版支持：

- 当前图导出
- 所选图导出
- 全部导出
- JPEG / PNG
- ZIP 打包
- sidecar JSON

### 8.2 命名引擎

默认模板：

- `{name}_L`
- `{name}_R`

自定义模板建议支持：

- `{name}`
- `{side}`
- `{index}`
- `{date}`
- `{camera}`

命名引擎要求：

- 实时预览结果
- 校验非法字符
- 自动避免重名

### 8.3 sidecar 设计

首版建议输出：

- `manifest.json`
  - 整批导出的汇总信息
- `每张图对应的 metadata json`
  - 保留拍摄地点、时间、设备、处理 recipe

原因：

- 浏览器里写 EXIF/XMP 的兼容性和复杂度都更高
- JSON 最适合作为首版项目可追溯格式

## 9. 响应式与交互路线

### 9.1 桌面端优先

桌面端是首版主战场，优先保障：

- 缩略图墙效率
- 批量编辑效率
- 半格裁剪精度
- 调色预览流畅度

### 9.2 平板端

平板端做“次优完整体验”：

- 两栏布局
- 参数抽屉化
- 支持轻量裁剪和快速调色

### 9.3 手机端

手机端首版目标不是完全替代桌面，而是：

- 可以导入
- 可以查看
- 可以改基础元数据
- 可以修正半格裁剪
- 可以做基础调色
- 可以导出

手机端交互路线：

- 底部导航
- 全屏主预览
- 底部抽屉参数面板
- 手势缩放和平移
- 地图选点全屏化

## 10. 国际化路线

语言：

- `zh-CN`
- `en-US`

策略：

- 所有文案从第一天就走 key-based i18n
- 不允许把固定文案写死在组件里

文件结构：

```text
public/locales/
  zh-CN.json
  en-US.json
```

处理范围：

- 页面文案
- 表单占位
- 错误提示
- 导出模板说明
- 日期和数字格式

## 11. 性能路线

### 11.1 首屏性能

- 首页和工作台分包
- 地图、ZIP、OpenCV 按需加载
- 缩略图懒加载

### 11.2 大批量性能

- 图库虚拟滚动
- Worker 任务并发控制
- 代理图编辑
- 导出时才跑原图

### 11.3 内存控制

- 大图只在需要时解码
- 不同时保留过多 ImageBitmap
- 及时释放中间 Canvas 和 Blob URL

## 12. 测试路线

### 12.1 单元测试

使用：

- `Vitest`

覆盖重点：

- 命名模板引擎
- 元数据合并逻辑
- split detector 纯算法部分
- 曲线 LUT
- 导出参数组装

### 12.2 组件测试

使用：

- `React Testing Library`

覆盖重点：

- 批量编辑表单
- 裁剪框参数同步
- 导出面板
- 语言切换

### 12.3 端到端测试

使用：

- `Playwright`

覆盖重点：

- 导入到导出主流程
- 半格自动识别后手动修正
- 手机端关键流程
- GitHub Pages 构建后的基础可用性

### 12.4 测试素材策略

需要建立 4 类样本：

- 单张正常扫描
- 半格二合一扫描
- 带明显色罩的底片
- 极端尺寸或异常文件

测试集不要只依赖真实照片，还要有：

- 合成样本
- 小尺寸基准图
- 命名冲突样本

## 13. 工程与协作路线

### 13.1 仓库规范

- `main`
  - 可发布分支
- `codex/*`
  - 功能开发分支

### 13.2 工程规范

- TypeScript 严格模式
- ESLint
- Prettier
- Husky + lint-staged

### 13.3 CI/CD

GitHub Actions 流程：

1. 安装依赖
2. 类型检查
3. Lint
4. Unit Test
5. E2E Smoke
6. Build
7. Deploy to GitHub Pages

部署要求：

- `vite.config.ts` 配置仓库 `base`
- 使用 hash 路由
- 输出静态资源版本指纹

## 14. 里程碑与交付计划

### M0 规格冻结

目标：

- 确认信息架构
- 确认技术路线
- 确认 MVP 范围

交付物：

- 产品设计文档
- 技术路线文档
- 页面线框图

### M1 工程骨架

目标：

- 初始化 React + TypeScript + Vite
- 搭建基础布局
- 接入 i18n、路由、状态、持久化

完成标准：

- GitHub Pages 可部署
- 中英文切换可用
- 空工作台可运行

### M2 导入与图库

目标：

- 导入文件/目录
- 建立项目
- 缩略图墙
- 多选与筛选

完成标准：

- 可以稳定导入一批图片
- 大批量导入不会卡死页面

### M3 元数据与地图

目标：

- 单张编辑
- 批量编辑
- 地图拖点

完成标准：

- 选中图片后可修改并持久化
- 批量编辑不会误覆盖未选字段

### M4 半格拆分

目标：

- 自动识别
- 手动修正
- L/R 旋转
- 命名模板预览

完成标准：

- 常见半格二合一扫描能给出可用初值
- 用户可完整手动修正后保存

### M5 去色罩与调色

目标：

- 反相
- 去色罩
- 基础调色
- 直方图

完成标准：

- 当前图预览交互流畅
- 参数可复制到多张图片

### M6 导出闭环

目标：

- 批量导出
- ZIP 打包
- sidecar JSON

完成标准：

- 完成从导入到导出的完整闭环
- 命名规则和导出结果可预期

### M7 移动端与收尾

目标：

- 平板/手机适配
- 边界问题修复
- 性能优化
- 测试补齐

完成标准：

- 手机端核心流程可用
- 桌面端主流程稳定

### M8 发布与文档

目标：

- 正式部署 GitHub Pages
- 完成用户说明
- 完成已知限制说明

完成标准：

- 外部用户可以独立完成主流程
- 已知限制清晰可见

## 15. 风险与应对

### 15.1 浏览器能力差异

风险：

- File System Access API 并非所有浏览器都有

应对：

- 抽象文件访问层
- 桌面走目录句柄
- 兼容环境走文件选择 + ZIP 导出

### 15.2 大图性能和内存

风险：

- 高分辨率扫描图很容易卡死页面

应对：

- 预览代理图
- Worker 计算
- 任务队列
- 延迟解码

### 15.3 自动识别不稳定

风险：

- 不同扫描店版式差异大

应对：

- 首版就提供强手动修正
- 保存识别置信度
- 后续引入 OpenCV.js 增强

### 15.4 公共地图服务限流

风险：

- 公共 geocoder 服务可能限速

应对：

- 首版拖点优先
- 搜索作为可插拔增强
- 预留 provider 切换

## 16. 到完成时的最终交付形态

项目完成时，应该具备下面这些结果：

1. 一个可部署到 GitHub Pages 的静态 Web 应用
2. 一套清晰的项目数据结构和本地存储方案
3. 一条完整的工作流：
   - 导入
   - 批量元数据
   - 半格拆分
   - 去色罩与调色
   - 批量导出
4. 一套桌面优先、移动端可用的响应式界面
5. 一套基础自动化测试和发布流程
6. 一份用户文档和已知限制说明

## 17. 下一步执行顺序

从现在开始，最合理的执行顺序是：

1. 画低保真线框图
2. 初始化项目骨架
3. 先做 `M1 + M2`
4. 再做 `M3 + M4`
5. 之后完成 `M5 + M6`
6. 最后做 `M7 + M8`

这条路线的核心思想是：

- 先把项目骨架和数据流打稳
- 再做最有辨识度的半格拆分
- 最后补齐调色、导出和移动端体验

## 18. 官方依据

下面这些文档是当前路线的技术依据入口：

- Vite 静态部署与 GitHub Pages
  - https://vite.dev/guide/static-deploy.html
- GitHub Pages 自定义工作流
  - https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages
- File System API
  - https://developer.mozilla.org/en-US/docs/Web/API/File_System_API
- IndexedDB API
  - https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API
- OffscreenCanvas
  - https://developer.mozilla.org/en-US/docs/Web/API/OffscreenCanvas
- createImageBitmap
  - https://developer.mozilla.org/en-US/docs/Web/API/Window/createImageBitmap
- Leaflet 文档
  - https://leafletjs.com/reference.html
- Leaflet 快速开始
  - https://leafletjs.com/examples/quick-start/
