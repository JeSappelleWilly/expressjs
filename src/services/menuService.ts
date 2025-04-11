import { menuCategories } from "../data/db";
import { WhatsAppService } from "./whatsappService";
import { MessageFactory } from "./messageFactory";
import { findMenuItemById } from "../data/utils";
import { CartService } from "./cartService";
import { MenuCategory, WhatsAppTemplateParams } from "../data/types";

/**
 * Service for Menu API
 */
export class MenuService {
    whatsAppService: WhatsAppService;
    cartService: CartService;

    constructor(whatsAppService: WhatsAppService, cartService: CartService) {
        this.whatsAppService = whatsAppService;
        this.cartService = cartService;
    }

    /**
     * Sends the main menu with all categories
     */
    sendMainMenu(sender: string): Promise<any> {
        try {
            // Convert Map to array for the list message
            const categoryArray: MenuCategory[] = Array.from(menuCategories.values());
            
            // Create sections for the list message
            const sections = [{
                title: "Menu Categories",
                rows: categoryArray.map(category => ({
                    id: `category-${category.id}`,
                    title: category.name,
                    description: category.description
                }))
            }];

            // Create and send the list message
            const listMessage = this.whatsAppService.sendMessage(
                MessageFactory.createListMessage({
                    recipient: sender,
                    headerText: "🍽️ Restaurant Menu",
                    bodyText: "Please select a category to view available items:",
                    footerText: "Browse our delicious options",
                    buttonText: "View Categories",
                    sections: sections
                })
            );

            return listMessage;
        } catch (error) {
            console.error("Error sending main menu:", error);
            throw error;
        }
    }
    
    /**
     * Checks if a string ID represents a menu category
     */
    isMenuCategory(id: string): boolean {
        const categoryId = id.replace('category-', '');
        return menuCategories.has(categoryId);
    }
    
    /**
     * Send a specific category menu to the user
     */
    async sendCategoryMenu(sender: string, buttonId: string): Promise<void> {
        try {
            const categoryId = buttonId.replace('category-', '');
            const category = menuCategories.get(categoryId);
            
            if (!category) {
                await this.whatsAppService.sendText(sender, "Sorry, that category was not found. Please try again.");
                return this.sendMainMenu(sender);
            }
            
            // Create sections for the list message with items from this category
            const sections = [{
                title: category.name,
                rows: category.items.map(item => ({
                    id: `item-${item.id}`,
                    title: item.title,
                    description: `$${item.price.toFixed(2)} - ${item.description.substring(0, 60)}${item.description.length > 60 ? '...' : ''}`
                }))
            }];
            
            // Send the list message
            await this.whatsAppService.sendMessage(
                MessageFactory.createListMessage({
                    recipient: sender,
                    headerText: `${category.name} Menu`,
                    bodyText: `Browse our ${category.name.toLowerCase()} options:`,
                    footerText: "Select an item to view details",
                    buttonText: "View Items",
                    sections: sections
                })
            );
            
            // Send navigation buttons
            await this.whatsAppService.sendMessage(
                MessageFactory.createNavigationButtons(sender)
            );
        } catch (error) {
            console.error(`Error sending category menu for ${buttonId}:`, error);
            throw error;
        }
    }
    
    /**
     * Process user selection of a specific menu item
     */
    async processUserItemSelection(sender: string, selectedId: string): Promise<void> {
        try {
            const itemId = selectedId.replace('item-', '');
            const menuItem = findMenuItemById(itemId);
            
            if (!menuItem) {
                await this.whatsAppService.sendText(
                    sender, 
                    "Sorry, that item was not found. Please try again."
                );
                return this.sendMainMenu(sender);
            }
            
            // Create item detail message
            let itemMessage = `*${menuItem.title}*\n`;
            itemMessage += `💲 ${menuItem.price.toFixed(2)}\n\n`;
            itemMessage += `${menuItem.description}\n\n`;
            
            if (menuItem.allergens && menuItem.allergens.length > 0) {
                itemMessage += `⚠️ *Allergens:* ${menuItem.allergens.join(', ')}\n\n`;
            }
            
            // Send item details
            await this.whatsAppService.sendText(sender, itemMessage);
            
            // Check if item has customizations
            if (this.itemHasCustomizations(itemId)) {
                // Start customization flow
                await this.cartService.startItemCustomization(sender, itemId);
            } else {
                // Send add to cart buttons
                await this.whatsAppService.sendMessage(
                    MessageFactory.createButtonMessage({
                        recipient: sender,
                        headerType: "text",
                        headerContent: "🛒 Add to Cart",
                        bodyText: `Would you like to add ${menuItem.title} to your cart?`,
                        buttons: [
                            {
                                reply: { id: `add-cart-${itemId}`, title: "Add to Cart" },
                                type: "reply"
                            },
                            {
                                reply: { id: "main-menu", title: "Back to Menu" },
                                type: "reply"
                            }                            
                        ]
                    })
                );
            }
        } catch (error) {
            console.error(`Error processing item selection ${selectedId}:`, error);
            throw error;
        }
    }
    
