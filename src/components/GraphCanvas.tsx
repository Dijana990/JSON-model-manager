/**
 * GraphCanvasComponent.tsx
 * ------------------------
 * Glavna komponenta za prikaz grafa pomoću Reagraph biblioteke.
 *
 * Funkcionalnosti:
 * - Renderira graf sa čvorovima i rubovima
 * - Omogućuje filtriranje po grupama i tipovima
 * - Omogućuje zoom to group i export grafa
 * - Povezuje se s ComputerEditorPanel i NodeInfoPanel za uređivanje čvorova
 *
 * Props:
 * @param {GraphData} data - Ulazni podaci grafa
 * @param {any} inputJson - Originalni JSON za parsiranje
 * @param {Function} onNodeClick - Callback za klik na čvor
 * @param {'landscape' | 'firewalls' | 'dataservices' | 'credentials'} viewMode - Trenutni prikaz grafa
 * @param {string} selectedGroup - Trenutno odabrana grupa
 * @param {Dispatch<SetStateAction<string>>} setSelectedGroup - Setter za odabir grupe
 * @param {Set<string>} selectedTypes - Set odabranih tipova čvorova
 * @param {Dispatch<SetStateAction<Set<string>>>} setSelectedTypes - Setter za odabir tipova čvorova
 */


import React, { useEffect, useRef, useState, useMemo } from 'react';
import { GraphCanvas } from 'reagraph';
import { useSelection } from 'reagraph';
import type { GraphData, NodeType, EdgeType } from '../types';
import { getEdgeSize, getGraphConfig } from '../utils/edgeStyleUtils';
import type { GraphDataWithResolvedEdges, ResolvedEdge } from '../utils/graphUtils';
import { getEdgeLabelDirect } from '../utils/edgeStyleUtils';
import { useSession } from '../context/SessionContext';
import { prepareGraph } from '../utils/prepareGraph';
import NodeInfoPanel from './NodeInfoPanel';
import ComputerDrawerPanel from './ComputerDrawerPanel';
import HoverPanel from './HoverPanel';
import { useGraphFilters } from '../hooks/useGraphFilters';
import { useZoomToGroup } from '../hooks/useZoomToGroup';
import { useResetStates } from '../hooks/useResetStates';
import { manualLayout, getDynamicLayoutConfig } from '../utils/layoutUtils';
import { exportGraphData } from '../utils/exportUtils';
import {
  resolveEdgeNodes,
  iconMap,
} from '../utils/graphUtils';
import { getAvailableGroups, getAvailableTypes, getRelevantNodesByGroup } from '../utils/common';
import FilterPanel from './FilterPanel';
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

  const { outputJson } = useSession();
  console.log("🗂️ Full outputJson in GraphCanvasComponent:", outputJson);

  const preparedData = useMemo(() => prepareGraph(data), [data]);
  
  const preparedResolved = resolveEdgeNodes({
    nodes: preparedData.nodes,
    edges: preparedData.edges as EdgeType[]
  });

