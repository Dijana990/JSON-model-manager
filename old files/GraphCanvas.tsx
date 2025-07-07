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

// Definicija očekivanih props-a: ulazni graf i callback za klik na čvor
interface GraphCanvasComponentProps {
  data: GraphData; // osnovni skup čvorova i veza
  onNodeClick?: (node: NodeType) => void;
}

const GraphCanvasComponent: React.FC<GraphCanvasComponentProps> = ({ data, onNodeClick }) => {
  const ref = useRef<any>(null);
  // Priprema grafa (npr. dodavanje virtualnih veza) memoizirana kako bi se izbjegla nepotrebna rekalkulacija
  const preparedData = useMemo(() => prepareGraph(data), [data]);
  // Inicijalno generiranje layouta pomoću ForceAtlas2 algoritma i rješavanje ID referenci u rubovima
  const [layoutedData, setLayoutedData] = useState<GraphDataWithResolvedEdges>(() => {
    const rawLayouted = applyForceAtlasLayout(preparedData);
    return rawLayouted;
  });
  const [hoveredNode, setHoveredNode] = useState<NodeType | null>(null);
  const [selectedComputerId, setSelectedComputerId] = useState<string | null>(null);
  // Dropdown filtriranje po grupi
  const [availableGroups, setAvailableGroups] = useState<string[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string>('');
  // Checkbox filtriranje po tipu
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

  useEffect(() => {
    const preparedData = prepareGraph(data); // generira dodatne (virtualne) rubove
    // Izvlači sve postojeće grupe čvorova osim 'default'
    const groups = Array.from(
      new Set(
        preparedData.nodes
          .map(n => n.group)
          .filter((g): g is string => !!g && !['default', 'users'].includes(g))
      )
    );
    setAvailableGroups(groups);

    let relevantNodes = preparedData.nodes;
    if (selectedGroup) {
      relevantNodes = preparedData.nodes.filter(n => n.group === selectedGroup);
    }

    const types = Array.from(
      new Set(relevantNodes.map(n => n.type).filter((t): t is string => !!t))
    );
    setAvailableTypes(types);
     // Rekalkulacija layouta i veza
    const layouted = applyForceAtlasLayout(preparedData);
    setLayoutedData(layouted);
    setTimeout(() => ref.current?.zoomToFit?.(), 200);
  }, [data]);
  // Filtrira čvorove na temelju grupe i tipa te po potrebi dodaje virtualne rubove između njih.
  // Osigurava da se svi povezani čvorovi u kontekstu odabrane grupe uključe u prikaz.
  const filterGraph = () => {
    let filteredNodes = preparedData.nodes;

    // 1. Filtriraj po grupi
    if (selectedGroup) {
      const groupNodeIds = new Set(
        preparedData.nodes
          .filter((n: NodeType) => n.group === selectedGroup)
          .map((n) => n.id)
      );
      const relatedNodeIds = new Set<string>(groupNodeIds);

      let added = true;
      while (added) {
        added = false;
        preparedData.edges.forEach((edge: EdgeType) => {
          if (relatedNodeIds.has(edge.source) && !relatedNodeIds.has(edge.target)) {
            relatedNodeIds.add(edge.target);
            added = true;
          }
          if (relatedNodeIds.has(edge.target) && !relatedNodeIds.has(edge.source)) {
            relatedNodeIds.add(edge.source);
            added = true;
          }
        });
      }

      filteredNodes = preparedData.nodes.filter((n: NodeType) => relatedNodeIds.has(n.id));
    }

    // 2. Filtriraj po tipovima
    if (selectedTypes.size > 0) {
      filteredNodes = filteredNodes.filter((n: NodeType) =>
          selectedTypes.has(n.type)
      );
    }
    
    // 3. Filtriraj rubove koji povezuju samo aktivne čvorove
    const filteredIds = new Set(filteredNodes.map((n: NodeType) => n.id));
    const filteredEdges = preparedData.edges.filter(
      (e: EdgeType) => filteredIds.has(e.source) && filteredIds.has(e.target)
    );

    const extraEdges: EdgeType[] = [];
    const addedEdgeIds = new Set<string>();

    // Dodaj user → software (ako nema computer)
    if (
      selectedTypes.has('user') &&
      selectedTypes.has('software') &&
      !selectedTypes.has('computer')
    ) {
      filteredNodes.forEach((user) => {
        if (user.type !== 'user') return;
        const userIdShort = user.id.replace(/^user-/, '');
        filteredNodes.forEach((soft) => {
          if (soft.type === 'software' && soft.id.startsWith(userIdShort)) {
            const id = `virtual-${user.id}-${soft.id}`;
            const alreadyExists = preparedData.edges.some(
              (e) => e.source === user.id && e.target === soft.id
            );
            if (!alreadyExists && !addedEdgeIds.has(id)) {
              extraEdges.push({
                id,
                source: user.id,
                target: soft.id,
                type: 'user-software-virtual',
              });
              addedEdgeIds.add(id);
            }
          }
        });
      });
    }

    // Dodaj software → service
    if (selectedTypes.has('software')) {
      filteredNodes.forEach((soft) => {
        if (soft.type !== 'software') return;
        filteredNodes.forEach((s) => {
          if (
            (s.type === 'service' || s.type === 'user-service') &&
            s.id.includes(soft.id)
          ) {
            const id = `virtual-${soft.id}-${s.id}`;
            const alreadyExists = preparedData.edges.some(
              (e) => e.source === soft.id && e.target === s.id
            );
            if (!alreadyExists && !addedEdgeIds.has(id)) {
              extraEdges.push({ id, source: soft.id, target: s.id, type: 'software-sub-virtual' });
              addedEdgeIds.add(id);
            }
          }
        });
      });
    }

    // Dodaj user → user-service SAMO ako nema ni softvera ni računala
    if (
      selectedTypes.has('user') &&
      selectedTypes.has('user-service') &&
      !selectedTypes.has('software') &&
      !selectedTypes.has('computer')
    ) {
      filteredNodes.forEach(user => {
        if (user.type !== 'user') return;
        const userIdShort = user.id.replace(/^user-/, '');

        filteredNodes.forEach(us => {
          if (
            us.type === 'user-service' &&
            us.id.split('>')[0].includes(userIdShort)
          ) {
            const id = `virtual-${user.id}-${us.id}`;
            const alreadyExists = preparedData.edges.some(
              e => e.source === user.id && e.target === us.id
            );
            if (!alreadyExists && !addedEdgeIds.has(id)) {
              extraEdges.push({
                id,
                source: user.id,
                target: us.id,
                type: 'user-user-service-virtual',
              });
              addedEdgeIds.add(id);
            }
          }
        });
      });
    }

    // Dodaj computer → user-service SAMO ako nema softvera
    if (
      selectedTypes.has('computer') &&
      selectedTypes.has('user-service') &&
      !selectedTypes.has('software')
    ) {
      filteredNodes.forEach(comp => {
        if (comp.type !== 'computer') return;

        filteredNodes.forEach(us => {
          if (us.type !== 'user-service') return;

          const parts = us.id.split('>')[0].split('-');
          const usComputerId = parts[parts.length - 1];
          if (usComputerId !== comp.id) return;

          const id = `virtual-${comp.id}-${us.id}`;
          const alreadyExists = preparedData.edges.some(
            e => e.source === comp.id && e.target === us.id
          );
          if (!alreadyExists && !addedEdgeIds.has(id)) {
            extraEdges.push({
              id,
              source: comp.id,
              target: us.id,
              type: 'computer-user-service-virtual',
            });
            addedEdgeIds.add(id);
          }
        });
      });
    }

    // Dodaj service → software ILI → computer (ali ne oboje)
    if (selectedTypes.has('service')) {
      const hasSoftware = selectedTypes.has('software');
      const hasComputer = selectedTypes.has('computer');

      filteredNodes.forEach((svc) => {
        if (svc.type !== 'service') return;

        let linked = false;

        // 1. Pokušaj povezati sa softverom (ako postoji)
        if (hasSoftware) {
          for (const soft of filteredNodes) {
            if (soft.type !== 'software') continue;
            if (svc.id.includes(soft.id)) {
              const id = `virtual-${soft.id}-${svc.id}`;
              const alreadyExists = preparedData.edges.some(
                (e) => e.source === soft.id && e.target === svc.id
              );
              if (!alreadyExists && !addedEdgeIds.has(id)) {
                extraEdges.push({
                  id,
                  source: soft.id,
                  target: svc.id,
                  type: 'software-sub-virtual',
                });
                addedEdgeIds.add(id);
              }
              linked = true;
              break; // poveži samo s prvim odgovarajućim softverom
            }
          }
        }

        // 2. Ako nije spojen sa softverom, pokušaj s računalom
        if (!linked && hasComputer) {
          for (const comp of filteredNodes) {
            if (comp.type !== 'computer') continue;
            if (svc.id.includes(comp.id)) {
              const id = `virtual-${comp.id}-${svc.id}`;
              const alreadyExists = preparedData.edges.some(
                (e) => e.source === comp.id && e.target === svc.id
              );
              if (!alreadyExists && !addedEdgeIds.has(id)) {
                extraEdges.push({
                  id,
                  source: comp.id,
                  target: svc.id,
                  type: 'computer-service-virtual',
                });
                addedEdgeIds.add(id);
              }
              break;
            }
          }
        }
      });
    }

    const allEdges = [...filteredEdges, ...extraEdges];

    if (filteredNodes.length === 0) {
      const layouted = applyForceAtlasLayout(preparedData);

      setLayoutedData(layouted);
      return;
    }

    const layouted = applyForceAtlasLayout({ nodes: filteredNodes, edges: allEdges });
    setLayoutedData(layouted);
  };

  // Automatski refiltrira graf kad se promijeni selekcija grupe ili tipova
  useEffect(() => {
    filterGraph();
  }, [selectedGroup, selectedTypes]);
  // Omogućuje selekciju/deselekciju tipova čvorova (checkbox funkcionalnost)
  const toggleType = (type: string) => {
    const newSet = new Set(selectedTypes);
    newSet.has(type) ? newSet.delete(type) : newSet.add(type);
    setSelectedTypes(newSet);
  };

  
  // Ako korisnik promijeni grupu, ponovno izračunaj dostupne tipove i očisti nevažeće selekcije
  useEffect(() => {
    let relevantNodes: typeof preparedData.nodes = [];

    if (selectedGroup) {
      // --- POČETAK KOPIRANE LOGIKE IZ filterGraph ---

      // 1. Pronađi početne čvorove koji direktno pripadaju grupi
      const groupNodeIds = new Set(
        preparedData.nodes
          .filter((n) => n.group === selectedGroup)
          .map((n) => n.id)
      );

      // 2. Proširi selekciju na sve povezane čvorove "šetajući" po rubovima
      const relatedNodeIds = new Set<string>(groupNodeIds);
      let added = true;
      while (added) {
        added = false;
        preparedData.edges.forEach((edge) => {
          if (relatedNodeIds.has(edge.source) && !relatedNodeIds.has(edge.target)) {
            relatedNodeIds.add(edge.target);
            added = true;
          }
          if (relatedNodeIds.has(edge.target) && !relatedNodeIds.has(edge.source)) {
            relatedNodeIds.add(edge.source);
            added = true;
          }
        });
      }

      // 3. Filtriraj glavnu listu čvorova da sadrži samo one s pronađenim ID-jevima
      relevantNodes = preparedData.nodes.filter((n) => relatedNodeIds.has(n.id));
    } else {
      relevantNodes = preparedData.nodes;
      // --- KRAJ KOPIRANE LOGIKE ---
    }

    // Sada iz ispravne, pune liste čvorova izdvajamo sve jedinstvene tipove
    const types = Array.from(
      new Set(relevantNodes.map((n) => n.type).filter((t): t is string => !!t))
    );

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
  }, [selectedGroup, preparedData.nodes, preparedData.edges]);

  // Glavni render: uključuje filtere (grupa/tipovi), interaktivnu vizualizaciju grafa,
  // te informacije o hoveranim čvorovima i kontrole za pomicanje susjeda odabranog računala.
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
          // 1. Reagraph traži string ID-eve za prikaz grafa
          edges={layoutedData.edges.map((e) => ({
            ...e,
            source: typeof e.source === 'string' ? e.source : e.source.id,
            target: typeof e.target === 'string' ? e.target : e.target.id
          }))}
          draggable
          layoutType="forceDirected2d"
          // 2. Za stilove koristi originalne edge objekte koji imaju source/target kao objekte
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
              setSelectedNode(node); // prikazuj toolbox samo kad je čvor računalo
            } else {
              setSelectedNode(null); // zatvori toolbox za druge tipove
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
          {/* Ako želiš i mrežu: */}
          {selectedNode.meta?.groupLabel && (
            <p><strong>Mreža:</strong> {selectedNode.meta.groupLabel}</p>
          )}
          {/* Dodaj ovdje uređivanje ako želiš */}
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