import Dexie, { type Table } from "dexie";
import type { ProjectSnapshot } from "../types/models";

export type ThumbnailEntry = {
  key: string;
  blob: Blob;
  updatedAt: string;
};

export type HandleEntry = {
  id: string;
  handle: FileSystemFileHandle;
  updatedAt: string;
};

class FilmReprocessDB extends Dexie {
  projects!: Table<ProjectSnapshot, string>;

  thumbnails!: Table<ThumbnailEntry, string>;

  handles!: Table<HandleEntry, string>;

  constructor() {
    super("film-reprocess-db");

    this.version(1).stores({
      projects: "id, updatedAt",
      thumbnails: "key, updatedAt",
      handles: "id, updatedAt",
    });
  }
}

export const db = new FilmReprocessDB();
