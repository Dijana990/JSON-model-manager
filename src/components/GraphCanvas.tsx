import React, { useEffect, useRef, useState, useMemo } from 'react';
import { GraphCanvas } from 'reagraph';
import type { GraphData, NodeType, EdgeType } from '../types';
import { getEdgeStyle, getEdgeLabel } from '../utils/edgeStyleUtils';
import { isResolvedEdge, shiftConnectedNodes, getGroupColor, iconMap, simplifyGraph, resolveEdgeNodes, applyForceAtlasLayout } from '../utils/graphUtils';
import { filterLandscapeGraph } from '../graphModes/landscape';
import { getAvailableGroups, getAvailableTypes, getRelevantNodesByGroup } from '../utils/common';
import ComputerEditorPanel from './ComputerEditorPanel';
import { prepareGraph } from '../utils/prepareGraph';
import styles from './GraphCanvas.module.scss';

interface GraphCanvasComponentProps {
  data: GraphData;
  onNodeClick?: (node: NodeType) => void;
}

const GraphCanvasComponent: React.FC<GraphCanvasComponentProps> = ({ data, onNodeClick }) => {
  const ref = useRef<any>(null);
  const preparedData = useMemo(() => prepareGraph(data), [data]);
  const [layoutedData, setLayoutedData] = useState(applyForceAtlasLayout(preparedData));
  const [hoveredNode, setHoveredNode] = useState<NodeType | null>(null);
  const [selectedComputerId, setSelectedComputerId] = useState<string | null>(null);
  const [availableGroups, setAvailableGroups] = useState<string[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string>('');
  const [availableTypes, setAvailableTypes] = useState<string[]>([]);
  const [selectedTypes, setSelectedTypes] = useState<Set<string>>(new Set());
  const [selectedNode, setSelectedNode] = useState<NodeType | null>(null);

  useEffect(() => {
    setAvailableGroups(getAvailableGroups(preparedData));
    const relevantNodes = getRelevantNodesByGroup(preparedData, selectedGroup);
    setAvailableTypes(getAvailableTypes(relevantNodes));
    setLayoutedData(applyForceAtlasLayout(preparedData));
    setTimeout(() => ref.current?.zoomToFit?.(), 200);
  }, [data]);

  useEffect(() => {
    const { nodes, edges } = filterLandscapeGraph(preparedData, selectedGroup, selectedTypes);
    const layouted = nodes.length === 0 ? applyForceAtlasLayout(preparedData) : applyForceAtlasLayout({ nodes, edges });
    setLayoutedData(layouted);
  }, [selectedGroup, selectedTypes, preparedData]);

  useEffect(() => {
    const relevantNodes = getRelevantNodesByGroup(preparedData, selectedGroup);
    const types = getAvailableTypes(relevantNodes);
    setAvailableTypes(types);
    if (!selectedGroup) {
      setSelectedTypes(new Set());
    } else {
      setSelectedTypes((prev) => {
        const valid = new Set<string>(); 
        for (const t of prev) if (types.includes(t)) valid.add(t);
        return valid;
      });
    }
  }, [selectedGroup, preparedData]);

  const toggleType = (type: string) => {
    const newSet = new Set(selectedTypes);
    newSet.has(type) ? newSet.delete(type) : newSet.add(type);
    setSelectedTypes(newSet);
  };
  
  return (
    <div className={styles.container}>
      <div className={styles.filterPanel}>
        <h3 className={styles.mainTitle}>SELECT NODE</h3>
        <div className={styles.filterGroup}>
          <label>Group: </label>
          <select value={selectedGroup} onChange={(e) => setSelectedGroup(e.target.value)}>
            <option value="">-- all --</option>
            {availableGroups.map((g) => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
        </div>
        <div className={styles.filterTypes}>
          <label>Types:</label><br />
          {availableTypes.map((type) => (
            <label key={type}>
              <input
                type="checkbox"
                checked={selectedTypes.has(type)}
                onChange={() => toggleType(type)}
              />{' '}
              {type}
            </label>
          ))}
        </div>
      </div>

      <ComputerEditorPanel
        node={selectedNode}
        availableNetworks={availableGroups.filter((g) => g.startsWith('network.internal.'))}
        onSave={(updatedNode) => {
          setLayoutedData((prev) => {
            const updatedNodes = prev.nodes.map((n) =>
              n.id === updatedNode.id ? updatedNode : n
            );
            const updatedEdges = prev.edges.map((e) => {
              const updateRef = (ref: typeof e.source | typeof e.target) =>
                typeof ref === 'string' ? ref : ref.id === updatedNode.id ? updatedNode : ref;

              return {
                ...e,
                source: updateRef(e.source),
                target: updateRef(e.target),
              };
            });
            return {
              nodes: updatedNodes,
              edges: updatedEdges,
            };
          });
          setSelectedNode(null);
        }}
        onCancel={() => setSelectedNode(null)}
      />

      <GraphCanvas
        ref={ref}
        nodes={layoutedData.nodes}
        edges={layoutedData.edges.map((e) => ({
          ...e,
          source: typeof e.source === 'string' ? e.source : e.source.id,
          target: typeof e.target === 'string' ? e.target : e.target.id,
        }))}
        draggable
        layoutType="forceDirected2d"
        edgeArrowPosition={(edge: EdgeType) =>
          edge.type === 'software-internet' || edge.type === 'internet-software' ? 'end' : 'none'
        }
        edgeStyle={(edge: EdgeType) => getEdgeStyle(edge, layoutedData.nodes)}
        edgeLabel={(edge: EdgeType) => {
          const resolvedEdge = layoutedData.edges.find((e) => e.id === edge.id);
          if (!isResolvedEdge(resolvedEdge)) return '';
          return getEdgeLabel(resolvedEdge);
        }}
        nodeStyle={(node: NodeType) => ({
          fill: getGroupColor(node.group),
          icon: {
            url: node.icon || iconMap[node.type?.toLowerCase?.()] || '/icons/computer.png',
            size: 48,
          },
          label: { color: '#5B88B2', fontSize: 16},
          borderRadius: 12,
          padding: 6,
          cursor: 'pointer',
        })}
        onNodeClick={(node: NodeType) => {
          if (node.type === 'computer') {
            setSelectedComputerId(node.id);
            setSelectedNode(node);
          } else {
            setSelectedNode(null);
          }
          if (onNodeClick) onNodeClick(node);
        }}
        onCanvasClick={() => setSelectedNode(null)}
        onNodePointerEnter={(node: NodeType) => setHoveredNode(node)}
        onNodePointerLeave={() => setHoveredNode(null)}
      />

      {selectedComputerId && (
        <div className={styles.shiftPanel}>
          <div className={styles.rowCenter}>
            <button onClick={() => {
              const updated = shiftConnectedNodes(simplifyGraph(layoutedData), selectedComputerId, 0, -100);
              setLayoutedData(resolveEdgeNodes(updated));
            }}>↑</button>
          </div>
          <div className={styles.rowBetween}>
            <button onClick={() => {
              const updated = shiftConnectedNodes(simplifyGraph(layoutedData), selectedComputerId, -100, 0);
              setLayoutedData(resolveEdgeNodes(updated));
            }}>←</button>
            <button onClick={() => {
              const updated = shiftConnectedNodes(simplifyGraph(layoutedData), selectedComputerId, 500, 0);
              setLayoutedData(resolveEdgeNodes(updated));
            }}>→</button>
          </div>
          <div className={styles.rowCenter}>
            <button onClick={() => {
              const updated = shiftConnectedNodes(simplifyGraph(layoutedData), selectedComputerId, 0, 100);
              setLayoutedData(resolveEdgeNodes(updated));
            }}>↓</button>
          </div>
        </div>
      )}

      {selectedNode && (
        <div className={styles.nodePanel}>
          <h3>{selectedNode.label}</h3>
          <p><strong>ID:</strong> {selectedNode.id}</p>
          <p><strong>TYPE:</strong> {selectedNode.type}</p>
          {selectedNode.meta?.groupLabel && (
            <p><strong>NETWORK:</strong> {selectedNode.meta.groupLabel}</p>
          )}
        </div>
      )}

      {hoveredNode && (
        <div className={styles.hoverPanel}>
          <strong>{hoveredNode.fullName || hoveredNode.label}</strong><br />
          <small>ID: {hoveredNode.id}</small><br />
          <small>TYPE: {hoveredNode.type}</small><br />
          <small>NETWORK: {hoveredNode.meta?.groupLabel || hoveredNode.group || '—'}</small>
        </div>
      )}
    </div>
  );
};

export default GraphCanvasComponent;
