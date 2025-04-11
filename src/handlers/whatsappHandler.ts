// handlers/whatsappHandler.ts
import { UserStateService } from "../services/userStateService";
import { MessageFactory } from "../services/messageFactory";
import { WhatsAppService } from "../services/whatsappService";
import { WhatsAppMessage } from "../data/types";
import { CartService } from "../services/cartService";
import { MenuService } from "../services/menuService";
import { CheckoutService } from "../services/checkoutService";
import Redis from "ioredis";

export class WhatsAppHandler {
  private userStateService: UserStateService;
  private whatsAppService: WhatsAppService;
  private menuService: MenuService;
  private cartService: CartService;
  private checkoutService: CheckoutService;
  
  constructor(redisClient: Redis) {
    this.userStateService = new UserStateService(redisClient);
    this.whatsAppService = new WhatsAppService();
    this.cartService = new CartService(this.whatsAppService, redisClient);
    this.menuService = new MenuService(this.whatsAppService, this.cartService);
    this.checkoutService = new CheckoutService(
      this.userStateService,
      this.cartService,
      this.whatsAppService,
      redisClient
    );
  }

  /**
   * Main entry point for handling incoming WhatsApp messages
   */
  async handleIncomingMessage(message: WhatsAppMessage, sender: string): Promise<void> {
    const userState = await this.userStateService.getUserState(sender);
    
    try {
      if (message.interactive?.list_reply) {
        await this.handleInteractiveListReply(message, sender, userState);
      } else if (message.interactive?.button_reply) {
        await this.handleInteractiveButtonReply(message, sender, userState);
      } else if (message.text?.body) {
        await this.handleTextMessage(message, sender, userState);
      } else if (message.location) {
        await this.handleLocationMessage(message, sender, userState);
      } else {
        // Unsupported message type
        await this.whatsAppService.sendMessage(
          MessageFactory.createTextMessage(sender, "Please use the menu to place your order.")
        );
      }
    } catch (error) {
      console.error(`Error handling message for ${sender}:`, error);
      await this.handleError(sender, error);
    }
  }
  
  /**
   * Handles interactive list replies (e.g., menu item selections)
   */
  private async handleInteractiveListReply(
    message: WhatsAppMessage, 
    sender: string, 
    userState: any
  ): Promise<void> {
    const selectedId = message.interactive!.list_reply!.id!;
    
    if (selectedId.startsWith("payment")) {
      await this.checkoutService.processPaymentMethod(sender, selectedId);
    } else {
      const itemTitle = await this.menuService.processUserItemSelection(sender, selectedId);
      
      // Add item to cart
      await this.cartService.addItemToCart(sender, selectedId);
      
      // Update user context
      await this.userStateService.setMenuContext(
        sender, 
        userState.currentCategory || "main", 
        selectedId
      );
      
      // Show cart after adding item
      await this.cartService.sendCartSummary(sender);
    }
  }
  
  /**
   * Handles interactive button replies
   */
  private async handleInteractiveButtonReply(
    message: WhatsAppMessage, 
    sender: string, 
    userState: any
  ): Promise<void> {
    const buttonId = message.interactive!.button_reply!.id!;
    
    // Group button actions by type
    if (this.isNavigationButton(buttonId)) {
      await this.handleNavigationButton(sender, buttonId);
    } else if (this.isCartActionButton(buttonId)) {
      await this.handleCartAction(sender, buttonId);
    } else if (this.isCheckoutButton(buttonId)) {
      await this.handleCheckoutAction(sender, buttonId, userState);
    } else if (buttonId.startsWith("add-")) {
      await this.handleAddToCartButton(sender, buttonId);
    } else if (this.menuService.isMenuCategory(buttonId)) {
      await this.menuService.sendCategoryMenu(sender, buttonId);
      await this.userStateService.setMenuContext(sender, buttonId);
    } else {
      // Default response for unhandled button
      await this.whatsAppService.sendMessage(
        MessageFactory.createTextMessage(sender, "Thank you for your selection.")
      );
      
      await this.whatsAppService.sendMessage(
        MessageFactory.createNavigationButtons(sender)
      );
    }
  }
  
  /**
   * Handles text messages
   */
  private async handleTextMessage(
    message: WhatsAppMessage, 
    sender: string, 
    userState: any
  ): Promise<void> {
    const text = message.text!.body.toLowerCase();
    
    // Handle special command texts
    if (text === "start") {
      await this.menuService.sendWelcomeWithButtons(sender);
      return;
    }
    
    if (text === "menu") {
      await this.menuService.sendMainMenu(sender);
      await this.userStateService.setOrderFlow(sender, "browsing", "main_menu");
      return;
    }
    
    if (text === "help") {
      await this.menuService.sendHelpMessage(sender);
      return;
    }
    
    if (text === "cart") {
      await this.cartService.sendCartSummary(sender);
      return;
    }
    
    if (text === "checkout") {
      await this.checkoutService.initiateCheckout(sender);
      return;
    }
    
    if (text === "cancel") {
      await this.checkoutService.cancelOrder(sender);
      return;
    }
    
    // Handle state-specific text inputs
    if (userState.flow === "checkout" && userState.step === "address_input") {
      await this.checkoutService.processDeliveryAddress(sender, message.text!.body);
      return;
    }
    
    if (userState.flow === "customizing" && userState.step === "special_instructions") {
      await this.cartService.addSpecialInstructions(
        sender, 
        message.text!.body, 
        userState.currentItemId
      );
      return;
    }
    
    // Fallback for unrecognized text
    await this.whatsAppService.sendMessage(
      MessageFactory.createTextMessage(
        sender, 
        "Sorry, I didn't understand that. Please use the menu options provided."
      )
    );
    
    await this.whatsAppService.sendMessage(
      MessageFactory.createNavigationButtons(sender)
    );
  }
  
