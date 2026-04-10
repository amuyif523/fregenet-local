"use client";

import { useActionState, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { sendContactAction } from "@/app/[locale]/(public)/contact/actions";
import { initialContactFormState } from "@/app/[locale]/(public)/contact/schema";

type ContactFormProps = {
  locale: string;
};

export default function ContactForm({ locale }: ContactFormProps) {
  const t = useTranslations();
  const [state, action, isPending] = useActionState(sendContactAction, initialContactFormState);
  const [formKey, setFormKey] = useState(0);

  useEffect(() => {
    if (state.status === "success") {
      setFormKey((prev) => prev + 1);
    }
  }, [state.status]);

  return (
    <form key={formKey} action={action} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <input type="hidden" name="locale" value={locale} />
      <h2 className="text-xl font-black text-slate-900">{t("Contact.formTitle")}</h2>

      {state.message ? (
        <p
          className={`mt-3 rounded-lg px-3 py-2 text-sm font-semibold ${
            state.status === "success" ? "border border-teal-200 bg-teal-50 text-teal-700" : "border border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {state.message}
        </p>
      ) : null}

      <div className="mt-4 space-y-4">
        <div>
          <input
            type="text"
            name="name"
            placeholder={t("Contact.namePlaceholder")}
            className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-primary"
            required
          />
          {state.fieldErrors?.name ? <p className="mt-1 text-xs text-red-600">{state.fieldErrors.name}</p> : null}
        </div>

        <div>
          <input
            type="email"
            name="email"
            placeholder={t("Contact.emailPlaceholder")}
            className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-primary"
            required
          />
          {state.fieldErrors?.email ? <p className="mt-1 text-xs text-red-600">{state.fieldErrors.email}</p> : null}
        </div>

        <div>
          <input
            type="text"
            name="subject"
            placeholder={t("Contact.subjectPlaceholder")}
            className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-primary"
            required
          />
          {state.fieldErrors?.subject ? <p className="mt-1 text-xs text-red-600">{state.fieldErrors.subject}</p> : null}
        </div>

        <div>
          <textarea
            name="message"
            placeholder={t("Contact.messagePlaceholder")}
            rows={5}
            className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-primary"
            required
          />
          {state.fieldErrors?.message ? <p className="mt-1 text-xs text-red-600">{state.fieldErrors.message}</p> : null}
        </div>

        <button type="submit" disabled={isPending} className="rounded-xl bg-primary px-5 py-3 font-bold text-white hover:bg-cyan-800 disabled:opacity-70">
          {isPending ? t("Contact.submitting") : t("Contact.submit")}
        </button>
      </div>
    </form>
  );
}
