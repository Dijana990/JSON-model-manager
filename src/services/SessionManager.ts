import type { GraphData, NodeType, EdgeType } from '../types';

export const parseJSONToGraph = (json: any): GraphData => {
  const nodes: NodeType[] = [];
  const edges: EdgeType[] = [];

  const networkMap = new Map<string, NodeType>();

  json.networks?.forEach((network: any) => {
    const networkNode: NodeType = {
      id: network.idn,
      label: network.idn,
      type: 'network',
    };
    nodes.push(networkNode);
    networkMap.set(network.idn, networkNode);
  });

  json.computers?.forEach((comp: any) => {
    const nodeId = comp.idn;
    nodes.push({
      id: nodeId,
      label: comp.name || nodeId,
      type: 'computer',
    });

    if (comp.network) {
      edges.push({
        id: `${nodeId}--${comp.network}`,
        source: nodeId,
        target: comp.network,
        type: 'connection',
      });
    }
  });

  return { nodes, edges };
};

export const sampleGraph: GraphData = {
  nodes: [
    { id: 'comp1', label: 'Computer 1', type: 'computer' },
    { id: 'net1', label: 'Network 1', type: 'network' },
  ],
  edges: [
    { id: 'comp1--net1', source: 'comp1', target: 'net1', type: 'connection' },
  ],
};
