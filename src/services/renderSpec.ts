import { defaultColorRecipe } from "./defaults";
import type { Asset, ColorRecipe, PreviewTarget, Rect } from "../types/models";

export function getRenderSpec(asset: Asset, target: PreviewTarget) {
  if (target === "left" && asset.recipe.split.leftCrop) {
    return {
      crop: asset.recipe.split.leftCrop,
      rotation: asset.recipe.split.leftRotation,
    };
  }

  if (target === "right" && asset.recipe.split.rightCrop) {
    return {
      crop: asset.recipe.split.rightCrop,
      rotation: asset.recipe.split.rightRotation,
    };
  }

  return {
    crop: undefined,
    rotation: 0,
  };
}

export function getExportTargets(asset: Asset) {
  if (asset.recipe.split.mode === "half-frame" && asset.recipe.split.leftCrop && asset.recipe.split.rightCrop) {
    return [
      {
        side: "left" as const,
        crop: asset.recipe.split.leftCrop,
        rotation: asset.recipe.split.leftRotation,
      },
      {
        side: "right" as const,
        crop: asset.recipe.split.rightCrop,
        rotation: asset.recipe.split.rightRotation,
      },
    ];
  }

  return [
    {
      side: "single" as const,
      crop: undefined as Rect | undefined,
      rotation: 0,
    },
  ];
}

export function getColorRecipeForContent(asset: Asset, processed: boolean): ColorRecipe {
  if (processed) {
    return asset.recipe.color;
  }

  return {
    ...defaultColorRecipe,
    invertNegative: false,
    removeMask: false,
    exposure: 0,
    contrast: 0,
    saturation: 0,
    temperature: 0,
    tint: 0,
    blackPoint: 0,
    whitePoint: 1,
    curve: defaultColorRecipe.curve,
  };
}