  /**
   * Handles location messages
   */
  private async handleLocationMessage(
    message: WhatsAppMessage, 
    sender: string, 
    userState: any
  ): Promise<void> {
    await this.checkoutService.saveCustomerLocation(sender, message.location!);
    
    if (userState.flow === "checkout" && userState.step === "location_input") {
      await this.checkoutService.processDeliveryLocation(sender, message.location);
    } else {
      await this.checkoutService.sendPaymentOptions(sender);
    }
  }
  
  /**
   * Handles navigation button actions
   */
  private async handleNavigationButton(sender: string, buttonId: string): Promise<void> {
    switch (buttonId) {
      case "main-menu":
        await this.menuService.sendMainMenu(sender);
        await this.userStateService.setOrderFlow(sender, "browsing", "main_menu");
        break;
      case "help":
        await this.menuService.sendHelpMessage(sender);
        break;
      case "specials":
        await this.menuService.sendSpecialMenu(sender);
        await this.userStateService.setOrderFlow(sender, "browsing", "specials");
        break;
      case "view-cart":
        await this.cartService.sendCartSummary(sender);
        break;
      default:
        if (buttonId.startsWith("back-")) {
          const categoryId = buttonId.replace("back-", "");
          await this.menuService.sendCategoryMenu(sender, categoryId);
          await this.userStateService.setMenuContext(sender, categoryId);
        }
    }
  }
  
  /**
   * Handles cart-related button actions
   */
  private async handleCartAction(sender: string, buttonId: string): Promise<void> {
    if (buttonId.startsWith("remove-")) {
      const itemId = buttonId.replace("remove-", "");
      await this.cartService.removeFromCart(sender, itemId);
      await this.cartService.sendCartSummary(sender);
    }
  }
  
  /**
   * Handles checkout-related button actions
   */
  private async handleCheckoutAction(
    sender: string, 
    buttonId: string, 
    userState: any
  ): Promise<void> {
    switch (buttonId) {
      case "checkout":
        await this.checkoutService.initiateCheckout(sender);
        break;
      case "pickup":
        await this.checkoutService.setupPickupOrder(sender);
        break;
      case "delivery":
        await this.checkoutService.setupDeliveryOrder(sender);
        break;
      case "confirm-order":
        await this.checkoutService.confirmFinalOrder(sender);
        break;
      case "cancel-order":
        await this.checkoutService.cancelOrder(sender);
        break;
    }
  }
  
  /**
   * Handles add-to-cart button actions
   */
  private async handleAddToCartButton(sender: string, buttonId: string): Promise<void> {
    const itemId = buttonId.replace("add-", "");
    
    if (this.menuService.itemHasCustomizations(itemId)) {
      // Launch customization flow
      await this.cartService.startItemCustomization(sender, itemId);
    } else {
      // Add directly to cart
      await this.cartService.addItemToCart(sender, itemId);
      await this.whatsAppService.sendMessage(
        MessageFactory.createTextMessage(sender, "Item added to cart!")
      );
      await this.whatsAppService.sendMessage(
        MessageFactory.createNavigationButtons(sender)
      );
    }
  }
  
  /**
   * Handles errors during message processing
   */
  private async handleError(sender: string, error: any): Promise<void> {
    console.error("Error processing message:", error);
    
    await this.whatsAppService.sendMessage(
      MessageFactory.createTextMessage(
        sender,
        "Sorry, we experienced an issue processing your request. Please try again."
      )
    );
    
    await this.whatsAppService.sendMessage(
      MessageFactory.createNavigationButtons(sender)
    );
  }
  
  /**
   * Utility method to check if a button is a navigation button
   */
  private isNavigationButton(buttonId: string): boolean {
    return [
      "main-menu", 
      "help", 
      "specials", 
      "view-cart"
    ].includes(buttonId) || buttonId.startsWith("back-");
  }
  
  /**
   * Utility method to check if a button is a cart action button
   */
  private isCartActionButton(buttonId: string): boolean {
    return buttonId.startsWith("remove-");
  }
  
  /**
   * Utility method to check if a button is a checkout button
   */
  private isCheckoutButton(buttonId: string): boolean {
    return [
      "checkout", 
      "pickup", 
      "delivery", 
      "confirm-order", 
      "cancel-order"
    ].includes(buttonId);
  }
}
