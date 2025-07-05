import React, { useEffect, useRef, useState, useMemo } from 'react';
import { GraphCanvas } from 'reagraph';
import type { GraphData, NodeType, EdgeType } from '../types';
import { getEdgeStyle, getEdgeLabel } from '../utils/edgeStyleUtils';
import type { GraphDataWithResolvedEdges } from '../utils/graphUtils';
import ComputerEditorPanel from './ComputerEditorPanel';
import { prepareGraph } from '../utils/prepareGraph';
import { filterFirewallsGraph } from '../graphModes/firewalls';
import { filterDataservicesGraph } from '../graphModes/dataservices';
import { filterCredentialsGraph } from '../graphModes/credentials';
import { filterLandscapeGraph } from '../graphModes/landscape';
import GraphErrorBoundary from './GraphErrorBoundary';
import {
  isResolvedEdge,
  resolveEdgeNodes,
  shiftConnectedNodes,
  iconMap,
  simplifyGraph
} from '../utils/graphUtils';
import { getAvailableGroups, getAvailableTypes, getRelevantNodesByGroup } from '../utils/common';
import styles from './GraphCanvas.module.scss';

interface GraphCanvasComponentProps {
  data: GraphData;
  inputJson: any;
  onNodeClick?: (node: NodeType) => void;
  viewMode: 'landscape' | 'firewalls' | 'dataservices' | 'credentials';
  selectedGroup: string;
  setSelectedGroup: React.Dispatch<React.SetStateAction<string>>;
  selectedTypes: Set<string>;
  setSelectedTypes: React.Dispatch<React.SetStateAction<Set<string>>>;
}

function manualLayout(nodes: NodeType[]): NodeType[] {
  const spacingX = 500;
  const spacingY = 500;

  return nodes.map((node, index) => ({
    ...node,
    x: (index % 5) * spacingX, // 5 čvorova po redu
    y: Math.floor(index / 5) * spacingY,
    z: 0
  }));
}

