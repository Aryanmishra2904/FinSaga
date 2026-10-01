
import { routingKeyFor } from "./eventstype.js";

export async function enqueueEvent(tx, eventType, payload){
    routingKeyFor(eventType);
    return tx.outbox.create({
        data: {
            eventType,
            payload
        }
    })
}