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

const app = express();
const port = process.env.PORT || 3000;

// Create a raw body parser
app.use((req, res, next) => {
  let data = Buffer.from('');
  
  req.on('data', (chunk) => {
    data = Buffer.concat([data, chunk]);
  });
  
  req.on('end', () => {
    (req as any).rawBody = data;
    next();
  });
});

// Add JSON body parser after raw body capture
app.use(express.json());

app.use((req, res, next) => {
  console.log('Request Headers:', req.headers);
  console.log('Request Body:', req.body);
  next();
});

// Create Redis client
const redisClient = new Redis(process.env.REDIS_URL || '');

// Create WhatsApp sender
const sender = createMessageSender(
  process.env.NUMBER_ID || '',
  process.env.ACCESS_TOKEN || ''
);

// Create services
const userStateService = new UserStateService(redisClient);
const cartService = new CartService(sender, redisClient);
const menuService = new MenuService(sender, cartService);
const checkoutService = new CheckoutService(
  userStateService,
  cartService,
  sender,
  redisClient
);

// Handle incoming WhatsApp messages
async function onNewMessage(message: Message) {
  try {
    const sender = message.from;
    const userState = await userStateService.getUserState(sender);
    
    // Process based on message type
    if (message.type === 'interactive' && message.data.interactive?.list_reply) {
      const selectedId = message.data.interactive.list_reply.id;
      
      if (selectedId.startsWith("payment")) {
        await checkoutService.processPaymentMethod(sender, selectedId);
      } else {
        await cartService.addItemToCart(sender, selectedId);
        await cartService.sendCartSummary(sender);
      }
    } else if (message.type === 'interactive' && message.data.interactive?.button_reply) {
      const buttonId = message.data.interactive.button_reply.id;
      
      // Handle button press based on ID
      if (buttonId === "main-menu") {
        await menuService.sendMainMenu(sender);
      } else if (buttonId === "view-cart") {
        await cartService.sendCartSummary(sender);
      } else if (buttonId === "checkout") {
        await checkoutService.initiateCheckout(sender);
      }
      // ... other button handling logic
    } else if (message.type === 'text') {
      const text = message.data.text.body.toLowerCase();
      
      // Handle text commands
      if (text === "menu") {
        await menuService.sendMainMenu(sender);
      } else if (text === "cart") {
        await cartService.sendCartSummary(sender);
      }
      // ... other text handling logic
    } else if (message.type === 'location') {
      await checkoutService.processDeliveryLocation(sender, message.data.location);
    }
    // ... handle other message types
  } catch (error) {
    console.error('Error handling message:', error);
    // Send error message tfo user
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
    appSecret: process.env.FACEBOOK_APP_SECRET!, // Optional but recommended
    onStatusChange, // Optional
    logAllEntrantRequests: process.env.NODE_ENV !== 'production', // Optional, log in development
  })
);

// Start server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
