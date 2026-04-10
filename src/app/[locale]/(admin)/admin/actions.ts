"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { saveLocalUpload } from "@/lib/upload";
import { saveUpload } from "@/lib/storage";
import { extractPdfPath } from "@/lib/newsletter-files";
import { verifySession } from "@/lib/auth-guard";
import { getIpFromHeaders, logCriticalEvent } from "@/lib/logger";
import type { AdminFormState } from "@/components/admin/formState";

const projectSchema = z.object({
  title_en: z.string().min(1, "English title is required."),
  title_am: z.string().min(1, "Amharic title is required."),
  slug: z
    .string()
    .min(1, "Project slug is required.")
    .regex(/^[a-z0-9-]+$/, "Slug must use lowercase letters, numbers, and hyphens only."),
  summary_en: z.string().min(1, "English summary is required."),
  summary_am: z.string().min(1, "Amharic summary is required."),
  body_en: z.string().optional(),
  body_am: z.string().optional(),
  status: z.enum(["ACTIVE", "COMPLETED"]),
  locale: z.enum(["en", "am"]).default("en")
});

const updateProjectSchema = projectSchema.extend({
  id: z.string().min(1, "Project id is required."),
  existingCoverImage: z.string().optional()
});

export async function createProjectAction(_prev: AdminFormState, formData: FormData): Promise<AdminFormState> {
  const user = await verifySession();

  if (!user) {
    throw new Error("Unauthorized");
  }

  const parsed = projectSchema.safeParse({
    title_en: String(formData.get("title_en") ?? "").trim(),
    title_am: String(formData.get("title_am") ?? "").trim(),
    slug: String(formData.get("slug") ?? "").trim(),
    summary_en: String(formData.get("summary_en") ?? "").trim(),
    summary_am: String(formData.get("summary_am") ?? "").trim(),
    body_en: String(formData.get("body_en") ?? "").trim(),
    body_am: String(formData.get("body_am") ?? "").trim(),
    status: String(formData.get("status") ?? "ACTIVE").toUpperCase(),
    locale: String(formData.get("locale") ?? "en").toLowerCase()
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    const flattened = parsed.error.flatten().fieldErrors;

    for (const key of Object.keys(flattened)) {
      const message = flattened[key as keyof typeof flattened]?.[0];
      if (message) {
        fieldErrors[key] = message;
      }
    }

    return {
      status: "error",
      message: "Please fix the highlighted fields.",
      fieldErrors
    };
  }

  const coverImageFile = formData.get("coverImage");
  let coverImagePath: string | null = null;

  if (coverImageFile instanceof File && coverImageFile.size > 0) {
    const isImageMime = coverImageFile.type.startsWith("image/");

    if (!isImageMime) {
      return {
        status: "error",
        message: "Invalid image file. Please upload a valid image.",
        fieldErrors: {
          coverImage: "Only image uploads are allowed."
        }
      };
    }

    try {
      coverImagePath = await saveLocalUpload(coverImageFile, "local");
    } catch {
      return {
        status: "error",
        message: "Image upload failed. Please try again."
      };
    }
  }

  try {
    await prisma.project.create({
      data: {
        title_en: parsed.data.title_en,
        title_am: parsed.data.title_am,
        summary_en: parsed.data.summary_en,
        summary_am: parsed.data.summary_am,
        slug: parsed.data.slug,
        status: parsed.data.status,
        body_en: parsed.data.body_en || null,
        body_am: parsed.data.body_am || null,
        isPublished: parsed.data.status === "ACTIVE",
        publishedAt: parsed.data.status === "ACTIVE" ? new Date() : null,
        coverImage: coverImagePath
      }
    });
  } catch {
    return {
      status: "error",
      message: "This project slug already exists. Please choose a different slug."
    };
  }

  revalidatePath(`/${parsed.data.locale}/admin/projects`, "page");
  revalidatePath(`/${parsed.data.locale}/projects`, "page");
  revalidatePath(`/${parsed.data.locale}`, "page");

  return {
    status: "success",
    message: "Project saved successfully."
  };
}

export async function updateProjectAction(_prev: AdminFormState, formData: FormData): Promise<AdminFormState> {
  const user = await verifySession();

  if (!user) {
    throw new Error("Unauthorized");
  }

  const parsed = updateProjectSchema.safeParse({
    id: String(formData.get("id") ?? "").trim(),
    title_en: String(formData.get("title_en") ?? "").trim(),
    title_am: String(formData.get("title_am") ?? "").trim(),
    slug: String(formData.get("slug") ?? "").trim(),
    summary_en: String(formData.get("summary_en") ?? "").trim(),
    summary_am: String(formData.get("summary_am") ?? "").trim(),
    body_en: String(formData.get("body_en") ?? "").trim(),
    body_am: String(formData.get("body_am") ?? "").trim(),
    status: String(formData.get("status") ?? "ACTIVE").toUpperCase(),
    locale: String(formData.get("locale") ?? "en").toLowerCase(),
    existingCoverImage: String(formData.get("existingCoverImage") ?? "").trim()
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    const flattened = parsed.error.flatten().fieldErrors;

    for (const key of Object.keys(flattened)) {
      const message = flattened[key as keyof typeof flattened]?.[0];
      if (message) {
        fieldErrors[key] = message;
      }
    }

    return {
      status: "error",
      message: "Please fix the highlighted fields.",
      fieldErrors
    };
  }

  const coverImageFile = formData.get("coverImage");
  let coverImagePath: string | null = parsed.data.existingCoverImage || null;

  if (coverImageFile instanceof File && coverImageFile.size > 0) {
    const isImageMime = coverImageFile.type.startsWith("image/");

    if (!isImageMime) {
      return {
        status: "error",
        message: "Invalid image file. Please upload a valid image.",
        fieldErrors: {
          coverImage: "Only image uploads are allowed."
        }
      };
    }

    try {
      coverImagePath = await saveLocalUpload(coverImageFile, "local");
    } catch {
      return {
        status: "error",
        message: "Image upload failed. Please try again."
      };
    }
  }

  try {
    await prisma.project.update({
      where: { id: parsed.data.id },
      data: {
        title_en: parsed.data.title_en,
        title_am: parsed.data.title_am,
        summary_en: parsed.data.summary_en,
        summary_am: parsed.data.summary_am,
        slug: parsed.data.slug,
        status: parsed.data.status,
        body_en: parsed.data.body_en || null,
        body_am: parsed.data.body_am || null,
        isPublished: parsed.data.status === "ACTIVE",
        publishedAt: parsed.data.status === "ACTIVE" ? new Date() : null,
        coverImage: coverImagePath
      }
    });
  } catch {
    return {
      status: "error",
      message: "Unable to update project. Check slug uniqueness and try again."
    };
  }

  revalidatePath(`/${parsed.data.locale}/admin/projects`, "page");
  revalidatePath(`/${parsed.data.locale}/projects`, "page");
  revalidatePath(`/${parsed.data.locale}`, "page");

  return {
    status: "success",
    message: "Successfully Updated project."
  };
}

const newsletterSchema = z.object({
  title_en: z.string().min(1, "English title is required."),
  title_am: z.string().min(1, "Amharic title is required."),
  body_en: z.string().optional(),
  body_am: z.string().optional(),
  email: z.string().email("Please enter a valid email address."),
  publishedAt: z.coerce.date(),
  isPublished: z.boolean().default(false),
  locale: z.enum(["en", "am"]).default("en")
});

const updateNewsletterSchema = newsletterSchema.extend({
  id: z.string().min(1, "Newsletter id is required."),
  existingSource: z.string().optional()
});

export async function createNewsletterAction(_prev: AdminFormState, formData: FormData): Promise<AdminFormState> {
  const user = await verifySession();

  if (!user) {
    throw new Error("Unauthorized");
  }

  const parsed = newsletterSchema.safeParse({
    title_en: String(formData.get("title_en") ?? "").trim(),
    title_am: String(formData.get("title_am") ?? "").trim(),
    body_en: String(formData.get("body_en") ?? "").trim(),
    body_am: String(formData.get("body_am") ?? "").trim(),
    email: String(formData.get("email") ?? "").trim(),
    publishedAt: String(formData.get("publishedAt") ?? "").trim(),
    isPublished: String(formData.get("isPublished") ?? "").toLowerCase() === "on",
    locale: String(formData.get("locale") ?? "en").toLowerCase()
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    const flattened = parsed.error.flatten().fieldErrors;

    for (const key of Object.keys(flattened)) {
      const message = flattened[key as keyof typeof flattened]?.[0];
      if (message) {
        fieldErrors[key] = message;
      }
    }

    return {
      status: "error",
      message: "Please fix the highlighted fields.",
      fieldErrors
    };
  }

  const file = formData.get("pdf");
  let pdfPath: string | null = null;

  if (file instanceof File && file.size > 0) {
    const isPdfMime = file.type === "application/pdf";
    const isPdfName = file.name.toLowerCase().endsWith(".pdf");

    if (!isPdfMime && !isPdfName) {
      return {
        status: "error",
        message: "Invalid file type. Please upload a PDF file only.",
        fieldErrors: {
          pdf: "Only PDF uploads are allowed."
        }
      };
    }

    try {
      pdfPath = await saveLocalUpload(file, "local");
    } catch {
      return {
        status: "error",
        message: "Upload failed. Please try again."
      };
    }
  }

  try {
    const sourceTitle = parsed.data.locale === "am" ? parsed.data.title_am : parsed.data.title_en;

    await prisma.newsletter.create({
      data: {
        title_en: parsed.data.title_en,
        title_am: parsed.data.title_am,
        body_en: parsed.data.body_en || null,
        body_am: parsed.data.body_am || null,
        email: parsed.data.email,
        locale: parsed.data.locale,
        source: pdfPath ? `${sourceTitle} | ${pdfPath}` : sourceTitle,
        subscribed: true,
        isPublished: parsed.data.isPublished,
        publishedAt: parsed.data.publishedAt
      }
    });
  } catch {
    return {
      status: "error",
      message: "A newsletter with this email already exists."
    };
  }

  revalidatePath(`/${parsed.data.locale}/admin/newsletters`, "page");
  revalidatePath(`/${parsed.data.locale}/news`, "page");

  return {
    status: "success",
    message: "Newsletter saved successfully."
  };
}

export async function updateNewsletterAction(_prev: AdminFormState, formData: FormData): Promise<AdminFormState> {
  const user = await verifySession();

  if (!user) {
    throw new Error("Unauthorized");
  }

  const parsed = updateNewsletterSchema.safeParse({
    id: String(formData.get("id") ?? "").trim(),
    title_en: String(formData.get("title_en") ?? "").trim(),
    title_am: String(formData.get("title_am") ?? "").trim(),
    body_en: String(formData.get("body_en") ?? "").trim(),
    body_am: String(formData.get("body_am") ?? "").trim(),
    email: String(formData.get("email") ?? "").trim(),
    publishedAt: String(formData.get("publishedAt") ?? "").trim(),
    isPublished: String(formData.get("isPublished") ?? "").toLowerCase() === "on",
    locale: String(formData.get("locale") ?? "en").toLowerCase(),
    existingSource: String(formData.get("existingSource") ?? "").trim()
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    const flattened = parsed.error.flatten().fieldErrors;

    for (const key of Object.keys(flattened)) {
      const message = flattened[key as keyof typeof flattened]?.[0];
      if (message) {
        fieldErrors[key] = message;
      }
    }

    return {
      status: "error",
      message: "Please fix the highlighted fields.",
      fieldErrors
    };
  }

  const file = formData.get("pdf");
  let sourceValue: string;

  const sourceTitle = parsed.data.locale === "am" ? parsed.data.title_am : parsed.data.title_en;

  if (file instanceof File && file.size > 0) {
    const isPdfMime = file.type === "application/pdf";
    const isPdfName = file.name.toLowerCase().endsWith(".pdf");

    if (!isPdfMime && !isPdfName) {
      return {
        status: "error",
        message: "Invalid file type. Please upload a PDF file only.",
        fieldErrors: {
          pdf: "Only PDF uploads are allowed."
        }
      };
    }

    try {
      const pdfPath = await saveLocalUpload(file, "local");
      sourceValue = `${sourceTitle} | ${pdfPath}`;
    } catch {
      return {
        status: "error",
        message: "Upload failed. Please try again."
      };
    }
  } else {
    const existingPdfPath = extractPdfPath(parsed.data.existingSource || null);
    sourceValue = existingPdfPath ? `${sourceTitle} | ${existingPdfPath}` : sourceTitle;
  }

  try {
    await prisma.newsletter.update({
      where: { id: parsed.data.id },
      data: {
        title_en: parsed.data.title_en,
        title_am: parsed.data.title_am,
        body_en: parsed.data.body_en || null,
        body_am: parsed.data.body_am || null,
        email: parsed.data.email,
        locale: parsed.data.locale,
        source: sourceValue,
        isPublished: parsed.data.isPublished,
        publishedAt: parsed.data.publishedAt
      }
    });
  } catch {
    return {
      status: "error",
      message: "Unable to update newsletter. Check unique email and try again."
    };
  }

  revalidatePath(`/${parsed.data.locale}/admin/newsletters`, "page");
  revalidatePath(`/${parsed.data.locale}/news`, "page");

  return {
    status: "success",
    message: "Successfully Updated newsletter."
  };
}

export async function deleteNewsletterAction(formData: FormData) {
  const user = await verifySession();

  if (!user) {
    throw new Error("Unauthorized");
  }

  const id = String(formData.get("id") ?? "").trim();
  const locale = String(formData.get("locale") ?? "en").toLowerCase();

  if (!id) {
    return;
  }

  try {
    await prisma.newsletter.delete({ where: { id } });
  } catch {
    return;
  }

  revalidatePath(`/${locale}/admin/newsletters`, "page");
  revalidatePath(`/${locale}/news`, "page");
}

export async function toggleProjectStatusAction(formData: FormData) {
  const user = await verifySession();

  if (!user) {
    throw new Error("Unauthorized");
  }

  const projectId = String(formData.get("projectId") ?? "");
  const currentStatus = String(formData.get("currentStatus") ?? "ACTIVE").toUpperCase();
  const locale = String(formData.get("locale") ?? "en").toLowerCase();

  if (!projectId) {
    return;
  }

  const nextStatus = currentStatus === "ACTIVE" ? "COMPLETED" : "ACTIVE";

  await prisma.project.update({
    where: { id: projectId },
    data: {
      status: nextStatus,
      isPublished: nextStatus === "ACTIVE",
      publishedAt: nextStatus === "ACTIVE" ? new Date() : null
    }
  });

  revalidatePath(`/${locale}/admin/projects`, "page");
  revalidatePath(`/${locale}/projects`, "page");
  revalidatePath(`/${locale}`, "page");
}

export async function deleteProjectAction(formData: FormData) {
  const user = await verifySession();

  if (!user) {
    throw new Error("Unauthorized");
  }

  const projectId = String(formData.get("projectId") ?? "").trim();
  const locale = String(formData.get("locale") ?? "en").toLowerCase();

  if (!projectId) {
    return;
  }

  const requestHeaders = await headers();
  const requestIp = getIpFromHeaders(requestHeaders);

  try {
    await prisma.project.delete({ where: { id: projectId } });

    logCriticalEvent({
      event: "PROJECT_DELETION",
      userId: user.id,
      ip: requestIp,
      message: "Project deleted from admin dashboard.",
      metadata: {
        projectId
      }
    });
  } catch {
    return;
  }

  revalidatePath(`/${locale}/admin/projects`, "page");
  revalidatePath(`/${locale}/projects`, "page");
  revalidatePath(`/${locale}`, "page");
}

const governanceBaseSchema = z.object({
  name_en: z.string().min(1, "English name is required."),
  name_am: z.string().min(1, "Amharic name is required."),
  role_en: z.string().min(1, "English role is required."),
  role_am: z.string().min(1, "Amharic role is required."),
  bio_en: z.string().optional(),
  bio_am: z.string().optional(),
  order: z.coerce.number().int().min(0).default(0),
  locale: z.enum(["en", "am"]).default("en")
});

const createGovernanceSchema = governanceBaseSchema.extend({
  isBoardMember: z.boolean().default(false)
});

const updateGovernanceSchema = governanceBaseSchema.extend({
  id: z.string().min(1, "Member id is required."),
  isBoardMember: z.boolean().default(false),
  existingImagePath: z.string().optional()
});

const deleteGovernanceSchema = z.object({
  id: z.string().min(1, "Member id is required."),
  locale: z.enum(["en", "am"]).default("en")
});

function normalizeFieldErrors(error: z.ZodError): Record<string, string> {
  const fieldErrors: Record<string, string> = {};
  const flattened = error.flatten().fieldErrors;

  for (const key of Object.keys(flattened)) {
    const message = flattened[key as keyof typeof flattened]?.[0];
    if (message) {
      fieldErrors[key] = message;
    }
  }

  return fieldErrors;
}

function revalidateGovernancePaths(locale: string) {
  revalidatePath(`/${locale}/admin/governance`, "page");
  revalidatePath(`/${locale}/governance`, "page");
  revalidatePath(`/en/governance`, "page");
  revalidatePath(`/am/governance`, "page");
}

async function saveGovernanceImage(file: FormDataEntryValue | null) {
  if (!(file instanceof File) || file.size === 0) {
    return null;
  }

  if (!file.type.startsWith("image/")) {
    return { error: "Only image uploads are allowed." };
  }

  try {
    const imagePath = await saveUpload(file, { subdirectory: "governance" });
    return { imagePath };
  } catch {
    return { error: "Image upload failed. Please try again." };
  }
}

export async function createGovernanceMember(_prev: AdminFormState, formData: FormData): Promise<AdminFormState> {
  const user = await verifySession();

  if (!user) {
    throw new Error("Unauthorized");
  }

  const parsed = createGovernanceSchema.safeParse({
    name_en: String(formData.get("name_en") ?? "").trim(),
    name_am: String(formData.get("name_am") ?? "").trim(),
    role_en: String(formData.get("role_en") ?? "").trim(),
    role_am: String(formData.get("role_am") ?? "").trim(),
    bio_en: String(formData.get("bio_en") ?? "").trim(),
    bio_am: String(formData.get("bio_am") ?? "").trim(),
    order: String(formData.get("order") ?? "0"),
    isBoardMember: String(formData.get("isBoardMember") ?? "").toLowerCase() === "on",
    locale: String(formData.get("locale") ?? "en").toLowerCase()
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Please fix the highlighted fields.",
      fieldErrors: normalizeFieldErrors(parsed.error)
    };
  }

  const uploadResult = await saveGovernanceImage(formData.get("image"));
  if (uploadResult && "error" in uploadResult) {
    const message = uploadResult.error ?? "Image upload failed. Please try again.";
    return {
      status: "error",
      message,
      fieldErrors: { image: message }
    };
  }

  await prisma.governanceMember.create({
    data: {
      name_en: parsed.data.name_en,
      name_am: parsed.data.name_am,
      role_en: parsed.data.role_en,
      role_am: parsed.data.role_am,
      bio_en: parsed.data.bio_en || null,
      bio_am: parsed.data.bio_am || null,
      imagePath: uploadResult?.imagePath ?? null,
      order: parsed.data.order,
      isBoardMember: parsed.data.isBoardMember
    }
  });

  revalidateGovernancePaths(parsed.data.locale);

  return {
    status: "success",
    message: "Governance member created successfully."
  };
}

export async function updateGovernanceMember(_prev: AdminFormState, formData: FormData): Promise<AdminFormState> {
  const user = await verifySession();

  if (!user) {
    throw new Error("Unauthorized");
  }

  const parsed = updateGovernanceSchema.safeParse({
    id: String(formData.get("id") ?? "").trim(),
    name_en: String(formData.get("name_en") ?? "").trim(),
    name_am: String(formData.get("name_am") ?? "").trim(),
    role_en: String(formData.get("role_en") ?? "").trim(),
    role_am: String(formData.get("role_am") ?? "").trim(),
    bio_en: String(formData.get("bio_en") ?? "").trim(),
    bio_am: String(formData.get("bio_am") ?? "").trim(),
    order: String(formData.get("order") ?? "0"),
    isBoardMember: String(formData.get("isBoardMember") ?? "").toLowerCase() === "on",
    existingImagePath: String(formData.get("existingImagePath") ?? "").trim(),
    locale: String(formData.get("locale") ?? "en").toLowerCase()
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Please fix the highlighted fields.",
      fieldErrors: normalizeFieldErrors(parsed.error)
    };
  }

  const uploadResult = await saveGovernanceImage(formData.get("image"));
  if (uploadResult && "error" in uploadResult) {
    const message = uploadResult.error ?? "Image upload failed. Please try again.";
    return {
      status: "error",
      message,
      fieldErrors: { image: message }
    };
  }

  await prisma.governanceMember.update({
    where: { id: parsed.data.id },
    data: {
      name_en: parsed.data.name_en,
      name_am: parsed.data.name_am,
      role_en: parsed.data.role_en,
      role_am: parsed.data.role_am,
      bio_en: parsed.data.bio_en || null,
      bio_am: parsed.data.bio_am || null,
      imagePath: uploadResult?.imagePath ?? (parsed.data.existingImagePath || null),
      order: parsed.data.order,
      isBoardMember: parsed.data.isBoardMember
    }
  });

  revalidateGovernancePaths(parsed.data.locale);

  return {
    status: "success",
    message: "Governance member updated successfully."
  };
}

export async function deleteGovernanceMember(_prev: AdminFormState, formData: FormData): Promise<AdminFormState> {
  const user = await verifySession();

  if (!user) {
    throw new Error("Unauthorized");
  }

  const parsed = deleteGovernanceSchema.safeParse({
    id: String(formData.get("id") ?? "").trim(),
    locale: String(formData.get("locale") ?? "en").toLowerCase()
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Unable to delete member.",
      fieldErrors: normalizeFieldErrors(parsed.error)
    };
  }

  await prisma.governanceMember.delete({ where: { id: parsed.data.id } });

  revalidateGovernancePaths(parsed.data.locale);

  return {
    status: "success",
    message: "Governance member deleted."
  };
}
