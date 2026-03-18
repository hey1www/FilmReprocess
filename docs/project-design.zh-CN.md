# Film Reprocess 项目设计草案

## 1. 项目定位

这是一个面向胶片扫描再处理的纯前端 Web 应用，优先支持部署在 GitHub Pages。

设计前提：

- 不依赖自建后端，核心能力在浏览器端完成。
- 支持本地文件导入、批量处理、批量导出。
- 兼容桌面端、平板端、手机端。
- 支持中英文切换。
- 对大图处理使用 Worker 异步执行，避免界面卡顿。

这意味着系统应该尽量采用：

- 静态站点部署
- 浏览器本地存储项目状态
- 浏览器端图像处理
- 浏览器端地图选点
- 导出为处理后图片和元数据 sidecar 文件

## 2. 产品层级关系

### 2.1 一级模块

整个应用建议拆成 6 个一级模块：

1. `导入 Import`
2. `资料库 Library`
3. `元数据 Metadata`
4. `半格拆分 Split`
5. `调色 Lab`
6. `导出 Export`

另有 4 个全局能力：

- `项目状态 Project`
- `任务队列 Jobs`
- `国际化 i18n`
- `响应式布局 Responsive UI`

### 2.2 页面与区域层级

建议采用单页应用结构，避免 GitHub Pages 下多页面状态切换复杂化。

顶层结构：

- `App Shell`
- `顶部栏 Top Bar`
- `左侧导航 Sidebar`
- `主工作区 Workspace`
- `右侧检查器 Inspector`
- `底部任务栏 Job Panel`

各区域职责：

- `顶部栏`
  - 项目名称
  - 导入入口
  - 语言切换
  - 设备适配入口
  - 导出按钮
- `左侧导航`
  - 资料库
  - 元数据
  - 半格拆分
  - 调色
  - 导出
- `主工作区`
  - 当前模块的主视图
- `右侧检查器`
  - 当前选中图片的属性、参数、历史操作
- `底部任务栏`
  - 自动识别、批量处理、导出进度、错误提示

### 2.3 数据层级

建议将数据结构分成 5 层：

1. `Source Asset`
   - 用户导入的原始图片
   - 只读，不直接改写
2. `Asset Metadata`
   - 拍摄地点
   - 拍摄时间
   - 相机机型
   - 扫描仪机型
   - 标签、备注
3. `Processing Recipe`
   - 半格拆分参数
   - 旋转参数
   - 去色罩参数
   - 颜色微调参数
   - 曲线参数
4. `Derived Output`
   - 拆分后的 L/R 图像
   - 调整后的导出图像
5. `Project Manifest`
   - 当前项目内所有图片、参数、命名规则、导出设置

建议核心思想是：

- 原图不改
- 编辑是“参数化”的
- 导出时才真正生成结果图

这样更适合批处理、撤销、重新导出，也更适合纯前端架构。

## 3. 技术层级关系

### 3.1 部署与运行层

- `GitHub Pages`
  - 托管静态页面
- `SPA 前端`
  - React 或 Vue 都可以，建议 React + TypeScript
- `Vite`
  - 构建、开发、静态资源处理

推荐原因：

- GitHub Pages 对静态站点友好
- Vite 构建简单，适合后续接 WASM / Worker
- TypeScript 适合复杂状态管理

### 3.2 应用层

- `App Shell`
- `Feature Modules`
  - import
  - library
  - metadata
  - split
  - lab
  - export
- `Shared UI`
  - 按钮、抽屉、弹窗、表单、滑杆、曲线控件

### 3.3 状态层

- `UI State`
  - 当前模块
  - 当前选择图片
  - 当前语言
  - 面板开关
- `Project State`
  - 项目清单
  - 图片列表
  - 元数据
  - 处理参数
- `Job State`
  - 自动识别进度
  - 批处理进度
  - 导出进度

建议使用：

- `Zustand` 或 `Pinia` 这类轻量状态库
- `IndexedDB` 保存项目数据和缩略图缓存

### 3.4 处理层

- `Image Decode`
- `Thumbnail Generator`
- `Half-frame Detector`
- `Crop/Rotate Processor`
- `Mask Removal Processor`
- `Color Adjustment Processor`
- `Histogram/Curve Engine`
- `Export Encoder`

建议这些都放在 `Web Worker` 中执行。

如果后续需要更强识别能力，可引入：

- `OpenCV.js` 做边界检测、自动分割
- `Canvas/WebGL/WebGPU` 做图像调色和预览

### 3.5 存储层

由于 GitHub Pages 无后端，建议采用：

- `IndexedDB`
  - 项目配置、缓存、缩略图、操作记录
- `File System Access API`
  - 桌面端浏览器下支持直接读取本地文件夹
- `input[type=file]` / `webkitdirectory`
  - 作为通用兼容方案
- `ZIP 导出`
  - 移动端和 Safari 的兜底方案

## 4. 推荐项目目录结构

