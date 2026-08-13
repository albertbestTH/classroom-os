"use client";

import { ChevronUp } from "lucide-react";
import { useEffect, useState } from "react";

const visibilityThreshold = 500;

export function InlineScrollToTopButton() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    function updateVisibility() {
      setVisible(window.scrollY > visibilityThreshold);
    }

    updateVisibility();
    window.addEventListener("scroll", updateVisibility, { passive: true });
    return () => window.removeEventListener("scroll", updateVisibility);
  }, []);

  function scrollToTop() {
    const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

    setVisible(false);
    window.scrollTo({
      top: 0,
      behavior: reduceMotion ? "auto" : "smooth",
    });
  }

  return (
    <div data-testid="inline-scroll-to-top-container" className="mt-4 flex justify-end">
      <button
        type="button"
        aria-label="กลับขึ้นด้านบน"
        aria-hidden={!visible}
        tabIndex={visible ? 0 : -1}
        onClick={scrollToTop}
        className={`relative inline-flex size-11 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-blue-600 shadow-sm transition-[opacity,transform,background-color] duration-200 hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 ${visible ? "pointer-events-auto scale-100 opacity-100" : "pointer-events-none scale-90 opacity-0"}`}
      >
        <ChevronUp aria-hidden="true" size={20} strokeWidth={2} />
      </button>
    </div>
  );
}
