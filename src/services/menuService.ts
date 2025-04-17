// services/menuService.ts
import { MessageSender } from '../types/bot';
import { MenuItem, MenuCategory, sampleItems, sampleCategories } from '../types/misc';
import { CartService } from './cartService';

export class MenuService {
  private sender: MessageSender;
  private cartService: CartService;
  private menuItems: MenuItem[];
  private categories: MenuCategory[];
  
  constructor(sender: MessageSender, cartService: CartService, items: MenuItem[]) {
    this.sender = sender;
    this.cartService = cartService;
    // Load provided items (or fallback to sample data)
    this.menuItems = items.length > 0 ? items : sampleItems;
    // Initialize categories from sampleCategories
    this.categories = sampleCategories;
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
        "specials": "Today's Specials",
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
        "delivery-status": "Track My Order",
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
    const categories = this.getMenuCategories();
    // Build sections as a map: section title -> array of rows
    const sections = {
      "main" : [
        {
          title: "Chicken Wings",
          id: "wings"
        }
    ],
      "drinks" : [
        {
          title: "Wisky",
          id: "wisky"
        }
    ],
    }
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
    const categoryTitle = this.categories.find(c => c.id === categoryId)?.title || categoryId;

    // Build rows for this category
    const rows = categoryItems.map(item => ({
      id: item.id,
      title: item.name,
      description: `${item.price.toFixed(2)} - ${item.description}`
    }));

    const sections: { [sectionTitle: string]: { id: string; title: string; description: string; }[] } = {
      [categoryTitle]: rows
    };
    
    await this.sender.sendList(
      recipientPhone,
      "Select Item",
      `Browse our ${categoryTitle} selection:`,
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
    return this.categories.some(category => category.id === itemId);
  }

  /**
   * Checks if item has customization options
   */
  itemHasCustomizations(itemId: string): boolean {
    const item = this.findItemById(itemId);
    return !!item && !!item.customizationOptions && item.customizationOptions.length > 0;
  }

  // Helper methods for getting menu data
  private getMenuCategories(): MenuCategory[] {
    return this.categories;
  }

  private getItemsByCategory(categoryId: string): MenuItem[] {
    return this.menuItems.filter(i => i.categoryId === categoryId);
  }

  private findItemById(itemId: string): MenuItem | undefined {
    return this.menuItems.find(i => i.id === itemId);
  }
}
