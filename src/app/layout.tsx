import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import "@/lib/env";

export const metadata: Metadata = {
  title: "Fregenet Kidan Lehitsanat (FKL)",
  description: "Building Ethiopia's future through holistic education and community support."
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
