"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { BACK_CONTROL_CLASS } from "@/components/layout/BackLink";
import { Button } from "@/components/ui/button";

/**
 * Returns to the previous page in the app, or to `fallbackHref` when there is
 * none — a page opened directly, or reached from another site, would
 * otherwise send the visitor out of the app.
 *
 * `document.referrer` is the page that loaded the app, not the last client
 * navigation, so it only tells whether the visit started inside the app.
 */
export function BackButton({ fallbackHref }: { fallbackHref: string }) {
  const router = useRouter();

  function goBack() {
    const startedInApp =
      document.referrer !== "" &&
      new URL(document.referrer).origin === window.location.origin;

    if (startedInApp && window.history.length > 1) {
      router.back();
    } else {
      router.push(fallbackHref);
    }
  }

  return (
    <Button variant="ghost" size="sm" className={BACK_CONTROL_CLASS} onClick={goBack}>
      <ArrowLeft />
      Back
    </Button>
  );
}
