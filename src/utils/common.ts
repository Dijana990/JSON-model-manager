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

export function filterGraphStrictByGroup(
  data: GraphData,
  selectedGroup: string,
  selectedTypes: Set<string>
): { nodes: NodeType[]; edges: EdgeType[] } {
  if (!selectedGroup) {
    return { nodes: data.nodes, edges: data.edges };
  }

  // 🔹 1. Dohvati sve čvorove unutar selektirane grupe
  const groupNodes = data.nodes.filter(n => n.group === selectedGroup);
  const groupNodeIds = new Set(groupNodes.map(n => n.id));

  // 🔹 2. Pronađi sve čvorove koji imaju edge na groupNodes
  const connectedNodeIds = new Set<string>();
  data.edges.forEach(e => {
    if (groupNodeIds.has(e.source)) {
      connectedNodeIds.add(e.target);
    }
    if (groupNodeIds.has(e.target)) {
      connectedNodeIds.add(e.source);
    }
  });

  // 🔹 3. Kombiniraj groupNodes + connected nodes
  const combinedNodeIds = new Set([...groupNodeIds, ...connectedNodeIds]);
  let filteredNodes = data.nodes.filter(n => combinedNodeIds.has(n.id));

  // 🔹 4. Filtriraj po tipovima ako su odabrani
  if (selectedTypes.size > 0) {
    filteredNodes = filteredNodes.filter(n => selectedTypes.has(n.type));
  }

  const filteredIds = new Set(filteredNodes.map(n => n.id));

  // 🔹 5. Zadrži samo edge-ove između čvorova u filtriranoj listi
  const filteredEdges = data.edges.filter(
    e => filteredIds.has(e.source) && filteredIds.has(e.target)
  );

  return { nodes: filteredNodes, edges: filteredEdges };
}

export function filterGraphStrictWithRelated(
  data: GraphData,
  selectedGroup: string,
  selectedTypes: Set<string>
): { nodes: NodeType[]; edges: EdgeType[] } {
  if (!selectedGroup) {
    return { nodes: data.nodes, edges: data.edges };
  }

  // Filtriraj samo nodeove iz selektirane grupe
  const groupNodeIds = new Set(
    data.nodes.filter(n => n.group === selectedGroup).map(n => n.id)
  );

  // Pronađi sve povezane nodeove (direktni neighbors)
  const relatedNodeIds = new Set(groupNodeIds);
  data.edges.forEach(edge => {
    if (groupNodeIds.has(edge.source)) {
      relatedNodeIds.add(edge.target);
    }
    if (groupNodeIds.has(edge.target)) {
      relatedNodeIds.add(edge.source);
    }
  });

  let filteredNodes = data.nodes.filter(n => relatedNodeIds.has(n.id));

  // Filtriraj po selectedTypes ako je odabrano
  if (selectedTypes.size > 0) {
    filteredNodes = filteredNodes.filter(n => selectedTypes.has(n.type));
  }

  const filteredIds = new Set(filteredNodes.map(n => n.id));
  const filteredEdges = data.edges.filter(
    e => filteredIds.has(e.source) && filteredIds.has(e.target)
  );

  return { nodes: filteredNodes, edges: filteredEdges };
}