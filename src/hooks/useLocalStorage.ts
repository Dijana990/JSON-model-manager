/**
 * Custom hook: useLocalStorage
 *
 * Ovaj hook omogućuje trajno spremanje i dohvaćanje vrijednosti iz localStorage-a
 * koristeći React-ov `useState` i `useEffect`.
 *
 * Namijenjen je komponentama koje žele zadržati stanje i nakon osvježavanja stranice.
 * Npr. korisnički odabiri, prikazani elementi, postavke, itd.
 *
 * Hook vraća identičan API kao `useState`, ali s dodatnim efektom čuvanja podataka u localStorage.
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
      console.warn('Error reading localStorage key:', key); // fallback u slučaju greške
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
