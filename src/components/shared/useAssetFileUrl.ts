import { useEffect, useState } from "react";
import { useAppStore } from "../../store/useAppStore";

export function useAssetFileUrl(assetId: string | null) {
  const resolveAssetFile = useAppStore((state) => state.resolveAssetFile);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!assetId) {
      setFileUrl(null);
      return;
    }

    let revokedUrl: string | null = null;
    let cancelled = false;

    setLoading(true);

    void resolveAssetFile(assetId)
      .then((file) => {
        if (cancelled || !file) {
          return;
        }

        revokedUrl = URL.createObjectURL(file);
        setFileUrl(revokedUrl);
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
      if (revokedUrl) {
        URL.revokeObjectURL(revokedUrl);
      }
    };
  }, [assetId, resolveAssetFile]);

  return {
    fileUrl,
    loading,
  };
}
