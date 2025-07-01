import type { NodeType, EdgeType, GraphData } from '../types';
import { filterGraphCommon } from '../utils/common';
import { getBinaryLabel } from '../services/JSONParser';

function edgeExists(source: string, target: string, edges: EdgeType[]): boolean {
  return edges.some(e => e.source === source && e.target === target);
}

export function filterDataservicesGraph(
  landscapeGraph: GraphData,
  inputJson: any,
  selectedGroup: string = '',
  selectedTypes: Set<string> = new Set()
): { nodes: NodeType[]; edges: EdgeType[] } {
  const { nodes: filteredNodes, edges: filteredEdges } = filterGraphCommon(
    landscapeGraph,
    selectedGroup,
    selectedTypes
  );

  const dataserviceNodes: NodeType[] = [];
  const dataserviceEdges: EdgeType[] = [];

  // 🔹 Priprema dataservices prema definiciji
  const dataservices = [
    {
      id: 'FinancialData:banking',
      relatedSoftwares: ['sql server 2019', 'financial app client'],
      relatedUsers: ['finance:banking', 'ceo:financial', 'developer:windows:senior'],
      fullConnectionSoftware: 'sql server 2019'
    },
    {
      id: 'SourceCode:internet_banking',
      relatedSoftwares: ['visual studio 2019'],
      relatedUsers: ['developer:windows:senior']
    },
    {
      id: 'Emails',
      relatedSoftwares: ['exchange server'],
      relatedUsers: [] // punimo po potrebi
    }
  ];

  dataservices.forEach(ds => {
    const dsNodeId = ds.id + '#' + crypto.randomUUID();
    dataserviceNodes.push({
      id: dsNodeId,
      label: ds.id,
      fullName: ds.id,
      type: 'dataservice',
      icon: '/icons/database.png',
      group: 'dataservices'
    });

    // 🔹 Poveži dataservice sa software čvorovima
    ds.relatedSoftwares.forEach(swLabel => {
      const swNode = filteredNodes.find(n =>
        n.type === 'software' &&
        getBinaryLabel(n.meta?.originalSoftware).toLowerCase().includes(swLabel)
      );
      if (swNode) {
        const alreadyExists = edgeExists(dsNodeId, swNode.id, [...filteredEdges, ...dataserviceEdges]);
        if (!alreadyExists) {
            dataserviceEdges.push({
            id: `edge-${dsNodeId}-${swNode.id}`,
            source: dsNodeId,
            target: swNode.id,
            type: swLabel === ds.fullConnectionSoftware ? 'dataservice-full' : 'dataservice-dashed'
            });
         }
      }
    });

    // 🔹 Poveži dataservice s user čvorovima
    ds.relatedUsers.forEach(userId => {
      const userNode = filteredNodes.find(n =>
        n.type === 'user' &&
        n.id === userId
      );
      if (userNode) {
        const alreadyExists = edgeExists(dsNodeId, userNode.id, [...filteredEdges, ...dataserviceEdges]);
        if (!alreadyExists) {
            dataserviceEdges.push({
            id: `edge-${dsNodeId}-${userNode.id}`,
            source: dsNodeId,
            target: userNode.id,
            type: 'dataservice-dashed'
            });
        }
        }
    });
  });

  // 🔹 Dodaj Outlook → Exchange Server veze
  filteredNodes.forEach(node => {
    if (node.label?.toLowerCase().includes('outlook')) {
      const exchangeServer = filteredNodes.find(n =>
        n.label?.toLowerCase().includes('exchange server')
      );
      if (exchangeServer) {
        const alreadyExists = edgeExists(node.id, exchangeServer.id, [...filteredEdges, ...dataserviceEdges]);
        if (!alreadyExists) {
            dataserviceEdges.push({
            id: `edge-${node.id}-${exchangeServer.id}`,
            source: node.id,
            target: exchangeServer.id,
            type: 'dataservice-full'
            });
        }
    }
    }
  });

  // 🔹 Kreiraj finalni skup čvorova i edgeva
    const finalNodes = [
    ...filteredNodes.filter(n => n.type !== 'service' && n.type !== 'user-service'),
    ...dataserviceNodes
    ];
  const finalEdges = [
    ...filteredEdges,
    ...dataserviceEdges
  ];
    // 🔹 Filtriraj edgeve da oba kraja postoje u finalNodes
    const validNodeIds = new Set(finalNodes.map(n => n.id));
    const filteredFinalEdges = finalEdges.filter(e =>
    validNodeIds.has(e.source as string) && validNodeIds.has(e.target as string)
    );
  return { nodes: finalNodes, edges: filteredFinalEdges };
}




