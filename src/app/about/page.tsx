import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Container } from "@/components/container";
import { RichContent } from "@/components/rich-content";
import { getPageBySlug } from "@/lib/queries";

// Statically rendered; admins trigger an on-demand revalidate when they save.
export async function generateMetadata(): Promise<Metadata> {
  const page = await getPageBySlug("about");
  return {
    title: page ? `${page.titleTh ?? page.title} — Ryoko Tackle` : "Ryoko Tackle",
  };
}

export default async function AboutPage() {
  const page = await getPageBySlug("about");
  if (!page) notFound();

  return (
    <>
      {/* Hero */}
      <section className="pb-stack-lg pt-section-gap">
        <Container className="text-center">
          <h1 className="mb-stack-sm font-headline-lg text-headline-lg-mobile text-primary md:text-headline-lg">
            {page.titleTh ?? page.title}
          </h1>
        </Container>
      </section>

      {/* Body */}
      <section className="pb-section-gap">
        <Container>
          <div className="mx-auto max-w-3xl">
            {page.content ? (
              <RichContent html={page.content} />
            ) : (
              <p className="text-center font-body-lg text-body-lg text-on-surface-variant">
                เนื้อหากำลังอัปเดต
              </p>
            )}
          </div>
        </Container>
      </section>
    </>
  );
}
