import { CartItem, CustomerLocation, MessageButton, Order, Store, WhatsAppMessage } from "../data/types";
import { 
  createNavigationButtons, 
  getMenuCategory, 
  getMenuItem, 
  sendCategoryMenu, 
  sendHelpMessage, 
  sendItemDetails, 
  sendMainMenu, 
  sendTextMessage, 
  sendCartSummary,
  sendPaymentOptions,
  sendOrderConfirmation,
  sendStoreLocations,
  sendDeliveryTimeEstimate,
  sendWhatsAppRequest, 
} from "../services/whatsapp";

import { addItemToCart, getCart, removeFromCart } from "../services/cart";
import { getCategoryKeyFromTitle, getMenuKeyFromTitle } from "../data/menuData";




/**
 * Process incoming WhatsApp messages and respond accordingly
 * @param message The incoming WhatsApp message object
 * @param sender The sender's phone number
 */
async function handleIncomingMessage(message: WhatsAppMessage, sender: string): Promise<void> {
  // Track user state
  const userState = await getUserState(sender);
  
  // Text message handling
  if (message.text?.body) {
    const text = message.text.body.toLowerCase();
    
    // Basic navigation commands
    if (text === "start" || text === "menu") {
      await sendMainMenu(sender);
      await setUserState(sender, { flow: "browsing", step: "main_menu" });
      return;
    }
    
    if (text === "help") {
      await sendHelpMessage(sender);
      return;
    }
    
    if (text === "cart") {
      await sendCartSummary(sender);
      return;
    }
    
    if (text === "checkout") {
      await initiateCheckout(sender);
      return;
    }
    
    if (text === "cancel") {
      await cancelOrder(sender);
      return;
    }
    
    // Handle promo codes
    if (text.startsWith("promo") || text.startsWith("discount")) {
      const words = text.split(" ");
      if (words.length > 1) {
        const promoCode = words[1];
        await applyPromoCode(sender, promoCode);
        return;
      }
    }
    
    // Handle payment confirmation code
    if (userState.flow === "checkout" && userState.step === "awaiting_confirmation") {
      await processConfirmationCode(sender, text);
      return;
    }
    
    // Handle address input for delivery
    if (userState.flow === "checkout" && userState.step === "address_input") {
      await processDeliveryAddress(sender, message.text.body);
      return;
    }
    
    // Handle any special instructions
    if (userState.flow === "customizing" && userState.step === "special_instructions") {
      await addSpecialInstructions(sender, message.text.body, userState.currentItemId);
      return;
    }
    
    // Default text response
    await sendTextMessage(sender, "To order, please select options from our menu. Type 'menu' to see options.");
    await sendWhatsAppRequest(createNavigationButtons(sender));
  }
  console.warn("interactive", message.interactive?.list_reply)// Interactive list replies
  if (message.interactive?.list_reply) {
    const listReply = message.interactive.list_reply;
    const selectedKey = getMenuKeyFromTitle(listReply?.title!);
    const catId = listReply?.id;

    console.warn("selected List item Key", selectedKey)
    
    // Check if the selected key is a valid category
    const category = getCategoryKeyFromTitle(selectedKey!);
    if (category) {
      await sendCategoryMenu(sender, catId!);
      await setUserState(sender, { flow: "browsing", step: "category", currentCategory: catId });
      return;
    }
    
      // Check if it's a menu item
    // Check if it's a menu item
    const menuItem = getMenuItem(catId!);
    if (menuItem) {
      await sendItemDetails(sender, catId!);
      await setUserState(sender, { flow: "browsing", step: "item_detail", currentItemId: catId });
      return;
    }
    
    // Handle customization options selection
    if (selectedKey?.startsWith("option-")) {
      return;
    }
    
    // Handle payment method selection
    if (selectedKey?.startsWith("payment-")) {
      await processPaymentMethod(sender, selectedKey);
      return;
    }
    
    // Default case
    await sendTextMessage(sender, "Thank you for your selection. We'll process your request.");
    await sendWhatsAppRequest(createNavigationButtons(sender));
    return;
  }
  
  // Interactive button replies
  if (message.interactive?.button_reply) {
    const buttonId = message.interactive.button_reply.id;
    
    // Handle navigation actions
    if (buttonId === "main-menu") {
      await sendMainMenu(sender);
      await setUserState(sender, { flow: "browsing", step: "main_menu" });
      return;
    }
    
    if (buttonId === "help") {
      await sendHelpMessage(sender);
      return;
    }
    
    if (buttonId === "view-cart") {
      await sendCartSummary(sender);
      return;
    }
    
    if (buttonId === "checkout") {
      await initiateCheckout(sender);
      return;
    }
    
    if (buttonId === "cancel-order") {
      await cancelOrder(sender);
      return;
    }
    
    // Handle back-to-category actions
    if (buttonId.startsWith("back-")) {
      const categoryId = buttonId.replace("back-", "");
      await sendCategoryMenu(sender, categoryId);
      await setUserState(sender, { flow: "browsing", step: "category", currentCategory: categoryId });
      return;
    }
    
    // Handle add-to-cart actions
    if (buttonId.startsWith("add-")) {
      const itemId = buttonId.replace("add-", "");
      // Check if item has customization options
      const hasCustomizations = itemHasCustomizations(itemId);
      
     
        await addItemToCart(sender, itemId);
        await sendTextMessage(sender, "Item added to cart!");
        await sendWhatsAppRequest(createNavigationButtons(sender));
      
      return;
    }
    
    // Handle customization confirmation
    if (buttonId === "confirm-customization") {
      await finalizeItemCustomization(sender, userState.currentItemId);
      return;
    }
    
    // Handle add special instructions
    if (buttonId === "add-instructions") {
      await sendTextMessage(sender, "Please type your special instructions:");
      await setUserState(sender, { ...userState, step: "special_instructions" });
      return;
    }
    
    // Handle checkout actions
    if (buttonId === "pickup") {
      await setupPickupOrder(sender);
      return;
    }
    
    if (buttonId === "delivery") {
      await setupDeliveryOrder(sender);
      return;
    }
    
    if (buttonId === "confirm-order") {
      await confirmFinalOrder(sender);
      return;
    }
    
    // Handle remove from cart
    if (buttonId.startsWith("remove-")) {
      const itemId = buttonId.replace("remove-", "");
      await removeFromCart(sender, itemId);
      return;
    }
    
    // Direct category jumps
    if (getMenuCategory(buttonId)) {
      await sendCategoryMenu(sender, buttonId);
      await setUserState(sender, { flow: "browsing", step: "category", currentCategory: buttonId });
      return;
    }
    
    // Default fallback
    await sendTextMessage(sender, "Thank you for your selection.");
    await sendWhatsAppRequest(createNavigationButtons(sender));
    return;
  }
   
  // Handle location messages
  if (message.location) {
    await saveCustomerLocation(sender, message.location);
    
    if (userState.flow === "checkout" && userState.step === "location_input") {
      await processDeliveryLocation(sender, message.location);
      return;
    }
    
    await sendTextMessage(sender, "Thank you for sharing your location. We'll use this information for your order.");
    await sendStoreLocations(sender, message.location);
    return;
  }
  
  // Default response for unhandled message types
  await sendTextMessage(sender, "Thank you for your message. Type 'menu' to see our available options.");
  await sendWhatsAppRequest(createNavigationButtons(sender));
}

