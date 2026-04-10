import "dotenv/config";
import { PrismaClient } from "./generated/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

type DonationSeed = {
  donorName: string;
  donorEmail: string;
  donorPhone: string;
  amount: number;
  paymentStatus: "COMPLETED" | "PENDING" | "FAILED";
  daysAgo: number;
};

const donationSeeds: DonationSeed[] = [
  {
    donorName: "Abebe Kebede",
    donorEmail: "abebe.kebede@example.com",
    donorPhone: "+251911223344",
    amount: 500,
    paymentStatus: "COMPLETED",
    daysAgo: 2
  },
  {
    donorName: "Sara Tekle",
    donorEmail: "sara.tekle@example.com",
    donorPhone: "+251922334455",
    amount: 1000,
    paymentStatus: "PENDING",
    daysAgo: 1
  },
  {
    donorName: "John Doe",
    donorEmail: "john.doe@example.com",
    donorPhone: "+12025550199",
    amount: 5000,
    paymentStatus: "FAILED",
    daysAgo: 5
  },
  {
    donorName: "Martha Alemu",
    donorEmail: "martha.alemu@example.com",
    donorPhone: "+251933445566",
    amount: 1000,
    paymentStatus: "COMPLETED",
    daysAgo: 7
  },
  {
    donorName: "Henok Tadesse",
    donorEmail: "henok.tadesse@example.com",
    donorPhone: "+251944556677",
    amount: 500,
    paymentStatus: "PENDING",
    daysAgo: 9
  },
  {
    donorName: "Selamawit Bekele",
    donorEmail: "selamawit.bekele@example.com",
    donorPhone: "+251955667788",
    amount: 5000,
    paymentStatus: "COMPLETED",
    daysAgo: 12
  },
  {
    donorName: "Michael Smith",
    donorEmail: "michael.smith@example.com",
    donorPhone: "+447700900123",
    amount: 15000,
    paymentStatus: "COMPLETED",
    daysAgo: 14
  },
  {
    donorName: "Ruth Getachew",
    donorEmail: "ruth.getachew@example.com",
    donorPhone: "+251966778899",
    amount: 1000,
    paymentStatus: "FAILED",
    daysAgo: 16
  },
  {
    donorName: "Daniel Wondimu",
    donorEmail: "daniel.wondimu@example.com",
    donorPhone: "+251977889900",
    amount: 500,
    paymentStatus: "COMPLETED",
    daysAgo: 18
  },
  {
    donorName: "Hana Mekonnen",
    donorEmail: "hana.mekonnen@example.com",
    donorPhone: "+251988990011",
    amount: 5000,
    paymentStatus: "PENDING",
    daysAgo: 21
  },
  {
    donorName: "Samuel Johnson",
    donorEmail: "samuel.johnson@example.com",
    donorPhone: "+14155552671",
    amount: 15000,
    paymentStatus: "COMPLETED",
    daysAgo: 25
  },
  {
    donorName: "Liya Hailu",
    donorEmail: "liya.hailu@example.com",
    donorPhone: "+251999001122",
    amount: 1000,
    paymentStatus: "FAILED",
    daysAgo: 29
  }
];

function dateDaysAgo(daysAgo: number) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d;
}

async function seedDonations() {
  const base = Date.now();

  const data = donationSeeds.map((donation, index) => {
    const createdAt = dateDaysAgo(donation.daysAgo);

    return {
      donorName: donation.donorName,
      donorEmail: donation.donorEmail,
      donorPhone: donation.donorPhone,
      tx_ref: `FKL-TXN-${base + index}`,
      amount: donation.amount,
      currency: "ETB",
      paymentProvider: "chapa",
      paymentStatus: donation.paymentStatus,
      paidAt: donation.paymentStatus === "COMPLETED" ? createdAt : null,
      metadata: {
        source: "seed-script",
        channel: "admin-ux-test"
      },
      createdAt,
      updatedAt: createdAt
    };
  });

  await prisma.donation.createMany({ data, skipDuplicates: true });
}

