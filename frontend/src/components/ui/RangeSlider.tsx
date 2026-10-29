import { useId } from "react";

interface RangeSliderProps {
  min: number;
  max: number;
  step?: number;
  value: [number, number];
  onChange: (value: [number, number]) => void;
  label: string;
  format: (value: number) => string;
}

/** Two thumbs on one track. Each thumb is a native range input, so keyboard support is built in. */
export function RangeSlider({ min, max, step = 1, value, onChange, label, format }: RangeSliderProps) {
  const id = useId();
  const [low, high] = value;
  const span = Math.max(max - min, 1);
  const left = ((low - min) / span) * 100;
  const right = ((high - min) / span) * 100;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between text-xs">
        <span id={id} className="font-semibold text-white/70">
          {label}
        </span>
        <span className="font-mono tabular-nums text-white">
          {format(low)} - {format(high)}
        </span>
      </div>
      <div className="relative h-5">
        <div className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-white/10" />
        <div
          className="absolute top-1/2 h-1 -translate-y-1/2 rounded-full bg-gradient-to-r from-emerald-400 to-lime-300"
          style={{ left: `${left}%`, width: `${right - left}%` }}
        />
        <input
          type="range"
          aria-labelledby={id}
          aria-valuetext={`Minimum ${format(low)}`}
          className="range-input range-input-dual"
          min={min}
          max={max}
          step={step}
          value={low}
          onChange={(event) => onChange([Math.min(Number(event.target.value), high), high])}
        />
        <input
          type="range"
          aria-labelledby={id}
          aria-valuetext={`Maximum ${format(high)}`}
          className="range-input range-input-dual"
          min={min}
          max={max}
          step={step}
          value={high}
          onChange={(event) => onChange([low, Math.max(Number(event.target.value), low)])}
        />
      </div>
      <div className="flex justify-between font-mono text-[10px] tabular-nums text-white/45">
        <span>{format(min)}</span>
        <span>{format(max)}</span>
      </div>
    </div>
  );
}
