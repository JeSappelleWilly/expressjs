import { WhatsAppMessage } from "../data/types";
import { getMenuKeyFromTitle } from "../data/menuData";

import { processUserMessage } from "../services/stateManager";
import { createNavigationButtons, getMenuCategory, getMenuItem, sendCategoryMenu, sendHelpMessage, sendItemDetails, sendMainMenu, sendTextMessage, sendWhatsAppRequest } from "../services/whatsapp";



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
  
  // Interactive list replies
  if (message.interactive?.list_reply) {
    const listReply = message.interactive.list_reply;
    const selectedKey = listReply.id || getMenuKeyFromTitle(listReply?.title!);
    
    
    // Check if the selected key is a valid category
    const category = getMenuCategory(selectedKey!);
    if (category) {
      await sendCategoryMenu(sender, selectedKey!);
      await setUserState(sender, { flow: "browsing", step: "category", currentCategory: selectedKey });
      return;
    }
    
      // Check if it's a menu item
    // Check if it's a menu item
    const menuItem = getMenuItem(selectedKey!);
    if (menuItem) {
      await sendItemDetails(sender, selectedKey!);
      await setUserState(sender, { flow: "browsing", step: "item_detail", currentItemId: selectedKey });
      return;
    }
    
    // Handle customization options selection
    if (selectedKey?.startsWith("option-")) {
      await processCustomizationOption(sender, selectedKey, userState.currentItemId);
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
      
      if (hasCustomizations) {
        await sendCustomizationOptions(sender, itemId);
        await setUserState(sender, { flow: "customizing", step: "selecting_options", currentItemId: itemId });
      } else {
        await addItemToCart(sender, itemId);
        await sendTextMessage(sender, "Item added to cart!");
        await sendWhatsAppRequest(createNavigationButtons(sender));
      }
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

  // Referenced functions that would need to be imported or defined elsewhere
  async function processCheckout(sender: string): Promise<void> {
    // Implementation would go here
  }
  
  async function addItemToCart(sender: string, itemId: string): Promise<void> {
    // Implementation would go here
  }
  

  
  export { handleIncomingMessage, WhatsAppMessage };
