/**
 * GraphCanvas.tsx
 *
 * Glavna komponenta za prikaz i interakciju s grafom modeliranog IT sustava korištenjem Reagraph biblioteke.
 * Omogućuje korisniku filtriranje čvorova po grupi i tipu, prikaz virtualnih veza na temelju konteksta
 * te uređivanje podataka o čvorovima (posebno računalima) putem bočnog panela.
 *
 * Ključne funkcionalnosti:
 * - Prikaz grafa temeljen na ForceAtlas2 rasporedu
 * - Filtriranje čvorova po grupi (dropdown) i tipu (checkbox)
 * - Automatsko dodavanje virtualnih rubova ovisno o kontekstu selektiranih tipova
 * - Prikaz dodatnih informacija o čvorovima prilikom hovera i klika
 * - Uređivanje računala preko `ComputerEditorPanel` komponente (izmjena naziva, mreže, softvera)
 * - Pomicanje susjednih čvorova u 4 smjera oko odabranog računala
 * - Izvoz izmijenjenog grafa kao JSON datoteke
 *
 * Props:
 * - `data`: izvorni graf podataka (čvorovi i rubovi)
 * - `onNodeClick`: opcionalni callback koji se poziva pri kliku na čvor
 *
 * Interna stanja:
 * - `layoutedData`: trenutno prikazani graf s layout pozicijama
 * - `selectedGroup`, `selectedTypes`: aktivni filteri
 * - `selectedNode`, `hoveredNode`: za prikaz detalja i interakciju
 * - `selectedComputerId`: posebno se koristi za prikaz kontrola pomicanja
 *
 * TODO:
 * - Integrirati undo/redo mehanizam pri promjenama grafa
 * - Razdvojiti logiku za virtualne rubove u posebnu funkciju ili modul
 * - Dodati uređivanje i drugih tipova čvorova (npr. user, service)
 * - Povezati s globalnim stanjem grafa (ako aplikacija bude koristila centraliziranu pohranu)
 */



import React, { useEffect, useRef, useState, useMemo } from 'react';
import { GraphCanvas } from 'reagraph';
import type { GraphData, NodeType, EdgeType } from '../types';
import { getEdgeStyle, getEdgeLabel } from '../utils/edgeStyleUtils';
import type { GraphDataWithResolvedEdges } from '../utils/graphUtils';
import ComputerEditorPanel from './ComputerEditorPanel';
import { isResolvedEdge } from '../utils/graphUtils';
import { prepareGraph } from '../utils/prepareGraph';
import {
  applyForceAtlasLayout,
  resolveEdgeNodes,
  shiftConnectedNodes,
  getGroupColor,
  iconMap,
  simplifyGraph
} from '../utils/graphUtils';

// NOVO: landscape logika
import { filterLandscapeGraph } from '../graphModes/landscape';
import { getAvailableGroups, getAvailableTypes, getRelevantNodesByGroup } from '../utils/common';

interface GraphCanvasComponentProps {
  data: GraphData;
  onNodeClick?: (node: NodeType) => void;
}

