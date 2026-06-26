import type { Metadata } from "next";
import { Container } from "@/components/container";
import { Icon } from "@/components/icon";
import { BrandIcon } from "@/components/brand-icon";
import { getContactCards, getContactPage } from "@/lib/queries";
import { COMPANY } from "@/lib/seo";

export const metadata: Metadata = {
  title: "ติดต่อเรา — Ryoko Tackle",
  description:
    "ติดต่อ Ryoko Tackle (บริษัท ที.อาร์.วาย.ฟิชชิ่ง แทคเคิล จำกัด) " +
    "289/11 หมู่ 13 ซ.กิ่งแก้ว 25/1 ต.ราชาเทวะ อ.บางพลี จ.สมุทรปราการ 10540 " +
    `โทร ${COMPANY.phone}`,
  alternates: { canonical: "/contact" },
};

// Default store coordinates (used when the admin hasn't set a pin).
const DEFAULT_LAT = 13.6812373;
const DEFAULT_LNG = 100.7127972;

export default async function ContactPage() {
  const [contact, infoCards] = await Promise.all([
    getContactPage(),
    getContactCards(),
  ]);

  const intro =
    contact?.intro?.trim() ||
    "Ryoko Tackle พร้อมมอบบริการระดับพรีเมียมและการสนับสนุนจากทีมงานมืออาชีพ เพื่อตอบโจทย์ทุกความต้องการของนักตกปลา";

  const locationDesc =
    contact?.locationDesc?.trim() ||
    "แวะมาพูดคุยกับทีมงานและลองจับอุปกรณ์ตกปลาด้วยตัวคุณเองที่ร้านของเรา";
  const address =
    contact?.address?.trim() ||
    `${COMPANY.legalNameTh}\n289/11 หมู่ 13 ซ.กิ่งแก้ว 25/1\nต.ราชาเทวะ อ.บางพลี จ.สมุทรปราการ 10540`;

  const lat = contact?.mapLat ?? DEFAULT_LAT;
  const lng = contact?.mapLng ?? DEFAULT_LNG;
  const mapEmbed = `https://www.openstreetmap.org/export/embed.html?bbox=${lng - 0.005}%2C${lat - 0.0035}%2C${lng + 0.005}%2C${lat + 0.0035}&layer=mapnik&marker=${lat}%2C${lng}`;
  const mapLink = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;

  return (
    <>
      {/* Hero */}
      <section className="pb-stack-lg pt-section-gap">
        <Container className="text-center">
          <h1 className="mb-stack-sm font-headline-lg text-headline-lg-mobile text-primary md:text-headline-lg">
            ติดต่อเรา
          </h1>
          <p className="mx-auto max-w-2xl font-body-lg text-body-lg text-on-surface-variant">
            {intro}
          </p>
        </Container>
      </section>

      {/* Contact block */}
      <section className="py-stack-lg">
        <Container>
          <div className="grid grid-cols-1 gap-gutter sm:grid-cols-2 lg:grid-cols-4">
            {infoCards.map((card) => (
              <div
                key={card.id}
                className="flex flex-col items-start gap-4 rounded-xl border border-outline-variant bg-gradient-to-br from-white to-surface-container-low p-stack-md transition-shadow duration-300 hover:shadow-lg"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary-container text-on-secondary-container">
                  <BrandIcon name={card.icon} fallback={card.icon} className="text-xl" />
                </div>
                <div>
                  <p className="mb-1 font-label-caps text-label-caps text-on-surface-variant">
                    {card.label}
                  </p>
                  <p className="font-headline-sm text-headline-sm text-primary">
                    {card.value}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* ที่ตั้งบริษัทและหน้าร้าน + live map */}
      <section className="py-section-gap">
        <Container>
          <div className="grid grid-cols-1 overflow-hidden rounded-xl border border-outline-variant shadow-sm lg:grid-cols-2">
            {/* Info box */}
            <div className="flex flex-col justify-center gap-stack-md bg-gradient-to-br from-white to-surface-container-low p-stack-lg">
              <h2 className="flex items-center gap-2 font-headline-md text-headline-md text-primary">
                <Icon name="location_on" className="text-secondary" />
                ที่ตั้งบริษัทและหน้าร้าน
              </h2>
              <p className="font-body-md text-body-md text-on-surface-variant">
                {locationDesc}
              </p>
              <p className="whitespace-pre-line font-body-sm text-body-sm leading-relaxed text-on-surface-variant">
                {address}
              </p>
              <a
                href={mapLink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex w-fit items-center gap-2 font-label-caps text-label-caps text-secondary transition-all duration-300 hover:gap-4"
              >
                เปิดใน Google Maps <Icon name="arrow_forward" />
              </a>
            </div>

            {/* Live map */}
            <div className="min-h-[360px]">
              <iframe
                src={mapEmbed}
                title="แผนที่ร้าน Ryoko Tackle"
                className="h-full min-h-[360px] w-full border-0"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                allowFullScreen
              />
            </div>
          </div>
        </Container>
      </section>
    </>
  );
}
