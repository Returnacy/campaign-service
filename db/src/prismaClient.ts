import { PrismaClient } from "@prisma/client";

const prismaLogs: Array<'query' | 'info' | 'warn' | 'error'> = ['warn', 'error'];
if (process.env.PRISMA_LOG_INFO === 'true') prismaLogs.push('info');
if (process.env.PRISMA_LOG_QUERY === 'true') prismaLogs.push('query');

export const prisma = new PrismaClient({
  log: prismaLogs,
});

const gracefulShutdown = async () => {
  try {
    await prisma.$disconnect();
  } catch (e) {
    // log if you want
  } finally {
    process.exit(0);
  }
};

process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);