/**
 * Initialize checkout process
 */
async function initiateCheckout(sender: string): Promise<void> {
  const cart = await getCart(sender);
  
  if (!cart || cart.items.length === 0) {
    await sendTextMessage(sender, "Your cart is empty. Please add items before checkout.");
    await sendMainMenu(sender);
    return;
  }
  
  await sendCartSummary(sender);
  await sendTextMessage(sender, "How would you like to receive your order?");
  await sendWhatsAppRequest({
    recipient: sender,
    type: "interactive",
    interactive: {
      type: "button",
      body: {
        text: "Please select an option:"
      },
      action: {
        buttons: [
          {
            type: "reply",
            reply: {
              id: "pickup",
              title: "Pickup"
            }
          },
          {
            type: "reply",
            reply: {
              id: "delivery",
              title: "Delivery"
            }
          }
        ]
      }
    }
  });
  
  await setUserState(sender, { flow: "checkout", step: "selecting_method" });
}

/**
 * Set up pickup order details
 */
async function setupPickupOrder(sender: string): Promise<void> {
  await sendTextMessage(sender, "Great! You've selected pickup.");
  await sendStoreLocations(sender);
  await sendTextMessage(sender, "Your order will be ready for pickup in approximately 15-20 minutes.");
  await sendPaymentOptions(sender);
  await setUserState(sender, { flow: "checkout", step: "selecting_payment" });
}

