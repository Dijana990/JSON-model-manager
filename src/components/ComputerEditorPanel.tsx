import React, { useState, useEffect } from 'react';
import type { NodeType } from '../types';
import styles from './ComputerEditorPanel.module.scss';

type ComputerEditorPanelProps = {
  node: NodeType | null;
  availableNetworks: string[];
  onSave: (updated: NodeType) => void;
  onCancel: () => void;
};

const ComputerEditorPanel: React.FC<ComputerEditorPanelProps> = ({
  node,
  availableNetworks,
  onSave,
  onCancel
}) => {
  const [label, setLabel] = useState('');
  const [software, setSoftware] = useState<string[]>([]);
  const [editedNetwork, setEditedNetwork] = useState('');
  const [showBackConfirm, setShowBackConfirm] = useState(false);
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);

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
      {showBackConfirm && (
        <div className={styles.modalBackdrop}>
          <div className={styles.modal}>
            <p>Are you sure you want to go back?<br />Unsaved changes will be lost.</p>
            <div className={styles.modalButtons}>
              <button onClick={onCancel}>Yes, go back</button>
              <button onClick={() => setShowBackConfirm(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
      {showSaveConfirm && (
  <div className={styles.modalBackdrop}>
    <div className={styles.modal}>
      <p>Are you sure you want to save the changes?</p>
      <div className={styles.modalButtons}>
        <button onClick={() => {
          handleSave();
          setShowSaveConfirm(false);
        }}>Yes, save</button>
        <button onClick={() => setShowSaveConfirm(false)}>Cancel</button>
      </div>
    </div>
  </div>
)}

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
        <button onClick={() => setShowSaveConfirm(true)}>SAVE</button>
        <button onClick={() => setShowBackConfirm(true)}>BACK</button>
      </div>
    </div>
  );
};

export default ComputerEditorPanel;
