import { useEffect } from 'react';

/**
 * Hook: useResetStates
 * ----------------------
 * Centralizira resetiranje odabranih stateova prilikom promjene viewMode.
 *
 * @param viewMode - Trenutni prikaz (landscape, firewalls, dataservices, credentials)
 * @param setSelectedGroup - Setter za selectedGroup
 * @param setSelectedTypes - Setter za selectedTypes
 * @param setHoveredNode - Setter za hoveredNode
 * @param setSelectedNode - Setter za selectedNode
 */
export function useResetStates(
  viewMode: string,
  setSelectedGroup: (group: string) => void,
  setSelectedTypes: (types: Set<string>) => void,
  setHoveredNode: (node: any) => void,
  setSelectedNode: (node: any) => void
) {
  useEffect(() => {
    setSelectedGroup("");
    setSelectedTypes(new Set());
    setHoveredNode(null);
    setSelectedNode(null);
  }, [viewMode, setSelectedGroup, setSelectedTypes, setHoveredNode, setSelectedNode]);
}
