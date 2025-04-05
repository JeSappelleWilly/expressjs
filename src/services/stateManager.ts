import Redis from "ioredis";

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
  item: string;
  quantity: number;
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

// Menu data
export const menuItems: Record<string, { price: number, customizations: string[] }> = {
  'burger': { price: 5.99, customizations: ['cheese', 'bacon', 'lettuce', 'tomato', 'onion'] },
  'fries': { price: 2.99, customizations: ['small', 'medium', 'large'] },
  'soda': { price: 1.99, customizations: ['small', 'medium', 'large', 'no ice'] },
  'pizza': { price: 8.99, customizations: ['pepperoni', 'mushroom', 'extra cheese'] },
  'salad': { price: 4.99, customizations: ['ranch', 'italian', 'balsamic'] }
};

// Redis client
let redisClient: Redis;

// Initialize the state manager with Redis client
export function initializeStateManager(client: Redis) {
  redisClient = client;
  console.log("State manager initialized with Redis client");
}

// Get user state from Redis
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

// Save user state to Redis
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
    sessionId: userId + '-' + Date.now(), // Use WhatsApp ID + timestamp as session ID
    currentStage: OrderStage.GREETING,
    items: [],
    lastInteraction: Date.now(),
    totalAmount: 0,
    userName
  };
}

// Clean up expired sessions (can be called periodically)
export async function cleanupExpiredSessions(): Promise<void> {
  // Redis TTL (time to live) handles this automatically in our implementation
  console.log('Cleanup job running - Redis TTL handles expired sessions');
}

// Process an incoming message and update state accordingly
export async function processUserMessage(
  userId: string,
  message: string,
  userName?: string
): Promise<{ response: string; updatedState: OrderState }> {
  // Retrieve or create session
  let state = await getUserState(userId);
  if (!state) {
    state = createNewSession(userId, userName);
  }
  
  // Update last interaction time
  state.lastInteraction = Date.now();
  
  // Process message based on current stage
  let response = '';
  
  switch (state.currentStage) {
    case OrderStage.GREETING:
      response = `Hello${state.userName ? ' ' + state.userName : ''}! Welcome to our Fast Food Bot. What would you like to order today? We have burgers, fries, pizza, soda, and salad.`;
      state.currentStage = OrderStage.MENU_SELECTION;
      break;
      
    case OrderStage.MENU_SELECTION:
      const itemRequested = message.toLowerCase();
      if (menuItems[itemRequested]) {
        response = `Great choice! ${itemRequested.charAt(0).toUpperCase() + itemRequested.slice(1)} costs $${menuItems[itemRequested].price}. How many would you like?`;
        state.currentStage = OrderStage.CUSTOMIZING_ITEM;
        state.items.push({
          item: itemRequested,
          quantity: 1,
          price: menuItems[itemRequested].price,
          customizations: []
        });
      } else {
        response = "Sorry, we don't have that item. Please choose from our menu: burgers, fries, pizza, soda, or salad.";
      }
      break;
      
    case OrderStage.CUSTOMIZING_ITEM:
      const currentItem = state.items[state.items.length - 1];
      
      // Try to parse quantity
      const quantity = parseInt(message);
      if (!isNaN(quantity) && quantity > 0) {
        currentItem.quantity = quantity;
        currentItem.price = menuItems[currentItem.item].price * quantity;
        
        // Show customization options
        const customOptions = menuItems[currentItem.item].customizations;
        response = `Would you like any customizations for your ${currentItem.item}? Options: ${customOptions.join(', ')}. Or say "none" to continue.`;
        state.currentStage = OrderStage.CONFIRMING_ITEM;
      } else {
        response = "Please enter a valid quantity as a number.";
      }
      break;
      
    case OrderStage.CONFIRMING_ITEM:
      const item = state.items[state.items.length - 1];
      
      if (message.toLowerCase() !== 'none') {
        // Add customization
        if (!item.customizations) {
          item.customizations = [];
        }
        item.customizations.push(message.toLowerCase());
        response = `Added ${message}. Anything else for your ${item.item}? Say "none" to continue.`;
      } else {
        // Calculate total
        state.totalAmount = state.items.reduce((sum, item) => sum + item.price, 0);
        
        response = `Added ${item.quantity} ${item.item}${item.customizations?.length ? ' with ' + item.customizations.join(', ') : ''}. Would you like anything else? (yes/no)`;
        state.currentStage = OrderStage.ADDING_MORE;
      }
      break;
      
    case OrderStage.ADDING_MORE:
      if (message.toLowerCase() === 'yes') {
        response = "What else would you like to add to your order?";
        state.currentStage = OrderStage.MENU_SELECTION;
      } else if (message.toLowerCase() === 'no') {
        response = `Your current order: ${state.items.map(item => 
          `${item.quantity} ${item.item}${item.customizations?.length ? ' with ' + item.customizations.join(', ') : ''}`
        ).join(', ')}. Total: $${state.totalAmount.toFixed(2)}. Ready to check out? (yes/no)`;
        state.currentStage = OrderStage.CHECKOUT;
      } else {
        response = "Please answer with 'yes' or 'no'.";
      }
      break;
      
    case OrderStage.CHECKOUT:
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
      
    case OrderStage.DELIVERY_INFO:
      state.address = message;
      response = "How would you like to pay? (cash/card)";
      state.currentStage = OrderStage.PAYMENT;
      break;
      
    case OrderStage.PAYMENT:
      if (message.toLowerCase() === 'cash' || message.toLowerCase() === 'card') {
        state.paymentMethod = message.toLowerCase();
        response = `Great! Your order summary:
        Items: ${state.items.map(item => 
          `${item.quantity} ${item.item}${item.customizations?.length ? ' with ' + item.customizations.join(', ') : ''}`
        ).join(', ')}
        Total: $${state.totalAmount.toFixed(2)}
        Delivery to: ${state.address}
        Payment: ${state.paymentMethod}
        
        Please confirm your order. (confirm/cancel)`;
        state.currentStage = OrderStage.ORDER_CONFIRMATION;
      } else {
        response = "Please select either 'cash' or 'card' as your payment method.";
      }
      break;
      
    case OrderStage.ORDER_CONFIRMATION:
      if (message.toLowerCase() === 'confirm') {
        const orderNumber = Math.floor(1000 + Math.random() * 9000);
        response = `Thank you for your order! Your order #${orderNumber} has been confirmed and will be delivered in approximately 30-45 minutes. Enjoy your meal!`;
        state.currentStage = OrderStage.COMPLETED;
        
        // In a real app, you would trigger order processing here
        
      } else if (message.toLowerCase() === 'cancel') {
        response = "Your order has been canceled. Would you like to start a new order? (yes/no)";
        state.items = [];
        state.totalAmount = 0;
        state.currentStage = OrderStage.GREETING;
      } else {
        response = "Please answer with 'confirm' or 'cancel'.";
      }
      break;
      
    case OrderStage.COMPLETED:
      response = "Would you like to start a new order? (yes/no)";
      if (message.toLowerCase() === 'yes') {
        state = createNewSession(userId, state.userName);
        state.currentStage = OrderStage.GREETING;
        response = "Welcome back! What would you like to order today? We have burgers, fries, pizza, soda, and salad.";
        state.currentStage = OrderStage.MENU_SELECTION;
      } else if (message.toLowerCase() === 'no') {
        response = "Thank you for using our Fast Food Bot! Have a great day!";
      }
      break;
  }
  
  // Save updated state
  await saveUserState(state);
  
  return { response, updatedState: state };
}
