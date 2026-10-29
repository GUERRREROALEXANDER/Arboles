import { riskColor } from "../../lib/health";

interface RiskMeterProps {
  risk: number;
}

/** Compact risk readout: number plus a bar, so color is not the only signal. */
export function RiskMeter({ risk }: RiskMeterProps) {
  const color = riskColor(risk);
  return (
    <span className="flex w-20 shrink-0 flex-col items-end gap-1" title={`Risk ${risk} of 100`}>
      <span className="font-mono text-xs tabular-nums" style={{ color }}>
        risk {risk}
      </span>
      <span className="h-1 w-full overflow-hidden rounded-full bg-white/10" aria-hidden>
        <span className="block h-full rounded-full" style={{ width: `${risk}%`, backgroundColor: color }} />
      </span>
    </span>
  );
}
