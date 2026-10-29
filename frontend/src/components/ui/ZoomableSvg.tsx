import { useCallback, useEffect, useRef, type ReactNode } from "react";
import { select } from "d3-selection";
import { zoom, zoomIdentity, type D3ZoomEvent, type ZoomBehavior } from "d3-zoom";
import { Maximize2, ZoomIn, ZoomOut } from "lucide-react";
import { cn } from "../../lib/cn";
import { useElementSize } from "../../lib/hooks";
import { IconButton } from "./IconButton";

export interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface ZoomableSvgProps {
  /** Content extent in layout coordinates; used to fit and center on load and reset. */
  bounds: Bounds;
  label: string;
  className?: string;
  padding?: number;
  maxFitScale?: number;
  children: ReactNode;
}

type Zoom = ZoomBehavior<SVGSVGElement, unknown>;

/** SVG canvas with d3-zoom pan and zoom on a wrapper <g>. Wheel zoom needs Ctrl so the page still scrolls. */
export function ZoomableSvg({
  bounds,
  label,
  className,
  padding = 32,
  maxFitScale = 1.1,
  children,
}: ZoomableSvgProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const groupRef = useRef<SVGGElement>(null);
  const zoomRef = useRef<Zoom | null>(null);
  const { width, height } = useElementSize(svgRef);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const behavior: Zoom = zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.08, 4])
      .filter((event: MouseEvent | WheelEvent) => {
        if (event.type === "wheel") return event.ctrlKey || event.metaKey;
        return !event.button;
      })
      .on("zoom", (event: D3ZoomEvent<SVGSVGElement, unknown>) => {
        groupRef.current?.setAttribute("transform", event.transform.toString());
      });
    const selection = select(svg);
    selection.call(behavior);
    zoomRef.current = behavior;
    return () => {
      selection.on(".zoom", null);
      zoomRef.current = null;
    };
  }, []);

  const { x, y, width: bw, height: bh } = bounds;

  const fit = useCallback(() => {
    const svg = svgRef.current;
    const behavior = zoomRef.current;
    if (!svg || !behavior || width === 0 || height === 0) return;
    const k = Math.min(
      maxFitScale,
      (width - padding * 2) / Math.max(bw, 1),
      (height - padding * 2) / Math.max(bh, 1),
    );
    const tx = (width - bw * k) / 2 - x * k;
    const ty = (height - bh * k) / 2 - y * k;
    select(svg).call(behavior.transform, zoomIdentity.translate(tx, ty).scale(k));
  }, [width, height, x, y, bw, bh, padding, maxFitScale]);

  useEffect(() => {
    fit();
  }, [fit]);

  const scaleBy = (factor: number) => {
    const svg = svgRef.current;
    if (svg && zoomRef.current) select(svg).call(zoomRef.current.scaleBy, factor);
  };

  return (
    <div className={cn("relative overflow-hidden rounded-xl", className)}>
      <svg
        ref={svgRef}
        role="img"
        aria-label={label}
        className="block h-full w-full cursor-grab touch-none active:cursor-grabbing"
      >
        <g ref={groupRef}>{children}</g>
      </svg>
      <div className="absolute right-2 top-2 flex gap-1 rounded-xl border border-white/10 bg-forest-950/70 p-1 backdrop-blur">
        <IconButton label="Zoom in" className="size-7" onClick={() => scaleBy(1.3)}>
          <ZoomIn className="size-3.5" aria-hidden />
        </IconButton>
        <IconButton label="Zoom out" className="size-7" onClick={() => scaleBy(1 / 1.3)}>
          <ZoomOut className="size-3.5" aria-hidden />
        </IconButton>
        <IconButton label="Reset view" className="size-7" onClick={fit}>
          <Maximize2 className="size-3.5" aria-hidden />
        </IconButton>
      </div>
      <p className="pointer-events-none absolute bottom-2 left-3 text-[10px] text-white/45">
        Drag to pan. Ctrl + scroll to zoom.
      </p>
    </div>
  );
}
