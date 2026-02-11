import { useEffect, useRef, useState } from 'react';

interface UseIntersectionObserverOptions {
  threshold?: number;
  root?: Element | null;
  rootMargin?: string;
  enabled?: boolean;
}

export function useIntersectionObserver<T extends Element>({
  threshold = 0.1,
  root = null,
  rootMargin = '200px', // Trigger 200px before reaching the element
  enabled = true,
}: UseIntersectionObserverOptions = {}) {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const targetRef = useRef<T>(null);

  useEffect(() => {
    if (!enabled) return;

    const target = targetRef.current;
    if (!target) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsIntersecting(entry.isIntersecting);
      },
      {
        threshold,
        root,
        rootMargin,
      }
    );

    observer.observe(target);

    return () => {
      observer.disconnect();
    };
  }, [threshold, root, rootMargin, enabled]);

  return { targetRef, isIntersecting };
}
