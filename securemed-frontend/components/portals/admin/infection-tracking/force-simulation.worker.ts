import type { GraphLink, GraphNode } from "@/services/infection-tracking";
import { buildSimulation, runSimulation } from "./force-simulation";

type SimWorkerRequest = {
  nodes: GraphNode[];
  links: GraphLink[];
  width: number;
  height: number;
  iterations?: number;
};

type SimWorkerResponse = {
  nodes: Array<{
    id: string;
    label: string;
    type: GraphNode["type"];
    x: number;
    y: number;
    radius: number;
  }>;
};

self.onmessage = (event: MessageEvent<SimWorkerRequest>) => {
  const payload = event.data;
  const { simNodes, simLinks } = buildSimulation(
    payload.nodes ?? [],
    payload.links ?? [],
    payload.width,
    payload.height,
  );

  runSimulation(
    simNodes,
    simLinks,
    payload.width,
    payload.height,
    payload.iterations ?? 120,
  );

  const response: SimWorkerResponse = {
    nodes: simNodes.map((node) => ({
      id: node.id,
      label: node.label,
      type: node.type,
      x: node.x,
      y: node.y,
      radius: node.radius,
    })),
  };

  self.postMessage(response);
};

export {};
