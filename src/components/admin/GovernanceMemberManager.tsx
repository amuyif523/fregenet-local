"use client";

import Image from "next/image";
import { useActionState } from "react";
import {
  createGovernanceMember,
  updateGovernanceMember,
  deleteGovernanceMember
} from "@/app/[locale]/(admin)/admin/actions";
import { initialAdminFormState } from "@/components/admin/formState";

type GovernanceMember = {
  id: string;
  name_en: string;
  name_am: string;
  role_en: string;
  role_am: string;
  bio_en: string | null;
  bio_am: string | null;
  imagePath: string | null;
  order: number;
  isBoardMember: boolean;
};

export default function GovernanceMemberManager({
  locale,
  members
}: {
  locale: string;
  members: GovernanceMember[];
}) {
  const [createState, createAction, createPending] = useActionState(createGovernanceMember, initialAdminFormState);

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-black text-slate-900">Add Governance Member</h2>
        <p className="mt-2 text-sm text-slate-600">Create bilingual leadership profiles with optional headshots.</p>

        {createState.status !== "idle" && createState.message ? (
          <p
            className={`mt-4 rounded-lg px-3 py-2 text-sm font-semibold ${
              createState.status === "success"
                ? "border border-teal-200 bg-teal-50 text-teal-700"
                : "border border-red-200 bg-red-50 text-red-700"
            }`}
          >
            {createState.message}
          </p>
        ) : null}

        <form action={createAction} className="mt-6 grid gap-4 md:grid-cols-2">
          <input type="hidden" name="locale" value={locale} />

          <Field label="Name (EN)" name="name_en" required error={createState.fieldErrors?.name_en} />
          <Field label="Name (AM)" name="name_am" required error={createState.fieldErrors?.name_am} />

          <Field label="Role (EN)" name="role_en" required error={createState.fieldErrors?.role_en} />
          <Field label="Role (AM)" name="role_am" required error={createState.fieldErrors?.role_am} />

          <TextArea label="Bio (EN)" name="bio_en" error={createState.fieldErrors?.bio_en} />
          <TextArea label="Bio (AM)" name="bio_am" error={createState.fieldErrors?.bio_am} />

          <Field
            label="Display Order"
            name="order"
            type="number"
            defaultValue="0"
            min={0}
            error={createState.fieldErrors?.order}
          />

          <label className="flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700">
            <input name="isBoardMember" type="checkbox" defaultChecked className="size-4 accent-[#006D77]" />
            Board Member
          </label>

          <div className="md:col-span-2">
            <input
              name="image"
              type="file"
              accept="image/*"
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none file:mr-3 file:rounded-lg file:border-0 file:bg-[#006D77] file:px-3 file:py-2 file:text-white"
            />
            {createState.fieldErrors?.image ? <p className="mt-1 text-xs text-red-600">{createState.fieldErrors.image}</p> : null}
          </div>

          <button
            type="submit"
            disabled={createPending}
            className="rounded-xl bg-[#006D77] px-4 py-3 font-bold text-white transition hover:bg-[#005B63] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {createPending ? "Saving..." : "Create Member"}
          </button>
        </form>
      </section>

      <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-black text-slate-900">Member Management</h2>

        {members.length === 0 ? (
          <p className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            No governance members yet.
          </p>
        ) : null}

        {members.map((member) => (
          <GovernanceMemberItem key={member.id} locale={locale} member={member} />
        ))}
      </section>
    </div>
  );
}

