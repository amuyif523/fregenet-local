"use client";

import { useMemo, useState } from "react";
import { Inbox, Pencil, Trash2 } from "lucide-react";
import ProjectForm from "@/components/admin/ProjectForm";
import { deleteProjectAction, toggleProjectStatusAction } from "@/app/[locale]/(admin)/admin/actions";

type ProjectRecord = {
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

export default function ProjectAdminManager({
  locale,
  projects,
  loadError
}: {
  locale: string;
  projects: ProjectRecord[];
  loadError: boolean;
}) {
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  const selectedItem = useMemo(
    () => projects.find((project) => project.id === selectedProjectId) ?? null,
    [projects, selectedProjectId]
  );

  return (
    <section className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-black text-[#006D77]">Local Projects</h1>
        <p className="mt-2 text-sm text-slate-600">Create and track local project execution status.</p>
        <ProjectForm locale={locale} selectedItem={selectedItem} onClearSelection={() => setSelectedProjectId(null)} />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-black text-[#006D77]">Project Status Board</h2>

        {loadError ? (
          <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
            Project records are temporarily unavailable.
          </p>
        ) : null}

        {!loadError && projects.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-teal-200 bg-gradient-to-r from-[#E7F6F7] to-[#F2FBFB] p-5">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-white p-2 shadow-sm">
                <Inbox className="size-5 text-[#006D77]" />
              </div>
              <div>
                <p className="text-sm font-bold text-[#005B63]">No project records yet</p>
                <p className="text-sm text-slate-600">Create your first project to activate the status board.</p>
              </div>
            </div>
          </div>
        ) : null}

        {!loadError && projects.length > 0 ? (
          <div className="mt-4 space-y-3">
            {projects.map((project) => {
              const status = project.status;
              const localeKey = locale === "am" ? "am" : "en";
              const localizedTitle = project[`title_${localeKey}` as keyof Pick<typeof project, "title_en" | "title_am">];
              const localizedSummary =
                project[`summary_${localeKey}` as keyof Pick<typeof project, "summary_en" | "summary_am">];
              const localizedBody = project[`body_${localeKey}` as keyof Pick<typeof project, "body_en" | "body_am">];
              const isSelected = selectedProjectId === project.id;

              return (
                <div
                  key={project.id}
                  className={`flex flex-wrap items-center justify-between gap-4 rounded-xl border p-4 ${
                    isSelected ? "border-teal-300 bg-teal-50/50" : "border-slate-200"
                  }`}
                >
                  <div>
                    <p className="font-semibold text-slate-900">{localizedTitle}</p>
                    <p className="text-sm text-slate-600">{localizedSummary}</p>
                    {localizedBody ? <p className="mt-1 text-xs text-slate-500">{localizedBody}</p> : null}
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setSelectedProjectId(project.id)}
                      className="inline-flex items-center rounded-lg border border-slate-200 p-2 text-slate-600 transition hover:border-[#006D77] hover:text-[#006D77]"
                      aria-label={`Edit ${localizedTitle}`}
                      title="Edit"
                    >
                      <Pencil className="size-4" />
                    </button>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-bold ${
                        status === "ACTIVE" ? "bg-teal-100 text-teal-700" : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {status}
                    </span>
                    <form action={toggleProjectStatusAction}>
                      <input type="hidden" name="projectId" value={project.id} />
                      <input type="hidden" name="currentStatus" value={status} />
                      <input type="hidden" name="locale" value={locale} />
                      <button className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold hover:border-[#006D77]">
                        Toggle Status
                      </button>
                    </form>
                    <form action={deleteProjectAction}>
                      <input type="hidden" name="projectId" value={project.id} />
                      <input type="hidden" name="locale" value={locale} />
                      <button
                        className="inline-flex items-center rounded-lg border border-red-200 p-2 text-red-600 transition hover:bg-red-50"
                        aria-label={`Delete ${localizedTitle}`}
                        title="Delete project"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </form>
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}
      </div>
    </section>
  );
}
