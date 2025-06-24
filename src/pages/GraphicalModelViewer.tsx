import { useState } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./graphicalmodelviewer.module.scss";

export default function GraphicalModelViewer() {
  const [showToolbox, setShowToolbox] = useState(false);
  const [installedSoftware, setInstalledSoftware] = useState([
    { name: "Apache HTTP Ser", version: "2.4" },
    { name: "MySQL", version: "8.0" },
  ]);

  const navigate = useNavigate();

  const handleOpenToolbox = () => {
    setShowToolbox(true);
  };
  const handleAddSoftware = () => {
    setInstalledSoftware([
      ...installedSoftware,
      { name: "New Software", version: "1.0" },
    ]);
  };
  const handleDeleteSoftware = (index: number) => {
    setInstalledSoftware(installedSoftware.filter((_, i) => i !== index));
  };
  
  return (
    <div className={styles.container}>
      <div className={styles.view}>
        <h2>Graphical Model View</h2>
        <div className={styles.buttonGroup}>
          <button>Landscape</button>
          <button>Credentials</button>
          <button>Dataservices</button>
          <button>Firewalls</button>
          <button onClick={handleOpenToolbox}>Computers</button>
        </div>
      </div>

      {showToolbox && (
        <div className={styles.toolbox}>
          <h3>ToolBox</h3>
          
          <div>
            <label>Computer Name:</label>
            <input type="text" placeholder="Enter computer name" />
          </div>

          <div>
            <label>Connected Network:</label>
            <select defaultValue="Network A">
              <option>Network A</option>
              <option>Network B</option>
            </select>
          </div>

          <div className={styles.section}>
            <h4>Installed Software</h4>
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Version</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {installedSoftware.map((sw, index) => (
                  <tr key={index}>
                    <td>{sw.name}</td>
                    <td>{sw.version}</td>
                    <td>
                      <button onClick={() => handleDeleteSoftware(index)}>🗑️</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button className={styles.addRowButton} onClick={handleAddSoftware}>
              Add row
            </button>
          </div>

          <div className={styles.section}>
            <h4>Data</h4>
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Type</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Logs</td>
                  <td>Text</td>
                  <td><button>🗑️</button></td>
                </tr>
              </tbody>
            </table>
            <button className={styles.addRowButton}>Add row</button>
          </div>

          <button className={styles.save}>Save changes</button>
          
          <div className={styles.backButton}>
            <button onClick={() => navigate("/dashboard")}>
              Back to File list
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
