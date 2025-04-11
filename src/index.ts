import express from "express";
import { WhatsAppHandler } from "./handlers/whatsappHandler";
import { RedisClient } from "./services/redisClient";

const app = express();
const port = process.env.PORT || 3333;

app.use(express.json());


const VERIFY_TOKEN = process.env.VERIFY_TOKEN || "ceSecret";
const REDIS_URL = process.env.REDIS_URL;

// Connect to Redis and start the server
async function startServer() {
  try {
    // Connect to Redis
    const redis = await RedisClient.getInstance(REDIS_URL);
    const whatsappHandler = new WhatsAppHandler(redis, VERIFY_TOKEN);
    // Webhook verification endpoint
    app.get("/*", whatsappHandler.verify);
    // Webhook events processing endpoint
    app.post("/", whatsappHandler.process);

    // Start the server
    app.listen(port, () => {
      console.log(`Listening at http://localhost:${port}`);
    });
    
  } catch (error) {
    console.error("Failed to connect to Redis:", error);
    process.exit(1);
  }
}


// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down server...');
  try {
    // Close Redis connection through your RedisClient's close method
    await RedisClient.close();
    console.log('Redis connection closed');
    process.exit(0);
  } catch (err) {
    console.error('Error during shutdown:', err);
    process.exit(1);
  }
});

// Start the server
startServer();
