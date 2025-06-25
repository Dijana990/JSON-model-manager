import type { GraphData, NodeType, EdgeType } from '../types';

function getCustomerLabel(binaryLabel: string): string {
  switch (binaryLabel) {
    case "Office": return "Office";
    case "Outlook": return "EmailClient";
    case "Firefox": return "Browser";
    case "Financial App Client": return "Finance";
    case "Remote Administration Tools": return "Admin";
    case "Visual Studio 2019": return "Dev:Windows";
    case "SQL Server 2019": return "Database";
    case "Internet Banking Server": return "Banking";
    case "Exchange Server": return "EmailServer";
    case "Windows Server 2016": return "Server:Windows";
    case "Financial App Server": return "FinApp";
    default: return binaryLabel;
  }
}

function getBinaryLabel(sw: any): string {
  let name = sw?.name?.trim() || '';
  const cpe = sw?.cpe_idn || '';
  const idn = sw?.idn || '';
  let source = name || cpe || idn;

  let extracted = source.split(/[:\/]/).pop() || source;
  extracted = extracted.split('#')[0];
  let norm = extracted.replace(/_/g, ' ').toLowerCase();

  if (norm.includes('sql server 2019') || norm.includes('sql_server:2019') || (norm.includes('sql server') && norm.includes('2019')))
    return 'SQL Server 2019';
  if (norm.includes('internet banking')) return 'Internet Banking Server';
  if (norm.includes('exchange server')) return 'Exchange Server';
  if (norm.includes('windows server')) return 'Windows Server 2016';
  if (norm.includes('iis')) return 'IIS';
  if (norm.includes('.net')) return '.NET Framework';
  if (norm.includes('active directory')) return 'Microsoft Active Directory';
  if (cpe.includes('remote_administration_tools')) return 'Remote Administration Tools';
  if (cpe.includes('visual_studio_2019')) return 'Visual Studio 2019';
  if (cpe.includes('fin_app_server')) return 'Financial App Server';

  if (cpe.includes('microsoft:office')) return 'Office';
  if (cpe.includes('microsoft:outlook')) return 'Outlook';
  if (cpe.includes('mozilla:firefox')) return 'Firefox';
  if (cpe.includes('fin_app_client')) return 'Financial App Client';
  if (cpe.includes('internet_banking_server')) return 'Internet Banking Server';
  if (cpe.includes('exchange_server')) return 'Exchange Server';
  if (cpe.includes('windows_server_2016')) return 'Windows Server 2016';
  if (cpe.includes('sql_server:2019')) return 'SQL Server 2019';
  if (cpe.includes('microsoft:active_directory')) return 'Microsoft Active Directory';
  if (norm.includes('remote administration tools')) return 'Remote Administration Tools';
  if (norm.includes('visual studio 2019')) return 'Visual Studio 2019';
  if (norm.includes('fin_app_server')) return 'Financial App Server';

  return extracted || source;
}

// ✅ Nova pomoćna funkcija – je li softver OS bez korisničkih servisa
function isUnwantedOperatingSystem(sw: any): boolean {
  const cpe = sw?.cpe_idn || '';
  const label = getBinaryLabel(sw).toLowerCase();

  const isOS = cpe.startsWith('cpe:/o:');
  const isKnownServer = label.includes('server') || label.includes('exchange') || label.includes('banking');
  const hasUserServices = sw?.provides_user_services?.length > 0;

  return isOS && !hasUserServices && !isKnownServer;
}

