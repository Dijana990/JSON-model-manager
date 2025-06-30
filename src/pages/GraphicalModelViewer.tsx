import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import styles from "./graphicalmodelviewer.module.scss";
import GraphCanvasComponent from "../components/GraphCanvas";
import { parseJSONToGraph } from "../services/JSONParser";
import { filterFirewallsGraph } from "../graphModes/firewalls";
import type { GraphData, FileItem } from "../types";

function mergeGraphs(graphs: GraphData[]): GraphData {
  const merged: GraphData = { nodes: [], edges: [] };
  const nodeIds = new Set<string>();
  const edgeIds = new Set<string>();

  for (const graph of graphs) {
    for (const node of graph.nodes) {
      if (!nodeIds.has(node.id)) {
        merged.nodes.push(node);
        nodeIds.add(node.id);
      }
    }
    for (const edge of graph.edges) {
      if (!edgeIds.has(edge.id)) {
        merged.edges.push(edge);
        edgeIds.add(edge.id);
      }
    }
  }

  return merged;
}

export default function GraphicalModelViewer() {
  const navigate = useNavigate();
  const location = useLocation();
  const files = (location.state?.files || []) as FileItem[];

  const [mode, setMode] = useState<'landscape' | 'firewalls' | 'dataservices' | 'credentials'>('landscape');
  const [graphs, setGraphs] = useState<{
    landscape: GraphData | null,
    firewalls: GraphData | null,
    dataservices: GraphData | null,
    credentials: GraphData | null
  }>({
    landscape: null,
    firewalls: null,
    dataservices: null,
    credentials: null
  });

  useEffect(() => {
    const readFiles = async () => {
      try {
        const results = await Promise.all(
          files.map((file) =>
            new Promise<{ graph: GraphData; raw: any }>((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => {
                try {
                  const json = JSON.parse(reader.result as string);
                  const graph = parseJSONToGraph(json, json);
                  resolve({ graph, raw: json });
                } catch (err) {
                  reject(err);
                }
              };
              reader.onerror = reject;

              if (file instanceof File) {
                reader.readAsText(file);
              } else if (typeof file === "object" && "fileObject" in file && file.fileObject instanceof File) {
                reader.readAsText(file.fileObject);
              } else if (typeof file === "object" && "content" in file && typeof file.content === "string") {
                reader.readAsText(new Blob([file.content]));
              } else {
                reject(new Error("Nepoznat format file objekta"));
              }
            })
          )
        );

        if (results.length > 0) {
          const mergedGraph = mergeGraphs(results.map((r) => r.graph));
          const mergedRaw = results[0]?.raw;

          setGraphs({
            landscape: mergedGraph,
            firewalls: filterFirewallsGraph(mergedGraph, '', new Set(), mergedRaw),
            dataservices: null,
            credentials: null
          });
        }
      } catch (err) {
        alert("Greška pri čitanju datoteka.");
        navigate('/dashboard');
      }
    };

    if (files.length > 0) {
      readFiles();
    }
  }, [files, navigate]);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2>Graphical Model View</h2>
        <div className={styles.buttonGroup}>
          <button
            className={`${styles.modeButton} ${mode === 'landscape' ? styles.activeButton : ''}`}
            onClick={() => setMode('landscape')}
          >
            Landscape
          </button>
          <button
            className={`${styles.modeButton} ${mode === 'credentials' ? styles.activeButton : ''}`}
            onClick={() => setMode('credentials')}
          >
            Credentials
          </button>
          <button
            className={`${styles.modeButton} ${mode === 'dataservices' ? styles.activeButton : ''}`}
            onClick={() => setMode('dataservices')}
          >
            Dataservices
          </button>
          <button
            className={`${styles.modeButton} ${mode === 'firewalls' ? styles.activeButton : ''}`}
            onClick={() => setMode('firewalls')}
          >
            Firewalls
          </button>
          <button className={styles.backButton} onClick={() => navigate("/dashboard")}>
            BACK TO JSON MANAGER
          </button>
        </div>
      </div>

      {graphs[mode] ? (
        <GraphCanvasComponent data={graphs[mode]!} />
      ) : (
        <p style={{ padding: "1rem" }}>MODEL VIEW IS LOADING...</p>
      )}
    </div>
  );
}
