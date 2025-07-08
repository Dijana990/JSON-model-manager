import type { GraphData, NodeType, EdgeType } from '../types';

function edgeExists(edges: EdgeType[], source: string, target: string) {
  return edges.some(e => e.source === source && e.target === target);
}


export const getNodeId = (ref: string | NodeType): string =>
  typeof ref === 'string' ? ref : ref.id;

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
      const sourceId = getNodeId(edge.source);
      const targetId = getNodeId(edge.target);
      
      if (relatedNodeIds.has(sourceId) && !relatedNodeIds.has(targetId)) {
        relatedNodeIds.add(targetId);
        added = true;
      }
      if (relatedNodeIds.has(targetId) && !relatedNodeIds.has(sourceId)) {
        relatedNodeIds.add(sourceId);
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
      const computerId = typeof edge.source === 'string' ? edge.source : edge.source.id;
      const userId = edge.target;
      if (!computers[computerId]) {
        computers[computerId] = { users: [], software: [] };
      }
      computers[computerId].users.push(
        typeof userId === 'string' ? userId : userId.id
      );
    } else if (edge.type === 'computer-software') {
      const computerId = typeof edge.source === 'string' ? edge.source : edge.source.id;
      const softwareId = edge.target;
      if (!computers[computerId]) {
        computers[computerId] = { users: [], software: [] };
      }
      computers[computerId].software.push(
        typeof softwareId === 'string' ? softwareId : softwareId.id
      );
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
    e => filteredIds.has(getNodeId(e.source)) && filteredIds.has(getNodeId(e.target))
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
    if (groupNodeIds.has(getNodeId(e.source))) {
      connectedNodeIds.add(getNodeId(e.target));
    }
    if (groupNodeIds.has(getNodeId(e.target))) {
      connectedNodeIds.add(getNodeId(e.source));
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
    e => filteredIds.has(getNodeId(e.source)) && filteredIds.has(getNodeId(e.target))
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
    const srcId = getNodeId(edge.source);
    const tgtId = getNodeId(edge.target);

    if (groupNodeIds.has(srcId)) {
      relatedNodeIds.add(tgtId);
    }
    if (groupNodeIds.has(tgtId)) {
      relatedNodeIds.add(srcId);
    }
  });

  let filteredNodes = data.nodes.filter(n => relatedNodeIds.has(n.id));

  // Filtriraj po selectedTypes ako je odabrano
  if (selectedTypes.size > 0) {
    filteredNodes = filteredNodes.filter(n => selectedTypes.has(n.type));
  }

  const filteredIds = new Set(filteredNodes.map(n => n.id));
  const filteredEdges = data.edges.filter(
    e => filteredIds.has(getNodeId(e.source)) && filteredIds.has(getNodeId(e.target))
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
    const srcId = getNodeId(edge.source);
    const tgtId = getNodeId(edge.target);

    if (edge.type === 'credential-software' && softwareIdsInGroup.includes(tgtId)) {
      const lockKeyNode = data.nodes.find(n => n.id === srcId && ['lock', 'key'].includes(n.type));
      if (lockKeyNode && !filteredNodes.includes(lockKeyNode)) {
        filteredNodes.push(lockKeyNode);
      }
      if (!edgeExists(filteredEdges, srcId, tgtId)) {
        filteredEdges.push(edge);
      }
    }
  }

  // 🔹 Dodaj user nodeove povezane na lock/key čvorove
  const lockKeyIds = new Set(filteredNodes.filter(n => ['lock', 'key'].includes(n.type)).map(n => n.id));

  for (const edge of data.edges) {
    const srcId = getNodeId(edge.source);
    const tgtId = getNodeId(edge.target);

    if (edge.type === 'credential-user' && lockKeyIds.has(srcId)) {
      const userNode = data.nodes.find(n => n.id === tgtId && n.type === 'user');
      if (userNode && !filteredNodes.includes(userNode)) {
        filteredNodes.push(userNode);
      }
      if (!edgeExists(filteredEdges, srcId, tgtId)) {
        filteredEdges.push(edge);
      }
    }
  }

  // ➡️ Dodaj sve edgeove između filtriranih nodeova
  const filteredIds = new Set(filteredNodes.map(n => n.id));

  for (const edge of data.edges) {
    const srcId = getNodeId(edge.source);
    const tgtId = getNodeId(edge.target);

    if (filteredIds.has(srcId) && filteredIds.has(tgtId)) {
      if (!edgeExists(filteredEdges, srcId, tgtId)) {
        filteredEdges.push(edge);
      }
    }
  }

  // ➡️ Ukloni duplikate edgeova
  const uniqueEdges = Array.from(new Map(filteredEdges.map(e => [e.id, e])).values());

  return { nodes: filteredNodes, edges: uniqueEdges };
}


export function getConnectedNodes(
  edges: EdgeType[],
  mappedNodes: NodeType[],
  options: { selectedNodeId: string; direction: 'incoming' | 'outgoing'; edgeType?: string; nodeTypeFilter?: string[] }
): NodeType[] {
  const { selectedNodeId, direction, edgeType, nodeTypeFilter } = options;

  const filteredEdges = edges.filter(e => {
    const matchDirection = direction === 'incoming' ? e.target === selectedNodeId : e.source === selectedNodeId;
    const matchType = edgeType ? e.type === edgeType : true;
    return matchDirection && matchType;
  });

  const connectedNodes = filteredEdges.map(e => {
    const nodeId = direction === 'incoming' ? e.source : e.target;
    return mappedNodes.find(n => n.id === nodeId);
  }).filter(Boolean) as NodeType[];

  if (nodeTypeFilter && nodeTypeFilter.length > 0) {
    return connectedNodes.filter(n => nodeTypeFilter.includes(n.type));
  }
  return connectedNodes;
}