const GraphCanvasComponent: React.FC<GraphCanvasComponentProps> = ({
  data,
  inputJson,
  onNodeClick,
  viewMode,
  selectedGroup,
  setSelectedGroup,
  selectedTypes,
  setSelectedTypes
}) => {
 
  const ref = useRef<any>(null);
  const preparedData = useMemo(() => prepareGraph(data), [data]);
  const [layoutedData, setLayoutedData] = useState<GraphDataWithResolvedEdges>({
    nodes: preparedData.nodes,
    edges: preparedData.edges as any // ili prilagodi tipizaciji ako treba
  });
  const [filteredData, setFilteredData] = useState<GraphData>({ nodes: [], edges: [] });
  const [hoveredNode, setHoveredNode] = useState<NodeType | null>(null);
  const [selectedComputerId, setSelectedComputerId] = useState<string | null>(null);
  const [availableGroups, setAvailableGroups] = useState<string[]>([]);
  const [selectedNode, setSelectedNode] = useState<NodeType | null>(null);
  const [showFilterPanel, setShowFilterPanel] = useState(true);
  const [isIdVisible, setIsIdVisible] = useState(false);
  const timeoutRef = useRef<number | null>(null);

  const handleMouseEnter = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsIdVisible(true);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = window.setTimeout(() => {
      setIsIdVisible(false);
    }, 2000);
  };

  useEffect(() => {
    // Cleanup timeout on component unmount
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const handleExport = () => {
    const jsonString = JSON.stringify(layoutedData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'edited-graph.json';
    link.click();
    URL.revokeObjectURL(url);
  };

  const mappedNodes = manualLayout(layoutedData.nodes).map(n => ({
    ...n,
    data: {
      ...n.data,
      group: typeof n.group === 'string'
        ? n.group
        : (typeof n.networkGroup === 'string'
            ? n.networkGroup
            : 'no-group')
    }
  }));

  // ➡️ Postavi dostupne grupe prilikom učitavanja data
  useEffect(() => {
    setLayoutedData({
      nodes: preparedData.nodes,
      edges: preparedData.edges as any
    });

    setTimeout(() => ref.current?.zoomToFit?.(), 200);
  }, [data]);

  useEffect(() => {
    // Uvijek koristi preparedData.nodes za dropdown
    const nodesToProcess = preparedData.nodes;

    let groups = getAvailableGroups({ nodes: nodesToProcess, edges: [] });

  if (viewMode === 'firewalls' || viewMode === 'landscape' || viewMode === 'dataservices') {
    groups = groups.filter(g => g && g.startsWith('network.internal.'));
  }

    setAvailableGroups(groups);
  }, [preparedData, viewMode]);

  // ➡️ Filtriraj i layoutaj graf kad se promijeni filter
  useEffect(() => {
    let filteredResult;

    if (viewMode === 'firewalls') {
      filteredResult = filterFirewallsGraph(preparedData, inputJson, selectedGroup, selectedTypes);
    } else if (viewMode === 'dataservices') {
      filteredResult = filterDataservicesGraph(inputJson, selectedGroup, selectedTypes);
    } else if (viewMode === 'credentials') {
      filteredResult = filterCredentialsGraph(inputJson, selectedGroup, selectedTypes);
    } else {
      filteredResult = filterLandscapeGraph(preparedData, selectedGroup, selectedTypes);
    }

    const { nodes, edges } = filteredResult;
    const layoutedNodes = manualLayout(nodes);
    setFilteredData({ nodes: layoutedNodes, edges });
    setLayoutedData({
      nodes,
      edges: edges as any // prilagodi tipizaciji ako treba
    });
  }, [viewMode, selectedGroup, selectedTypes, preparedData, inputJson]);

  // ➡️ Resetiraj selectedTypes prilikom promjene grupe
  useEffect(() => {
    setSelectedTypes(new Set());
  }, [selectedGroup]);

  // ➡️ Resetiraj selectedGroup i selectedTypes prilikom promjene viewMode
  useEffect(() => {
    setSelectedGroup("");
    setSelectedTypes(new Set());
  }, [viewMode]);

  useEffect(() => {
    if (selectedGroup && ref.current) {
      // ➡️ Filtriraj nodeove iz odabrane grupe
      const groupNodes = mappedNodes.filter(n => n.group === selectedGroup);

      if (groupNodes.length > 0) {
        // ➡️ Izračunaj centar grupe
        const avgX = groupNodes.reduce((sum, n) => sum + (n.x || 0), 0) / groupNodes.length;
        const avgY = groupNodes.reduce((sum, n) => sum + (n.y || 0), 0) / groupNodes.length;

        // ➡️ Pomakni kameru na centar grupe
        ref.current?.zoomToFit?.(); // 500 ili prilagodi zoom
      }
    }
  }, [selectedGroup, mappedNodes]);

  // ➡️ Izračunaj availableTypes direktno u render funkciji (KONAČNA VERZIJA)
  let types: string[] = [];

  if (viewMode === 'dataservices') {
    if (!selectedGroup) {
      types = getAvailableTypes(preparedData.nodes);
    } else {
      const groupNodes = preparedData.nodes.filter(n => n.group === selectedGroup);
      types = getAvailableTypes(groupNodes);
    }
  } else if (viewMode === 'firewalls') {
    types = getAvailableTypes(preparedData.nodes.filter(n => n.type !== 'internet'));
  } else if (viewMode === 'credentials') {
    if (!selectedGroup) {
      types = getAvailableTypes(preparedData.nodes);
    } else {
      const groupNodes = preparedData.nodes.filter(n => n.group === selectedGroup);
      types = getAvailableTypes(groupNodes);
    }
  } else {
    const relevantNodes = getRelevantNodesByGroup(preparedData, selectedGroup);
    types = getAvailableTypes(relevantNodes);
  }


  if (selectedGroup === 'internet') {
    types = types.filter(t => t === 'internet');
  } else {
    types = types.filter(t => t !== 'internet');
  }


  // ➡️ Omogući selekciju/deselekciju tipova (checkbox)
  const toggleType = (type: string) => {
    const newSet = new Set(selectedTypes);
    newSet.has(type) ? newSet.delete(type) : newSet.add(type);
    setSelectedTypes(newSet);
  };



  const allNodesHaveGroup = mappedNodes.every(n => typeof n.group === 'string');
  if (!allNodesHaveGroup) {
    console.error('❌ Neki nodeovi nemaju group property!');
  }

  const nodeIds = new Set(mappedNodes.map(n => n.id));


  const validEdges = layoutedData.edges.filter(e => {
    const srcId = typeof e.source === 'string' ? e.source : e.source?.id;
    const tgtId = typeof e.target === 'string' ? e.target : e.target?.id;
    const valid = nodeIds.has(srcId) && nodeIds.has(tgtId);
    if (!valid) {
      console.warn('⚠️ Removing invalid edge with missing node', e);
    }
    return valid;
  });

  // ➡️ Odredi hoće li se koristiti clusterAttribute
  const enableClustering = !selectedGroup || selectedGroup === '';

  const clusterAttribute = enableClustering ? 'group' : undefined;

  return (
    <div className={styles.container}>
      {showFilterPanel ? (
        <div className={styles.filterPanel}>
          <button className={styles.closeButton} onClick={() => setShowFilterPanel(false)}>✖</button>
          <h3 className={styles.mainTitle}>SELECT NODE</h3>
          <div className={styles.filterGroup}>
            <label>Group: </label>
            <select value={selectedGroup}
              onChange={(e) => setSelectedGroup(e.target.value)}>
              <option value="">-- all --</option>
              {availableGroups.map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>
          <div className={styles.filterTypes}>
            <label>Types:</label><br />
            {types.map((type) => (
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
      ) : (
        <button className={styles.showButton} onClick={() => setShowFilterPanel(true)}>Show Filters</button>
      )}

      <ComputerEditorPanel
        node={selectedNode}
        availableNetworks={availableGroups.filter(g => g.startsWith('network.internal.'))}
        onSave={(updatedNode) => {
          setLayoutedData((prev) => {
            const updatedNodes = prev.nodes.map((n) =>
              n.id === updatedNode.id ? updatedNode : n
            );
            const updatedEdges = prev.edges.map((e) => {
              const updateRef = (ref: typeof e.source | typeof e.target) => {
                if (typeof ref === 'string') return ref;
                return ref.id === updatedNode.id ? updatedNode : ref;
              };
              return {
                ...e,
                source: updateRef(e.source),
                target: updateRef(e.target)
              };
            });
            return {
              nodes: updatedNodes,
              edges: updatedEdges
            };
          });
          setSelectedNode(null);
        }}
        onCancel={() => setSelectedNode(null)}
      />

      <GraphCanvas
        key={`${viewMode}-${selectedGroup || 'all'}`}
        ref={ref}
        nodes={mappedNodes}
        edges={validEdges.map((e) => ({
          ...e,
          source: typeof e.source === 'string' ? e.source : e.source.id,
          target: typeof e.target === 'string' ? e.target : e.target.id
        }))}
        clusterAttribute={clusterAttribute}
        draggable
        layoutType="forceDirected2d"
        layoutOverrides={{
          distanceMin: 500, // default je često 1-20
          nodeStrength: -500, // negativno odbija čvorove, default je -30 ili slično
          collideRadius: 500, // veća vrijednost sprječava preklapanje
        }}
        edgeArrowPosition={(edge: EdgeType) =>
          edge.type === 'software-internet' || edge.type === 'internet-software'
            ? 'end'
            : 'none'
        }
        edgeStyle={(edge: EdgeType) => getEdgeStyle(edge, layoutedData.nodes)}

        
        edgeLabel={(edge: EdgeType) => {
          const resolvedEdge = layoutedData.edges.find(e => e.id === edge.id);
          if (!isResolvedEdge(resolvedEdge)) return '';
          return getEdgeLabel(resolvedEdge);
        }}
        nodeStyle={(node: NodeType) => {
            return {
              icon: {
                url: node.icon || iconMap[node.type?.toLowerCase?.()] || '/icons/computer.png',
                size: 48
              },
              label: {
                color: '#5B88B2',
                fontSize: 16,
                visible: selectedNode?.id === node.id || hoveredNode?.id === node.id
              },
              borderRadius: 12,
              padding: 6,
              cursor: 'pointer'
            };
        }}
        
        onNodeClick={(node: NodeType) => {
          setSelectedNode(node); // uvijek otvori node panel za ID i tip

          if (node.type === 'computer') {
            setSelectedComputerId(node.id); // ako je computer otvori i editor panel
          } else {
            setSelectedComputerId(null); // ako nije, zatvori editor panel
          }

          if (onNodeClick) onNodeClick(node);
        }}
        onCanvasClick={() => {
          setSelectedNode(null);
          setSelectedComputerId(null);
        }}
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
          <p>
            <strong>ID:</strong>{' '}
            <span
              className={isIdVisible ? `${styles.nodeId} ${styles.nodeIdVisible}` : styles.nodeId}
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
            >
              {selectedNode.fullName || selectedNode.id}
            </span>
          </p>
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