const [layoutedData, setLayoutedData] = useState<GraphDataWithResolvedEdges>(preparedResolved);

  const [hoveredNode, setHoveredNode] = useState<NodeType | null>(null);
  const [selectedComputerId, setSelectedComputerId] = useState<string | null>(null);
  const [availableGroups, setAvailableGroups] = useState<string[]>([]);
  const [selectedNode, setSelectedNode] = useState<NodeType | null>(null);
  const [showFilterPanel, setShowFilterPanel] = useState(true);
  const timeoutRef = useRef<number | null>(null);



  useEffect(() => {
    // Cleanup timeout on component unmount
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  /**
 * Export funkcija: Preuzima trenutno layoutedData stanje grafa kao JSON file.
 */
  const handleExport = () => exportGraphData(layoutedData);

  // Hookovi na početku komponente
  const filteredData = useGraphFilters(preparedData, inputJson, viewMode, selectedGroup, selectedTypes);
  const layoutedNodes = manualLayout(filteredData.nodes);


  const mappedNodes = layoutedNodes.map(n => ({
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

  const nodeIds = new Set(mappedNodes.map(n => n.id));

  const validEdges: EdgeType[] = layoutedData.edges.filter(e => {
    const srcId = typeof e.source === 'string' ? e.source : e.source?.id;
    const tgtId = typeof e.target === 'string' ? e.target : e.target?.id;

    const valid = nodeIds.has(srcId) && nodeIds.has(tgtId);

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


  //  Postavi dostupne grupe prilikom učitavanja data
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

/**
 * useEffect: Postavlja dostupne grupe iz preparedData.nodes
 * Filtrira grupe koje započinju s 'network.internal.' za određene viewMode.
 */
  useEffect(() => {
    setLayoutedData({
      nodes: layoutedNodes,
      edges: filteredData.edges as any
    });
  }, [filteredData]);

  //  Resetiraj selectedGroup i selectedTypes prilikom promjene viewMode
  useResetStates(
    viewMode,
    setSelectedGroup,
    setSelectedTypes,
    setHoveredNode,
    setSelectedNode
  );

  useZoomToGroup(graphRef, selectedGroup, mappedNodes);


  //  Izračunaj availableTypes direktno u render funkciji (KONAČNA VERZIJA)
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


/**
 * Omogućuje selekciju ili deselekciju tipa čvora.
 *
 * @param {string} type - Tip čvora za toggle
 */
  const toggleType = (type: string) => {
    const newSet = new Set(selectedTypes);
    newSet.has(type) ? newSet.delete(type) : newSet.add(type);
    setSelectedTypes(newSet);
  };

  const { dynamicDistanceMin, dynamicCollideRadius, dynamicNodeStrength } =
    getDynamicLayoutConfig(selectedGroup, mappedNodes);

  //  Odredi hoće li se koristiti clusterAttribute
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
        <FilterPanel
          availableGroups={availableGroups}
          selectedGroup={selectedGroup}
          setSelectedGroup={setSelectedGroup}
          types={types}
          selectedTypes={selectedTypes}
          toggleType={toggleType}
          onClose={() => setShowFilterPanel(false)}
        />
      ) : (
        <button className={styles.showButton} onClick={() => setShowFilterPanel(true)}>Show Filters</button>
      )}



      <GraphCanvas
        key={`${viewMode}-${selectedGroup || 'all'}`}
        ref={graphRef}
        selections={selections}
        actives={actives}
        onNodePointerEnter={(node: NodeType) => { 
          setHoveredNode(node);
        }}
        onNodePointerLeave={() => {
          setHoveredNode(null);
        }}
        onNodeClick={(node: NodeType) => {
          handleSelectionNodeClick(node);
          if (node.type === 'computer') {
            setSelectedComputerId(node.id);
            setSelectedNode(node); // ➡️ postavi i selectedNode za ComputerEditorPanel
          } else {
            setSelectedNode(node);
            setSelectedComputerId(null);
          }
        }}
        onCanvasClick={(event: MouseEvent) => {
          handleSelectionCanvasClick(event);
          setHoveredNode(null);
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
            opacity: isActive || isHoveredEdge ? 1 : 0.2, //  fade out ostalih
            strokeWidth: isActive || isHoveredEdge ? 2 : 1
          };
        })}
        clusterAttribute={clusterAttribute}
        clusterType="treemap"
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
            visible: hoveredNode?.id === node.id, //  vidljivo samo za hoverani čvor
          },
          borderRadius: 12,
          padding: 6,
          cursor: 'pointer'
        })}
      />

      {/* COMPUTER EDITOR PANEL + SHIFT PANEL */}
{/*       {selectedComputerId && selectedNode?.type === 'computer' && (
        <>
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
              setSelectedComputerId(null);
              setSelectedNode(null);
            }}
            onCancel={() => {
              setSelectedComputerId(null);
              setSelectedNode(null);
            }}
          />
        </>
      )} */}

      {/* NODE INFO PANEL */}
      {selectedNode && selectedNode.type !== 'computer' && (
        <NodeInfoPanel
          selectedNode={selectedNode}
          viewMode={viewMode}
          validEdges={validEdges}
          mappedNodes={mappedNodes}
        />
      )}

      {/* DrawerPanel */}
      {selectedNode && selectedNode.type === 'computer' && (
        <ComputerDrawerPanel
          computers={mappedNodes.filter((n: NodeType) => n.type === 'computer')}
          selectedComputer={selectedNode}
          outputJson={outputJson}
          onSelectComputer={(node) => {
            setSelectedNode(node);
            graphRef.current?.centerNode(node.id);
          }}
          onSave={(updatedNode) => {
            // implement your update logic
            setSelectedNode(null);
          }}
          onCancel={() => setSelectedNode(null)}
        />      
      )}


      {/* HOVER PANEL */}
      {hoveredNode && (
        <HoverPanel hoveredNode={hoveredNode} />
      )}
    </div>
  );
};

export default GraphCanvasComponent;