"use client";

import { useState, useTransition } from "react";
import { Plus, Play, UserCheck, UserX, Image as ImageIcon, Briefcase } from "lucide-react";
import { upsertStaff, deactivateStaff } from "@/lib/staff-actions";
import { processCenterPayroll } from "@/lib/payroll-actions";
import Image from "next/image";
import { normalizeRole } from "@/lib/rbac";

type StaffMember = {
  id: string;
  name: string;
  role: "TEACHER" | "ADMIN" | "SUPPORT";
  baseSalary: number | string;
  pensionNumber: string | null;
  photoUrl: string | null;
  isActive: boolean;
  centerId: string;
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "ETB" }).format(value);
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
}

export default function StaffClientPage({
  initialStaff,
  isGlobal,
  centerId,
  userRole
}: {
  initialStaff: StaffMember[];
  isGlobal: boolean;
  centerId: string;
  userRole: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);

  const [message, setMessage] = useState<{ text: string; error?: boolean } | null>(null);
  const canManageStaff = !isGlobal && normalizeRole(userRole) !== "FINANCE";

  const handleRunPayroll = async () => {
    if (!window.confirm("Are you sure you want to run payroll for all active staff in this center?")) return;
    
    startTransition(async () => {
      setMessage(null);
      try {
        const currentMonth = new Date().getMonth() + 1;
        const currentYear = new Date().getFullYear();
        const res = await processCenterPayroll(centerId, currentMonth, currentYear);
        if (res.success) {
          setMessage({ text: `Success: ${res.message}` });
        } else {
          setMessage({ text: res.message, error: true });
        }
      } catch (error: unknown) {
        setMessage({ text: getErrorMessage(error, "Payroll run failed."), error: true });
      }
    });
  };

  const handleDeactivate = async (staffId: string) => {
    if (!window.confirm("Soft delete this staff member? They will be marked as inactive.")) return;
    startTransition(async () => {
      await deactivateStaff(staffId);
    });
  };

  const submitForm = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    formData.append("centerId", centerId);

    if (editingStaff) {
      formData.append("staffId", editingStaff.id);
    }

    startTransition(async () => {
      try {
        await upsertStaff(formData);
        setIsFormOpen(false);
        setEditingStaff(null);
      } catch (error: unknown) {
        alert(getErrorMessage(error, "Unable to save staff profile."));
      }
    });
  };

  const activeCount = initialStaff.filter(s => s.isActive).length;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 py-4 mb-4">
        <div className="flex space-x-2">
          <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-2">
             <p className="text-xs font-bold uppercase tracking-widest text-blue-700">Total Headcount</p>
             <p className="text-lg font-black text-blue-900">{initialStaff.length}</p>
          </div>
          <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-2">
             <p className="text-xs font-bold uppercase tracking-widest text-green-700">Active Staff</p>
             <p className="text-lg font-black text-green-900">{activeCount}</p>
          </div>
        </div>
        
        <div className="flex gap-2">
          {!isGlobal && (
            <>
              {canManageStaff && (
                <button
                  onClick={() => { setEditingStaff(null); setIsFormOpen(true); }}
                  className="flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700"
                >
                  <Plus className="size-4" /> Add Staff
                </button>
              )}
              <button
                onClick={handleRunPayroll}
                disabled={isPending || activeCount === 0}
                className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                <Play className="size-4" /> Process Center Payroll
              </button>
            </>
          )}
        </div>
      </div>

      {message && (
        <div className={`mb-6 p-4 rounded-lg border ${message.error ? 'bg-red-50 text-red-700 border-red-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
          {message.text}
        </div>
      )}

      {/* STAFF TABLE */}
      <div className="overflow-hidden rounded-xl border border-slate-200 shadow-sm">
        <table className="w-full text-left text-sm text-slate-600">
          <thead className="bg-slate-50 text-slate-800 border-b border-slate-200">
            <tr>
              <th className="p-4 font-bold">Personnel</th>
              <th className="p-4 font-bold">Role</th>
              <th className="p-4 font-bold">Base Salary</th>
              <th className="p-4 font-bold">Status</th>
              <th className="p-4 font-bold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {initialStaff.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-6 text-center text-slate-500">No staff records found.</td>
              </tr>
            ) : (
              initialStaff.map((staff) => (
                <tr key={staff.id} className="transition hover:bg-slate-50/50">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      {staff.photoUrl ? (
                         <Image src={staff.photoUrl} alt={staff.name} width={40} height={40} className="rounded-full object-cover size-10 bg-slate-200" />
                      ) : (
                         <div className="flex items-center justify-center rounded-full bg-[#006D77]/10 size-10 text-[#006D77]">
                            <ImageIcon className="size-5" />
                         </div>
                      )}
                      <div>
                        <p className="font-semibold text-slate-900">{staff.name}</p>
                        <p className="text-xs text-slate-500">Pension: {staff.pensionNumber || "Unregistered"}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
                      <Briefcase className="size-3" />
                      {staff.role}
                    </span>
                  </td>
                  <td className="p-4 font-medium text-slate-700">
                    {formatCurrency(Number(staff.baseSalary))}
                  </td>
                  <td className="p-4">
                    {staff.isActive ? (
                      <span className="inline-flex items-center gap-1.5 text-emerald-600">
                        <UserCheck className="size-4" /> Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-rose-500">
                        <UserX className="size-4" /> Inactive
                      </span>
                    )}
                  </td>
                  <td className="p-4 text-right">
                    <button
                      disabled={isPending || isGlobal || !canManageStaff || !staff.isActive}
                      onClick={() => { setEditingStaff(staff); setIsFormOpen(true); }}
                      className="text-sm font-semibold text-[#006D77] hover:underline disabled:opacity-50 disabled:no-underline"
                    >
                      Edit
                    </button>
                    {staff.isActive && canManageStaff && (
                      <button
                        onClick={() => handleDeactivate(staff.id)}
                        disabled={isPending || isGlobal}
                        className="ml-3 text-sm font-semibold text-rose-500 hover:underline disabled:opacity-50 disabled:no-underline"
                      >
                        Deactivate
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* FORM MODAL */}
      {isFormOpen && canManageStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-xl font-bold text-slate-900 mb-4">{editingStaff ? "Edit Staff Member" : "Add New Staff"}</h2>
            <form onSubmit={submitForm} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">Full Name</label>
                <input required name="name" defaultValue={editingStaff?.name} className="w-full rounded-lg border border-slate-300 p-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-semibold text-slate-700">Role</label>
                  <select required name="role" defaultValue={editingStaff?.role || "TEACHER"} className="w-full rounded-lg border border-slate-300 p-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500">
                    <option value="TEACHER">Teacher</option>
                    <option value="ADMIN">Admin</option>
                    <option value="SUPPORT">Support</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-slate-700">Base Salary (ETB)</label>
                  <input required type="number" step="0.01" name="baseSalary" defaultValue={editingStaff ? Number(editingStaff.baseSalary) : ""} className="w-full rounded-lg border border-slate-300 p-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500" />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">Pension Number (Optional)</label>
                <input name="pensionNumber" defaultValue={editingStaff?.pensionNumber || ""} className="w-full rounded-lg border border-slate-300 p-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">ID Photo {editingStaff && "(Leave blank to keep existing)"}</label>
                <input type="file" name="photo" accept="image/*" className="w-full text-sm text-slate-500 file:mr-4 file:rounded-full file:border-0 file:bg-teal-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-teal-700 hover:file:bg-teal-100" />
              </div>

              <div className="mt-6 flex justify-end gap-3 border-t border-slate-100 pt-4">
                <button type="button" disabled={isPending} onClick={() => setIsFormOpen(false)} className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100">Cancel</button>
                <button type="submit" disabled={isPending} className="rounded-lg bg-[#006D77] px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-50">
                  {isPending ? "Saving..." : "Save Staff"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
