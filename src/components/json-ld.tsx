/**
 * Renders a JSON-LD structured-data script. Server component.
 *
 * Next.js recommends injecting JSON-LD via a <script type="application/ld+json">
 * tag rather than next/head. See:
 * node_modules/next/dist/docs → "JSON-LD".
 */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      // Structured data is trusted, app-generated content.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
