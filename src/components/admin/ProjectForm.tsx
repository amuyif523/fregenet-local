"use client";

import { useActionState, useEffect, useState } from "react";
import { createProjectAction, updateProjectAction } from "@/app/[locale]/(admin)/admin/actions";
import { initialAdminFormState } from "@/components/admin/formState";

type EditableProject = {
  id: string;
  title_en: string;
  title_am: string;
  slug: string;
  summary_en: string;
  summary_am: string;
  body_en: string | null;
  body_am: string | null;
  status: "ACTIVE" | "COMPLETED";
  coverImage: string | null;
};

type ProjectDraft = {
  title_en: string;
  title_am: string;
  slug: string;
  summary_en: string;
  summary_am: string;
  body_en: string;
  body_am: string;
  status: "ACTIVE" | "COMPLETED";
};

export default function ProjectForm({
  locale,
  selectedItem,
  onClearSelection
}: {
  locale: string;
  selectedItem: EditableProject | null;
  onClearSelection: () => void;
}) {
  const [createState, createAction, isCreating] = useActionState(createProjectAction, initialAdminFormState);
  const [updateState, updateAction, isUpdating] = useActionState(updateProjectAction, initialAdminFormState);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const isEditing = Boolean(selectedItem);

  const [draft, setDraft] = useState<ProjectDraft>({
    title_en: "",
    title_am: "",
    slug: "",
    summary_en: "",
    summary_am: "",
    body_en: "",
    body_am: "",
    status: "ACTIVE"
  });

  useEffect(() => {
    if (!selectedItem) {
      setDraft({
        title_en: "",
        title_am: "",
        slug: "",
        summary_en: "",
        summary_am: "",
        body_en: "",
        body_am: "",
        status: "ACTIVE"
      });
      return;
    }

    setDraft({
      title_en: selectedItem.title_en,
      title_am: selectedItem.title_am,
      slug: selectedItem.slug,
      summary_en: selectedItem.summary_en,
      summary_am: selectedItem.summary_am,
      body_en: selectedItem.body_en ?? "",
      body_am: selectedItem.body_am ?? "",
      status: selectedItem.status
    });
  }, [selectedItem]);

  useEffect(() => {
    if (createState.status === "success") {
      setToastMessage(createState.message ?? "Project saved successfully.");
      setDraft({
        title_en: "",
        title_am: "",
        slug: "",
        summary_en: "",
        summary_am: "",
        body_en: "",
        body_am: "",
        status: "ACTIVE"
      });
      const timer = setTimeout(() => setToastMessage(null), 3000);
      return () => clearTimeout(timer);
    }

    return;
  }, [createState]);

  useEffect(() => {
    if (updateState.status === "success") {
      setToastMessage(updateState.message ?? "Successfully updated project.");
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
  const submitLabel = isEditing ? `Update ${activeName || "Project"}` : "Add Project";

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

      <form action={formAction} className="mt-6 grid gap-4 md:grid-cols-2">
        <input type="hidden" name="locale" value={locale} />
        {isEditing ? <input type="hidden" name="id" value={selectedItem?.id ?? ""} /> : null}
        {isEditing ? <input type="hidden" name="existingCoverImage" value={selectedItem?.coverImage ?? ""} /> : null}

        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Title (EN)</label>
          <input
            name="title_en"
            placeholder="Bishoftu Library"
            value={draft.title_en}
            onChange={(event) => setDraft((prev) => ({ ...prev, title_en: event.target.value }))}
            className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-[#006D77]"
            required
          />
          {state.fieldErrors?.title_en ? <p className="mt-1 text-xs text-red-600">{state.fieldErrors.title_en}</p> : null}
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Title (AM)</label>
          <input
            name="title_am"
            placeholder="Bishoftu bete metsahift"
            value={draft.title_am}
            onChange={(event) => setDraft((prev) => ({ ...prev, title_am: event.target.value }))}
            className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-[#006D77]"
            required
          />
          {state.fieldErrors?.title_am ? <p className="mt-1 text-xs text-red-600">{state.fieldErrors.title_am}</p> : null}
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Slug</label>
          <input
            name="slug"
            placeholder="bishoftu-library"
            value={draft.slug}
            onChange={(event) => setDraft((prev) => ({ ...prev, slug: event.target.value }))}
            className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-[#006D77]"
            required
          />
          {state.fieldErrors?.slug ? <p className="mt-1 text-xs text-red-600">{state.fieldErrors.slug}</p> : null}
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Summary (EN)</label>
          <input
            name="summary_en"
            placeholder="Community study center with digital resources"
            value={draft.summary_en}
            onChange={(event) => setDraft((prev) => ({ ...prev, summary_en: event.target.value }))}
            className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-[#006D77]"
            required
          />
          {state.fieldErrors?.summary_en ? <p className="mt-1 text-xs text-red-600">{state.fieldErrors.summary_en}</p> : null}
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Summary (AM)</label>
          <input
            name="summary_am"
            placeholder="Local language project summary"
            value={draft.summary_am}
            onChange={(event) => setDraft((prev) => ({ ...prev, summary_am: event.target.value }))}
            className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-[#006D77]"
            required
          />
          {state.fieldErrors?.summary_am ? <p className="mt-1 text-xs text-red-600">{state.fieldErrors.summary_am}</p> : null}
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Body (EN)</label>
          <textarea
            name="body_en"
            placeholder="Detailed English project narrative"
            value={draft.body_en}
            onChange={(event) => setDraft((prev) => ({ ...prev, body_en: event.target.value }))}
            className="min-h-28 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-[#006D77]"
          />
          {state.fieldErrors?.body_en ? <p className="mt-1 text-xs text-red-600">{state.fieldErrors.body_en}</p> : null}
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Body (AM)</label>
          <textarea
            name="body_am"
            placeholder="Detailed Amharic project narrative"
            value={draft.body_am}
            onChange={(event) => setDraft((prev) => ({ ...prev, body_am: event.target.value }))}
            className="min-h-28 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-[#006D77]"
          />
          {state.fieldErrors?.body_am ? <p className="mt-1 text-xs text-red-600">{state.fieldErrors.body_am}</p> : null}
        </div>

        <div className="md:col-span-2">
          <input
            name="coverImage"
            type="file"
            accept="image/*"
            className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none file:mr-3 file:rounded-lg file:border-0 file:bg-[#006D77] file:px-3 file:py-2 file:text-white"
          />
          {state.fieldErrors?.coverImage ? <p className="mt-1 text-xs text-red-600">{state.fieldErrors.coverImage}</p> : null}
        </div>

        <select
          name="status"
          value={draft.status}
          onChange={(event) =>
            setDraft((prev) => ({ ...prev, status: event.target.value as "ACTIVE" | "COMPLETED" }))
          }
          className="rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-[#006D77]"
        >
          <option value="ACTIVE">ACTIVE</option>
          <option value="COMPLETED">COMPLETED</option>
        </select>

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
      className="rounded-xl bg-[#006D77] px-4 py-3 font-bold text-white transition hover:bg-[#005B63] disabled:cursor-not-allowed disabled:opacity-70"
    >
      {isPending ? "Saving..." : label}
    </button>
  );
}
