import { useEffect, useRef, useState } from "react";
import type { Rect } from "../../types/models";
import { clamp } from "../../utils/math";

type DragState =
  | {
      type: "move";
      startX: number;
      startY: number;
      originalRect: Rect;
    }
  | {
      type: "resize";
      handle: "nw" | "ne" | "sw" | "se";
      startX: number;
      startY: number;
      originalRect: Rect;
    }
  | null;

function RectOverlay({
  rect,
  naturalWidth,
  naturalHeight,
  color,
  selected,
  onSelect,
  onChange,
}: {
  rect: Rect;
  naturalWidth: number;
  naturalHeight: number;
  color: string;
  selected: boolean;
  onSelect: () => void;
  onChange: (rect: Rect) => void;
}) {
  const [dragState, setDragState] = useState<DragState>(null);
  const overlayRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!dragState) {
      return;
    }

    const overlay = overlayRef.current;
    if (!overlay) {
      return;
    }

    const bounds = overlay.parentElement?.getBoundingClientRect();
    if (!bounds) {
      return;
    }

    const scaleX = naturalWidth / bounds.width;
    const scaleY = naturalHeight / bounds.height;

    function onPointerMove(event: PointerEvent) {
      const currentDrag = dragState;
      if (!currentDrag) {
        return;
      }

      const deltaX = (event.clientX - currentDrag.startX) * scaleX;
      const deltaY = (event.clientY - currentDrag.startY) * scaleY;

      if (currentDrag.type === "move") {
        onChange({
          ...currentDrag.originalRect,
          x: clamp(currentDrag.originalRect.x + deltaX, 0, naturalWidth - currentDrag.originalRect.width),
          y: clamp(currentDrag.originalRect.y + deltaY, 0, naturalHeight - currentDrag.originalRect.height),
        });
        return;
      }

      const original = currentDrag.originalRect;
      const next = { ...original };

      if (currentDrag.handle.includes("n")) {
        next.y = clamp(original.y + deltaY, 0, original.y + original.height - 20);
        next.height = original.height + (original.y - next.y);
      }

      if (currentDrag.handle.includes("s")) {
        next.height = clamp(original.height + deltaY, 20, naturalHeight - original.y);
      }

      if (currentDrag.handle.includes("w")) {
        next.x = clamp(original.x + deltaX, 0, original.x + original.width - 20);
        next.width = original.width + (original.x - next.x);
      }

      if (currentDrag.handle.includes("e")) {
        next.width = clamp(original.width + deltaX, 20, naturalWidth - original.x);
      }

      onChange(next);
    }

    function onPointerUp() {
      setDragState(null);
    }

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);

    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };
  }, [dragState, naturalHeight, naturalWidth, onChange]);

  const style = {
    left: `${(rect.x / naturalWidth) * 100}%`,
    top: `${(rect.y / naturalHeight) * 100}%`,
    width: `${(rect.width / naturalWidth) * 100}%`,
    height: `${(rect.height / naturalHeight) * 100}%`,
    borderColor: color,
  };

  return (
    <div
      ref={overlayRef}
      className={`crop-rect${selected ? " crop-rect--selected" : ""}`}
      style={style}
      onPointerDown={(event) => {
        event.stopPropagation();
        onSelect();
        setDragState({
          type: "move",
          startX: event.clientX,
          startY: event.clientY,
          originalRect: rect,
        });
      }}
    >
      {selected
        ? (["nw", "ne", "sw", "se"] as const).map((handle) => (
            <button
              key={handle}
              type="button"
              className={`crop-rect__handle crop-rect__handle--${handle}`}
              onPointerDown={(event) => {
                event.stopPropagation();
                onSelect();
                setDragState({
                  type: "resize",
                  handle,
                  startX: event.clientX,
                  startY: event.clientY,
                  originalRect: rect,
                });
              }}
            />
          ))
        : null}
    </div>
  );
}

export function CropEditor({
  imageUrl,
  naturalWidth,
  naturalHeight,
  leftRect,
  rightRect,
  activeSide,
  onActiveSideChange,
  onRectChange,
}: {
  imageUrl: string;
  naturalWidth: number;
  naturalHeight: number;
  leftRect: Rect;
  rightRect: Rect;
  activeSide: "left" | "right";
  onActiveSideChange: (side: "left" | "right") => void;
  onRectChange: (side: "left" | "right", rect: Rect) => void;
}) {
  return (
    <div className="crop-editor">
      <div className="crop-editor__canvas">
        <img src={imageUrl} alt="Crop source" />
        <RectOverlay
          rect={leftRect}
          naturalWidth={naturalWidth}
          naturalHeight={naturalHeight}
          color="#f97316"
          selected={activeSide === "left"}
          onSelect={() => onActiveSideChange("left")}
          onChange={(rect) => onRectChange("left", rect)}
        />
        <RectOverlay
          rect={rightRect}
          naturalWidth={naturalWidth}
          naturalHeight={naturalHeight}
          color="#38bdf8"
          selected={activeSide === "right"}
          onSelect={() => onActiveSideChange("right")}
          onChange={(rect) => onRectChange("right", rect)}
        />
      </div>
    </div>
  );
}
