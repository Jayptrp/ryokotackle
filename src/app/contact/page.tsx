import type { Metadata } from "next";
import { Container } from "@/components/container";
import { Icon } from "@/components/icon";

export const metadata: Metadata = {
  title: "ติดต่อเรา — Ryoko Tackle",
};

const INFO_CARDS = [
  { icon: "phone", label: "โทรศัพท์", value: "+66 (0) 2 123 4567" },
  { icon: "mail", label: "อีเมล", value: "support@ryokotackle.com" },
] as const;

const SOCIALS = [
  { icon: "public", label: "เว็บไซต์" },
  { icon: "chat_bubble", label: "LINE" },
  { icon: "photo_camera", label: "Instagram" },
] as const;

export default function ContactPage() {
  return (
    <>
      {/* Hero */}
      <section className="pb-stack-lg pt-section-gap">
        <Container className="text-center">
          <h1 className="mb-stack-sm font-headline-lg text-headline-lg-mobile text-primary md:text-headline-lg">
            ติดต่อเรา
          </h1>
          <p className="mx-auto max-w-2xl font-body-lg text-body-lg text-on-surface-variant">
            Ryoko Tackle พร้อมมอบบริการระดับพรีเมียมและการสนับสนุนจากทีมงานมืออาชีพ
            เพื่อตอบโจทย์ทุกความต้องการของนักตกปลา
          </p>
        </Container>
      </section>

      {/* Split layout */}
      <section className="py-stack-lg">
        <Container>
          <div className="grid grid-cols-1 gap-section-gap lg:grid-cols-2">
            {/* Contact form */}
            <div className="space-y-stack-lg">
              <div className="space-y-2">
                <h2 className="font-headline-md text-headline-md text-primary">
                  ส่งข้อความถึงเรา
                </h2>
                <div className="h-1 w-12 bg-tertiary-container" />
              </div>
              <form className="space-y-stack-md">
                <div className="grid grid-cols-1 gap-gutter md:grid-cols-2">
                  <div className="space-y-base">
                    <label className="font-label-caps text-label-caps text-on-surface-variant">
                      ชื่อ-นามสกุล
                    </label>
                    <input
                      type="text"
                      placeholder="ระบุชื่อของคุณ"
                      className="w-full rounded-lg border border-outline-variant bg-white px-4 py-3 outline-none transition-all focus:border-primary focus:ring-1 focus:ring-primary/20"
                    />
                  </div>
                  <div className="space-y-base">
                    <label className="font-label-caps text-label-caps text-on-surface-variant">
                      อีเมล
                    </label>
                    <input
                      type="email"
                      placeholder="example@email.com"
                      className="w-full rounded-lg border border-outline-variant bg-white px-4 py-3 outline-none transition-all focus:border-primary focus:ring-1 focus:ring-primary/20"
                    />
                  </div>
                </div>
                <div className="space-y-base">
                  <label className="font-label-caps text-label-caps text-on-surface-variant">
                    หัวข้อ
                  </label>
                  <input
                    type="text"
                    placeholder="ระบุหัวข้อที่ต้องการติดต่อ"
                    className="w-full rounded-lg border border-outline-variant bg-white px-4 py-3 outline-none transition-all focus:border-primary focus:ring-1 focus:ring-primary/20"
                  />
                </div>
                <div className="space-y-base">
                  <label className="font-label-caps text-label-caps text-on-surface-variant">
                    ข้อความ
                  </label>
                  <textarea
                    rows={5}
                    placeholder="พิมพ์ข้อความของคุณที่นี่..."
                    className="w-full rounded-lg border border-outline-variant bg-white px-4 py-3 outline-none transition-all focus:border-primary focus:ring-1 focus:ring-primary/20"
                  />
                </div>
                <button
                  type="submit"
                  className="rounded-lg bg-primary px-12 py-4 font-label-caps text-label-caps text-white shadow-sm transition-all duration-300 hover:bg-primary-container hover:shadow-md"
                >
                  ส่งข้อความ
                </button>
              </form>
            </div>

            {/* Contact info */}
            <div className="space-y-section-gap">
              <div className="grid grid-cols-1 gap-gutter sm:grid-cols-2">
                {INFO_CARDS.map((card) => (
                  <div
                    key={card.label}
                    className="flex flex-col items-start gap-4 rounded-xl border border-outline-variant bg-gradient-to-br from-white to-surface-container-low p-stack-md transition-shadow duration-300 hover:shadow-lg"
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary-container text-on-secondary-container">
                      <Icon name={card.icon} />
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

              <div className="space-y-stack-lg">
                <div className="space-y-stack-md">
                  <h3 className="flex items-center gap-2 font-headline-sm text-headline-sm text-primary">
                    <Icon name="location_on" className="text-secondary" />
                    Ryoko Thailand Showroom
                  </h3>
                  <p className="pl-8 font-body-md text-body-md leading-relaxed text-on-surface-variant">
                    99/9 หมู่บ้านพรีเมียมอาคารเอ ชั้น 1 ถนนรัชดาภิเษก
                    <br />
                    แขวงจตุจักร เขตจตุจักร กรุงเทพมหานคร 10900
                  </p>
                </div>

                <div className="space-y-stack-md">
                  <h3 className="font-label-caps text-label-caps uppercase text-on-surface-variant">
                    ติดตามเรา
                  </h3>
                  <div className="flex gap-stack-md">
                    {SOCIALS.map((social) => (
                      <a
                        key={social.label}
                        href="#"
                        aria-label={social.label}
                        className="flex h-10 w-10 items-center justify-center rounded-full border border-outline-variant text-on-surface-variant transition-all duration-300 hover:bg-primary hover:text-white"
                      >
                        <Icon name={social.icon} />
                      </a>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* Map placeholder */}
      <section className="mt-section-gap">
        <div className="relative h-[500px] w-full overflow-hidden bg-surface-container-low">
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-surface-container to-surface-container-high">
            <div className="pointer-events-auto max-w-sm rounded-xl border border-outline-variant bg-white/90 p-stack-lg shadow-xl backdrop-blur-sm">
              <span className="mb-2 block font-label-caps text-label-caps text-secondary">
                OUR LOCATION
              </span>
              <h4 className="mb-2 font-headline-sm text-headline-sm text-primary">
                Visit Our Showroom
              </h4>
              <p className="mb-4 font-body-sm text-body-sm text-on-surface-variant">
                สัมผัสประสบการณ์อุปกรณ์ตกปลาระดับพรีเมียมด้วยตัวคุณเอง
              </p>
              <a
                href="https://maps.google.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 font-label-caps text-label-caps text-secondary transition-all duration-300 hover:gap-4"
              >
                เปิดใน Google Maps <Icon name="arrow_forward" />
              </a>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
