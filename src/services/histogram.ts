import type { HistogramBins } from "../types/models";

function createBins(length: number) {
  return new Array<number>(length).fill(0);
}

export function createHistogram(imageData: ImageData, binCount = 64): HistogramBins {
  const red = createBins(binCount);
  const green = createBins(binCount);
  const blue = createBins(binCount);
  const luminance = createBins(binCount);
  const { data } = imageData;

  for (let index = 0; index < data.length; index += 4) {
    const redValue = Math.floor((data[index] / 256) * binCount);
    const greenValue = Math.floor((data[index + 1] / 256) * binCount);
    const blueValue = Math.floor((data[index + 2] / 256) * binCount);
    const light = Math.floor(
      (((data[index] + data[index + 1] + data[index + 2]) / 3) / 256) * binCount,
    );

    red[Math.min(binCount - 1, redValue)] += 1;
    green[Math.min(binCount - 1, greenValue)] += 1;
    blue[Math.min(binCount - 1, blueValue)] += 1;
    luminance[Math.min(binCount - 1, light)] += 1;
  }

  return { red, green, blue, luminance };
}
