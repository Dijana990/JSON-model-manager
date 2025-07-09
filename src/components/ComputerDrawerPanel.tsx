import React, { useState } from 'react';
import type { NodeType } from '../types';
import { mapComputerDataWithLinkedSoftware } from '../services/JSONParser';
import { useSession } from '../context/SessionContext';
import styles from './ComputerEditorPanel.module.scss';

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
    const { outputJson } = useSession();
    console.log("🗂️ Full outputJson in ComputerDrawerPanel: CDP", outputJson);

    console.log("🛠️ Calling mapComputerDataWithLinkedSoftware with data:", selectedComputer?.meta?.originalComputer?.data);
    console.log("🛠️ outputJson.data keys:", outputJson?.data ? Object.keys(outputJson.data) : "NO DATA");
    const detailedData = selectedComputer
        ? mapComputerDataWithLinkedSoftware(
            selectedComputer.meta?.originalComputer?.data || [],
            outputJson
        )
        : [];
        console.log("💡 detailedData", detailedData);
    const [activeTab, setActiveTab] = useState('general');
    const [drawerWidth, setDrawerWidth] = useState(400);
    const [collapsed, setCollapsed] = useState(false);


    
    // Dohvati sve network segmente iz outputJson
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
        const startX = e.clientX;
        const startWidth = drawerWidth;

        const handleMouseMove = (moveEvent: MouseEvent) => {
            const newWidth = startWidth - (moveEvent.clientX - startX);
            setDrawerWidth(Math.max(250, newWidth));
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
        <div className={styles.panel} style={{ width: collapsed ? '20px' : `${drawerWidth}px` }}
            >
            <div className={styles.resizeHandle} onMouseDown={startResizing}></div>

            <div className={styles.headerButtons}>
                <button onClick={toggleCollapse}>
                    {collapsed ? '➡️' : '⬅️'}
                </button>

                <button onClick={() => onCancel()} className={styles.closeButton}>❌ Close</button>
            </div>

            {!collapsed && (
                <>
                    <div className={styles.computersListContainer}>
                        <h3>COMPUTERS LIST</h3>
                        <table className={styles.table}>
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
                                        <h4>General Info</h4>
                                        <p>ID: {selectedComputer.id}</p>
                                        <p>Label: {selectedComputer.label}</p>

                                        <label>Network:</label>
                                        <select
                                            value={selectedNetwork}
                                            onChange={(e) => setSelectedNetwork(e.target.value)}
                                        >
                                            <option value="">Select network</option>
                                            {availableNetworks.map(net => (
                                                <option key={net.id} value={net.id}>{net.label}</option>
                                            ))}
                                        </select>

                                        <p>Used HW: {selectedComputer.meta?.originalComputer?.used_hardware_quota || '-'}</p>

                                        <h5>Data Summary</h5>
                                        <p>{(selectedComputer.meta?.originalComputer?.data || []).join(', ')}</p>
                                    </div>
                                )}

                                {activeTab === 'data' && (
                                    <table className={styles.table}>
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
                                                    <td>{/* getDataType(d) */}</td>
                                                    <td>
                                                        <select>
                                                            {[1, 2, 3, 4, 5].map(level => (
                                                                <option key={level} value={level}>{level}</option>
                                                            ))}
                                                        </select>
                                                    </td>
                                                    <td>
                                                        <select multiple>
                                                            {/** getAvailablePersonGroups().map(g => (
                                    <option key={g} value={g}>{g}</option>
                                )) */}
                                                        </select>
                                                    </td>
                                                    <td>
                                                        <select multiple>
                                                            {/** getAvailableSoftware(selectedComputer).map(sw => (
                                    <option key={sw.id} value={sw.id}>{sw.label}</option>
                                )) */}
                                                        </select>
                                                    </td>
                                                    <td><button>Edit</button><button>Delete</button></td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}

                                {activeTab === 'software' && (
                                    <table className={styles.table}>
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
                                                    <td><button>Edit</button><button>Delete</button></td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}

                                {activeTab === 'credentials' && (
                                    <table className={styles.table}>
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
                                                        <input type="checkbox" checked={cred.has_root} />
                                                    </td>
                                                    <td>
                                                        <select multiple>
                                                            {(cred.linked_software || []).map((sw: string) => (
                                                                <option key={sw} value={sw}>{sw}</option>
                                                            ))}
                                                        </select>
                                                    </td>
                                                    <td><button>Edit</button><button>Delete</button></td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
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
