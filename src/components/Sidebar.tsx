import React from 'react';
import type { NodeType } from '../types';

type SidebarProps = {
  selectedNode: NodeType | null;
  onUpdate: (node: NodeType) => void;
};

const Sidebar: React.FC<SidebarProps> = ({ selectedNode, onUpdate }) => {
  if (!selectedNode) return <div className="sidebar">Odaberi čvor za uređivanje</div>;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    onUpdate({ ...selectedNode, [name]: value });
  };

  return (
    <div className="sidebar">
      <h3>Uređivanje čvora</h3>
      <label>ID</label>
      <input type="text" name="id" value={selectedNode.id} disabled />
      <label>Labela</label>
      <input type="text" name="label" value={selectedNode.label} onChange={handleChange} />
      <label>Tip</label>
      <input type="text" name="type" value={selectedNode.type} onChange={handleChange} />
    </div>
  );
};

export default Sidebar;
