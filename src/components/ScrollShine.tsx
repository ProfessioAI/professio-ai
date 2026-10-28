"use client";

import { useEffect } from "react";

/**
 * Turns the orange shine on the outlines of the main panels as the page scrolls. Scrolling down
 * turns it one way and scrolling up turns it back. The angle is never wrapped back to zero (that
 * is what made the shine snap across to the other side); it just keeps counting, and the gradient
 * wraps round by itself. It eases to each new angle, a few degrees at a time.
 */
export default function ScrollShine() {
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    const last = new WeakMap<EventTarget, number>();
    const root = document.documentElement;
    let target = 40; // where the shine is heading, in degrees
    let current = 40; // where it is now
    let frame = 0;
    root.style.setProperty("--shine", `${current}deg`);

    const tick = () => {
      frame = 0;
      const gap = target - current;
      current = Math.abs(gap) < 0.05 ? target : current + gap * 0.12;
      root.style.setProperty("--shine", `${current.toFixed(2)}deg`);
      if (current !== target) frame = requestAnimationFrame(tick);
    };

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
      target += Math.max(-6, Math.min(6, (top - prev) * 0.15));
      if (!frame) frame = requestAnimationFrame(tick);
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
