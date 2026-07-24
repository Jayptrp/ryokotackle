"use client";

import { useEffect } from "react";

/**
 * Injects the admin's "advanced custom code" (from /admin/seo/settings) into the
 * page. This is the escape hatch for arbitrary marketing/tracking snippets —
 * Facebook Pixel, extra verification tags, CTA widgets, etc.
 *
 * Why a client-side injector instead of server-rendering the string: setting raw
 * HTML that contains <script> via React (or innerHTML) does NOT execute the
 * script. Here we parse the snippet and re-create each <script> node so it runs,
 * exactly like a browser would. Runs once after hydration — fine for
 * analytics/pixels/CTA (things that must be in the initial HTML, like GSC
 * verification or GA/GTM, have their own dedicated server-rendered fields).
 */
function inject(target: HTMLElement, html: string, marker: string) {
  // Guard against double injection (React strict mode / fast refresh).
  if (target.querySelector(`[data-custom-code="${marker}"]`)) return;

  const template = document.createElement("template");
  template.innerHTML = html;

  for (const node of Array.from(template.content.childNodes)) {
    if (node.nodeName === "SCRIPT") {
      const original = node as HTMLScriptElement;
      const script = document.createElement("script");
      for (const attr of Array.from(original.attributes)) {
        script.setAttribute(attr.name, attr.value);
      }
      script.textContent = original.textContent;
      script.setAttribute("data-custom-code", marker);
      target.appendChild(script);
    } else {
      if (node instanceof HTMLElement) node.setAttribute("data-custom-code", marker);
      target.appendChild(node);
    }
  }
}

export function CustomCode({
  head,
  body,
}: {
  head?: string | null;
  body?: string | null;
}) {
  useEffect(() => {
    if (head?.trim()) inject(document.head, head, "head");
    if (body?.trim()) inject(document.body, body, "body");
  }, [head, body]);

  return null;
}
