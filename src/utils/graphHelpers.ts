/**
 * graphHelpers.ts
 * -----------------------
 * Sadrži pomoćne funkcije za dohvat informacija o čvorovima i vezama u grafu.
 */


import type { EdgeType, NodeType } from '../types';

/**
 * Dohvati usera koji koristi softver (ako postoji).
 */
export const getSoftwareUser = (
  softwareId: string,
  validEdges: EdgeType[]
): string | null => {
  const compEdge = validEdges.find(e =>
    e.type === 'computer-software' &&
    ((typeof e.target === 'string' && e.target === softwareId) ||
     (typeof e.target === 'object' && e.target.id === softwareId))
  );

  if (!compEdge) return null;

  const computerId = typeof compEdge.source === 'string' ? compEdge.source : compEdge.source.id;

  const userEdge = validEdges.find(e =>
    e.type === 'user-computer' &&
    ((typeof e.target === 'string' && e.target === computerId) ||
     (typeof e.target === 'object' && e.target.id === computerId))
  );

  if (!userEdge) return null;

  return typeof userEdge.source === 'string' ? userEdge.source : userEdge.source.id;
};

/**
 * Parsiraj CPE string u vendor, product, version.
 */
export const parseCpe = (
  cpeString: string
): { vendor: string; product: string; version: string } => {
  const cpe = cpeString.split('>')[1] || cpeString; // ako ima prefix poput None:0:0>
  const parts = cpe.split(':');

  const vendor = parts[2] || 'Unknown';
  const product = parts[3] || 'Unknown';
  const version = parts[4] || 'N/A';

  return { vendor, product, version };
};

/**
 * Dohvati providera za service (može biti softver ili računalo).
 */
export const getServiceProvider = (
  serviceId: string,
  validEdges: EdgeType[]
): { type: 'software' | 'computer'; id: string } | null => {
  const edge = validEdges.find(e =>
    (e.type === 'software-service' || e.type === 'computer-service') &&
    ((typeof e.target === 'string' && e.target === serviceId) ||
     (typeof e.target === 'object' && e.target.id === serviceId))
  );

  if (!edge) return null;

  const sourceId = typeof edge.source === 'string' ? edge.source : edge.source.id;
  const sourceType = edge.type === 'software-service' ? 'software' : 'computer';

  return { type: sourceType, id: sourceId };
};

/**
 * Dohvati računalo na kojem je instaliran softver.
 */
export const getSoftwareComputer = (
  softwareId: string,
  validEdges: EdgeType[]
): string | null => {
  const edge = validEdges.find(e =>
    e.type === 'computer-software' &&
    ((typeof e.target === 'string' && e.target === softwareId) ||
     (typeof e.target === 'object' && e.target.id === softwareId))
  );

  if (!edge) return null;

  return typeof edge.source === 'string' ? edge.source : edge.source.id;
};

/**
 * Parsiraj software ID iz user-service ID-a.
 */
export const parseSoftwareIdFromUserServiceId = (
  userServiceId: string
): string | null => {
  const parts = userServiceId.split('>');
  if (parts.length < 2) return null;
  const swPart = parts[1].split('#')[0];
  return swPart || null;
};


export function cleanDuplicateLabel(label: string | undefined): string {
  if (!label) return '';
  const mid = Math.floor(label.length / 2);
  const firstHalf = label.slice(0, mid);
  const secondHalf = label.slice(mid);
  // Ako je string duplo isti (npr. 'abcabc')
  if (firstHalf === secondHalf) {
    return firstHalf;
  }
  // Ako je string oblika 'xxx xxx' (razdvojeno razmakom)
  const words = label.split(' ');
  const halfWords = Math.floor(words.length / 2);
  if (halfWords > 0 && words.slice(0, halfWords).join(' ') === words.slice(halfWords).join(' ')) {
    return words.slice(0, halfWords).join(' ');
  }
  // Ako je string oblika 'aaa aaa' bez razmaka
  const regex = /^(.+)\1$/;
  const match = label.match(regex);
  if (match) {
    return match[1];
  }
  return label;
}

/**
 * Dohvati verziju softvera iz NodeType.
 */
export const getSoftwareVersion = (softwareNode: NodeType): string => {
  const cpe = softwareNode.meta?.originalSoftware?.cpe_idn || softwareNode.fullName || softwareNode.id;
  const parts = cpe.split(':');

  if (parts.length >= 5) {
    const version = parts[4];
    return version || 'N/A';
  }

  return 'N/A';
};

export function shortenDataserviceLabel(label: string): string {
  if (!label) return '';
  if (label.includes(':')) {
    const parts = label.split(':');
    const last = parts.pop();
    const first = parts.join(':');
    return `${first}:${last}`;
  }
  if (label.includes('#')) {
    return label.split('#')[0];
  }
  return label;
}

export function extractUserIdFromSwId(swId: string): string | null {
  if (swId.startsWith('None')) return null;
  return swId.split('>')[0] || null;
}