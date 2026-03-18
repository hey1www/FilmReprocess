import { createId } from "../utils/id";

const imageExtensions = new Set(["jpg", "jpeg", "png", "webp", "tif", "tiff", "bmp", "svg"]);

function isImageName(name: string) {
  const extension = name.split(".").pop()?.toLowerCase();
  return extension ? imageExtensions.has(extension) : false;
}

async function collectFilesRecursively(
  directoryHandle: FileSystemDirectoryHandle,
  pathPrefix = "",
) {
  const files: Array<{ file: File; relativePath: string; handle: FileSystemFileHandle }> = [];

  for await (const [name, handle] of directoryHandle.entries()) {
    if (handle.kind === "directory") {
      const nested = await collectFilesRecursively(handle as FileSystemDirectoryHandle, `${pathPrefix}${name}/`);
      files.push(...nested);
      continue;
    }

    if (!isImageName(name)) {
      continue;
    }

    const fileHandle = handle as FileSystemFileHandle;
    const file = await fileHandle.getFile();
    files.push({
      file,
      relativePath: `${pathPrefix}${name}`,
      handle: fileHandle,
    });
  }

  return files;
}

export function supportsDirectoryPicker() {
  return typeof window !== "undefined" && typeof window.showDirectoryPicker === "function";
}

export async function openDirectoryImages() {
  if (!supportsDirectoryPicker()) {
    throw new Error("Directory picker is not supported in this browser.");
  }

  const directoryHandle = await window.showDirectoryPicker?.({ mode: "read" });

  if (!directoryHandle) {
    return [];
  }

  const files = await collectFilesRecursively(directoryHandle);

  return files.map((entry) => ({
    ...entry,
    handleId: createId("handle"),
  }));
}
