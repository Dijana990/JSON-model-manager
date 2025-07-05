/**
 * Pomoćne funkcije i tipovi za pripremu i manipulaciju grafom u web aplikaciji.
 *
 * Ova datoteka sadrži:
 * - Tipove koji omogućuju rad s rubovima koji koriste reference na čvorove (za Reagraph)
 * - Funkcije za izračun layouta pomoću ForceAtlas2 algoritma
 * - Alate za pomicanje čvorova i vizualne prilagodbe (boje, ikone)
 * - Funkcionalnosti za pojednostavljenje grafa i rad s koordinatama
 *
 * Glavni cilj je pripremiti podatke u obliku koji očekuje Reagraph komponenta,
 * te omogućiti dodatne manipulacije poput pozicioniranja ili grupiranja čvorova.
 */

import Graph from 'graphology';
import forceAtlas2 from 'graphology-layout-forceatlas2';
import type { GraphData, NodeType, EdgeType } from '../types';


/**
 * Tip koji koristi eksplicitne reference na čvorove umjesto ID-eva u rubovima.
 * Koristi se za kompatibilnost s Reagraph komponentom.
 */
export type GraphDataWithResolvedEdges = {
  nodes: NodeType[];
  edges: ResolvedEdge[];
};
/**
 * Rub s referenciranim izvorom i odredištem kao objektima (ne samo ID).
 */
export type EdgeWithNodes = Omit<EdgeType, 'source' | 'target'> & {
  source: NodeType;
  target: NodeType;
};

/**
 * Pojednostavljuje strukturu grafa tako da iz svakog ruba uklanja reference na objekte
 * i vraća samo njihove ID-eve. Korisno za ponovno izvođenje layouta.
 */
export function simplifyGraph(data: GraphDataWithResolvedEdges): GraphData {
  return {
    nodes: data.nodes,
    edges: data.edges.map(edge => ({
      ...edge,
      source: edge.source.id,
      target: edge.target.id
    }))
  };
}

/**
 * Primjenjuje ForceAtlas2 layout algoritam na zadani graf.
 * - Izračunava pozicije čvorova (x, y).
 * - Povezuje rubove s referencama na stvarne čvorove (umjesto ID-eva).
 * - Ovo je potrebno za kompatibilnost sa Reagraph prikazom.
 */
/**
 * Vraća graf u kojem svaki rub koristi stvarne objekte čvorova
 * umjesto string ID-eva. Ovo je važno za Reagraph koji očekuje takav format.
 */
export function resolveEdgeNodes(data: GraphData): GraphDataWithResolvedEdges {
  const nodeMap = new Map(data.nodes.map(node => [node.id, node]));

  const resolvedEdges: ResolvedEdge[] = data.edges
    .map((edge) => {
      const sourceNode = nodeMap.get(edge.source);
      const targetNode = nodeMap.get(edge.target);
      if (!sourceNode || !targetNode) return null;

      return {
        ...edge,
        source: sourceNode,
        target: targetNode
      };
    })
    .filter((e): e is ResolvedEdge => !!e); // uklanja null i osigurava točan tip

  return {
    nodes: data.nodes,
    edges: resolvedEdges
  };
}

/**
 * Pomakni sve čvorove koji su povezani s danim `nodeId` u određenom smjeru.
 * Koristi se za ručno pozicioniranje povezanih elemenata.
 *
 * @param graphData - trenutni graf
 * @param nodeId - ID središnjeg čvora
 * @param shiftX - pomak u X smjeru (default 300)
 * @param shiftY - pomak u Y smjeru (default 0)
 */
export function shiftConnectedNodes(graphData: GraphData, nodeId: string, shiftX = 300, shiftY = 0): GraphData {
  const graph = new Graph();
  graphData.nodes.forEach((node) => graph.addNode(node.id));
  graphData.edges.forEach((edge) => graph.addEdge(edge.source, edge.target));
  // Pronađi sve susjedne čvorove
  const group = new Set<string>();
  group.add(nodeId);
  graph.forEachNeighbor(nodeId, (neighbor) => group.add(neighbor));
  // Pomakni grupu
  const updatedNodes = graphData.nodes.map((node) =>
    group.has(node.id)
      ? { ...node, x: (node.x || 0) + shiftX, y: (node.y || 0) + shiftY }
      : node
  );

  return {
    nodes: updatedNodes,
    edges: graphData.edges
  };
}

/**
 * Na temelju naziva grupe vraća zadanu boju.
 * Koristi se za stilizaciju čvorova u prikazu.
 */
/**
 * Mapiranje tipova čvorova u odgovarajuće ikone.
 * Ključno za vizualni prikaz u Reagraph komponenti (ikone pored čvorova).
 */
export const iconMap: Record<string, string> = {
  user: '/icons/user.png',
  'user-service': '/icons/customer.png',
  lock: '/icons/lock.png',
  key: '/icons/key.png',
  computer: '/icons/computer.png',
  binary: '/icons/binary.png',
  database: '/icons/database.png',
  internet: '/icons/internet.png',
  service: '/icons/service.png',
  software: '/icons/binary.png',
  customer: '/icons/customer.png'
};

export type ResolvedEdge = Omit<EdgeType, 'source' | 'target'> & {
  source: NodeType;
  target: NodeType;
};

export function isResolvedEdge(edge: any): edge is ResolvedEdge {
  return typeof edge.source === 'object' && typeof edge.target === 'object';
}