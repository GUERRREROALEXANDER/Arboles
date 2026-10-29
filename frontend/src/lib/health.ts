import type { HealthStatus } from "../api/types";

interface HealthMeta {
  label: string;
  color: string;
  score: number;
  /** Tailwind classes for badges: text + tinted background + border. */
  badge: string;
}

/** Single source for health colors. Hex values match the @theme tokens in index.css. */
export const HEALTH: Record<HealthStatus, HealthMeta> = {
  excellent: {
    label: "Excellent",
    color: "#34d399",
    score: 100,
    badge: "text-health-excellent bg-health-excellent/10 border-health-excellent/30",
  },
  good: {
    label: "Good",
    color: "#bef264",
    score: 80,
    badge: "text-health-good bg-health-good/10 border-health-good/30",
  },
  fair: {
    label: "Fair",
    color: "#fbbf24",
    score: 60,
    badge: "text-health-fair bg-health-fair/10 border-health-fair/30",
  },
  poor: {
    label: "Poor",
    color: "#fb923c",
    score: 35,
    badge: "text-health-poor bg-health-poor/10 border-health-poor/30",
  },
  critical: {
    label: "Critical",
    color: "#fb7185",
    score: 15,
    badge: "text-health-critical bg-health-critical/10 border-health-critical/30",
  },
  dead: {
    label: "Dead",
    color: "#94a3b8",
    score: 0,
    badge: "text-health-dead bg-health-dead/10 border-health-dead/30",
  },
};

export const HEALTH_ORDER: HealthStatus[] = ["excellent", "good", "fair", "poor", "critical", "dead"];

/** Maps an aggregated 0-100 score to the nearest health band. */
export function healthFromScore(score: number): HealthStatus {
  if (score >= 90) return "excellent";
  if (score >= 70) return "good";
  if (score >= 47.5) return "fair";
  if (score >= 25) return "poor";
  if (score > 7.5) return "critical";
  return "dead";
}

export const RISK_THRESHOLD = 50;

/** Domain rule: at risk when risk >= 50; dead specimens are always at risk. */
export function isAtRisk(specimen: { risk: number; health: HealthStatus }): boolean {
  return specimen.risk >= RISK_THRESHOLD || specimen.health === "dead";
}

export function riskColor(risk: number): string {
  if (risk >= 70) return HEALTH.critical.color;
  if (risk >= RISK_THRESHOLD) return HEALTH.poor.color;
  if (risk >= 30) return HEALTH.fair.color;
  return HEALTH.excellent.color;
}
