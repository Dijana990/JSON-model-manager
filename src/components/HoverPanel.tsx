import React from 'react';
import type { NodeType } from '../types';
import styles from './GraphCanvas.module.scss';

interface HoverPanelProps {
  hoveredNode: NodeType;
}

const HoverPanel: React.FC<HoverPanelProps> = ({ hoveredNode }) => {
  return (
    <div className={styles.hoverPanel}>
      <strong>{hoveredNode.fullName || hoveredNode.label}</strong><br />
      <small>ID: {hoveredNode.id}</small><br />
      <small>TYPE: {hoveredNode.type}</small><br />
      <small>NETWORK: {hoveredNode.meta?.groupLabel || hoveredNode.group || '—'}</small>
    </div>
  );
};

export default HoverPanel;
