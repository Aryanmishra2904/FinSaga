import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// The adapter is what actually connects to Postgres. Importing PrismaPg and not
// passing it to PrismaClient (as in the original file) means no adapter is used.
// These options go to the underlying `pg` pool. `pg` has no connection timeout
// by default, so without one a dead database makes requests hang forever.
const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
  max: parseInt(process.env.PG_POOL_MAX || "10", 10),
  connectionTimeoutMillis: 5000,
});

const prisma = new PrismaClient({
  adapter,
  log: process.env.NODE_ENV === "development" ? ["query", "warn", "error"] : ["error"],
});

const connectDB = async () => {
  try {
    await prisma.$connect();
    // $connect() alone may not open a real connection, since the pool can
    // connect lazily. A trivial query proves the database is reachable.
    await prisma.$queryRaw`SELECT 1`;
    console.log("DB connected via prisma");
  } catch (error) {
    console.error("DB connection error:", error.message);
    process.exit(1); // fail fast at startup; Docker's restart policy retries
  }
};

const disconnectDB = async () => {
  await prisma.$disconnect();
};

export { prisma, connectDB, disconnectDB };