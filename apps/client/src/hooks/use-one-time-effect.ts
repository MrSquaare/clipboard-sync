import { useEffect, useRef } from "react";

export const useOneTimeEffect = (effect: () => void | (() => void)): void => {
  const hasRunRef = useRef(false);

  useEffect(() => {
    if (hasRunRef.current) return;

    hasRunRef.current = true;

    const cleanup = effect();

    return cleanup;
  }, [effect]);
};