xxxxxxxxxxxxxxxx

import type { NodeType, EdgeType, GraphData } from '../types';
import { filterGraphCommon } from '../utils/common';
import { getBinaryLabel, getDataserviceLabel } from '../services/JSONParser';


function edgeExists(source: string, target: string, edges: EdgeType[]): boolean {
    return edges.some(e => e.source === source && e.target === target);
}
export function filterDataservicesGraph(
    landscapeGraph: GraphData,
    inputJson: any,
    selectedGroup: string = '',
    selectedTypes: Set<string> = new Set()
): { nodes: NodeType[]; edges: EdgeType[] } {
    const { nodes: filteredNodes, edges: filteredEdges } = filterGraphCommon(
        landscapeGraph,
        selectedGroup,
        selectedTypes
    );

    const dataserviceNodes: NodeType[] = [];
    const dataserviceEdges: EdgeType[] = [];
    console.log("inputJson.data keys:", Object.keys(inputJson.data || {}));

    // 🔹 Dohvati sve dataservice id-eve iz inputJson.data
    const dataservices = Object.keys(inputJson.data || {}).filter(id =>
        id.startsWith('FinancialData:') ||
        id.startsWith('SourceCode:') ||
        id.startsWith('Emails')
    ).map(id => ({ id }));

    // 🔹 Filtriraj dataservices da uključuju samo one koji imaju pripadajući node u filteredNodes
    const filteredDataservices = dataservices.filter(ds => {
    const dsLabel = getDataserviceLabel(ds.id);

    if (dsLabel === 'Emails') {
        // Dohvati sve dsFullId koje počinju s Emails
        const dsFullIds = Object.keys(inputJson.data || {}).filter(k => k.startsWith(dsLabel));

        // Provjeri postoji li BAREM JEDAN koji je povezan s Outlook software u prikazu
        const hasValidEmails = dsFullIds.some(dsFullId => {
            const dsNetworks = inputJson.data?.[dsFullId]?.network_idn || [];

            return filteredNodes.some(n =>
                n.type === 'software' &&
                getBinaryLabel(n.meta?.originalSoftware).toLowerCase().includes('outlook') &&
                dsNetworks.some((netId: number) => n.meta?.network_ids?.includes(netId))
            );
        });

    return hasValidEmails;
    }

    if (dsLabel === 'SourceCode:internet_banking') {
        const hasVS = filteredNodes.some(n =>
        n.type === 'software' &&
        getBinaryLabel(n.meta?.originalSoftware).toLowerCase().includes('visual studio 2019')
        );
        return hasVS;
    }

    if (dsLabel === 'FinancialData:banking') {
        const hasSQL = filteredNodes.some(n =>
        n.type === 'software' &&
        getBinaryLabel(n.meta?.originalSoftware).toLowerCase().includes('sql server 2019')
        );
        return hasSQL;
    }

    return false;
    });

    // 🔹 Dohvati sve Outlook software id-jeve koji su prikazani
    const displayedOutlookSoftwareIds = filteredNodes
    .filter(n => n.type === 'software' && getBinaryLabel(n.meta?.originalSoftware).toLowerCase().includes('outlook'))
    .map(n => n.id);

    console.log("Filtered dataservices:", filteredDataservices);
    filteredDataservices.forEach(ds => {
        const dsFullId = Object.keys(inputJson.data || {}).find(k => k.startsWith(ds.id)) || `${ds.id}#${crypto.randomUUID()}`;
        const dsNodeId = dsFullId;
        console.log("Processing dataservice:", ds.id, "→ dsFullId:", dsFullId);

        const existingDsNode = filteredNodes.find(n => n.id === dsNodeId);
        let dsNode = existingDsNode;
        if (!dsNode) {
        dsNode = {
            id: dsNodeId,
            label: ds.id,
            fullName: ds.id,
            type: 'dataservice',
            icon: '/icons/database.png',
            group: 'dataservices',
            meta: { originalDataservice: inputJson.data?.[dsFullId] || null }
        };
        dataserviceNodes.push(dsNode);
        }

        // 🔹 FinancialData:banking → software iz software_data_links
        if (ds.id === 'FinancialData:banking') {
            const softwareDataLinks = inputJson.software_data_links as Record<string, string[]> || {};
            Object.entries(softwareDataLinks).forEach(([swId, links]) => {
                if (links.includes(dsFullId)) {
                    const swNode = filteredNodes.find(n => n.id === swId);
                    if (swNode) {
                        const edgeType = links.length > 1 ? 'dataservice-full' : 'dataservice-dashed';
                        const alreadyExists = edgeExists(dsNodeId, swNode.id, [...filteredEdges, ...dataserviceEdges]);
                        if (!alreadyExists) {
                            dataserviceEdges.push({
                                id: `edge-${dsNodeId}-${swNode.id}`,
                                source: dsNodeId,
                                target: swNode.id,
                                type: edgeType
                            });
                        }
                    }
                }
            });

            // 🔹 FinancialData:banking → useri na istoj mreži
            const dsNetworks = inputJson.data?.[dsFullId]?.network_idn || [];
            const usersOnNetworks = filteredNodes.filter(n =>
                n.type === 'user' &&
                dsNetworks.some((netId: number) => n.meta?.network_ids?.includes(netId))
            );

            usersOnNetworks.forEach(user => {
                const alreadyExists = edgeExists(dsNodeId, user.id, [...filteredEdges, ...dataserviceEdges]);
                if (!alreadyExists) {
                    dataserviceEdges.push({
                        id: `edge-${dsNodeId}-${user.id}`,
                        source: dsNodeId,
                        target: user.id,
                        type: 'dataservice-dashed'
                    });
                }
            });
        }

        // 🔹 SourceCode:internet_banking → Visual Studio + developeri
        if (ds.id === 'SourceCode:internet_banking') {
            const vsNode = filteredNodes.find(n =>
                n.type === 'software' &&
                getBinaryLabel(n.meta?.originalSoftware).toLowerCase().includes('visual studio 2019')
            );
            if (vsNode) {
                const alreadyExists = edgeExists(dsNodeId, vsNode.id, [...filteredEdges, ...dataserviceEdges]);
                if (!alreadyExists) {
                    dataserviceEdges.push({
                        id: `edge-${dsNodeId}-${vsNode.id}`,
                        source: dsNodeId,
                        target: vsNode.id,
                        type: 'dataservice-full'
                    });
                }
            }

            const developerUsers = filteredNodes.filter(n =>
                n.type === 'user' &&
                n.id.includes('developer:windows:senior')
            );
            developerUsers.forEach(dev => {
                const alreadyExists = edgeExists(dsNodeId, dev.id, [...filteredEdges, ...dataserviceEdges]);
                if (!alreadyExists) {
                    dataserviceEdges.push({
                        id: `edge-${dsNodeId}-${dev.id}`,
                        source: dsNodeId,
                        target: dev.id,
                        type: 'dataservice-dashed'
                    });
                }
            });
        }

        // 🔹 Emails → za svaki već dohvaćeni computer s Outlookom dodaj Emails dataservice
        if (ds.id === 'Emails') {
            // Dohvati sve Outlook software nodeove u filteredNodes
            const outlookSoftwares = filteredNodes.filter(n =>
                n.type === 'software' &&
                getBinaryLabel(n.meta?.originalSoftware).toLowerCase().includes('outlook')
            );

            outlookSoftwares.forEach(outlookSw => {
                const compId = outlookSw.meta?.computer_idn;
                const computerNode = filteredNodes.find(n =>
                    n.type === 'computer' &&
                    n.id === compId
                );

                if (!computerNode) return; // Nema pripadajućeg computera u prikazu

                // Dohvati Emails dataservice koji je povezan s ovim computerom (po network_idn)
                const dsFullId = Object.keys(inputJson.data || {}).find(dsKey => {
                    const dsValue = inputJson.data?.[dsKey];
                    const dsNetworks = dsValue?.network_idn || [];
                    const compNetworks = computerNode.meta?.network_ids || [];
                    return dsNetworks.some((netId: number) => compNetworks.includes(netId));
                });

                if (!dsFullId) return; // Nema povezanog Emails dataservice za ovaj computer

                // ➔ Dodaj Emails dataservice node AKO VEĆ NIJE DODAN
                let dsNode = dataserviceNodes.find(n => n.id === dsFullId);
                if (!dsNode) {
                    dsNode = {
                        id: dsFullId,
                        label: getDataserviceLabel(dsFullId),
                        fullName: dsFullId,
                        type: 'dataservice',
                        icon: '/icons/database.png',
                        group: 'dataservices',
                        meta: { originalDataservice: inputJson.data?.[dsFullId] || null }
                    };
                    dataserviceNodes.push(dsNode);
                }

                // ➔ Dodaj edge između Emails dataservice i Outlook software
                const alreadyExists = edgeExists(dsNode.id, outlookSw.id, [...filteredEdges, ...dataserviceEdges]);
                if (!alreadyExists) {
                    dataserviceEdges.push({
                        id: `edge-${dsNode.id}-${outlookSw.id}`,
                        source: dsNode.id,
                        target: outlookSw.id,
                        type: 'dataservice-full'
                    });
                }
            });
        }
    });

    // 🔹 Kreiraj finalni skup čvorova i edgeva
    const finalNodes = [
        ...filteredNodes.filter(n => n.type !== 'service' && n.type !== 'user-service'),
        ...dataserviceNodes
    ];
    const finalEdges = [
        ...filteredEdges,
        ...dataserviceEdges
    ];

    // 🔹 Filtriraj edgeve da oba kraja postoje u finalNodes
    const validNodeIds = new Set(finalNodes.map(n => n.id));
    const filteredFinalEdges = finalEdges.filter(e =>
        validNodeIds.has(e.source as string) && validNodeIds.has(e.target as string)
    );

    return { nodes: finalNodes, edges: filteredFinalEdges };
}


