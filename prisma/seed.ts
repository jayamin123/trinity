import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL || "admin@trustapollo.com";
  const password = process.env.ADMIN_PASSWORD || "asdf1234";

  const existing = await prisma.adminUser.findUnique({ where: { email } });
  if (existing) {
    console.log(`Admin ${email} already exists, skipping.`);
    return;
  }

  await prisma.adminUser.create({
    data: { email, passwordHash: await bcrypt.hash(password, 12) },
  });
  console.log(`Created admin user: ${email} (password: ${password})`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
