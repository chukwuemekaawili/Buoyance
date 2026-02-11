import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const HEADER_OFFSET = 80; // Sticky header height offset

const ScrollToHash = () => {
  const { hash, pathname } = useLocation();

  useEffect(() => {
    if (hash) {
      // Small delay to ensure DOM is ready after route change
      const timeoutId = setTimeout(() => {
        const elementId = hash.replace("#", "");
        const element = document.getElementById(elementId);
        
        if (element) {
          const elementPosition = element.getBoundingClientRect().top;
          const offsetPosition = elementPosition + window.scrollY - HEADER_OFFSET;
          
          window.scrollTo({
            top: offsetPosition,
            behavior: "smooth",
          });
        }
      }, 100);

      return () => clearTimeout(timeoutId);
    }
  }, [hash, pathname]);

  return null;
};

export default ScrollToHash;

/**
 * Helper function to programmatically scroll to a section by ID.
 * Use this in onClick handlers for in-page navigation.
 */
export const scrollToId = (id: string, offset: number = HEADER_OFFSET) => {
  const element = document.getElementById(id);
  if (element) {
    const elementPosition = element.getBoundingClientRect().top;
    const offsetPosition = elementPosition + window.scrollY - offset;
    
    window.scrollTo({
      top: offsetPosition,
      behavior: "smooth",
    });
    
    // Update URL hash without triggering navigation
    window.history.pushState(null, "", `#${id}`);
  }
};
