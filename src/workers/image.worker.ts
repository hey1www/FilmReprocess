import { processImageData } from "../services/colorEngine";
import { createHistogram } from "../services/histogram";
import { detectHalfFrameFromImageData } from "../services/splitDetection";
import type { ColorRecipe, HistogramBins, Rect } from "../types/models";

type AnalyzeSplitRequest = {
  id: string;
  type: "analyze-split";
  bitmap: ImageBitmap;
};

type RenderRequest = {
  id: string;
  type: "render";
  bitmap: ImageBitmap;
  color: ColorRecipe;
  crop?: Rect;
  rotation?: number;
  maxEdge?: number;
  output?: {
    format: "image/jpeg" | "image/png";
    quality?: number;
  };
};

type WorkerRequest = AnalyzeSplitRequest | RenderRequest;

type AnalyzeSplitResponse = {
  id: string;
  type: "analyze-split";
  result: ReturnType<typeof detectHalfFrameFromImageData>;
};

type RenderResponse = {
  id: string;
  type: "render";
  blob: Blob;
  histogram: HistogramBins;
};

function drawCrop(bitmap: ImageBitmap, crop?: Rect, rotation = 0, maxEdge?: number) {
  const sourceWidth = crop?.width ?? bitmap.width;
  const sourceHeight = crop?.height ?? bitmap.height;
  const radians = (rotation * Math.PI) / 180;
  const sin = Math.abs(Math.sin(radians));
  const cos = Math.abs(Math.cos(radians));
  let width = Math.max(1, Math.round(sourceWidth * cos + sourceHeight * sin));
  let height = Math.max(1, Math.round(sourceWidth * sin + sourceHeight * cos));

  if (maxEdge) {
    const scale = Math.min(1, maxEdge / Math.max(width, height));
    width = Math.max(1, Math.round(width * scale));
    height = Math.max(1, Math.round(height * scale));
  }

  const canvas = new OffscreenCanvas(width, height);
  const context = canvas.getContext("2d", { willReadFrequently: true });

  if (!context) {
    throw new Error("OffscreenCanvas 2D context is not available.");
  }

  context.clearRect(0, 0, width, height);
  context.translate(width / 2, height / 2);
  context.rotate(radians);
  context.drawImage(
    bitmap,
    crop?.x ?? 0,
    crop?.y ?? 0,
    crop?.width ?? bitmap.width,
    crop?.height ?? bitmap.height,
    -(crop?.width ?? bitmap.width) / 2,
    -(crop?.height ?? bitmap.height) / 2,
    crop?.width ?? bitmap.width,
    crop?.height ?? bitmap.height,
  );

  return { canvas, context };
}

self.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  const request = event.data;

  if (request.type === "analyze-split") {
    const canvas = new OffscreenCanvas(request.bitmap.width, request.bitmap.height);
    const context = canvas.getContext("2d", { willReadFrequently: true });

    if (!context) {
      throw new Error("OffscreenCanvas 2D context is not available.");
    }

    context.drawImage(request.bitmap, 0, 0);
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    const result = detectHalfFrameFromImageData(imageData);
    const response: AnalyzeSplitResponse = {
      id: request.id,
      type: "analyze-split",
      result,
    };
    self.postMessage(response);
    request.bitmap.close();
    return;
  }

  const { canvas, context } = drawCrop(
    request.bitmap,
    request.crop,
    request.rotation ?? 0,
    request.maxEdge,
  );
  const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
  const processed = processImageData(imageData, request.color);
  context.putImageData(processed, 0, 0);

  const blob = await canvas.convertToBlob({
    type: request.output?.format ?? "image/jpeg",
    quality: request.output?.quality,
  });

  const response: RenderResponse = {
    id: request.id,
    type: "render",
    blob,
    histogram: createHistogram(processed),
  };

  self.postMessage(response);
  request.bitmap.close();
};
