/**
 * Sidebar.tsx
 *
 * Komponenta za uređivanje trenutno odabranog čvora (node) u grafu.
 * Prikazuje osnovne informacije o čvoru poput ID-a, labele i tipa,
 * te omogućuje korisniku izmjenu labele i tipa.
 *
 * Koristi se zajedno s komponentom grafa (`GraphCanvasComponent`) i `useGraph` hookom
 * za sinkronizaciju podataka o grafu kroz aplikaciju.
 */

// TODO:
// - Proširiti sučelje za uređivanje čvora: dodati podršku za polja kao što su `group`, `icon`, `meta`, `software` itd.
// - Dodati mogućnost promjene ikone putem dropdowna ili file upload (ovisno o dizajnu).
// - Validirati unos korisnika (npr. spriječiti prazan `label` ili nevažeći `type`).
// - Ubuduće omogućiti prikaz povezanih čvorova ili rubova dok se čvor uređuje (kontekstualna navigacija).
// - Dodati "Spremi promjene" ili automatski trigger koji koristi `onUpdate()` i sinkronizira s undo/redo mehanizmom.
// - Uvesti vizualnu navigaciju prema povezanim rubovima ili čvorovima.

import React from 'react';
import type { NodeType } from '../types';

type SidebarProps = {
  selectedNode: NodeType | null;
  onUpdate: (node: NodeType) => void;
};

const Sidebar: React.FC<SidebarProps> = ({ selectedNode, onUpdate }) => {
  if (!selectedNode) return <div className="sidebar">Select a node to edit</div>;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    // Ako mijenjamo software, pretvori string u niz
    if (name === 'software') {
      const softwareArray = value.split(',').map((s) => s.trim());
      onUpdate({ ...selectedNode, software: softwareArray });
    } else {
      onUpdate({ ...selectedNode, [name]: value });
    }
  };

  return (
    <div className="sidebar">
      <h3>Editing node</h3>

      <label>ID</label>
      <input type="text" name="id" value={selectedNode.id} disabled />

      <label>Label</label>
      <input type="text" name="label" value={selectedNode.label} onChange={handleChange} />

      <label>Type</label>
      <input type="text" name="type" value={selectedNode.type} onChange={handleChange} />

      <label>Group</label>
      <input type="text" name="group" value={selectedNode.group || ''} onChange={handleChange} />

      <label>Icon</label>
      <input type="text" name="icon" value={selectedNode.icon || ''} onChange={handleChange} />

      <label>Full name</label>
      <input type="text" name="fullName" value={selectedNode.fullName || ''} onChange={handleChange} />

      <label>Software (comma - separeted)</label>
      <input
        type="text"
        name="software"
        value={(selectedNode.software || []).join(', ')}
        onChange={handleChange}
      />
    </div>
  );
};

export default Sidebar;
