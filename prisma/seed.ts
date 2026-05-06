import "dotenv/config";
import { PrismaClient } from "./generated/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seed start: DATABASE_URL loaded =", Boolean(process.env.DATABASE_URL));

  const adminEmail = process.env.INITIAL_ADMIN_EMAIL?.trim().toLowerCase();
  const adminPassword = process.env.INITIAL_ADMIN_PASSWORD?.trim();

  if (!adminEmail || !adminPassword) {
    throw new Error("INITIAL_ADMIN_EMAIL and INITIAL_ADMIN_PASSWORD are required for seeding.");
  }

  const passwordHash = await bcrypt.hash(adminPassword, 12);
  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      password: passwordHash,
      role: "SUPERADMIN",
      updatedAt: new Date()
    },
    create: {
      email: adminEmail,
      password: passwordHash,
      role: "SUPERADMIN",
      createdAt: new Date(),
      updatedAt: new Date()
    }
  });

  console.log("Seed complete: admin user initialized.");
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
