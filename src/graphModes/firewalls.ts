import type { GraphData, NodeType, EdgeType } from '../types';
import { filterGraphCommon } from '../utils/common';

const INTERNET_NODE_ID = 'internet';

export function filterFirewallsGraph(
    data: GraphData,
    selectedGroup: string,
    selectedTypes: Set<string>,
    inputJson?: any
): { nodes: NodeType[]; edges: EdgeType[] } {
    // 1. Osnovni čvorovi i veze (computer, software, service)
    const { nodes: origNodes, edges: origEdges } = filterGraphCommon(data, selectedGroup, selectedTypes);
        const nodes = [...origNodes];
        const edges = [...origEdges];

    // 2. Dodaj Internet node ako treba
    let internetNode = nodes.find(n => n.id === INTERNET_NODE_ID);
    if (!internetNode) {
        internetNode = {
            id: INTERNET_NODE_ID,
            label: 'Internet',
            fullName: 'Internet',
            type: 'internet',
            icon: '/icons/internet.png',
            group: 'internet'
        };
        nodes.push(internetNode);
    }

    const extraEdges: EdgeType[] = [];
    const addedEdgeIds = new Set<string>();

    // Pronađi sve software i service čvorove
    const softwareNodes = nodes.filter(n => n.type === 'software');
    const serviceNodes = nodes.filter(n => n.type === 'service');
    const computerNodes = nodes.filter(n => n.type === 'computer');

    // Pronađi servise iz inputJson koji su izloženi Internetu
    const exposedServices: string[] = inputJson?.provided_external_services || [];

    // 3. Internet → server/service (i obrnuto)
    for (const service of serviceNodes) {
        // Je li ovaj service izložen Internetu?
        const isExposed = exposedServices.some(
            svc =>
                service.label?.toLowerCase().includes(svc.toLowerCase()) ||
                service.fullName?.toLowerCase().includes(svc.toLowerCase())
        );
        if (isExposed) {
            // Internet → Service
            const edgeId1 = `edge-internet-${service.id}`;
            if (!addedEdgeIds.has(edgeId1) && !edges.some(e => e.id === edgeId1)) {
                extraEdges.push({
                    id: edgeId1,
                    source: INTERNET_NODE_ID,
                    target: service.id,
                    type: 'internet-service'
                });
                addedEdgeIds.add(edgeId1);
            }
            // Service → Internet (ako želiš dvosmjerno)
            const edgeId2 = `edge-${service.id}-internet`;
            if (!addedEdgeIds.has(edgeId2) && !edges.some(e => e.id === edgeId2)) {
                extraEdges.push({
                    id: edgeId2,
                    source: service.id,
                    target: INTERNET_NODE_ID,
                    type: 'service-internet'
                });
                addedEdgeIds.add(edgeId2);
            }
        }
    }

    // 4. Service → Service (npr. SQL server, Active Directory, itd.)
    // Veze između servisa možeš prepoznati po ID-jevima ili dodatnim pravilima
    // Primjer: ako service.id sadrži ID drugog service/servera, poveži ih
    for (const fromService of serviceNodes) {
        for (const toService of serviceNodes) {
            if (fromService.id === toService.id) continue;
            // Primjer: SQL server je backend za Internet Banking Server
            // (prilagodi prema svojoj shemi ID-a)
            if (
                fromService.fullName &&
                toService.fullName &&
                fromService.fullName !== toService.fullName &&
                fromService.fullName.includes(toService.id)
            ) {
                const edgeId = `edge-${fromService.id}-${toService.id}`;
                if (!addedEdgeIds.has(edgeId) && !edges.some(e => e.id === edgeId)) {
                    extraEdges.push({
                        id: edgeId,
                        source: fromService.id,
                        target: toService.id,
                        type: 'service-service'
                    });
                    addedEdgeIds.add(edgeId);
                }
            }
        }
    }

    // 5. Software → Service (ako nije već povezano u common)
    for (const sw of softwareNodes) {
        for (const service of serviceNodes) {
            // Ako je software backend za service (npr. SQL za Internet Banking)
            if (
                service.id.includes(sw.id) &&
                !edges.some(e => e.source === sw.id && e.target === service.id)
            ) {
                const edgeId = `edge-${sw.id}-${service.id}`;
                if (!addedEdgeIds.has(edgeId)) {
                    extraEdges.push({
                        id: edgeId,
                        source: sw.id,
                        target: service.id,
                        type: 'software-service'
                    });
                    addedEdgeIds.add(edgeId);
                }
            }
        }
    }

    // 6. Computer → Service (ako nije već povezano)
    for (const comp of computerNodes) {
        for (const service of serviceNodes) {
            // Ako je service hostan na tom računalu (npr. ID sadrži comp.id)
            if (
                service.id.includes(comp.id) &&
                !edges.some(e => e.source === comp.id && e.target === service.id)
            ) {
                const edgeId = `edge-${comp.id}-${service.id}`;
                if (!addedEdgeIds.has(edgeId)) {
                    extraEdges.push({
                        id: edgeId,
                        source: comp.id,
                        target: service.id,
                        type: 'computer-service'
                    });
                    addedEdgeIds.add(edgeId);
                }
            }
        }
    }

    // 7. Vrati sve čvorove i veze
    return {
        nodes,
        edges: [...edges, ...extraEdges]
    };
}