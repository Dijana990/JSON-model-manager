/**
 * EdgeEditor.tsx
 *
 * Komponenta za prikaz i uređivanje atributa jednog ruba (edge) u grafu.
 * Omogućuje izmjenu ID-a, izvora (`source`), odredišta (`target`) i tipa veze (`type`).
 * Koristi se u sučeljima za ručno dodavanje ili izmjenu veza između čvorova.
 *
 * Props:
 * - `edge`: trenutno odabrani rub koji se uređuje
 * - `onChange`: callback funkcija koja prima ažurirani rub i prosljeđuje ga parent komponenti
 *
 * TODO:
 * - Dodati validaciju da `source` i `target` odgovaraju postojećim čvorovima.
 * - Umjesto tekstualnih unosa koristiti dropdown liste za `source` i `target`.
 * - Vizualno označiti tipove veza prema kontekstu (npr. stil boje ili ikona).
 */


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
      <h4>Connection details:</h4>
      <label>ID</label>
      <input type="text" name="id" value={edge.id} disabled />
      <label>Source</label>
      <input type="text" name="source" value={typeof edge.source === 'string' ? edge.source : edge.source.id} onChange={handleInputChange} />
      <label>Destionation</label>
      <input type="text" name="target" value={typeof edge.target === 'string' ? edge.target : edge.target.id} onChange={handleInputChange} />
      <label>Type (optional)</label>
      <input type="text" name="type" value={edge.type || ''} onChange={handleInputChange} />
    </div>
  );
};

export default EdgeEditor;
