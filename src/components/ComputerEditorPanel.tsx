import React, { useState, useEffect } from 'react';
import type { NodeType } from '../types';

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

  useEffect(() => {
    if (node && node.type === 'computer') {
      setLabel(node.label || '');
      setSoftware((node.software as string[]) || []);

      // Inicijaliziraj mrežu iz meta.network_ids
      const rawNetworkId = node.meta?.network_ids?.[0];
      setEditedNetwork(
        rawNetworkId !== undefined ? `network.internal.${rawNetworkId}` : ''
      );
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
    <div style={{
      position: 'absolute',
      top: 20,
      right: 20,
      width: 300,
      backgroundColor: '#f4f4f4',
      padding: '1rem',
      borderRadius: 8,
      boxShadow: '0 0 10px rgba(0,0,0,0.1)',
      zIndex: 2000
    }}>
      <h3>Uredi računalo</h3>

      <label>Naziv:</label>
      <input
        type="text"
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        style={{ width: '100%', marginBottom: '0.5rem' }}
      />

      <label>Mreža:</label>
      <select
        value={editedNetwork}
        onChange={(e) => setEditedNetwork(e.target.value)}
        style={{ width: '100%', marginBottom: '0.5rem' }}
      >
        <option value="">-- odaberi mrežu --</option>
        {availableNetworks.map((net) => (
          <option key={net} value={net}>{net}</option>
        ))}
      </select>

      <label>Softver:</label>
      {software.map((sw, index) => (
        <div key={index} style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
          <input
            type="text"
            value={sw}
            onChange={(e) => handleSoftwareChange(index, e.target.value)}
            style={{ flex: 1 }}
          />
          <button onClick={() => handleRemoveSoftware(index)}>X</button>
        </div>
      ))}
      <button onClick={handleAddSoftware}>+ Dodaj softver</button>

      <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'space-between' }}>
        <button onClick={handleSave}>💾 Spremi</button>
        <button onClick={onCancel}>Odustani</button>
      </div>
    </div>
  );
};

export default ComputerEditorPanel;
