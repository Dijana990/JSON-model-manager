import type { NodeType, EdgeType } from '../types';
import { filterGraphCommon } from '../utils/common';

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

    const isAdmin = credId.startsWith('admin');
    const isSvc = credId.startsWith('svc.');

    let showCredential = false;
    let nodeType = 'key';
    let nodeIcon = '/icons/key.png';

    // ➔ RULE 1: admin + hasRoot -> show lock with user + computer
    if (isAdmin && hasRoot) {
      showCredential = true;
      nodeType = 'lock';
      nodeIcon = '/icons/lock.png';
    } else if (isAdmin && !hasRoot) {
      // ➔ Admin bez has_root nikada se ne prikazuje
      showCredential = false;
      continue;
    }
    // ➔ RULE 2: non-admin + hasRoot + linked_employees includes 0 -> show lock with user + computer
    else if (!isAdmin && hasRoot) {
      const hasEmployee0 = linkedEmployees.some((emp: any) =>
        (Array.isArray(emp) && emp.includes(0)) || emp === 0
      );
      if (hasEmployee0) {
        showCredential = true;
        nodeType = 'lock';
        nodeIcon = '/icons/lock.png';
      }
    }
    // ➔ RULE 3: svc. + !hasRoot -> show key with computer only
    else if (isSvc && !hasRoot) {
      showCredential = true;
      nodeType = 'key';
      nodeIcon = '/icons/key.png';
    }
    // ➔ RULE 4: all other !hasRoot + linked_employees includes 0 -> show key with computer only
    else if (!hasRoot && !isSvc) {
      const hasEmployee0 = linkedEmployees.some((emp: any) =>
        (Array.isArray(emp) && emp.includes(0)) || emp === 0
      );
      if (hasEmployee0) {
        showCredential = true;
        nodeType = 'key';
        nodeIcon = '/icons/key.png';
      }
    }

    if (!showCredential) continue;

    // ➔ Add credential node
    const credNode: NodeType = {
      id: credId,
      label: '', // no label for lock/key
      fullName: credId,
      type: nodeType,
      icon: nodeIcon,
      group: 'credentials',
      meta: { originalCredential: cred }
    };
    nodes.push(credNode);
    nodeIndex[credId] = credNode;

    // 🔹 Add linked employees (users) ONLY for LOCK nodes (key nodes do NOT link to users)
    if (nodeType === 'lock' && linkedEmployees.length > 0) {
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
            group: 'users'
          };
          nodes.push(empNode);
          nodeIndex[empId] = empNode;
        }

        if (!edgeExists(edges, credId, empId)) {
          edges.push({
            id: `edge-${credId}-${empId}`,
            source: credId,
            target: empId,
            type: 'credential-user'
          });
        }
      }
    }

    // 🔹 Add stored_at (computers) for ALL node types
    for (const compId of storedAt) {
      if (!nodeIndex[compId]) {
        const compNode: NodeType = {
          id: compId,
          label: compId,
          fullName: compId,
          type: 'computer',
          icon: '/icons/computer.png',
          group: 'computers'
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
  }

  // 🔹 Filtriranje po group i type
  const filtered = filterGraphCommon({ nodes, edges }, selectedGroup, selectedTypes);

  console.log("ALL NODES:", nodes);
  console.log("FILTERED NODES:", filtered.nodes);

  return filtered;
}
xxxxxxxxxx bez software xxxxxxxxx
import type { NodeType, EdgeType } from '../types';
import { filterGraphCommon } from '../utils/common';

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

    const isAdmin = credId.startsWith('admin');
    const isSvc = credId.startsWith('svc.');

    let showCredential = false;
    let nodeType = 'key';
    let nodeIcon = '/icons/key.png';

    // ➔ RULE 1: admin + hasRoot -> show lock with user + computer
    if (isAdmin && hasRoot) {
      showCredential = true;
      nodeType = 'lock';
      nodeIcon = '/icons/lock.png';
    } else if (isAdmin && !hasRoot) {
      // ➔ Admin bez has_root nikada se ne prikazuje
      showCredential = false;
      continue;
    }
    // ➔ RULE 2: non-admin + hasRoot + linked_employees includes 0 -> show lock with user + computer
    else if (!isAdmin && hasRoot) {
      const hasEmployee0 = linkedEmployees.some((emp: any) =>
        (Array.isArray(emp) && emp.includes(0)) || emp === 0
      );
      if (hasEmployee0) {
        showCredential = true;
        nodeType = 'lock';
        nodeIcon = '/icons/lock.png';
      }
    }
    // ➔ RULE 3: svc. + !hasRoot -> show key with computer only
    else if (isSvc && !hasRoot) {
      showCredential = true;
      nodeType = 'key';
      nodeIcon = '/icons/key.png';
    }
    // ➔ RULE 4: all other !hasRoot + linked_employees includes 0 -> show key with computer only
    else if (!hasRoot && !isSvc) {
      const hasEmployee0 = linkedEmployees.some((emp: any) =>
        (Array.isArray(emp) && emp.includes(0)) || emp === 0
      );
      if (hasEmployee0) {
        showCredential = true;
        nodeType = 'key';
        nodeIcon = '/icons/key.png';
      }
    }

    if (!showCredential) continue;

    // ➔ Add credential node
    const credNode: NodeType = {
      id: credId,
      label: '', // no label for lock/key
      fullName: credId,
      type: nodeType,
      icon: nodeIcon,
      group: 'credentials',
      meta: { originalCredential: cred }
    };
    nodes.push(credNode);
    nodeIndex[credId] = credNode;

    // 🔹 Add linked employees (users)
    if (
      (nodeType === 'lock' && linkedEmployees.length > 0) || 
      (nodeType === 'key' && linkedEmployees.length > 0)
    ) {
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
            group: 'users'
          };
          nodes.push(empNode);
          nodeIndex[empId] = empNode;
        }

        if (!edgeExists(edges, credId, empId)) {
          edges.push({
            id: `edge-${credId}-${empId}`,
            source: credId,
            target: empId,
            type: 'credential-user'
          });
        }
      }
    }

    // 🔹 Add stored_at (computers) for ALL node types
    for (const compId of storedAt) {
      if (!nodeIndex[compId]) {
        const compNode: NodeType = {
          id: compId,
          label: compId,
          fullName: compId,
          type: 'computer',
          icon: '/icons/computer.png',
          group: 'computers'
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
      if (nodeType === 'key' && compId === 'None:0:2#3') {
        console.log("🔑 Added key node:", credId, "to computer:", compId);
      }
      if (nodeType === 'lock') {
        console.log("🔒 Added lock node:", credId, "to computer:", compId);
      }
    }
    
  }

  // 🔹 Filtriranje po group i type
  const filtered = filterGraphCommon({ nodes, edges }, selectedGroup, selectedTypes);

  console.log("ALL NODES:", nodes);
  console.log("FILTERED NODES:", filtered.nodes);

  return filtered;
}
xxxxxx sa neispravnim software xxxxxxx
import type { NodeType, EdgeType } from '../types';
import { filterGraphCommon } from '../utils/common';

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

    // ➔ RULE 1: admin + hasRoot -> show lock
    if (isAdmin && hasRoot) {
      showCredential = true;
      nodeType = 'lock';
      nodeIcon = '/icons/lock.png';
    } else if (isAdmin && !hasRoot) {
      continue; // ➔ skip admin without root
    }
    // ➔ RULE 2: non-admin + hasRoot + linked_employees includes 0
    else if (!isAdmin && hasRoot) {
      const hasEmployee0 = linkedEmployees.some((emp: any) =>
        (Array.isArray(emp) && emp.includes(0)) || emp === 0
      );
      if (hasEmployee0) {
        showCredential = true;
        nodeType = 'lock';
        nodeIcon = '/icons/lock.png';
      }
    }
    // ➔ RULE 3: svc. + !hasRoot
    else if (isSvc && !hasRoot) {
      showCredential = true;
    }
    // ➔ RULE 4: all other !hasRoot + linked_employees includes 0
    else if (!hasRoot && !isSvc) {
      const hasEmployee0 = linkedEmployees.some((emp: any) =>
        (Array.isArray(emp) && emp.includes(0)) || emp === 0
      );
      if (hasEmployee0) {
        showCredential = true;
      }
    }

    if (!showCredential) continue;

    // ➔ Add credential node
    const credNode: NodeType = {
      id: credId,
      label: '',
      fullName: credId,
      type: nodeType,
      icon: nodeIcon,
      group: 'credentials',
      meta: { originalCredential: cred }
    };
    nodes.push(credNode);
    nodeIndex[credId] = credNode;

    // 🔹 Add linked employees (users)
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
            group: 'users'
          };
          nodes.push(empNode);
          nodeIndex[empId] = empNode;
        }

        if (!edgeExists(edges, credId, empId)) {
          edges.push({
            id: `edge-${credId}-${empId}`,
            source: credId,
            target: empId,
            type: 'credential-user'
          });
        }
      }
    }

    // 🔹 Add stored_at (computers)
    for (const compId of storedAt) {
      if (!nodeIndex[compId]) {
        const compNode: NodeType = {
          id: compId,
          label: compId,
          fullName: compId,
          type: 'computer',
          icon: '/icons/computer.png',
          group: 'computers'
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

    // 🔹 Add linked software (if exists on storedAt computer and person_index=0)
    for (const compId of storedAt) {
      const comp = inputJson.computers?.[compId];
      if (!comp) continue;

      for (const swId of linkedSoftware) {
        const installedSw = comp.installed_software?.[swId];
        if (!installedSw || Number(installedSw.person_index) !== 0) continue;

        if (!nodeIndex[swId]) {
          const swNode: NodeType = {
            id: swId,
            label: swId,
            fullName: swId,
            type: 'software',
            icon: '/icons/binary.png',
            group: 'software'
          };
          nodes.push(swNode);
          nodeIndex[swId] = swNode;

          console.log("✅ Added software node:", swId, "for credential:", credId, "on computer:", compId);
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
  }

  // 🔹 Filter final output
  const filtered = filterGraphCommon({ nodes, edges }, selectedGroup, selectedTypes);

  return filtered;
}

xxxxx još uvijek loša logika za software xxxxx
import type { NodeType, EdgeType } from '../types';
import { filterGraphCommon } from '../utils/common';
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

    // ➔ RULES
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

    // ➔ Add credential node
    const credNode: NodeType = {
      id: credId,
      label: '',
      fullName: credId,
      type: nodeType,
      icon: nodeIcon,
      group: 'credentials',
      meta: { originalCredential: cred }
    };
    nodes.push(credNode);
    nodeIndex[credId] = credNode;

    // 🔹 Add linked employees
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
            group: 'users'
          };
          nodes.push(empNode);
          nodeIndex[empId] = empNode;
        }

        if (!edgeExists(edges, credId, empId)) {
          edges.push({
            id: `edge-${credId}-${empId}`,
            source: credId,
            target: empId,
            type: 'credential-user'
          });
        }
      }
    }

    // 🔹 Add stored_at (computers)

    for (const compId of storedAt) {
      const formattedCompLabel = formatServerId(compId);
      if (!nodeIndex[compId]) {
        const compNode: NodeType = {
          id: compId,
          label: formattedCompLabel,
          fullName: compId,
          type: 'computer',
          icon: '/icons/computer.png',
          group: 'computers'
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

  // 🔹 Check if credential id exists in stored_credentials of its stored_at computers
  for (const compId of storedAt) {
    const comp = inputJson.computers?.[compId];
    if (!comp) continue;

    const storedCredentials = comp.stored_credentials || [];

    // ➔ Ako credential postoji u stored_credentials ➔ dodaj software node
    if (storedCredentials.includes(credId)) {
      // ➔ Koristi normalizirani naziv kao softwareNodeId
      const normalizedLabel = getBinaryLabel({ idn: credId }); // koristi original credId za normalizaciju
      const softwareNodeId = `${compId}_${normalizedLabel}`; // ➔ jedinstveni ID po computer + naziv

      const comp = inputJson.computers?.[compId];
      const installedSw = comp?.installed_software?.[softwareNodeId];
      // ➔ Dodaj software node ako još nije dodan
      if (!nodeIndex[softwareNodeId]) {
        const swNode: NodeType = {
          id: softwareNodeId,
          label: normalizedLabel, // ➔ normalizirani naziv za prikaz
          fullName: credId, // ostavi credId kao fullName za praćenje
          type: 'software',
          icon: '/icons/binary.png',
          group: 'software'
        };
        nodes.push(swNode);
        nodeIndex[softwareNodeId] = swNode;

        console.log("✅ Added software node:", softwareNodeId, "for credential:", credId, "on computer:", compId);
      }

      // ➔ Dodaj edge credential ➔ software
      if (!edgeExists(edges, credId, softwareNodeId)) {
        edges.push({
          id: `edge-${credId}-${softwareNodeId}`,
          source: credId,
          target: softwareNodeId,
          type: 'credential-software'
        });
      }
    } else {
      console.log("❌ Credential", credId, "not found in stored_credentials of computer", compId);
    }
  }
  }

  // 🔹 Filter output
  const filtered = filterGraphCommon({ nodes, edges }, selectedGroup, selectedTypes);

  return filtered;
}

xxxxxx software valjda ok grupe ne valjaju xxxxxx

import type { NodeType, EdgeType } from '../types';
import { filterGraphCommon } from '../utils/common';
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

    // ➔ Add credential node
    const credNode: NodeType = {
      id: credId,
      label: '',
      fullName: credId,
      type: nodeType,
      icon: nodeIcon,
      group: 'credentials',
      meta: { originalCredential: cred }
    };
    nodes.push(credNode);
    nodeIndex[credId] = credNode;

    // 🔹 Add linked employees (users)
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
            group: 'users'
          };
          nodes.push(empNode);
          nodeIndex[empId] = empNode;
        }

        if (!edgeExists(edges, credId, empId)) {
          edges.push({
            id: `edge-${credId}-${empId}`,
            source: credId,
            target: empId,
            type: 'credential-user'
          });
        }
      }
    }

    // 🔹 Add stored_at (computers)
    for (const compId of storedAt) {
      const formattedCompLabel = formatServerId(compId);
      if (!nodeIndex[compId]) {
        const compNode: NodeType = {
          id: compId,
          label: formattedCompLabel,
          fullName: compId,
          type: 'computer',
          icon: '/icons/computer.png',
          group: 'computers'
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

      // ➔ ❗️Dodaj provjeru person_index === 0
      if (!installedSw || Number(installedSw.person_index) !== 0) continue;

      const normalizedLabel = getBinaryLabel(installedSw) || swId;

      const softwareNodeId = compId + "_" + normalizedLabel; // unique per computer + software

      // ➔ Add software node if not already added
      if (!nodeIndex[softwareNodeId]) {
        const swNode: NodeType = {
          id: softwareNodeId,
          label: normalizedLabel,
          fullName: swId,
          type: 'software',
          icon: '/icons/binary.png',
          group: 'software'
        };
        nodes.push(swNode);
        nodeIndex[softwareNodeId] = swNode;

        console.log("✅ Added software node:", softwareNodeId, "for credential:", credId, "on computer:", compId);
      }

      // ➔ Add edge from credential to software
      if (!edgeExists(edges, credId, softwareNodeId)) {
        edges.push({
          id: `edge-${credId}-${softwareNodeId}`,
          source: credId,
          target: softwareNodeId,
          type: 'credential-software'
        });
      }
    }
  }

  // 🔹 Filter final output
  const filtered = filterGraphCommon({ nodes, edges }, selectedGroup, selectedTypes);

  return filtered;
}
