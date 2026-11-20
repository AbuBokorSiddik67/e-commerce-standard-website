import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export async function orderTransaction<T>(run: (tx: Prisma.TransactionClient) => Promise<T>, retryUnique?: (error: Prisma.PrismaClientKnownRequestError) => boolean): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await prisma.$transaction(run, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) {
      if (attempt >= 4 || !(error instanceof Prisma.PrismaClientKnownRequestError) ||
          (error.code !== "P2034" && !(error.code === "P2002" && retryUnique?.(error)))) throw error;
      await new Promise((resolve) => setTimeout(resolve, 15 * (attempt + 1) + Math.random() * 20));
    }
  }
}
