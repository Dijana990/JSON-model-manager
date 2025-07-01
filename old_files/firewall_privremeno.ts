import type { NodeType, EdgeType } from '../types';
import { parseJSONToGraph, getBinaryLabel, formatServerId, getCustomerLabel } from '../services/JSONParser';


export function filterFirewallsGraph(inputJson?: any): { nodes: NodeType[]; edges: EdgeType[] } {
  if (!inputJson?.computers) return { nodes: [], edges: [] };

  const nodes: NodeType[] = [];
  const edges: EdgeType[] = [];
  const INTERNET_NODE_ID = 'Internet';
  const nodeIndex: Record<string, NodeType> = {};

  const computersWithInternetConnection = new Set<string>();

  // 🔹 1. Pronađi računala s Internet_connection softverom
  for (const [compId, comp] of Object.entries(inputJson.computers) as [string, any][]) {
    const hasInternetConnection = Object.values(comp.installed_software || {}).some((sw: any) =>
      sw?.cpe_idn === 'Internet_connection'
    );
    if (hasInternetConnection) computersWithInternetConnection.add(compId);
  }

  // 🔹 2. Parsiraj cijeli graf kako bi dobili edge-ove za BFS traženje
  const fullGraph = parseJSONToGraph(inputJson, inputJson, true);
  const allNodes = [...fullGraph.nodes];
  const allEdges = [...fullGraph.edges];

  // 🔹 3. Pronađi Firefox software koji su povezani do Internet_connection softvera (BFS)
  const internetSoftwareIds = new Set<string>();

  // Prvo pronađi sve software koji eksplicitno pružaju internet usluge
  for (const node of allNodes) {
    if (
      node.type === 'software' &&
      ((node as any).provides_network_services || []).some((s: string) =>
        s.toLowerCase().includes('internet') ||
        s.toLowerCase().includes('web') ||
        s.toLowerCase().includes('smtp') ||
        s.toLowerCase().includes('exchange') ||
        s.toLowerCase().includes('email') ||
        s.toLowerCase().includes('banking')
      )
    ) {
      internetSoftwareIds.add(node.id);
    }
  }

  // Dodaj i sve Firefoxe kao "internet facing" softver
  for (const node of allNodes) {
    if (node.type === 'software' && node.label?.toLowerCase().includes('firefox')) {
      internetSoftwareIds.add(node.id);
    }
  }

  // 🔹 4. BFS traženje da pronađemo sve software povezane do internet softvera
  const relatedSoftwareIds = new Set<string>(internetSoftwareIds);
  let added = true;

  while (added) {
    added = false;
    for (const edge of allEdges) {
      if (
        typeof edge.source === 'string' &&
        typeof edge.target === 'string' &&
        allNodes.find(n => n.id === edge.source)?.type === 'software' &&
        allNodes.find(n => n.id === edge.target)?.type === 'software'
      ) {
        if (relatedSoftwareIds.has(edge.target) && !relatedSoftwareIds.has(edge.source)) {
          relatedSoftwareIds.add(edge.source);
          added = true;
        } else if (relatedSoftwareIds.has(edge.source) && !relatedSoftwareIds.has(edge.target)) {
          relatedSoftwareIds.add(edge.target);
          added = true;
        }
      }
    }
  }

  // 🔹 5. Dodaj software čvorove po pravilima (Internet_banking_server samo ako ima Internet_connection)
  for (const [compId, comp] of Object.entries(inputJson.computers) as [string, any][]) {
    for (const [swId, sw] of Object.entries(comp.installed_software || {}) as [string, any][]) {
      const cpe = sw.cpe_idn?.toLowerCase() || '';
      const pns = (sw.provides_network_services || []).map((s: string) => s.toLowerCase());

      // 🚫 Ne prikazuj Internet_connection kao čvor
      if (sw.cpe_idn === 'Internet_connection') {
        continue;
      }

      // 🚫 Internet_banking_server: prikaži samo ako računalo ima Internet_connection softver
      if (cpe.includes('internet_banking_server') && !computersWithInternetConnection.has(compId)) {
        continue;
      }

      const isFirefox = cpe.includes('mozilla:firefox');
      const isInternetRelevant = pns.some((s: string) =>
        s.includes('internet') ||
        s.includes('banking') ||
        s.includes('email') ||
        s.includes('smtp') ||
        s.includes('exchange')
      );

      const shouldAdd =
        (isFirefox && relatedSoftwareIds.has(swId)) || // Firefox samo ako je povezan do Internet softvera
        isInternetRelevant ||
        (cpe.includes('internet_banking_server') && computersWithInternetConnection.has(compId));

      if (!shouldAdd) continue;

      // ➡️ Dodaj computer node
      if (!nodeIndex[compId]) {
        nodeIndex[compId] = {
          id: compId,
          label: formatServerId(compId),
          fullName: compId,
          type: 'computer',
          icon: '/icons/computer.png',
          group: 'computers'
        };
        nodes.push(nodeIndex[compId]);
      }

      // ➡️ Dodaj software node
      if (!nodeIndex[swId]) {
        nodeIndex[swId] = {
          id: swId,
          label: getBinaryLabel(sw),
          fullName: sw.name || sw.idn || sw.cpe_idn || swId,
          type: 'software',
          icon: '/icons/binary.png',
          group: 'internet',
          provides_services: sw.provides_services || [],
          provides_network_services: sw.provides_network_services || [],
          meta: {
            computer_idn: compId
          }
        };
        nodes.push(nodeIndex[swId]);
      }

      // ➡️ Dodaj edge computer → software
      edges.push({
        id: `edge-${compId}-${swId}`,
        source: compId,
        target: swId,
        type: 'computer-software'
      });
    }
  }

  // 🔹 6. Dodaj Internet node
  if (!nodeIndex[INTERNET_NODE_ID]) {
    nodeIndex[INTERNET_NODE_ID] = {
      id: INTERNET_NODE_ID,
      label: 'Internet',
      fullName: 'Internet',
      type: 'internet',
      icon: '/icons/internet.png',
      group: 'internet'
    };
    nodes.push(nodeIndex[INTERNET_NODE_ID]);
  }

  // 🔹 7. Dodaj edge Internet → software
  for (const node of nodes.filter(n => n.type === 'software')) {
    const edgeId = `edge-${INTERNET_NODE_ID}-${node.id}`;
    if (!edges.some(e => e.id === edgeId)) {
      edges.push({
        id: edgeId,
        source: INTERNET_NODE_ID,
        target: node.id,
        type: 'internet'
      });
    }
  }

  return { nodes, edges };
}
xxxxxxxxxxxxxxxxx
import type { NodeType, EdgeType } from '../types';
import { parseJSONToGraph, getBinaryLabel, formatServerId } from '../services/JSONParser';


