import type { Metadata } from "next";
import { Container } from "@/components/container";
import { Icon } from "@/components/icon";
import { getWarranties, getWarrantyPage } from "@/lib/queries";
import { SITE_NAME } from "@/lib/seo";
import { warrantyBadgeCls } from "@/lib/warranty-style";
import { RichContent } from "@/components/rich-content";

/** Strip HTML tags + clamp to a meta-description-friendly length. */
function toMetaDescription(html: string, max = 160): string {
  const text = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}

export async function generateMetadata(): Promise<Metadata> {
  const { title, subtitle, qrCodeUrl } = await getWarrantyPage();
  const description = subtitle
    ? toMetaDescription(subtitle)
    : `เงื่อนไขการรับประกันและการเคลมสินค้าของ ${SITE_NAME}`;
  return {
    title: `${title} — ${SITE_NAME}`,
    description,
    alternates: { canonical: "/warranty" },
  };
}

export default async function WarrantyPage() {
  const [{ title, subtitle, qrCodeUrl }, warranties] = await Promise.all([
    getWarrantyPage(),
    getWarranties(),
  ]);

  return (
    <>
      {/* Hero */}
      <section className="pb-stack-lg pt-section-gap">
        <Container>
          <h1 className="mb-stack-lg text-center font-headline-lg text-headline-lg-mobile text-primary md:text-headline-lg">
            {title}
          </h1>
          <div className="mx-auto flex max-w-4xl flex-col gap-8 md:flex-row md:items-start md:justify-between">
            {subtitle && (
              <RichContent
                html={subtitle}
                className="flex-1 max-w-2xl font-body-lg text-body-lg text-on-surface-variant"
              />
            )}
            {qrCodeUrl && (
              <div className="flex flex-none flex-col items-center gap-2 self-center md:self-start">
                <img
                  src={qrCodeUrl}
                  alt="LINE QR Code"
                  className="h-40 w-40 rounded-xl border border-outline-variant bg-white p-2 shadow-sm object-contain"
                />
                <span className="font-body-sm text-body-sm text-on-surface-variant">
                  สแกน Line QR Code
                </span>
              </div>
            )}
          </div>
        </Container>
      </section>

      {/* Warranty types */}
      <section className="pb-section-gap">
        <Container>
          {warranties.length === 0 ? (
            <p className="text-center font-body-md text-body-md text-on-surface-variant">
              ยังไม่มีข้อมูลการรับประกัน
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-gutter md:grid-cols-2">
              {warranties.map((w) => {
                return (
                <div
                  key={w.id}
                  className="flex flex-col gap-stack-sm rounded-xl border border-outline-variant bg-gradient-to-br from-white to-surface-container-low p-stack-lg transition-shadow duration-300 hover:shadow-lg"
                >
                  <div className="flex items-center gap-3">
                    <span className={`flex h-10 w-10 flex-none items-center justify-center rounded-full ${warrantyBadgeCls(w.color)}`}>
                      <Icon name={w.icon} />
                    </span>
                    <h2 className="font-headline-sm text-headline-sm text-primary">
                      {w.name}
                    </h2>
                  </div>
                  {w.detail && (
                    <p className="whitespace-pre-line font-body-md text-body-md leading-relaxed text-on-surface-variant">
                      {w.detail}
                    </p>
                  )}
                </div>
                );
              })}
            </div>
          )}
        </Container>
      </section>
    </>
  );
}
