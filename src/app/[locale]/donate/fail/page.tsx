import Link from "next/link";
import { CircleX } from "lucide-react";

export default async function DonateFailPage({
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  return (
    <section className="mx-auto flex min-h-[60vh] max-w-3xl items-center px-4 py-16 sm:px-6 lg:px-8">
      <div className="w-full rounded-3xl border border-amber-200 bg-white p-10 text-center">
        <CircleX className="mx-auto mb-4 size-16 text-[#C9992F]" />
        <h1 className="text-3xl font-black text-slate-900">Payment Not Completed</h1>
        <p className="mt-3 text-slate-700">Please try again or use another payment method.</p>
        <Link
          href={`/${locale}/donate`}
          className="mt-8 inline-flex rounded-xl bg-[#C9992F] px-6 py-3 font-bold text-slate-900 transition hover:brightness-95"
        >
          Try Again
        </Link>
      </div>
    </section>
  );
}
