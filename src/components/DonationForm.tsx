"use client";

import { FormEvent, useMemo, useState } from "react";
import { useLocale } from "next-intl";
import { LoaderCircle } from "lucide-react";
import { isLocale, type Locale } from "@/lib/i18n-config";

const presetAmounts = [500, 1000, 5000, 15000];

type InitDonateResponse = {
  checkout_url?: string;
  tx_ref?: string;
  error?: string;
};

export default function DonationForm() {
  const locale = useLocale();
  const safeLocale: Locale = isLocale(locale) ? locale : "en";

  const [amount, setAmount] = useState<number>(15000);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canSubmit = useMemo(() => amount >= 5 && !!name.trim() && !!email.trim(), [amount, name, email]);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (amount < 5) {
      setError("Minimum donation is 5 ETB.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/donate/init", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          amount,
          email,
          name,
          locale: safeLocale
        })
      });

      const data = (await response.json()) as InitDonateResponse;

      if (!response.ok || !data.checkout_url) {
        throw new Error(data.error ?? "Unable to initialize payment.");
      }

      window.location.assign(data.checkout_url);
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : "Payment request failed.";
      setError(message);
      setIsSubmitting(false);
    }
  };

  return (
    <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm sm:p-10">
        <p className="mb-2 text-xs font-black uppercase tracking-[0.18em] text-primary">FKL</p>
        <h1 className="text-4xl font-black text-primary">Sponsor a Student</h1>
        <p className="mt-3 text-slate-600">Secure ETB contributions powered by Chapa.</p>

        <form className="mt-8 space-y-6" onSubmit={onSubmit}>
          <div>
            <p className="mb-3 text-sm font-semibold text-slate-700">Choose an amount (ETB)</p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {presetAmounts.map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setAmount(value)}
                  className={`rounded-xl border px-4 py-3 text-sm font-bold transition ${
                    amount === value
                      ? "border-primary bg-primary text-white"
                      : "border-slate-300 bg-white text-slate-700 hover:border-primary"
                  }`}
                >
                  {value.toLocaleString()} ETB
                </button>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="amount" className="mb-2 block text-sm font-semibold text-slate-700">
              Custom amount (ETB)
            </label>
            <input
              id="amount"
              type="number"
              min={5}
              step={1}
              value={amount}
              onChange={(event) => setAmount(Number(event.target.value) || 0)}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-primary focus:ring-2 focus:ring-teal-200"
              required
            />
          </div>

          <div>
            <label htmlFor="name" className="mb-2 block text-sm font-semibold text-slate-700">
              Full Name
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-primary focus:ring-2 focus:ring-teal-200"
              placeholder="Amanuel Kebede"
              required
            />
          </div>

          <div>
            <label htmlFor="email" className="mb-2 block text-sm font-semibold text-slate-700">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-primary focus:ring-2 focus:ring-teal-200"
              placeholder="you@example.com"
              required
            />
          </div>

          {error ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

          <button
            type="submit"
            disabled={isSubmitting || !canSubmit}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 py-4 text-base font-bold text-white transition hover:bg-cyan-800 disabled:cursor-not-allowed disabled:opacity-80"
          >
            {isSubmitting ? <LoaderCircle className="size-5 animate-spin text-teal-200" /> : null}
            {isSubmitting ? "Redirecting to Secure Payment..." : "Sponsor Now"}
          </button>
        </form>
      </div>
    </section>
  );
}
