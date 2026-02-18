// Web Worker for NetworkGraph physics simulation
// This moves the O(n²) collision detection off the main thread

interface GraphNode {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
}

interface WorkerMessage {
  type: 'init' | 'tick' | 'updateNode' | 'stop';
  nodes?: GraphNode[];
  draggedNodeId?: number | null;
  nodeUpdate?: { id: number; x: number; y: number };
}

interface WorkerResponse {
  type: 'nodes' | 'done';
  nodes?: GraphNode[];
}

let nodes: GraphNode[] = [];
let isRunning = false;
let tickCount = 0;
const MAX_TICKS = 200; // Increase for larger networks to settle

const JEFFREY_ID = 1;
const CENTER_X = 50;
const CENTER_Y = 50;

function applyCollisionResolution(draggedNodeId: number | null): GraphNode[] {
  const newNodes = nodes.map((n) => ({ ...n }));

  for (let i = 0; i < newNodes.length; i++) {
    const node = newNodes[i];
    if (node.id === draggedNodeId) continue;

    // 1. Centering Force (Gentle pull to middle)
    const cdx = CENTER_X - node.x;
    const cdy = CENTER_Y - node.y;
    const centerDist = Math.sqrt(cdx * cdx + cdy * cdy);

    // Stronger centering for Jeffrey Epstein
    const centerStrength = node.id === JEFFREY_ID ? 0.05 : 0.01;
    node.x += cdx * centerStrength;
    node.y += cdy * centerStrength;

    // 2. Collision Detection
    for (let j = 0; j < newNodes.length; j++) {
      if (i === j) continue;
      const other = newNodes[j];
      const dx = node.x - other.x;
      const dy = node.y - other.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const minDist = (node.radius / 2 + other.radius / 2) * 2.0; // Increased padding

      if (dist < minDist && dist > 0) {
        const overlap = minDist - dist;
        const pushFactor = 0.15; // Increased push
        const moveX = (dx / dist) * overlap * pushFactor;
        const moveY = (dy / dist) * overlap * pushFactor;

        node.x += moveX;
        node.y += moveY;
      }
    }
  }

  return newNodes;
}

let draggedNodeId: number | null = null;

self.onmessage = (e: MessageEvent<WorkerMessage>) => {
  const { type, nodes: incomingNodes, draggedNodeId: newDraggedNodeId, nodeUpdate } = e.data;

  switch (type) {
    case 'init':
      if (incomingNodes) {
        nodes = incomingNodes;
        tickCount = 0;
        isRunning = true;
        runSimulation();
      }
      break;

    case 'updateNode':
      if (nodeUpdate) {
        const idx = nodes.findIndex((n) => n.id === nodeUpdate.id);
        if (idx >= 0) {
          nodes[idx] = { ...nodes[idx], x: nodeUpdate.x, y: nodeUpdate.y };
        }
      }
      draggedNodeId = newDraggedNodeId ?? null;
      break;

    case 'stop':
      isRunning = false;
      break;
  }
};

function runSimulation() {
  if (!isRunning || tickCount >= MAX_TICKS) {
    self.postMessage({ type: 'done' } as WorkerResponse);
    return;
  }

  nodes = applyCollisionResolution(draggedNodeId);
  tickCount++;

  self.postMessage({ type: 'nodes', nodes } as WorkerResponse);

  // Continue simulation at ~30fps
  setTimeout(runSimulation, 33);
}
