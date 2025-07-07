import React, { useEffect, useRef, useState, useMemo } from 'react';
import { GraphCanvas } from 'reagraph';
import { useSelection, type GraphCanvasRef } from 'reagraph';
import type { GraphData, NodeType, EdgeType } from '../types';
import { getEdgeSize, getGraphConfig } from '../utils/edgeStyleUtils';
import type { GraphDataWithResolvedEdges, ResolvedEdge } from '../utils/graphUtils';
import { getEdgeLabelDirect } from '../utils/edgeStyleUtils';
import ComputerEditorPanel from './ComputerEditorPanel';
import { prepareGraph } from '../utils/prepareGraph';
import { filterFirewallsGraph } from '../graphModes/firewalls';
import { filterDataservicesGraph } from '../graphModes/dataservices';
import { filterCredentialsGraph } from '../graphModes/credentials';
import { filterLandscapeGraph } from '../graphModes/landscape';
import { parseJSONToGraph } from '../services/JSONParser';
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
  viewMode,
  selectedGroup,
  setSelectedGroup,
  selectedTypes,
  setSelectedTypes,
  onNodeClick: externalOnNodeClick
}) => {
 
  const graphRef = useRef<any>(null);

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

  const parsedGraph = useMemo(() => parseJSONToGraph(inputJson, inputJson, true), [inputJson]);
  const nodeIds = new Set(mappedNodes.map(n => n.id));

  const validEdges = layoutedData.edges.filter(e => {
    const srcId = typeof e.source === 'string' ? e.source : e.source?.id;
    const tgtId = typeof e.target === 'string' ? e.target : e.target?.id;
    
    const valid = nodeIds.has(srcId) && nodeIds.has(tgtId);
    if (!valid) {
      console.warn('Removing invalid edge with missing node', e);
    }
    return valid;
  });

  const {
    selections,
    actives,
    activeEdges,
    onNodeClick: handleSelectionNodeClick,
    onCanvasClick: handleSelectionCanvasClick
  } = useSelection({
    ref: graphRef,
    nodes: mappedNodes,
    edges: validEdges,
    pathSelectionType: 'all'
  });


  // ➡️ Postavi dostupne grupe prilikom učitavanja data
  useEffect(() => {
    setLayoutedData({
      nodes: preparedData.nodes,
      edges: preparedData.edges as any
    });

    setTimeout(() => graphRef.current?.zoomToFit?.(), 200);
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

  // ➡️ Resetiraj hoveredNode prilikom promjene viewMode
  useEffect(() => {
    setHoveredNode(null);
    setSelectedNode(null);
  }, [viewMode]);

  useEffect(() => {
    if (selectedGroup && graphRef.current) {
      // ➡️ Filtriraj nodeove iz odabrane grupe
      const groupNodes = mappedNodes.filter(n => n.group === selectedGroup);

      if (groupNodes.length > 0) {
        // ➡️ Izračunaj centar grupe (nije obavezno ako koristiš zoomToFit, ali možeš za custom zoom)
        const avgX = groupNodes.reduce((sum, n) => sum + (n.x || 0), 0) / groupNodes.length;
        const avgY = groupNodes.reduce((sum, n) => sum + (n.y || 0), 0) / groupNodes.length;

        // ➡️ Pomakni kameru na centar grupe (ako želiš custom centriranje)
        // graphRef.current?.setCamera({ x: avgX, y: avgY, zoom: 1.5 }); // alternativno

        // ➡️ Automatski zoomToFit da se svi nodeovi vide
        graphRef.current?.zoomToFit?.();

        // ➡️ Dinamički zoom faktor ovisno o veličini grupe
        const zoomFactor = groupNodes.length > 50 ? 1.2 : 1.5; // prilagodi prag i faktore po želji
        graphRef.current?.zoom?.(zoomFactor);
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
    console.error('Neki nodeovi nemaju group property!');
  }


  
  // ➡️ Dinamički layout distance i collide radius ovisno o veličini grupe
  const groupNodeCount = selectedGroup
    ? mappedNodes.filter(n => n.group === selectedGroup).length
    : mappedNodes.length;

  const dynamicDistanceMin = selectedGroup
    ? (groupNodeCount > 50
        ? 100     // ➡️ Velike grupe
        : groupNodeCount > 30
          ? 200   // ➡️ Srednje grupe
          : 200)  // ➡️ Male grupe
    : 1000;       // ➡️ ALL prikaz

  const dynamicCollideRadius = selectedGroup
    ? (groupNodeCount > 50
        ? 150     // ➡️ Velike grupe
        : groupNodeCount > 20
          ? 1   // ➡️ Srednje grupe
          : 150)  // ➡️ Male grupe
    : 1000;        // ➡️ ALL prikaz

  const dynamicNodeStrength = selectedGroup
    ? (groupNodeCount > 50
        ? -1000    // ➡️ Velike grupe all
        : groupNodeCount > 30
          ? -150  // ➡️ Srednje grupe network.1
          : -250) // ➡️ Male grupe network.2
    : -800;      // ➡️ ALL prikaz

  // ➡️ Odredi hoće li se koristiti clusterAttribute
  const enableClustering = !selectedGroup || selectedGroup === '';

  const clusterAttribute = enableClustering ? 'group' : undefined;
  const { edgeStyle } = getGraphConfig(viewMode);

  const [showAllLabels, setShowAllLabels] = useState(false);

  useEffect(() => {
    setShowAllLabels(false);
  }, []); // reset na mount

  useEffect(() => {
    setShowAllLabels(false);
  }, [data]); // reset na promjenu podataka


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
        ref={graphRef}
        selections={selections}
        actives={actives}
        onNodeClick={(node: NodeType) => {
          handleSelectionNodeClick(node);
          setSelectedNode(node);
          setShowAllLabels(true); // ➡️ Prikaži sve labele na klik

          if (node.type === 'computer') {
            setSelectedComputerId(node.id); // otvori editor panel
          } else {
            setSelectedComputerId(null); // zatvori editor panel
          }

          if (externalOnNodeClick) externalOnNodeClick(node); // pozovi prop ako postoji
        }}
        onCanvasClick={(event: MouseEvent) => {
          handleSelectionCanvasClick(event); // 🔹 useSelection cleanup

          setSelectedNode(null);
          setSelectedComputerId(null);
        }}
        nodes={mappedNodes}
        edges={validEdges.map((e) => {
          const isActive = activeEdges?.includes(e.id);
          const isHoveredEdge = hoveredNode && (
            (typeof e.source === 'string' ? e.source : e.source.id) === hoveredNode.id ||
            (typeof e.target === 'string' ? e.target : e.target.id) === hoveredNode.id
          );
          return {
            ...e,
            source: typeof e.source === 'string' ? e.source : e.source.id,
            target: typeof e.target === 'string' ? e.target : e.target.id,
            size: getEdgeSize(e, mappedNodes, viewMode),
            label: getEdgeLabelDirect(e, mappedNodes, viewMode),
            opacity: isActive || isHoveredEdge ? 1 : 0.2, // ➡️ fade out ostalih
            strokeWidth: isActive || isHoveredEdge ? 2 : 1
          };
        })}
        clusterAttribute={clusterAttribute}
        draggable
        labelType="nodes"
        edgeLabelPosition="inline"        
        layoutType="forceDirected2d"
        layoutOverrides={{
          distanceMin: dynamicDistanceMin,
          collideRadius: dynamicCollideRadius,
          nodeStrength: dynamicNodeStrength,
          clusterStrength: 1,
        }}
        edgeArrowPosition={viewMode === 'credentials' ? 'mid' : 'end'}
        getEdgeStyle={(edge: EdgeType) => {
          const style = edgeStyle(edge, mappedNodes);
          return {
            strokeWidth: style.strokeWidth,
            opacity: style.opacity,
            arrowPosition: style.arrowPosition,
          };
        }}
        nodeStyle={(node: NodeType) => ({
          icon: {
            url: node.icon || iconMap[node.type?.toLowerCase?.()] || '/icons/computer.png',
            size: 48
          },
          label: {
            text: node.label,
            /* color: '#5B88B2',
            fontSize: 16,
            visible: showAllLabels, */
            visible: hoveredNode?.id === node.id, // ➡️ vidljivo samo za hoverani čvor
          },
          borderRadius: 12,
          padding: 6,
          cursor: 'pointer'
        })}
        onNodePointerEnter={(node: NodeType) => {
          setHoveredNode(node);
          setShowAllLabels(true);
        }}

        onNodePointerLeave={() => {
          setHoveredNode(null);
          setShowAllLabels(false);
        }}
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