export function filterFirewallsGraph(inputJson?: any): { nodes: NodeType[]; edges: EdgeType[] } {
  if (!inputJson?.computers) return { nodes: [], edges: [] };

  const nodes: NodeType[] = [];
  const edges: EdgeType[] = [];
  const INTERNET_NODE_ID = 'Internet';
  const nodeIndex: Record<string, NodeType> = {};

  const computersWithInternetConnection = new Set<string>();

  // 🔹 1. Pronađi računala s Internet_connection softverom
  for (const [compId, comp] of Object.entries(inputJson.computers) as [string, any][]) {
    const hasInternetConnection = Object.values(comp.installed_software || {}).some((sw: any) =>
      sw?.cpe_idn === 'Internet_connection'
    );
    if (hasInternetConnection) computersWithInternetConnection.add(compId);
  }

  // 🔹 2. Parsiraj cijeli graf kako bi dobili edge-ove za BFS traženje
  const fullGraph = parseJSONToGraph(inputJson, inputJson, true);
  const allNodes = [...fullGraph.nodes];
  const allEdges = [...fullGraph.edges];
  console.log('🔎 Full graph parsed. Nodes:', allNodes.length, 'Edges:', allEdges.length);

  // 🔹 3. Pronađi Firefox software koji su povezani do Internet_connection softvera (BFS)
  const internetSoftwareIds = new Set<string>();

  // Prvo pronađi sve software koji eksplicitno pružaju internet usluge
  for (const node of allNodes) {
    if (
      node.type === 'software' &&
      ((node as any).provides_network_services || []).some((s: string) =>
        s.toLowerCase().includes('internet') ||
        s.toLowerCase().includes('web') ||
        s.toLowerCase().includes('smtp') ||
        s.toLowerCase().includes('exchange') ||
        s.toLowerCase().includes('email') ||
        s.toLowerCase().includes('banking')
      )
    ) {
      internetSoftwareIds.add(node.id);
    }
  }

  // Dodaj i sve Firefoxe kao "internet facing" softver
  for (const node of allNodes) {
    if (node.type === 'software' && node.label?.toLowerCase().includes('firefox')) {
      internetSoftwareIds.add(node.id);
    }
  }

  // 🔹 4. BFS traženje da pronađemo sve software povezane do internet softvera
  const relatedSoftwareIds = new Set<string>(internetSoftwareIds);
  console.log('🌐 Internet software IDs total before BFS:', internetSoftwareIds.size);
  let added = true;

  while (added) {
    added = false;
    for (const edge of allEdges) {
      if (
        typeof edge.source === 'string' &&
        typeof edge.target === 'string' &&
        allNodes.find(n => n.id === edge.source)?.type === 'software' &&
        allNodes.find(n => n.id === edge.target)?.type === 'software'
      ) {
        if (relatedSoftwareIds.has(edge.target) && !relatedSoftwareIds.has(edge.source)) {
          relatedSoftwareIds.add(edge.source);
          added = true;
        } else if (relatedSoftwareIds.has(edge.source) && !relatedSoftwareIds.has(edge.target)) {
          relatedSoftwareIds.add(edge.target);
          added = true;
        }
      }
    }
  }
  console.log('🧠 Related software IDs after BFS:', Array.from(relatedSoftwareIds));

  // 🔹 5. Dodaj software čvorove po pravilima (Internet_banking_server samo ako ima Internet_connection)
  for (const [compId, comp] of Object.entries(inputJson.computers) as [string, any][]) {
    for (const [swId, sw] of Object.entries(comp.installed_software || {}) as [string, any][]) {
      const cpe = sw.cpe_idn?.toLowerCase() || '';
      const pns = (sw.provides_network_services || []).map((s: string) => s.toLowerCase());

      // 🚫 Ne prikazuj Internet_connection kao čvor
      if (sw.cpe_idn === 'Internet_connection') {
        continue;
      }

      // 🚫 Internet_banking_server: prikaži samo ako računalo ima Internet_connection softver
      if (cpe.includes('internet_banking_server') && !computersWithInternetConnection.has(compId)) {
        continue;
      }

      const isFirefox = cpe.includes('mozilla:firefox');
      const isInternetRelevant = pns.some((s: string) =>
        s.includes('internet') ||
        s.includes('banking') ||
        s.includes('email') ||
        s.includes('smtp') ||
        s.includes('exchange')
      );

    const isWindowsServer2016 = getBinaryLabel(sw).toLowerCase().includes('windows server 2016');
    if (isWindowsServer2016 && !computersWithInternetConnection.has(compId)) {
    continue; // 🚫 preskoči Windows Server 2016 ako nema internet_connection
    }

    const shouldAdd =
    (isFirefox && relatedSoftwareIds.has(swId)) ||
    isInternetRelevant ||
    isWindowsServer2016 ||  // ➡️ ✅ NOVI UVJET za Windows Server 2016
    (cpe.includes('internet_banking_server') && computersWithInternetConnection.has(compId));
      console.log('⚙️ Testing software:', swId, 'shouldAdd:', shouldAdd, 'isFirefox:', isFirefox, 'isInternetRelevant:', isInternetRelevant);
      if (!shouldAdd) continue;

      // ➡️ Dodaj computer node
      if (!nodeIndex[compId]) {
        nodeIndex[compId] = {
          id: compId,
          label: formatServerId(compId),
          fullName: compId,
          type: 'computer',
          icon: '/icons/computer.png',
          group: 'computers'
        };
        console.log('✅ Adding node:', nodeIndex[compId]);
        nodes.push(nodeIndex[compId]);
      }

      // ➡️ Dodaj software node
      if (!nodeIndex[swId]) {
        nodeIndex[swId] = {
          id: swId,
          label: getBinaryLabel(sw),
          fullName: sw.name || sw.idn || sw.cpe_idn || swId,
          type: 'software',
          icon: '/icons/binary.png',
          group: 'internet',
          provides_services: sw.provides_services || [],
          provides_network_services: sw.provides_network_services || [],
          meta: {
            computer_idn: compId
          }
        };
        console.log('✅ Adding software node:', nodeIndex[swId]);
        nodes.push(nodeIndex[swId]);
      }

      
      // ➡️ Dodaj edge computer → software
      edges.push({
        id: `edge-${compId}-${swId}`,
        source: compId,
        target: swId,
        type: 'computer-software'
      });
      console.log('✅ Added edge computer-software:', {
        source: compId,
        target: swId
     }); 
    }
  }
    // 🔹 8. Dodaj edge-ove između softvera ako postoje u originalnom grafu
    for (const edge of allEdges) {
        let sourceNode = allNodes.find(n => n.id === edge.source);
        let targetNode = allNodes.find(n => n.id === edge.target);
    console.log('➕ Created sourceNode:', sourceNode);

    // ➡️ Ako sourceNode nije pronađen u allNodes, dohvatimo ga iz inputJson
    console.log('🔗 Processing edge:', edge.id, 'source:', edge.source, 'target:', edge.target);
    if (!sourceNode) {
    for (const [compId, comp] of Object.entries(inputJson.computers) as [string, any][]) {
        const sw = comp.installed_software?.[edge.source];
        if (sw) {
        sourceNode = {
            id: edge.source,
            label: getBinaryLabel(sw),
            fullName: sw.name || sw.idn || sw.cpe_idn || edge.source,
            type: 'software',
            icon: '/icons/binary.png',
            group: 'internet',
            provides_services: sw.provides_services || [],
            provides_network_services: sw.provides_network_services || [],
            meta: { computer_idn: compId }
        };
        break;
        }
    }
    }

    // ➡️ Isto za targetNode
    if (!targetNode) {
    for (const [compId, comp] of Object.entries(inputJson.computers) as [string, any][]) {
        const sw = comp.installed_software?.[edge.target];
        if (sw) {
        targetNode = {
            id: edge.target,
            label: getBinaryLabel(sw),
            fullName: sw.name || sw.idn || sw.cpe_idn || edge.target,
            type: 'software',
            icon: '/icons/binary.png',
            group: 'internet',
            provides_services: sw.provides_services || [],
            provides_network_services: sw.provides_network_services || [],
            meta: { computer_idn: compId }
        };
        break;
        }
    }
    }
    if (
        sourceNode?.type === 'software' &&
        targetNode?.type === 'software'
    ) {
        // ➡️ Dodaj source software node ako nije već dodan
        if (!nodeIndex[sourceNode.id]) {
        nodeIndex[sourceNode.id] = {
            ...sourceNode,
            group: 'internet' // ili drugi group ako želiš
        };
        console.log('✅ Adding node:', nodeIndex[sourceNode.id]);
        nodes.push(nodeIndex[sourceNode.id]);
        }
        
        // ➡️ Dodaj target software node ako nije već dodan
        if (!nodeIndex[targetNode.id]) {
        nodeIndex[targetNode.id] = {
            ...targetNode,
            group: 'internet' // ili drugi group ako želiš
        };
        console.log('✅ Adding node:', nodeIndex[targetNode.id]);
        nodes.push(nodeIndex[targetNode.id]);
        }

        // ➡️ Dodaj edge software ↔ software
        edges.push({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        type: 'software-software'
        });
        console.log('✅ Added edge software-software:', {
            source: edge.source,
            target: edge.target
        });
        // ➡️ Dodaj računalne čvorove i computer → software edge-ove
        const sourceCompId = (sourceNode.meta as any)?.computer_idn;
        const targetCompId = (targetNode.meta as any)?.computer_idn;

        if (sourceCompId && !nodeIndex[sourceCompId]) {
        nodeIndex[sourceCompId] = {
            id: sourceCompId,
            label: formatServerId(sourceCompId),
            fullName: sourceCompId,
            type: 'computer',
            icon: '/icons/computer.png',
            group: 'computers'
        };
        console.log('✅ Adding computer node:', nodeIndex[sourceCompId]);
        nodes.push(nodeIndex[sourceCompId]);
        }
        
        if (targetCompId && !nodeIndex[targetCompId]) {
        nodeIndex[targetCompId] = {
            id: targetCompId,
            label: formatServerId(targetCompId),
            fullName: targetCompId,
            type: 'computer',
            icon: '/icons/computer.png',
            group: 'computers'
        };
        console.log('✅ Adding computer node:', nodeIndex[targetCompId]);
        nodes.push(nodeIndex[targetCompId]);
        }
        
        if (sourceCompId && !edges.some(e => e.source === sourceCompId && e.target === sourceNode.id)) {
        edges.push({
            id: `edge-${sourceCompId}-${sourceNode.id}`,
            source: sourceCompId,
            target: sourceNode.id,
            type: 'computer-software'
        });
        console.log('✅ Added edge computer-software (sourceCompId → sourceNode):', {
            source: sourceCompId,
            target: sourceNode.id
        });
        }

        if (targetCompId && !edges.some(e => e.source === targetCompId && e.target === targetNode.id)) {
        edges.push({
            id: `edge-${targetCompId}-${targetNode.id}`,
            source: targetCompId,
            target: targetNode.id,
            type: 'computer-software'
        });
        console.log('✅ Added edge computer-software (targetCompId → targetNode):', {
            source: targetCompId,
            target: targetNode.id
        });
        }
    }
    }

  // 🔹 6. Dodaj Internet node
  if (!nodeIndex[INTERNET_NODE_ID]) {
    nodeIndex[INTERNET_NODE_ID] = {
      id: INTERNET_NODE_ID,
      label: 'Internet',
      fullName: 'Internet',
      type: 'internet',
      icon: '/icons/internet.png',
      group: 'internet'
    };
    console.log('✅ Adding Internet node:', nodeIndex[INTERNET_NODE_ID]);
    nodes.push(nodeIndex[INTERNET_NODE_ID]);
    
  }

  // 🔹 7. Dodaj edge Internet → software
  for (const node of nodes.filter(n => n.type === 'software')) {
    const edgeId = `edge-${INTERNET_NODE_ID}-${node.id}`;
    if (!edges.some(e => e.id === edgeId)) {
      edges.push({
        id: edgeId,
        source: INTERNET_NODE_ID,
        target: node.id,
        type: 'internet'
      });
    }
  }
  console.log('🎯 Final nodes count:', nodes.length, 'edges count:', edges.length);
  return { nodes, edges };
}
xxxxx nova verzija xxxxxx
import type { NodeType, EdgeType } from '../types';
import { parseJSONToGraph, getBinaryLabel, formatServerId } from '../services/JSONParser';

