import { 
  CustomerLocation, 
  Order, 
  Store, 
  WhatsAppMessage 
} from "../data/types";

import { 
  createNavigationButtons, 
  getMenuCategory, 
  sendCategoryMenu, 
  sendHelpMessage, 
  sendMainMenu, 
  sendTextMessage,
  sendWelcomeWithButtons,
  sendCartSummary,
  sendPaymentOptions,
  sendStoreLocations,
  sendDeliveryTimeEstimate,
  sendWhatsAppRequest,
  sendSpecialMenu 
} from "../services/whatsapp";

import { 
  addItemToCart, 
  getCart, 
  removeFromCart 
} from "../services/cart";

import { dealsCategories, findMenuItemTitleById, menuCategories } from "../data/menuData";
import { processUserMessage } from "../services/stateManager";

// ----------------------------------------------------------------------
// Main entry point: Handle incoming WhatsApp message
// ----------------------------------------------------------------------
export async function handleIncomingMessage(message: WhatsAppMessage, sender: string): Promise<void> {
  const userState = await getUserState(sender);
  
  // Delegate based on the type of message
  if (message.interactive?.list_reply) {
    await handleInteractiveListReply(message, sender, userState);
  } else if (message.interactive?.button_reply) {
    await handleInteractiveButtonReply(message, sender, userState);
  } else if (message.text?.body) {
    await handleTextMessage(message, sender, userState);
  } else if (message.location) {
    await handleLocationMessage(message, sender, userState);
  } else {
    await sendTextMessage(sender, "Please use the menu to place your order.");
  }
}

// ----------------------------------------------------------------------
// Interactive List Reply Handler
// ----------------------------------------------------------------------
async function handleInteractiveListReply(message: WhatsAppMessage, sender: string, userState: any): Promise<void> {
  const listReply = message.interactive!.list_reply;
  const selectedId = listReply?.id!;

  console.warn("selected item id", selectedId)

  const reponse = await processUserItemSelection(sender, selectedId);
  await sendTextMessage(sender, reponse);

  // Display items for this subcategory.
  await sendItemList(sender, selectedId);
  await setUserState(sender, { flow: "browsing", step: "item_list", currentSubcategory: selectedId });
}


/**
 * Process the selection made by the user from an interactive list_reply.
 * Looks up the selected item in both menu and deals categories.
 *
 * @param sender - The WhatsApp sender ID.
 * @param selectedId - The ID of the selected item received from the interactive list_reply.
 * @returns A response string to send back to the user.
 */
export async function processUserItemSelection(sender: string, selectedId: string): Promise<string> {
  console.warn("filter items with id: ", selectedId)

  const selectecMenuItemTitle = findMenuItemTitleById(selectedId, menuCategories);
  const selectedDealItemTitle = findMenuItemTitleById(selectedId, dealsCategories);
    if (selectedDealItemTitle || selectecMenuItemTitle) {
      if (selectedDealItemTitle) {
        return selectedDealItemTitle!;
      }
      return selectecMenuItemTitle!;
  }
  // If no item is found, notify the user.
  return "Sorry, we couldn't find the item you selected. Please try a different selection.";
}

/**
 * Helper function to format the response message for an item.
 *
 * @param item - The item object containing title, description, price, etc.
 * @returns A formatted response string.
 */
function formatItemResponse(item: { title: string; description: string; price?: number }): string {
  const priceText = (item.price !== undefined)
    ? `$${item.price.toFixed(2)}`
    : "Price varies";
  return `You selected "${item.title}".\n${item.description}\nPrice: ${priceText}.\nWould you like to add this item to your cart?`;
}


