import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { generateTxRef, initializePayment } from "@/lib/chapa";
import { isLocale } from "@/lib/i18n-config";
import { signDonationStatusToken } from "@/lib/donation-status-token";

const donateInitSchema = z.object({
  amount: z.number().min(5).max(10000000),
  email: z.string().email(),
  name: z.string().min(2).max(160),
  locale: z.string().default("en")
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = donateInitSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid donation request",
          issues: parsed.error.flatten()
        },
        { status: 400 }
      );
    }

    const { amount, email, name, locale } = parsed.data;
    const safeLocale = isLocale(locale) ? locale : "en";
    const txRef = generateTxRef();
    const statusToken = signDonationStatusToken(txRef);
    const parts = name.trim().split(/\s+/).filter(Boolean);
    const firstName = parts[0] ?? "Supporter";
    const lastName = parts.length > 1 ? parts.slice(1).join(" ") : "FKL";

    await prisma.donation.create({
      data: {
        tx_ref: txRef,
        amount: amount.toString(),
        donorEmail: email,
        donorName: name,
        paymentStatus: "PENDING",
        paymentProvider: "chapa",
        metadata: {
          source: "fkl-local-api",
          locale: safeLocale,
          initializedAt: new Date().toISOString()
        }
      }
    });

    try {
      const result = await initializePayment({
        amount,
        email,
        first_name: firstName,
        last_name: lastName,
        locale: safeLocale,
        tx_ref: txRef,
        status_token: statusToken
      });

      await prisma.donation.update({
        where: { tx_ref: txRef },
        data: {
          chapaCheckoutId: result.tx_ref,
          metadata: {
            chapa: {
              checkoutUrl: result.checkout_url
            }
          }
        }
      });

      return NextResponse.json({
        tx_ref: txRef,
        status_token: statusToken,
        checkout_url: result.checkout_url
      });
    } catch (chapaError) {
      const message = chapaError instanceof Error ? chapaError.message : "Chapa initialization failed";

      console.error("[donate/init] Chapa initialization failed", {
        tx_ref: txRef,
        error: message
      });

      await prisma.donation.update({
        where: { tx_ref: txRef },
        data: {
          paymentStatus: "FAILED",
          metadata: {
            source: "fkl-local-api",
            locale: safeLocale,
            error: message
          }
        }
      });

      return NextResponse.json({ error: message }, { status: 502 });
    }
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
}