const GraphCanvasComponent: React.FC<GraphCanvasComponentProps> = ({ data, onNodeClick }) => {
  const ref = useRef<any>(null);
  const preparedData = useMemo(() => prepareGraph(data), [data]);
  const [layoutedData, setLayoutedData] = useState<GraphDataWithResolvedEdges>(() => {
    const rawLayouted = applyForceAtlasLayout(preparedData);
    return rawLayouted;
  });
  const [hoveredNode, setHoveredNode] = useState<NodeType | null>(null);
  const [selectedComputerId, setSelectedComputerId] = useState<string | null>(null);
  const [availableGroups, setAvailableGroups] = useState<string[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string>('');
  const [availableTypes, setAvailableTypes] = useState<string[]>([]);
  const [selectedTypes, setSelectedTypes] = useState<Set<string>>(new Set());
  const [selectedNode, setSelectedNode] = useState<NodeType | null>(null);

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

  // Postavi dostupne grupe i tipove kad se promijeni data
  useEffect(() => {
    setAvailableGroups(getAvailableGroups(preparedData));
    const relevantNodes = getRelevantNodesByGroup(preparedData, selectedGroup);
    setAvailableTypes(getAvailableTypes(relevantNodes));
    const layouted = applyForceAtlasLayout(preparedData);
    setLayoutedData(layouted);
    setTimeout(() => ref.current?.zoomToFit?.(), 200);
  }, [data]);

  // Filtriraj i layoutaj graf kad se promijeni filter
  useEffect(() => {
    const { nodes, edges } = filterLandscapeGraph(preparedData, selectedGroup, selectedTypes);
    if (nodes.length === 0) {
      const layouted = applyForceAtlasLayout(preparedData);
      setLayoutedData(layouted);
      return;
    }
    const layouted = applyForceAtlasLayout({ nodes, edges });
    setLayoutedData(layouted);
  }, [selectedGroup, selectedTypes, preparedData]);

  // Omogući selekciju/deselekciju tipova (checkbox)
  const toggleType = (type: string) => {
    const newSet = new Set(selectedTypes);
    newSet.has(type) ? newSet.delete(type) : newSet.add(type);
    setSelectedTypes(newSet);
  };

  // Kad se promijeni grupa, ažuriraj dostupne tipove i očisti nevažeće selekcije
  useEffect(() => {
    const relevantNodes = getRelevantNodesByGroup(preparedData, selectedGroup);
    const types = getAvailableTypes(relevantNodes);
    setAvailableTypes(types);

    if (!selectedGroup) {
      setSelectedTypes(new Set());
    } else {
      setSelectedTypes((prev) => {
        const valid = new Set<string>();
        for (const t of prev) {
          if (types.includes(t)) valid.add(t);
        }
        return valid;
      });
    }
  }, [selectedGroup, preparedData]);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <div style={{ position: 'absolute', top: 10, left: 10, zIndex: 1000, background: '#fff', padding: '0.5rem', borderRadius: 8 }}>
        <label>Grupa: </label>
        <select value={selectedGroup} onChange={(e) => setSelectedGroup(e.target.value)}>
          <option value="">-- sve --</option>
          {availableGroups.map((g) => <option key={g} value={g}>{g}</option>)}
        </select>
        <div style={{ marginTop: '0.5rem' }}>
          <label>Tipovi:</label><br />
          {availableTypes.map((type) => (
            <label key={type} style={{ marginRight: '0.5rem' }}>
              <input type="checkbox" checked={selectedTypes.has(type)} onChange={() => toggleType(type)} />{' '}
              {type}
            </label>
          ))}

          <div style={{ marginTop: '0.5rem' }}>
            <button onClick={handleExport}>💾 Export JSON</button>
          </div>
        </div>
      </div>
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
            target: typeof e.target === 'string' ? e.target : e.target.id
          }))}
          draggable
          layoutType="forceDirected2d"
          // OVDJE: funkcija koja određuje strelicu po tipu veze
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
          nodeStyle={(node: NodeType) => ({
            fill: getGroupColor(node.group),
            icon: {
              url: node.icon || iconMap[node.type?.toLowerCase?.()] || '/icons/computer.png',
              size: 48
            },
            label: { color: '#2A2C34', fontSize: 16, fontWeight: 'bold' },
            borderRadius: 12, padding: 6, cursor: 'pointer'
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
      </>
      {selectedComputerId && (
        <div style={{ position: 'absolute', top: 10, right: 10, background: 'white', padding: '0.5rem', borderRadius: '8px', boxShadow: '0 0 6px rgba(0,0,0,0.2)', zIndex: 1000 }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.3rem' }}>
            <button onClick={() => {
              const updated = shiftConnectedNodes(simplifyGraph(layoutedData), selectedComputerId, 0, -100);
              setLayoutedData(resolveEdgeNodes(updated));
            }}>↑</button>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <button onClick={() => {
              const updated = shiftConnectedNodes(simplifyGraph(layoutedData), selectedComputerId, -100, 0);
              setLayoutedData(resolveEdgeNodes(updated));
            }}>←</button>
            <button onClick={() => {
              const updated = shiftConnectedNodes(simplifyGraph(layoutedData), selectedComputerId, 500, 0);
              setLayoutedData(resolveEdgeNodes(updated));
            }}>→</button>
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '0.3rem' }}>
            <button onClick={() => {
              const updated = shiftConnectedNodes(simplifyGraph(layoutedData), selectedComputerId, 0, 100);
              setLayoutedData(resolveEdgeNodes(updated));
            }}>↓</button>
          </div>
        </div>
      )}

      {selectedNode && (
        <div style={{
          position: 'absolute', right: 10, top: 10, background: '#fff',
          padding: '1rem', borderRadius: 8, zIndex: 1000, width: 300
        }}>
          <h3>{selectedNode.label}</h3>
          <p><strong>ID:</strong> {selectedNode.id}</p>
          <p><strong>Tip:</strong> {selectedNode.type}</p>
          {selectedNode.meta?.groupLabel && (
            <p><strong>Mreža:</strong> {selectedNode.meta.groupLabel}</p>
          )}
        </div>
      )}

      {hoveredNode && (
        <div style={{ position: 'absolute', left: 10, bottom: 10, background: 'white', padding: '0.5rem 1rem', borderRadius: '8px', boxShadow: '0 0 6px rgba(0,0,0,0.2)', zIndex: 1000 }}>
          <strong>{hoveredNode.fullName || hoveredNode.label}</strong><br />
          <small>ID: {hoveredNode.id}</small><br />
          <small>Tip: {hoveredNode.type}</small><br />
          <small>Mreža: {hoveredNode.meta?.groupLabel || hoveredNode.group || '—'}</small>
        </div>
      )}
    </div>
  );
};

export default GraphCanvasComponent;