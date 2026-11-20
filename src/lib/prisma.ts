import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Used only when DATABASE_URL is missing. Queries fail fast and are handled by
// the safe data helpers, so the storefront can still render its fallback pages.
const UNREACHABLE_DATABASE_URL =
  "postgresql://invalid:invalid@127.0.0.1:1/invalid?connect_timeout=1";

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL?.trim();

  if (!connectionString) {
    console.warn(
      "[store:prisma] DATABASE_URL is not set. Database features will be unavailable.",
    );
  }

  const adapter = new PrismaPg({
    connectionString: connectionString || UNREACHABLE_DATABASE_URL,
  });

  return new PrismaClient({
    adapter,
    // Prisma error text can contain request values; report sanitized metadata at boundaries.
    log: [],
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
