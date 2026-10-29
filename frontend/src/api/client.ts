import type { ApiErrorBody, ApiErrorCode } from "./types";

const BASE = "/api";

export class ApiError extends Error {
  readonly status: number;
  readonly code: ApiErrorCode | "network" | "unknown";

  constructor(status: number, code: ApiError["code"], message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

type QueryValue = string | number | undefined;

interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  query?: Record<string, QueryValue>;
}

function buildUrl(path: string, query?: Record<string, QueryValue>): string {
  const params = new URLSearchParams();
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== "") params.set(key, String(value));
    }
  }
  const qs = params.toString();
  return `${BASE}${path}${qs ? `?${qs}` : ""}`;
}

function isErrorBody(value: unknown): value is ApiErrorBody {
  if (typeof value !== "object" || value === null || !("error" in value)) return false;
  const error = (value as { error: unknown }).error;
  return typeof error === "object" && error !== null && "message" in error;
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, query } = options;
  let response: Response;
  try {
    response = await fetch(buildUrl(path, query), {
      method,
      headers: body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, "network", "Cannot reach the Canopy server.");
  }

  if (response.status === 204) return undefined as T;

  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    if (isErrorBody(payload)) {
      throw new ApiError(response.status, payload.error.code, payload.error.message);
    }
    throw new ApiError(response.status, "unknown", `Request failed with status ${response.status}.`);
  }
  return payload as T;
}
