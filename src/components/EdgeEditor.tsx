import React from 'react';
import type { EdgeType } from '../types';

type EdgeEditorProps = {
  edge: EdgeType;
  onChange: (updatedEdge: EdgeType) => void;
};

const EdgeEditor: React.FC<EdgeEditorProps> = ({ edge, onChange }) => {
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    onChange({ ...edge, [name]: value });
  };

  return (
    <div className="edge-editor">
      <h4>Detalji veze</h4>
      <label>ID</label>
      <input type="text" name="id" value={edge.id} disabled />
      <label>Izvor</label>
      <input type="text" name="source" value={edge.source} onChange={handleInputChange} />
      <label>Odredište</label>
      <input type="text" name="target" value={edge.target} onChange={handleInputChange} />
      <label>Tip (opcionalno)</label>
      <input type="text" name="type" value={edge.type || ''} onChange={handleInputChange} />
    </div>
  );
};

export default EdgeEditor;