// ----------------------------------------------------------------------
// Interactive Button Reply Handler
// ----------------------------------------------------------------------
async function handleInteractiveButtonReply(message: WhatsAppMessage, sender: string, userState: any): Promise<void> {
  const buttonId = message.interactive!.button_reply?.id!;

  // Navigation handling
  if (buttonId === "main-menu") {
    await sendMainMenu(sender);
    await setUserState(sender, { flow: "browsing", step: "main_menu" });
    return;
  }
  if (buttonId === "specials") {
    await sendSpecialMenu(sender);
    await setUserState(sender, { flow: "browsing", step: "specials" });
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

  // Back to category menu
  if (buttonId.startsWith("back-")) {
    const categoryId = buttonId.replace("back-", "");
    await sendCategoryMenu(sender, categoryId);
    await setUserState(sender, { flow: "browsing", step: "category", currentCategory: categoryId });
    return;
  }
  
  // Add-to-cart action (check for customizations)
  if (buttonId.startsWith("add-")) {
    const itemId = buttonId.replace("add-", "");
    if (itemHasCustomizations(itemId)) {
      // Here you could launch a customization flow before adding to the cart.
      // For now, we simply add the item.
      await addItemToCart(sender, itemId);
      await sendTextMessage(sender, "Item added to cart!");
      await sendWhatsAppRequest(createNavigationButtons(sender));
    }
    return;
  }
  
  // Customization confirmation
  if (buttonId === "confirm-customization") {
    await finalizeItemCustomization(sender, userState.currentItemId);
    return;
  }
  
  // Add special instructions
  if (buttonId === "add-instructions") {
    await sendTextMessage(sender, "Please type your special instructions:");
    await setUserState(sender, { ...userState, step: "special_instructions" });
    return;
  }
  
  // Checkout method selection
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
  
  // Remove from cart action
  if (buttonId.startsWith("remove-")) {
    const itemId = buttonId.replace("remove-", "");
    await removeFromCart(sender, itemId);
    return;
  }
  
  // Direct category jump
  if (getMenuCategory(buttonId)) {
    await sendCategoryMenu(sender, buttonId);
    await setUserState(sender, { flow: "browsing", step: "category", currentCategory: buttonId });
    return;
  }
  
  // Default response if no branch matches.
  await sendTextMessage(sender, "Thank you for your selection.");
  await sendWhatsAppRequest(createNavigationButtons(sender));
}

// ----------------------------------------------------------------------
// Text Message Handler
// ----------------------------------------------------------------------
async function handleTextMessage(message: WhatsAppMessage, sender: string, userState: any): Promise<void> {
  const text = message.text!.body.toLowerCase();
  
  if (text === "start") {
    await sendWelcomeWithButtons(sender);
    return;
  }
  if (text === "menu") {
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
  
  // Promo codes handling
  if (text.startsWith("promo") || text.startsWith("discount")) {
    const words = text.split(" ");
    if (words.length > 1) {
      const promoCode = words[1];
      await applyPromoCode(sender, promoCode);
      return;
    }
  }
  
  // Payment confirmation code if in checkout confirmation state
  if (userState?.flow === "checkout" && userState?.step === "awaiting_confirmation") {
    await processConfirmationCode(sender, text);
    return;
  }
  
  // Address input for delivery
  if (userState?.flow === "checkout" && userState?.step === "address_input") {
    await processDeliveryAddress(sender, message.text!.body);
    return;
  }
  
  // Special instructions for customizing an item
  if (userState?.flow === "customizing" && userState?.step === "special_instructions") {
    await addSpecialInstructions(sender, message.text!.body, userState.currentItemId);
    return;
  }
  
  // Fallback for any text messages that don’t match.
  await sendTextMessage(sender, "Sorry, I didn't understand that. Please use the menu options provided.");
  await sendWhatsAppRequest(createNavigationButtons(sender));
}

// ----------------------------------------------------------------------
// Location Message Handler
// ----------------------------------------------------------------------
async function handleLocationMessage(message: WhatsAppMessage, sender: string, userState: any): Promise<void> {
  await saveCustomerLocation(sender, message.location!);
  
  if (userState?.flow === "checkout" && userState?.step === "location_input") {
    await processDeliveryLocation(sender, message.location);
    return;
  }
  
  await sendTextMessage(sender, "Thank you for sharing your location. We'll use this information for your order.");
  await sendStoreLocations(sender, message.location);
}

// ----------------------------------------------------------------------
// List Reply: Send Item List
// ----------------------------------------------------------------------
export async function sendItemList(recipient: string, subcategoryId: string): Promise<any | void> {
  for (const [, category] of menuCategories) {
    const subcategory = category.items.get(subcategoryId);
    if (subcategory) {
      const sections = [{
        title: subcategory.title,
        rows: Array.from(subcategory.items!.entries()).map(([itemId, item]) => ({
          id: itemId,
          title: item.title,
          description: `${item.description} - $${item.price?.toFixed(2) || 'Price varies'}`
        }))
      }];

      const payload: any = {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: recipient,
        type: "interactive",
        interactive: {
          type: "list",
          header: {
            type: "text",
            text: `🍽️ ${subcategory.title}`
          },
          body: {
            text: `Select an item from our ${subcategory.title} menu:`
          },
          footer: {
            text: "View item details for more info! 🌟"
          },
          action: {
            button: `View ${subcategory.title} Items`,
            sections: sections
          }
        }
      };

      try {
        const response = await sendWhatsAppRequest(payload);
        const data = await response.json();
        console.log(`${subcategory.title} items sent:`, data);
        return data;
      } catch (error) {
        console.error(`Error sending ${subcategory.title} items:`, error);
        throw error;
      }
    }
  }

  await sendTextMessage(recipient, "Sorry, those items are not currently available.");
  await sendWhatsAppRequest(createNavigationButtons(recipient));
}

// ----------------------------------------------------------------------
// Checkout & Order Process Functions
// ----------------------------------------------------------------------
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
      body: { text: "Please select an option:" },
      action: {
        buttons: [
          { type: "reply", reply: { id: "pickup", title: "Pickup" } },
          { type: "reply", reply: { id: "delivery", title: "Delivery" } }
        ]
      }
    }
  });
  
  await setUserState(sender, { flow: "checkout", step: "selecting_method" });
}

