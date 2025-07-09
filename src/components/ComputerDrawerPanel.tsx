import React, { useState } from 'react';
import styles from './ComputerEditorPanel.module.scss';

// Define basic types for this component
interface NodeType {
    id: string;
    label: string;
    meta?: {
        network_ids?: number[];
        originalComputer?: {
            data?: string[];
            used_hardware_quota?: number;
            installed_software?: Record<string, any>;
            stored_credentials?: any[];
        };
    };
}

type Props = {
    computers: NodeType[];
    selectedComputer: NodeType | null;
    outputJson: any;
    onSelectComputer: (node: NodeType) => void;
    onSave: (updated: NodeType) => void;
    onCancel: () => void;
};

const ComputerDrawerPanel: React.FC<Props> = ({
    computers,
    selectedComputer,
    onSelectComputer,
    onSave,
    onCancel
}) => {
    const [activeTab, setActiveTab] = useState('general');
    const [drawerWidth, setDrawerWidth] = useState(400);
    const [collapsed, setCollapsed] = useState(false);

    // Dohvati sve network segmente
    const availableNetworks = Array.from(
        new Set(
            computers.flatMap(comp => comp.meta?.network_ids || [])
        )
    ).map(id => ({
        id: String(id),
        label: `Network ${id}`
    }));

    // Dohvati trenutno dodijeljenu mrežu za selectedComputer
    const currentNetworkId = Array.isArray(selectedComputer?.meta?.network_ids)
        ? String(selectedComputer.meta.network_ids[0])
        : '';

    const [selectedNetwork, setSelectedNetwork] = useState<string>(currentNetworkId || '');

    React.useEffect(() => {
        if (selectedComputer) {
            const currentNetwork = selectedComputer.meta?.network_ids?.[0] || '';
            setSelectedNetwork(String(currentNetwork));
        } else {
            setSelectedNetwork('');
        }
    }, [selectedComputer]);

    const toggleCollapse = () => {
        setCollapsed(!collapsed);
        setDrawerWidth(collapsed ? 400 : 20);
    };

    const startResizing = (e: React.MouseEvent) => {
        e.preventDefault();
        const startX = e.clientX;
        const startWidth = drawerWidth;

        const handleMouseMove = (moveEvent: MouseEvent) => {
            const newWidth = startWidth - (moveEvent.clientX - startX);
            setDrawerWidth(Math.max(250, Math.min(800, newWidth)));
        };

        const handleMouseUp = () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    };

    if (!selectedComputer) return null;

    return (
        <div
            className={`${styles.panel} ${collapsed ? styles.collapsed : ''}`}
            style={{ width: collapsed ? '20px' : `${drawerWidth}px` }}
        >
            {/* Resize handle for dragging */}
            {!collapsed && (
                <div 
                    className={styles.resizeHandle}
                    onMouseDown={startResizing}
                />
            )}
            
            <div
                className={`${styles.headerButtons} ${collapsed ? styles.collapsedButtons : ''}`}
            >
                <button onClick={toggleCollapse} className={styles.backButton}>
                    {collapsed ? '⬅️' : '➡️'}
                </button>

                <button onClick={onCancel} className={styles.closeButton}>
                    ❌
                </button>
            </div>

            {!collapsed && (
                <>
                    <h4 className={styles.sectionTitle}>COMPUTERS LIST</h4>
                    <div className={styles.computersListTableWrapper}>
                        <table className={styles.computersListTable}>
                            <thead>
                                <tr>
                                    <th>Label</th>
                                    <th>Network</th>
                                    <th>HW</th>
                                    <th>SW</th>
                                </tr>
                            </thead>
                            <tbody>
                                {computers.map(comp => (
                                    <tr
                                        key={comp.id}
                                        onClick={() => onSelectComputer(comp)}
                                        className={selectedComputer?.id === comp.id ? styles.selectedRow : ''}
                                    >
                                        <td>{comp.label}</td>
                                        <td>{comp.meta?.network_ids?.join(', ')}</td>
                                        <td>{comp.meta?.originalComputer?.used_hardware_quota || '-'}</td>
                                        <td>{Object.keys(comp.meta?.originalComputer?.installed_software || {}).length}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Tabs */}
                    <div className={styles.tabs}>
                        <button onClick={() => setActiveTab('general')}>General</button>
                        <button onClick={() => setActiveTab('data')}>Data</button>
                        <button onClick={() => setActiveTab('software')}>Software</button>
                        <button onClick={() => setActiveTab('credentials')}>Credentials</button>
                        <button onClick={() => setActiveTab('firewalls')}>Firewalls</button>
                    </div>

                    {/* Tab Content */}
                    <div className={styles.tabContentContainer}>
                        <div className={styles.tabContentScrollable}>
                            {activeTab === 'general' && (
                                <div>
                                    <h4 className={styles.sectionTitle}>General Info</h4>
                                    <div className={styles.generalInfoTableWrapper}>
                                        <table className={styles.generalInfoTable}>
                                            <thead>
                                                <tr>
                                                    <th>Property</th>
                                                    <th>Value</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                <tr>
                                                    <td><strong>ID</strong></td>
                                                    <td>{selectedComputer.id}</td>
                                                </tr>
                                                <tr>
                                                    <td><strong>Label</strong></td>
                                                    <td>{selectedComputer.label}</td>
                                                </tr>
                                                <tr>
                                                    <td><strong>Used HW</strong></td>
                                                    <td>{selectedComputer.meta?.originalComputer?.used_hardware_quota || '-'}</td>
                                                </tr>
                                                <tr>
                                                    <td><strong>Software Count</strong></td>
                                                    <td>{Object.keys(selectedComputer.meta?.originalComputer?.installed_software || {}).length}</td>
                                                </tr>
                                                <tr>
                                                    <td><strong>Data Count</strong></td>
                                                    <td>{(selectedComputer.meta?.originalComputer?.data || []).length}</td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>

                                    <h4 className={styles.sectionTitle}>Network</h4>
                                    <div className={styles.networkTableWrapper}>
                                        <table className={styles.networkTable}>
                                            <thead>
                                                <tr>
                                                    <th>Current Network</th>
                                                    <th>Available Networks</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                <tr>
                                                    <td>{selectedComputer.meta?.network_ids?.join(', ') || 'None'}</td>
                                                    <td>
                                                        <select
                                                            value={selectedNetwork}
                                                            onChange={(e) => setSelectedNetwork(e.target.value)}
                                                        >
                                                            <option value="">Select network</option>
                                                            {availableNetworks.map(net => (
                                                                <option key={net.id} value={net.id}>{net.label}</option>
                                                            ))}
                                                        </select>
                                                    </td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>

                                    <h4 className={styles.sectionTitle}>Data Summary</h4>
                                    <div className={styles.dataSummaryTableWrapper}>
                                        <table className={styles.dataSummaryTable}>
                                            <thead>
                                                <tr>
                                                    <th>Data ID</th>
                                                    <th>Type</th>
                                                    <th>Status</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {(selectedComputer.meta?.originalComputer?.data || []).map((dataItem: string, idx: number) => (
                                                    <tr key={idx}>
                                                        <td>{dataItem}</td>
                                                        <td>Data</td>
                                                        <td>Active</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'data' && (
                                <div>
                                    <h4 className={styles.sectionTitle}>Data</h4>
                                    <div className={styles.dataTableWrapper}>
                                        <table className={styles.dataTable}>
                                            <thead>
                                                <tr>
                                                    <th>IDN</th>
                                                    <th>Type</th>
                                                    <th>Protection</th>
                                                    <th>Person groups</th>
                                                    <th>Linked SW</th>
                                                    <th>Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {(selectedComputer.meta?.originalComputer?.data || []).map((d: string, idx: number) => (
                                                    <tr key={idx}>
                                                        <td>{d}</td>
                                                        <td>Data</td>
                                                        <td>
                                                            <select>
                                                                {[1, 2, 3, 4, 5].map(level => (
                                                                    <option key={level} value={level}>{level}</option>
                                                                ))}
                                                            </select>
                                                        </td>
                                                        <td>
                                                            <select multiple>
                                                                <option value="group1">Group 1</option>
                                                                <option value="group2">Group 2</option>
                                                            </select>
                                                        </td>
                                                        <td>
                                                            <select multiple>
                                                                <option value="sw1">Software 1</option>
                                                                <option value="sw2">Software 2</option>
                                                            </select>
                                                        </td>
                                                        <td>
                                                            <button>Edit</button>
                                                            <button>Delete</button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'software' && (
                                <div>
                                    <h4 className={styles.sectionTitle}>Software</h4>
                                    <div className={styles.softwareTableWrapper}>
                                        <table className={styles.softwareTable}>
                                            <thead>
                                                <tr>
                                                    <th>ID</th>
                                                    <th>Name</th>
                                                    <th>Version/Patch</th>
                                                    <th>Provides services</th>
                                                    <th>Compatible data types</th>
                                                    <th>Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {Object.entries(selectedComputer.meta?.originalComputer?.installed_software || {}).map(([id, sw]: [string, any], idx) => (
                                                    <tr key={idx}>
                                                        <td>{id}</td>
                                                        <td>{sw.name}</td>
                                                        <td>{sw.version} / {sw.patch_level}</td>
                                                        <td>
                                                            <select multiple>
                                                                {(sw.provides_services || []).map((s: string) => (
                                                                    <option key={s} value={s}>{s}</option>
                                                                ))}
                                                            </select>
                                                        </td>
                                                        <td>{(sw.compatible_data_types || []).join(', ')}</td>
                                                        <td>
                                                            <button>Edit</button>
                                                            <button>Delete</button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'credentials' && (
                                <div>
                                    <h4 className={styles.sectionTitle}>Credentials</h4>
                                    <div className={styles.credentialsTableWrapper}>
                                        <table className={styles.credentialsTable}>
                                            <thead>
                                                <tr>
                                                    <th>ID</th>
                                                    <th>Has root</th>
                                                    <th>Linked software</th>
                                                    <th>Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {(selectedComputer.meta?.originalComputer?.stored_credentials || []).map((cred: any, idx: number) => (
                                                    <tr key={idx}>
                                                        <td>{cred.idn}</td>
                                                        <td>
                                                            <input type="checkbox" checked={cred.has_root} readOnly />
                                                        </td>
                                                        <td>
                                                            <select multiple>
                                                                {(cred.linked_software || []).map((sw: string) => (
                                                                    <option key={sw} value={sw}>{sw}</option>
                                                                ))}
                                                            </select>
                                                        </td>
                                                        <td>
                                                            <button>Edit</button>
                                                            <button>Delete</button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'firewalls' && (
                                <div>
                                    <p>TODO: Firewall rules table here</p>
                                </div>
                            )}
                        </div>
                    </div>
                    <div className={styles.actions}>
                        <button onClick={() => onSave(selectedComputer)}>SAVE</button>
                        <button onClick={onCancel}>CANCEL</button>
                    </div>
                </>
            )}
        </div>
    );
};

export default ComputerDrawerPanel;