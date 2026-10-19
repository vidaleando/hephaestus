import { useEffect, useState } from "react";
import { readLocal, writeLocal } from "./storage";

/** useState that remembers its value in localStorage for this device. */
export function usePersistentState<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => readLocal(key, initial));
  useEffect(() => writeLocal(key, value), [key, value]);
  return [value, setValue] as const;
}
