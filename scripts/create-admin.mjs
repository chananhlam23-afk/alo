import { PrismaClient } from "@prisma/client";
import pkg from "bcryptjs";
const { hash } = pkg;

const prisma = new PrismaClient();

async function main() {
  const email = "trantuananhk4x6@gmail.com";
  const passwordHash = await hash("123456", 12);

  const user = await prisma.user.upsert({
    where: { email },
    update: { passwordHash, role: "ADMIN", fullName: "Trần Tuấn Anh" },
    create: {
      email,
      passwordHash,
      role:     "ADMIN",
      fullName: "Trần Tuấn Anh",
    },
  });

  console.log("✓ Admin account ready:", user.email, "| role:", user.role, "| id:", user.id);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
