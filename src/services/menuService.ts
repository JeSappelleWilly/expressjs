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
    await this.sender.sendTemplate(recipientPhone, "welcome", "en", [
      {
        "type": "header",
        "parameters": [
          {
            "type": "image",
            "image": {
              "id": "1168749397795185"
            }
        }
        ]
      }, 
      {
      "type": "body",
      "parameters": [ 
          {
              "type": "text",
              "text": "Fockal Food"
          }
      ]
    }
  ])
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
  const sections: { [sectionTitle: string]: { id: string; title: string, description: string }[] } = {
      Main: [
        { id: 'wings', title: 'Chicken Wings', description: "5.000"},
        { id: 'drums', title: 'Chicken Drums', description: "5.000" },
        { id: 'spring_rolls', title: 'Spring Rolls', description: "5.000" },
        { id: 'burger', title: 'Classic Burger', description: "5.000" }
      ],
      Drinks: [
        { id: 'bissap', title: 'Bissap', description: "5.000" },
        { id: 'iced_tea', title: 'Iced Tea', description: "5.000" },
      ],
      Sides: [
        { id: 'fries', title: 'French Fries', description: '3.000' },
        { id: 'mashed_potatoes', title: 'Mashed Potatoes', description: '4.000' }
      ],
      Desserts: [
        { id: 'ice_cream', title: 'Ice Cream', description: '2.500' },
        { id: 'brownie', title: 'Chocolate Brownie', description: '3.000' }
      ]
    };
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
