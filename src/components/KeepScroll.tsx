import { useEffect, useRef, type ReactNode } from 'react';

/**
 * Leaflet re-lays-out a popup whenever its content changes (e.g. after "בטלו סימון"),
 * which resets a scrolled apartment list to the top. Remember the scroll position
 * and put it back right after Leaflet's update.
 */
export function KeepScroll({ watch, children }: { watch: unknown; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const lastTop = useRef(0);

  // Track where the kid scrolled to.
  useEffect(() => {
    const scroller = ref.current?.closest<HTMLElement>('.leaflet-popup-content');
    if (!scroller) return;
    const onScroll = () => {
      lastTop.current = scroller.scrollTop;
    };
    scroller.addEventListener('scroll', onScroll, { passive: true });
    return () => scroller.removeEventListener('scroll', onScroll);
  }, []);

  // After the content changes, restore it once Leaflet has finished its own update.
  // Leaflet re-lays-out the popup synchronously in react-leaflet's effect, which runs
  // right after this one, so a microtask is late enough; the timeout is a safety net.
  // (No requestAnimationFrame: it doesn't run while a page is in the background.)
  useEffect(() => {
    const scroller = ref.current?.closest<HTMLElement>('.leaflet-popup-content');
    if (!scroller || lastTop.current === 0) return;
    const top = lastTop.current;
    let cancelled = false;
    const restore = () => {
      if (!cancelled && scroller.scrollTop !== top) scroller.scrollTop = top;
    };
    queueMicrotask(restore);
    const timer = setTimeout(restore, 0);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [watch]);

  return <div ref={ref}>{children}</div>;
}
