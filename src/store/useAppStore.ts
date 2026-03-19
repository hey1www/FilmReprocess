import { useMemo } from "react";
import { shallow } from "zustand/shallow";
import { createWithEqualityFn } from "zustand/traditional";
import { analyzeHalfFrame } from "../services/imagePipeline";
import { createDefaultPresets, createEmptyProject, defaultColorRecipe, defaultProcessingRecipe } from "../services/defaults";
import { generateThumbnailBlob } from "../services/imageCodec";
import { openDirectoryImages } from "../services/fileAccess";
import { mergeMetadata } from "../services/metadataMerge";
import {
  deleteFileHandle,
  deleteThumbnail,
  loadFileHandle,
  loadProjectSnapshot,
  loadThumbnail,
  persistFileHandle,
  persistProjectSnapshot,
  persistThumbnail,
} from "../services/persistence";
import type {
  AppSection,
  Asset,
  BatchMetadataPatch,
  ColorRecipe,
  ExportSettings,
  JobStatus,
  Locale,
  MetadataMergeStrategy,
  PreviewTarget,
  ProjectSnapshot,
  Rect,
} from "../types/models";
import { createId } from "../utils/id";

type ImportFileEntry = {
  file: File;
  relativePath?: string;
  handleId?: string;
  handle?: FileSystemFileHandle;
};

type CreatedAssetEntry = {
  asset: Asset;
  file: File;
  thumbnailUrl: string;
};

type AppStore = {
  ready: boolean;
  project: ProjectSnapshot;
  locale: Locale;
  section: AppSection;
  selectedAssetIds: string[];
  activeAssetId: string | null;
  searchQuery: string;
  previewTarget: PreviewTarget;
  jobs: JobStatus[];
  sessionFiles: Record<string, File>;
  thumbnailUrls: Record<string, string>;
  bootstrap: () => Promise<void>;
  setLocale: (locale: Locale) => void;
  setSection: (section: AppSection) => void;
  setSearchQuery: (query: string) => void;
  setPreviewTarget: (target: PreviewTarget) => void;
  setProjectName: (name: string) => void;
  importFiles: (files: ImportFileEntry[]) => Promise<void>;
  importFromDirectory: () => Promise<void>;
  selectAsset: (assetId: string, multi?: boolean) => void;
  selectAssetRange: (assetId: string) => void;
  clearSelection: () => void;
  selectAll: () => void;
  removeAssets: (assetIds: string[]) => void;
  updateMetadata: (
    assetIds: string[],
    patch: BatchMetadataPatch,
    strategy: MetadataMergeStrategy,
    selectedFields: Array<keyof BatchMetadataPatch>,
  ) => void;
  updateSplit: (
    assetId: string,
    updater: (asset: Asset) => Asset,
  ) => void;
  autoDetectSplit: (assetIds: string[]) => Promise<void>;
  copySplitToSelected: (sourceAssetId: string) => void;
  copySplitToAssets: (sourceAssetId: string, targetAssetIds: string[]) => void;
  updateColor: (assetIds: string[], patch: Partial<ColorRecipe>) => void;
  saveColorPreset: (name: string, assetId: string) => void;
  applyColorPreset: (presetId: string, assetIds: string[]) => void;
  updateExportSettings: (patch: Partial<ExportSettings>) => void;
  resolveAssetFile: (assetId: string) => Promise<File | null>;
  addJob: (job: JobStatus) => void;
  updateJob: (jobId: string, patch: Partial<JobStatus>) => void;
  removeJob: (jobId: string) => void;
};

function updateAndPersist(setter: (project: ProjectSnapshot) => ProjectSnapshot) {
  return (state: AppStore) => {
    const project = setter(state.project);
    void persistProjectSnapshot(project);
    return { project };
  };
}

async function hydrateThumbnails(project: ProjectSnapshot) {
  const nextUrls: Record<string, string> = {};

  for (const asset of project.assets) {
    const blob = await loadThumbnail(asset.thumbnailKey);
    if (blob) {
      nextUrls[asset.id] = URL.createObjectURL(blob);
    }
  }

  return nextUrls;
}

