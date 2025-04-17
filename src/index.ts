import express from "express";
import { RedisClient } from "./services/redisClient";

// Initialize services
const redis = new RedisClient();
import Redis from 'ioredis';
import { UserStateService } from './services/userStateService';
import { CartService } from './services/cartService';
import { MenuService } from './services/menuService';
import { CheckoutService } from './services/checkoutService';
import { Message, Status } from "./types/bot";
import { createMessageSender } from "./types/createbot";
import { getWebhookRouter } from "./types/webhook";
import { IncomingMessage } from 'http';
import { ServerResponse } from 'http';
import { sampleItems } from "./types/misc";

const app = express();
const port = process.env.PORT || 3000;
const FACEBOOK_APP_SECRET= null;
// Create a raw body buffer for verification
// This MUST come before any json() middleware
app.use(express.json({
  verify: (req: IncomingMessage, res: ServerResponse, buf: Buffer, encoding: string) => {
    (req as any).rawBody = buf;
  }
}));

app.use((req, res, next) => {
  console.log('Request Headers:', req.headers);
  console.log('Request Body:', req.body);
  next();
});

// Create Redis client
const redisClient = new Redis(process.env.REDIS_URL || '');

// Create WhatsApp sender
const sender = createMessageSender(
  process.env.PHONE_NUMBER_ID || '',
  process.env.WHATSAPP_AUTH_TOKEN || ''
);

// Create services
const userStateService = new UserStateService(redisClient);
const cartService = new CartService(sender, redisClient);
const menuService = new MenuService(sender, cartService, sampleItems);
const checkoutService = new CheckoutService(
  userStateService,
  cartService,
  sender,
  redisClient
);

// Handle incoming WhatsApp messages
async function onNewMessage(message: Message) {
  try {
    const recipient = message.from;
    const userState = await userStateService.getUserState(recipient);
    console.warn("reply payload", message.data);
    console.warn("reply message payload", message);

    // Process based on message type
    if (message.type === 'list_reply') {

      const selectedId = message.data.id;
      
      if (selectedId.startsWith("pay")) {
        await checkoutService.processPaymentMethod(recipient, selectedId);
      } else {
        await cartService.addItemToCart(recipient, selectedId);
        await cartService.sendCartSummary(recipient);
      }
    } else if (message.type === 'button_reply') {
      const buttonId = message.data.id;
      
      // Handle button press based on ID
      if (buttonId === "main-menu") {
        await menuService.sendMainMenu(recipient);
      } else if (buttonId === "view-cart") {
        await cartService.sendCartSummary(recipient);
      } else if (buttonId === "checkout") {
        await checkoutService.initiateCheckout(recipient);
      } else if (buttonId === "help") {
        await menuService.requestSupport(recipient);
      } else if (buttonId.startsWith("pay")) {
        await checkoutService.sendPaymentOptions(recipient);
      }  else if (buttonId === "confirm-order") {
        await checkoutService.confirmFinalOrder(recipient);
      } 
      else if (buttonId.startsWith("deliver")) {
        await checkoutService.sendDeliveryOptions(recipient);
      } else if (buttonId.startsWith("return")) {
        await menuService.requestSupport(recipient);
      }
    } else if (message.type === 'button') {
        const text = message.data.text.toLowerCase();
        if (text === "menu") {
          await menuService.sendMainMenu(recipient);
        } else if (text === "view-cart") {
          await cartService.sendCartSummary(recipient);
        } else if (text === "checkout") {
          await checkoutService.initiateCheckout(recipient);
        } else if (text === "help") {
          await menuService.requestSupport(recipient);
        } else if (text.startsWith("pay")) {
          await checkoutService.sendPaymentOptions(recipient);
        } else if (text.startsWith("deliver")) {
          await checkoutService.sendDeliveryOptions(recipient);
        } else if (text.startsWith("return")) {
          await menuService.requestSupport(recipient);
        }
    } else if (message.type === 'text') {
      console.warn("data", message.data);
      const text = message.data.text.toLowerCase();
      
      // Handle text commands
      if (text === "menu") {
        await menuService.sendMainMenu(recipient);
      } else if (text === "cart") {
        await cartService.sendCartSummary(recipient);
      } else if (text === "help") {
        await menuService.requestSupport(recipient);
      } else {
        await menuService.sendWelcomeWithButtons(recipient);
      }
      // ... other text handling logic
    } else if (message.type === 'location') {
      await checkoutService.processDeliveryLocation(recipient, message.data.location);
    }
  } catch (error) {
    console.error('Error handling message:', error);
    await sender.sendText(
      message.from,
      "Sorry, we experienced an issue processing your request. Please try again."
    );
  }
}

// Optional status change handler
async function onStatusChange(status: Status) {
  console.log('Message status changed:', status);
  // You could update order status or track message delivery here
}

// Mount the webhook router
app.use(
  '/',
  getWebhookRouter({
    webhookVerifyToken: process.env.WEBHOOK_VERIFY_TOKEN || 'ceSecret',
    onNewMessage,
    appSecret: FACEBOOK_APP_SECRET, // Optional but recommended
    onStatusChange, // Optional
    logAllEntrantRequests: process.env.NODE_ENV !== 'production', // Optional, log in development
  })
);

// Start server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
