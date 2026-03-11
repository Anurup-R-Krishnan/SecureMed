'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Activity, Loader2 } from 'lucide-react';
import type { GraphVisualization, InfectionTrace } from '@/services/infection-tracking';
import { NODE_COLORS, REL_COLORS } from './constants';

type PositionedNode = {
    id: string;
    label: string;
    type: 'Patient' | 'Doctor' | 'Room' | 'Equipment' | 'Department';
    x: number;
    y: number;
    radius: number;
};

type DrawLink = {
    sourceNode: PositionedNode;
    targetNode: PositionedNode;
    relationship: string;
};

type WorkerResponse = {
    nodes: PositionedNode[];
};

type ForceGraphProps = {
    data: GraphVisualization;
    highlightTrace: InfectionTrace | null;
    isActive: boolean;
    focusTrace?: boolean;
};

const GRAPH_HEIGHT = 560;
const HIT_CELL_SIZE = 56;
const MAX_DPR = 1.5;

function getCanvasSize(canvas: HTMLCanvasElement): { width: number; height: number } {
    return {
        width: Math.max(1, Math.floor(canvas.clientWidth)),
        height: Math.max(1, Math.floor(canvas.clientHeight)),
    };
}

function buildGridIndex(nodes: PositionedNode[], cellSize: number): Map<string, PositionedNode[]> {
    const grid = new Map<string, PositionedNode[]>();
    for (const node of nodes) {
        const gx = Math.floor(node.x / cellSize);
        const gy = Math.floor(node.y / cellSize);
        const key = `${gx}:${gy}`;
        const bucket = grid.get(key);
        if (bucket) {
            bucket.push(node);
        } else {
            grid.set(key, [node]);
        }
    }
    return grid;
}

function findHoveredNode(
    x: number,
    y: number,
    grid: Map<string, PositionedNode[]>,
    cellSize: number,
): PositionedNode | null {
    const gx = Math.floor(x / cellSize);
    const gy = Math.floor(y / cellSize);

    for (let ix = gx - 1; ix <= gx + 1; ix++) {
        for (let iy = gy - 1; iy <= gy + 1; iy++) {
            const bucket = grid.get(`${ix}:${iy}`);
            if (!bucket) continue;
            for (const node of bucket) {
                const dx = node.x - x;
                const dy = node.y - y;
                if (dx * dx + dy * dy <= node.radius * node.radius) {
                    return node;
                }
            }
        }
    }

    return null;
}

function buildHighlightSet(trace: InfectionTrace | null): Set<string> {
    const highlighted = new Set<string>();
    const path = trace?.transmission_path?.path;
    if (!Array.isArray(path)) return highlighted;
    for (const step of path) {
        if (step?.id) highlighted.add(step.id);
    }
    return highlighted;
}

function filterGraphToTrace(data: GraphVisualization, trace: InfectionTrace | null): GraphVisualization {
    const highlighted = buildHighlightSet(trace);
    if (highlighted.size === 0) return data;

    return {
        nodes: data.nodes.filter((node) => highlighted.has(node.id)),
        links: data.links.filter(
            (link) => highlighted.has(link.source) && highlighted.has(link.target),
        ),
    };
}

