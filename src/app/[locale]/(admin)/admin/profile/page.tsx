import ProfileClientPage from "./ProfileClientPage";
import { verifySession } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";

export default async function ProfilePage() {
  const user = await verifySession();

  const account = await prisma.staffAccount.findUnique({
    where: { id: user.id },
    include: {
      staff: {
        select: {
          id: true,
          name: true,
          role: true,
          pensionNumber: true,
          center: {
            select: { name: true }
          }
        }
      }
    }
  });

  if (!account) {
    throw new Error("Profile account not found.");
  }

  return (
    <ProfileClientPage
      email={account.email}
      role={account.role}
      staff={{
        id: account.staff.id,
        name: account.staff.name,
        role: account.staff.role,
        pensionNumber: account.staff.pensionNumber,
        centerName: account.staff.center.name
      }}
    />
  );
}
