"use client";

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";
import { cx } from "@/components/ui";

/**
 * Plutajući prozor uz polje (izbor datuma, vremena, opcije): ispod polja ili iznad ako dolje nema mjesta,
 * uvijek unutar ekrana. Bez width ide širinom polja. Esc, klik ili fokus van prozora ga zatvaraju.
 */
export function Popover({
  id,
  anchor,
  label,
  width,
  onClose,
  className,
  children,
}: {
  id: string;
  anchor: RefObject<HTMLElement | null>;
  label: string;
  width?: number;
  onClose: (refocus?: boolean) => void;
  className?: string;
  children: ReactNode;
}) {
  const pop = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  useLayoutEffect(() => {
    closeRef.current = onClose;
  });
  // U otvorenom <dialog> (top layer) prozor mora biti unutar njega, inače ostaje ispod
  const [container] = useState(() => anchor.current?.closest("dialog") ?? document.body);

  useLayoutEffect(() => {
    const el = pop.current;
    const a = anchor.current;
    if (!el || !a) return;
    const place = () => {
      const r = a.getBoundingClientRect();
      const vw = document.documentElement.clientWidth;
      const vh = window.innerHeight;
      const gap = 6;
      const edge = 12;
      if (width === undefined) el.style.width = `${Math.max(r.width, 240)}px`;
      const h = el.offsetHeight;
      const fitsBelow = r.bottom + gap + h <= vh - edge;
      const fitsAbove = r.top - gap - h >= edge;
      el.style.top = `${fitsBelow || !fitsAbove ? r.bottom + gap : r.top - gap - h}px`;
      el.style.left = `${Math.max(edge, Math.min(r.left, vw - el.offsetWidth - edge))}px`;
    };
    place();
    const ro = new ResizeObserver(place);
    ro.observe(el);
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [anchor, width]);

  // Polje (s naslovom) samo prebacuje otvoreno/zatvoreno, pa se ne računa kao "van prozora"
  const isField = (t: Node) => (anchor.current?.closest("label") ?? anchor.current)?.contains(t);

  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (pop.current?.contains(t) || isField(t)) return;
      closeRef.current(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  });

  return createPortal(
    <div
      ref={pop}
      id={id}
      role="dialog"
      aria-label={label}
      style={width === undefined ? undefined : { width }}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.preventDefault();
          e.stopPropagation();
          onClose();
        }
      }}
      onBlur={(e) => {
        // Fokus na samo polje: zatvara ga njegov klik, inače bi se prozor zatvorio pa odmah ponovo otvorio
        const next = e.relatedTarget as Node | null;
        if (next && !pop.current?.contains(next) && !isField(next)) onClose(false);
      }}
      className={cx(
        "pop-in fixed left-0 top-0 z-50 max-w-[calc(100vw-24px)] rounded-lg border border-line bg-panel text-[14px] text-fg shadow-pop",
        className ?? "p-3",
      )}
    >
      {children}
    </div>,
    container,
  );
}
