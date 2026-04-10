"use server";

import { prisma } from "@/lib/prisma";
import { contactSchema, type ContactFormState } from "./schema";

export async function sendContactAction(_prev: ContactFormState, formData: FormData): Promise<ContactFormState> {
  const locale = String(formData.get("locale") ?? "en").toLowerCase() === "am" ? "am" : "en";

  const parsed = contactSchema.safeParse({
    name: String(formData.get("name") ?? "").trim(),
    email: String(formData.get("email") ?? "").trim(),
    subject: String(formData.get("subject") ?? "").trim(),
    message: String(formData.get("message") ?? "").trim(),
    locale
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    const flattened = parsed.error.flatten().fieldErrors;

    for (const key of Object.keys(flattened)) {
      const issue = flattened[key as keyof typeof flattened]?.[0];
      if (issue) {
        fieldErrors[key] = issue;
      }
    }

    return {
      status: "error",
      message: locale === "am" ? "እባክዎ ቅጹን በትክክል ይሙሉ።" : "Please complete all required fields.",
      fieldErrors
    };
  }

  try {
    await prisma.contactMessage.create({
      data: {
        name: parsed.data.name,
        email: parsed.data.email,
        subject: parsed.data.subject,
        message: parsed.data.message,
        status: "UNREAD"
      }
    });

    console.info("Email Notification", {
      channel: "contact",
      subject: parsed.data.subject,
      from: parsed.data.email,
      createdAt: new Date().toISOString()
    });
  } catch {
    return {
      status: "error",
      message: parsed.data.locale === "am" ? "መልእክትዎን መላክ አልተሳካም።" : "Failed to send your message. Please retry."
    };
  }

  return {
    status: "success",
    message: parsed.data.locale === "am" ? "መልእክትዎ በተሳካ ሁኔታ ተልኳል።" : "Your message has been sent successfully."
  };
}
