import React, { useState, useEffect } from 'react';
import type { NodeType } from '../types';
import styles from './ComputerEditorPanel.module.scss';

type ComputerEditorPanelProps = {
  node: NodeType | null;
  availableNetworks: string[];
  onSave: (updated: NodeType) => void;
  onCancel: () => void;
};

const ComputerEditorPanel: React.FC<ComputerEditorPanelProps> = ({ node, availableNetworks, onSave, onCancel }) => {
  const [label, setLabel] = useState('');
  const [software, setSoftware] = useState<string[]>([]);
  const [editedNetwork, setEditedNetwork] = useState('');

  useEffect(() => {
    if (node && node.type === 'computer') {
      setLabel(node.label || '');
      setSoftware((node.software as string[]) || []);

      const rawNetworkId = node.meta?.network_ids?.[0];
      setEditedNetwork(rawNetworkId !== undefined ? `network.internal.${rawNetworkId}` : '');
    }
  }, [node]);

  if (!node || node.type !== 'computer') return null;

  const handleSoftwareChange = (index: number, value: string) => {
    const newSoftware = [...software];
    newSoftware[index] = value;
    setSoftware(newSoftware);
  };
  
  const handleAddSoftware = () => {
    setSoftware([...software, '']);
  };
  
  const handleRemoveSoftware = (index: number) => {
    const newSoftware = [...software];
    newSoftware.splice(index, 1);
    setSoftware(newSoftware);
  };
  
  const handleSave = () => {
    onSave({
      ...node,
      label,
      group: editedNetwork,
      icon: node.icon,
      software,
      meta: {
        ...node.meta,
        network_ids: [
          Number(editedNetwork.replace('network.internal.', ''))
        ],
        groupLabel: editedNetwork
      }
    });
  };
  
  return (
    <div className={styles.panel}>
      <h3>EDIT COMPUTER</h3>
      <label>Computer name:</label>
      <input
        type="text"
        value={label}
        onChange={(e) => setLabel(e.target.value)}
      />

      <label>Computer Network:</label>
      <select
        value={editedNetwork}
        onChange={(e) => setEditedNetwork(e.target.value)}
      >
        <option value="">-- select network --</option>
        {availableNetworks.map((net) => (
          <option key={net} value={net}>
            {net}
          </option>
        ))}
      </select>

      <label>INSTALLED SOFTWARE</label>
        {software.map((sw, index) => (
          <div key={index} className={styles.softwareItem}>
            <input
              type="text"
              value={sw}
              onChange={(e) => handleSoftwareChange(index, e.target.value)}
            />
            <button onClick={() => handleRemoveSoftware(index)}>X</button>
          </div>
        ))}

      <button className={styles.addButton} onClick={handleAddSoftware}>
        + ADD SOFTWARE
      </button>

      

      <div className={styles.actions}>
        <button onClick={handleSave}>SAVE</button>
        <button onClick={onCancel}>BACK</button>
      </div>
    </div>
  );
};

export default ComputerEditorPanel;
