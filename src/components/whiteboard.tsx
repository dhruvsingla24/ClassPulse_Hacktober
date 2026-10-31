"use client";
import {
  ArrowUpRight, Download, Eraser, Highlighter, Minus, MousePointer2, Pause, PenLine, Play, Redo2, Sigma, Square, Trash2, Type, Undo2, ZoomIn, ZoomOut,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Point, Stroke } from "@/lib/types";

export const W = 1000;
export const H = 620;
type Tool = Stroke["tool"] | "eraser" | "pan";

const COLORS = ["#1f2a44", "#d64545", "#2f7de1", "#2e9e6b", "#e08a2a", "#8a4fd6"];
const SYMBOLS = ["²", "³", "√", "π", "θ", "∑", "∫", "≤", "≥", "≠", "→", "×", "÷", "±", "∞", "Δ"];

function drawStroke(ctx: CanvasRenderingContext2D, s: Stroke, upto = s.points.length) {
  const pts = s.points.slice(0, upto);
  if (!pts.length) return;
  ctx.save();
  ctx.strokeStyle = s.color;
  ctx.fillStyle = s.color;
  ctx.lineWidth = s.size;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  if (s.tool === "highlighter") { ctx.globalAlpha = 0.32; ctx.lineCap = "square"; }
  if (s.tool === "text") {
    ctx.font = `600 ${s.size * 6 + 10}px Inter, system-ui, sans-serif`;
    ctx.fillText(s.text ?? "", pts[0][0], pts[0][1]);
  } else if (s.tool === "rect" && pts.length > 1) {
    const [a, b] = [pts[0], pts[pts.length - 1]];
    ctx.strokeRect(a[0], a[1], b[0] - a[0], b[1] - a[1]);
  } else if ((s.tool === "line" || s.tool === "arrow") && pts.length > 1) {
    const [a, b] = [pts[0], pts[pts.length - 1]];
    ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
    if (s.tool === "arrow") {
      const ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
      const len = 12 + s.size * 2;
      ctx.beginPath();
      ctx.moveTo(b[0], b[1]);
      ctx.lineTo(b[0] - len * Math.cos(ang - 0.45), b[1] - len * Math.sin(ang - 0.45));
      ctx.moveTo(b[0], b[1]);
      ctx.lineTo(b[0] - len * Math.cos(ang + 0.45), b[1] - len * Math.sin(ang + 0.45));
      ctx.stroke();
    }
  } else {
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    if (pts.length === 1) ctx.lineTo(pts[0][0] + 0.1, pts[0][1]);
    for (let i = 1; i < pts.length - 1; i++) {
      const mx = (pts[i][0] + pts[i + 1][0]) / 2;
      const my = (pts[i][1] + pts[i + 1][1]) / 2;
      ctx.quadraticCurveTo(pts[i][0], pts[i][1], mx, my);
    }
    if (pts.length > 1) ctx.lineTo(pts[pts.length - 1][0], pts[pts.length - 1][1]);
    ctx.stroke();
  }
  ctx.restore();
}

function hit(s: Stroke, p: Point, r = 14) {
  if (s.tool === "text") return Math.abs(s.points[0][0] - p[0]) < 120 && Math.abs(s.points[0][1] - p[1]) < 24;
  return s.points.some((q) => Math.hypot(q[0] - p[0], q[1] - p[1]) < r + s.size);
}

export interface WhiteboardProps {
  value: Stroke[];
  onChange?: (s: Stroke[]) => void;
  background?: Stroke[];
  backgroundLabel?: string;
  readOnly?: boolean;
  label: string;
  inkColor?: string;
}

