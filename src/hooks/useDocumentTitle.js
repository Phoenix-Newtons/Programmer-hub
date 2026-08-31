import { useEffect } from "react";
import { SITE } from "../lib/site";

/** Sets the browser tab title per page. */
export default function useDocumentTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} • ${SITE.name}` : SITE.name;
  }, [title]);
}
