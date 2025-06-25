/**
 * GraphicalModelViewer.tsx
 *
 * Glavna stranica za vizualizaciju modeliranih IT sustava.
 * - Omogućuje učitavanje više JSON datoteka i spajanje njihovih podataka u jedan graf.
 * - Parsira i konvertira JSON u prikladan format (`GraphData`) za prikaz u Reagraph komponenti.
 * - Prikazuje korisničko sučelje s navigacijskim gumbima i Reagraph platnom.
 * - Kompatibilna s datotekama tipa `File`, `FileItem` i `string` sadržajima.
 *
 * Ova komponenta je rezultat integracije dva projekta — originalnog JSON-parsing prikaza
 * i novog vizualnog editora temeljenog na Reagraph-u.
 */

// TODO:
// - Implementirati undo/redo funkcionalnost unutar prikaza grafa (moguće pomoću `useGraph` hooka).
// - Dodati gumb za spremanje izmijenjenog grafa u JSON (npr. kao preuzimanje fajla ili spremanje u localStorage).
// - Povezati stanje prikazanog grafa sa spremištem izmjena (za razliku između originalnog i modificiranog).
// - Podesiti layout gumba (Landscape, Credentials itd.) ako budu povezani s filtrima grafa.
// - Razmisliti treba li GraphicalModelViewer ostati kao posredna komponenta ili se preusmjeravanje može pojednostaviti.



import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import styles from "./graphicalmodelviewer.module.scss";
import GraphCanvasComponent from "../components/GraphCanvas";
import { parseJSONToGraph } from "../services/JSONParser";
import type { GraphData, FileItem } from "../types"; // ✅ koristimo centralnu definiciju

function mergeGraphs(graphs: GraphData[]): GraphData {
  const merged: GraphData = {
    nodes: [],
    edges: [],
  };

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

  const [graphData, setGraphData] = useState<GraphData | null>(null);

  useEffect(() => {
    const readFiles = async () => {
      try {
        const results = await Promise.all(
          files.map((file) =>
            new Promise<GraphData>((resolve, reject) => {
              console.log("📁 Učitavam file:", file);
              const reader = new FileReader();
              reader.onload = () => {
                try {
                  const json = JSON.parse(reader.result as string);
                  const graph = parseJSONToGraph(json, json);
                  resolve(graph);
                } catch (err) {
                  console.error("Greška pri parsiranju JSON-a:", err);
                  reject(err);
                }
              };
              reader.onerror = reject;

              // ⬇️ ispravno rukovanje različitim vrstama FileItem-a
              if (file instanceof File) {
                reader.readAsText(file);
              } else if (
                typeof file === "object" &&
                "fileObject" in file &&
                file.fileObject instanceof File
              ) {
                reader.readAsText(file.fileObject);
              } else if (
                typeof file === "object" &&
                "content" in file &&
                typeof file.content === "string"
              ) {
                reader.readAsText(new Blob([file.content]));
              } else {
                console.error("❌ Neispravan file objekt:", file);
                reject(new Error("Nepoznat format file objekta"));
              }
            })
          )
        );

        if (results.length > 0) {
          const mergedGraph = mergeGraphs(results);
          setGraphData(mergedGraph);
        }
      } catch (err) {
        console.error("Greška pri učitavanju fajlova:", err);
      }
    };

    if (files.length > 0) {
      readFiles();
    }
  }, [files]);

  return (
    <div className={styles.container}>
      <div className={styles.view}>
        <h2>Graphical Model View</h2>
        <div className={styles.buttonGroup}>
          <button>Landscape</button>
          <button>Credentials</button>
          <button>Dataservices</button>
          <button>Firewalls</button>
          <button onClick={() => navigate("/dashboard")}>← Natrag</button>
        </div>
      </div>

      {graphData ? (
        <GraphCanvasComponent data={graphData} />
      ) : (
        <p style={{ padding: "1rem" }}>Učitavanje grafa...</p>
      )}
    </div>
  );
}
