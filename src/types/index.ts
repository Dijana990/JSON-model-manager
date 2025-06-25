export type NodeType = {
  id: string;
  label: string;
  type: 'computer' | 'software' | 'service' | 'person' | 'network' | 'user-service' | string;
  group?: string;
  icon?: string;
  count?: number;
  fullName?: string;
  x?: number;
  y?: number;
  z?: number;
  meta?: {
    network_ids?: number[];
    groupLabel?: string;
    [key: string]: any;
  };
  software?: string[];
};

export type EdgeType = {
  id: string;
  source: string;
  target: string;
  label?: string;
  type?: 
    | 'computer-software'
    | 'software-service'
    | 'software-user-service'
    | 'computer-person'
    | 'network-software'
    | 'network-computer'
    | string;
};

export type GraphData = {
  nodes: NodeType[];
  edges: EdgeType[];
};

export type FileWrapper = {
  name: string;
  size: string;
  date: string;
  timestamp: number;
  fileObject: File;
};

export type FileItem = File | { name: string; content: string } | { name: string; size: string; date: string; timestamp: number; fileObject: File };