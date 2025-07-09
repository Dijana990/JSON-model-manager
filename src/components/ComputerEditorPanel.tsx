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
  const [activeTab, setActiveTab] = useState('general');
  const [editedNode, setEditedNode] = useState<NodeType | null>(null);

  useEffect(() => {
    if (node) setEditedNode(node);
  }, [node]);

  if (!editedNode) return null;

  const handleFieldChange = (field: string, value: any) => {
    setEditedNode(prev => prev ? { ...prev, [field]: value } : prev);
  };

  // === General Tab ===
  const renderGeneralTab = () => (
    <div>
      <h3>General Info</h3>
      <label>
        Computer Name:
        <input
          type="text"
          value={editedNode.label || editedNode.id}
          onChange={e => handleFieldChange('label', e.target.value)}
        />
      </label>

      <label>
        Network:
        <select
          value={editedNode.meta?.network_ids?.[0] || ''}
          onChange={e => {
            const netId = parseInt(e.target.value, 10);
            setEditedNode(prev => prev ? {
              ...prev,
              meta: { ...(prev.meta || {}), network_ids: [netId] }
            } : prev);
          }}
        >
          <option value="">Select network</option>
          {availableNetworks.map(net => (
            <option key={net} value={net}>
              {net}
            </option>
          ))}
        </select>
      </label>

      <p>Used Hardware Quota: {editedNode.meta?.originalComputer?.used_hardware_quota || 'N/A'}</p>
    </div>
  );

  // === Data Tab ===
  const renderDataTab = () => (
    <div>
      <h3>Data</h3>
      {(editedNode.meta?.originalComputer?.data || []).map((d: string, idx: number) => (
        <div key={idx} className={styles.itemBox}>
          <p>{d}</p>
          <button onClick={() => removeData(d)}>Delete</button>
        </div>
      ))}
      <button onClick={addData}>Add Data</button>
    </div>
  );

  const addData = () => {
    const newData = [...(editedNode.meta?.originalComputer?.data || []), 'NewDataPlaceholder'];
    setEditedNode(prev => prev ? {
      ...prev,
      meta: {
        ...(prev.meta || {}),
        originalComputer: {
          ...(prev.meta?.originalComputer || {}),
          data: newData
        }
      }
    } : prev);
  };

  const removeData = (id: string) => {
    const newData = (editedNode.meta?.originalComputer?.data || []).filter((d: string) => d !== id);
    setEditedNode(prev => prev ? {
      ...prev,
      meta: {
        ...(prev.meta || {}),
        originalComputer: {
          ...(prev.meta?.originalComputer || {}),
          data: newData
        }
      }
    } : prev);
  };

  // === Software Tab ===
  const renderSoftwareTab = () => (
    <div>
      <h3>Installed Software</h3>
      {Object.keys(editedNode.meta?.originalComputer?.installed_software || {}).map((softId, idx) => (
        <div key={idx} className={styles.itemBox}>
          <p>{softId}</p>
          <button onClick={() => removeSoftware(softId)}>Delete</button>
        </div>
      ))}
      <button onClick={addSoftware}>Add Software</button>
    </div>
  );

  const addSoftware = () => {
    // implementiraj logiku dodavanja softvera prema tvojim potrebama
  };

  const removeSoftware = (id: string) => {
    const currentSoftware = editedNode.meta?.originalComputer?.installed_software || {};
    const updated = { ...currentSoftware };
    delete updated[id];
    setEditedNode(prev => prev ? {
      ...prev,
      meta: {
        ...(prev.meta || {}),
        originalComputer: {
          ...(prev.meta?.originalComputer || {}),
          installed_software: updated
        }
      }
    } : prev);
  };

  // === Credentials Tab ===
  const renderCredentialsTab = () => (
    <div>
      <h3>Credentials</h3>
      {(editedNode.meta?.originalComputer?.stored_credentials || []).map((cred: string, idx: number) => (
        <div key={idx} className={styles.itemBox}>
          <p>{cred}</p>
          <button onClick={() => removeCredential(cred)}>Delete</button>
        </div>
      ))}
      <button onClick={addCredential}>Add Credential</button>
    </div>
  );

  const addCredential = () => {
    const newCreds = [...(editedNode.meta?.originalComputer?.stored_credentials || []), 'NewCredentialPlaceholder'];
    setEditedNode(prev => prev ? {
      ...prev,
      meta: {
        ...(prev.meta || {}),
        originalComputer: {
          ...(prev.meta?.originalComputer || {}),
          stored_credentials: newCreds
        }
      }
    } : prev);
  };

  const removeCredential = (id: string) => {
    const newCreds = (editedNode.meta?.originalComputer?.stored_credentials || []).filter((c: string) => c !== id);
    setEditedNode(prev => prev ? {
      ...prev,
      meta: {
        ...(prev.meta || {}),
        originalComputer: {
          ...(prev.meta?.originalComputer || {}),
          stored_credentials: newCreds
        }
      }
    } : prev);
  };

  return (
    <div className={styles.panel}>
      <div className={styles.tabs}>
        <button onClick={() => setActiveTab('general')}>General</button>
        <button onClick={() => setActiveTab('data')}>Data</button>
        <button onClick={() => setActiveTab('software')}>Software</button>
        <button onClick={() => setActiveTab('credentials')}>Credentials</button>
      </div>

      <div className={styles.tabContent}>
        {activeTab === 'general' && renderGeneralTab()}
        {activeTab === 'data' && renderDataTab()}
        {activeTab === 'software' && renderSoftwareTab()}
        {activeTab === 'credentials' && renderCredentialsTab()}
      </div>

      <div className={styles.actions}>
        <button onClick={() => onSave(editedNode)}>SAVE</button>
        <button onClick={onCancel}>BACK</button>
      </div>
    </div>
  );
};

export default ComputerEditorPanel;
