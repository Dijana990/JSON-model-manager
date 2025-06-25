/**
 * SessionContext
 *
 * Ovaj kontekst služi za centralno upravljanje grafom unutar React aplikacije.
 * Omogućuje dijeljenje podataka o čvorovima i rubovima (`graphData`)
 * između različitih komponenti bez potrebe za prop-drillingom.
 *
 * U kombinaciji s `useGraph` hookom, omogućuje dodavanje, ažuriranje i dohvaćanje grafa
 * na jednostavan i konzistentan način.
 */
import { createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import type { GraphData } from '../types';
import { useState } from 'react';

// Tip koji opisuje strukturu dostupnih podataka u kontekstu
type SessionContextType = {
  graphData: GraphData; // Trenutni prikaz grafa (čvorovi + rubovi)
  setGraphData: (data: GraphData) => void; // Funkcija za ažuriranje grafa
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

  return (
    <SessionContext.Provider value={{ graphData, setGraphData }}>
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