xxxxxxxxxxxxxxxxx

import type { NodeType, EdgeType, Software } from '../types';
import { getBinaryLabel } from '../services/JSONParser';
import { filterGraphCommon } from '../utils/common';

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
            label: compId,
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

        // 🔹 2.1 Veze dataservice ➔ linked_software (povezujemo samo na točan software na računalima user grupe)
        for (const swId of linkedSoftware) {
            const targetCpeIdn = extractCpeIdn(swId);
            let matchingSoftwareNode: NodeType | undefined = undefined;

            // ➔ Traži software node na računalu user grupe
            for (const [compId, comp] of Object.entries(inputJson.computers || {}) as [string, any][]) {
                const installed = comp.installed_software || {};

                for (const [installedSwId, s] of Object.entries(installed) as [string, any][]) {
                    if (s.cpe_idn !== targetCpeIdn) continue;
                    if (Number(s.person_index) !== 0) continue;

                    // ➔ Provjeri je li person_group_id softvera isti kao jedan od person_groups dataservice
                    const swPersonGroupId = s.person_group_id || '';
                    const dataserviceHasMatchingGroup = personGroups.includes(swPersonGroupId);

                    if (!dataserviceHasMatchingGroup) continue;

                    // ➔ Software node mora biti već u grafu
                    if (!nodeIndex[installedSwId]) continue;

                    matchingSoftwareNode = nodeIndex[installedSwId];

                    // ➔ Dodaj edge dataservice -> software (povezujemo točno na taj node)
                    if (!edgeExists(edges, dsId, installedSwId)) {
                        edges.push({
                            id: `edge-${dsId}-${installedSwId}`,
                            source: dsId,
                            target: installedSwId,
                            type: 'dataservice-software'
                        });
                    }

                    break; // ➔ našli smo validno povezivanje, izlazimo iz petlje softwarea
                }

                if (matchingSoftwareNode) break; // ➔ našli smo validno povezivanje, izlazimo iz petlje computera
            }

            if (!matchingSoftwareNode) {
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
    const filtered = filterGraphCommon({ nodes, edges }, selectedGroup, selectedTypes);

    console.log("ALL NODES:", nodes);
    console.log("FILTERED NODES:", filtered.nodes);

    return filtered;
}



