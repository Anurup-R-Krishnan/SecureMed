'use client';

/**
 * Canvas-based force-directed graph renderer.
 * Receives graph data, runs the layout simulation, and draws the result.
 * Highlights nodes belonging to a selected transmission path.
 */

import React, { useEffect, useRef, useCallback, useState } from 'react';
import { Activity } from 'lucide-react';
import type { GraphVisualization, InfectionTrace } from '@/services/infection-tracking';
import { NODE_COLORS, REL_COLORS } from './constants';
import { buildSimulation, runSimulation, type SimNode, type SimLink } from './force-simulation';

interface ForceGraphProps {
    data: GraphVisualization;
    highlightTrace: InfectionTrace | null;
}

export default function ForceGraph({ data, highlightTrace }: ForceGraphProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const simNodesRef = useRef<SimNode[]>([]);
    const simLinksRef = useRef<SimLink[]>([]);
    const [hoveredNode, setHoveredNode] = useState<SimNode | null>(null);

    /* ── layout + draw ── */
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || !data.nodes.length) return;

        const width = canvas.clientWidth;
        const height = canvas.clientHeight;
        const dpr = window.devicePixelRatio || 1;
        canvas.width = width * dpr;
        canvas.height = height * dpr;

        const { simNodes, simLinks } = buildSimulation(data.nodes, data.links, width, height);
        runSimulation(simNodes, simLinks, width, height, 200);

        simNodesRef.current = simNodes;
        simLinksRef.current = simLinks;

        draw(canvas, simNodes, simLinks, highlightTrace);
    }, [data, highlightTrace]);

    /* ── draw to canvas ── */
    const draw = useCallback(
        (canvas: HTMLCanvasElement, nodes: SimNode[], links: SimLink[], trace: InfectionTrace | null) => {
            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            const dpr = window.devicePixelRatio || 1;
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            const w = canvas.clientWidth;
            const h = canvas.clientHeight;
            ctx.clearRect(0, 0, w, h);

            // highlighted IDs from the selected trace
            const hlIds = new Set<string>();
            if (trace?.transmission_path?.path) {
                for (const step of trace.transmission_path.path) {
                    if (step.id) hlIds.add(step.id);
                }
            }

            // links
            for (const link of links) {
                const isHL = hlIds.has(link.sourceNode.id) && hlIds.has(link.targetNode.id);
                ctx.beginPath();
                ctx.moveTo(link.sourceNode.x, link.sourceNode.y);
                ctx.lineTo(link.targetNode.x, link.targetNode.y);
                ctx.strokeStyle = isHL ? '#ef4444' : (REL_COLORS[link.relationship] || '#33333330');
                ctx.lineWidth = isHL ? 3 : 1;
                ctx.stroke();
            }

            // nodes
            for (const node of nodes) {
                const isHL = hlIds.has(node.id);
                const color = NODE_COLORS[node.type] || '#999';

                if (isHL) {
                    ctx.shadowColor = '#ef4444';
                    ctx.shadowBlur = 16;
                }

                ctx.beginPath();
                ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
                ctx.fillStyle = isHL ? '#ef4444' : color;
                ctx.fill();
                ctx.shadowColor = 'transparent';
                ctx.shadowBlur = 0;

                ctx.strokeStyle = isHL ? '#fca5a5' : '#ffffff';
                ctx.lineWidth = isHL ? 2 : 1.5;
                ctx.stroke();

                // label
                const raw = node.label || node.id;
                const label = raw.length > 12 ? raw.slice(0, 10) + '…' : raw;
                ctx.font = `bold ${node.radius > 12 ? 10 : 8}px Inter, system-ui, sans-serif`;
                ctx.textAlign = 'center';
                ctx.fillStyle = '#fff';
                ctx.fillText(label, node.x, node.y + 3);
            }
        },
        [],
    );

    /* ── hover ── */
    const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;

        const found = simNodesRef.current.find((n) => {
            const dx = n.x - mx;
            const dy = n.y - my;
            return dx * dx + dy * dy <= n.radius * n.radius;
        });
        setHoveredNode(found || null);
        canvas.style.cursor = found ? 'pointer' : 'default';
    }, []);

    return (
        <div className="bg-card rounded-2xl border border-border/60 shadow-sm overflow-hidden relative">
            {/* header */}
            <div className="px-6 py-4 border-b border-border/40 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Activity className="h-5 w-5 text-primary" />
                    <h2 className="font-bold text-foreground">Contact Network Graph</h2>
                </div>
                <div className="flex items-center gap-4 text-xs font-bold">
                    {Object.entries(NODE_COLORS).map(([type, color]) => (
                        <span key={type} className="flex items-center gap-1.5">
                            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
                            {type}
                        </span>
                    ))}
                </div>
            </div>

            {/* canvas */}
            <div className="relative" style={{ height: 500 }}>
                <canvas ref={canvasRef} className="w-full h-full" onMouseMove={handleMouseMove} />
                {hoveredNode && (
                    <div
                        className="absolute pointer-events-none bg-popover border border-border rounded-lg px-3 py-2 shadow-xl text-sm z-10"
                        style={{ left: hoveredNode.x + 20, top: hoveredNode.y - 10 }}
                    >
                        <p className="font-bold text-foreground">{hoveredNode.label || hoveredNode.id}</p>
                        <p className="text-muted-foreground text-xs">{hoveredNode.type} · {hoveredNode.id}</p>
                    </div>
                )}
            </div>
        </div>
    );
}
