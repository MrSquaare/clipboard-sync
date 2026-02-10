import { useEffect, useRef } from "react";

export const useOneTimeEffect = (effect: () => void | (() => void)): void => {
  const effectRef = useRef(effect);
  const hasRunRef = useRef(false);

  useEffect(() => {
    if (hasRunRef.current) return;

    hasRunRef.current = true;

    return effectRef.current();
  }, []);
};
