import type { GraphData, NodeType, EdgeType } from '../types';
import { applyForceAtlasLayout } from './graphUtils';

function edgeExists(edges: EdgeType[], source: string, target: string) {
  return edges.some(e => e.source === source && e.target === target);
}

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

function addUserSoftwareEdges(
  nodes: NodeType[],
  edges: EdgeType[],
  allEdges: EdgeType[]
): EdgeType[] {
  const extraEdges: EdgeType[] = [];
  const computers: { [key: string]: { users: string[]; software: string[] } } = {};

  // Pronađi sva računala i njihove povezane korisnike i softver iz originalnog grafa
  allEdges.forEach(edge => {
    if (edge.type === 'computer-user') {
      const computerId = edge.source;
      const userId = edge.target;
      if (!computers[computerId]) {
        computers[computerId] = { users: [], software: [] };
      }
      computers[computerId].users.push(userId);
    } else if (edge.type === 'computer-software') {
      const computerId = edge.source;
      const softwareId = edge.target;
      if (!computers[computerId]) {
        computers[computerId] = { users: [], software: [] };
      }
      computers[computerId].software.push(softwareId);
    }
  });

  const nodeIds = new Set(nodes.map(n => n.id));

  // Stvori virtualne veze za korisnike i softver na istom računalu
  Object.values(computers).forEach(comp => {
    comp.users.forEach(userId => {
      if (nodeIds.has(userId)) {
        comp.software.forEach(softwareId => {
          if (nodeIds.has(softwareId)) {
            const edgeExists = edges.some(
              e =>
                (e.source === userId && e.target === softwareId) ||
                (e.source === softwareId && e.target === userId)
            );
            if (!edgeExists) {
              extraEdges.push({
                id: `virtual-${userId}-${softwareId}`,
                source: userId,
                target: softwareId,
                type: 'user-software-virtual',
              });
            }
          }
        });
      }
    });
  });

  return extraEdges;
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

  let extraEdges: EdgeType[] = [];

  if (selectedTypes.has('user') && selectedTypes.has('software')) {
    extraEdges = addUserSoftwareEdges(
      filteredNodes,
      filteredEdges,
      data.edges
    );
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







export function filterGraphCredentialsCustom(
  data: GraphData,
  selectedGroup: string
): { nodes: NodeType[]; edges: EdgeType[] } {
  if (!selectedGroup) {
    return { nodes: data.nodes, edges: data.edges };
  }

  const filteredNodes: NodeType[] = [];
  const filteredEdges: EdgeType[] = [];

  // ➡️ Pronađi sve nodeove u odabranoj grupi
  const groupNodes = data.nodes.filter(n => n.group === selectedGroup);

  // ➡️ Dodaj software, lock, key, computer nodeove iz te grupe
  for (const node of groupNodes) {
    if (['software', 'lock', 'key', 'computer'].includes(node.type)) {
      filteredNodes.push(node);
    }
  }

  // 🔹 PRIDODAJ: Dodaj lock/key čvorove koji nisu u grupi, ali su povezani sa software iz grupe
  const softwareIdsInGroup = groupNodes.filter(n => n.type === 'software').map(n => n.id);

  for (const edge of data.edges) {
    if (edge.type === 'credential-software' && softwareIdsInGroup.includes(edge.target)) {
      const lockKeyNode = data.nodes.find(n => n.id === edge.source && ['lock', 'key'].includes(n.type));
      if (lockKeyNode && !filteredNodes.includes(lockKeyNode)) {
        filteredNodes.push(lockKeyNode);
      }
      if (!edgeExists(filteredEdges, edge.source, edge.target)) {
        filteredEdges.push(edge);
      }
    }
  }

  // 🔹 Dodaj user nodeove povezane na lock/key čvorove
  const lockKeyIds = new Set(filteredNodes.filter(n => ['lock', 'key'].includes(n.type)).map(n => n.id));

  for (const edge of data.edges) {
    if (edge.type === 'credential-user' && lockKeyIds.has(edge.source)) {
      const userNode = data.nodes.find(n => n.id === edge.target && n.type === 'user');
      if (userNode && !filteredNodes.includes(userNode)) {
        filteredNodes.push(userNode);
      }
      if (!edgeExists(filteredEdges, edge.source, edge.target)) {
        filteredEdges.push(edge);
      }
    }
  }

  // ➡️ Dodaj sve edgeove između filtriranih nodeova
  const filteredIds = new Set(filteredNodes.map(n => n.id));
  for (const edge of data.edges) {
    if (filteredIds.has(edge.source) && filteredIds.has(edge.target)) {
      if (!edgeExists(filteredEdges, edge.source, edge.target)) {
        filteredEdges.push(edge);
      }
    }
  }

  // ➡️ Ukloni duplikate edgeova
  const uniqueEdges = Array.from(new Map(filteredEdges.map(e => [e.id, e])).values());

  return { nodes: filteredNodes, edges: uniqueEdges };
}
