export type Locale = "zh-CN" | "en-US";

export type AppSection = "library" | "metadata" | "split" | "lab" | "export";

export type ExportRange = "current" | "selected" | "all";

export type ExportFormat = "jpeg" | "png";

export type ExportContent = "processed" | "split-only";

export type ExportMode = "zip" | "folder";

export type MetadataMergeStrategy = "fill-empty" | "overwrite" | "selected-only";

export type PreviewTarget = "original" | "left" | "right";

export type Rect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type AssetLocation = {
  lat: number;
  lng: number;
  label?: string;
};

export type AssetMetadata = {
  shotAt?: string;
  cameraModel?: string;
  scannerModel?: string;
  location?: AssetLocation;
  notes?: string;
  tags?: string[];
};

export type SplitRecipe = {
  mode: "single" | "half-frame";
  detectorVersion: string;
  confidence?: number;
  leftCrop?: Rect;
  rightCrop?: Rect;
  leftRotation: number;
  rightRotation: number;
  activeSide: "left" | "right";
};

export type CurvePoint = {
  x: number;
  y: number;
};

export type ColorRecipe = {
  invertNegative: boolean;
  removeMask: boolean;
  exposure: number;
  contrast: number;
  saturation: number;
  temperature: number;
  tint: number;
  blackPoint: number;
  whitePoint: number;
  curve: CurvePoint[];
};

export type ColorPreset = {
  id: string;
  name: string;
  recipe: ColorRecipe;
};

export type ProcessingRecipe = {
  split: SplitRecipe;
  color: ColorRecipe;
};

export type AssetSource = {
  mode: "session-file" | "file-handle";
  fileName: string;
  mimeType: string;
  size: number;
  handleId?: string;
  relativePath?: string;
};

export type AssetFlags = {
  autoSplitTried: boolean;
  splitAccepted: boolean;
};

export type Asset = {
  id: string;
  originalName: string;
  source: AssetSource;
  width: number;
  height: number;
  thumbnailKey: string;
  metadata: AssetMetadata;
  recipe: ProcessingRecipe;
  flags: AssetFlags;
};

export type ProjectSnapshot = {
  id: string;
  name: string;
  locale: Locale;
  createdAt: string;
  updatedAt: string;
  assets: Asset[];
  exportSettings: ExportSettings;
  colorPresets: ColorPreset[];
};

export type ExportSettings = {
  range: ExportRange;
  content: ExportContent;
  format: ExportFormat;
  quality: number;
  mode: ExportMode;
  namingTemplate: string;
  includeSidecar: boolean;
};

export type JobStage = "idle" | "running" | "success" | "error";

export type JobStatus = {
  id: string;
  label: string;
  progress: number;
  stage: JobStage;
  message?: string;
};

export type BatchMetadataPatch = {
  shotAt?: string;
  cameraModel?: string;
  scannerModel?: string;
  location?: AssetLocation;
  notes?: string;
  tags?: string[];
};

export type PartialColorRecipe = Partial<ColorRecipe>;

export type AssetFileBundle = {
  asset: Asset;
  file: File;
};

export type HistogramBins = {
  red: number[];
  green: number[];
  blue: number[];
  luminance: number[];
};

export type SplitDetectionResult = {
  confidence: number;
  leftCrop: Rect;
  rightCrop: Rect;
};