export function filterFirewallsGraph(inputJson?: any): { nodes: NodeType[]; edges: EdgeType[] } {
    if (!inputJson?.computers) return { nodes: [], edges: [] };

    const nodes: NodeType[] = [];
    const edges: EdgeType[] = [];
    const INTERNET_NODE_ID = 'Internet';
    const nodeIndex: Record<string, NodeType> = {};

    const computersWithInternetConnection = new Set<string>();

    // 🔹 1. Pronađi računala s Internet_connection softverom
    for (const [compId, comp] of Object.entries(inputJson.computers) as [string, any][]) {
        const hasInternetConnection = Object.values(comp.installed_software || {}).some((sw: any) =>
            sw?.cpe_idn === 'Internet_connection'
        );
        if (hasInternetConnection) computersWithInternetConnection.add(compId);
    }

    // 🔹 2. Parsiraj cijeli graf za BFS i pronalazak AD
    const fullGraph = parseJSONToGraph(inputJson, inputJson, true);
    const allNodes = [...fullGraph.nodes];
    const allEdges = [...fullGraph.edges];

    // 🔹 3. Pronađi Microsoft Active Directory node ID
    const microsoftADNode = allNodes.find(n =>
        n.type === 'software' && n.label?.toLowerCase().includes('microsoft active directory')
    );
    const microsoftADId = microsoftADNode?.id;

    // 🔹 4. Pronađi sve software koji pružaju internet usluge + Firefox
    const internetSoftwareIds = new Set<string>();
    for (const node of allNodes) {
        if (
            node.type === 'software' &&
            ((node as any).provides_network_services || []).some((s: string) =>
                ['internet', 'web', 'smtp', 'exchange', 'email', 'banking'].some(keyword =>
                    s.toLowerCase().includes(keyword)
                )
            )
        ) {
            internetSoftwareIds.add(node.id);
        }
        if (node.type === 'software' && node.label?.toLowerCase().includes('firefox')) {
            internetSoftwareIds.add(node.id);
        }
    }

    // 🔹 5. BFS za sve software povezane do internet softvera
    const relatedSoftwareIds = new Set<string>(internetSoftwareIds);
    let added = true;
    while (added) {
        added = false;
        for (const edge of allEdges) {
            const srcNode = allNodes.find(n => n.id === edge.source);
            const tgtNode = allNodes.find(n => n.id === edge.target);
            if (srcNode?.type === 'software' && tgtNode?.type === 'software') {
                if (relatedSoftwareIds.has(edge.source) && !relatedSoftwareIds.has(edge.target)) {
                    relatedSoftwareIds.add(edge.target);
                    added = true;
                } else if (relatedSoftwareIds.has(edge.target) && !relatedSoftwareIds.has(edge.source)) {
                    relatedSoftwareIds.add(edge.source);
                    added = true;
                }
            }
        }
    }

    // 🔹 6. Dodaj software čvorove po pravilima
    for (const [compId, comp] of Object.entries(inputJson.computers) as [string, any][]) {
        for (const [swId, sw] of Object.entries(comp.installed_software || {}) as [string, any][]) {
            const cpe = sw.cpe_idn?.toLowerCase() || '';
            const pns = (sw.provides_network_services || []).map((s: string) => s.toLowerCase());

            if (sw.cpe_idn === 'Internet_connection') continue;

            if (cpe.includes('internet_banking_server') && !computersWithInternetConnection.has(compId)) continue;

            const isFirefox = cpe.includes('mozilla:firefox');
            const isInternetRelevant = pns.some((s: string) =>
                ['internet', 'web', 'smtp', 'exchange', 'email', 'banking'].some(k => s.includes(k))
            );

            const isWindowsServer2016 = getBinaryLabel(sw).toLowerCase().includes('windows server 2016');
            if (isWindowsServer2016 && !computersWithInternetConnection.has(compId)) continue;

            const shouldAdd =
                (isFirefox && relatedSoftwareIds.has(swId)) ||
                isInternetRelevant ||
                isWindowsServer2016 ||
                (cpe.includes('internet_banking_server') && computersWithInternetConnection.has(compId));

            if (!shouldAdd) continue;

            // ➡️ Dodaj computer node
            if (!nodeIndex[compId]) {
                nodeIndex[compId] = {
                    id: compId,
                    label: formatServerId(compId),
                    fullName: compId,
                    type: 'computer',
                    icon: '/icons/computer.png',
                    group: 'computers'
                };
                nodes.push(nodeIndex[compId]);
            }

            // ➡️ Dodaj software node
            if (!nodeIndex[swId]) {
                nodeIndex[swId] = {
                    id: swId,
                    label: getBinaryLabel(sw),
                    fullName: sw.name || sw.idn || sw.cpe_idn || swId,
                    type: 'software',
                    icon: '/icons/binary.png',
                    group: 'internet',
                    provides_services: sw.provides_services || [],
                    provides_network_services: sw.provides_network_services || [],
                    meta: { computer_idn: compId }
                };
                nodes.push(nodeIndex[swId]);
            }

            // ➡️ Dodaj edge computer → software
            edges.push({
                id: `edge-${compId}-${swId}`,
                source: compId,
                target: swId,
                type: 'computer-software'
            });

            // ➡️ Dodaj edge Windows Server 2016 → Microsoft AD umjesto Interneta
            if (isWindowsServer2016 && microsoftADId) {
                // ➡️ Dodaj Microsoft AD node ako nije već
                if (!nodeIndex[microsoftADId]) {
                    const adNode = allNodes.find(n => n.id === microsoftADId);
                    if (adNode) {
                        nodeIndex[microsoftADId] = adNode;
                        nodes.push(adNode);
                    }
                }

                // ➡️ Pronađi computer na kojem je AD instaliran
                const adCompId = Object.entries(inputJson.computers).find(([compId, comp]: [string, any]) =>
                    comp.installed_software && comp.installed_software[microsoftADId]
                )?.[0];

                if (adCompId) {
                    const formattedCompId = formatServerId(adCompId);
                    // ➡️ Dodaj computer node ako nije već
                    if (!nodeIndex[formattedCompId]) {
                        nodeIndex[formattedCompId] = {
                            id: formattedCompId,
                            label: formattedCompId,
                            fullName: adCompId,
                            type: 'computer',
                            icon: '/icons/computer.png',
                            group: 'computers'
                        };
                        nodes.push(nodeIndex[formattedCompId]);
                    }

                    // ➡️ Dodaj edge computer → Microsoft AD
                    edges.push({
                        id: `edge-${formattedCompId}-${microsoftADId}`,
                        source: formattedCompId,
                        target: microsoftADId,
                        type: 'computer-software'
                    });
                }

                // ➡️ Dodaj edge Windows Server 2016 → Microsoft AD
                edges.push({
                    id: `edge-${swId}-${microsoftADId}`,
                    source: swId,
                    target: microsoftADId,
                    type: 'windows-server-ad'
                });
            }
        }
    }

    // 🔹 7. Dodaj Internet node
    if (!nodeIndex[INTERNET_NODE_ID]) {
        nodeIndex[INTERNET_NODE_ID] = {
            id: INTERNET_NODE_ID,
            label: 'Internet',
            fullName: 'Internet',
            type: 'internet',
            icon: '/icons/internet.png',
            group: 'internet'
        };
        nodes.push(nodeIndex[INTERNET_NODE_ID]);
    }

    // 🔹 8. Dodaj edge Internet → software (osim za Windows Server 2016 i Microsoft Active Directory)
    for (const node of nodes.filter(n =>
    n.type === 'software' &&
    !n.label?.toLowerCase().includes('windows server 2016') &&
    !n.label?.toLowerCase().includes('microsoft active directory')
    )) {
        const edgeId = `edge-${INTERNET_NODE_ID}-${node.id}`;
        if (!edges.some(e => e.id === edgeId)) {
            edges.push({
                id: edgeId,
                source: INTERNET_NODE_ID,
                target: node.id,
                type: 'internet'
            });
        }
    }

    return { nodes, edges };
}
xxxxx kod bez usera ali ostalo povezano na prvu granu xxxxxx
import type { NodeType, EdgeType } from '../types';
import { parseJSONToGraph, getBinaryLabel, formatServerId } from '../services/JSONParser';

