import React, { useState } from 'react';
import type { NodeType, EdgeType } from '../types';
import { parseCpe, getSoftwareUser, getSoftwareComputer, getServiceProvider, parseSoftwareIdFromUserServiceId } from '../utils/graphHelpers';
import { cleanDuplicateLabel } from '../utils/graphHelpers';
import styles from './GraphCanvas.module.scss';

interface NodeInfoPanelProps {
  selectedNode: NodeType;
  viewMode: string;
  validEdges: EdgeType[];
  mappedNodes: NodeType[];
}

const NodeInfoPanel: React.FC<NodeInfoPanelProps> = ({
  selectedNode,
  viewMode,
  validEdges,
  mappedNodes
}) => {
  const [isIdVisible, setIsIdVisible] = useState(false);

  const handleMouseEnter = () => setIsIdVisible(true);
  const handleMouseLeave = () => setIsIdVisible(false);

  return (
    <div className={styles.nodePanel}>
      <h3>{selectedNode.label}</h3>
      <p>
        <strong>ID:</strong>{' '}
        <span className={styles.nodeId}>
          {selectedNode.fullName || selectedNode.id}
        </span>
      </p>
      <p><strong>TYPE:</strong> {selectedNode.type}</p>

      {selectedNode.meta?.groupLabel && (
        <p><strong>NETWORK:</strong> {selectedNode.meta.groupLabel}</p>
      )}

      {viewMode === 'landscape' && (
        <>
          {['computer', 'user', 'software', 'user-service', 'service'].includes(selectedNode.type) && (
            <div>
              <h4>Landscape Data</h4>

              {selectedNode.type === 'computer' && (
                <>
                  <p>💻 Installed Software:</p>
                  <ul>
                    {selectedNode.meta?.installedSoftware?.map((sw: any) => (
                      <li key={sw.id}>{sw.label} (v{sw.version})</li>
                    )) || <li>None</li>}
                  </ul>
                </>
              )}

              {selectedNode.type === 'software' && (
                <>
                  <p>💾 Software Info:</p>
                  <p><strong>CPE:</strong> {selectedNode.meta?.cpe || 'N/A'}</p>
                  {(() => {
                    const cpeString = selectedNode.meta?.originalSoftware?.cpe_idn || '';
                    const { vendor, product, version } = parseCpe(cpeString);
                    return (
                      <>
                        <p><strong>Vendor:</strong> {vendor}</p>
                        <p><strong>Product:</strong> {product}</p>
                        <p><strong>Version:</strong> {version}</p>
                      </>
                    );
                  })()}
                  <p><strong>Installed on computer:</strong> {selectedNode.meta?.computer_idn || 'Unknown'}</p>
                  <p><strong>Used by:</strong> {getSoftwareUser(selectedNode.id, validEdges) || 'N/A'}</p>
                </>
              )}

              {selectedNode.type === 'user-service' && (
                <>
                  <p>🛠️ User Service Info:</p>
                  {(() => {
                    const softwareCpeId = parseSoftwareIdFromUserServiceId(selectedNode.id);
                    const softwareNode = softwareCpeId
                      ? mappedNodes.find(n => n.type === 'software' && n.fullName?.includes(softwareCpeId))
                      : null;

                    const computerId = softwareNode ? getSoftwareComputer(softwareNode.id, validEdges) : null;
                    const userId = softwareNode ? getSoftwareUser(softwareNode.id, validEdges) : null;

                    return (
                      <>
                        <p><strong>Provided by:</strong> {softwareNode?.label || 'Unknown'}</p>
                        <p><strong>Installed on computer:</strong> {computerId || 'Unknown'}</p>
                        {userId && <p><strong>Used by user:</strong> {userId}</p>}
                      </>
                    );
                  })()}
                </>
              )}

              {selectedNode.type === 'service' && (
                <>
                  <p>🛠️ Service Info:</p>
                  {(() => {
                    const provider = getServiceProvider(selectedNode.id, validEdges);
                    const computerId = provider
                      ? provider.type === 'computer'
                        ? provider.id
                        : getSoftwareComputer(provider.id, validEdges)
                      : null;
                    const userId = provider && provider.type === 'software'
                      ? getSoftwareUser(provider.id, validEdges)
                      : null;

                    return (
                      <>
                        <p><strong>Provided by:</strong> {provider
                          ? mappedNodes.find(n => n.id === provider.id)?.label || provider.id
                          : 'Unknown'}
                        </p>
                        <p><strong>Installed on computer:</strong> {computerId || 'Unknown'}</p>
                        {userId && <p><strong>Used by user:</strong> {userId}</p>}
                      </>
                    );
                  })()}
                </>
              )}
            </div>
          )}
        </>
      )}

      {viewMode === 'credentials' && (
        <>
          {['key', 'lock', 'user', 'computer', 'software'].includes(selectedNode.type) && (
            <div>
              <h4>🔐 Credentials Info</h4>

              {/* KEY */}
              {selectedNode.type === 'key' && (
                <>
                  <p>🔑 This key is assigned to users:</p>
                  <ul>
                    {validEdges
                      .filter(e => e.source === selectedNode.id && e.type === 'user-key')
                      .map(e => {
                        const node = mappedNodes.find(n => n.id === e.target && n.type === 'user');
                        if (!node) return null; // ➔ zaštita ako user node ne postoji
                        const displayLabel = node.label && node.label.trim().length > 0
                          ? node.label
                          : '👤 User';
                        return (
                          <li key={e.id} className={styles.listItemWithTooltip}>
                              {cleanDuplicateLabel(node?.label || node?.id)}
                              <span className={styles.tooltip}>
                                {node?.fullName || node?.id}
                              </span>
                          </li>
                        );
                      })}
                  </ul>
                </>
              )}

              {/* LOCK */}
              {selectedNode.type === 'lock' && (
                <>
                  <p>🔒 Accessible by admin users:</p>
                  <ul>
                    {validEdges
                      .filter(e => e.target === selectedNode.id && e.type === 'user-lock')
                      .map(e => {
                        const node = mappedNodes.find(n => n.id === e.source);
                        const displayLabel = node?.label && node.label.trim().length > 0
                          ? node.label
                          : 'Admin';
                        return (
                          <li key={e.id} className={styles.listItemWithTooltip}>
                            {cleanDuplicateLabel(displayLabel)}
                            <span className={styles.tooltip}>{node?.fullName || node?.id}</span>
                          </li>
                        );
                      })}
                  </ul>
                </>
              )}

              {/* USER */}
              {selectedNode.type === 'user' && (
                <>
                  <p>🔑 Keys assigned to this user:</p>
                  <ul>
                    {validEdges
                      .filter(e => e.target === selectedNode.id && e.type === 'user-key')
                      .map(e => {
                        const node = mappedNodes.find(n => n.id === e.target);
                        return (
                          <li key={e.id} className={styles.listItemWithTooltip}>
                            {node?.label || (typeof e.target === 'string' ? e.target : e.target.id)}
                            <span className={styles.tooltip}>
                              {node?.fullName || node?.id}
                            </span>
                          </li>
                        );
                      })}
                  </ul>

                  <p>🔒 Locks accessible:</p>
                  <ul>
                    {(() => {
                      const isAdmin = selectedNode.id.startsWith('admin');
                      return (isAdmin
                        ? validEdges.filter(e => e.source === selectedNode.id && e.type === 'user-lock')
                        : validEdges.filter(e => e.source === selectedNode.id && e.type === 'user-key')
                      )
                        .map(e => {
                          const node = mappedNodes.find(n => n.id === e.target);
                          if (!node) return null;
                          if (!isAdmin && node.type !== 'lock') return null; // ➔ samo lock čvorove za obične korisnike
                          return (
                            <li key={e.id} className={styles.listItemWithTooltip}>
                              {node.label || node.id}
                              <span className={styles.tooltip}>{node.fullName || node.id}</span>
                            </li>
                          );
                        });
                    })()}
                  </ul>
                </>
              )}

              {/* COMPUTER */}
              {selectedNode.type === 'computer' && (
                <>
                  <p>💻 Credentials stored here:</p>
                  <ul>
                    {validEdges
                      .filter(e => e.target === selectedNode.id && ['key', 'lock'].includes(mappedNodes.find(n => n.id === e.source)?.type || ''))
                      .map(e => {
                        const node = mappedNodes.find(n => n.id === e.source);
                        const displayLabel = node?.label?.trim()
                          ? node.label
                          : node?.type === 'key'
                            ? '🔑 Key'
                            : node?.type === 'lock'
                              ? '🔒 Lock'
                              : (typeof e.source === 'string' ? e.source : e.source.id);
                        return (
                          <li key={e.id} className={styles.listItemWithTooltip}>
                            {displayLabel}
                            <span className={styles.tooltip}>{node?.fullName || (typeof e.source === 'string' ? e.source : e.source.id)}</span>
                          </li>
                        );
                      })}
                  </ul>
                </>
              )}

              {/* SOFTWARE */}
              {selectedNode.type === 'software' && (
                <>
                  <p>💾 Associated keys or locks:</p>
                  <ul>
                    {validEdges
                      .filter(e => e.target === selectedNode.id && ['key', 'lock'].includes(mappedNodes.find(n => n.id === e.source)?.type || ''))
                      .map(e => {
                        const node = mappedNodes.find(n => n.id === e.source);
                        const displayLabel = node?.label?.trim()
                          ? node.label
                          : node?.type === 'key'
                            ? '🔑 Key'
                            : node?.type === 'lock'
                              ? '🔒 Lock'
                              : (typeof e.source === 'string' ? e.source : e.source.id);
                        return (
                          <li key={e.id} className={styles.listItemWithTooltip}>
                            {displayLabel}
                            <span className={styles.tooltip}>{node?.fullName || (typeof e.source === 'string' ? e.source : e.source.id)}</span>
                          </li>
                        );
                      })}
                  </ul>
                </>
              )}
            </div>
          )}
        </>
      )}



      {viewMode === 'dataservices' && (
        <>
          {['computer', 'user', 'software', 'dataservice'].includes(selectedNode.type) && (
            <div>
              <h4>Dataservice Info</h4>
              {selectedNode.meta?.data_definition_idn && (
                <p><strong>Data Definition:</strong> {selectedNode.meta.data_definition_idn}</p>
              )}
              {selectedNode.meta?.principal_software && (
                <p><strong>Principal Software:</strong> {selectedNode.meta.principal_software}</p>
              )}
            </div>
          )}
        </>
      )}

      {viewMode === 'firewalls' && (
        <>
          {['computer', 'software', 'internet'].includes(selectedNode.type) && (
            <div>
              <h4>Firewall Rules</h4>
              {selectedNode.meta?.firewall_rules?.length ? (
                <ul>
                  {selectedNode.meta.firewall_rules.map((rule: any) => (
                    <li key={rule.id}>{rule.allow ? 'ALLOW' : 'DENY'} from {rule.from} to {rule.to}</li>
                  ))}
                </ul>
              ) : (
                <p>No firewall rules</p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default NodeInfoPanel;
