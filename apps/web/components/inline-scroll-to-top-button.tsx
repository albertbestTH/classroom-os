"use client";

import { ChevronUp } from "lucide-react";
import { useEffect, useState } from "react";

// PRODUCT DECISION (locked): keep this as a viewport-following FAB that appears
// only after 500px and disappears at the top. Change only on an explicit PO request.
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
    setVisible(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <button
      type="button"
      data-testid="inline-scroll-to-top-control"
      aria-label="กลับขึ้นด้านบน"
      aria-hidden={!visible}
      tabIndex={visible ? 0 : -1}
      onClick={scrollToTop}
      className={`fixed bottom-6 right-6 z-40 flex size-11 shrink-0 items-center justify-center rounded-full border border-blue-500 bg-blue-600 text-white shadow-lg transition-[opacity,transform,background-color] duration-200 hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 ${visible ? "pointer-events-auto scale-100 opacity-100" : "pointer-events-none scale-90 opacity-0"}`}
    >
      <ChevronUp aria-hidden="true" size={20} strokeWidth={2} />
    </button>
  );
}