export function filterFirewallsGraph(inputJson?: any): { nodes: NodeType[]; edges: EdgeType[] } {
  if (!inputJson?.computers) return { nodes: [], edges: [] };

  const INTERNET_NODE_ID = 'Internet';
  const nodes: NodeType[] = [];
  const edges: EdgeType[] = [];

  // 🔹 Parsiraj cijeli graph kao landscape
  const fullGraph = parseJSONToGraph(inputJson, inputJson, true);
  const allNodes = [...fullGraph.nodes];
  const allEdges = [...fullGraph.edges];

  // 🔹 Pronađi computere koji imaju internet_connection
  const computersWithInternetConnection = new Set<string>();
  for (const [compId, comp] of Object.entries(inputJson.computers) as [string, any][]) {
    const hasInternetConnection = Object.values(comp.installed_software || {}).some((sw: any) =>
      sw?.cpe_idn === 'Internet_connection'
    );
    if (hasInternetConnection) computersWithInternetConnection.add(compId);
  }

  // 🔹 Filtriraj software čvorove prema firewall pravilima
  const firewallSoftwareNodes = allNodes.filter(n => {
    if (n.type !== 'software') return false;
    const label = n.label?.toLowerCase() || '';
    const compId = (n.meta as any)?.computer_idn;

    if (label.includes('firefox')) return true;
    if (label.includes('exchange server')) return true;
    if (label.includes('sql server 2019')) return true;
    if (label.includes('financial app server')) return true;
    if (label.includes('financial app client')) return true;
    if (label.includes('microsoft active directory')) return true;
    if (label.includes('windows server 2016')) {
      return compId && computersWithInternetConnection.has(compId);
    }
    if (label.includes('internet banking server')) {
      return compId && computersWithInternetConnection.has(compId);
    }

    return false;
  });

  // 🔹 Dodaj computere povezane sa tim software čvorovima
  const firewallComputerNodes = allNodes.filter(n =>
    n.type === 'computer' &&
    firewallSoftwareNodes.some(sw => (sw.meta as any)?.computer_idn === n.id)
  );

  // 🔹 Kreiraj skup id-eva za filtriranje edgeva
  const firewallNodeIds = new Set([
    ...firewallSoftwareNodes.map(n => n.id),
    ...firewallComputerNodes.map(n => n.id),
  ]);

  // 🔹 Filtriraj edgeve - samo one između firewall čvorova
  const firewallEdges = allEdges.filter(e =>
    firewallNodeIds.has(e.source as string) && firewallNodeIds.has(e.target as string)
  );

  // 🔹 Dodaj Internet node
  nodes.push({
    id: INTERNET_NODE_ID,
    label: 'Internet',
    fullName: 'Internet',
    type: 'internet',
    icon: '/icons/internet.png',
    group: 'internet'
  });

  // 🔹 Dodaj Internet veze prema Internet Banking Server, Exchange Server i Firefox
  for (const node of firewallSoftwareNodes) {
    const label = node.label?.toLowerCase() || '';
    if (
      label.includes('internet banking server') ||
      label.includes('exchange server') ||
      label.includes('firefox')
    ) {
      edges.push({
        id: `edge-${INTERNET_NODE_ID}-${node.id}`,
        source: INTERNET_NODE_ID,
        target: node.id,
        type: 'internet'
      });
    }
  }

  // 🔹 Spoji finalne nodeve
  const finalNodes = [
    ...firewallComputerNodes,
    ...firewallSoftwareNodes,
    ...nodes // Internet node
  ];

  return { nodes: finalNodes, edges: [...firewallEdges, ...edges] };
}
xxxxxx sve osim outlooka i win 10 xxxxxx
import type { NodeType, EdgeType } from '../types';
import { parseJSONToGraph, getBinaryLabel, formatServerId } from '../services/JSONParser';