/**
 * Set up delivery order details
 */
async function setupDeliveryOrder(sender: string): Promise<void> {
  await sendTextMessage(sender, "Please share your delivery location. You can either:");
  await sendTextMessage(sender, "1. Send your location through WhatsApp\n2. Type your full address");
  await setUserState(sender, { flow: "checkout", step: "location_input" });
}

/**
 * Process delivery address
 */
async function processDeliveryAddress(sender: string, address: string): Promise<void> {
  await saveCustomerAddress(sender, address);
  await sendDeliveryTimeEstimate(sender);
  await sendPaymentOptions(sender);
  await setUserState(sender, { flow: "checkout", step: "selecting_payment" });
}

/**
 * Process delivery location from WhatsApp location share
 */
async function processDeliveryLocation(sender: string, location: any): Promise<void> {
  await saveCustomerAddress(sender, location);
  await sendDeliveryTimeEstimate(sender);
  await sendPaymentOptions(sender);
  await setUserState(sender, { flow: "checkout", step: "selecting_payment" });
}

/**
 * Process payment method selection
 */
async function processPaymentMethod(sender: string, paymentMethodId: string): Promise<void> {
  await setUserState(sender, { flow: "checkout", step: "confirming_order", paymentMethod: paymentMethodId });
  
  const cart = await getCart(sender);
  const total = calculateTotal(cart);
  
  await sendTextMessage(sender, `Order Summary:\nTotal: $${total.toFixed(2)}\nPayment: ${formatPaymentMethod(paymentMethodId)}`);
  await sendWhatsAppRequest({
    recipient: sender,
    type: "interactive",
    interactive: {
      type: "button",
      body: {
        text: "Ready to complete your order?"
      },
      action: {
        buttons: [
          {
            type: "reply",
            reply: {
              id: "confirm-order",
              title: "Confirm Order"
            }
          },
          {
            type: "reply",
            reply: {
              id: "cancel-order",
              title: "Cancel"
            }
          }
        ]
      }
    }
  });
}

/**
 * Confirm final order
 */
async function confirmFinalOrder(sender: string): Promise<void> {
  const userState = await getUserState(sender);
  const cart = await getCart(sender);
  
  // Process payment using stored payment method
  const paymentResult = await processPayment(sender, userState.paymentMethod);
  const paymentstat = true;
  if (paymentstat) {
    // Create order in system
    const order = await createOrder(sender, cart, userState);
    
    // Send confirmation to customer
    // await sendOrderConfirmation(sender, order);
   // await sendTextMessage(sender, `Your order #${order.id} has been confirmed! ${getOrderStatusMessage(order)}`);
    
    // Clear cart after successful order
    await clearCart(sender);
    await setUserState(sender, { flow: "browsing", step: "main_menu" });
  } else {
    // Handle payment failure
    await sendTextMessage(sender, "Sorry, there was an issue processing your payment. Please try again or select a different payment method.");
    await sendPaymentOptions(sender);
    await setUserState(sender, { flow: "checkout", step: "selecting_payment" });
  }
}

/**
 * Cancel the current order
 */
async function cancelOrder(sender: string): Promise<void> {
  await clearCart(sender);
  await setUserState(sender, { flow: "browsing", step: "main_menu" });
  await sendTextMessage(sender, "Your order has been canceled.");
  await sendMainMenu(sender);
}

/**
 * Process customization option selection
 */


/**
 * Add special instructions to an item
 */
async function addSpecialInstructions(sender: string, instructions: string, itemId: string): Promise<void> {
  await updateItemInstructions(sender, itemId, instructions);
  await sendTextMessage(sender, "Special instructions added.");
  await finalizeItemCustomization(sender, itemId);
}

/**
 * Finalize item customization and add to cart
 */
