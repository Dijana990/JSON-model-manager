/**
 * index.ts (types)
 * ---------------------
 * Sadrži sve ključne TypeScript tipove korištene u aplikaciji:
 * - NodeType: opisuje čvorove u grafu (računala, softver, mreže, korisnici, servisi itd.)
 * - EdgeType: opisuje veze između čvorova s podrškom za različite tipove odnosa
 * - GraphData: struktura s listom čvorova i veza (graf)
 * - FileWrapper & FileItem: koriste se za rad s JSON datotekama (upload, prikaz, obrada)
 *
 * Tipovi su osnova za statičku provjeru i rad s podacima unutar grafičkog editora.
 */

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
  provides_services?: string[];
  provides_network_services?: string[];
  computer_idn?: string;
  meta?: {
    network_ids?: number[];
    groupLabel?: string;
    provides_services?: string[];
    provides_network_services?: string[];
    computer_idn?: string;
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

export type FileItem = File | { 
  name: string; content: string } | { name: string; size: string; date: string; timestamp: number; fileObject: File };

export enum GraphViewMode {
  Landscape = 'landscape',
  DataServices = 'dataservices',
  Firewalls = 'firewalls',
  Credentials = 'credentials'
};

export interface Software {
  person_index: number;
  person_group_id: string | null;
  provides_user_services: string[];
  provides_network_services: string[];
  // ➕ dodaj po potrebi druge property-je (idn, cpe_idn itd.)
}

export interface Computer {
  installed_software: Record<string, Software>;
  person_index: number;
  provides_network_services: string[];
  network_idn: number[];
  // ➕ dodaj po potrebi druge property-je
}