function formatServerId(rawCompId: string): string {
  if (rawCompId.startsWith('None')) {
    return 'server.' + rawCompId.replace(/^None:/, '').replace(/:/g, '.').replace(/#/g, '.');
  }
  return rawCompId.replace(/:/g, '.').replace(/#/g, '.');
}

function getGroupFromNode(id: string, type: string): string {
  if (type === 'computer') {
    if (id === 'None:0:0') return 'server-00';
    if (id.startsWith('None:')) return 'servers';
    return 'users';
  }
  if (type === 'user') return 'users';
  return 'default';
}

export function parseJSONToGraph(json: any, inputJson?: any): GraphData {
  if (!json?.computers || typeof json.computers !== 'object') {
    console.warn('Neispravan ili prazan JSON: nedostaju "computers"');
    return { nodes: [], edges: [] };
  }

  const nodes: NodeType[] = [];
  const edges: EdgeType[] = [];
  const nodeIndex: Record<string, NodeType> = {};

  const globalDependencyIds = new Set<string>();
  for (const comp of Object.values(json.computers) as any[]) {
    if (!comp?.installed_software || typeof comp.installed_software !== 'object') continue;
    for (const sw of Object.values(comp.installed_software) as any[]) {
      for (const depId of sw?.local_dependencies || []) {
        globalDependencyIds.add(depId);
      }
    }
  }

  const referencedServices = new Set<string>();
  if (inputJson?.data_collections) {
    for (const dc of inputJson.data_collections) {
      for (const srv of dc.services || []) {
        referencedServices.add(srv.toLowerCase());
      }
    }
  }

  const roles = new Set<string>();
  if (inputJson?.employee_groups) {
    for (const group of Object.values(inputJson.employee_groups) as any[]) {
      for (const role of Object.keys(group)) {
        roles.add(role);
      }
    }
  }

  for (const role of roles) {
    const roleId = `user-${role}`;
    if (!nodeIndex[roleId]) {
      nodeIndex[roleId] = {
        id: roleId,
        label: role,
        fullName: role,
        type: 'user',
        icon: '/icons/user.png',
        group: getGroupFromNode(roleId, 'user')
      };
      nodes.push(nodeIndex[roleId]);
    }
  }

  for (const [rawCompId, comp] of Object.entries(json.computers) as [string, any][]) {
    if (!comp || typeof comp !== 'object') continue;

    let personId: string | undefined;
    let validSoftwareIds: string[] = [];

    if (comp.installed_software && typeof comp.installed_software === 'object') {
      for (const [swId, sw] of Object.entries(comp.installed_software) as [string, any][]) {
        if (!sw || typeof sw !== 'object') continue;
        const isUserMachineSoftware = sw.person_index === 0;
        const isNetworkSoftware = sw.provides_network_services?.length > 0;
        if (isUserMachineSoftware || isNetworkSoftware) {
          validSoftwareIds.push(swId);
          if (isUserMachineSoftware && !personId && sw.person_group_id) {
            personId = sw.person_group_id;
          }
        }
      }
    }

    const hasPerson = !!personId;
    const isServer = !hasPerson && comp.provides_network_services?.length > 0;
    const compId = isServer ? formatServerId(rawCompId) : rawCompId;
    const compLabel = compId.replace(/^None/, 'server').replace(/:/g, '.');

    const rawNetworkIds = comp.network_idn;
    const networkIds = Array.isArray(rawNetworkIds) ? rawNetworkIds : rawNetworkIds !== undefined ? [rawNetworkIds] : [];
    const networkGroup = networkIds.length > 0 ? `network.internal.${networkIds.join('_')}` : 'no-network';

    if (!hasPerson && validSoftwareIds.length === 0 && !isServer) continue;

    if (!nodeIndex[compId]) {
      nodeIndex[compId] = {
        id: compId,
        label: compLabel,
        fullName: compId,
        type: 'computer',
        icon: '/icons/computer.png',
        group: networkGroup,
        meta: {
          network_ids: networkIds,
          groupLabel: networkIds.join(', ')
        }
      };
      nodes.push(nodeIndex[compId]);
    }

    if (hasPerson && personId) {
      const userNodeId = `user-${personId}`;
      if (nodeIndex[userNodeId]) {
        edges.push({ id: `edge-${compId}-${userNodeId}`, source: compId, target: userNodeId, type: 'computer-user' });
      } else {
        if (!nodeIndex[personId]) {
          nodeIndex[personId] = {
            id: personId,
            label: personId,
            fullName: personId,
            type: 'person',
            icon: '/icons/user.png',
            group: getGroupFromNode(personId, 'person')
          };
          nodes.push(nodeIndex[personId]);
        }
        edges.push({ id: `edge-${compId}-${personId}`, source: compId, target: personId, type: 'computer-person' });
      }
    }

    for (const swId of validSoftwareIds) {
      const sw = comp.installed_software[swId];
      if (!sw || typeof sw !== 'object') continue;
      if (isUnwantedOperatingSystem(sw)) continue;

      const binaryLabel = getBinaryLabel(sw);
      const binaryFullName = sw.name || sw.idn || sw.cpe_idn || swId;
      const binaryLabelLower = binaryLabel.toLowerCase();

      if (!binaryLabel || binaryLabelLower === 'internet_connection') continue;

      const providesValidService = (sw.provides_network_services || []).some((srv: string) => {
        const norm = srv.trim().toLowerCase();
        return norm.length > 0 && isNaN(Number(norm)) && !norm.includes('connection');
      });
      const isReferenced = referencedServices.has(binaryLabelLower);

      const isDotNetFramework = binaryLabelLower.includes('.net framework') || binaryLabelLower.includes('4.8');

      let shouldIncludeSoftwareNode = isDotNetFramework ? (providesValidService || isReferenced) : (hasPerson || providesValidService || isReferenced);
      if (!shouldIncludeSoftwareNode) continue;

      if (!nodeIndex[swId]) {
        nodeIndex[swId] = {
          id: swId,
          label: binaryLabel,
          fullName: binaryFullName,
          type: 'software',
          icon: '/icons/binary.png',
          group: getGroupFromNode(swId, 'software')
        };
        nodes.push(nodeIndex[swId]);
      }

      edges.push({ id: `edge-${compId}-${swId}`, source: compId, target: swId, type: 'computer-software' });

      if (hasPerson) {
        const customerLabel = getCustomerLabel(binaryLabel);
        const customerId = `${customerLabel}-${swId}`;
        if (!nodeIndex[customerId]) {
          nodeIndex[customerId] = {
            id: customerId,
            label: customerLabel,
            fullName: customerLabel,
            type: 'user-service',
            icon: '/icons/customer.png',
            group: getGroupFromNode(customerId, 'user-service')
          };
          nodes.push(nodeIndex[customerId]);
        }
        edges.push({ id: `edge-${swId}-${customerId}`, source: swId, target: customerId, type: 'software-user-service' });
      }

      for (const serviceName of sw.provides_network_services || []) {
        const serviceId = `${serviceName}-${swId}`;
        if (!nodeIndex[serviceId]) {
          nodeIndex[serviceId] = {
            id: serviceId,
            label: serviceName,
            fullName: serviceName,
            type: 'service',
            icon: '/icons/service.png',
            group: getGroupFromNode(serviceId, 'service')
          };
          nodes.push(nodeIndex[serviceId]);
        }
        edges.push({ id: `edge-${swId}-${serviceId}`, source: swId, target: serviceId, type: 'software-service' });
      }
    }

    if (isServer && (!comp.installed_software || validSoftwareIds.length === 0)) {
      for (const serviceName of comp.provides_network_services || []) {
        const serviceId = `${serviceName}-${compId}`;
        if (!nodeIndex[serviceId]) {
          nodeIndex[serviceId] = {
            id: serviceId,
            label: serviceName,
            fullName: `${serviceName}-${compId}`,
            type: 'service',
            icon: '/icons/service.png',
            group: getGroupFromNode(serviceId, 'service')
          };
          nodes.push(nodeIndex[serviceId]);
        }
        edges.push({ id: `edge-${compId}-${serviceId}`, source: compId, target: serviceId, type: 'computer-service' });
      }
    }
  }

  const uniqueGroups = [...new Set(nodes.map(node => node.group))];
  const groupCount = uniqueGroups.length;
  const groupCoordinates = new Map<string, { x: number; y: number }>();
  const radius = 800 * groupCount;

  uniqueGroups.forEach((group, index) => {
    if (!group) return;
    const angle = (index / groupCount) * 2 * Math.PI;
    groupCoordinates.set(group, {
      x: radius * Math.cos(angle),
      y: radius * Math.sin(angle)
    });
  });

  const nodesWithCoordinates = nodes.map(node => {
    const coords = node.group ? groupCoordinates.get(node.group) : undefined;
    if (!coords) return node;
    return { ...node, x: coords.x + (Math.random() * 200 - 100), y: coords.y + (Math.random() * 200 - 100) };
  });

  return { nodes: nodesWithCoordinates, edges };
}
