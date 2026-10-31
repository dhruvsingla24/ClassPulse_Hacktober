"use client";
import { useCallback, useEffect, useRef, useState } from "react";

export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export async function api<T = unknown>(url: string, init?: { method?: string; body?: unknown }): Promise<T> {
  const res = await fetch(url, {
    method: init?.method ?? (init?.body ? "POST" : "GET"),
    headers: init?.body ? { "content-type": "application/json" } : undefined,
    body: init?.body ? JSON.stringify(init.body) : undefined,
    credentials: "same-origin",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, (data as { error?: string }).error ?? "Request failed.");
  return data as T;
}

/** Tiny data hook: loading, error, data, reload. Optional polling for live-ish updates. */
export function useApi<T>(url: string | null, pollMs?: number) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const alive = useRef(true);
  const load = useCallback(async (quiet = false) => {
    if (!url) return;
    if (!quiet) setLoading(true);
    try {
      const d = await api<T>(url);
      if (alive.current) { setData(d); setError(null); }
    } catch (e) {
      if (alive.current) setError((e as Error).message);
    } finally {
      if (alive.current) setLoading(false);
    }
  }, [url]);
  useEffect(() => {
    alive.current = true;
    load();
    if (!pollMs) return () => { alive.current = false; };
    const t = setInterval(() => document.visibilityState === "visible" && load(true), pollMs);
    return () => { alive.current = false; clearInterval(t); };
  }, [load, pollMs]);
  return { data, error, loading, reload: () => load(true), setData };
}

export const fmtDate = (s: string) => new Date(s).toLocaleDateString(undefined, { day: "numeric", month: "short" });
export const fmtDateTime = (s: string) => new Date(s).toLocaleString(undefined, { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
export function timeAgo(s: string) {
  const m = Math.round((Date.now() - new Date(s).getTime()) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}
export function dueIn(s: string) {
  const ms = new Date(s).getTime() - Date.now();
  const d = Math.round(ms / 864e5);
  if (ms < 0) return d === 0 ? "due today" : `${-d}d overdue`;
  if (d === 0) return `due in ${Math.max(1, Math.round(ms / 36e5))}h`;
  return `due in ${d}d`;
}
