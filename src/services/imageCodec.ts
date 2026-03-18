import type { Rect } from "../types/models";
import { normalizeRect } from "./colorEngine";

export async function createBitmapFromFile(file: File) {
  return createImageBitmap(file);
}

export async function generateThumbnailBlob(file: File, maxEdge = 512) {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Canvas 2D context is not available.");
  }

  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("Failed to generate thumbnail blob."));
        return;
      }

      resolve(blob);
    }, "image/jpeg", 0.86);
  });
}

export async function blobToObjectUrl(blob: Blob) {
  return URL.createObjectURL(blob);
}

export async function cropBitmapToCanvas(bitmap: ImageBitmap, rect: Rect, rotation = 0) {
  const normalized = normalizeRect(rect, bitmap.width, bitmap.height);
  const radians = (rotation * Math.PI) / 180;
  const sin = Math.abs(Math.sin(radians));
  const cos = Math.abs(Math.cos(radians));
  const outputWidth = Math.max(1, Math.round(normalized.width * cos + normalized.height * sin));
  const outputHeight = Math.max(1, Math.round(normalized.width * sin + normalized.height * cos));
  const canvas = document.createElement("canvas");
  canvas.width = outputWidth;
  canvas.height = outputHeight;
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Canvas 2D context is not available.");
  }

  context.translate(outputWidth / 2, outputHeight / 2);
  context.rotate(radians);
  context.drawImage(
    bitmap,
    normalized.x,
    normalized.y,
    normalized.width,
    normalized.height,
    -normalized.width / 2,
    -normalized.height / 2,
    normalized.width,
    normalized.height,
  );

  return canvas;
}
