/**
 * Hook: useZoomToGroup
 * ---------------------
 * Omogućuje automatsko centriranje i zumiranje na odabranu grupu čvorova.
 *
 * @param graphRef - ref na GraphCanvas komponentu
 * @param selectedGroup - trenutno odabrana grupa
 * @param mappedNodes - svi nodeovi u grafu (s pozicijama)
 */
import { useEffect } from 'react';
import type { NodeType } from '../types';

export function useZoomToGroup(
  graphRef: React.RefObject<any>,
  selectedGroup: string,
  mappedNodes: NodeType[]
) {
  useEffect(() => {
    if (selectedGroup && graphRef.current) {
      const groupNodes = mappedNodes.filter(n => n.group === selectedGroup);

      if (groupNodes.length > 0) {
        const avgX = groupNodes.reduce((sum, n) => sum + (n.x || 0), 0) / groupNodes.length;
        const avgY = groupNodes.reduce((sum, n) => sum + (n.y || 0), 0) / groupNodes.length;

        // Automatski zoomToFit da se svi nodeovi vide
        graphRef.current?.zoomToFit?.();

        // Dinamički zoom faktor ovisno o veličini grupe
        const zoomFactor = groupNodes.length > 50 ? 1.2 : 1.5;
        graphRef.current?.zoom?.(zoomFactor);

        // Alternativa: custom setCamera
        // graphRef.current?.setCamera({ x: avgX, y: avgY, zoom: zoomFactor });
      }
    }
  }, [selectedGroup, mappedNodes, graphRef]);
}
