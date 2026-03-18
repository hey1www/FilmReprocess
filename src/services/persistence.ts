import { db } from "./db";
import { createEmptyProject } from "./defaults";
import type { ProjectSnapshot } from "../types/models";

export async function loadProjectSnapshot() {
  const project = await db.projects.get("project-default");
  return project ?? createEmptyProject();
}

export async function persistProjectSnapshot(project: ProjectSnapshot) {
  await db.projects.put({
    ...project,
    updatedAt: new Date().toISOString(),
  });
}

export async function persistThumbnail(key: string, blob: Blob) {
  await db.thumbnails.put({
    key,
    blob,
    updatedAt: new Date().toISOString(),
  });
}

export async function loadThumbnail(key: string) {
  const entry = await db.thumbnails.get(key);
  return entry?.blob;
}

export async function persistFileHandle(id: string, handle: FileSystemFileHandle) {
  await db.handles.put({
    id,
    handle,
    updatedAt: new Date().toISOString(),
  });
}

export async function loadFileHandle(id: string) {
  const entry = await db.handles.get(id);
  return entry?.handle;
}