```text
FilmReprocess/
  docs/
    project-design.zh-CN.md
  public/
    locales/
      zh-CN.json
      en-US.json
    icons/
  src/
    app/
      App.tsx
      router.ts
      providers/
    pages/
      library/
      metadata/
      split/
      lab/
      export/
    features/
      import/
      asset/
      metadata/
      split/
      color/
      export/
      map/
      i18n/
    components/
      layout/
      viewer/
      inspector/
      histogram/
      curve-editor/
      crop-editor/
      batch-panel/
      mobile/
    store/
      project.store.ts
      ui.store.ts
      job.store.ts
    workers/
      image.worker.ts
      split.worker.ts
      export.worker.ts
    services/
      image-codec/
      metadata/
      export/
      persistence/
      naming/
    utils/
      math/
      color/
      exif/
      file/
    types/
      asset.ts
      project.ts
      recipe.ts
      metadata.ts
    styles/
      tokens.css
      globals.css
      responsive.css
  index.html
  package.json
  vite.config.ts
```

这个结构的重点是：

- `pages` 负责页面编排
- `features` 负责业务模块
- `components` 放通用组件
- `workers` 放重计算
- `services` 放与浏览器 API、编码器、存储相关的能力

## 5. 关键对象设计

### 5.1 图片对象 Asset

```ts
type Asset = {
  id: string;
  originalName: string;
  fileRef: string;
  thumbRef?: string;
  width?: number;
  height?: number;
  status: "raw" | "split" | "edited" | "exported";
  metadata: AssetMetadata;
  recipe: ProcessingRecipe;
  outputs?: DerivedOutput[];
};
```

### 5.2 元数据对象 AssetMetadata

```ts
type AssetMetadata = {
  shotAt?: string;
  cameraModel?: string;
  scannerModel?: string;
  location?: {
    lat: number;
    lng: number;
    label?: string;
  };
  notes?: string;
  tags?: string[];
};
```

### 5.3 处理参数对象 ProcessingRecipe

```ts
type ProcessingRecipe = {
  split?: {
    mode: "single" | "half-frame";
    autoDetected?: boolean;
    leftCrop?: Rect;
    rightCrop?: Rect;
    rotationLeft?: number;
    rotationRight?: number;
  };
  color?: {
    invertNegative: boolean;
    removeMask: boolean;
    exposure: number;
    contrast: number;
    saturation: number;
    temperature: number;
    tint: number;
    curvePoints: Array<{ x: number; y: number }>;
  };
};
```

## 6. 交互流程设计

### 6.1 主流程总览

建议主流程固定为：

1. 导入图片
2. 建立项目
3. 批量补充基础元数据
4. 自动识别半格二合一扫描
5. 人工检查并修正裁剪与旋转
6. 进入调色
7. 批量或单张导出

这样可以保证用户心智稳定，不会在功能之间频繁迷路。

### 6.2 流程一：导入

入口：

- 首页“导入文件夹”
- 首页“导入照片”
- 顶栏“继续上次项目”

交互步骤：

1. 用户选择导入文件夹或多个文件
2. 系统生成缩略图并建立项目
3. 系统识别图片基础信息
4. 系统询问：
   - 是否将当前导入识别为一个新项目
   - 是否立即进入“批量元数据填写”
5. 进入资料库页面

界面结果：

- 左侧是图片列表/缩略图墙
- 中间是预览
- 右侧是基础信息

### 6.3 流程二：元数据编辑

分为两种模式：

- `单张编辑`
- `批量编辑`

批量编辑流程：

1. 用户在资料库多选图片
2. 点击“批量编辑”
3. 右侧打开批量元数据面板
4. 用户输入拍摄时间、相机机型、扫描仪机型
5. 用户点击“地图选点”
6. 弹出地图抽屉
7. 用户拖动标记点确认地点
8. 回填地理坐标和地点名称
9. 点击应用到所选图片

单张编辑流程：

1. 用户点选单张图片
2. 右侧显示该图片元数据
3. 可逐项修改
4. 修改实时保存到项目状态

地图选点交互：

- 默认显示当前定位或上次地点
- 支持搜索地点
- 支持拖动 Pin
- 支持“使用当前视图中心”
- 支持回填文字地名

### 6.4 流程三：半格自动拆分

目标：

- 针对扫描店输出的一张图片中含左右两格的情况
- 自动找出左右区域
- 允许人工修正

流程：

1. 用户选择一张或多张图片
2. 点击“自动拆分”
3. Worker 执行识别：
   - 判断是否为双幅图
   - 检测中间分界
   - 生成左裁剪框、右裁剪框
4. 主界面显示：
   - 原图预览
   - L/R 裁剪框
   - 自动识别置信状态
5. 用户可拖动裁剪框边界
6. 用户可分别旋转 L / R
7. 用户确认后保存拆分参数
8. 系统批量生成拆分结果预览

命名规则：

- 默认：
  - `原名_L`
  - `原名_R`
- 可选模板：
  - `{name}_L`
  - `{name}_R`
  - `{name}_{index}`
  - 自定义前后缀

建议增加一个“批量套用当前裁剪规则到相似图片”的入口，减少重复劳动。

