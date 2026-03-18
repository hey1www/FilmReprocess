import { useEffect, useState } from "react";
import { renderProcessedBlob } from "../../services/imagePipeline";
import { getRenderSpec } from "../../services/renderSpec";
import type { Asset, HistogramBins, PreviewTarget } from "../../types/models";
import { useAppStore } from "../../store/useAppStore";

export function useRenderedPreview(asset: Asset | null, target: PreviewTarget) {
  const resolveAssetFile = useAppStore((state) => state.resolveAssetFile);
  const [url, setUrl] = useState<string | null>(null);
  const [histogram, setHistogram] = useState<HistogramBins | null>(null);
  const [loading, setLoading] = useState(false);

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
        const rendered = await renderProcessedBlob({
          file,
          color: asset.recipe.color,
          crop: spec.crop,
          rotation: spec.rotation,
          maxEdge: 1400,
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
  }, [asset, resolveAssetFile, target]);

  return {
    url,
    histogram,
    loading,
  };
}
