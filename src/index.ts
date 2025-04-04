import express from "express";
import { handleIncomingMessage } from "./controllers/whatsapp";
import { initializeStateManager } from "./services/stateManager";
import Redis from "ioredis";

const app = express();
const port = process.env.PORT || 3333;

app.use(express.json());

// Redis client initialization
// Redis client with proper error handling
let redisClient: Redis;
try {
  // Use the provided Redis URL if available, otherwise use default
  const redisUrl = process.env.REDIS_URL || "redis://127.0.0.1:6379";
  redisClient = new Redis(redisUrl, {
    maxRetriesPerRequest: 3,
    retryStrategy(times) {
      // Retry connection with exponential backoff
      const delay = Math.min(times * 50, 2000);
      return delay;
    }
  });

  // Add event listeners for Redis connection
  redisClient.on("error", (err) => {
    console.error("Redis connection error:", err);
  });

  redisClient.on("connect", () => {
    console.log("Successfully connected to Redis");
  });

} catch (error) {
  console.error("Error initializing Redis client:", error);
  process.exit(1);
}


// Constants
const WHATSAPP_API_VERSION = "v22.0";
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID || "574770619057271";
const WHATSAPP_API_URL = `https://graph.facebook.com/${WHATSAPP_API_VERSION}/${PHONE_NUMBER_ID}/messages`;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN || "ceSecret";
const DEFAULT_RECIPIENT = process.env.DEFAULT_RECIPIENT || "22656284997";

const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN || "";

// Store processed message IDs with timestamps (kept in memory for duplicate detection)
const processedMessages = new Map(); 

// Connect to Redis and start the server
async function startServer() {
  try {
    // Connect to Redis
    console.log("Connected to Redis successfully");
    
    // Initialize the state manager with Redis client
    initializeStateManager(redisClient);
    
    // Webhook verification endpoint
    app.get("/*", (req, res) => {
      // Parse the query params
      const mode = req.query["hub.mode"];
      const token = req.query["hub.verify_token"];
      const challenge = req.query["hub.challenge"];

      console.log("-------------- New Request GET --------------");
      console.log("Headers:", JSON.stringify(req.headers, null, 3));
      console.log("Body:", JSON.stringify(req.body, null, 3));

      // Check if a token and mode is in the query string of the request
      if (mode && token) {
        // Check the mode and token sent is correct
        if (mode === "subscribe" && token === VERIFY_TOKEN) {
          // Respond with the challenge token from the request
          console.log("WEBHOOK_VERIFIED");
          res.status(200).send(challenge);
        } else {
          console.log("Responding with 403 Forbidden");
          // Respond with '403 Forbidden' if verify tokens do not match
          res.sendStatus(403);
        }
      } else {
        console.log("Replying Thank you.");
        res.json({ message: "Thank you for the message" });
      }
    });

    // Webhook for handling incoming messages
    app.post("/", async (req, res) => {
      try {
        console.log("-------------- New Webhook POST --------------");
        console.log("Headers:", JSON.stringify(req.headers, null, 3));
        console.log("Body:", JSON.stringify(req.body, null, 3));
        
        // Check if there are entries in the webhook payload
        if (!req.body?.entry || req.body.entry.length === 0) {
            return res.status(200).send('OK');
        }

        const firstEntry = req.body.entry[0];
        if (!firstEntry?.changes || firstEntry.changes.length === 0) {
            return res.status(200).send('OK');
        }

        const change = firstEntry.changes[0];
        const value = change?.value;
        
        // Check if this is a WhatsApp message
        if (value?.messaging_product !== "whatsapp") {
            return res.status(200).send('OK');
        }

        // Extract message data
        const metadata = value?.metadata || {};
        const contacts = value?.contacts || [];
        const messages = value?.messages || [];
        
        if (messages.length === 0 || contacts.length === 0) {
            return res.status(200).send('OK');
        }

        const message = messages[0];
        const sender = contacts[0]?.wa_id;
        const userProfile = contacts[0]?.profile?.name;
        
        console.log(`Received message from ${userProfile} (${sender})`);
          
        // Skip if no message ID (should not happen with WhatsApp API)
        if (!message.id) {
            console.log("Received message without ID, skipping");
            return res.status(200).send('OK');
        }
        
        // Check if this message has been processed already (using Redis)
        const messageKey = `processed:${message.id}`;
        const isProcessed = await redisClient.get(messageKey);
        
        if (isProcessed) {
            console.log(`Skipping already processed message: ${message.id}`);
            return res.status(200).send('OK');
        }
       
        
        // Log information about the new message
        console.log(`Processing new message from ${userProfile} (${sender})`);
        console.log(`Message ID: ${message.id}, Timestamp: ${message.timestamp}`);

               
        // Log information about the new message
        console.log(`Processing new message from ${userProfile} (${sender})`);
        console.log(`Message ID: ${message.id}, Timestamp: ${message.timestamp}`);

        // Store this message ID in Redis to prevent reprocessing
        // Set expiration to 24 hours (86400 seconds)
        await redisClient.set(
          messageKey, 
          JSON.stringify({
            timestamp: parseInt(message.timestamp) || Date.now(),
            processedAt: Date.now(),
            sender
          }),
           "EX",86400
        );
        // Handle different message types
        await handleIncomingMessage(message, sender);

        res.status(200).send('OK');
      } catch (error) {
        console.error('Error processing webhook:', error);
        res.status(200).send('OK'); // Always return 200 to acknowledge receipt
      }
    });

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
    await redisClient.quit();
    console.log('Redis connection closed');
    process.exit(0);
  } catch (err) {
    console.error('Error during shutdown:', err);
    process.exit(1);
  }
});

// Start the server
startServer();
