import express from "express";

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

app.listen(port, () => {
  console.log(`Listening at http://localhost:${port}`);
});