async function createAssetFromFile(entry: ImportFileEntry) {
  const bitmap = await createImageBitmap(entry.file);
  const assetId = createId("asset");
  const thumbnailKey = createId("thumb");
  const thumbnailBlob = await generateThumbnailBlob(entry.file);
  await persistThumbnail(thumbnailKey, thumbnailBlob);

  if (entry.handleId && entry.handle) {
    await persistFileHandle(entry.handleId, entry.handle);
  }

  const asset: Asset = {
    id: assetId,
    originalName: entry.file.name,
    width: bitmap.width,
    height: bitmap.height,
    thumbnailKey,
    source: {
      mode: entry.handleId ? "file-handle" : "session-file",
      fileName: entry.file.name,
      mimeType: entry.file.type,
      size: entry.file.size,
      handleId: entry.handleId,
      relativePath: entry.relativePath,
    },
    metadata: {},
    recipe: {
      split: {
        ...defaultProcessingRecipe.split,
        leftCrop: {
          x: 0,
          y: 0,
          width: bitmap.width,
          height: bitmap.height,
        },
        rightCrop: {
          x: Math.floor(bitmap.width / 2),
          y: 0,
          width: Math.ceil(bitmap.width / 2),
          height: bitmap.height,
        },
      },
      color: { ...defaultColorRecipe, curve: [...defaultColorRecipe.curve] },
    },
    flags: {
      autoSplitTried: false,
      splitAccepted: false,
    },
  };

  bitmap.close();

  return {
    asset,
    file: entry.file,
    thumbnailUrl: URL.createObjectURL(thumbnailBlob),
  };
}

function cloneDefaultColorRecipe() {
  return {
    ...defaultColorRecipe,
    curve: defaultColorRecipe.curve.map((point) => ({ ...point })),
  };
}

function isLegacyNeutralColorRecipe(recipe: ColorRecipe) {
  if (recipe.invertNegative || recipe.removeMask) {
    return false;
  }

  if (
    recipe.exposure !== 0 ||
    recipe.contrast !== 0 ||
    recipe.saturation !== 0 ||
    recipe.temperature !== 0 ||
    recipe.tint !== 0 ||
    recipe.blackPoint !== 0 ||
    recipe.whitePoint !== 1
  ) {
    return false;
  }

  if (recipe.curve.length !== defaultColorRecipe.curve.length) {
    return false;
  }

  return recipe.curve.every((point, index) => {
    const baseline = defaultColorRecipe.curve[index];
    return point.x === baseline.x && point.y === baseline.y;
  });
}

function normalizeColorRecipe(recipe?: Partial<ColorRecipe>) {
  const next = {
    ...cloneDefaultColorRecipe(),
    ...recipe,
    curve:
      recipe?.curve && recipe.curve.length > 0
        ? recipe.curve.map((point) => ({ ...point }))
        : defaultColorRecipe.curve.map((point) => ({ ...point })),
  };

  if (isLegacyNeutralColorRecipe(next)) {
    next.invertNegative = true;
    next.removeMask = true;
  }

  return next;
}

function normalizeProjectSnapshot(project: ProjectSnapshot) {
  let changed = false;

  const colorPresets =
    project.colorPresets && project.colorPresets.length > 0 ? project.colorPresets : createDefaultPresets();
  if (colorPresets !== project.colorPresets) {
    changed = true;
  }

  const assets = project.assets.map((asset) => {
    const normalizedColor = normalizeColorRecipe(asset.recipe.color);
    const curveChanged =
      normalizedColor.curve.length !== asset.recipe.color.curve.length ||
      normalizedColor.curve.some((point, index) => {
        const current = asset.recipe.color.curve[index];
        return !current || current.x !== point.x || current.y !== point.y;
      });
    const colorChanged =
      curveChanged ||
      normalizedColor.invertNegative !== asset.recipe.color.invertNegative ||
      normalizedColor.removeMask !== asset.recipe.color.removeMask ||
      normalizedColor.exposure !== asset.recipe.color.exposure ||
      normalizedColor.contrast !== asset.recipe.color.contrast ||
      normalizedColor.saturation !== asset.recipe.color.saturation ||
      normalizedColor.temperature !== asset.recipe.color.temperature ||
      normalizedColor.tint !== asset.recipe.color.tint ||
      normalizedColor.blackPoint !== asset.recipe.color.blackPoint ||
      normalizedColor.whitePoint !== asset.recipe.color.whitePoint;

    if (!colorChanged) {
      return asset;
    }

    changed = true;
    return {
      ...asset,
      recipe: {
        ...asset.recipe,
        color: normalizedColor,
      },
    };
  });

  return {
    changed,
    project: changed
      ? {
          ...project,
          assets,
          colorPresets,
        }
      : project,
  };
}

