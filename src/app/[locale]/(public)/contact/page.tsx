import { getTranslations } from "next-intl/server";
import ContactForm from "@/components/contact/ContactForm";

export default async function ContactPage({
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations();

  return (
    <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <h1 className="text-4xl font-black text-primary">{t("Contact.pageTitle")}</h1>
      <p className="mt-3 max-w-3xl text-slate-700">{t("Contact.pageSubtitle")}</p>

      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        <ContactForm locale={locale} />

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-black text-slate-900">{t("Contact.officeTitle")}</h2>
          <p className="mt-3 text-slate-700">{t("Contact.officeAddress")}</p>
          <p className="mt-2 text-slate-700">+251 11 155 0000</p>
          <p className="text-slate-700">info@fkl-foundation.org</p>

          <div className="mt-6 overflow-hidden rounded-xl border border-slate-200">
            <iframe
              title="FKL Addis Map"
              src="https://www.openstreetmap.org/export/embed.html?bbox=38.72%2C8.95%2C38.80%2C9.02&layer=mapnik"
              className="h-72 w-full"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
