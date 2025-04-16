// services/cartService.ts
import { MessageFactory } from "./messageFactory";
import { findMenuItemById } from "../data/utils";
import Redis from "ioredis";
import { Cart, CartItem } from "../data/types";
import { MessageSender } from "whatsapp-cloud-api-express";

/**
 * Manages shopping cart operations using Redis
 */
export class CartService {
  private redisClient: Redis;
  private readonly keyPrefix: string = "user:cart:";
  private readonly expiryTime: number = 60 * 60 * 24; // 24 hours in seconds
  private sender: MessageSender;
  
  /**
   * Creates a new CartService
   * @param whatsAppService The WhatsApp service for sending messages
   * @param redisUrl Redis connection URL (optional)
   */
  constructor(sender: MessageSender, redisClient: Redis) {
    this.sender = sender;
    this.redisClient = redisClient;
  }
  

  /**
   * Generates a Redis key for a user's cart
   */
  private getCartKey(userId: string): string {
    return `${this.keyPrefix}${userId}`;
  }
  
  /**
   * Retrieves a user's cart from Redis
   */
  async getCart(userId: string): Promise<Cart> {
    try {
      const cartJson = await this.redisClient.get(this.getCartKey(userId));
      
      if (cartJson) {
        return JSON.parse(cartJson) as Cart;
      }
    } catch (error) {
      console.error(`Error retrieving cart for user ${userId}:`, error);
    }
    
    // Return an empty cart if none exists
    return {
      items: [],
      total: 0,
      totalAmount: 0,
      subtotal: 0,
      tax: 0,
      discounts: []
    };
  }
  
  /**
   * Saves a user's cart to Redis
   */
  private async saveCart(userId: string, cart: Cart): Promise<void> {
    try {
      await this.redisClient.set(
        this.getCartKey(userId),
        JSON.stringify(cart),
        "EX",
        this.expiryTime
      );
    } catch (error) {
      console.error(`Error saving cart for user ${userId}:`, error);
      throw error;
    }
  }
  /**
   * Adds an item to the user's cart
   */
  async addItemToCart(userId: string, itemId: string, quantity: number = 1): Promise<Cart> {
    try {
      const cart = await this.getCart(userId);
      const existingItemIndex = cart.items.findIndex(item => item.id === itemId);
      
      // Find the menu item to get details
      const menuItem = findMenuItemById(itemId);
      
      if (!menuItem) {
        throw new Error(`Item with ID ${itemId} not found in menu`);
      }
      
      if (existingItemIndex >= 0) {
        // Update quantity if item already exists
        cart.items[existingItemIndex].quantity += quantity;
      } else {
        // Add new item
        const cartItem: CartItem = {
          id: itemId,
          name: menuItem.title,
          price: menuItem.price || 0,
          quantity: quantity,
          specialInstructions: ""
        };
        
        cart.items.push(cartItem);
      }
      
      // Recalculate totals
      this.recalculateCartTotals(cart);
      
      // Save updated cart
      await this.saveCart(userId, cart);
      
      return cart;
    } catch (error) {
      console.error(`Error adding item ${itemId} to cart for user ${userId}:`, error);
      throw error;
    }
  }
  
  /**
   * Removes an item from the user's cart
   */
  async removeFromCart(userId: string, itemId: string): Promise<Cart> {
    try {
      const cart = await this.getCart(userId);
      
      // Filter out the item to remove
      cart.items = cart.items.filter(item => item.id !== itemId);
      
      // Recalculate totals
      this.recalculateCartTotals(cart);
      
      // Save updated cart
      await this.saveCart(userId, cart);
      
      return cart;
    } catch (error) {
      console.error(`Error removing item ${itemId} from cart for user ${userId}:`, error);
      throw error;
    }
  }
  
  /**
   * Updates the quantity of an item in the cart
   */
  async updateItemQuantity(userId: string, itemId: string, quantity: number): Promise<Cart> {
    try {
      const cart = await this.getCart(userId);
      const itemIndex = cart.items.findIndex(item => item.id === itemId);
      
      if (itemIndex >= 0) {
        if (quantity <= 0) {
          // Remove item if quantity is zero or negative
          return this.removeFromCart(userId, itemId);
        }
        
        // Update quantity
        cart.items[itemIndex].quantity = quantity;
        
        // Recalculate totals
        this.recalculateCartTotals(cart);
        
        // Save updated cart
        await this.saveCart(userId, cart);
      }
      
      return cart;
    } catch (error) {
      console.error(`Error updating quantity for item ${itemId} in cart for user ${userId}:`, error);
      throw error;
    }
  }
  
