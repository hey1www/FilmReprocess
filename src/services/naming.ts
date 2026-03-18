import type { Asset, PreviewTarget } from "../types/models";

function sanitizeSegment(value: string) {
  return value.replace(/[<>:"/\\|?*\u0000-\u001F]/g, "-").trim();
}

export function renderNameTemplate(asset: Asset, template: string, side: PreviewTarget | "single", index: number) {
  const shotDate = asset.metadata.shotAt?.slice(0, 10) ?? "undated";
  const camera = asset.metadata.cameraModel ?? "camera";

  const rendered = template
    .replaceAll("{name}", asset.originalName.replace(/\.[^.]+$/, ""))
    .replaceAll("{side}", side === "original" ? "single" : side)
    .replaceAll("{index}", String(index))
    .replaceAll("{date}", shotDate)
    .replaceAll("{camera}", camera);

  return sanitizeSegment(rendered);
}

export function avoidDuplicateName(candidate: string, usedNames: Set<string>) {
  if (!usedNames.has(candidate)) {
    usedNames.add(candidate);
    return candidate;
  }

  let suffix = 2;
  let next = `${candidate}-${suffix}`;

  while (usedNames.has(next)) {
    suffix += 1;
    next = `${candidate}-${suffix}`;
  }

  usedNames.add(next);
  return next;
}
