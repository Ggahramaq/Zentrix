"use client";

import { Analytics } from "@vercel/analytics/next";

export function WebAnalytics() {
  return (
    <Analytics
      beforeSend={(event) => {
        // Do not include visitor-supplied query parameters or fragments in analytics URLs.
        const url = new URL(event.url, window.location.origin);
        url.search = "";
        url.hash = "";
        return { ...event, url: url.toString() };
      }}
    />
  );
}
