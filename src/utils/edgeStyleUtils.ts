/**
 * Pomoćne funkcije za stilizaciju i označavanje bridova u grafu.
 *
 *   Koristi se za vizualno razlikovanje vrsta veza (npr. korisnik ↔ računalo, računalo ↔ softver).
 *
 * - `getEdgeLabel`: vraća oznaku (labelu) bridova ovisno o tipu izvorišnog i odredišnog čvora.
 *
 * Ove funkcije se koriste u komponenti grafa (npr. Reagraph) za prikaz dodatnih
 * informacija i razlikovanje bridova u vizualizaciji modela IT sustava.
 */

import type { ResolvedEdge } from './graphUtils';
import type { EdgeType, NodeType } from '../types';

function extractFullCpeIdn(fullName: string): string {
  return fullName.includes('>') ? fullName.split('>').pop() || '' : fullName;
}

export function getGraphConfig(viewMode: string) {
  const commonEdgeStyle = (edge: EdgeType, allNodes: NodeType[]) => {
    const sourceNode = allNodes.find(n => n.id === edge.source);
    const targetNode = allNodes.find(n => n.id === edge.target);

    if (!sourceNode || !targetNode) {
      return { strokeWidth: 1, opacity: 1, arrowPosition: 'end' };
    }

    switch (viewMode) {
      case 'landscape':
        if (
          (sourceNode.type === 'user' && targetNode.type === 'computer') ||
          (sourceNode.type === 'computer' && targetNode.type === 'user')
        ) {
          return { strokeWidth: 1, opacity: 1, arrowPosition: 'end' };
        }
        break;

      case 'firewalls':
        if (
          (sourceNode.type === 'computer' && targetNode.type === 'software') ||
          (sourceNode.type === 'software' && targetNode.type === 'computer')
        ) {
          return { strokeWidth: 1, opacity: 1, arrowPosition: 'end' };
        }
        break;

      case 'credentials':
        if (
          (sourceNode.type === 'key' || sourceNode.type === 'lock') &&
          targetNode.type === 'computer'
        ) {
          return { strokeWidth: 2, opacity: 1, arrowPosition: 'mid' };
        }
        // ➡️ Sve ostale veze u credentials prikazu
        return { strokeWidth: 1, opacity: 1, arrowPosition: 'end' };

      case 'dataservices':
        if (
          (sourceNode.type === 'user' && targetNode.type === 'dataservice') ||
          (sourceNode.type === 'dataservice' && targetNode.type === 'user')
        ) {
          return { strokeWidth: 1, opacity: 1, arrowPosition: 'nend' };
        }
        break;
    }

    // Default ➔ no arrow + linear
    return { strokeWidth: 1, opacity: 1, arrowPosition: 'end' };
  };

  return {
    edgeStyle: commonEdgeStyle
  };
}


export function getEdgeSize(edge: EdgeType | ResolvedEdge, nodes: NodeType[], viewMode: string) {
  const sourceId = typeof edge.source === 'string' ? edge.source : edge.source.id;
  const targetId = typeof edge.target === 'string' ? edge.target : edge.target.id;

  const sourceNode = nodes.find(n => n.id === sourceId);
  const targetNode = nodes.find(n => n.id === targetId);

  if (!sourceNode || !targetNode) return 1;

  // ➡️ Ako je user uključen, debljina = 1
  if (sourceNode.type === 'user' || targetNode.type === 'user') {
    return 1;
  }

  // ➡️ Primjeri za dataservices prikaz
  if (viewMode === 'dataservices') {
    if (
      sourceNode.type === 'dataservice' &&
      targetNode.type === 'software'
    ) {
      const principalId = sourceNode.meta?.originalDataservice?.principal_software;
      const targetFullName = targetNode.fullName || targetNode.id;
      const targetCpeIdn = extractFullCpeIdn(targetFullName);

      // ➡️ Ako je targetNode upravo principal_software ovog dataservice ➔ debljina 4
      if (principalId && targetCpeIdn && targetCpeIdn === principalId) {
        return 2;
      }
    }
  }

  // ➡️ Primjeri za specifične veze u credentials prikaz
  if (viewMode === 'credentials') {
    if (
      (sourceNode.type === 'key' || sourceNode.type === 'lock') &&
      targetNode.type === 'computer'
    ) {
      return 2;
    }
  }

  return 1;
}


export function getEdgeLabelDirect(edge: EdgeType | ResolvedEdge, nodes: NodeType[], viewMode?: string) {
  let sourceNode: NodeType | undefined;
  let targetNode: NodeType | undefined;

  if (typeof edge.source === 'string') {
    sourceNode = nodes.find(n => n.id === edge.source);
  } else {
    sourceNode = edge.source;
  }

  if (typeof edge.target === 'string') {
    targetNode = nodes.find(n => n.id === edge.target);
  } else {
    targetNode = edge.target;
  }

  if (!sourceNode || !targetNode) return '';

  // FIREWALLS: computer ↔ software
  if (viewMode === 'firewalls') {
    if (
      (sourceNode.type === 'computer' && targetNode.type === 'software') ||
      (sourceNode.type === 'software' && targetNode.type === 'computer')
    ) {
      return { strokeWidth: 1, opacity: 1, arrowPosition: 'none' };
    }
  }

  
  // 🔹 Default: user
  if (sourceNode.type === 'user') {
    return sourceNode.label || sourceNode.id;
  }

  if (targetNode.type === 'user') {
    return targetNode.label || targetNode.id;
  }

  return '';
}
