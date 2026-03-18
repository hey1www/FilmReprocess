import JSZip from "jszip";
import { renderProcessedBlob } from "./imagePipeline";
import { avoidDuplicateName, renderNameTemplate } from "./naming";
import { getColorRecipeForContent, getExportTargets } from "./renderSpec";
import type { Asset, ExportSettings, ProjectSnapshot } from "../types/models";

type ExportFileEntry = {
  fileName: string;
  blob: Blob;
};

async function writeBlobFile(directoryHandle: FileSystemDirectoryHandle, name: string, blob: Blob) {
  const fileHandle = await directoryHandle.getFileHandle(name, { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(blob);
  await writable.close();
}

export async function exportProject(options: {
  project: ProjectSnapshot;
  assets: Asset[];
  settings: ExportSettings;
  resolveAssetFile: (assetId: string) => Promise<File | null>;
  directoryHandle?: FileSystemDirectoryHandle;
  onProgress?: (progress: number) => void;
}) {
  const entries: ExportFileEntry[] = [];
  const usedNames = new Set<string>();
  let processedCount = 0;
  const totalOutputs = options.assets.reduce((count, asset) => count + getExportTargets(asset).length, 0);

  for (const asset of options.assets) {
    const file = await options.resolveAssetFile(asset.id);

    if (!file) {
      continue;
    }

    const outputs = getExportTargets(asset);
    const color = getColorRecipeForContent(asset, options.settings.content === "processed");

    for (const [index, output] of outputs.entries()) {
      const baseName = renderNameTemplate(asset, options.settings.namingTemplate, output.side, index + 1);
      const safeName = avoidDuplicateName(baseName, usedNames);
      const extension = options.settings.format === "jpeg" ? "jpg" : "png";
      const rendered = await renderProcessedBlob({
        file,
        color,
        crop: output.crop,
        rotation: output.rotation,
        output: {
          format: options.settings.format === "jpeg" ? "image/jpeg" : "image/png",
          quality: options.settings.quality,
        },
      });

      entries.push({
        fileName: `${safeName}.${extension}`,
        blob: rendered.blob,
      });

      if (options.settings.includeSidecar) {
        entries.push({
          fileName: `${safeName}.json`,
          blob: new Blob(
            [
              JSON.stringify(
                {
                  source: asset.originalName,
                  side: output.side,
                  metadata: asset.metadata,
                  recipe: asset.recipe,
                },
                null,
                2,
              ),
            ],
            { type: "application/json" },
          ),
        });
      }

      processedCount += 1;
      options.onProgress?.(processedCount / Math.max(1, totalOutputs));
    }
  }

  entries.push({
    fileName: "manifest.json",
    blob: new Blob(
      [
        JSON.stringify(
          {
            project: {
              id: options.project.id,
              name: options.project.name,
              createdAt: options.project.createdAt,
              updatedAt: options.project.updatedAt,
              exportSettings: options.settings,
            },
            exportedAt: new Date().toISOString(),
            files: entries.map((entry) => entry.fileName),
          },
          null,
          2,
        ),
      ],
      { type: "application/json" },
    ),
  });

  if (options.settings.mode === "folder" && options.directoryHandle) {
    for (const entry of entries) {
      await writeBlobFile(options.directoryHandle, entry.fileName, entry.blob);
    }

    return {
      mode: "folder" as const,
      entries,
    };
  }

  const zip = new JSZip();

  for (const entry of entries) {
    zip.file(entry.fileName, entry.blob);
  }

  const blob = await zip.generateAsync({ type: "blob" });
  return {
    mode: "zip" as const,
    blob,
    url: URL.createObjectURL(blob),
    entries,
  };
}

export function triggerDownload(blobUrl: string, fileName: string) {
  const link = document.createElement("a");
  link.href = blobUrl;
  link.download = fileName;
  link.click();
}
