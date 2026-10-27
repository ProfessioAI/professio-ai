"use client";

import { useEffect } from "react";

/**
 * Moves the orange shine around the outlines of the main panels as the page scrolls. Every scroll,
 * in any scrolling area, nudges the highlight a little further round (and back again when you
 * scroll up). The stylesheet draws the shine from the `--shine` angle set here.
 */
export default function ScrollShine() {
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    const last = new WeakMap<EventTarget, number>();
    let angle = 40; // where the highlight rests before any scrolling
    let frame = 0;
    const root = document.documentElement;
    root.style.setProperty("--shine", `${angle}deg`);

    const onScroll = (e: Event) => {
      if (reduce.matches || root.getAttribute("data-motion") === "reduced")
        return;
      const el = e.target;
      const top =
        el instanceof Element
          ? el.scrollTop
          : (document.scrollingElement?.scrollTop ?? 0);
      // A scrolling area we haven't heard from yet started at the top.
      const prev = last.get(el as EventTarget) ?? 0;
      last.set(el as EventTarget, top);
      angle += (top - prev) * 0.45;
      if (!frame)
        frame = requestAnimationFrame(() => {
          frame = 0;
          root.style.setProperty(
            "--shine",
            `${((angle % 360) + 360) % 360}deg`,
          );
        });
    };
    // Scroll events don't bubble, so listen in the capture phase to hear every scrolling area.
    window.addEventListener("scroll", onScroll, {
      capture: true,
      passive: true,
    });
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);
  return null;
}
