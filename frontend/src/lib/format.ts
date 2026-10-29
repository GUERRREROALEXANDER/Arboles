import type { WorkOrderKind, WorkOrderStatus } from "../api/types";

const integer = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
const oneDecimal = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});
const twoDecimals = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export const formatInt = (value: number) => integer.format(value);
export const formatOne = (value: number) => oneDecimal.format(value);
export const formatTwo = (value: number) => twoDecimals.format(value);

export function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

export function formatDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function todayIso(): string {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

export const WORK_ORDER_KIND_LABEL: Record<WorkOrderKind, string> = {
  inspection: "Inspection",
  pruning: "Pruning",
  pest_treatment: "Pest treatment",
  cabling: "Cabling",
  removal: "Removal",
  planting: "Planting",
};

export const WORK_ORDER_KINDS = Object.keys(WORK_ORDER_KIND_LABEL) as WorkOrderKind[];

export const WORK_ORDER_STATUS_LABEL: Record<WorkOrderStatus, string> = {
  queued: "Queued",
  in_progress: "In progress",
  done: "Done",
};
