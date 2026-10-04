import { TEXT_LINK_CLASS } from "@/components/shared/TextLink";
import { LEGAL } from "@/lib/constants/legal";

/** โครงหน้าเอกสาร (Terms / Privacy): หัวข้อ วันที่มีผล สารบัญ และเนื้อหา */
export function LegalPage({
  title,
  intro,
  sections,
}: {
  title: string;
  intro: React.ReactNode;
  sections: { id: string; title: string; content: React.ReactNode }[];
}) {
  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-12">
      <p className="text-sm font-semibold text-primary">Legal</p>
      <h1 className="mt-1 text-4xl font-extrabold tracking-tight">{title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Effective {LEGAL.EFFECTIVE_DATE}
      </p>

      <div className="mt-6 space-y-4 text-base leading-relaxed text-muted-foreground">
        {intro}
      </div>

      <nav
        aria-label="On this page"
        className="mt-8 rounded-2xl border bg-card p-5"
      >
        <p className="mb-2 text-sm font-bold">On this page</p>
        <ol className="list-decimal space-y-1 pl-5 text-sm">
          {sections.map((section) => (
            <li key={section.id}>
              <a href={`#${section.id}`} className={TEXT_LINK_CLASS}>
                {section.title}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      <div className="mt-10 space-y-10">
        {sections.map((section, index) => (
          <section key={section.id} id={section.id} className="scroll-mt-24">
            <h2 className="text-xl font-bold">
              {index + 1}. {section.title}
            </h2>
            <div className="mt-3 space-y-3 leading-relaxed text-muted-foreground [&_li]:pl-1 [&_strong]:text-foreground [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-5">
              {section.content}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

export function ContactEmail() {
  return (
    <a href={`mailto:${LEGAL.CONTACT_EMAIL}`} className={TEXT_LINK_CLASS}>
      {LEGAL.CONTACT_EMAIL}
    </a>
  );
}
