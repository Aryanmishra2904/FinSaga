import { prisma } from "../db/db.js";
import { getPublisherChannel,EXCHANGE_NAME } from "../db/Rabbitmq.js";
import { routingKeyFor } from "./events/eventstype.js";

const BATCH_SIZE = 50;
const POLL_INTERVAL_MS = 1000;
const PURGE_EVERY_MS = 10*60*1000;
const PURGE_AFTER_HOURS = 24;


let stopped = true;
let loopPromise = null;
let lastPurge = 0;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));


async function relayBatch(){
    const channel = await getPublisherChannel();

    return await prisma.$transaction(
        async(tx)=>{
            const rows = await tx.$queryRaw`
            SELECT id,event_type,payload,created_at
            FROM outbox
            WHERE published_at IS NULL
            ORDER BY created_at ASC
            LIMIT ${BATCH_SIZE}::int
            FOR UPDATE SKIP LOCKED`;

            if(row.length === 0) return 0;

            for(const row of rows){
                const envelope = {
                    eventid : row.id,
                    eventType : row.event_type,
                    payload:row.payload,
                    createdAt:row.created_at,

                }
                channel.publish(
                    EXCHANGE_NAME,
                    routingKeyFor(row.event_type),
                    Buffer.from(JSON.stringify(envelope)),
                    {
                    persistent:true,
                    contentType:"application/json",
                    messageId:row.id,
                    type:row.event_type,
                    timestamp:Math.floor(row.created_at.getTime()/1000)
                    }
                )
            }

            await channel.waitForConfirms();

            await tx.outbox.updateMany({
                where : {id:{in:rows.map((r)=>r.id)}},
                data : {publishedAt:new Date()}
            })
            return rows.length;
        },
        { timeout: 15000 }
    )
}



async function purgeOldPublished() {
  const cutoff = new Date(Date.now() - PURGE_AFTER_HOURS * 3600 * 1000);
  const { count } = await prisma.outbox.deleteMany({
    where: { publishedAt: { not: null, lt: cutoff } },
  });
  if (count > 0) console.log(`[outbox] purged ${count} old published rows`);
}
 
export function startOutboxRelay() {
  if (!stopped) return;
  stopped = false;
 
  loopPromise = (async () => {
    while (!stopped) {
      try {
        const relayed = await relayBatch();
        if (relayed === BATCH_SIZE) continue; // backlog: drain without sleeping
 
        if (Date.now() - lastPurge > PURGE_EVERY_MS) {
          lastPurge = Date.now();
          await purgeOldPublished();
        }
      } catch (err) {
        // Broker down, DB hiccup, nack... none of these lose data: the rows are
        // still unpublished in the table. Log and retry on the next tick.
        console.error('[outbox] relay tick failed:', err.message);
      }
      await sleep(POLL_INTERVAL_MS);
    }
  })();
}
 
export async function stopOutboxRelay() {
  stopped = true;
  if (loopPromise) await loopPromise; // let any in-flight batch finish cleanly
  loopPromise = null;
}
