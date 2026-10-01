import amqp from "amqplib";
import "dotenv/config";

export const EXCHANGE_NAME = "banking.events";
export const EXCHANGE_TYPE = "topic";

let connection = null;
let channel = null;
let connectionPromise = null;

function getRabbitMQUrl() {
  const url = process.env.RABBITMQ_URL;

  if (!url) {
    throw new Error(
      "RABBITMQ_URL environment variable is not configured"
    );
  }

  return url;
}

async function createConnection() {
  try {
    const url = getRabbitMQUrl();

    const conn = await amqp.connect(url);

    conn.on("error", (error) => {
      console.error(
        "[RabbitMQ] Connection error:",
        error.message
      );
    });

    conn.on("close", () => {
      console.warn("[RabbitMQ] Connection closed");

      connection = null;
      channel = null;
    });

    console.log("[RabbitMQ] Connected");

    return conn;

  } catch (error) {
    console.error(
      "[RabbitMQ] Failed to create connection:",
      error.message
    );

    throw error;
  }
}

async function createChannel(conn) {
  try {
    const ch = await conn.createConfirmChannel();

    ch.on("error", (error) => {
      console.error(
        "[RabbitMQ] Channel error:",
        error.message
      );
    });

    ch.on("close", () => {
      console.warn("[RabbitMQ] Channel closed");

      channel = null;
    });

    await ch.assertExchange(
      EXCHANGE_NAME,
      EXCHANGE_TYPE,
      {
        durable: true
      }
    );

    console.log(
      `[RabbitMQ] Exchange "${EXCHANGE_NAME}" ready`
    );

    return ch;

  } catch (error) {
    console.error(
      "[RabbitMQ] Failed to create channel:",
      error.message
    );

    throw error;
  }
}

export async function getPublisherChannel() {
  try {
    if (channel) {
      return channel;
    }

    if (!connectionPromise) {
      connectionPromise = (async () => {
        connection = await createConnection();

        channel = await createChannel(connection);

        return channel;
      })().finally(() => {
        connectionPromise = null;
      });
    }

    return await connectionPromise;

  } catch (error) {
    console.error(
      "[RabbitMQ] Failed to get publisher channel:",
      error.message
    );

    throw error;
  }
}

export async function closeRabbitMQ() {
  try {
    const currentChannel = channel;
    const currentConnection = connection;

    channel = null;
    connection = null;

    if (currentChannel) {
      try {
        await currentChannel.close();

        console.log("[RabbitMQ] Channel closed");

      } catch (error) {
        console.warn(
          "[RabbitMQ] Failed to close channel:",
          error.message
        );
      }
    }

    if (currentConnection) {
      try {
        await currentConnection.close();

        console.log("[RabbitMQ] Connection closed");

      } catch (error) {
        console.warn(
          "[RabbitMQ] Failed to close connection:",
          error.message
        );
      }
    }

  } catch (error) {
    console.error(
      "[RabbitMQ] Error while closing RabbitMQ:",
      error.message
    );

    throw error;
  }
}