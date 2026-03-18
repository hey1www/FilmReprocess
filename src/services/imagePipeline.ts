import { createId } from "../utils/id";
import { createBitmapFromFile } from "./imageCodec";
import type { ColorRecipe, HistogramBins, Rect, SplitDetectionResult } from "../types/models";

const imageWorker = new Worker(new URL("../workers/image.worker.ts", import.meta.url), {
  type: "module",
});

type WorkerResponse =
  | {
      id: string;
      type: "analyze-split";
      result: SplitDetectionResult;
    }
  | {
      id: string;
      type: "render";
      blob: Blob;
      histogram: HistogramBins;
    };

const pending = new Map<string, (response: WorkerResponse) => void>();

imageWorker.onmessage = (event: MessageEvent<WorkerResponse>) => {
  const resolver = pending.get(event.data.id);

  if (!resolver) {
    return;
  }

  pending.delete(event.data.id);
  resolver(event.data);
};

function runWorker<T extends WorkerResponse["type"]>(
  payload: Record<string, unknown>,
  transfer: Transferable[],
) {
  const id = createId("worker");

  return new Promise<Extract<WorkerResponse, { type: T }>>((resolve) => {
    pending.set(id, (response) => {
      resolve(response as Extract<WorkerResponse, { type: T }>);
    });
    imageWorker.postMessage(
      {
        ...payload,
        id,
      },
      transfer,
    );
  });
}

export async function analyzeHalfFrame(file: File) {
  const bitmap = await createBitmapFromFile(file);
  const response = await runWorker<"analyze-split">(
    {
      type: "analyze-split",
      bitmap,
    },
    [bitmap],
  );

  return response.result;
}

export async function renderProcessedBlob(options: {
  file: File;
  color: ColorRecipe;
  crop?: Rect;
  rotation?: number;
  maxEdge?: number;
  output?: {
    format: "image/jpeg" | "image/png";
    quality?: number;
  };
}) {
  const bitmap = await createBitmapFromFile(options.file);
  const response = await runWorker<"render">(
    {
      type: "render",
      bitmap,
      color: options.color,
      crop: options.crop,
      rotation: options.rotation,
      maxEdge: options.maxEdge,
      output: options.output,
    },
    [bitmap],
  );

  return response;
}
