import Redis from "ioredis";
import { getMenuItem } from "../data/menuData";


// Define state types
export enum OrderStage {
  GREETING = 'greeting',
  MENU_SELECTION = 'menu_selection',
  CUSTOMIZING_ITEM = 'customizing_item',
  CONFIRMING_ITEM = 'confirming_item',
  ADDING_MORE = 'adding_more',
  CHECKOUT = 'checkout',
  DELIVERY_INFO = 'delivery_info',
  PAYMENT = 'payment',
  ORDER_CONFIRMATION = 'order_confirmation',
  COMPLETED = 'completed'
}

export type OrderItem = {
  // In this version, we store the menu item id (instead of a plain string)
  item: string;
  quantity: number;
  // For customizations we store an array of strings (or you can consider a richer type)
  customizations?: string[];
  price: number;
};

export type OrderState = {
  userId: string;  // WhatsApp ID
  sessionId: string;
  currentStage: OrderStage;
  items: OrderItem[];
  address?: string;
  paymentMethod?: string;
  lastInteraction: number; // timestamp
  totalAmount: number;
  userName?: string;
};

// Redis client instance
let redisClient: Redis;

// Initialize the state manager with a Redis client
export function initializeStateManager(client: Redis) {
  redisClient = client;
  console.log("State manager initialized with Redis client");
}

// Get a user state from Redis
export async function getUserState(userId: string): Promise<OrderState | null> {
  try {
    const stateStr = await redisClient.get(`order:${userId}`);
    if (!stateStr) return null;
    return JSON.parse(stateStr);
  } catch (error) {
    console.error(`Error retrieving state for user ${userId}:`, error);
    return null;
  }
}

// Save the user state back to Redis
export async function saveUserState(state: OrderState): Promise<void> {
  try {
    await redisClient.set(
      `order:${state.userId}`, 
      JSON.stringify(state),
      "EX", 3600 // Expire after 1 hour of inactivity
    );
  } catch (error) {
    console.error(`Error saving state for user ${state.userId}:`, error);
  }
}

// Create a new session for a user
export function createNewSession(userId: string, userName?: string): OrderState {
  return {
    userId,
    sessionId: `${userId}-${Date.now()}`, // Using the user's ID and current timestamp
    currentStage: OrderStage.GREETING,
    items: [],
    lastInteraction: Date.now(),
    totalAmount: 0,
    userName
  };
}

// Clean up expired sessions (Redis TTL auto-deletes expired sessions)
export async function cleanupExpiredSessions(): Promise<void> {
  console.log('Cleanup job running - Redis TTL handles expired sessions');
}