export default function ForceGraph({ data, highlightTrace, isActive, focusTrace = false }: ForceGraphProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const workerRef = useRef<Worker | null>(null);
    const pendingWorkerIdRef = useRef(0);
    const latestHighlightRef = useRef<InfectionTrace | null>(highlightTrace);
    const frameRef = useRef<number | null>(null);
    const hoverFrameRef = useRef<number | null>(null);
    const pointerRef = useRef<{ x: number; y: number } | null>(null);

    const [canvasSize, setCanvasSize] = useState<{ width: number; height: number }>({
        width: 0,
        height: 0,
    });
    const [isSimulating, setIsSimulating] = useState(false);
    const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

    const nodesRef = useRef<PositionedNode[]>([]);
    const linksRef = useRef<DrawLink[]>([]);
    const gridRef = useRef<Map<string, PositionedNode[]>>(new Map());
    const nodeByIdRef = useRef<Map<string, PositionedNode>>(new Map());
    const displayData = useMemo(
        () => (focusTrace ? filterGraphToTrace(data, highlightTrace) : data),
        [data, highlightTrace, focusTrace]
    );

    useEffect(() => {
        latestHighlightRef.current = highlightTrace;
    }, [highlightTrace]);

    useEffect(() => {
        if (!isActive) return;
        if (typeof window === 'undefined' || workerRef.current) return;
        workerRef.current = new Worker(
            new URL('./force-simulation.worker.ts', import.meta.url),
            { type: 'module' },
        );
        return () => {
            workerRef.current?.terminate();
            workerRef.current = null;
        };
    }, [isActive]);

    useEffect(() => {
        if (!isActive) return;
        const canvas = canvasRef.current;
        if (!canvas) return;

        const updateSize = () => setCanvasSize(getCanvasSize(canvas));
        updateSize();

        const observer = new ResizeObserver(updateSize);
        observer.observe(canvas);
        return () => observer.disconnect();
    }, [isActive]);

    const draw = useCallback((trace: InfectionTrace | null) => {
        const canvas = canvasRef.current;
        if (!canvas || !isActive) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        const width = canvas.clientWidth;
        const height = canvas.clientHeight;
        ctx.clearRect(0, 0, width, height);

        const nodes = nodesRef.current;
        const links = linksRef.current;
        if (!nodes.length) return;

        const highlightedIds = buildHighlightSet(trace);

        for (const link of links) {
            const isHighlighted =
                highlightedIds.has(link.sourceNode.id) && highlightedIds.has(link.targetNode.id);
            ctx.beginPath();
            ctx.moveTo(link.sourceNode.x, link.sourceNode.y);
            ctx.lineTo(link.targetNode.x, link.targetNode.y);
            ctx.strokeStyle = isHighlighted ? '#ef4444' : REL_COLORS[link.relationship] || '#33333330';
            ctx.lineWidth = isHighlighted ? 3 : 1;
            ctx.stroke();
        }

        const renderLabels = nodes.length <= 180;
        for (const node of nodes) {
            const isHighlighted = highlightedIds.has(node.id);
            const color = NODE_COLORS[node.type] || '#999999';

            if (isHighlighted) {
                ctx.shadowColor = '#ef4444';
                ctx.shadowBlur = 16;
            }

            ctx.beginPath();
            ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
            ctx.fillStyle = isHighlighted ? '#ef4444' : color;
            ctx.fill();
            ctx.shadowColor = 'transparent';
            ctx.shadowBlur = 0;

            ctx.strokeStyle = isHighlighted ? '#fca5a5' : '#ffffff';
            ctx.lineWidth = isHighlighted ? 2 : 1.5;
            ctx.stroke();

            if (renderLabels) {
                const raw = node.label || node.id;
                const label = raw.length > 12 ? `${raw.slice(0, 10)}...` : raw;
                ctx.font = `bold ${node.radius > 12 ? 10 : 8}px Inter, system-ui, sans-serif`;
                ctx.textAlign = 'center';
                ctx.fillStyle = '#ffffff';
                ctx.fillText(label, node.x, node.y + 3);
            }
        }
    }, [isActive]);

    const scheduleDraw = useCallback((trace: InfectionTrace | null) => {
        if (!isActive) return;
        if (frameRef.current) {
            cancelAnimationFrame(frameRef.current);
        }
        frameRef.current = requestAnimationFrame(() => {
            frameRef.current = null;
            draw(trace);
        });
    }, [draw, isActive]);

    useEffect(() => {
        if (!isActive) return;

        const nodes = Array.isArray(displayData?.nodes) ? displayData.nodes : [];
        const links = Array.isArray(displayData?.links) ? displayData.links : [];
        if (!nodes.length) {
            nodesRef.current = [];
            linksRef.current = [];
            gridRef.current = new Map();
            nodeByIdRef.current = new Map();
            setHoveredNodeId(null);
            scheduleDraw(null);
            return;
        }

        const worker = workerRef.current;
        const canvas = canvasRef.current;
        const { width, height } = canvasSize;
        if (!worker || !canvas || !width || !height) return;

        const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
        canvas.width = Math.floor(width * dpr);
        canvas.height = Math.floor(height * dpr);

        setIsSimulating(true);
        const requestId = pendingWorkerIdRef.current + 1;
        pendingWorkerIdRef.current = requestId;

        worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
            if (requestId !== pendingWorkerIdRef.current) return;

            const positionedNodes = event.data?.nodes ?? [];
            const nodeById = new Map(positionedNodes.map((node) => [node.id, node]));

            const drawLinks: DrawLink[] = [];
            for (const link of links) {
                const sourceNode = nodeById.get(link.source);
                const targetNode = nodeById.get(link.target);
                if (!sourceNode || !targetNode) continue;
                drawLinks.push({
                    sourceNode,
                    targetNode,
                    relationship: link.relationship,
                });
            }

            nodesRef.current = positionedNodes;
            linksRef.current = drawLinks;
            nodeByIdRef.current = nodeById;
            gridRef.current = buildGridIndex(positionedNodes, HIT_CELL_SIZE);
            setHoveredNodeId(null);
            setIsSimulating(false);
            scheduleDraw(latestHighlightRef.current);
        };

        worker.onerror = () => {
            if (requestId !== pendingWorkerIdRef.current) return;
            setIsSimulating(false);
        };

        worker.postMessage({
            nodes,
            links,
            width,
            height,
            iterations: 120,
        });
    }, [displayData, isActive, canvasSize, scheduleDraw]);

    useEffect(() => {
        if (!isActive) return;
        scheduleDraw(highlightTrace);
    }, [highlightTrace, isActive, scheduleDraw]);

    useEffect(() => {
        if (isActive) return;
        setHoveredNodeId(null);
        pointerRef.current = null;
        setIsSimulating(false);
        if (hoverFrameRef.current) {
            cancelAnimationFrame(hoverFrameRef.current);
            hoverFrameRef.current = null;
        }
        if (frameRef.current) {
            cancelAnimationFrame(frameRef.current);
            frameRef.current = null;
        }
    }, [isActive]);

    useEffect(() => {
        return () => {
            if (hoverFrameRef.current) cancelAnimationFrame(hoverFrameRef.current);
            if (frameRef.current) cancelAnimationFrame(frameRef.current);
        };
    }, []);

    const hoveredNode = useMemo(() => {
        if (!hoveredNodeId) return null;
        return nodeByIdRef.current.get(hoveredNodeId) ?? null;
    }, [hoveredNodeId]);

    const handleMouseMove = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
        if (!isActive) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        pointerRef.current = {
            x: event.clientX - rect.left,
            y: event.clientY - rect.top,
        };

        if (hoverFrameRef.current !== null) return;
        hoverFrameRef.current = requestAnimationFrame(() => {
            hoverFrameRef.current = null;
            const pointer = pointerRef.current;
            if (!pointer) return;
            const found = findHoveredNode(pointer.x, pointer.y, gridRef.current, HIT_CELL_SIZE);
            const nextId = found?.id ?? null;
            setHoveredNodeId((prev) => (prev === nextId ? prev : nextId));
            canvas.style.cursor = nextId ? 'pointer' : 'default';
        });
    }, [isActive]);

    const handleMouseLeave = useCallback(() => {
        pointerRef.current = null;
        setHoveredNodeId(null);
        const canvas = canvasRef.current;
        if (canvas) canvas.style.cursor = 'default';
    }, []);

    const hasNoGraphData = !Array.isArray(data?.nodes) || data.nodes.length === 0;

    const nodeCount = displayData?.nodes?.length ?? 0;
    const linkCount = displayData?.links?.length ?? 0;

    return (
        <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-slate-950/5 via-background to-slate-950/10 shadow-sm">
            <div className="absolute inset-0 pointer-events-none opacity-40" aria-hidden="true">
                <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(148,163,184,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.08)_1px,transparent_1px)] bg-[size:28px_28px]" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(239,68,68,0.08),transparent_40%),radial-gradient(circle_at_70%_80%,rgba(59,130,246,0.08),transparent_45%)]" />
            </div>

            <div className="absolute right-4 top-4 z-10 flex gap-2 text-[11px] font-semibold text-muted-foreground">
                <span className="rounded-full border border-border/60 bg-background/80 px-2.5 py-1">
                    {nodeCount} nodes
                </span>
                <span className="rounded-full border border-border/60 bg-background/80 px-2.5 py-1">
                    {linkCount} links
                </span>
            </div>

            <div className="relative" style={{ height: GRAPH_HEIGHT }}>
                <canvas
                    ref={canvasRef}
                    className="w-full h-full"
                    onMouseMove={handleMouseMove}
                    onMouseLeave={handleMouseLeave}
                />
                {isSimulating && (
                    <div className="absolute inset-0 grid place-items-center bg-background/40 backdrop-blur-[1px]">
                        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Computing graph layout...
                        </div>
                    </div>
                )}
                {hasNoGraphData && !isSimulating && (
                    <div className="absolute inset-0 grid place-items-center text-sm text-muted-foreground">
                        No graph data available.
                    </div>
                )}
                {hoveredNode && (
                    <div
                        className="absolute pointer-events-none bg-popover border border-border rounded-lg px-3 py-2 shadow-xl text-sm z-10"
                        style={{ left: hoveredNode.x + 20, top: hoveredNode.y - 10 }}
                    >
                        <p className="font-bold text-foreground">{hoveredNode.label || hoveredNode.id}</p>
                        <p className="text-muted-foreground text-xs">
                            {hoveredNode.type} - {hoveredNode.id}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
