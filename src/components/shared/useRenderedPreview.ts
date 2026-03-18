import { useEffect, useState } from "react";
import { renderProcessedBlob } from "../../services/imagePipeline";
import { getColorRecipeForContent, getRenderSpec } from "../../services/renderSpec";
import type { Asset, HistogramBins, PreviewTarget } from "../../types/models";
import { useAppStore } from "../../store/useAppStore";

export function useRenderedPreview(
  asset: Asset | null,
  target: PreviewTarget,
  options?: {
    applyColor?: boolean;
    maxEdge?: number;
  },
) {
  const resolveAssetFile = useAppStore((state) => state.resolveAssetFile);
  const [url, setUrl] = useState<string | null>(null);
  const [histogram, setHistogram] = useState<HistogramBins | null>(null);
  const [loading, setLoading] = useState(false);
  const applyColor = options?.applyColor ?? true;
  const maxEdge = options?.maxEdge ?? 1400;

  useEffect(() => {
    if (!asset) {
      setUrl(null);
      setHistogram(null);
      return;
    }

    let revoked: string | null = null;
    let cancelled = false;
    setLoading(true);

    void resolveAssetFile(asset.id)
      .then(async (file) => {
        if (!file || cancelled) {
          return;
        }

        const spec = getRenderSpec(asset, target);
        const color = getColorRecipeForContent(asset, applyColor && target !== "original");
        const rendered = await renderProcessedBlob({
          file,
          color,
          crop: spec.crop,
          rotation: spec.rotation,
          maxEdge,
          output: {
            format: "image/jpeg",
            quality: 0.9,
          },
        });

        if (cancelled) {
          return;
        }

        revoked = URL.createObjectURL(rendered.blob);
        setUrl(revoked);
        setHistogram(rendered.histogram);
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
      if (revoked) {
        URL.revokeObjectURL(revoked);
      }
    };
  }, [applyColor, asset, maxEdge, resolveAssetFile, target]);

  return {
    url,
    histogram,
    loading,
  };
}