export function filterFirewallsGraph(inputJson?: any): { nodes: NodeType[]; edges: EdgeType[] } {
  if (!inputJson?.computers) return { nodes: [], edges: [] };

  const INTERNET_NODE_ID = 'Internet';
  const nodes: NodeType[] = [];
  const edges: EdgeType[] = [];

  // 🔹 Parsiraj cijeli graph kao landscape
  const fullGraph = parseJSONToGraph(inputJson, inputJson, true);
  const allNodes = [...fullGraph.nodes];
  const allEdges = [...fullGraph.edges];

  // 🔹 Pronađi computere koji imaju internet_connection
  const computersWithInternetConnection = new Set<string>();
  for (const [compId, comp] of Object.entries(inputJson.computers) as [string, any][]) {
    const hasInternetConnection = Object.values(comp.installed_software || {}).some((sw: any) =>
      sw?.cpe_idn === 'Internet_connection'
    );
    if (hasInternetConnection) computersWithInternetConnection.add(compId);
  }

  // 🔹 Filtriraj software čvorove prema firewall pravilima
  const firewallSoftwareNodes = allNodes.filter(n => {
    if (n.type !== 'software') return false;
    const label = n.label?.toLowerCase() || '';
    const compId = (n.meta as any)?.computer_idn;

    if (label.includes('firefox')) return true;
    if (label.includes('exchange server')) return true;
    if (label.includes('sql server 2019')) return true;
    if (label.includes('financial app server')) return true;
    if (label.includes('financial app client')) return true;
    if (label.includes('microsoft active directory')) return true;
    if (label.includes('windows server 2016')) {
      return compId && computersWithInternetConnection.has(compId);
    }
    if (label.includes('internet banking server')) {
      return compId && computersWithInternetConnection.has(compId);
    }

    return false;
  });

  // 🔹 Dodaj computere povezane sa tim software čvorovima
  const firewallComputerNodes = allNodes.filter(n =>
    n.type === 'computer' &&
    firewallSoftwareNodes.some(sw => (sw.meta as any)?.computer_idn === n.id)
  );

  // 🔹 Dodaj Financial App Client computer ako postoji
  const facNode = firewallSoftwareNodes.find(n => n.label?.toLowerCase().includes('financial app client'));
  if (facNode) {
    const facCompId = (facNode.meta as any)?.computer_idn;
    const facCompNode = allNodes.find(n => n.id === facCompId && n.type === 'computer');
    if (facCompNode && !firewallComputerNodes.some(n => n.id === facCompId)) {
      firewallComputerNodes.push(facCompNode);
    }
  }

  // 🔹 Kreiraj skup id-eva za filtriranje edgeva
  const firewallNodeIds = new Set([
    ...firewallSoftwareNodes.map(n => n.id),
    ...firewallComputerNodes.map(n => n.id),
  ]);

  // 🔹 Filtriraj edgeve - samo one između firewall čvorova
  const firewallEdges = allEdges.filter(e =>
    firewallNodeIds.has(e.source as string) && firewallNodeIds.has(e.target as string)
  );

  // 🔹 Dodaj Internet node
  nodes.push({
    id: INTERNET_NODE_ID,
    label: 'Internet',
    fullName: 'Internet',
    type: 'internet',
    icon: '/icons/internet.png',
    group: 'internet'
  });

  // 🔹 Dodaj Internet veze prema Internet Banking Server, Exchange Server i Firefox
  for (const node of firewallSoftwareNodes) {
    const label = node.label?.toLowerCase() || '';
    if (
      label.includes('internet banking server') ||
      label.includes('exchange server') ||
      label.includes('firefox')
    ) {
      edges.push({
        id: `edge-${INTERNET_NODE_ID}-${node.id}`,
        source: INTERNET_NODE_ID,
        target: node.id,
        type: 'internet'
      });
    }
  }

  // 🔹 Dodaj SQL Server 2019 ← Internet Banking Server
  const ibsNode = firewallSoftwareNodes.find(n => n.label?.toLowerCase().includes('internet banking server'));
  const sqlNode = firewallSoftwareNodes.find(n => n.label?.toLowerCase().includes('sql server 2019'));
  if (ibsNode && sqlNode) {
    edges.push({
      id: `edge-${ibsNode.id}-${sqlNode.id}`,
      source: ibsNode.id,
      target: sqlNode.id,
      type: 'software-software'
    });
  }

  // 🔹 Dodaj Microsoft Active Directory ← Windows Server 2016
  const adNode = firewallSoftwareNodes.find(n => n.label?.toLowerCase().includes('microsoft active directory'));
  const wsNode = firewallSoftwareNodes.find(n => n.label?.toLowerCase().includes('windows server 2016'));
  if (adNode && wsNode) {
    edges.push({
      id: `edge-${wsNode.id}-${adNode.id}`,
      source: wsNode.id,
      target: adNode.id,
      type: 'software-software'
    });
  }

  // 🔹 Dodaj Financial App Server ← Financial App Client
  const fasNode = firewallSoftwareNodes.find(n => n.label?.toLowerCase().includes('financial app server'));
  if (facNode && fasNode) {
    edges.push({
      id: `edge-${facNode.id}-${fasNode.id}`,
      source: facNode.id,
      target: fasNode.id,
      type: 'software-software'
    });
  }

  // 🔹 Spoji finalne nodeve
  const finalNodes = [
    ...firewallComputerNodes,
    ...firewallSoftwareNodes,
    ...nodes // Internet node
  ];

  return { nodes: finalNodes, edges: [...firewallEdges, ...edges] };
}
xxxx sve dodano ali bez razdvajanja grupa xxxxx
import type { GraphData, NodeType, EdgeType } from '../types';
import { filterGraphCommon } from '../utils/common';

