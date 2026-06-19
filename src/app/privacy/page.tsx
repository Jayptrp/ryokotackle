import type { Metadata } from "next";
import { Container } from "@/components/container";
import { COMPANY } from "@/lib/seo";

export const metadata: Metadata = {
  title: "นโยบายความเป็นส่วนตัว — Ryoko Tackle",
  description:
    "นโยบายความเป็นส่วนตัวของ Ryoko Tackle ว่าด้วยการเก็บและใช้ข้อมูลส่วนบุคคลที่ท่านส่งผ่านหน้าติดต่อเรา",
};

// อัปเดตล่าสุดของเอกสารฉบับนี้ (แก้เมื่อมีการปรับเนื้อหา)
const LAST_UPDATED = "19 มิถุนายน 2568";

export default function PrivacyPage() {
  return (
    <section className="py-section-gap">
      <Container className="max-w-3xl">
        <h1 className="mb-stack-sm font-headline-lg text-headline-lg-mobile text-primary md:text-headline-lg">
          นโยบายความเป็นส่วนตัว
        </h1>
        <p className="mb-stack-lg font-body-sm text-body-sm text-on-surface-variant">
          อัปเดตล่าสุด: {LAST_UPDATED}
        </p>

        <div className="space-y-stack-lg font-body-md text-body-md leading-relaxed text-on-surface-variant">
          <p>
            {COMPANY.legalNameTh} (&ldquo;เรา&rdquo;) ในฐานะผู้ให้บริการเว็บไซต์{" "}
            {COMPANY.brand} ให้ความสำคัญกับการคุ้มครองข้อมูลส่วนบุคคลของท่าน
            นโยบายฉบับนี้อธิบายว่าเราเก็บข้อมูลใด นำไปใช้อย่างไร
            และท่านมีสิทธิอะไรบ้าง ตามพระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล
            พ.ศ. 2562 (PDPA)
          </p>

          <div className="space-y-stack-sm">
            <h2 className="font-headline-sm text-headline-sm text-primary">
              1. ข้อมูลที่เราเก็บรวบรวม
            </h2>
            <p>
              เว็บไซต์ของเราเป็นแค็ตตาล็อกแสดงสินค้า ไม่มีระบบสมาชิก ตะกร้าสินค้า
              หรือการชำระเงิน เราเก็บข้อมูลส่วนบุคคลเฉพาะเมื่อท่านกรอกแบบฟอร์มใน
              หน้า &ldquo;ติดต่อเรา&rdquo; ได้แก่ <strong>ชื่อ-นามสกุล</strong>{" "}
              และ <strong>อีเมล</strong> รวมถึงหัวข้อและข้อความที่ท่านระบุ
            </p>
          </div>

          <div className="space-y-stack-sm">
            <h2 className="font-headline-sm text-headline-sm text-primary">
              2. วัตถุประสงค์ในการใช้ข้อมูล
            </h2>
            <p>
              เราใช้ข้อมูลดังกล่าวเพื่อ <strong>ติดต่อกลับและตอบข้อสอบถาม</strong>{" "}
              ของท่านเท่านั้น เราไม่นำข้อมูลไปใช้เพื่อการตลาดโดยไม่ได้รับความยินยอม
            </p>
          </div>

          <div className="space-y-stack-sm">
            <h2 className="font-headline-sm text-headline-sm text-primary">
              3. การเปิดเผยข้อมูล
            </h2>
            <p>
              เราจะไม่ขาย แลกเปลี่ยน หรือเปิดเผยข้อมูลส่วนบุคคลของท่านแก่บุคคล
              ภายนอก เว้นแต่เป็นไปตามที่กฎหมายกำหนด
            </p>
          </div>

          <div className="space-y-stack-sm">
            <h2 className="font-headline-sm text-headline-sm text-primary">
              4. ระยะเวลาการเก็บข้อมูล
            </h2>
            <p>
              เราจะเก็บข้อมูลไว้เท่าที่จำเป็นต่อการติดต่อกลับและดูแลความสัมพันธ์
              กับท่าน เมื่อหมดความจำเป็นแล้ว เราจะลบหรือทำให้ข้อมูลไม่สามารถระบุ
              ตัวตนได้
            </p>
          </div>

          <div className="space-y-stack-sm">
            <h2 className="font-headline-sm text-headline-sm text-primary">
              5. สิทธิของเจ้าของข้อมูล
            </h2>
            <p>
              ท่านมีสิทธิขอเข้าถึง ขอแก้ไข ขอลบ หรือขอให้ระงับการใช้ข้อมูล
              ส่วนบุคคลของท่าน โดยติดต่อมายังช่องทางด้านล่าง
            </p>
          </div>

          <div className="space-y-stack-sm">
            <h2 className="font-headline-sm text-headline-sm text-primary">
              6. ติดต่อเรา
            </h2>
            <p>
              หากมีคำถามเกี่ยวกับนโยบายความเป็นส่วนตัวนี้ หรือต้องการใช้สิทธิ
              ของท่าน กรุณาติดต่อ:
            </p>
            <p>
              {COMPANY.legalNameTh}
              <br />
              อีเมล:{" "}
              <a href={`mailto:${COMPANY.email}`} className="text-primary hover:underline">
                {COMPANY.email}
              </a>
              <br />
              โทร:{" "}
              <a href={`tel:${COMPANY.phone}`} className="text-primary hover:underline">
                {COMPANY.phone}
              </a>
            </p>
          </div>
        </div>
      </Container>
    </section>
  );
}
