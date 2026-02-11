import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    // Use both methods for maximum compatibility
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    
    // Also scroll the document element and body for edge cases
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [pathname]);

  return null;
};

export default ScrollToTop;