// Process an incoming message and update the state accordingly
export async function processUserMessage(
  userId: string,
  message: string,
  userName?: string
): Promise<{ response: string; updatedState: OrderState }> {
  // Retrieve or create a session
  let state = await getUserState(userId);
  if (!state) {
    state = createNewSession(userId, userName);
  }
  
  // Update the last interaction time
  state.lastInteraction = Date.now();
  let response = '';
  
  switch (state.currentStage) {
    case OrderStage.GREETING:
      response = `Hello${state.userName ? ' ' + state.userName : ''}! Welcome to our Fast Food Bot. What would you like to order today?`;
      state.currentStage = OrderStage.MENU_SELECTION;
      break;
      
    case OrderStage.MENU_SELECTION: {
      // Assume the message corresponds to a menu item ID (e.g., "special-1", "app-1", etc.)
      const itemRequested = message.toLowerCase();
      const menuItem = getMenuItem(itemRequested);
      if (menuItem) {
        response = `Great choice! ${menuItem.title} costs $${menuItem.price}. How many would you like?`;
        state.currentStage = OrderStage.CUSTOMIZING_ITEM;
        state.items.push({
          item: menuItem.id!,
          quantity: 1,
          price: menuItem.price,
          customizations: []
        });
      } else {
        response = "Sorry, we don't have that item. Please choose from our available menu items.";
      }
      break;
    }
      
    case OrderStage.CUSTOMIZING_ITEM: {
      const currentItem = state.items[state.items.length - 1];
      // Attempt to parse quantity from the message
      const quantity = parseInt(message);
      if (!isNaN(quantity) && quantity > 0) {
        currentItem.quantity = quantity;
        // Update price based on quantity
        currentItem.price = quantity * currentItem.price;
        
        // Retrieve the full menu item details to list customization options (if any)
        const menuItem = getMenuItem(currentItem.item);
    
          // If there are no customization options, move straight to confirming the item
          response = `No customization options available for ${menuItem?.title}. Added ${quantity} x ${menuItem?.title}. Would you like to add anything else? (yes/no)`;
          // Update total amount immediately
          state.totalAmount = state.items.reduce((sum, item) => sum + item.price, 0);
          state.currentStage = OrderStage.ADDING_MORE;
        
      } else {
        response = "Please enter a valid quantity as a number.";
      }
      break;
    }
      
    case OrderStage.CONFIRMING_ITEM: {
      const currentItem = state.items[state.items.length - 1];
      const menuItem = getMenuItem(currentItem.item);
      if (message.toLowerCase() !== 'none') {
        // Add the customization (in a full app, you might validate the option)
        if (!currentItem.customizations) {
          currentItem.customizations = [];
        }
        currentItem.customizations.push(message.toLowerCase());
        response = `Added customization: ${message}. You can add more customizations for your ${menuItem?.title} or say "none" to continue.`;
      } else {
        // Calculate total price for the order
        state.totalAmount = state.items.reduce((sum, item) => sum + item.price, 0);
        response = `Added ${currentItem.quantity} x ${menuItem?.title}${currentItem.customizations && currentItem.customizations.length ? ' with ' + currentItem.customizations.join(', ') : ''}. Would you like to add more items? (yes/no)`;
        state.currentStage = OrderStage.ADDING_MORE;
      }
      break;
    }
      
    case OrderStage.ADDING_MORE: {
      if (message.toLowerCase() === 'yes') {
        response = "What else would you like to add to your order?";
        state.currentStage = OrderStage.MENU_SELECTION;
      } else if (message.toLowerCase() === 'no') {
        response = `Your current order: ${state.items.map(item => {
          const mi = getMenuItem(item.item);
          return `${item.quantity} x ${mi?.title}${item.customizations && item.customizations.length ? ' with ' + item.customizations.join(', ') : ''}`;
        }).join(', ')}. Total: $${state.totalAmount.toFixed(2)}. Ready to check out? (yes/no)`;
        state.currentStage = OrderStage.CHECKOUT;
      } else {
        response = "Please answer with 'yes' or 'no'.";
      }
      break;
    }
      
    case OrderStage.CHECKOUT: {
      if (message.toLowerCase() === 'yes') {
        response = "Please provide your delivery address.";
        state.currentStage = OrderStage.DELIVERY_INFO;
      } else if (message.toLowerCase() === 'no') {
        response = "What would you like to change in your order?";
        state.currentStage = OrderStage.MENU_SELECTION;
      } else {
        response = "Please answer with 'yes' or 'no'.";
      }
      break;
    }
      
    case OrderStage.DELIVERY_INFO: {
      state.address = message;
      response = "How would you like to pay? (cash/card)";
      state.currentStage = OrderStage.PAYMENT;
      break;
    }
      
    case OrderStage.PAYMENT: {
      if (['cash', 'card'].includes(message.toLowerCase())) {
        state.paymentMethod = message.toLowerCase();
        response = `Great! Your order summary:
Items: ${state.items.map(item => {
  const mi = getMenuItem(item.item);
  return `${item.quantity} x ${mi?.title}${item.customizations && item.customizations.length ? ' with ' + item.customizations.join(', ') : ''}`;
}).join(', ')}
Total: $${state.totalAmount.toFixed(2)}
Delivery to: ${state.address}
Payment: ${state.paymentMethod}

Please confirm your order. (confirm/cancel)`;
        state.currentStage = OrderStage.ORDER_CONFIRMATION;
      } else {
        response = "Please select either 'cash' or 'card' as your payment method.";
      }
      break;
    }
      
    case OrderStage.ORDER_CONFIRMATION: {
      if (message.toLowerCase() === 'confirm') {
        const orderNumber = Math.floor(1000 + Math.random() * 9000);
        response = `Thank you for your order! Your order #${orderNumber} has been confirmed and will be delivered in approximately 30-45 minutes. Enjoy your meal!`;
        state.currentStage = OrderStage.COMPLETED;
        // In a real application, order processing logic would be triggered here.
      } else if (message.toLowerCase() === 'cancel') {
        response = "Your order has been canceled. Would you like to start a new order? (yes/no)";
        state.items = [];
        state.totalAmount = 0;
        state.currentStage = OrderStage.GREETING;
      } else {
        response = "Please answer with 'confirm' or 'cancel'.";
      }
      break;
    }
      
    case OrderStage.COMPLETED: {
      if (message.toLowerCase() === 'yes') {
        state = createNewSession(userId, state.userName);
        response = "Welcome back! What would you like to order today?";
        state.currentStage = OrderStage.MENU_SELECTION;
      } else if (message.toLowerCase() === 'no') {
        response = "Thank you for using our Fast Food Bot! Have a great day!";
      }
      break;
    }
  }
  
  // Save the updated state to Redis
  await saveUserState(state);
  return { response, updatedState: state };
}
