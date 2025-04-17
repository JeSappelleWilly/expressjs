// services/menuService.ts
import { MessageSender } from '../types/bot';
import { CartService } from './cartService';

export class MenuService {
  private sender: MessageSender;
  private cartService: CartService;
  private menuItems: any[]; // Your menu items data
  
  constructor(sender: MessageSender, cartService: CartService) {
    this.sender = sender;
    this.cartService = cartService;
    this.menuItems = []; // Load your menu items
  }
  
  /**
   * Sends welcome message with buttons
   */
  async sendWelcomeWithButtons(recipientPhone: string): Promise<void> {
    await this.sender.sendReplyButtons(
      recipientPhone,
      "Welcome to our restaurant! How can we help you today?",
      {
        "main-menu": "Browse Menu",
        "specials": "View Today's Specials",
        "help": "Get Assistance"
      },
      {
        footerText: "We're happy to serve you!"
      }
    );
  }
  async requestSupport(recipientPhone: string): Promise<void> {
    await this.sender.sendReplyButtons(
      recipientPhone,
      "Hi there! Need help with your order?",
      {
        "order-issue": "Problem with My Order",
        "delivery-status": "Track My Delivery",
        "other-help": "Contact Support"
      },
      {
        footerText: "Our team is ready to assist you!"
      }
    );
  }
  /**
   * Sends the main menu categories
   */
  async sendMainMenu(recipientPhone: string): Promise<void> {
    // Group menu items by category
    const categories = this.getMenuCategories();
    
    // Create sections for list message
    const sections = {};
    
    await this.sender.sendList(
      recipientPhone,
      "Browse Menu",
      "Please select a category to view items:",
      sections,
      {
        footerText: "All prices include tax"
      }
    );
  }
  
  /**
   * Sends menu items for a specific category
   */
  async sendCategoryMenu(recipientPhone: string, categoryId: string): Promise<void> {
    const categoryItems = this.getItemsByCategory(categoryId);
    
    // Create sections for list message
    const sections = {
      [categoryId]: categoryItems.map(item => ({
        id: item.id,
        title: item.name,
        description: `${item.price.toFixed(2)} - ${item.description}`
      }))
    };
    
    await this.sender.sendList(
      recipientPhone,
      "Select Item",
      `Browse our ${categoryId} selection:`,
      sections,
      {
        footerText: "Tap an item to add it to your cart"
      }
    );
  }
    
  /**
   * Checks if item ID belongs to a menu category
   */
  isMenuCategory(itemId: string): boolean {
    return this.getMenuCategories().some(category => category.id === itemId);
  }
  
  /**
   * Checks if item has customization options
   */
  itemHasCustomizations(itemId: string): boolean {
    const item = this.findItemById(itemId);
    return item && item.customizationOptions && item.customizationOptions.length > 0;
  }
  
  // Helper methods for getting menu data
  private getMenuCategories(): any[] {
    // Implementation to get menu categories
    return [];
  }
  
  private getItemsByCategory(categoryId: string): any[] {
    // Implementation to get items by category
    return [];
  }
  
  private findItemById(itemId: string): any {
    // Implementation to find item by ID
    return null;
  }
}
