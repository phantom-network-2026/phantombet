import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Preserve window scroll position across Radix body-scroll locks
// (Dialog/Select/Popover/AlertDialog/Sheet/DropdownMenu set body styles
// that can cause the page to jump to the top when they open or close).
(function installScrollLockGuard() {
  if (typeof window === "undefined") return;
  let savedY = 0;
  let locked = false;
  const observer = new MutationObserver(() => {
    const body = document.body;
    const isLocked =
      body.hasAttribute("data-scroll-locked") ||
      body.style.overflow === "hidden" ||
      body.style.position === "fixed";
    if (isLocked && !locked) {
      savedY = window.scrollY;
      locked = true;
    } else if (!isLocked && locked) {
      locked = false;
      // Restore scroll on next frame so layout settles first
      requestAnimationFrame(() => window.scrollTo(0, savedY));
    }
  });
  observer.observe(document.body, {
    attributes: true,
    attributeFilter: ["style", "data-scroll-locked"],
  });
})();

createRoot(document.getElementById("root")!).render(<App />);
