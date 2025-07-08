import type { GraphDataWithResolvedEdges } from './graphUtils';

export function exportGraphData(layoutedData: GraphDataWithResolvedEdges, filename = 'edited-graph.json') {
  const jsonString = JSON.stringify(layoutedData, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
