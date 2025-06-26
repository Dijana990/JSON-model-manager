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