// services/userStateService.ts
import { UserState, OrderFlow, OrderStep } from "../data/types";
import Redis from "ioredis";

/**
 * Manages user state throughout the ordering process using Redis
 */
export class UserStateService {
  private redisClient: Redis;
  private readonly keyPrefix: string = "user:state:";
  private readonly expiryTime: number = 60 * 60 * 24; // 24 hours in seconds
  
  /**
   * Creates a new UserStateService
   * @param redisUrl Redis connection URL (optional)
   */
  constructor(redisClient: Redis) {
    this.redisClient = redisClient;
  }
  
  /**
   * Generates a Redis key for a user
   */
  private getUserKey(userId: string): string {
    return `${this.keyPrefix}${userId}`;
  }
  
  /**
   * Retrieves the current state for a user from Redis
   */
  async getUserState(userId: string): Promise<UserState> {
    try {
      const stateJson = await this.redisClient.get(this.getUserKey(userId));
      
      if (stateJson) {
        return JSON.parse(stateJson) as UserState;
      }
    } catch (error) {
      console.error(`Error retrieving state for user ${userId}:`, error);
    }
    
    // Default initial state if none exists
    return {
      flow: "browsing",
      step: "main_menu",
      currentCategory: null,
      currentSubcategory: null,
      selectedItems: [],
      paymentMethod: null,
      deliveryAddress: null,
      deliveryType: null,
      lastInteractionAt: Date.now()
    };
  }
  
  /**
   * Updates the user's state in Redis
   */
  async updateUserState(userId: string, updates: Partial<UserState>): Promise<UserState> {
    try {
      const currentState = await this.getUserState(userId);
      const newState: UserState = { 
        ...currentState, 
        ...updates,
        lastInteractionAt: Date.now()
      };
      
      // Store in Redis with expiry
      await this.redisClient.set(
        this.getUserKey(userId),
        JSON.stringify(newState),
        "EX",
        this.expiryTime
      );
      
      return newState;
    } catch (error) {
      console.error(`Error updating state for user ${userId}:`, error);
      throw error;
    }
  }
  
  /**
   * Sets the ordering flow state
   */
  async setOrderFlow(userId: string, flow: OrderFlow, step: OrderStep): Promise<UserState> {
    return this.updateUserState(userId, { flow, step });
  }
  
  /**
   * Sets the current menu context
   */
  async setMenuContext(userId: string, category: string, subcategory?: string): Promise<UserState> {
    return this.updateUserState(userId, { 
      currentCategory: category,
      currentSubcategory: subcategory || null,
      flow: "browsing", 
      step: subcategory ? "item_list" : "category" 
    });
  }
  
  /**
   * Updates checkout information
   */
  async setCheckoutInfo(
    userId: string, 
    deliveryType: "pickup" | "delivery", 
    address?: string
  ): Promise<UserState> {
    return this.updateUserState(userId, {
      flow: "checkout",
      step: address ? "selecting_payment" : "location_input",
      deliveryType,
      deliveryAddress: address || null,
      hasDeliveryAddress: !!address
    });
  }
  
  /**
   * Sets payment information
   */
  async setPaymentMethod(userId: string, paymentMethod: string): Promise<UserState> {
    return this.updateUserState(userId, {
      flow: "checkout", 
      step: "confirming_order",
      paymentMethod
    });
  }
  
  /**
   * Resets the user state to browsing
   */
  async resetState(userId: string): Promise<UserState> {
    return this.updateUserState(userId, {
      flow: "browsing",
      step: "main_menu",
      currentCategory: null,
      currentSubcategory: null,
      selectedItems: [],
      paymentMethod: null,
      deliveryAddress: null,
      deliveryType: null
    });
  }
  
  /**
   * Deletes a user's state from Redis
   */
  async deleteUserState(userId: string): Promise<boolean> {
    try {
      const result = await this.redisClient.del(this.getUserKey(userId));
      return result > 0;
    } catch (error) {
      console.error(`Error deleting state for user ${userId}:`, error);
      return false;
    }
  }
  
}
