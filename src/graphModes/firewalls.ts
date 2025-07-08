import type { NodeType, EdgeType, GraphData } from '../types';
import { getBinaryLabel } from '../services/JSONParser';

const INTERNET_NODE_ID = 'Internet';

export function filterFirewallsGraph(
  landscapeGraph: GraphData,
  inputJson: any,
  selectedGroup: string = '',
  selectedTypes: Set<string> = new Set()
): { nodes: NodeType[]; edges: EdgeType[] } {

    if (!inputJson) return { nodes: [], edges: [] };

  if (!landscapeGraph?.nodes) return { nodes: [], edges: [] };

  const nodes: NodeType[] = [];
  const edges: EdgeType[] = [];

  const nodeIndex: Record<string, NodeType> = {};
  const edgeIndex: Set<string> = new Set();

  // 🔹 Helper za dodavanje nodova bez duplikata
  function addNode(node: NodeType) {
    if (!nodeIndex[node.id]) {
      nodes.push(node);
      nodeIndex[node.id] = node;
    }
  }

  // 🔹 Helper za dodavanje edgeva bez duplikata
  function addEdge(edge: EdgeType) {
    const edgeKey = `${edge.source}->${edge.target}`;
    if (!edgeIndex.has(edgeKey)) {
      edges.push(edge);
      edgeIndex.add(edgeKey);
    }
  }

  // 🔹 Dodaj Internet node
  addNode({
    id: INTERNET_NODE_ID,
    label: 'Internet',
    fullName: 'Internet',
    type: 'internet',
    icon: '/icons/internet.png',
    group: ''
  });

  const firewallRules = inputJson?.firewall_rules || inputJson?.data?.firewall_rules || {};

  for (const rule of Object.values(firewallRules) as any[]) {

    const fromObjects: string[] = rule.from_objects || [];
    const toObjects: string[] = rule.to_objects || [];

    for (const from of fromObjects) {

      if (from === 'INTERNET') {
        // 🔹 Internet → to_object software
        for (const to of toObjects) {
          const [toCompId, toSwId] = to.split('>');
          const comp = inputJson.computers[toCompId];

          // ➡️ Add computer node
          addNode({
            id: toCompId,
            label: toCompId,
            fullName: toCompId,
            type: 'computer',
            icon: '/icons/computer.png',
            group: (comp?.network_idn?.length > 0)
                ? `network.internal.${comp.network_idn.join('_')}`
                : 'no-network',
          });

          // ➡️ Add software node
            const sw = comp?.installed_software?.[toSwId];
            const cleanedLabel = sw ? getBinaryLabel(sw) : toSwId.split(':').pop()?.split('#')[0] || toSwId;

            addNode({
            id: toSwId,
            label: cleanedLabel,
            fullName: sw?.name || toSwId,  // možeš koristiti sw?.name za fullName
            type: 'software',
            icon: '/icons/binary.png',
            group: (comp?.network_idn?.length > 0)
                ? `network.internal.${comp.network_idn.join('_')}`
                : 'no-network',
            meta: { computer_idn: toCompId, originalSoftware: sw || null }
            });

          // ➡️ Add computer → software edge
          addEdge({
            id: `edge-${toCompId}-${toSwId}`,
            source: toCompId,
            target: toSwId,
            type: 'computer-software'
          });

          // ➡️ Add Internet → software edge
          addEdge({
            id: `edge-${INTERNET_NODE_ID}-${toSwId}`,
            source: INTERNET_NODE_ID,
            target: toSwId,
            type: 'internet'
          });
        }

      } else if (from.includes('>')) {
        const [fromCompId, fromSwId] = from.split('>');
        const comp = inputJson.computers[fromCompId];

        const fullSoftwareId = `${fromCompId}>${fromSwId}`;
        const sw = comp?.installed_software?.[fullSoftwareId];

        if (!comp || !sw) {
        continue;
        }
        if (sw.person_index !== 0) {
        continue;
        }
        // ➡️ Add computer node
        addNode({
          id: fromCompId,
          label: fromCompId,
          fullName: fromCompId,
          type: 'computer',
          icon: '/icons/computer.png',
          group: (comp?.network_idn?.length > 0)
            ? `network.internal.${comp.network_idn.join('_')}`
            : 'no-network',
        });

        // ➡️ Add software node
        const cleanedLabel = sw ? getBinaryLabel(sw) : fromSwId.split(':').pop()?.split('#')[0] || fromSwId;

        addNode({
        id: fromSwId,
        label: cleanedLabel,
        fullName: sw?.name || fromSwId,
        type: 'software',
        icon: '/icons/binary.png',
        group: (comp?.network_idn?.length > 0)
            ? `network.internal.${comp.network_idn.join('_')}`
            : 'no-network',
        meta: { computer_idn: fromCompId, originalSoftware: sw || null }
        });
        // ➡️ Add computer → software edge
        addEdge({
          id: `edge-${fromCompId}-${fromSwId}`,
          source: fromCompId,
          target: fromSwId,
          type: 'computer-software'
        });

        // 🔹 Za svaki to_object dodaj i software → software edge
        for (const to of toObjects) {
            const [toCompId, toSwId] = to.split('>');
            const toComp = inputJson.computers[toCompId];

            const fullToSoftwareId = `${toCompId}>${toSwId}`;
            const toSw = toComp?.installed_software?.[fullToSoftwareId];

          if (to === 'INTERNET') {
            addEdge({
              id: `edge-${fromSwId}-${INTERNET_NODE_ID}`,
              source: fromSwId,
              target: INTERNET_NODE_ID,
              type: 'internet'
            });
          }

          if (!toComp || !toSw) continue;

          // ➡️ Add toComp node
          addNode({
            id: toCompId,
            label: toCompId,
            fullName: toCompId,
            type: 'computer',
            icon: '/icons/computer.png',
            group: (toComp?.network_idn?.length > 0)
                ? `network.internal.${toComp.network_idn.join('_')}`
                : 'no-network',
          });

            // 🔹 Izračunaj group za toSw koristeći network_idn kao fallback
            const toCompNetworkIds = toComp?.network_idn || [];
            const toSwGroup = (toCompNetworkIds.length > 0)
            ? `network.internal.${toCompNetworkIds.join('_')}`
            : (toSw?.group || toComp?.group || toComp?.meta?.groupLabel || 'no-network');

            // ➡️ Add toSw node
            const cleanedLabel = toSw ? getBinaryLabel(toSw) : toSwId.split(':').pop()?.split('#')[0] || toSwId;

            addNode({
            id: toSwId,
            label: cleanedLabel,
            fullName: toSw?.name || toSwId,
            type: 'software',
            icon: '/icons/binary.png',
            group: toSwGroup,
            meta: { computer_idn: toCompId, originalSoftware: toSw || null }
            });

          // ➡️ Add toComp → toSw edge
          addEdge({
            id: `edge-${toCompId}-${toSwId}`,
            source: toCompId,
            target: toSwId,
            type: 'computer-software'
          });

          // ➡️ Add fromSw → toSw edge
          addEdge({
            id: `edge-${fromSwId}-${toSwId}`,
            source: fromSwId,
            target: toSwId,
            type: 'software-software'
          });
        }
      }
    }
  }

// ➡️ Filtriraj po grupi ako je odabrana grupa specificirana
let finalNodes = [...nodes];
if (selectedGroup) {
  if (selectedGroup === 'internet') {
    // ➔ Ako je odabrana grupa 'internet', prikaži samo Internet node
    finalNodes = finalNodes.filter(n => n.id === INTERNET_NODE_ID);
  } else {
    // ➔ Normalno filtriranje za ostale grupe
    // 1. Pronađi sve computere iz selektirane grupe
    const groupComputerIds = finalNodes
      .filter(n => n.type === 'computer' && n.group === selectedGroup)
      .map(n => n.id);

    // 2. Prikaži sve nodove koji su:
    // - ili computer iz selektirane grupe
    // - ili software čiji je computer_idn u groupComputerIds
    finalNodes = finalNodes.filter(n =>
      (n.type === 'computer' && n.group === selectedGroup) ||
      (n.type === 'software' && n.meta?.computer_idn && groupComputerIds.includes(n.meta.computer_idn))
    );
  }
}

// ➡️ Tek sada filtriraj po selectedTypes unutar filtrirane grupe
if (selectedTypes.size > 0) {
  finalNodes = finalNodes.filter(n => {
    if (n.type === 'internet') {
      // ➔ Dozvoli Internet node samo ako je odabrana grupa internet ili nema odabrane grupe (prikaz all)
      return selectedGroup === 'internet' || !selectedGroup;
    }
    return selectedTypes.has(n.type);
  });
}

// 🔹 Filtriraj edges prema finalNodes
const finalNodeIds = new Set(finalNodes.map(n => n.id));
const finalEdges = edges.filter(e =>
  finalNodeIds.has(e.source as string) && finalNodeIds.has(e.target as string)
);

return { nodes: finalNodes, edges: finalEdges };
}