async function finalizeItemCustomization(sender: string, itemId: string): Promise<void> {
  await addItemToCart(sender, itemId);
  await sendTextMessage(sender, "Customized item added to cart!");
  await sendCartSummary(sender);
  await setUserState(sender, { flow: "browsing", step: "post_customization" });
  await sendWhatsAppRequest(createNavigationButtons(sender));
}

/**
 * Check if an item has customization options
 */
function itemHasCustomizations(itemId: string): boolean {
  // Implementation would go here
  return true; // Placeholder, would check if item has customization options
}

/**
 * Apply a promotional code to the order
 */
async function applyPromoCode(sender: string, code: string): Promise<void> {
  const result = await applyDiscount(sender, code);
  
  if (result.success) {
    await sendTextMessage(sender, `Promo code applied successfully! You saved $${result.discountAmount.toFixed(2)}.`);
    await sendCartSummary(sender);
  } else {
    await sendTextMessage(sender, "Invalid promo code. Please check and try again.");
  }
}

/**
 * Process payment confirmation code
 */
async function processConfirmationCode(sender: string, code: string): Promise<void> {
  // Implementation would go here
  // Verify code against expected confirmation code
 /// const isValidCode = verifyConfirmationCode(sender, code);
  const isValidCode = true
  if (isValidCode) {
    await confirmFinalOrder(sender);
  } else {
    await sendTextMessage(sender, "Invalid confirmation code. Please try again.");
  }
}

/**
 * Get stored order status message
 */
function getOrderStatusMessage(order: any): string {
  if (order.type === "pickup") {
    return `Please pick up your order from ${order.store.name} in approximately ${order.estimatedTime} minutes.`;
  } else {
    return `Your order will be delivered to you in approximately ${order.estimatedTime} minutes.`;
  }
}

/**
 * Format payment method for display
 */
function formatPaymentMethod(paymentId: string): string {
  const methods: {[key: string]: string} = {
    "payment-cash": "Cash on Delivery/Pickup",
    "payment-card": "Credit/Debit Card",
    "payment-wallet": "Digital Wallet"
  };
  
  return methods[paymentId] || "Unknown Payment Method";
}

/**
 * Calculate total price of cart
 */
function calculateTotal(cart: any): number {
  // Implementation would go here
  return cart.total || 0;
}

/**
 * Get user current state
 */
async function getUserState(sender: string): Promise<any> {
  // Implementation would go here
  // This would retrieve the user's current state from database/cache
  return { flow: "browsing", step: "main_menu" };
}

/**
 * Set user state
 */
async function setUserState(sender: string, state: any): Promise<void> {
  // Implementation would go here
  // This would store the user's current state in database/cache
}
// Get nearby stores based on location
async function getNearbyStores(customerLocation?: CustomerLocation): Promise<Store[]> {
  // Implementation would go here - use location services to find nearby stores
  // Placeholder implementation
  return [
    {
      id: "store1",
      name: "Downtown Location",
      address: "123 Main St, Downtown",
      phone: "(555) 123-4567",
      hours: "9am - 10pm",
      distance: 1.2
    },
    {
      id: "store2",
      name: "Westside Branch",
      address: "456 Park Ave, Westside",
      phone: "(555) 987-6543",
      hours: "10am - 9pm",
      distance: 2.8
    }
  ];
}



export { handleIncomingMessage };

function saveCustomerAddress(sender: string, address: string) {
  throw new Error("Function not implemented.");
}
function updateItemInstructions(sender: string, itemId: string, instructions: string) {
  throw new Error("Function not implemented.");
}

function saveCustomerLocation(sender: string, location: { latitude: number; longitude: number; name?: string; address?: string; }) {
  throw new Error("Function not implemented.");
}

function clearCart(sender: string) {
  throw new Error("Function not implemented.");
}

function createOrder(sender: string, cart: any, userState: any) {
  throw new Error("Function not implemented.");
}

function processPayment(sender: string, paymentMethod: any) {
  throw new Error("Function not implemented.");
}

function addCustomizationToItem(sender: string, itemId: string, optionId: string) {
  throw new Error("Function not implemented.");
}

function checkForMoreCustomizations(sender: string, itemId: string): any {
  throw new Error("Function not implemented.");
}

function applyDiscount(sender: string, code: string): any {
  throw new Error("Function not implemented.");
}

