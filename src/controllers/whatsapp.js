import { WhatsAppMessage } from "../../data/types";
import { createNavigationButtons, getMenuCategory, getMenuItem, sendCategoryMenu, sendHelpMessage, sendItemDetails, sendMainMenu, sendTextMessage, sendWhatsAppRequest } from "../services/whatsapp";



  /**
   * Process incoming WhatsApp messages and respond accordingly
   * @param message The incoming WhatsApp message object
   * @param sender The sender's phone number
   */
  async function handleIncomingMessage(message: WhatsAppMessage, sender: string): Promise<void> {
    // Text message handling
    if (message.text?.body) {
      const text = message.text.body.toLowerCase();
      
      if (text === "start" || text === "menu") {
        await sendMainMenu(sender);
        return;
      }
      
      if (text === "help") {
        await sendHelpMessage(sender);
        return;
      }
      
      // Add more text commands here
    }
    
    // Interactive list replies
    if (message.interactive?.list_reply) {
      const selectedId = message.interactive.list_reply.id;
      
      // Check if the selected ID is a valid category
      const category = getMenuCategory(selectedId);
      
      if (category) {
        await sendCategoryMenu(sender, selectedId);
        return;
      }
      
      // Check if it's a menu item
      const menuItem = getMenuItem(selectedId);
      
      if (menuItem) {
        await sendItemDetails(sender, selectedId);
        return;
      }
      
      // Default case
      await sendTextMessage(sender, "Thank you for your selection. We'll process your request.");
      // Send navigation buttons for better UX
      await sendWhatsAppRequest(createNavigationButtons(sender));
      return;
    }
    
    // Interactive button replies
    if (message.interactive?.button_reply) {
      const buttonId = message.interactive.button_reply.id;
      
      // Handle navigation actions
      if (buttonId === "main-menu") {
        await sendMainMenu(sender);
        return;
      }
      
      if (buttonId === "help") {
        await sendHelpMessage(sender);
        return;
      }
      
      if (buttonId === "checkout") {
        await processCheckout(sender);
        return;
      }
      
      // Handle back-to-category actions
      if (buttonId.startsWith("back-")) {
        const categoryId = buttonId.replace("back-", "");
        await sendCategoryMenu(sender, categoryId);
        return;
      }
      
      // Handle add-to-cart actions
      if (buttonId.startsWith("add-")) {
        const itemId = buttonId.replace("add-", "");
        await addItemToCart(sender, itemId);
        // After adding to cart, show navigation options
        await sendWhatsAppRequest(createNavigationButtons(sender));
        return;
      }
      
      // Direct category jumps
      if (getMenuCategory(buttonId)) {
        await sendCategoryMenu(sender, buttonId);
        return;
      }
      
      // Default fallback
      await sendTextMessage(sender, "Thank you for your selection.");
      await sendWhatsAppRequest(createNavigationButtons(sender));
      return;
    }
     
    // Handle location messages
    if (message.location) {
      await sendTextMessage(sender, "Thank you for sharing your location. We'll use this information for your order.");
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
