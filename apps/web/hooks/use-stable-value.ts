import { useRef } from "react";

export const useStableValue = <T>(value: T) => {
  const ref = useRef(value);
  ref.current = value;
  return ref;
};
