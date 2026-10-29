import { motion } from "framer-motion";
import { arc } from "d3-shape";
import { RISK_THRESHOLD, riskColor } from "../../lib/health";
import { EASE_OUT } from "../../lib/motion";

interface RiskGaugeProps {
  risk: number;
}

const START = -Math.PI / 2;
const SWEEP = Math.PI;
const track = arc()({ innerRadius: 52, outerRadius: 62, startAngle: START, endAngle: START + SWEEP }) ?? "";

/** Half-circle gauge with the at-risk threshold marked at 50. */
export function RiskGauge({ risk }: RiskGaugeProps) {
  const value = Math.max(0, Math.min(100, risk));
  const color = riskColor(value);
  const end = START + (value / 100) * SWEEP;
  const fill =
    arc().cornerRadius(5)({ innerRadius: 52, outerRadius: 62, startAngle: START, endAngle: end }) ?? "";
  const thresholdAngle = START + (RISK_THRESHOLD / 100) * SWEEP;

  return (
    <figure className="flex flex-col items-center">
      <svg viewBox="-70 -70 140 76" className="w-40" role="img" aria-label={`Risk score ${value} of 100`}>
        <path d={track} fill="rgba(255,255,255,0.08)" />
        <motion.path
          d={fill}
          fill={color}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, ease: EASE_OUT }}
          style={{ filter: `drop-shadow(0 0 6px ${color}66)` }}
        />
        <line
          x1={Math.sin(thresholdAngle) * 48}
          y1={-Math.cos(thresholdAngle) * 48}
          x2={Math.sin(thresholdAngle) * 66}
          y2={-Math.cos(thresholdAngle) * 66}
          stroke="rgba(255,255,255,0.55)"
          strokeWidth={1.5}
        />
        <text y={-8} textAnchor="middle" className="fill-white font-mono text-[22px] font-semibold">
          {value}
        </text>
      </svg>
      <figcaption className="-mt-1 text-[11px] uppercase tracking-wider text-white/55">
        {value >= RISK_THRESHOLD ? "At risk" : "Below threshold"}
      </figcaption>
    </figure>
  );
}
