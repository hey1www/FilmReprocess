import type { ColorRecipe, ExportSettings, ProcessingRecipe, ProjectSnapshot, SplitRecipe } from "../types/models";

export const defaultCurve = [
  { x: 0, y: 0 },
  { x: 0.33, y: 0.33 },
  { x: 0.66, y: 0.66 },
  { x: 1, y: 1 },
];

export const defaultColorRecipe: ColorRecipe = {
  invertNegative: true,
  removeMask: true,
  exposure: 0,
  contrast: 0,
  saturation: 0,
  temperature: 0,
  tint: 0,
  blackPoint: 0,
  whitePoint: 1,
  curve: defaultCurve,
};

export const defaultSplitRecipe: SplitRecipe = {
  mode: "single",
  detectorVersion: "v1",
  leftRotation: 0,
  rightRotation: 0,
  activeSide: "left",
};

export const defaultProcessingRecipe: ProcessingRecipe = {
  split: defaultSplitRecipe,
  color: defaultColorRecipe,
};

export const defaultExportSettings: ExportSettings = {
  range: "selected",
  content: "processed",
  format: "jpeg",
  quality: 0.92,
  mode: "zip",
  namingTemplate: "{name}_{side}",
  includeSidecar: true,
};

export function createEmptyProject(name = "Film Reprocess Project"): ProjectSnapshot {
  const now = new Date().toISOString();

  return {
    id: "project-default",
    name,
    locale: "zh-CN",
    createdAt: now,
    updatedAt: now,
    assets: [],
    exportSettings: defaultExportSettings,
  };
}
