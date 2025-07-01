import type { NodeType, EdgeType, Software } from '../types';
import { getBinaryLabel, formatServerId } from '../services/JSONParser';
import { filterGraphStrictByGroup } from '../utils/common';

function edgeExists(edges: EdgeType[], source: string, target: string) {
    return edges.some(e => e.source === source && e.target === target);
}

function extractCpeIdn(swId: string): string {
    return swId.split('#')[0];
}

export function filterDataservicesGraph(
    inputJson: any,
    selectedGroup: string = '',
    selectedTypes: Set<string> = new Set()
): { nodes: NodeType[]; edges: EdgeType[] } {
    const nodes: NodeType[] = [];
    const edges: EdgeType[] = [];
    const nodeIndex: Record<string, NodeType> = {};

    // 🔹 1. Dodavanje computer i software nodeova
    for (const [compId, comp] of Object.entries(inputJson.computers) as [string, any][]) {
        const networkIds = comp.network_idn || [];
        const group = networkIds.length > 0 ? `network.internal.${networkIds.join('_')}` : 'no-network';

        // ➔ Prikaži samo computere sa person_index 0 na barem jednom softwareu
        const hasPersonIndex0 = Object.values(comp.installed_software || {}).some(
            (sw: any) => Number(sw.person_index) === 0
        );
        if (!hasPersonIndex0) continue;

        // ➔ Dodaj computer node
        const compNode: NodeType = {
            id: compId,
            label: formatServerId(compId),
            fullName: compId,
            type: 'computer',
            icon: '/icons/computer.png',
            group,
            meta: { originalComputer: comp }
        };
        nodes.push(compNode);
        nodeIndex[compId] = compNode;

        // ➔ Dodaj software nodeove (samo one s person_index 0 i user/network services)
        for (const [swId, sw] of Object.entries(comp.installed_software) as [string, any][]) {
            if (!sw || typeof sw !== 'object') continue;
            if (Number(sw.person_index) !== 0) continue;

            const providesUserServices = sw.provides_user_services || [];
            const providesNetworkServices = sw.provides_network_services || [];
            if (providesUserServices.length === 0 && providesNetworkServices.length === 0) continue;

            let label = getBinaryLabel(sw);
            if (providesUserServices.includes('Office')) label = 'Office';
            if (providesUserServices.includes('EmailClient')) label = 'Outlook';
            if (providesUserServices.includes('Browser')) label = 'Firefox';

            const swNode: NodeType = {
                id: swId,
                label,
                fullName: swId,
                type: 'software',
                icon: '/icons/binary.png',
                group,
                meta: { originalSoftware: sw, computerId: compId }
            };
            nodes.push(swNode);
            nodeIndex[swId] = swNode;

            edges.push({
                id: `edge-${compId}-${swId}`,
                source: compId,
                target: swId,
                type: 'computer-software'
            });
        }
    }

    // 🔹 2. Obrada dataservices
    for (const [dsId, ds] of Object.entries(inputJson.data || {}) as [string, any][]) {
        const personIndexes = ds.person_indexes || [];
        const linkedSoftware = ds.linked_software || [];
        const personGroups = ds.person_groups || [];
        const principalSoftware = ds.principal_software || null;

        // ➔ Prikazujemo samo ako ima person_index 0 i linked_software nije prazan
        if (!personIndexes.includes(0) || linkedSoftware.length === 0) continue;

        // ➔ Dodaj dataservice node
        if (!nodeIndex[dsId]) {
            const dsNode: NodeType = {
                id: dsId,
                label: ds.data_definition_idn || dsId,
                fullName: dsId,
                type: 'dataservice',
                icon: '/icons/database.png',
                group: 'dataservices',
                meta: { originalDataservice: ds }
            };
            nodes.push(dsNode);
            nodeIndex[dsId] = dsNode;
        }

        // 🔹 2.1 Veze dataservice ➔ linked_software (povezujemo samo na točan software na računalima user grupe ili servere s FinApp / InternetBanking)
        for (const swId of linkedSoftware) {
            const targetCpeIdn = extractCpeIdn(swId);
            let foundAtLeastOne = false;

            for (const [compId, comp] of Object.entries(inputJson.computers || {}) as [string, any][]) {
                const installed = comp.installed_software || {};

                for (const [installedSwId, s] of Object.entries(installed) as [string, any][]) {
                    if (s.cpe_idn !== targetCpeIdn) continue;
                    if (Number(s.person_index) !== 0) continue;

                    const swPersonGroupId = s.person_group_id || null;

                    // ➔ Ako person_group_id je null ➔ provjeri provides_network_services za FinApp ili InternetBanking
                    if (swPersonGroupId === null) {
                        const provides = s.provides_network_services || [];
                        const hasFinAppOrInternetBanking = provides.includes("FinApp") || provides.includes("InternetBanking");
                        if (!hasFinAppOrInternetBanking) continue;
                    } else {
                        // ➔ Inače provjeri je li person_group_id softvera u person_groups dataservice
                        if (!personGroups.includes(swPersonGroupId)) continue;
                    }

                    // ➔ Software node mora biti već u grafu
                    if (!nodeIndex[installedSwId]) continue;

                    // ➔ Dodaj edge dataservice -> software (povezujemo točno na taj node)
                    if (!edgeExists(edges, dsId, installedSwId)) {
                        edges.push({
                            id: `edge-${dsId}-${installedSwId}`,
                            source: dsId,
                            target: installedSwId,
                            type: 'dataservice-software'
                        });
                    }

                    foundAtLeastOne = true; // ➔ ne prekidamo petlju, tražimo sve software na svim računalima
                }
            }

            if (!foundAtLeastOne) {
                 console.warn(`⚠️ Dataservice ${dsId} has linked_software ${swId} but no valid matching computer/software.`);
            }
        }

        // 🔹 2.2 Veza dataservice ➔ principal_software (ako postoji i već je u grafu)
        if (principalSoftware) {
            const targetPrincipalCpeIdn = extractCpeIdn(principalSoftware);

            const matchingPrincipalNode = Object.values(nodeIndex).find(
                node =>
                    node.type === 'software' &&
                    node.meta?.originalSoftware?.cpe_idn === targetPrincipalCpeIdn
            );

            if (matchingPrincipalNode && !edgeExists(edges, dsId, matchingPrincipalNode.id)) {
                edges.push({
                    id: `edge-${dsId}-${matchingPrincipalNode.id}`,
                    source: dsId,
                    target: matchingPrincipalNode.id,
                    type: 'dataservice-principal'
                });
            }
        }

        // 🔹 2.3 Veze dataservice ➔ user
        for (const userId of personGroups) {
            if (!nodeIndex[userId]) {
                const userNode: NodeType = {
                    id: userId,
                    label: userId,
                    fullName: userId,
                    type: 'user',
                    icon: '/icons/user.png',
                    group: 'users'
                };
                nodes.push(userNode);
                nodeIndex[userId] = userNode;
            }

            if (!edgeExists(edges, userId, dsId)) {
                edges.push({
                    id: `edge-${userId}-${dsId}`,
                    source: userId,
                    target: dsId,
                    type: 'user-dataservice'
                });
            }
        }
    }


    // 🔹 3. Filtriranje po group i type (finalni output)
    const filtered = filterGraphStrictByGroup({ nodes, edges }, selectedGroup, selectedTypes);

    return filtered;
}
