import Link from "next/link";

export default async function UnauthorizedPage({
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  return (
    <section className="mx-auto max-w-xl rounded-2xl border border-rose-200 bg-rose-50 p-8 text-center shadow-sm">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-rose-700">403 Forbidden</p>
      <h1 className="mt-3 text-3xl font-black text-rose-900">Unauthorized Access</h1>
      <p className="mt-3 text-sm text-rose-800">You do not have permission to access this admin resource.</p>
      <Link
        href={`/${locale}/admin`}
        className="mt-6 inline-flex rounded-lg bg-rose-700 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-800"
      >
        Return to Dashboard
      </Link>
    </section>
  );
}