function GovernanceMemberItem({ locale, member }: { locale: string; member: GovernanceMember }) {
  const [updateState, updateAction, updatePending] = useActionState(updateGovernanceMember, initialAdminFormState);
  const [deleteState, deleteAction, deletePending] = useActionState(deleteGovernanceMember, initialAdminFormState);

  return (
    <article className="rounded-xl border border-slate-200 p-4">
      <div className="grid gap-4 md:grid-cols-[140px_1fr]">
        <div>
          {member.imagePath ? (
            <Image
              src={member.imagePath}
              alt={member.name_en}
              width={140}
              height={160}
              className="h-40 w-full rounded-lg object-cover"
            />
          ) : (
            <div className="flex h-40 items-center justify-center rounded-lg bg-slate-100 text-xs font-semibold text-slate-500">
              No image
            </div>
          )}
        </div>

        <div>
          {updateState.status !== "idle" && updateState.message ? (
            <p
              className={`mb-3 rounded-lg px-3 py-2 text-sm font-semibold ${
                updateState.status === "success"
                  ? "border border-teal-200 bg-teal-50 text-teal-700"
                  : "border border-red-200 bg-red-50 text-red-700"
              }`}
            >
              {updateState.message}
            </p>
          ) : null}

          {deleteState.status !== "idle" && deleteState.message ? (
            <p
              className={`mb-3 rounded-lg px-3 py-2 text-sm font-semibold ${
                deleteState.status === "success"
                  ? "border border-teal-200 bg-teal-50 text-teal-700"
                  : "border border-red-200 bg-red-50 text-red-700"
              }`}
            >
              {deleteState.message}
            </p>
          ) : null}

          <form action={updateAction} className="grid gap-3 md:grid-cols-2">
            <input type="hidden" name="id" value={member.id} />
            <input type="hidden" name="locale" value={locale} />
            <input type="hidden" name="existingImagePath" value={member.imagePath ?? ""} />

            <Field label="Name (EN)" name="name_en" defaultValue={member.name_en} required error={updateState.fieldErrors?.name_en} />
            <Field label="Name (AM)" name="name_am" defaultValue={member.name_am} required error={updateState.fieldErrors?.name_am} />

            <Field label="Role (EN)" name="role_en" defaultValue={member.role_en} required error={updateState.fieldErrors?.role_en} />
            <Field label="Role (AM)" name="role_am" defaultValue={member.role_am} required error={updateState.fieldErrors?.role_am} />

            <TextArea label="Bio (EN)" name="bio_en" defaultValue={member.bio_en ?? ""} error={updateState.fieldErrors?.bio_en} />
            <TextArea label="Bio (AM)" name="bio_am" defaultValue={member.bio_am ?? ""} error={updateState.fieldErrors?.bio_am} />

            <Field
              label="Display Order"
              name="order"
              type="number"
              defaultValue={String(member.order)}
              min={0}
              error={updateState.fieldErrors?.order}
            />

            <label className="flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700">
              <input name="isBoardMember" type="checkbox" defaultChecked={member.isBoardMember} className="size-4 accent-[#006D77]" />
              Board Member
            </label>

            <div className="md:col-span-2">
              <input
                name="image"
                type="file"
                accept="image/*"
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none file:mr-3 file:rounded-lg file:border-0 file:bg-[#006D77] file:px-3 file:py-2 file:text-white"
              />
              {updateState.fieldErrors?.image ? <p className="mt-1 text-xs text-red-600">{updateState.fieldErrors.image}</p> : null}
            </div>

            <button
              type="submit"
              disabled={updatePending}
              className="rounded-xl bg-[#006D77] px-4 py-3 text-sm font-bold text-white hover:bg-[#005B63] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {updatePending ? "Updating..." : "Update"}
            </button>
          </form>

          <form action={deleteAction} className="mt-3">
            <input type="hidden" name="id" value={member.id} />
            <input type="hidden" name="locale" value={locale} />
            <button
              type="submit"
              disabled={deletePending}
              className="rounded-xl border border-red-300 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {deletePending ? "Deleting..." : "Delete"}
            </button>
          </form>
        </div>
      </div>
    </article>
  );
}

function Field({
  label,
  name,
  error,
  type = "text",
  required = false,
  defaultValue,
  min
}: {
  label: string;
  name: string;
  error?: string;
  type?: string;
  required?: boolean;
  defaultValue?: string;
  min?: number;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</label>
      <input
        name={name}
        type={type}
        defaultValue={defaultValue}
        min={min}
        required={required}
        className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-[#006D77]"
      />
      {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : null}
    </div>
  );
}

function TextArea({
  label,
  name,
  error,
  defaultValue
}: {
  label: string;
  name: string;
  error?: string;
  defaultValue?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</label>
      <textarea
        name={name}
        defaultValue={defaultValue}
        className="min-h-24 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-[#006D77]"
      />
      {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