export const useAppStore = createWithEqualityFn<AppStore>((set, get) => ({
  ready: false,
  project: createEmptyProject(),
  locale: "zh-CN",
  section: "library",
  selectedAssetIds: [],
  activeAssetId: null,
  searchQuery: "",
  previewTarget: "original",
  jobs: [],
  sessionFiles: {},
  thumbnailUrls: {},
  async bootstrap() {
    const loadedProject = await loadProjectSnapshot();
    const { changed, project } = normalizeProjectSnapshot(loadedProject);
    if (changed) {
      void persistProjectSnapshot(project);
    }
    const thumbnailUrls = await hydrateThumbnails(project);

    set({
      ready: true,
      project,
      locale: project.locale,
      thumbnailUrls,
      activeAssetId: project.assets[0]?.id ?? null,
      selectedAssetIds: project.assets[0] ? [project.assets[0].id] : [],
    });
  },
  setLocale(locale) {
    set((state) => {
      const nextProject = {
        ...state.project,
        locale,
      };
      void persistProjectSnapshot(nextProject);
      return {
        locale,
        project: nextProject,
      };
    });
  },
  setSection(section) {
    set({ section });
  },
  setSearchQuery(searchQuery) {
    set({ searchQuery });
  },
  setPreviewTarget(previewTarget) {
    set({ previewTarget });
  },
  setProjectName(name) {
    set(updateAndPersist((project) => ({ ...project, name })));
  },
  async importFiles(files) {
    if (files.length === 0) {
      return;
    }

    const jobId = createId("job");
    get().addJob({
      id: jobId,
      label: "jobs.importing",
      progress: 0,
      stage: "running",
    });

    const created: CreatedAssetEntry[] = [];
    for (const [index, entry] of files.entries()) {
      const result = await createAssetFromFile(entry);
      created.push(result);
      get().updateJob(jobId, {
        progress: (index + 1) / files.length,
      });
    }

    set((state) => {
      const assets = [...state.project.assets, ...created.map((item) => item.asset)];
      const nextProject = {
        ...state.project,
        assets,
      };
      void persistProjectSnapshot(nextProject);

      return {
        project: nextProject,
        sessionFiles: {
          ...state.sessionFiles,
          ...Object.fromEntries(created.map((item) => [item.asset.id, item.file])),
        },
        thumbnailUrls: {
          ...state.thumbnailUrls,
          ...Object.fromEntries(created.map((item) => [item.asset.id, item.thumbnailUrl])),
        },
        activeAssetId: created.at(-1)?.asset.id ?? state.activeAssetId,
        selectedAssetIds: created.map((item) => item.asset.id),
      };
    });

    get().updateJob(jobId, {
      progress: 1,
      stage: "success",
    });
  },
  async importFromDirectory() {
    const entries = await openDirectoryImages();
    const withHandles = await Promise.all(
      entries.map(async (entry) => {
        return {
          file: entry.file,
          relativePath: entry.relativePath,
          handleId: entry.handleId,
          handle: entry.handle,
        };
      }),
    );

    await get().importFiles(withHandles);
  },
  selectAsset(assetId, multi = false) {
    set((state) => {
      if (!multi) {
        return {
          activeAssetId: assetId,
          selectedAssetIds: [assetId],
        };
      }

      const exists = state.selectedAssetIds.includes(assetId);
      const selectedAssetIds = exists
        ? state.selectedAssetIds.filter((currentId) => currentId !== assetId)
        : [...state.selectedAssetIds, assetId];

      return {
        activeAssetId: assetId,
        selectedAssetIds,
      };
    });
  },
  selectAssetRange(assetId) {
    set((state) => {
      if (!state.activeAssetId) {
        return {
          activeAssetId: assetId,
          selectedAssetIds: [assetId],
        };
      }

      const assets = state.project.assets;
      const start = assets.findIndex((asset) => asset.id === state.activeAssetId);
      const end = assets.findIndex((asset) => asset.id === assetId);

      if (start === -1 || end === -1) {
        return state;
      }

      const [from, to] = start < end ? [start, end] : [end, start];

      return {
        selectedAssetIds: assets.slice(from, to + 1).map((asset) => asset.id),
        activeAssetId: assetId,
      };
    });
  },
  clearSelection() {
    set({
      selectedAssetIds: [],
      activeAssetId: null,
    });
  },
  selectAll() {
    set((state) => ({
      selectedAssetIds: state.project.assets.map((asset) => asset.id),
      activeAssetId: state.project.assets[0]?.id ?? null,
    }));
  },
  removeAssets(assetIds) {
    const ids = new Set(assetIds);
    if (ids.size === 0) {
      return;
    }

    const state = get();
    const removedAssets = state.project.assets.filter((asset) => ids.has(asset.id));
    if (removedAssets.length === 0) {
      return;
    }

    const remainingAssets = state.project.assets.filter((asset) => !ids.has(asset.id));
    const selectedAssetIds = state.selectedAssetIds.filter((assetId) => !ids.has(assetId));
    const fallbackActiveId =
      selectedAssetIds[0] ??
      remainingAssets.find((asset) => asset.id === state.activeAssetId)?.id ??
      remainingAssets[0]?.id ??
      null;

    const nextProject = {
      ...state.project,
      assets: remainingAssets,
    };

    void persistProjectSnapshot(nextProject);

    for (const asset of removedAssets) {
      const thumbnailUrl = state.thumbnailUrls[asset.id];
      if (thumbnailUrl) {
        URL.revokeObjectURL(thumbnailUrl);
      }
      void deleteThumbnail(asset.thumbnailKey);
      if (asset.source.handleId) {
        void deleteFileHandle(asset.source.handleId);
      }
    }

    set({
      project: nextProject,
      sessionFiles: Object.fromEntries(
        Object.entries(state.sessionFiles).filter(([assetId]) => !ids.has(assetId)),
      ),
      thumbnailUrls: Object.fromEntries(
        Object.entries(state.thumbnailUrls).filter(([assetId]) => !ids.has(assetId)),
      ),
      selectedAssetIds: selectedAssetIds.length > 0 ? selectedAssetIds : fallbackActiveId ? [fallbackActiveId] : [],
      activeAssetId: fallbackActiveId,
    });
  },
  updateMetadata(assetIds, patch, strategy, selectedFields) {
    const ids = new Set(assetIds);
    set(
      updateAndPersist((project) => ({
        ...project,
        assets: project.assets.map((asset) =>
          ids.has(asset.id) ? mergeMetadata(asset, patch, strategy, selectedFields) : asset,
        ),
      })),
    );
  },
  updateSplit(assetId, updater) {
    set(
      updateAndPersist((project) => ({
        ...project,
        assets: project.assets.map((asset) => (asset.id === assetId ? updater(asset) : asset)),
      })),
    );
  },
  async autoDetectSplit(assetIds) {
    if (assetIds.length === 0) {
      return;
    }

    const jobId = createId("job");
    get().addJob({
      id: jobId,
      label: "jobs.detecting",
      progress: 0,
      stage: "running",
    });

    for (const [index, assetId] of assetIds.entries()) {
      const file = await get().resolveAssetFile(assetId);

      if (!file) {
        continue;
      }

      const result = await analyzeHalfFrame(file);
      get().updateSplit(assetId, (asset) => ({
        ...asset,
        flags: {
          autoSplitTried: true,
          splitAccepted: true,
        },
        recipe: {
          ...asset.recipe,
          split: {
            ...asset.recipe.split,
            mode: "half-frame",
            detectorVersion: "v2",
            confidence: result.confidence,
            leftCrop: result.leftCrop,
            rightCrop: result.rightCrop,
          },
        },
      }));

      get().updateJob(jobId, {
        progress: (index + 1) / assetIds.length,
      });
    }

    get().updateJob(jobId, {
      progress: 1,
      stage: "success",
    });
  },
  copySplitToSelected(sourceAssetId) {
    const targetIds = get().selectedAssetIds.filter((assetId) => assetId !== sourceAssetId);
    get().copySplitToAssets(sourceAssetId, targetIds);
  },
  copySplitToAssets(sourceAssetId, targetAssetIds) {
    const source = get().project.assets.find((asset) => asset.id === sourceAssetId);

    if (!source) {
      return;
    }

    const selectedIds = new Set(targetAssetIds.filter((assetId) => assetId !== sourceAssetId));

    if (selectedIds.size === 0) {
      return;
    }

    set(
      updateAndPersist((project) => ({
        ...project,
        assets: project.assets.map((asset) => {
          if (!selectedIds.has(asset.id)) {
            return asset;
          }

          const widthScale = asset.width / source.width;
          const heightScale = asset.height / source.height;
          const leftCrop = source.recipe.split.leftCrop
            ? {
                x: source.recipe.split.leftCrop.x * widthScale,
                y: source.recipe.split.leftCrop.y * heightScale,
                width: source.recipe.split.leftCrop.width * widthScale,
                height: source.recipe.split.leftCrop.height * heightScale,
              }
            : undefined;
          const rightCrop = source.recipe.split.rightCrop
            ? {
                x: source.recipe.split.rightCrop.x * widthScale,
                y: source.recipe.split.rightCrop.y * heightScale,
                width: source.recipe.split.rightCrop.width * widthScale,
                height: source.recipe.split.rightCrop.height * heightScale,
              }
            : undefined;

          return {
            ...asset,
            recipe: {
              ...asset.recipe,
              split: {
                ...source.recipe.split,
                leftCrop,
                rightCrop,
              },
            },
          };
        }),
      })),
    );
  },
  updateColor(assetIds, patch) {
    const ids = new Set(assetIds);
    set(
      updateAndPersist((project) => ({
        ...project,
        assets: project.assets.map((asset) => {
          if (!ids.has(asset.id)) {
            return asset;
          }

          return {
            ...asset,
            recipe: {
              ...asset.recipe,
              color: {
                ...asset.recipe.color,
                ...patch,
              },
            },
          };
        }),
      })),
    );
  },
  saveColorPreset(name, assetId) {
    const asset = get().project.assets.find((current) => current.id === assetId);
    if (!asset || !name.trim()) {
      return;
    }

    set(
      updateAndPersist((project) => ({
        ...project,
        colorPresets: [
          {
            id: createId("preset"),
            name: name.trim(),
            recipe: {
              ...asset.recipe.color,
              curve: asset.recipe.color.curve.map((point) => ({ ...point })),
            },
          },
          ...project.colorPresets,
        ],
      })),
    );
  },
  applyColorPreset(presetId, assetIds) {
    const preset = get().project.colorPresets.find((item) => item.id === presetId);
    if (!preset) {
      return;
    }

    get().updateColor(assetIds, {
      ...preset.recipe,
      curve: preset.recipe.curve.map((point) => ({ ...point })),
    });
  },
  updateExportSettings(patch) {
    set(
      updateAndPersist((project) => ({
        ...project,
        exportSettings: {
          ...project.exportSettings,
          ...patch,
        },
      })),
    );
  },
  async resolveAssetFile(assetId) {
    const sessionFile = get().sessionFiles[assetId];

    if (sessionFile) {
      return sessionFile;
    }

    const asset = get().project.assets.find((item) => item.id === assetId);

    if (!asset?.source.handleId) {
      return null;
    }

    const handle = await loadFileHandle(asset.source.handleId);
    const file = handle ? await handle.getFile() : null;

    if (file) {
      set((state) => ({
        sessionFiles: {
          ...state.sessionFiles,
          [assetId]: file,
        },
      }));
    }

    return file;
  },
  addJob(job) {
    set((state) => ({
      jobs: [job, ...state.jobs.filter((existing) => existing.id !== job.id)].slice(0, 12),
    }));
  },
  updateJob(jobId, patch) {
    set((state) => ({
      jobs: state.jobs.map((job) => (job.id === jobId ? { ...job, ...patch } : job)),
    }));
  },
  removeJob(jobId) {
    set((state) => ({
      jobs: state.jobs.filter((job) => job.id !== jobId),
    }));
  },
}), shallow);

export function useAssets() {
  const assets = useAppStore((state) => state.project.assets);
  const query = useAppStore((state) => state.searchQuery);

  return useMemo(() => {
    const normalized = query.trim().toLowerCase();

    if (!normalized) {
      return assets;
    }

    return assets.filter((asset) => {
      return [
        asset.originalName,
        asset.metadata.cameraModel,
        asset.metadata.scannerModel,
        asset.metadata.location?.label,
        asset.metadata.notes,
      ]
        .filter(Boolean)
        .some((value) => value?.toLowerCase().includes(normalized));
    });
  }, [assets, query]);
}

export function useActiveAsset() {
  const assets = useAppStore((state) => state.project.assets);
  const activeAssetId = useAppStore((state) => state.activeAssetId);

  return useMemo(() => {
    return assets.find((asset) => asset.id === activeAssetId) ?? null;
  }, [activeAssetId, assets]);
}

export function useSelectedAssets() {
  const assets = useAppStore((state) => state.project.assets);
  const selectedAssetIds = useAppStore((state) => state.selectedAssetIds);

  return useMemo(() => {
    const selected = new Set(selectedAssetIds);
    return assets.filter((asset) => selected.has(asset.id));
  }, [assets, selectedAssetIds]);
}