  /**
   * Adds special instructions to an item
   */
  async addSpecialInstructions(userId: string, instructions: string, itemId: string): Promise<Cart> {
    try {
      const cart = await this.getCart(userId);
      const itemIndex = cart.items.findIndex(item => item.id === itemId);
      
      if (itemIndex >= 0) {
        // Update instructions
        cart.items[itemIndex].specialInstructions = instructions;
        
        // Save updated cart
        await this.saveCart(userId, cart);
      }
      
      return cart;
    } catch (error) {
      console.error(`Error adding instructions for item ${itemId} in cart for user ${userId}:`, error);
      throw error;
    }
  }
  
  /**
   * Clears the user's cart
   */
  async clearCart(userId: string): Promise<void> {
    try {
      await this.redisClient.del(this.getCartKey(userId));
    } catch (error) {
      console.error(`Error clearing cart for user ${userId}:`, error);
      throw error;
    }
  }
  
  /**
   * Applies a discount to the cart
   */
  async applyDiscount(userId: string, code: string): Promise<{ success: boolean, discountAmount: number }> {
    try {
      // Here you would validate the promo code against your database
      // For this example, we'll simulate a valid promo code "WELCOME10" for 10% off
      if (code.toUpperCase() === "WELCOME10") {
        const cart = await this.getCart(userId);
        
        // Calculate discount amount (10% of subtotal)
        const discountAmount = cart.subtotal * 0.1;
        
        // Add to discounts array
        cart.discounts.push({
          code: code.toUpperCase(),
          amount: discountAmount,
          type: "percentage",
          value: 10
        });
        
        // Recalculate totals
        this.recalculateCartTotals(cart);
        
        // Save updated cart
        await this.saveCart(userId, cart);
        
        return { success: true, discountAmount };
      }
      
      return { success: false, discountAmount: 0 };
    } catch (error) {
      console.error(`Error applying discount code ${code} for user ${userId}:`, error);
      throw error;
    }
  }
  
  /**
   * Recalculates cart totals including subtotal, tax, and total
   */
  private recalculateCartTotals(cart: Cart): void {
    // Calculate subtotal (sum of item prices * quantities)
    cart.subtotal = cart.items.reduce((total, item) => 
      total + (item.price * item.quantity), 0);
    
    // Calculate tax (assuming 8% tax rate)
    cart.tax = cart.subtotal * 0.08;
    
    // Calculate total discount amount
    const totalDiscount = cart.discounts.reduce((total, discount) => 
      total + discount.amount, 0);
    
    // Calculate final total
    cart.total = cart.subtotal + cart.tax - totalDiscount;
  }
  
  /**
   * Sends a summary of the cart to the user
   */
  async sendCartSummary(userId: string): Promise<void> {
    try {
      const cart = await this.getCart(userId);
      
      if (!cart.items.length) {
        await this.sender.sendText(
          userId, 
          "Your cart is empty. Please add items before checkout."
        );
        return;
      }
      
      // Create cart summary text
      let summaryText = "🛒 *Your Cart*\n\n";
      
      // Add each item with quantity, price, and special instructions
      cart.items.forEach((item, index) => {
        summaryText += `${index + 1}. ${item.name} x${item.quantity} - $${(item.price * item.quantity).toFixed(2)}\n`;
        
        if (item.specialInstructions) {
          summaryText += `   _Note: ${item.specialInstructions}_\n`;
        }
      });
      
      // Add subtotal, tax, discounts, and total
      summaryText += `\n*Subtotal:* $${cart.subtotal.toFixed(2)}\n`;
      summaryText += `*Tax:* $${cart.tax.toFixed(2)}\n`;
      
      // Add any discounts
      if (cart.discounts.length > 0) {
        cart.discounts.forEach(discount => {
          summaryText += `*Discount (${discount.code}):* -$${discount.amount.toFixed(2)}\n`;
        });
      }
      
      summaryText += `*Total:* $${cart.total.toFixed(2)}\n`;
      
      // Send the cart summary
      await this.sender.sendText(userId, summaryText);
      
      // Send cart action buttons
      await this.sender.sendReplyButtons(
          userId,
      
          "What would you like to do with your cart?",
          {
            "checkout": "Checkout",
            "main-menu": "Continue Shopping",
            "cancel-order": "Clear Cart"
          },          
        );
    } catch (error) {
      console.error(`Error sending cart summary for user ${userId}:`, error);
      throw error;
    }
  }
  
  /**
   * Initiates the customization flow for an item
   */
  async startItemCustomization(userId: string, itemId: string): Promise<void> {
    try {
      const menuItem = findMenuItemById(itemId);
      
      if (!menuItem) {
        throw new Error(`Item with ID ${itemId} not found in menu`);
      }
      
      // Here you would check which customizations are available for this item
      // and send appropriate interactive messages
      
      // For this example, we'll just prompt for special instructions
      await this.sender.sendReplyButtons(
        userId, "Would you like to add any special instructions for this item?",
            {
              "add-instructions": "Add Instructions",
              "confirm-customization": "Add to Cart"
            },          
        );
    } catch (error) {
      console.error(`Error starting customization for item ${itemId} for user ${userId}:`, error);
      throw error;
    }
  }
  
}