    /**
     * Check if a menu item has customization options
     */
    itemHasCustomizations(itemId: string): boolean {
        const menuItem = findMenuItemById(itemId);
        // Check if item has customization options (like toppings, sizes, etc.)
        // This is a simplified check - in a real app, you would check for customization options
        return menuItem?.hasCustomOptions || false;
    }
    
    /**
     * Send welcome message with buttons to start the conversation
     */
    async sendWelcomeWithButtons(sender: string): Promise<void> {
        try {
            const welcomeText = "👋 Welcome to our Restaurant! We're delighted to serve you through WhatsApp. What would you like to do today? ";
                const footer = "Lucky Shrub: Your gateway to succulents!™"

            await this.whatsAppService.sendMessage(
                MessageFactory.createButtonMessage({
                    recipient: sender,
                    headerType: "text",
                    headerContent: "🍽️ Welcome!",
                    bodyText: welcomeText,
                    footerText: footer,
                    buttons: [
                        {
                            type: "reply",
                            reply: {
                                id: "main-menu",
                                title: "Browse Menu"
                            },
                        },
                        {
                            type: "reply",
                            reply: { id: "daily-special", title: "Today's Special" }
                        },
                        {
                            type: "reply",
                            reply: { id: "help", title: "Help" }
                        },
                        
                        
                    ]
                })
            );
        } catch (error) {
            console.error(`Error sending welcome message to ${sender}:`, error);
            throw error;
        }
    }
    
    /**
     * Send daily specials menu
     */
    async sendSpecialMenu(sender: string): Promise<void> {
        try {
            // In a real app, you might fetch this from a database or API
            const specialsMessage = "🌟 *Today's Specials* 🌟\n\n" +
                "1. *Chef's Special Pasta* - $15.99\n" +
                "   Fresh pasta with homemade sauce and seasonal vegetables\n\n" +
                "2. *Catch of the Day* - $22.99\n" +
                "   Fresh-caught fish with lemon butter sauce and rice pilaf\n\n" +
                "3. *Dessert Special* - $8.99\n" +
                "   Chocolate lava cake with vanilla ice cream";
                
            await this.whatsAppService.sendText(sender, specialsMessage);
            
            // Send action buttons
            await this.whatsAppService.sendMessage(
                MessageFactory.createButtonMessage({
                    recipient: sender,
                    headerType: "text",
                    headerContent: "🌟 Special Offers",
                    bodyText: "Would you like to order a special item or see our full menu?",
                    buttons: [
                        {
                            reply: { id: "order-special", title: "Order Special" },
                            type: "reply"
                        },
                        {
                            reply: { id: "main-menu", title: "Full Menu" },
                            type: "reply"
                        },
                        
                    ]
                })
            );
        } catch (error) {
            console.error(`Error sending specials menu to ${sender}:`, error);
            throw error;
        }
    }
    
    /**
     * Send help message with FAQ and support options
     */
    async sendHelpMessage(sender: string): Promise<void> {
        try {
            const helpMessage = "🆘 *Need Help?* 🆘\n\n" +
                "*Frequently Asked Questions:*\n\n" +
                "1. *How do I place an order?*\n" +
                "   Browse our menu, select items, and proceed to checkout.\n\n" +
                "2. *What are your hours?*\n" +
                "   We're open daily from 11 AM to 10 PM.\n\n" +
                "3. *Do you offer delivery?*\n" +
                "   Yes, we deliver within a 5-mile radius.\n\n" +
                "4. *How long does delivery take?*\n" +
                "   Typically 30-45 minutes depending on your location.\n\n" +
                "For other questions, please contact our customer service at (555) 123-4567.";
                
            await this.whatsAppService.sendText(sender, helpMessage);
            
            // Send action buttons
            await this.whatsAppService.sendMessage(
                MessageFactory.createButtonMessage({
                    recipient: sender,
                    headerType: "text",
                    headerContent: "📞 Customer Support",
                    bodyText: "What would you like to do next?",
                    buttons: [
                        {
                            reply: { id: "talk-representative", title: "Talk to Agent" },
                            type: "reply"
                        },
                        {
                            reply: { id: "main-menu", title: "Back to Menu" },
                            type: "reply"
                        }
                        
                    ]
                })
            );
        } catch (error) {
            console.error(`Error sending help message to ${sender}:`, error);
            throw error;
        }
    }
}
