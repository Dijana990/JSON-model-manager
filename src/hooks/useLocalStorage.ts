/**
 * Custom hook: useLocalStorage
 *
 * React hook koji omogućuje trajno spremanje i dohvaćanje stanja putem `localStorage` mehanizma preglednika.
 * Implementiran je pomoću `useState` i `useEffect`, te vraća identičan API kao `useState`,
 * uz dodatnu funkcionalnost automatskog spremanja podataka.
 *
 * Glavne značajke:
 * - Čuva podatke i nakon osvježavanja stranice
 * - Automatski sinkronizira stanje s `localStorage`
 * - Pogodno za korisničke postavke, prikazne opcije, filtere, itd.
 *
 * @param key - Jedinstveni ključ pod kojim se vrijednost sprema u `localStorage`
 * @param initialValue - Početna vrijednost ako u `localStorage` ne postoji nijedna
 * @returns [storedValue, setStoredValue] - Trenutna vrijednost i funkcija za ažuriranje
 */

import { useState, useEffect } from 'react';

/**
 * useLocalStorage
 * @param key - Ključ pod kojim će se vrijednost spremiti u localStorage
 * @param initialValue - Početna vrijednost ako nema spremljene vrijednosti u localStorage
 * @returns [storedValue, setStoredValue] - Stanje i funkcija za njegovo ažuriranje (kao iz useState)
 */
export function useLocalStorage<T>(key: string, initialValue: T) {
  // Inicijalizira stanje pokušavajući dohvatiti vrijednost iz localStorage-a
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = localStorage.getItem(key); // pokušaj dohvatiti spremljeni podatak
      return item ? JSON.parse(item) : initialValue; // ako postoji, parsiraj ga; inače koristi početnu vrijednost
    } catch (error) {
      return initialValue;
    }
  });
  // Kad se storedValue ili key promijene, spremi novu vrijednost u localStorage
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(storedValue)); // serijalizira vrijednost kao string
    } catch (error) {
      console.warn('Error setting localStorage key:', key);
    }
  }, [key, storedValue]);
  // Vraća trenutno stanje i setter funkciju (kao useState)
  return [storedValue, setStoredValue] as const;
}
