import { useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSession } from '../context/SessionContext';
import { parseJSONToGraph } from '../services/JSONParser';
import styles from './jsonfiletable.module.scss';

interface FileItem {
  name: string;
  size: string;
  date: string;
  timestamp: number;
  fileObject: File;
  content?: string;
}

type SortField = 'name' | 'date';
type SortDirection = 'asc' | 'desc';

export default function JsonFileTable() {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [openDropdownIndex, setOpenDropdownIndex] = useState<number | null>(null);
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const { setGraphData } = useSession();

  const handleAddClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles) return;

    const now = new Date();
    const newFiles: FileItem[] = Array.from(selectedFiles).map((file) => ({
      name: file.name,
      size: `${Math.round(file.size / 1024)} KB`,
      date: now.toLocaleDateString('hr-HR'),
      timestamp: now.getTime(),
      fileObject: file
    }));

    setFiles((prev) => [...prev, ...newFiles]);
  };

  const handleSort = (field: SortField) => {
    const newDirection = sortField === field && sortDirection === 'asc' ? 'desc' : 'asc';
    setSortField(field);
    setSortDirection(newDirection);

    const sortedFiles = [...files].sort((a, b) => {
      let comparison = 0;

      if (field === 'name') {
        comparison = a.name.localeCompare(b.name);
      } else if (field === 'date') {
        comparison = a.timestamp - b.timestamp;
      }

      return newDirection === 'asc' ? comparison : -comparison;
    });

    setFiles(sortedFiles);
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return '↕️';
    return sortDirection === 'asc' ? '↑' : '↓';
  };

  const handleDownload = (type: 'original' | 'modified', file: FileItem) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      if (typeof event.target?.result === 'string') {
        const blob = new Blob([event.target.result], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${type}-${file.name}`;
        link.click();
        URL.revokeObjectURL(url);
      }
    };
    reader.readAsText(file.fileObject);
  };

  const handleEdit = async (file: FileItem) => {
    const reader = new FileReader();
    reader.onload = async (event) => {
      if (typeof event.target?.result === 'string') {
        try {
          const mainJson = JSON.parse(event.target.result);
          const inputJson = files.find(f => f.name.toLowerCase().includes('input'));
          let inputParsed = null;

          if (inputJson) {
            const inputText = await inputJson.fileObject.text();
            inputParsed = JSON.parse(inputText);
          }

          const graph = parseJSONToGraph(mainJson, inputParsed);
          setGraphData(graph);
          navigate('/viewer');
        } catch (err) {
          console.error('Error parsing JSON:', err);
        }
      }
    };
    reader.readAsText(file.fileObject);
  };

  const handleViewAllInGraph = () => {
    navigate('/viewer', {
      state: {
        mode: 'all',
        files: files.map((f) => f.fileObject),
      },
    });
  };

  const handleExit = () => {
    navigate('/login');
  };

  return (
    <div className={styles.pageWrapper}>
      <div className={styles.exitWrapper}>
        <button className={styles.exitButton} onClick={handleExit}>EXIT</button>
      </div>

      <div className={styles.container}>
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <h2>Upload JSON Files</h2>
          </div>
          <div className={styles.headerRight}>
            <button className={styles.addButton} onClick={handleAddClick}>+ ADD FILE</button>
            {files.length > 0 && (
              <button className={styles.graphButton} onClick={handleViewAllInGraph}>
                📊 DISPLAY GRAPH
              </button>
            )}
          </div>
          <input type="file" accept=".json" ref={fileInputRef} onChange={handleFileChange} multiple style={{ display: 'none' }} />
        </div>

        <table className={styles.table}>
          <thead>
            <tr>
              <th>File name <button className={styles.sortButton} onClick={() => handleSort('name')}>{getSortIcon('name')}</button></th>
              <th>File size</th>
              <th>Upload date <button className={styles.sortButton} onClick={() => handleSort('date')}>{getSortIcon('date')}</button></th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {files.map((file, index) => (
              <tr key={index}>
                <td className={styles.centered}>{file.name}</td>
                <td>{file.size}</td>
                <td>{file.date}</td>
                <td className={styles.actions}>
                  <button onClick={() => handleEdit(file)}>✏️</button>
                  <div className={styles.dropdownWrapper}>
                    <button onClick={() => setOpenDropdownIndex(openDropdownIndex === index ? null : index)}>⬇️</button>
                    {openDropdownIndex === index && (
                      <div className={styles.dropdown}>
                        <button onClick={() => handleDownload('original', file)}>Download Original</button>
                        <button onClick={() => handleDownload('modified', file)}>Download Modified</button>
                      </div>
                    )}
                  </div>
                  <button onClick={() => setFiles((prev) => prev.filter((_, i) => i !== index))}>🗑️</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className={styles.footer}>Total files: {files.length}</div>
      </div>
    </div>
  );
}