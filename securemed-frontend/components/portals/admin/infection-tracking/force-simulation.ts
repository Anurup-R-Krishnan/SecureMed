/**
 * Pure-math force-directed graph layout engine.
 * No external dependencies — runs entirely on basic vector arithmetic.
 *
 * Forces applied:
 *   1. Repulsion  – all-pairs Coulomb-like push  (O(n²))
 *   2. Attraction – spring-like pull along links  (O(e))
 *   3. Centering  – weak pull toward the canvas centre
 *   4. Velocity damping + bounds clamping
 */

import type { GraphNode, GraphLink } from '@/services/infection-tracking';
import { NODE_RADIUS } from './constants';

/* ──────── Simulation node / link with layout state ──────── */

export interface SimNode extends GraphNode {
    x: number;
    y: number;
    vx: number;
    vy: number;
    radius: number;
}

export interface SimLink extends GraphLink {
    sourceNode: SimNode;
    targetNode: SimNode;
}

/* ──────── Initialisation ──────── */

export function buildSimulation(
    nodes: GraphNode[],
    links: GraphLink[],
    width: number,
    height: number,
): { simNodes: SimNode[]; simLinks: SimLink[] } {
    const nodeMap = new Map<string, SimNode>();

    for (const n of nodes) {
        const sn: SimNode = {
            ...n,
            x: Math.random() * width,
            y: Math.random() * height,
            vx: 0,
            vy: 0,
            radius: NODE_RADIUS[n.type] ?? 10,
        };
        nodeMap.set(n.id, sn);
    }

    const simLinks: SimLink[] = [];
    for (const l of links) {
        const sn = nodeMap.get(l.source);
        const tn = nodeMap.get(l.target);
        if (sn && tn) {
            simLinks.push({ ...l, sourceNode: sn, targetNode: tn });
        }
    }

    return { simNodes: Array.from(nodeMap.values()), simLinks };
}

/* ──────── Physics tick ──────── */

export function runSimulation(
    nodes: SimNode[],
    links: SimLink[],
    width: number,
    height: number,
    iterations = 200,
): void {
    const cx = width / 2;
    const cy = height / 2;

    for (let iter = 0; iter < iterations; iter++) {
        const alpha = 1 - iter / iterations;
        const decay = alpha * 0.3;

        // 1. All-pairs repulsion
        for (let i = 0; i < nodes.length; i++) {
            for (let j = i + 1; j < nodes.length; j++) {
                const dx = nodes[j].x - nodes[i].x;
                const dy = nodes[j].y - nodes[i].y;
                const dist = Math.sqrt(dx * dx + dy * dy) || 1;
                const force = (200 * decay) / dist;
                const fx = (dx / dist) * force;
                const fy = (dy / dist) * force;
                nodes[i].vx -= fx;
                nodes[i].vy -= fy;
                nodes[j].vx += fx;
                nodes[j].vy += fy;
            }
        }

        // 2. Link attraction (spring)
        for (const link of links) {
            const dx = link.targetNode.x - link.sourceNode.x;
            const dy = link.targetNode.y - link.sourceNode.y;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            const force = (dist - 80) * 0.005 * decay;
            const fx = (dx / dist) * force;
            const fy = (dy / dist) * force;
            link.sourceNode.vx += fx;
            link.sourceNode.vy += fy;
            link.targetNode.vx -= fx;
            link.targetNode.vy -= fy;
        }

        // 3. Centering pull
        for (const n of nodes) {
            n.vx += (cx - n.x) * 0.001 * decay;
            n.vy += (cy - n.y) * 0.001 * decay;
        }

        // 4. Integrate with damping + bounds clamping
        for (const n of nodes) {
            n.vx *= 0.85;
            n.vy *= 0.85;
            n.x += n.vx;
            n.y += n.vy;
            n.x = Math.max(n.radius, Math.min(width - n.radius, n.x));
            n.y = Math.max(n.radius, Math.min(height - n.radius, n.y));
        }
    }
}
