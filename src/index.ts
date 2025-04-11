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
    console.log("Connected to Redis successfully");
    
    
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
        const redis = await RedisClient.getInstance(REDIS_URL);
        const handler = new WhatsAppHandler(redis);
        await handler.handleIncomingMessage(message, sender);      
       
        
        // Log information about the new message
        console.log(`Processing new message from ${userProfile} (${sender})`);
        console.log(`Message ID: ${message.id}, Timestamp: ${message.timestamp}`);

               
        // Log information about the new message
        console.log(`Processing new message from ${userProfile} (${sender})`);
        console.log(`Message ID: ${message.id}, Timestamp: ${message.timestamp}`);


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
    console.log("Redis connection closed");
    process.exit(0);
  } catch (err) {
    console.error('Error during shutdown:', err);
    process.exit(1);
  }
});

// Start the server
startServer();
