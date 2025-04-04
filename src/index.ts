import express from "express";
import { handleIncomingMessage } from "./controllers/whatsapp";

const app = express();
const port = process.env.PORT || 3333;

app.use(express.json());


const processedMessages = new Map(); // Store processed message IDs with timestamps

// Constants
const WHATSAPP_API_VERSION = "v22.0";
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID || "574770619057271";
const WHATSAPP_API_URL = `https://graph.facebook.com/${WHATSAPP_API_VERSION}/${PHONE_NUMBER_ID}/messages`;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN || "ceSecret";
const DEFAULT_RECIPIENT = process.env.DEFAULT_RECIPIENT || "22656284997";

const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN ||


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
          return;
      }
      
      // Check if this message has been processed already
      if (processedMessages.has(message.id)) {
          console.log(`Skipping already processed message: ${message.id}`);
          return;
      }
      
      // Log information about the new message
      console.log(`Processing new message from ${userProfile} (${sender})`);
      console.log(`Message ID: ${message.id}, Timestamp: ${message.timestamp}`);

      // Store this message ID with timestamp to prevent reprocessing
      processedMessages.set(message.id, {
          timestamp: parseInt(message.timestamp) || Date.now(),
          processedAt: Date.now()
      });

      // Cleanup old processed messages (keep last 1000 or messages from last 24 hours)
      const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
      const entriesToDelete = [];

      for (const [msgId, data] of processedMessages.entries()) {
          if (data.processedAt < oneDayAgo) {
              entriesToDelete.push(msgId);
          }
      }

      // Delete old entries
      for (const msgId of entriesToDelete) {
          processedMessages.delete(msgId);
      }

      // If still too many entries, keep only the most recent ones
      if (processedMessages.size > 1000) {
          const oldestEntries = [...processedMessages.entries()]
              .sort((a, b) => a[1].processedAt - b[1].processedAt)
              .slice(0, processedMessages.size - 1000);
              
          for (const [oldMsgId] of oldestEntries) {
              processedMessages.delete(oldMsgId);
          }
      }        
      // Handle different message types
      await handleIncomingMessage(message, sender);

      res.status(200).send('OK');
  } catch (error) {
      console.error('Error processing webhook:', error);
      res.status(200).send('OK'); // Always return 200 to acknowledge receipt
  }
});


app.listen(port, () => {
  console.log(`Listening at http://localhost:${port}`);
});
