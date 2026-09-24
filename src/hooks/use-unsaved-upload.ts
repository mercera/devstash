"use client";

import { useEffect, useRef } from "react";

import { discardUpload } from "@/lib/upload-client";

/**
 * Tracks an upload not yet attached to an item, and discards it when the form
 * goes away without creating one: cancelled or closed with Escape (an
 * unmount), or the page reloaded or closed (`pagehide` — unload runs no React
 * cleanup). `discardUpload` is a keepalive request, so it outlives the page.
 *
 * `track` records the current upload (or none); `keep` hands it over to the
 * item that now uses it, so it survives the form closing.
 */
export function useUnsavedUpload() {
  const unsavedFileUrl = useRef<string | null>(null);

  useEffect(() => {
    function discardUnsaved() {
      if (unsavedFileUrl.current) discardUpload(unsavedFileUrl.current);
      unsavedFileUrl.current = null;
    }

    window.addEventListener("pagehide", discardUnsaved);

    return () => {
      window.removeEventListener("pagehide", discardUnsaved);
      discardUnsaved();
    };
  }, []);

  return {
    track(fileUrl: string | null) {
      unsavedFileUrl.current = fileUrl;
    },
    keep() {
      unsavedFileUrl.current = null;
    },
  };
}
