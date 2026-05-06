import ProfileClientPage from "./ProfileClientPage";
import { verifySession } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";

export default async function ProfilePage() {
  const user = await verifySession();

  const userRecord = await prisma.user.findUnique({
    where: { id: user.userId }
  });

  if (!userRecord) {
    throw new Error("User not found.");
  }

  return (
    <ProfileClientPage
      email={userRecord.email}
      role={userRecord.role}
    />
  );
}
