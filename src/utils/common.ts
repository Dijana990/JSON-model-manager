import type { GraphData, NodeType, EdgeType } from '../types';
import { applyForceAtlasLayout } from './graphUtils';

// Dohvati sve grupe iz grafa (osim default/users)
export function getAvailableGroups(data: GraphData): string[] {
  return Array.from(
    new Set(
      data.nodes
        .map(n => n.group)
        .filter((g): g is string => !!g && !['default', 'users'].includes(g))
    )
  );
}

// Dohvati sve tipove iz relevantnih čvorova
export function getAvailableTypes(nodes: NodeType[]): string[] {
  return Array.from(
    new Set(nodes.map(n => n.type).filter((t): t is string => !!t))
  );
}

// Proširi selekciju na sve povezane čvorove u grupi
export function getRelevantNodesByGroup(data: GraphData, group: string): NodeType[] {
  if (!group) return data.nodes;
  const groupNodeIds = new Set(
    data.nodes.filter(n => n.group === group).map(n => n.id)
  );
  const relatedNodeIds = new Set<string>(groupNodeIds);
  let added = true;
  while (added) {
    added = false;
    data.edges.forEach(edge => {
      if (relatedNodeIds.has(edge.source) && !relatedNodeIds.has(edge.target)) {
        relatedNodeIds.add(edge.target);
        added = true;
      }
      if (relatedNodeIds.has(edge.target) && !relatedNodeIds.has(edge.source)) {
        relatedNodeIds.add(edge.source);
        added = true;
      }
    });
  }
  return data.nodes.filter(n => relatedNodeIds.has(n.id));
}

// Filtriraj čvorove i rubove po tipu i grupi (osnovno)
export function filterGraphCommon(
  data: GraphData,
  selectedGroup: string,
  selectedTypes: Set<string>
): { nodes: NodeType[]; edges: EdgeType[] } {
  let filteredNodes = getRelevantNodesByGroup(data, selectedGroup);

  if (selectedTypes.size > 0) {
    filteredNodes = filteredNodes.filter(n => selectedTypes.has(n.type));
  }

  const filteredIds = new Set(filteredNodes.map(n => n.id));
  const filteredEdges = data.edges.filter(
    e => filteredIds.has(e.source) && filteredIds.has(e.target)
  );

  // Dodaj virtualne rubove za user-software (ako nema computer)
  const extraEdges: EdgeType[] = [];
  const addedEdgeIds = new Set<string>();

  if (
    selectedTypes.has('user') &&
    selectedTypes.has('software') &&
    !selectedTypes.has('computer')
  ) {
    filteredNodes.forEach(user => {
      if (user.type !== 'user') return;
      const userIdShort = user.id.replace(/^user-/, '');
      filteredNodes.forEach(soft => {
        if (soft.type === 'software' && soft.id.startsWith(userIdShort)) {
          const id = `virtual-${user.id}-${soft.id}`;
          // NOVO: provjeri postoji li već edge s istim source i target
          const alreadyExists = [...filteredEdges, ...extraEdges].some(
            (e) => e.source === user.id && e.target === soft.id
          );
          if (!alreadyExists && !addedEdgeIds.has(id)) {
            extraEdges.push({
              id,
              source: user.id,
              target: soft.id,
              type: 'user-software-virtual',
            });
            addedEdgeIds.add(id);
          }
        }
      });
    });
  }

  return { nodes: filteredNodes, edges: [...filteredEdges, ...extraEdges] };
}

// Layout helper
export function layoutGraph(nodes: NodeType[], edges: EdgeType[]) {
  return applyForceAtlasLayout({ nodes, edges });
}