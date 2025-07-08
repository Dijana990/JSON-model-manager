import type { NodeType } from '../types';

export function manualLayout(nodes: NodeType[]): NodeType[] {
  const spacingX = 500;
  const spacingY = 500;

  return nodes.map((node, index) => ({
    ...node,
    x: (index % 5) * spacingX, // 5 čvorova po redu
    y: Math.floor(index / 5) * spacingY,
    z: 0
  }));
}

export function getDynamicLayoutConfig(selectedGroup: string, mappedNodes: NodeType[]) {
  const groupNodeCount = selectedGroup
    ? mappedNodes.filter(n => n.group === selectedGroup).length
    : mappedNodes.length;

  const dynamicDistanceMin = selectedGroup
    ? (groupNodeCount > 50
        ? 100
        : groupNodeCount > 30
          ? 200
          : 200)
    : 1000;

  const dynamicCollideRadius = selectedGroup
    ? (groupNodeCount > 50
        ? 150
        : groupNodeCount > 20
          ? 1
          : 150)
    : 1000;

  const dynamicNodeStrength = selectedGroup
    ? (groupNodeCount > 50
        ? -1000
        : groupNodeCount > 30
          ? -150
          : -250)
    : -800;

  return { dynamicDistanceMin, dynamicCollideRadius, dynamicNodeStrength };
}