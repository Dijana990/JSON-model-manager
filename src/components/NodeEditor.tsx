/**
 * NodeEditor.tsx
 *
 * Komponenta za prikaz i uređivanje osnovnih atributa jednog čvora (node).
 * Koristi se kao manji, modularni dio većih komponenti poput `Sidebar`,
 * te omogućuje izmjenu vrijednosti kao što su labela i tip čvora.
 *
 * Props:
 * - `node`: čvor koji se trenutno uređuje
 * - `onChange`: funkcija koja prima ažurirani čvor i prosljeđuje ga natrag parent komponenti
 *
 * TODO:
 * - Proširiti podršku za uređivanje dodatnih polja kao što su `group`, `icon`, `meta`.
 * - Dodati tipizirane kontrole (npr. dropdown za `type` umjesto običnog unosa).
 * - Implementirati validaciju unosa i mogućnost poništavanja promjena.
 */


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
      <h4>Node details</h4>
      <label>ID</label>
      <input type="text" name="id" value={node.id} disabled />
      <label>Label</label>
      <input type="text" name="label" value={node.label} onChange={handleInputChange} />
      <label>Type</label>
      <input type="text" name="type" value={node.type} onChange={handleInputChange} />
    </div>
  );
};

export default NodeEditor;
