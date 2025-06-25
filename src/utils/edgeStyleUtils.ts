/**
 * Pomoćne funkcije za stilizaciju i označavanje bridova u grafu.
 *
 * - `getEdgeStyle`: definira stil bridova na temelju tipa čvorova ili njihovih ikona.
 *   Koristi se za vizualno razlikovanje vrsta veza (npr. korisnik ↔ računalo, računalo ↔ softver).
 *
 * - `getEdgeLabel`: vraća oznaku (labelu) bridova ovisno o tipu izvorišnog i odredišnog čvora.
 *
 * Ove funkcije se koriste u komponenti grafa (npr. Reagraph) za prikaz dodatnih
 * informacija i razlikovanje bridova u vizualizaciji modela IT sustava.
 */

import type { ResolvedEdge } from './graphUtils';
import type { EdgeType, NodeType } from '../types';

export function getEdgeStyle(edge: EdgeType, nodes: NodeType[]) {
  const sourceNode = nodes.find(n => n.id === edge.source);
  const targetNode = nodes.find(n => n.id === edge.target);

  console.log('getEdgeStyle:', { edge, sourceNode, targetNode });

  // Po icon propertyju
  const sourceIcon = sourceNode?.icon;
  const targetIcon = targetNode?.icon;

  if (
    (sourceIcon === '/icons/user.png' && targetIcon === '/icons/computer.png') ||
    (sourceIcon === '/icons/computer.png' && targetIcon === '/icons/user.png')
  ) {
    return { strokeDasharray: '6 4', stroke: '#888', strokeWidth: 2 };
  }

  if (
    (sourceIcon === '/icons/computer.png' && targetIcon === '/icons/binary.png') ||
    (sourceIcon === '/icons/binary.png' && targetIcon === '/icons/computer.png')
  ) {
    return { stroke: 'red', strokeWidth: 2 };
  }

  // Po type propertyju (ako nemaš icon)
  const sourceType = sourceNode?.type;
  const targetType = targetNode?.type;

  if (
    (sourceType === 'user' && targetType === 'computer') ||
    (sourceType === 'computer' && targetType === 'user')
  ) {
    return { strokeDasharray: '6 4', stroke: '#888', strokeWidth: 2 };
  }

  if (
    (sourceType === 'computer' && targetType === 'binary') ||
    (sourceType === 'binary' && targetType === 'computer')
  ) {
    return { stroke: 'red', strokeWidth: 2 };
  }

  return { stroke: '#aaa', strokeWidth: 1 };
}

export function getEdgeLabel(edge: ResolvedEdge) {
  const sourceType = edge.source.type;
  const targetType = edge.target.type;

  if (
    (sourceType === 'user' && targetType === 'computer') ||
    (sourceType === 'computer' && targetType === 'user')
  ) {
    return 'User Interaction';
  }

  if (
    (sourceType === 'computer' && targetType === 'software') ||
    (sourceType === 'software' && targetType === 'computer')
  ) {
    return 'Software Interaction';
  }

  return '';
}