async function setupPickupOrder(sender: string): Promise<void> {
  await sendTextMessage(sender, "Great! You've selected pickup.");
  await sendStoreLocations(sender);
  await sendTextMessage(sender, "Your order will be ready for pickup in approximately 15-20 minutes.");
  await sendPaymentOptions(sender);
  await setUserState(sender, { flow: "checkout", step: "selecting_payment" });
}

async function setupDeliveryOrder(sender: string): Promise<void> {
  await sendTextMessage(sender, "Please share your delivery location. You can either:");
  await sendTextMessage(sender, "1. Send your location through WhatsApp\n2. Type your full address");
  await setUserState(sender, { flow: "checkout", step: "location_input" });
}

async function processDeliveryAddress(sender: string, address: string): Promise<void> {
  await saveCustomerAddress(sender, address);
  await sendDeliveryTimeEstimate(sender);
  await sendPaymentOptions(sender);
  await setUserState(sender, { flow: "checkout", step: "selecting_payment" });
}

async function processDeliveryLocation(sender: string, location: any): Promise<void> {
  await saveCustomerAddress(sender, location);
  await sendDeliveryTimeEstimate(sender);
  await sendPaymentOptions(sender);
  await setUserState(sender, { flow: "checkout", step: "selecting_payment" });
}

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
      body: { text: "Ready to complete your order?" },
      action: {
        buttons: [
          { type: "reply", reply: { id: "confirm-order", title: "Confirm Order" } },
          { type: "reply", reply: { id: "cancel-order", title: "Cancel" } }
        ]
      }
    }
  });
}

async function confirmFinalOrder(sender: string): Promise<void> {
  const userState = await getUserState(sender);
  const cart = await getCart(sender);
  
  // Process payment using stored payment method
  const paymentResult = await processPayment(sender, userState.paymentMethod);
  const paymentSuccess = true;  // Replace with actual result from paymentResult
  
  if (paymentSuccess) {
    // Create order in system
    const order = await createOrder(sender, cart, userState);
    
    // Optionally: send confirmation (e.g., sendOrderConfirmation)
    // await sendTextMessage(sender, `Your order #${order.id} has been confirmed! ${getOrderStatusMessage(order)}`);
    
    // Clear cart and update state on successful order
    await clearCart(sender);
    await setUserState(sender, { flow: "browsing", step: "main_menu" });
  } else {
    await sendTextMessage(sender, "Sorry, there was an issue processing your payment. Please try again or select a different payment method.");
    await sendPaymentOptions(sender);
    await setUserState(sender, { flow: "checkout", step: "selecting_payment" });
  }
}

