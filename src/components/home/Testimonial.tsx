"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import RevealOnScroll from "@/components/home/RevealOnScroll";

export default function Testimonial() {
  const t = useTranslations();

  return (
    <RevealOnScroll>
      <section className="section-tibeb bg-white py-20">
        <div className="mx-auto w-full max-w-7xl px-4">
          <blockquote className="mx-auto max-w-4xl rounded-3xl border border-slate-200 bg-white/95 px-8 py-12 text-center shadow-sm sm:px-12">
            <div className="mb-6 flex justify-center">
              <Image
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuA421RZvX7ba4wPv_1xIpkLNRCztcUyi9wSHwRcwXDh6R6k1Z-1GREUFiPa1PyPMRpKw4Y2xNOnf0x75KFw0un6T-M6xkflYH0Z0Q85g3aDT5Il-pjNTx9qf__SftYnsp-6yrgM3Rz3ofHqj-2Hqs8QoQDJMCMowAHLbAcRoWRGZ1wpBrtloWuaUpo-RFegZllkZ6PvunMpxerlc5wEgfUGApT1HI6dTu4EZgJZbHqHLmKjcfHb5SS2T8ll1tOPCXgkI3uhG6qbJw"
                alt={t("Testimonial.author")}
                width={128}
                height={128}
                sizes="(max-width: 768px) 96px, 128px"
                className="size-24 rounded-full object-cover ring-4 ring-primary/10"
              />
            </div>
            <p className="text-3xl font-semibold leading-snug text-slate-900 sm:text-4xl">“{t("Testimonial.quote")}”</p>
            <footer className="mt-6 text-sm font-bold uppercase tracking-[0.18em] text-primary">
              {t("Testimonial.author")}
            </footer>
          </blockquote>
        </div>
      </section>
    </RevealOnScroll>
  );
}