export function filterLandscapeGraph(
  data: GraphData,
  selectedGroup: string,
  selectedTypes: Set<string>
): { nodes: NodeType[]; edges: EdgeType[] } {
  const { nodes, edges } = filterGraphCommon(data, selectedGroup, selectedTypes);

  const extraEdges: EdgeType[] = [];
  const addedEdgeIds = new Set<string>();

  // Dodaj software → service
  if (selectedTypes.has('software')) {
    nodes.forEach(soft => {
      if (soft.type !== 'software') return;
      nodes.forEach(s => {
        if (
          (s.type === 'service' || s.type === 'user-service') &&
          s.id.includes(soft.id)
        ) {
          const id = `virtual-${soft.id}-${s.id}`;
          // Provjeri protiv svih rubova iz originalnog grafa
          const alreadyExists = data.edges.some(
            (e) => e.source === soft.id && e.target === s.id
          );
          if (!alreadyExists && !addedEdgeIds.has(id)) {
            extraEdges.push({ id, source: soft.id, target: s.id, type: 'software-sub-virtual' });
            addedEdgeIds.add(id);
          }
        }
      });
    });
  }

  // Dodaj user → user-service (ako nema software ni computer)
  if (
    selectedTypes.has('user') &&
    selectedTypes.has('user-service') &&
    !selectedTypes.has('software') &&
    !selectedTypes.has('computer')
  ) {
    nodes.forEach(user => {
      if (user.type !== 'user') return;
      const userIdShort = user.id.replace(/^user-/, '');
      nodes.forEach(us => {
        if (
          us.type === 'user-service' &&
          us.id.split('>')[0].includes(userIdShort)
        ) {
          const id = `virtual-${user.id}-${us.id}`;
          const alreadyExists = data.edges.some(
            (e) => e.source === user.id && e.target === us.id
          );
          if (!alreadyExists && !addedEdgeIds.has(id)) {
            extraEdges.push({
              id,
              source: user.id,
              target: us.id,
              type: 'user-user-service-virtual',
            });
            addedEdgeIds.add(id);
          }
        }
      });
    });
  }

  // Dodaj computer → user-service (ako nema software)
  if (
    selectedTypes.has('computer') &&
    selectedTypes.has('user-service') &&
    !selectedTypes.has('software')
  ) {
    nodes.forEach(comp => {
      if (comp.type !== 'computer') return;
      nodes.forEach(us => {
        if (us.type !== 'user-service') return;
        const parts = us.id.split('>')[0].split('-');
        const usComputerId = parts[parts.length - 1];
        if (usComputerId !== comp.id) return;
        const id = `virtual-${comp.id}-${us.id}`;
        const alreadyExists = data.edges.some(
          (e) => e.source === comp.id && e.target === us.id
        );
        if (!alreadyExists && !addedEdgeIds.has(id)) {
          extraEdges.push({
            id,
            source: comp.id,
            target: us.id,
            type: 'computer-user-service-virtual',
          });
          addedEdgeIds.add(id);
        }
      });
    });
  }

  // Dodaj service → software ILI → computer (ali ne oboje)
  if (selectedTypes.has('service')) {
    const hasSoftware = selectedTypes.has('software');
    const hasComputer = selectedTypes.has('computer');
    nodes.forEach(svc => {
      if (svc.type !== 'service') return;
      let linked = false;
      if (hasSoftware) {
        for (const soft of nodes) {
          if (soft.type !== 'software') continue;
          if (svc.id.includes(soft.id)) {
            const id = `virtual-${soft.id}-${svc.id}`;
            const alreadyExists = data.edges.some(
              (e) => e.source === soft.id && e.target === svc.id
            );
            if (!alreadyExists && !addedEdgeIds.has(id)) {
              extraEdges.push({
                id,
                source: soft.id,
                target: svc.id,
                type: 'software-sub-virtual',
              });
              addedEdgeIds.add(id);
            }
            linked = true;
            break;
          }
        }
      }
      if (!linked && hasComputer) {
        for (const comp of nodes) {
          if (comp.type !== 'computer') continue;
          const serviceComputerId = svc.id.split('-')[1]?.split('>')[0];
          if (serviceComputerId === comp.id) {
            const id = `virtual-${comp.id}-${svc.id}`;
            const alreadyExists = data.edges.some(
              (e) => e.source === comp.id && e.target === svc.id
            );
            if (!alreadyExists && !addedEdgeIds.has(id)) {
              extraEdges.push({
                id,
                source: comp.id,
                target: svc.id,
                type: 'computer-service-virtual',
              });
              addedEdgeIds.add(id);
            }
            break;
          }
        }
      }
    });
  }

  return { nodes, edges: [...edges, ...extraEdges] };
}