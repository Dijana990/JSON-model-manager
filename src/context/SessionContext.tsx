/**
 * SessionContext
 *
 * Globalni React kontekst koji omogućuje centralizirano upravljanje stanjem grafa (čvorovi i rubovi)
 * unutar cijele aplikacije. Koristi se za dijeljenje grafa između više komponenti bez potrebe
 * za prosljeđivanjem propsa (prop-drilling).
 *
 * Kombiniranjem s `useGraph` hookom omogućuje:
 * - Dohvaćanje trenutnog grafa
 * - Ažuriranje grafa iz bilo koje komponente
 * - Korištenje undo/redo funkcionalnosti (u sklopu `useGraph`)
 *
 * Ovaj kontekst mora obuhvaćati sve dijelove aplikacije koji trebaju pristup grafu,
 * koristeći `SessionProvider` komponentu.
 */

import { createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import type { GraphData } from '../types';
import { useState } from 'react';

// Tip koji opisuje strukturu dostupnih podataka u kontekstu
type SessionContextType = {
  graphData: GraphData; // Trenutni prikaz grafa (čvorovi + rubovi)
  setGraphData: (data: GraphData) => void; // Funkcija za ažuriranje grafa
  outputJson: any;
  setOutputJson: (data: any) => void;
};

// Početni (prazni) graf koji se koristi pri inicijalizaciji
const defaultGraphData: GraphData = {
  nodes: [],
  edges: [],
};
// Inicijalizacija konteksta (bez vrijednosti, dok se ne wrapa u Provider)
const SessionContext = createContext<SessionContextType | undefined>(undefined);

/**
 * SessionProvider
 * Omotava dio aplikacije koji treba pristup grafu.
 * Služi za spremanje i ažuriranje grafa pomoću React stanja.
 */
export const SessionProvider = ({ children }: { children: ReactNode }) => {
  const [graphData, setGraphData] = useState<GraphData>(defaultGraphData);
  const [outputJson, setOutputJson] = useState<any>(null);

  return (
    <SessionContext.Provider value={{ graphData, setGraphData, outputJson, setOutputJson }}>
      {children}
    </SessionContext.Provider>
  );
};

/**
 * useSession
 * Custom hook koji dohvaća kontekst grafa.
 * Baca grešku ako se koristi izvan `SessionProvider` komponente.
 */
export const useSession = (): SessionContextType => {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return context;
};