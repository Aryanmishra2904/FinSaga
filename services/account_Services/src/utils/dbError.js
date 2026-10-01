// Decides whether a failed transaction is worth retrying (serialization
// failure or deadlock). Prisma's classic engine reported these as P2034, but
// with driver adapters the same Postgres error can arrive in several shapes,
// depending on whether it came from a model query, a $queryRaw call, or COMMIT.
// So this checks every shape rather than only `err.code === 'P2034'`.

const RETRYABLE_SQLSTATES = new Set([
  '40001', // serialization_failure
  '40P01', // deadlock_detected
]);

export function isRetryableTxError(err) {
  if (!err) return false;

  if (err.code === 'P2034') return true; // classic Prisma mapping

  const msg = String(err.message || '');
  if (msg.includes('TransactionWriteConflict')) return true; // adapter-mapped 40001
  if (/could not serialize access|deadlock detected/i.test(msg)) return true;

  // SQLSTATE hiding in nested error info (raw queries surface as P2010, and a
  // failure at COMMIT can arrive as an unwrapped adapter error).
  const sqlstates = [
    err.code, // raw pg error
    err.cause?.originalCode,
    err.meta?.code,
    err.meta?.driverAdapterError?.cause?.originalCode,
  ];
  return sqlstates.some((s) => RETRYABLE_SQLSTATES.has(s));
}