async function seedProjects() {
  const projects = [
    {
      title_en: "Addis Library Phase 1",
      title_am: "Addis Library Phase 1",
      slug: "addis-library-phase-1",
      summary_en: "Community-focused reading center with digital learning corner.",
      summary_am: "Community-focused reading center with digital learning corner.",
      status: "ACTIVE" as const,
      body_en: "Pilot phase focused on reading access and digital literacy.",
      body_am: "Pilot phase focused on reading access and digital literacy.",
      isPublished: true
    },
    {
      title_en: "Bishoftu Lab",
      title_am: "Bishoftu Lab",
      slug: "bishoftu-lab",
      summary_en: "Modern science lab setup for rural schools.",
      summary_am: "Modern science lab setup for rural schools.",
      status: "COMPLETED" as const,
      body_en: "Completed infrastructure and equipment installation.",
      body_am: "Completed infrastructure and equipment installation.",
      isPublished: false
    },
    {
      title_en: "Adama School Meals Expansion",
      title_am: "Adama School Meals Expansion",
      slug: "adama-school-meals-expansion",
      summary_en: "Scaling nutrition support to improve attendance and outcomes.",
      summary_am: "Scaling nutrition support to improve attendance and outcomes.",
      status: "ACTIVE" as const,
      body_en: "Active expansion with phased school onboarding.",
      body_am: "Active expansion with phased school onboarding.",
      isPublished: true
    }
  ];

  for (const project of projects) {
    await prisma.project.upsert({
      where: { slug: project.slug },
      update: {
        title_en: project.title_en,
        title_am: project.title_am,
        summary_en: project.summary_en,
        summary_am: project.summary_am,
        status: project.status,
        body_en: project.body_en,
        body_am: project.body_am,
        isPublished: project.isPublished
      },
      create: project
    });
  }
}

async function seedNewsletters() {
  const newsletters = [
    {
      title_en: "January Impact Update",
      title_am: "January Impact Update",
      body_en: "Highlights and outcomes for January local programs.",
      body_am: "Highlights and outcomes for January local programs.",
      email: "updates+january@fkl-local.org",
      locale: "en",
      source: "January Impact Update | /uploads/local/test-january.pdf"
    },
    {
      title_en: "February Community Bulletin",
      title_am: "February Community Bulletin",
      body_en: "Community updates from field teams and school partners.",
      body_am: "Community updates from field teams and school partners.",
      email: "updates+february@fkl-local.org",
      locale: "am",
      source: "February Community Bulletin | /uploads/local/test-february.pdf"
    }
  ];

  for (const newsletter of newsletters) {
    await prisma.newsletter.upsert({
      where: { email: newsletter.email },
      update: {
        locale: newsletter.locale,
        title_en: newsletter.title_en,
        title_am: newsletter.title_am,
        body_en: newsletter.body_en,
        body_am: newsletter.body_am,
        source: newsletter.source,
        subscribed: true
      },
      create: {
        ...newsletter,
        subscribed: true
      }
    });
  }
}

async function ensureBootstrapSuperadmin() {
  const existingAccounts = await prisma.staffAccount.count();
  if (existingAccounts > 0) {
    console.log("Bootstrap admin skipped: StaffAccount records already exist.");
    return;
  }

  const initialAdminPassword = process.env.INITIAL_ADMIN_PASSWORD?.trim();
  if (!initialAdminPassword) {
    console.log("Bootstrap admin skipped: INITIAL_ADMIN_PASSWORD not set.");
    return;
  }

  const email = (process.env.INITIAL_ADMIN_EMAIL || "superadmin@fregenet.local").trim().toLowerCase();

  const center =
    (await prisma.schoolCenter.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: "asc" }
    })) ??
    (await prisma.schoolCenter.create({
      data: {
        name: "Default Center",
        location: "Addis Ababa"
      }
    }));

  const staff = await prisma.staff.create({
    data: {
      name: "Platform Superadmin",
      role: "ADMIN",
      baseSalary: 0,
      centerId: center.id,
      isActive: true
    }
  });

  const passwordHash = await bcrypt.hash(initialAdminPassword, 12);

  await prisma.staffAccount.create({
    data: {
      email,
      password: passwordHash,
      role: "SUPERADMIN",
      staffId: staff.id
    }
  });

  console.log(`Bootstrap SUPERADMIN account created for ${email}. Rotate INITIAL_ADMIN_PASSWORD immediately.`);
}

async function main() {
  console.log("Seed start: DATABASE_URL loaded =", Boolean(process.env.DATABASE_URL));

  await seedDonations();
  await seedProjects();
  await seedNewsletters();
  await ensureBootstrapSuperadmin();

  console.log("Seed complete: donations, projects, newsletters, and bootstrap admin check complete.");
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
