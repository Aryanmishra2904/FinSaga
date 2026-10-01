export const EVENT_TYPES = Object.freeze({
  ACCOUNT_CREDITED: "AccountCredited",
  ACCOUNT_DEBITED: "AccountDebited",
})

const ROUTING_KEYS = {
    [EVENT_TYPES.ACCOUNT_CREDITED]: "account.credited",
    [EVENT_TYPES.ACCOUNT_DEBITED]: "account.debited",
}

export function routingKeysFor(eventType){
    const key = ROUTING_KEYS[eventType]
    if(!key) throw new Error(`No routing key defined for event type ${eventType}`)
    return key
}