### 6.5 流程四：去色罩与调色

建议将调色分成两个层次：

- `快速调色`
- `高级调色`

快速调色：

- 去色罩开关
- 自动反相
- 曝光
- 对比度
- 饱和度
- 色温
- 色调

高级调色：

- RGB 直方图
- 曲线编辑器
- 黑白场设置
- 单图复制参数
- 批量粘贴参数

操作流程：

1. 用户进入调色模块
2. 中间大图实时预览
3. 右侧显示调色控件
4. 下方显示直方图
5. 用户调整参数
6. 预览实时更新
7. 用户可将当前参数：
   - 应用到当前图
   - 应用到所选图片
   - 保存为预设

建议：

- 手机端默认先展示快速调色
- 高级曲线放在二级面板中

### 6.6 流程五：导出

导出前，先让用户确认：

- 导出范围
  - 当前图片
  - 已选图片
  - 全部图片
- 导出内容
  - 仅拆分结果
  - 拆分 + 调色结果
- 命名规则
- 图片格式
  - JPEG
  - PNG
- 图片质量
- 是否导出元数据 sidecar

导出流程：

1. 用户点击导出
2. 系统创建任务队列
3. Worker 逐张生成结果
4. 生成完成后：
   - 桌面端优先保存到用户选择目录
   - 兼容模式下打包 ZIP 下载
5. 展示成功/失败列表

## 7. 响应式交互设计

### 7.1 桌面端

建议布局：

- 左：资料库
- 中：主预览
- 右：参数面板
- 下：任务栏

适合完成：

- 批量管理
- 精细裁剪
- 曲线调色

### 7.2 平板端

建议布局：

- 默认两栏
- 左侧缩略图可折叠
- 右侧参数面板改为抽屉

适合完成：

- 检查拆分结果
- 快速调色

### 7.3 手机端

建议布局：

- 底部 Tab 导航
  - 资料库
  - 拆分
  - 调色
  - 导出
- 主预览全屏
- 参数面板底部上滑抽屉
- 元数据编辑改为表单页
- 地图选点全屏弹层

手机端应重点保留：

- 导入
- 浏览
- 简单元数据编辑
- 拆分框微调
- 快速调色
- 导出

手机端不建议首版强调：

- 复杂曲线编辑
- 高密度批量管理

## 8. 国际化设计

建议从一开始就做 i18n，而不是后补。

语言：

- `zh-CN`
- `en-US`

需要国际化的内容：

- 所有按钮文字
- 状态提示
- 错误信息
- 日期格式
- 坐标/地点展示
- 导出命名模板说明

## 9. MVP 范围建议

为了尽快上线第一版，建议 MVP 只做下面这些：

### 必做

- 导入单张/多张图片
- 资料库浏览
- 单张/批量元数据编辑
- 地图拖点设置地点
- 半格自动拆分 + 手动修正
- 单独旋转 L/R
- 去色罩 + 基础调色
- 简单直方图
- 批量导出
- 中英文切换
- 桌面端和手机端适配

### 第二阶段再做

- 高级曲线工具
- 调色预设
- 项目历史版本
- 更强自动识别算法
- 多套导出模板
- 批量规则复制

## 10. 我对这个项目的实现建议

如果目标是“未来托管到 GitHub Pages”，我建议第一版坚持这三个原则：

1. `纯前端优先`
   - 不引入服务端依赖
2. `参数化编辑优先`
   - 原图不改，所有修改都记录为 recipe
3. `MVP 先把拆分和批处理跑通`
   - 这是这个产品最有辨识度的核心功能

## 11. 建议的下一步

你审阅这版后，我建议下一步按下面顺序继续：

1. 确认信息架构和主流程
2. 画低保真页面草图
3. 确认技术选型
4. 初始化前端项目骨架
5. 先做“导入 -> 半格拆分 -> 导出”的 MVP 闭环

对应的完整工程实施路线见：

- [technical-roadmap.zh-CN.md](/Users/heyi/Project/FilmReprocess/docs/technical-roadmap.zh-CN.md)

## 12. 需要你重点确认的事项

这版方案里有 4 个关键决策，建议你先确认：

1. `是否接受“项目制”而不是“直接改原文件”`
   - 当前方案默认原图不改，所有编辑保存在项目中，导出时再生成结果。
   - 这样最适合 GitHub Pages 和移动端。
2. `元数据写回策略`
   - 首版建议优先写入导出文件或 sidecar，而不是尝试原地覆盖本地文件。
   - 原地写回在不同浏览器和手机端兼容性差。
3. `首版是否桌面端优先`
   - 手机和平板会支持，但第一版精细拆分和高级调色体验应以桌面端为主。
4. `地图能力是否接受第三方底图`
   - 例如 OpenStreetMap + Leaflet。
   - 如果后续要更强地点搜索，可能需要接入额外地理编码服务。

如果这 4 点你认可，下一步我可以直接继续做：

1. 低保真线框图
2. 前端技术栈确认
3. 初始化可运行的 GitHub Pages 项目骨架