async function cancelOrder(sender: string): Promise<void> {
  await clearCart(sender);
  await setUserState(sender, { flow: "browsing", step: "main_menu" });
  await sendTextMessage(sender, "Your order has been canceled.");
  await sendMainMenu(sender);
}

// ----------------------------------------------------------------------
// Customization & Promo Functions
// ----------------------------------------------------------------------
async function addSpecialInstructions(sender: string, instructions: string, itemId: string): Promise<void> {
  await updateItemInstructions(sender, itemId, instructions);
  await sendTextMessage(sender, "Special instructions added.");
  await finalizeItemCustomization(sender, itemId);
}

async function finalizeItemCustomization(sender: string, itemId: string): Promise<void> {
  await addItemToCart(sender, itemId);
  await sendTextMessage(sender, "Customized item added to cart!");
  await sendCartSummary(sender);
  await setUserState(sender, { flow: "browsing", step: "post_customization" });
  await sendWhatsAppRequest(createNavigationButtons(sender));
}

async function applyPromoCode(sender: string, code: string): Promise<void> {
  const result = await applyDiscount(sender, code);
  
  if (result.success) {
    await sendTextMessage(sender, `Promo code applied successfully! You saved $${result.discountAmount.toFixed(2)}.`);
    await sendCartSummary(sender);
  } else {
    await sendTextMessage(sender, "Invalid promo code. Please check and try again.");
  }
}

async function processConfirmationCode(sender: string, code: string): Promise<void> {
  // Verify confirmation code logic here.
  const isValidCode = true;
  if (isValidCode) {
    await confirmFinalOrder(sender);
  } else {
    await sendTextMessage(sender, "Invalid confirmation code. Please try again.");
  }
}

// ----------------------------------------------------------------------
// Utility Functions
// ----------------------------------------------------------------------
function itemHasCustomizations(itemId: string): boolean {
  // Placeholder: Check if the item has customization options.
  return true;
}

function formatPaymentMethod(paymentId: string): string {
  const methods: {[key: string]: string} = {
    "payment-cash": "Cash on Delivery/Pickup",
    "payment-card": "Credit/Debit Card",
    "payment-wallet": "Digital Wallet"
  };
  return methods[paymentId] || "Unknown Payment Method";
}

function calculateTotal(cart: any): number {
  // Placeholder: Calculate total from the cart.
  return cart.total || 0;
}

function getOrderStatusMessage(order: any): string {
  if (order.type === "pickup") {
    return `Please pick up your order from ${order.store.name} in approximately ${order.estimatedTime} minutes.`;
  } else {
    return `Your order will be delivered to you in approximately ${order.estimatedTime} minutes.`;
  }
}

// ----------------------------------------------------------------------
// Placeholder Functions (to be implemented)
// ----------------------------------------------------------------------
async function getUserState(sender: string): Promise<any> {
  // Placeholder implementation – retrieve user state from database/cache.
  return { flow: "browsing", step: "main_menu" };
}
async function setUserState(sender: string, state: any): Promise<void> {
  // Placeholder implementation – store user state in database/cache.
}
function saveCustomerAddress(sender: string, address: string | any): void {
  throw new Error("Function not implemented.");
}
function updateItemInstructions(sender: string, itemId: string, instructions: string): void {
  throw new Error("Function not implemented.");
}
function saveCustomerLocation(sender: string, location: { latitude: number; longitude: number; name?: string; address?: string; }): void {
  throw new Error("Function not implemented.");
}
function clearCart(sender: string): void {
  throw new Error("Function not implemented.");
}
function createOrder(sender: string, cart: any, userState: any): any {
  throw new Error("Function not implemented.");
}
function processPayment(sender: string, paymentMethod: any): any {
  throw new Error("Function not implemented.");
}
function addCustomizationToItem(sender: string, itemId: string, optionId: string): void {
  throw new Error("Function not implemented.");
}
function checkForMoreCustomizations(sender: string, itemId: string): any {
  throw new Error("Function not implemented.");
}
function applyDiscount(sender: string, code: string): any {
  throw new Error("Function not implemented.");
}
function getNearbyStores(customerLocation?: CustomerLocation): Promise<Store[]> {
  // Placeholder for getting nearby stores
  return Promise.resolve([
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
  ]);
}
