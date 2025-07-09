import React, { useState } from 'react';
import type { NodeType, EdgeType } from '../types';
import { parseCpe, getSoftwareUser, getSoftwareComputer, getServiceProvider, parseSoftwareIdFromUserServiceId } from '../utils/graphHelpers';
import { getNodeOriginalData, cleanUserId, cleanDuplicateLabel } from '../utils/graphHelpers';
import { getConnectedNodes } from '../utils/common';
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


  const originalData = getNodeOriginalData(selectedNode);

  return (
    <div className={styles.nodePanel}>
      <h3>{selectedNode.label || (selectedNode.type === 'key' ? 'Key' : selectedNode.type === 'lock' ? 'Lock' : selectedNode.id)}</h3>
      <p>
        <strong>ID:</strong>{' '}
        <span className={styles.nodeId}>
          {['user', 'computer'].includes(selectedNode.type)
            ? selectedNode.id.replace(/^user-/, '')
            : originalData.id || selectedNode.id}
        </span>
      </p>
      <p><strong>TYPE:</strong> {selectedNode.type}</p>
      <p><strong>NETWORK:</strong> {selectedNode.meta?.groupLabel || selectedNode.meta?.network_group || 'N/A'}</p>

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

              {selectedNode.type === 'user' && (
                <>
                  <p>👤 User Info:</p>
                  <p><strong>Installed on computer:</strong> {selectedNode.meta?.computer_idn || 'Unknown'}</p>
                  <p><strong>Network:</strong> {selectedNode.meta?.network_group || 'Unknown'}</p>
                </>
              )}


              {selectedNode.type === 'software' && (
                <>
                  <p>💾 Software Info:</p>
                  <p className={styles.listItemWithTooltip}>
                  <strong>CPE:</strong> {selectedNode.meta?.cpe || 'N/A'}
                  <span className={styles.tooltip}>
                    {selectedNode.meta?.cpe || 'N/A'}
                  </span>
                </p>
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
                  <p><strong>Used by:</strong>{' '}
                    {getSoftwareUser(selectedNode.id, validEdges)
                      ? cleanUserId(getSoftwareUser(selectedNode.id, validEdges) as string)
                      : 'N/A'}
                  </p>
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
                        {userId && (
                          <p>
                            <strong>Used by user:</strong> {cleanUserId(userId)}
                          </p>
                        )}
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
                        {userId && (
                          <p>
                            <strong>Used by user:</strong> {cleanUserId(userId)}
                          </p>
                        )}
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

              {selectedNode.type === 'key' && (
                <>
                  <p>🔑 Assigned to users:</p>
                  <ul>
                    {getConnectedNodes(validEdges, mappedNodes, {
                      selectedNodeId: selectedNode.id,
                      direction: 'outgoing',
                      edgeType: 'user-key',
                      nodeTypeFilter: ['user']
                    }).map(node => (
                      <li key={node.id} className={styles.listItemWithTooltip}>
                        {node.id}
                        <span className={styles.tooltip}>{node.id}</span>
                      </li>
                    ))}
                  </ul>

                  <p>💻 Stored on computer:</p>
                  <ul>
                    {getConnectedNodes(validEdges, mappedNodes, {
                      selectedNodeId: selectedNode.id,
                      direction: 'outgoing',
                      edgeType: 'credential-computer',
                      nodeTypeFilter: ['computer']
                    }).map(node => (
                      <li key={node.id} className={styles.listItemWithTooltip}>
                        <span className={styles.tooltip}>{node.id}</span>
                      </li>
                    ))}
                  </ul>

                  <p>💾 Linked Software:</p>
                  <ul>
                    {getConnectedNodes(validEdges, mappedNodes, {
                      selectedNodeId: selectedNode.id,
                      direction: 'outgoing',
                      edgeType: 'credential-software',
                      nodeTypeFilter: ['software']
                    }).map(node => (
                      <li key={node.id} className={styles.listItemWithTooltip}>
                        <span className={styles.tooltip}>{node.id}</span>
                      </li>
                    ))}
                  </ul>
                </>
              )}

              {selectedNode.type === 'lock' && (
                <>
                  <p>🔒 Accessible by admin users:</p>
                  <ul>
                    {getConnectedNodes(validEdges, mappedNodes, {
                      selectedNodeId: selectedNode.id,
                      direction: 'incoming',
                      edgeType: 'user-lock',
                      nodeTypeFilter: ['user']
                    }).map(node => (
                      <li key={node.id} className={styles.listItemWithTooltip}>
                        <span className={styles.tooltip}>{node.id}</span>
                      </li>
                    ))}
                  </ul>

                  <p>💻 Stored on computer:</p>
                  <ul>
                    {getConnectedNodes(validEdges, mappedNodes, {
                      selectedNodeId: selectedNode.id,
                      direction: 'outgoing',
                      edgeType: 'credential-computer',
                      nodeTypeFilter: ['computer']
                    }).map(node => (
                      <li key={node.id} className={styles.listItemWithTooltip}>
                        <span className={styles.tooltip}>{node.id}</span>
                      </li>
                    ))}
                  </ul>

                  <p>💾 Linked Software:</p>
                  <ul>
                    {getConnectedNodes(validEdges, mappedNodes, {
                      selectedNodeId: selectedNode.id,
                      direction: 'outgoing',
                      edgeType: 'credential-software',
                      nodeTypeFilter: ['software']
                    }).map(node => (
                      <li key={node.id} className={styles.listItemWithTooltip}>
                        <span className={styles.tooltip}>{node.id}</span>
                      </li>
                    ))}
                  </ul>
                </>
              )}

              {selectedNode.type === 'user' && (
                <>
                  <p>🔑 Keys accessible:</p>
                  <ul>
                    {getConnectedNodes(validEdges, mappedNodes, {
                      selectedNodeId: selectedNode.id,
                      direction: 'incoming',
                      edgeType: 'user-key',
                      nodeTypeFilter: ['key']
                    }).map(node => (
                      <li key={node.id} className={styles.listItemWithTooltip}>
                        <span className={styles.tooltip}>{node.id}</span>
                      </li>
                    ))}
                  </ul>

                  <p>🔒 Locks accessible:</p>
                  <ul>
                    {getConnectedNodes(validEdges, mappedNodes, {
                      selectedNodeId: selectedNode.id,
                      direction: 'outgoing',
                      edgeType: 'user-lock',
                      nodeTypeFilter: ['lock']
                    }).map(node => (
                      <li key={node.id} className={styles.listItemWithTooltip}>
                        <span className={styles.tooltip}>{node.id}</span>
                      </li>
                    ))}
                  </ul>
                </>
              )}

              {selectedNode.type === 'software' && (
                <>
                  <p>🔑 Keys linked:</p>
                  <ul>
                    {getConnectedNodes(validEdges, mappedNodes, {
                      selectedNodeId: selectedNode.id,
                      direction: 'incoming',
                      edgeType: 'credential-software',
                      nodeTypeFilter: ['key']
                    }).map(node => (
                      <li key={node.id} className={styles.listItemWithTooltip}>
                        <span className={styles.tooltip}>{node.id}</span>
                      </li>
                    ))}
                  </ul>

                  <p>🔒 Locks linked:</p>
                  <ul>
                    {getConnectedNodes(validEdges, mappedNodes, {
                      selectedNodeId: selectedNode.id,
                      direction: 'incoming',
                      edgeType: 'credential-software',
                      nodeTypeFilter: ['lock']
                    }).map(node => (
                      <li key={node.id} className={styles.listItemWithTooltip}>
                        <span className={styles.tooltip}>{node.id}</span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          )}
        </>
      )}



      {viewMode === 'dataservices' && (
        <>
          {selectedNode.type === 'dataservice' && (
            <>
              <h4>📊 Dataservice Info</h4>
              <p><strong>Protection Level:</strong> {selectedNode.meta?.originalDataservice?.protection_level || 'N/A'}</p>

              <p><strong>Linked Software:</strong></p>
              <ul>
                {validEdges
                  .filter(e => e.source === selectedNode.id && e.type === 'dataservice-software')
                  .map(e => {
                    const node = mappedNodes.find(n => n.id === e.target);
                    if (!node) return null;
                    return (
                      <li key={e.id} className={styles.listItemWithTooltip}>
                        {node.id}
                        <span className={styles.tooltip}>{node.id}</span>
                      </li>
                    );
                  })}
              </ul>

              <p><strong>Principal Software:</strong> {selectedNode.meta?.originalDataservice?.principal_software || 'N/A'}</p>

              <p><strong>Users:</strong></p>
              <ul>
                {(selectedNode.meta?.originalDataservice?.person_groups || []).map((userId: string) => (
                  <li key={userId}>{userId}</li>
                ))}
              </ul>
            </>
          )}

          {selectedNode.type === 'user' && (
            <>
              <h4>👤 User Info</h4>
              <p><strong>Dataservices Accessible:</strong></p>
              <ul>
                {validEdges
                  .filter(e => e.source === selectedNode.id && e.type === 'user-dataservice')
                  .map(e => {
                    const node = mappedNodes.find(n => n.id === e.target);
                    if (!node) return null;
                    return (
                      <li key={e.id} className={styles.listItemWithTooltip}>
                        {node.id}
                        <span className={styles.tooltip}>{node.id}</span>
                      </li>
                    );
                  })}
              </ul>
            </>
          )}

          {selectedNode.type === 'software' && (
            <>
              <h4>💾 Software Info</h4>
              <p><strong>Installed on computer:</strong> {selectedNode.meta?.computerId || 'Unknown'}</p>
              <p><strong>User:</strong> {selectedNode.meta?.originalSoftware?.person_group_id || 'N/A'}</p>

              <p><strong>Dataservices:</strong></p>
              <ul>
                {validEdges
                  .filter(e => e.target === selectedNode.id && e.type === 'dataservice-software')
                  .map(e => {
                    const node = mappedNodes.find(n => n.id === e.source);
                    if (!node) return null;
                    return (
                      <li key={e.id} className={styles.listItemWithTooltip}>
                        {node.id}
                        <span className={styles.tooltip}>{node.id}</span>
                      </li>
                    );
                  })}
              </ul>
            </>
          )}
        </>
      )}


      {viewMode === 'firewalls' && (
        <>
          {selectedNode.type === 'internet' && (
            <>
              <h4>🌐 Internet Info</h4>
              <p><strong>Outbound Connections:</strong></p>
              <ul>
                {validEdges
                  .filter(e => e.source === selectedNode.id && e.type === 'internet')
                  .map(e => {
                    const node = mappedNodes.find(n => n.id === e.target);
                    return node ? (
                      <li key={e.id} className={styles.listItemWithTooltip}>
                        {node.id}
                        <span className={styles.tooltip}>{node.id}</span>
                      </li>
                    ) : null;
                  })}
              </ul>

              <p><strong>Inbound Connections:</strong></p>
              <ul>
                {validEdges
                  .filter(e => e.target === selectedNode.id && e.type === 'internet')
                  .map(e => {
                    const node = mappedNodes.find(n => n.id === e.source);
                    return node ? (
                      <li key={e.id} className={styles.listItemWithTooltip}>
                        {node.id}
                        <span className={styles.tooltip}>{node.id}</span>
                      </li>
                    ) : null;
                  })}
              </ul>
            </>
          )}

          {selectedNode.type === 'software' && (
            <>
              <h4>💾 Software Info</h4>
              <p><strong>Type:</strong> Software</p>
              <p><strong>Computer:</strong> {selectedNode.meta?.computer_idn || 'Unknown'}</p>
              <p><strong>Firewall Rules - Outbound:</strong></p>
              <ul>
                {validEdges
                  .filter(e => e.source === selectedNode.id && e.type === 'software-software')
                  .map(e => {
                    const node = mappedNodes.find(n => n.id === e.target);
                    return node ? (
                      <li key={e.id} className={styles.listItemWithTooltip}>
                        {node.id}
                        <span className={styles.tooltip}>{node.id}</span>
                      </li>
                    ) : null;
                  })}
              </ul>

              <p><strong>Firewall Rules - Inbound:</strong></p>
              <ul>
                {validEdges
                  .filter(e => e.target === selectedNode.id && e.type === 'software-software')
                  .map(e => {
                    const node = mappedNodes.find(n => n.id === e.source);
                    return node ? (
                      <li key={e.id} className={styles.listItemWithTooltip}>
                        {node.id}
                        <span className={styles.tooltip}>{node.id}</span>
                      </li>
                    ) : null;
                  })}
              </ul>

              <p><strong>Internet connection:</strong> {validEdges.some(e =>
                (e.source === selectedNode.id || e.target === selectedNode.id) &&
                e.type === 'internet'
              ) ? 'Yes' : 'No'}</p>
            </>
          )}
        </>
      )}
    </div>
  );
};

export default NodeInfoPanel;
