import { createId } from "../utils/id";
import type { ColorPreset, ColorRecipe, ExportSettings, ProcessingRecipe, ProjectSnapshot, SplitRecipe } from "../types/models";

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

function cloneColorRecipe(recipe: ColorRecipe): ColorRecipe {
  return {
    ...recipe,
    curve: recipe.curve.map((point) => ({ ...point })),
  };
}

export function createDefaultPresets(): ColorPreset[] {
  const neutral: ColorRecipe = cloneColorRecipe({
    ...defaultColorRecipe,
    invertNegative: true,
    removeMask: true,
  });

  const softContrast: ColorRecipe = cloneColorRecipe({
    ...defaultColorRecipe,
    invertNegative: true,
    removeMask: true,
    contrast: 0.12,
    exposure: 0.08,
    saturation: 0.08,
  });

  const warmPrint: ColorRecipe = cloneColorRecipe({
    ...defaultColorRecipe,
    invertNegative: true,
    removeMask: true,
    contrast: 0.18,
    exposure: 0.1,
    saturation: 0.12,
    temperature: 0.16,
    curve: [
      { x: 0, y: 0 },
      { x: 0.3, y: 0.24 },
      { x: 0.72, y: 0.8 },
      { x: 1, y: 1 },
    ],
  });

  return [
    { id: createId("preset"), name: "Neutral", recipe: neutral },
    { id: createId("preset"), name: "Soft Contrast", recipe: softContrast },
    { id: createId("preset"), name: "Warm Print", recipe: warmPrint },
  ];
}

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
    colorPresets: createDefaultPresets(),
  };
}
