import "dotenv/config";
import { PrismaClient } from "./generated/client";
import bcrypt from "bcryptjs";
import Decimal from "decimal.js";

const prisma = new PrismaClient();

type CenterRef = {
  id: string;
  name: string;
};

function normalizeEthiopianPhone(value: string) {
  const digits = value.replace(/\D/g, "");
  if (!digits) {
    return "";
  }

  let local = digits;
  if (digits.startsWith("2510") && digits.length === 13) {
    local = digits.slice(4);
  } else if (digits.startsWith("251") && digits.length === 12) {
    local = digits.slice(3);
  } else if (digits.startsWith("0") && digits.length === 10) {
    local = digits.slice(1);
  }

  if (!/^[79]\d{8}$/.test(local)) {
    return "";
  }

  return local;
}

async function upsertCenter(name: string, location: string): Promise<CenterRef> {
  const existing = await prisma.schoolCenter.findFirst({ where: { name } });
  if (existing) {
    const updated = await prisma.schoolCenter.update({
      where: { id: existing.id },
      data: { location, isActive: true, updatedAt: new Date() }
    });
    return { id: updated.id, name: updated.name };
  }

  const created = await prisma.schoolCenter.create({
    data: {
      name,
      location,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  });

  return { id: created.id, name: created.name };
}

async function upsertStaff(params: {
  centerId: string;
  name: string;
  role: "TEACHER" | "ADMIN" | "SUPPORT";
  baseSalary: number;
}) {
  const existing = await prisma.staff.findFirst({
    where: { centerId: params.centerId, name: params.name }
  });

  if (existing) {
    return prisma.staff.update({
      where: { id: existing.id },
      data: {
        role: params.role,
        baseSalary: new Decimal(params.baseSalary).toFixed(2),
        isActive: true,
        updatedAt: new Date()
      }
    });
  }

  return prisma.staff.create({
    data: {
      centerId: params.centerId,
      name: params.name,
      role: params.role,
      baseSalary: new Decimal(params.baseSalary).toFixed(2),
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  });
}

function calculateEthiopianTax(taxableIncome: typeof Decimal.prototype) {
  if (taxableIncome.lte(600)) return new Decimal(0);
  if (taxableIncome.lte(1650)) return taxableIncome.times(0.1).minus(60);
  if (taxableIncome.lte(3200)) return taxableIncome.times(0.15).minus(142.5);
  if (taxableIncome.lte(5250)) return taxableIncome.times(0.2).minus(302.5);
  if (taxableIncome.lte(7800)) return taxableIncome.times(0.25).minus(565);
  if (taxableIncome.lte(10900)) return taxableIncome.times(0.3).minus(955);
  return taxableIncome.times(0.35).minus(1500);
}

async function ensurePayrollForCurrentMonth(staffIds: string[]) {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  for (const staffId of staffIds) {
    const staff = await prisma.staff.findUnique({ where: { id: staffId } });
    if (!staff) continue;

    const existing = await prisma.payrollRecord.findFirst({
      where: { staffId, month, year }
    });

    if (existing) {
      continue;
    }

    const grossSalary = new Decimal(staff.baseSalary.toString());
    const pensionContribution = grossSalary.times(0.07);
    const employerPensionContribution = grossSalary.times(0.11);
    const taxableIncome = grossSalary.minus(pensionContribution);
    const incomeTax = calculateEthiopianTax(taxableIncome);
    const netSalary = grossSalary.minus(pensionContribution).minus(incomeTax);

    await prisma.payrollRecord.create({
      data: {
        staffId,
        month,
        year,
        grossSalary: grossSalary.toFixed(2),
        netSalary: netSalary.toDecimalPlaces(2).toFixed(2),
        incomeTax: incomeTax.toDecimalPlaces(2).toFixed(2),
        pensionContribution: pensionContribution.toDecimalPlaces(2).toFixed(2),
        employerPensionContribution: employerPensionContribution.toDecimalPlaces(2).toFixed(2),
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });
  }
}

async function upsertGuardian(params: {
  name: string;
  relationship: "MOTHER" | "FATHER" | "LEGAL_GUARDIAN";
  phone: string;
  email?: string;
  address?: string;
}) {
  const normalizedPhone = normalizeEthiopianPhone(params.phone);
  if (!normalizedPhone) {
    throw new Error(`Invalid guardian phone for ${params.name}`);
  }

  const existing = await prisma.guardian.findFirst({
    where: { phoneNumber: normalizedPhone }
  });

  if (existing) {
    return prisma.guardian.update({
      where: { id: existing.id },
      data: {
        name: params.name,
        relationship: params.relationship,
        email: params.email ?? null,
        address: params.address ?? null,
        updatedAt: new Date()
      }
    });
  }

  return prisma.guardian.create({
    data: {
      name: params.name,
      relationship: params.relationship,
      phoneNumber: normalizedPhone,
      email: params.email ?? null,
      address: params.address ?? null,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  });
}

async function upsertStudent(params: {
  centerId: string;
  guardianId: string;
  name: string;
  gradeLevel: string;
  gender: "MALE" | "FEMALE" | "OTHER";
  dateOfBirth: Date;
  enrollmentDate: Date;
}) {
  const existing = await prisma.student.findFirst({
    where: {
      centerId: params.centerId,
      name: params.name,
      dateOfBirth: params.dateOfBirth
    }
  });

  if (existing) {
    return prisma.student.update({
      where: { id: existing.id },
      data: {
        guardianId: params.guardianId,
        gradeLevel: params.gradeLevel,
        gender: params.gender,
        enrollmentDate: params.enrollmentDate,
        status: "ACTIVE",
        updatedAt: new Date()
      }
    });
  }

  return prisma.student.create({
    data: {
      centerId: params.centerId,
      guardianId: params.guardianId,
      name: params.name,
      gradeLevel: params.gradeLevel,
      gender: params.gender,
      dateOfBirth: params.dateOfBirth,
      enrollmentDate: params.enrollmentDate,
      status: "ACTIVE",
      createdAt: new Date(),
      updatedAt: new Date()
    }
  });
}

async function upsertInventoryItem(params: {
  centerId: string;
  name: string;
  category: "TEXTBOOK" | "UNIFORM" | "ASSET";
  quantity: number;
  minStock: number;
}) {
  const existing = await prisma.inventoryItem.findFirst({
    where: {
      centerId: params.centerId,
      name: params.name
    }
  });

  if (existing) {
    return prisma.inventoryItem.update({
      where: { id: existing.id },
      data: {
        category: params.category,
        quantity: params.quantity,
        minStock: params.minStock,
        updatedAt: new Date()
      }
    });
  }

  return prisma.inventoryItem.create({
    data: {
      centerId: params.centerId,
      name: params.name,
      category: params.category,
      quantity: params.quantity,
      minStock: params.minStock,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  });
}

async function seedDonations(centers: { addis: CenterRef; bishoftu: CenterRef }) {
  const donations = [
    {
      tx_ref: "ERP-SEED-ADDIS-001",
      donorName: "Abebe Kebede",
      donorEmail: "abebe.kebede@example.com",
      donorPhone: "911223344",
      amount: 25000,
      centerId: centers.addis.id
    },
    {
      tx_ref: "ERP-SEED-ADDIS-002",
      donorName: "Martha Alemu",
      donorEmail: "martha.alemu@example.com",
      donorPhone: "922334455",
      amount: 18000,
      centerId: centers.addis.id
    },
    {
      tx_ref: "ERP-SEED-BISHOFTU-001",
      donorName: "Daniel Wondimu",
      donorEmail: "daniel.wondimu@example.com",
      donorPhone: "933445566",
      amount: 22000,
      centerId: centers.bishoftu.id
    },
    {
      tx_ref: "ERP-SEED-BISHOFTU-002",
      donorName: "Hana Mekonnen",
      donorEmail: "hana.mekonnen@example.com",
      donorPhone: "944556677",
      amount: 15000,
      centerId: centers.bishoftu.id
    }
  ];

  for (const donation of donations) {
    await prisma.donation.upsert({
      where: { tx_ref: donation.tx_ref },
      update: {
        donorName: donation.donorName,
        donorEmail: donation.donorEmail,
        donorPhone: donation.donorPhone,
        amount: new Decimal(donation.amount).toFixed(2),
        paymentStatus: "COMPLETED",
        paidAt: new Date(),
        centerId: donation.centerId,
        updatedAt: new Date()
      },
      create: {
        tx_ref: donation.tx_ref,
        donorName: donation.donorName,
        donorEmail: donation.donorEmail,
        donorPhone: donation.donorPhone,
        amount: new Decimal(donation.amount).toFixed(2),
        paymentStatus: "COMPLETED",
        paymentProvider: "chapa",
        currency: "ETB",
        paidAt: new Date(),
        centerId: donation.centerId,
        metadata: { source: "erp-seed" },
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });
  }
}

async function upsertExpense(params: {
  centerId: string;
  category: "FOOD_PROGRAM" | "MAINTENANCE";
  description: string;
  amount: number;
}) {
  const existing = await prisma.schoolExpense.findFirst({
    where: {
      centerId: params.centerId,
      category: params.category,
      description: params.description
    }
  });

  if (existing) {
    return prisma.schoolExpense.update({
      where: { id: existing.id },
      data: {
        amount: new Decimal(params.amount).toFixed(2),
        updatedAt: new Date()
      }
    });
  }

  return prisma.schoolExpense.create({
    data: {
      centerId: params.centerId,
      category: params.category,
      description: params.description,
      amount: new Decimal(params.amount).toFixed(2),
      createdAt: new Date(),
      updatedAt: new Date()
    }
  });
}

async function main() {
  console.log("Seed start: DATABASE_URL loaded =", Boolean(process.env.DATABASE_URL));

  const adminEmail = process.env.INITIAL_ADMIN_EMAIL?.trim().toLowerCase();
  const adminPassword = process.env.INITIAL_ADMIN_PASSWORD?.trim();

  if (!adminEmail || !adminPassword) {
    throw new Error("INITIAL_ADMIN_EMAIL and INITIAL_ADMIN_PASSWORD are required for seeding.");
  }

  const addis = await upsertCenter("Addis Pilot", "Addis Ababa");
  const bishoftu = await upsertCenter("Bishoftu Center", "Bishoftu");

  const superadminStaff = await upsertStaff({
    centerId: addis.id,
    name: "Platform Superadmin",
    role: "ADMIN",
    baseSalary: 20000
  });

  const passwordHash = await bcrypt.hash(adminPassword, 12);
  await prisma.staffAccount.upsert({
    where: { email: adminEmail },
    update: {
      password: passwordHash,
      role: "SUPERADMIN",
      staffId: superadminStaff.id,
      updatedAt: new Date()
    },
    create: {
      email: adminEmail,
      password: passwordHash,
      role: "SUPERADMIN",
      staffId: superadminStaff.id,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  });

  const seededStaff = await Promise.all([
    upsertStaff({ centerId: addis.id, name: "Addis Director", role: "ADMIN", baseSalary: 32000 }),
    upsertStaff({ centerId: addis.id, name: "Addis Finance Lead", role: "SUPPORT", baseSalary: 26000 }),
    upsertStaff({ centerId: addis.id, name: "Addis Teacher 1", role: "TEACHER", baseSalary: 14500 }),
    upsertStaff({ centerId: addis.id, name: "Addis Teacher 2", role: "TEACHER", baseSalary: 15000 }),
    upsertStaff({ centerId: bishoftu.id, name: "Bishoftu Teacher 1", role: "TEACHER", baseSalary: 14000 }),
    upsertStaff({ centerId: bishoftu.id, name: "Bishoftu Teacher 2", role: "TEACHER", baseSalary: 14200 })
  ]);

  await ensurePayrollForCurrentMonth([superadminStaff.id, ...seededStaff.map((s) => s.id)]);

  const guardians = await Promise.all([
    upsertGuardian({ name: "Mulu Abera", relationship: "MOTHER", phone: "+251911223344", email: "mulu.abera@example.com", address: "Addis Ababa" }),
    upsertGuardian({ name: "Tadesse Bekele", relationship: "FATHER", phone: "0912345678", email: "tadesse.bekele@example.com", address: "Bole" }),
    upsertGuardian({ name: "Saba Fikru", relationship: "LEGAL_GUARDIAN", phone: "+251799887766", email: "saba.fikru@example.com", address: "CMC" }),
    upsertGuardian({ name: "Haile Mesfin", relationship: "FATHER", phone: "0977112233", email: "haile.mesfin@example.com", address: "Bishoftu" }),
    upsertGuardian({ name: "Aster Kebede", relationship: "MOTHER", phone: "+251722334455", email: "aster.kebede@example.com", address: "Bishoftu" })
  ]);

  const guardianByName = new Map(guardians.map((guardian) => [guardian.name, guardian]));
  const now = new Date();

  const students = await Promise.all([
    upsertStudent({ centerId: addis.id, guardianId: guardianByName.get("Mulu Abera")!.id, name: "Liya Abera", gradeLevel: "Grade 1", gender: "FEMALE", dateOfBirth: new Date(now.getFullYear() - 8, 2, 12), enrollmentDate: new Date() }),
    upsertStudent({ centerId: addis.id, guardianId: guardianByName.get("Mulu Abera")!.id, name: "Noah Abera", gradeLevel: "Grade 3", gender: "MALE", dateOfBirth: new Date(now.getFullYear() - 10, 4, 9), enrollmentDate: new Date() }),
    upsertStudent({ centerId: addis.id, guardianId: guardianByName.get("Tadesse Bekele")!.id, name: "Ruth Bekele", gradeLevel: "Grade 2", gender: "FEMALE", dateOfBirth: new Date(now.getFullYear() - 9, 1, 21), enrollmentDate: new Date() }),
    upsertStudent({ centerId: addis.id, guardianId: guardianByName.get("Tadesse Bekele")!.id, name: "Abel Bekele", gradeLevel: "Grade 5", gender: "MALE", dateOfBirth: new Date(now.getFullYear() - 12, 6, 3), enrollmentDate: new Date() }),
    upsertStudent({ centerId: addis.id, guardianId: guardianByName.get("Saba Fikru")!.id, name: "Meron Fikru", gradeLevel: "Grade 4", gender: "FEMALE", dateOfBirth: new Date(now.getFullYear() - 11, 8, 15), enrollmentDate: new Date() }),
    upsertStudent({ centerId: bishoftu.id, guardianId: guardianByName.get("Haile Mesfin")!.id, name: "Yonas Mesfin", gradeLevel: "Grade 1", gender: "MALE", dateOfBirth: new Date(now.getFullYear() - 8, 10, 11), enrollmentDate: new Date() }),
    upsertStudent({ centerId: bishoftu.id, guardianId: guardianByName.get("Haile Mesfin")!.id, name: "Bethlehem Mesfin", gradeLevel: "Grade 3", gender: "FEMALE", dateOfBirth: new Date(now.getFullYear() - 10, 0, 29), enrollmentDate: new Date() }),
    upsertStudent({ centerId: bishoftu.id, guardianId: guardianByName.get("Aster Kebede")!.id, name: "Dawit Kebede", gradeLevel: "Grade 6", gender: "MALE", dateOfBirth: new Date(now.getFullYear() - 13, 2, 7), enrollmentDate: new Date() }),
    upsertStudent({ centerId: bishoftu.id, guardianId: guardianByName.get("Aster Kebede")!.id, name: "Mimi Kebede", gradeLevel: "Grade 2", gender: "FEMALE", dateOfBirth: new Date(now.getFullYear() - 9, 4, 20), enrollmentDate: new Date() }),
    upsertStudent({ centerId: bishoftu.id, guardianId: guardianByName.get("Saba Fikru")!.id, name: "Kaleb Fikru", gradeLevel: "Grade 7", gender: "MALE", dateOfBirth: new Date(now.getFullYear() - 14, 9, 4), enrollmentDate: new Date() })
  ]);

  for (const student of students.slice(0, 6)) {
    const existingInteraction = await prisma.studentInteraction.findFirst({
      where: {
        studentId: student.id,
        title: "Initial Registration"
      }
    });

    if (!existingInteraction) {
      await prisma.studentInteraction.create({
        data: {
          studentId: student.id,
          centerId: student.centerId,
          interactionType: "GENERAL_NOTE",
          title: "Initial Registration",
          notes: "Student profile created during ERP bootstrap seed.",
          performedBy: superadminStaff.id,
          interactionDate: new Date(),
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });
    }
  }

  for (const center of [addis, bishoftu]) {
    await upsertInventoryItem({ centerId: center.id, name: "Textbooks", category: "TEXTBOOK", quantity: 320, minStock: 80 });
    await upsertInventoryItem({ centerId: center.id, name: "Uniforms", category: "UNIFORM", quantity: 18, minStock: 25 });
    await upsertInventoryItem({ centerId: center.id, name: "Laptops", category: "ASSET", quantity: 14, minStock: 4 });
  }

  await seedDonations({ addis, bishoftu });

  await upsertExpense({
    centerId: addis.id,
    category: "FOOD_PROGRAM",
    description: "Monthly student meal supplies",
    amount: 38000
  });
  await upsertExpense({
    centerId: addis.id,
    category: "MAINTENANCE",
    description: "Classroom lighting and desk repair",
    amount: 12500
  });
  await upsertExpense({
    centerId: bishoftu.id,
    category: "FOOD_PROGRAM",
    description: "Weekly nutrition support",
    amount: 27000
  });
  await upsertExpense({
    centerId: bishoftu.id,
    category: "MAINTENANCE",
    description: "Water line and sanitation fixes",
    amount: 9800
  });

  console.log("Seed complete: centers, staff/accounts, payroll, guardians/students/interactions, inventory, donations, and expenses initialized.");
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
