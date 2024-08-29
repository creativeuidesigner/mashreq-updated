import { useState, useEffect } from "react";

const useMediaQuery = (query) => {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const mediaQueryList = window.matchMedia(query);
    const documentChangeHandler = () => setMatches(mediaQueryList.matches);

    // Set the initial state
    documentChangeHandler();

    // Listen for changes in the media query
    mediaQueryList.addEventListener("change", documentChangeHandler);

    // Cleanup the event listener on component unmount
    return () =>
      mediaQueryList.removeEventListener("change", documentChangeHandler);
  }, [query]);

  return matches;
};

export default useMediaQuery;
