import { useMemo } from 'react';
import type { NodeType } from '../types';

/**
 * Hook: useGraphConfig
 * ----------------------
 * Generira dinamičke layout konfiguracije na temelju veličine odabrane grupe.
 *
 * @param selectedGroup - trenutno odabrana grupa
 * @param mappedNodes - svi nodeovi nakon layouta
 * @returns konfiguracijski parametri: distanceMin, collideRadius, nodeStrength
 */
export function useGraphConfig(
  selectedGroup: string,
  mappedNodes: NodeType[]
) {
  return useMemo(() => {
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
  }, [selectedGroup, mappedNodes]);
}