export function Whiteboard({ value, onChange, background = [], backgroundLabel, readOnly, label, inkColor }: WhiteboardProps) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const [tool, setTool] = useState<Tool>("pen");
  const [color, setColor] = useState(inkColor ?? COLORS[0]);
  const [size, setSize] = useState(3);
  const [redo, setRedo] = useState<Stroke[][]>([]);
  const [undo, setUndo] = useState<Stroke[][]>([]);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState<[number, number]>([0, 0]);
  const [showSymbols, setShowSymbols] = useState(false);
  const [replay, setReplay] = useState<{ stroke: number; point: number } | null>(null);
  const drawing = useRef<Stroke | null>(null);
  const panStart = useRef<{ x: number; y: number; pan: [number, number] } | null>(null);
  const [, force] = useState(0);

  const paint = useCallback(() => {
    const c = canvas.current;
    if (!c) return;
    const ctx = c.getContext("2d")!;
    const dpr = window.devicePixelRatio || 1;
    const cssW = c.clientWidth;
    const scale = (cssW / W) * dpr;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.setTransform(scale * zoom, 0, 0, scale * zoom, pan[0] * scale, pan[1] * scale);
    // ruled-paper grid
    ctx.save();
    ctx.strokeStyle = "rgba(90,110,150,0.10)";
    ctx.lineWidth = 1;
    for (let x = 0; x <= W; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    for (let y = 0; y <= H; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
    ctx.restore();
    const all = [...background, ...value];
    if (replay) {
      all.forEach((s, i) => { if (i < replay.stroke) drawStroke(ctx, s); else if (i === replay.stroke) drawStroke(ctx, s, replay.point); });
    } else {
      background.forEach((s) => drawStroke(ctx, s));
      value.forEach((s) => drawStroke(ctx, s));
      if (drawing.current) drawStroke(ctx, drawing.current);
    }
  }, [background, value, zoom, pan, replay]);

  useEffect(() => {
    const c = canvas.current;
    if (!c) return;
    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      c.width = c.clientWidth * dpr;
      c.height = c.clientWidth * (H / W) * dpr;
      c.style.height = `${c.clientWidth * (H / W)}px`;
      paint();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(c);
    return () => ro.disconnect();
  }, [paint]);
  useEffect(() => { paint(); }, [paint]);

  // stroke-by-stroke replay
  useEffect(() => {
    if (!replay) return;
    const all = [...background, ...value];
    const s = all[replay.stroke];
    if (!s) { setReplay(null); return; }
    const t = setTimeout(() => {
      if (replay.point < s.points.length) setReplay({ stroke: replay.stroke, point: replay.point + Math.max(1, Math.ceil(s.points.length / 24)) });
      else setReplay({ stroke: replay.stroke + 1, point: 1 });
    }, 16);
    return () => clearTimeout(t);
  }, [replay, background, value]);

  const toBoard = (e: React.PointerEvent): Point => {
    const r = canvas.current!.getBoundingClientRect();
    const s = r.width / W;
    return [Math.round(((e.clientX - r.left) / s - pan[0]) / zoom), Math.round(((e.clientY - r.top) / s - pan[1]) / zoom)];
  };

  const commit = (next: Stroke[]) => { setUndo((u) => [...u.slice(-60), value]); setRedo([]); onChange?.(next); };

  const down = (e: React.PointerEvent) => {
    if (readOnly || replay) return;
    try { (e.target as Element).setPointerCapture(e.pointerId); } catch { /* pointer may already be released */ }
    if (tool === "pan" || e.button === 1) { panStart.current = { x: e.clientX, y: e.clientY, pan }; return; }
    const p = toBoard(e);
    if (tool === "eraser") { const next = value.filter((s) => !hit(s, p)); if (next.length !== value.length) commit(next); drawing.current = { tool: "pen", color: "", size: 0, points: [] }; return; }
    if (tool === "text") {
      const text = prompt("Text or formula to place on the board:");
      if (text?.trim()) commit([...value, { tool: "text", color, size, points: [p], text: text.trim().slice(0, 200) }]);
      return;
    }
    drawing.current = { tool, color, size: tool === "highlighter" ? size * 5 : size, points: [p] };
  };
  const move = (e: React.PointerEvent) => {
    if (panStart.current) {
      const r = canvas.current!.getBoundingClientRect();
      const s = r.width / W;
      setPan([panStart.current.pan[0] + (e.clientX - panStart.current.x) / s, panStart.current.pan[1] + (e.clientY - panStart.current.y) / s]);
      return;
    }
    if (!drawing.current) return;
    const p = toBoard(e);
    if (tool === "eraser") { const next = value.filter((s) => !hit(s, p)); if (next.length !== value.length) commit(next); return; }
    const d = drawing.current;
    if (d.tool === "pen" || d.tool === "highlighter") {
      const last = d.points[d.points.length - 1];
      if (Math.hypot(last[0] - p[0], last[1] - p[1]) > 2) d.points.push(p);
    } else d.points = [d.points[0], p];
    paint();
    force((x) => x + 1);
  };
  const up = () => {
    panStart.current = null;
    const d = drawing.current;
    drawing.current = null;
    if (d && d.color && d.points.length) commit([...value, d]);
  };

  const doUndo = () => { const prev = undo[undo.length - 1]; if (!prev) return; setUndo((u) => u.slice(0, -1)); setRedo((r) => [...r, value]); onChange?.(prev); };
  const doRedo = () => { const nxt = redo[redo.length - 1]; if (!nxt) return; setRedo((r) => r.slice(0, -1)); setUndo((u) => [...u, value]); onChange?.(nxt); };

  useEffect(() => {
    if (readOnly) return;
    const k = (e: KeyboardEvent) => {
      if (!wrap.current?.contains(document.activeElement)) return;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") { e.preventDefault(); if (e.shiftKey) doRedo(); else doUndo(); }
    };
    addEventListener("keydown", k);
    return () => removeEventListener("keydown", k);
  });

  const exportPng = () => {
    const off = document.createElement("canvas");
    off.width = W * 2; off.height = H * 2;
    const ctx = off.getContext("2d")!;
    ctx.scale(2, 2);
    ctx.fillStyle = "#fffdf8"; ctx.fillRect(0, 0, W, H);
    [...background, ...value].forEach((s) => drawStroke(ctx, s));
    const a = document.createElement("a");
    a.href = off.toDataURL("image/png");
    a.download = "classpulse-whiteboard.png";
    a.click();
  };

  const tools: { id: Tool; label: string; Icon: import("lucide-react").LucideIcon }[] = [
    { id: "pen", label: "Pen", Icon: PenLine }, { id: "highlighter", label: "Highlighter", Icon: Highlighter }, { id: "eraser", label: "Eraser", Icon: Eraser },
    { id: "line", label: "Line", Icon: Minus }, { id: "arrow", label: "Arrow", Icon: ArrowUpRight }, { id: "rect", label: "Rectangle", Icon: Square },
    { id: "text", label: "Text", Icon: Type }, { id: "pan", label: "Pan", Icon: MousePointer2 },
  ];

  return (
    <div ref={wrap} className="rounded-2xl border border-line overflow-hidden bg-[#fffdf8]">
      <div className="flex flex-wrap items-center gap-1 p-2 bg-surface border-b border-line" role="toolbar" aria-label={`${label} tools`}>
        {!readOnly && tools.map((t) => (
          <button key={t.id} onClick={() => setTool(t.id)} aria-pressed={tool === t.id} title={t.label} aria-label={t.label}
            className={`grid h-9 w-9 place-items-center rounded-lg transition ${tool === t.id ? "bg-primary text-primary-ink shadow-clay" : "hover:bg-ink/5"}`}><t.Icon size={17} /></button>
        ))}
        {!readOnly && (
          <>
            <span className="mx-1 h-6 w-px bg-line" aria-hidden />
            {COLORS.map((c) => <button key={c} onClick={() => setColor(c)} aria-label={`Colour ${c}`} aria-pressed={color === c} className={`h-6 w-6 rounded-full border-2 ${color === c ? "border-primary scale-110" : "border-transparent"} transition`} style={{ background: c }} />)}
            <label className="flex items-center gap-1.5 text-xs text-muted ml-1">Size<input type="range" min={1} max={12} value={size} onChange={(e) => setSize(Number(e.target.value))} className="w-20 accent-[rgb(var(--primary))]" /></label>
            <span className="mx-1 h-6 w-px bg-line" aria-hidden />
            <div className="relative">
              <button onClick={() => setShowSymbols((s) => !s)} className="grid h-9 w-9 place-items-center rounded-lg hover:bg-ink/5" aria-label="Insert formula symbol" aria-expanded={showSymbols}><Sigma size={17} /></button>
              {showSymbols && (
                <div className="absolute z-10 top-10 left-0 w-56 glass rounded-xl p-2 shadow-lift grid grid-cols-8 gap-1">
                  {SYMBOLS.map((s) => (
                    <button key={s} className="h-7 rounded-md hover:bg-primary/10 font-semibold" onClick={() => { setShowSymbols(false); commit([...value, { tool: "text", color, size, points: [[W / 2 - 20 + Math.random() * 40, H / 2 + Math.random() * 40]], text: s }]); }}>{s}</button>
                  ))}
                </div>
              )}
            </div>
            <button onClick={doUndo} disabled={!undo.length} className="grid h-9 w-9 place-items-center rounded-lg hover:bg-ink/5 disabled:opacity-40" aria-label="Undo"><Undo2 size={17} /></button>
            <button onClick={doRedo} disabled={!redo.length} className="grid h-9 w-9 place-items-center rounded-lg hover:bg-ink/5 disabled:opacity-40" aria-label="Redo"><Redo2 size={17} /></button>
            <button onClick={() => value.length && commit([])} className="grid h-9 w-9 place-items-center rounded-lg hover:bg-bad/10 text-bad" aria-label="Clear my strokes"><Trash2 size={17} /></button>
          </>
        )}
        <div className="ml-auto flex items-center gap-1">
          <button onClick={() => setZoom((z) => Math.max(0.5, +(z - 0.25).toFixed(2)))} className="grid h-9 w-9 place-items-center rounded-lg hover:bg-ink/5" aria-label="Zoom out"><ZoomOut size={17} /></button>
          <button onClick={() => { setZoom(1); setPan([0, 0]); }} className="text-xs font-semibold tabular-nums w-11 hover:bg-ink/5 rounded-lg h-9" aria-label="Reset zoom">{Math.round(zoom * 100)}%</button>
          <button onClick={() => setZoom((z) => Math.min(3, +(z + 0.25).toFixed(2)))} className="grid h-9 w-9 place-items-center rounded-lg hover:bg-ink/5" aria-label="Zoom in"><ZoomIn size={17} /></button>
          <button onClick={() => setReplay(replay ? null : { stroke: 0, point: 1 })} disabled={!value.length && !background.length} className="grid h-9 w-9 place-items-center rounded-lg hover:bg-ink/5 disabled:opacity-40" aria-label={replay ? "Stop replay" : "Replay drawing stroke by stroke"}>{replay ? <Pause size={17} /> : <Play size={17} />}</button>
          <button onClick={exportPng} className="grid h-9 w-9 place-items-center rounded-lg hover:bg-ink/5" aria-label="Download as image"><Download size={17} /></button>
        </div>
      </div>
      <div className="relative">
        <canvas ref={canvas} className={`block w-full touch-none ${readOnly ? "" : tool === "pan" ? "cursor-grab" : "cursor-crosshair"}`}
          onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerLeave={up}
          onWheel={(e) => { if (e.ctrlKey || e.metaKey) { e.preventDefault(); setZoom((z) => Math.min(3, Math.max(0.5, z - e.deltaY * 0.002))); } }}
          role="img" aria-label={`${label}: ${value.length} strokes${background.length ? `, over ${background.length} strokes from ${backgroundLabel ?? "the original"}` : ""}`} tabIndex={0} />
        {!value.length && !background.length && !readOnly && <p className="pointer-events-none absolute inset-0 grid place-items-center text-muted/70 text-sm">Draw your question here</p>}
        {backgroundLabel && background.length > 0 && <span className="absolute left-2 bottom-2 chip bg-ink/5 text-muted">Underneath: {backgroundLabel}</span>}
      </div>
    </div>
  );
}
