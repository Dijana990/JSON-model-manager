import React from 'react';
import type { NodeType } from '../types';

type NodeEditorProps = {
  node: NodeType;
  onChange: (updatedNode: NodeType) => void;
};

const NodeEditor: React.FC<NodeEditorProps> = ({ node, onChange }) => {
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    onChange({ ...node, [name]: value });
  };

  return (
    <div className="node-editor">
      <h4>Detalji čvora</h4>
      <label>ID</label>
      <input type="text" name="id" value={node.id} disabled />
      <label>Labela</label>
      <input type="text" name="label" value={node.label} onChange={handleInputChange} />
      <label>Tip</label>
      <input type="text" name="type" value={node.type} onChange={handleInputChange} />
    </div>
  );
};

export default NodeEditor;
