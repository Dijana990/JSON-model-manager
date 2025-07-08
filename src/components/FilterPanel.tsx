import React from 'react';
import styles from './GraphCanvas.module.scss';

interface FilterPanelProps {
  availableGroups: string[];
  selectedGroup: string;
  setSelectedGroup: (group: string) => void;
  types: string[];
  selectedTypes: Set<string>;
  toggleType: (type: string) => void;
  onClose: () => void;
}

const FilterPanel: React.FC<FilterPanelProps> = ({
  availableGroups,
  selectedGroup,
  setSelectedGroup,
  types,
  selectedTypes,
  toggleType,
  onClose
}) => {
  return (
    <div className={styles.filterPanel}>
      <button className={styles.closeButton} onClick={onClose}>✖</button>
      <h3 className={styles.mainTitle}>SELECT NODE</h3>

      <div className={styles.filterGroup}>
        <label>Group: </label>
        <select value={selectedGroup} onChange={(e) => setSelectedGroup(e.target.value)}>
          <option value="">-- all --</option>
          {availableGroups.map((g) => (
            <option key={g} value={g}>{g}</option>
          ))}
        </select>
      </div>

      <div className={styles.filterTypes}>
        <label>Types:</label><br />
        {types.map((type) => (
          <label key={type}>
            <input
              type="checkbox"
              checked={selectedTypes.has(type)}
              onChange={() => toggleType(type)}
            />{' '}
            {type}
          </label>
        ))}
      </div>
    </div>
  );
};

export default FilterPanel;
