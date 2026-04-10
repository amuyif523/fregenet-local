"use client";

import { useActionState, useEffect, useState } from "react";
import { createNewsletterAction, updateNewsletterAction } from "@/app/[locale]/(admin)/admin/actions";
import { initialAdminFormState } from "@/components/admin/formState";

type EditableNewsletter = {
  id: string;
  title_en: string;
  title_am: string;
  body_en: string | null;
  body_am: string | null;
  email: string;
  isPublished: boolean;
  publishedAt: Date | string;
  source: string | null;
};

type NewsletterDraft = {
  title_en: string;
  title_am: string;
  body_en: string;
  body_am: string;
  email: string;
  isPublished: boolean;
  publishedAt: string;
};

export default function NewsletterForm({
  locale,
  selectedItem,
  onClearSelection
}: {
  locale: string;
  selectedItem: EditableNewsletter | null;
  onClearSelection: () => void;
}) {
  const [createState, createAction, isCreating] = useActionState(createNewsletterAction, initialAdminFormState);
  const [updateState, updateAction, isUpdating] = useActionState(updateNewsletterAction, initialAdminFormState);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const today = new Date().toISOString().split("T")[0];
  const isEditing = Boolean(selectedItem);

  const [draft, setDraft] = useState<NewsletterDraft>({
    title_en: "",
    title_am: "",
    body_en: "",
    body_am: "",
    email: "",
    isPublished: true,
    publishedAt: today
  });

  useEffect(() => {
    if (!selectedItem) {
      setDraft({
        title_en: "",
        title_am: "",
        body_en: "",
        body_am: "",
        email: "",
        isPublished: true,
        publishedAt: today
      });
      return;
    }

    setDraft({
      title_en: selectedItem.title_en,
      title_am: selectedItem.title_am,
      body_en: selectedItem.body_en ?? "",
      body_am: selectedItem.body_am ?? "",
      email: selectedItem.email,
      isPublished: selectedItem.isPublished,
      publishedAt: new Date(selectedItem.publishedAt).toISOString().split("T")[0]
    });
  }, [selectedItem, today]);

  useEffect(() => {
    if (createState.status === "success") {
      setToastMessage(createState.message ?? "Newsletter saved successfully.");
      setDraft({
        title_en: "",
        title_am: "",
        body_en: "",
        body_am: "",
        email: "",
        isPublished: true,
        publishedAt: today
      });
      const timer = setTimeout(() => setToastMessage(null), 3000);
      return () => clearTimeout(timer);
    }

    return;
  }, [createState, today]);

  useEffect(() => {
    if (updateState.status === "success") {
      setToastMessage(updateState.message ?? "Successfully Updated newsletter.");
      onClearSelection();
      const timer = setTimeout(() => setToastMessage(null), 3000);
      return () => clearTimeout(timer);
    }

    return;
  }, [onClearSelection, updateState]);

  const state = isEditing ? updateState : createState;
  const formAction = isEditing ? updateAction : createAction;
  const isPending = isEditing ? isUpdating : isCreating;
  const activeName = (locale === "am" ? draft.title_am : draft.title_en).trim();
  const submitLabel = isEditing ? `Update ${activeName || "Newsletter"}` : "Save Newsletter";

  return (
    <>
      {toastMessage ? (
        <p className="rounded-lg border border-teal-200 bg-teal-50 px-3 py-2 text-sm font-semibold text-teal-700">
          {toastMessage}
        </p>
      ) : null}

      {state.status === "error" && state.message ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{state.message}</p>
      ) : null}

      <form action={formAction} className="mt-6 space-y-6">
        <input type="hidden" name="locale" value={locale} />
        {isEditing ? <input type="hidden" name="id" value={selectedItem?.id ?? ""} /> : null}
        {isEditing ? <input type="hidden" name="existingSource" value={selectedItem?.source ?? ""} /> : null}

        <div className="grid gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Contact Email</label>
            <input
              name="email"
              type="email"
              placeholder="updates@fkl-local.org"
              value={draft.email}
              onChange={(event) => setDraft((prev) => ({ ...prev, email: event.target.value }))}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-[#006D77]"
              required
            />
            {state.fieldErrors?.email ? <p className="mt-1 text-xs text-red-600">{state.fieldErrors.email}</p> : null}
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Published At</label>
            <input
              name="publishedAt"
              type="date"
              value={draft.publishedAt}
              onChange={(event) => setDraft((prev) => ({ ...prev, publishedAt: event.target.value }))}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-[#006D77]"
              required
            />
            {state.fieldErrors?.publishedAt ? <p className="mt-1 text-xs text-red-600">{state.fieldErrors.publishedAt}</p> : null}
          </div>

          <div className="md:col-span-2">
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">Publication Status</label>
            <label className="inline-flex cursor-pointer items-center gap-3 rounded-xl border border-slate-300 bg-white px-4 py-3">
              <input
                name="isPublished"
                type="checkbox"
                className="peer sr-only"
                checked={draft.isPublished}
                onChange={(event) => setDraft((prev) => ({ ...prev, isPublished: event.target.checked }))}
              />
              <span className="relative h-6 w-11 rounded-full bg-slate-300 transition peer-checked:bg-[#006D77]">
                <span className="absolute left-0.5 top-0.5 size-5 transform rounded-full bg-white transition-transform duration-200 peer-checked:translate-x-5" />
              </span>
              <span className="text-sm font-semibold text-slate-700">Published</span>
            </label>
          </div>

          <div className="md:col-span-2">
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">PDF File</label>
            <input
              name="pdf"
              type="file"
              accept="application/pdf"
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none file:mr-3 file:rounded-lg file:border-0 file:bg-[#006D77] file:px-3 file:py-2 file:text-white"
            />
            {state.fieldErrors?.pdf ? <p className="mt-1 text-xs text-red-600">{state.fieldErrors.pdf}</p> : null}
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="text-sm font-black uppercase tracking-[0.16em] text-[#006D77]">English Content</h3>
            <div className="mt-3 space-y-4">
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Title (EN)</label>
                <input
                  name="title_en"
                  placeholder="Q1 Community Update"
                  value={draft.title_en}
                  onChange={(event) => setDraft((prev) => ({ ...prev, title_en: event.target.value }))}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-[#006D77]"
                  required
                />
                {state.fieldErrors?.title_en ? <p className="mt-1 text-xs text-red-600">{state.fieldErrors.title_en}</p> : null}
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Body (EN)</label>
                <textarea
                  name="body_en"
                  placeholder="Full English newsletter content"
                  value={draft.body_en}
                  onChange={(event) => setDraft((prev) => ({ ...prev, body_en: event.target.value }))}
                  className="min-h-40 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-[#006D77]"
                />
                {state.fieldErrors?.body_en ? <p className="mt-1 text-xs text-red-600">{state.fieldErrors.body_en}</p> : null}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="text-sm font-black uppercase tracking-[0.16em] text-[#006D77]">Amharic Content</h3>
            <div className="mt-3 space-y-4">
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Title (AM)</label>
                <input
                  name="title_am"
                  placeholder="የሩብ ዓመት ዝማኔ"
                  value={draft.title_am}
                  onChange={(event) => setDraft((prev) => ({ ...prev, title_am: event.target.value }))}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-[#006D77]"
                  required
                />
                {state.fieldErrors?.title_am ? <p className="mt-1 text-xs text-red-600">{state.fieldErrors.title_am}</p> : null}
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Body (AM)</label>
                <textarea
                  name="body_am"
                  placeholder="ሙሉ የአማርኛ ዜና ይዘት"
                  value={draft.body_am}
                  onChange={(event) => setDraft((prev) => ({ ...prev, body_am: event.target.value }))}
                  className="min-h-40 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-[#006D77]"
                />
                {state.fieldErrors?.body_am ? <p className="mt-1 text-xs text-red-600">{state.fieldErrors.body_am}</p> : null}
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <SubmitButton label={submitLabel} isPending={isPending} />
          {isEditing ? (
            <button
              type="button"
              onClick={onClearSelection}
              className="rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-[#006D77] hover:text-[#006D77]"
            >
              Cancel Edit
            </button>
          ) : null}
        </div>
      </form>
    </>
  );
}

function SubmitButton({ label, isPending }: { label: string; isPending: boolean }) {
  return (
    <button
      type="submit"
      disabled={isPending}
      className="rounded-xl bg-[#006D77] px-5 py-3 font-bold text-white transition hover:bg-[#005B63] disabled:cursor-not-allowed disabled:opacity-70"
    >
      {isPending ? "Saving..." : label}
    </button>
  );
}
