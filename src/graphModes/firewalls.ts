import type { NodeType, EdgeType, GraphData } from '../types';
import { parseJSONToGraph, getBinaryLabel } from '../services/JSONParser';
import { filterGraphCommon } from '../utils/common';

// 🔹 Helper funkcija za provjeru postojanja veze
function edgeExists(source: string, target: string, edges: EdgeType[]): boolean {
    return edges.some(e => e.source === source && e.target === target);
}

export function filterFirewallsGraph(
    landscapeGraph: GraphData,
    inputJson: any,
    selectedGroup: string = '',
    selectedTypes: Set<string> = new Set()
): { nodes: NodeType[]; edges: EdgeType[] } {

    if (!landscapeGraph?.nodes) return { nodes: [], edges: [] };

    const INTERNET_NODE_ID = 'Internet';
    const nodes: NodeType[] = [];
    const edges: EdgeType[] = [];
    const extraSoftwareNodes: NodeType[] = [];
    const extraEdges: EdgeType[] = [];

    // 🔹 Filtriraj po grupi i tipovima koristeći filterGraphCommon
    const { nodes: filteredNodes, edges: filteredEdges } = filterGraphCommon(
        landscapeGraph,
        selectedGroup,
        selectedTypes
    );

    // 🔹 Pronađi Microsoft Active Directory i Exchange Server node ID unutar filtriranih podataka
    const microsoftADNode = filteredNodes.find(n =>
        n.type === 'software' && n.label?.toLowerCase().includes('microsoft active directory')
    );
    const microsoftADId = microsoftADNode?.id;

    const exchangeServerNode = filteredNodes.find(n =>
        n.type === 'software' && n.label?.toLowerCase().includes('exchange server')
    );
    const exchangeServerId = exchangeServerNode?.id;

    // 🔹 Pronađi computere koji imaju internet_connection
    const computersWithInternetConnection = new Set<string>();
    for (const [compId, comp] of Object.entries(inputJson.computers || {}) as [string, any][]) {
        const hasInternetConnection = Object.values(comp.installed_software || {}).some((sw: any) =>
            sw?.cpe_idn === 'Internet_connection'
        );
        if (hasInternetConnection) computersWithInternetConnection.add(compId);
    }

    // 🔹 Filtriraj software čvorove prema firewall pravilima unutar filtriranih čvorova
    const firewallSoftwareNodes = filteredNodes.filter(n => {
        if (n.type !== 'software') return false;
        const label = n.label?.toLowerCase() || '';
        const compId = (n.meta as any)?.computer_idn;

        if (label.includes('firefox')) return true;
        if (label.includes('exchange server')) return true;
        if (label.includes('sql server 2019')) return true;
        if (label.includes('financial app server')) return true;
        if (label.includes('financial app client')) return true;
        if (label.includes('microsoft active directory')) return true;
        if (label.includes('remote administration tools')) return true;
        if (label.includes('windows server 2016')) {
            return compId && computersWithInternetConnection.has(compId);
        }
        if (label.includes('internet banking server')) {
            return compId && computersWithInternetConnection.has(compId);
        }

        return false;
    });
    
    firewallSoftwareNodes.forEach(sw => {
        const compId = (sw.meta as any)?.computer_idn;
        const compNode = filteredNodes.find(n => n.id === compId && n.type === 'computer');
        if (compNode) {
            sw.group = compNode.group || (compNode.meta?.groupLabel as string) || 'unknown';
        }
    });
    // 🔹 Dodaj computere povezane sa tim software čvorovima
    const firewallComputerNodes = filteredNodes.filter(n => n.type === 'computer');

    // 🔹 Dodaj Financial App Client computer ako postoji
    const facNode = firewallSoftwareNodes.find(n => n.label?.toLowerCase().includes('financial app client'));
    if (facNode) {
        const facCompId = (facNode.meta as any)?.computer_idn;
        const facCompNode = filteredNodes.find(n => n.id === facCompId && n.type === 'computer');
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
    const firewallEdges = filteredEdges.filter(e =>
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
            const edgeId = `edge-${INTERNET_NODE_ID}-${node.id}`;

            // 🔍 Provjera postoji li već veza u edges
            const alreadyExists = edgeExists(INTERNET_NODE_ID, node.id, [...edges, ...extraEdges, ...firewallEdges]);

            if (!alreadyExists) {
                edges.push({
                    id: edgeId,
                    source: INTERNET_NODE_ID,
                    target: node.id,
                    type: 'internet'
                });
            }
        }
    }


    // 🔹 Dodaj SQL Server 2019 ← Internet Banking Server
    const ibsNode = firewallSoftwareNodes.find(n => n.label?.toLowerCase().includes('internet banking server'));
    const sqlNode = firewallSoftwareNodes.find(n => n.label?.toLowerCase().includes('sql server 2019'));
    if (ibsNode && sqlNode) {
        const edgeId = `edge-${ibsNode.id}-${sqlNode.id}`;

        // 🔍 Provjera postoji li već u edges, extraEdges ili firewallEdges
        const alreadyExists = edgeExists(ibsNode.id, sqlNode.id, [...edges, ...extraEdges, ...firewallEdges]);

        if (!alreadyExists) {
            edges.push({
                id: edgeId,
                source: ibsNode.id,
                target: sqlNode.id,
                type: 'software-software'
            });
        }
    }

    // 🔹 Dodaj Microsoft Active Directory ← Windows Server 2016
    const adNode = firewallSoftwareNodes.find(n => n.label?.toLowerCase().includes('microsoft active directory'));
    const wsNode = firewallSoftwareNodes.find(n => n.label?.toLowerCase().includes('windows server 2016'));

    if (adNode && wsNode) {
        const edgeId = `edge-${wsNode.id}-${adNode.id}`;

        // 🔍 Provjera postoji li već veza
        const alreadyExists = edgeExists(wsNode.id, adNode.id, [...edges, ...extraEdges, ...firewallEdges]);

        if (!alreadyExists) {
            edges.push({
                id: edgeId,
                source: wsNode.id,
                target: adNode.id,
                type: 'software-software'
            });
        }
    }

    // 🔹 Dodaj Financial App Server ← Financial App Client
    const fasNode = firewallSoftwareNodes.find(n => n.label?.toLowerCase().includes('financial app server'));
    if (facNode && fasNode) {
        const edgeId = `edge-${facNode.id}-${fasNode.id}`;

        // 🔍 Provjera postoji li već veza
        const alreadyExists = edgeExists(facNode.id, fasNode.id, [...edges, ...extraEdges, ...firewallEdges]);

        if (!alreadyExists) {
            edges.push({
                id: edgeId,
                source: facNode.id,
                target: fasNode.id,
                type: 'software-software'
            });
        }
    }

    // ➡️ Veza Financial App Client → Microsoft Active Directory
    if (facNode && microsoftADId) {
        const edgeId = `edge-${facNode.id}-${microsoftADId}`;

        const alreadyExists = edgeExists(facNode.id, microsoftADId, [...edges, ...extraEdges, ...firewallEdges]);
        if (!alreadyExists) {
            edges.push({
                id: edgeId,
                source: facNode.id,
                target: microsoftADId,
                type: 'software-software'
            });
        }
    }

    // 🔹 Dodaj Microsoft Windows i Outlook za svaki user computer koristeći getBinaryLabel
    for (const comp of firewallComputerNodes) {
        if (comp.id.startsWith('None')) continue; // skip serveri

        const compRaw = inputJson.computers[comp.id];
        let windowsLabel = 'Windows';
        let windowsSwId = `${comp.id}-windows`;

        if (compRaw?.installed_software) {
            const windowsSwEntry = Object.entries(compRaw.installed_software).find(([swId, sw]: [string, any]) =>
                (sw?.cpe_idn || '').toLowerCase().includes('windows_10') ||
                (sw?.cpe_idn || '').toLowerCase().includes('windows_11')
            );
            if (windowsSwEntry) {
                const [swId, sw] = windowsSwEntry;
                windowsLabel = getBinaryLabel(sw);
                windowsSwId = swId; // koristi stvarni swId
            }
        }

        // ➡️ Microsoft Windows node
        extraSoftwareNodes.push({
            id: windowsSwId,
            label: windowsLabel,
            fullName: windowsLabel,
            type: 'software',
            icon: '/icons/binary.png',
            group: comp.group || (comp.meta?.groupLabel as string) || 'unknown',
            meta: { 
                computer_idn: comp.id, 
                originalSoftware: compRaw?.installed_software?.[windowsSwId] || null
            }
        });
        extraEdges.push({
            id: `edge-${comp.id}-${windowsSwId}`,
            source: comp.id,
            target: windowsSwId,
            type: 'computer-software'
        });

        let outlookSwId = `${comp.id}-outlook`;
        let outlookLabel = 'Outlook';
        let outlookSw = null;

        if (compRaw?.installed_software) {
            const outlookSwEntry = Object.entries(compRaw.installed_software).find(([swId, sw]: [string, any]) =>
            (sw?.cpe_idn || '').toLowerCase().includes('outlook')
            );
            if (outlookSwEntry) {
            const [swId, sw] = outlookSwEntry;
            outlookSwId = swId; // koristi stvarni swId
            outlookLabel = getBinaryLabel(sw);
            outlookSw = sw;
            }
        }

        // ➡️ Microsoft Outlook node
        extraSoftwareNodes.push({
            id: outlookSwId,
            label: outlookLabel,
            fullName: outlookLabel,
            type: 'software',
            icon: '/icons/binary.png',
            group: comp.group || (comp.meta?.groupLabel as string) || 'unknown',
            meta: { 
                computer_idn: comp.id,
                originalSoftware: outlookSw || null
            }
        });

        // ➡️ Veza Computer → Outlook
        extraEdges.push({
            id: `edge-${comp.id}-${outlookSwId}`,
            source: comp.id,
            target: outlookSwId,
            type: 'computer-software'
        });

        // ➡️ Veza Outlook → Microsoft Active Directory
        if (microsoftADId) {
            extraEdges.push({
                id: `edge-${outlookSwId}-${microsoftADId}`,
                source: outlookSwId,
                target: microsoftADId,
                type: 'software-software'
            });
        }

        // ➡️ Veza Outlook → Exchange Server
        if (exchangeServerId) {
            extraEdges.push({
                id: `edge-${outlookSwId}-${exchangeServerId}`,
                source: outlookSwId,
                target: exchangeServerId,
                type: 'software-software'
            });
        }
    }
    // ➡️ Veza Windows → Microsoft Active Directory
    if (microsoftADId) {
        extraSoftwareNodes.forEach(win => {
            if (win.label?.toLowerCase().includes('windows')) {
                const exists = extraEdges.some(e => e.source === win.id && e.target === microsoftADId);
                if (!exists) {
                    extraEdges.push({
                        id: `edge-${win.id}-${microsoftADId}`,
                        source: win.id,
                        target: microsoftADId,
                        type: 'software-software'
                    });
                }
            }
        });
    }

    // ➡️ Veza Remote Administration Tools → Microsoft Active Directory
    const ratNode = firewallSoftwareNodes.find(n => n.label?.toLowerCase().includes('remote administration tools'));
    if (ratNode && microsoftADId) {
        const edgeId = `edge-${ratNode.id}-${microsoftADId}`;

        const alreadyExists = edgeExists(ratNode.id, microsoftADId, [...edges, ...extraEdges, ...firewallEdges]);
        if (!alreadyExists) {
            edges.push({
                id: edgeId,
                source: ratNode.id,
                target: microsoftADId,
                type: 'software-software'
            });
        }
    }

    // ➡️ Veza Outlook → Exchange Server i Outlook → AD
    extraSoftwareNodes.forEach(outlook => {
        if (outlook.label?.toLowerCase().includes('outlook')) {
            if (exchangeServerId) {
                const exists = extraEdges.some(e => e.source === outlook.id && e.target === exchangeServerId);
                if (!exists) {
                    extraEdges.push({
                        id: `edge-${outlook.id}-${exchangeServerId}`,
                        source: outlook.id,
                        target: exchangeServerId,
                        type: 'software-software'
                    });
                }
            }
            if (microsoftADId) {
                const exists = extraEdges.some(e => e.source === outlook.id && e.target === microsoftADId);
                if (!exists) {
                    extraEdges.push({
                        id: `edge-${outlook.id}-${microsoftADId}`,
                        source: outlook.id,
                        target: microsoftADId,
                        type: 'software-software'
                    });
                }
            }
        }
    });
    // 🔹 Spoji finalne nodeve
    const finalNodes = [
        ...firewallComputerNodes,
        ...firewallSoftwareNodes,
        ...extraSoftwareNodes, // ➡️ dodaj Windows i Outlook
        ...nodes // Internet node
    ];

    // 🔹 Filtriraj finalNodes po grupi ako je odabrana grupa specificirana
    const finalFilteredNodes = selectedGroup
        ? finalNodes.filter(n =>
            n.group === selectedGroup ||
            n.meta?.groupLabel === selectedGroup
        )
        : finalNodes;

    // 🔹 Kreiraj skup za filtriranje edgeva
    const finalNodeIds = new Set(finalFilteredNodes.map(n => n.id));
    const finalFilteredEdges = [...firewallEdges, ...edges, ...extraEdges].filter(e =>
        finalNodeIds.has(e.source as string) && finalNodeIds.has(e.target as string)
    );

    return { nodes: finalFilteredNodes, edges: finalFilteredEdges };
}
