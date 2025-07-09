import type { NodeType, EdgeType } from '../types';
import { filterGraphCredentialsCustom } from '../utils/common';
import { getBinaryLabel, formatServerId } from '../services/JSONParser';

function edgeExists(edges: EdgeType[], source: string, target: string) {
  return edges.some(e => e.source === source && e.target === target);
}

export function filterCredentialsGraph(
  inputJson: any,
  selectedGroup: string = '',
  selectedTypes: Set<string> = new Set()
): { nodes: NodeType[]; edges: EdgeType[] } {
  const nodes: NodeType[] = [];
  const edges: EdgeType[] = [];
  const nodeIndex: Record<string, NodeType> = {};
  for (const [credId, cred] of Object.entries(inputJson.credentials || {}) as [string, any][]) {
    const hasRoot = cred.has_root || false;
    const linkedEmployees = cred.linked_employees || [];
    const storedAt = cred.stored_at || [];
    const linkedSoftware = cred.linked_software || [];

    const isAdmin = credId.startsWith('admin');
    const isSvc = credId.startsWith('svc.');

    let showCredential = false;
    let nodeType = 'key';
    let nodeIcon = '/icons/key.png';

    // ➔ RULES for showing credential node
    if (isAdmin && hasRoot) {
      showCredential = true;
      nodeType = 'lock';
      nodeIcon = '/icons/lock.png';
    } else if (isAdmin && !hasRoot) {
      continue;
    } else if (!isAdmin && hasRoot) {
      const hasEmployee0 = linkedEmployees.some((emp: any) =>
        (Array.isArray(emp) && emp.includes(0)) || emp === 0
      );
      if (hasEmployee0) {
        showCredential = true;
        nodeType = 'lock';
        nodeIcon = '/icons/lock.png';
      }
    } else if (isSvc && !hasRoot) {
      showCredential = true;
    } else if (!hasRoot && !isSvc) {
      const hasEmployee0 = linkedEmployees.some((emp: any) =>
        (Array.isArray(emp) && emp.includes(0)) || emp === 0
      );
      if (hasEmployee0) {
        showCredential = true;
      }
    }

    if (!showCredential) continue;
    // ✅ ➔ Odredi group za credential node na temelju network_idn storedAt computera
    let credGroup = 'no-network';
    if (storedAt.length > 0) {
      const compId = storedAt[0];
      const comp = inputJson.computers?.[compId];
      const networkIds = comp?.network_idn || [];
      if (networkIds.length > 0) {
        credGroup = `network.internal.${networkIds.join('_')}`;
      }
    }

    // ➔ Izračunaj shortCredLabel prije korištenja
    const shortCredLabel = credId.split('@')[0].split(':').pop()?.split('#')[0] || credId;

    // ➔ Add credential node s grupom + meta.credentialGroup
    const credNode: NodeType = {
      id: credId,
      label: (nodeType === 'key' || nodeType === 'lock') ? '' : shortCredLabel,
      fullName: credId,
      type: nodeType,
      icon: nodeIcon,
      group: credGroup,
      meta: {
        originalCredential: cred,
        credentialGroup: 'credentials' // oznaka za stilizaciju ili filtere
      }
    };
    nodes.push(credNode);
    nodeIndex[credId] = credNode;

    // 🔹 Add linked employees (users) with correct edge direction
    if (linkedEmployees.length > 0) {
      for (const emp of linkedEmployees) {
        const empId = Array.isArray(emp) ? emp[0] : emp;
        if (!empId) continue;

        if (!nodeIndex[empId]) {
          const empNode: NodeType = {
            id: empId,
            label: empId,
            fullName: empId,
            type: 'user',
            icon: '/icons/user.png',
            group: ''
          };
          nodes.push(empNode);
          nodeIndex[empId] = empNode;
        }

        if (nodeType === 'key' && !edgeExists(edges, credId, empId)) {
          edges.push({
            id: `edge-${credId}-${empId}`,
            source: credId,
            target: empId,
            type: 'user-key'
          });
        }

        if (nodeType === 'lock' && isAdmin && !edgeExists(edges, empId, credId)) {
          edges.push({
            id: `edge-${empId}-${credId}`,
            source: empId,
            target: credId,
            type: 'user-lock'
          });
        }
      }
    }

    // 🔹 Add stored_at (computers)
    for (const compId of storedAt) {
      const comp = inputJson.computers?.[compId];
      const networkIds = comp?.network_idn || [];
      const credGroup = networkIds.length > 0 ? `network.internal.${networkIds.join('_')}` : 'no-network';

      if (!nodeIndex[compId]) {
        const compNode: NodeType = {
          id: compId,
          label: formatServerId(compId),
          fullName: compId,
          type: 'computer',
          icon: '/icons/computer.png',
          group: credGroup
        };
        nodes.push(compNode);
        nodeIndex[compId] = compNode;
      } 

      if (!edgeExists(edges, credId, compId)) {
        edges.push({
          id: `edge-${credId}-${compId}`,
          source: credId,
          target: compId,
          type: 'credential-computer'
        });
      }
    }

    // 🔹 Add linked_software nodes (shown on their actual computers)
    for (const swId of linkedSoftware) {
      const compId = swId.split('>')[0];
      const comp = inputJson.computers?.[compId];
      if (!comp) continue;

      const installedSw = comp.installed_software?.[swId];
      if (!installedSw || Number(installedSw.person_index) !== 0) continue;

      const normalizedLabel = getBinaryLabel(installedSw) || swId;

      const networkIds = comp?.network_idn || [];
      const swGroup = networkIds.length > 0 ? `network.internal.${networkIds.join('_')}` : 'no-network';
      
      if (!nodeIndex[swId]) {
        const swNode: NodeType = {
          id: swId, 
          label: normalizedLabel,
          fullName: swId,
          type: 'software',
          icon: '/icons/binary.png',
          group: swGroup
        };
        nodes.push(swNode);
        nodeIndex[swId] = swNode;
      }

      if (!edgeExists(edges, credId, swId)) {
        edges.push({
          id: `edge-${credId}-${swId}`,
          source: credId,
          target: swId,
          type: 'credential-software'
        });
      }
    }
  }

    // ➡️ Nakon filtriranja osnovnih nodeova, filtriraj po tipu (omogući kombinirani prikaz kao u landscape)
  if (selectedTypes && selectedTypes.size > 0) {
    // Prikaži sve čvorove koji su u selectedTypes
    const typeFilteredNodes = nodes.filter(n => selectedTypes.has(n.type));
    const nodeIds = new Set(typeFilteredNodes.map(n => n.id));
    
    // Prikaži sve rubove koji povezuju bilo koja dva prikazana čvora
    const typeFilteredEdges = edges.filter(e => {
      const srcId = typeof e.source === 'string' ? e.source : e.source.id;
      const tgtId = typeof e.target === 'string' ? e.target : e.target.id;
      return nodeIds.has(srcId) && nodeIds.has(tgtId);
    });
    nodes.length = 0;
    edges.length = 0;
    nodes.push(...typeFilteredNodes);
    edges.push(...typeFilteredEdges);
  }

  if (!nodes.some(n => n.type === 'key' || n.type === 'lock')) {
    // 🔹 Add virtual user-software edges based on installed_software.person_group_id
    for (const comp of Object.values(inputJson.computers || {}) as any[]) {
      const installedSoftware = comp.installed_software || {};

      for (const [swId, sw] of Object.entries(installedSoftware) as [string, any][]) {
        const personGroupId = sw.person_group_id;
        if (!personGroupId) continue;
        if (Number(sw.person_index) !== 0) continue;

        // ➔ Pronađi userNode u nodes prema person_group_id (možda treba prefiks ako ih generiraš kao user-${personGroupId})
        const userNode = nodes.find(n =>
          n.type === 'user' &&
          (n.id === personGroupId || n.id === `user-${personGroupId}`)
        );

        // ➔ Pronađi softwareNode po fullName (u credential view sw.id može biti compId_label, pa koristi includes)
        const swNode = nodes.find(n =>
          n.type === 'software' &&
          (n.fullName === swId || n.id.includes(swId))
        );

        if (userNode && swNode && !edgeExists(edges, userNode.id, swNode.id)) {
          edges.push({
            id: `edge-${userNode.id}-${swNode.id}`,
            source: userNode.id,
            target: swNode.id,
            type: 'user-software-virtual'
          });
        }
      }
    }

    // 🔹 Add virtual computer-software edges
    for (const node of nodes) {
      if (node.type !== 'software') continue;

      const swNode = node;
      const compIdPart = swNode.id.split('_')[0];
      const compNode = nodeIndex[compIdPart];

      if (compNode && compNode.type === 'computer' && !edgeExists(edges, compNode.id, swNode.id)) {
        edges.push({
          id: `edge-${compNode.id}-${swNode.id}`,
          source: compNode.id,
          target: swNode.id,
          type: 'computer-software-virtual'
        });
      }
    }
  }
    
  // 🔹 Filter final output
  const filtered = filterGraphCredentialsCustom({ nodes, edges }, selectedGroup);
  return filtered;
}
