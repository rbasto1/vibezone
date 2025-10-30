import { useEffect, useState } from "react";

export function useStateSessionStorage(
  key: string,
  initialValue: string = ""
): [string, (value: string | ((val: string) => string)) => void] {
  // State to store our value
  // Pass initial state function to useState so logic is only executed once
  const [storedValue, setStoredValue] = useState<string>(() => {
    if (typeof window === "undefined") {
      return initialValue;
    }
    try {
      // Get from session storage by key
      const item = window.sessionStorage.getItem(key);
      // Parse stored json or return initialValue if none exists
      const value: unknown = item ? JSON.parse(item) : initialValue;
      if (typeof value !== "string") {
        throw new Error(
          `Invalid value for sessionStorage key "${key}": expected string, got ${typeof value}`
        );
      }
      return value;
    } catch (error) {
      // If error also return initialValue
      console.error(`Error reading sessionStorage key "${key}":`, error);
      return initialValue;
    }
  });

  // Return a wrapped version of useState's setter function that persists the new value to sessionStorage
  const setValue = (value: string | ((val: string) => string)) => {
    try {
      // Allow value to be a function so we have same API as useState
      const valueToStore =
        typeof value === "function" ? value(storedValue) : value;

      // Save to state
      setStoredValue(valueToStore);

      // Save to session storage
      if (typeof window !== "undefined") {
        window.sessionStorage.setItem(key, JSON.stringify(valueToStore));
      }
    } catch (error) {
      console.error(`Error setting sessionStorage key "${key}":`, error);
    }
  };

  // Sync state with session storage when the key changes
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === key && e.newValue !== JSON.stringify(storedValue)) {
        try {
          const value: unknown = e.newValue
            ? JSON.parse(e.newValue)
            : initialValue;
          if (typeof value !== "string") {
            throw new Error(
              `Invalid value for sessionStorage key "${key}": expected string, got ${typeof value}`
            );
          }
          setStoredValue(value);
        } catch (error) {
          console.error(
            `Error parsing sessionStorage value for key "${key}":`,
            error
          );
        }
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [key, storedValue, initialValue]);

  return [storedValue, setValue];
}

export default useStateSessionStorage;
