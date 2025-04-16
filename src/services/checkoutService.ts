// services/checkoutService.ts
import { CartService } from "./cartService";
import { UserStateService } from "./userStateService";
import { WhatsAppService } from "./whatsappService";
import { MessageFactory } from "./messageFactory";
import Redis from "ioredis";
import { MessageSender } from "../types/bot";

/**
 * Service for managing the checkout process
 */
export class CheckoutService {
    private userStateService: UserStateService;
    private cartService: CartService;
    private redisClient: Redis;
    private sender: MessageSender;
    private readonly keyPrefix: string = "user:order:";
    private readonly expiryTime: number = 60 * 60 * 24 * 30; // 30 days in seconds
    
    /**
     * Creates a new CheckoutService
     * @param userStateService The user state service
     * @param cartService The cart service
     * @param whatsAppService The WhatsApp service
     * @param redisUrl Redis connection URL (optional)
     */
    constructor(
        userStateService: UserStateService, 
        cartService: CartService, 
        sender: MessageSender,
        redisClient: Redis
    ) {
        this.userStateService = userStateService;
        this.cartService = cartService;
        this.sender = sender;
        this.redisClient = redisClient;
    }
    
    /**
     * Generates a Redis key for a user's order
     */
    private getOrderKey(orderId: string): string {
        return `${this.keyPrefix}${orderId}`;
    }
    
    /**
     * Generates a unique order ID
     */
    private generateOrderId(): string {
        const timestamp = Date.now();
        const random = Math.floor(Math.random() * 10000);
        return `ORD-${timestamp}-${random}`;
    }
    
    /**
     * Initiates the checkout process
     */
    async initiateCheckout(sender: string): Promise<void> {
        try {
            // Get the user's cart
            const cart = await this.cartService.getCart(sender);
            
            // Check if cart is empty
            if (!cart.items || cart.items.length === 0) {
                await this.sender.sendText(
                    sender,
                    "Your cart is empty. Please add items before checkout."
                );
                return;
            }
            
            // Send delivery options message
            await this.sender.sendReplyButtons(
                sender,
                 "How would you like to receive your order?",
                {
                    "pickup" : "Pickup" ,
                    "delivery": "Delivery",
                },
            );
            
            // Update user state to checkout flow
            await this.userStateService.setOrderFlow(sender, "checkout", "selecting_delivery_type");
            
        } catch (error) {
            console.error(`Error initiating checkout for user ${sender}:`, error);
            await this.sender.sendText(
                sender,
                "Sorry, we encountered an error while starting checkout. Please try again."
            );
        }
    }
    
    /**
     * Sets up a pickup order
     */
    async setupPickupOrder(sender: string): Promise<void> {
        try {
            // Update user state
            await this.userStateService.setCheckoutInfo(sender, "pickup");
            
            // Send pickup confirmation
            await this.sender.sendText(
                sender,
                "You've selected Pickup. Your order will be ready for pickup at our store."
            );
            
            // Proceed to payment options
            await this.sendPaymentOptions(sender);
            
        } catch (error) {
            console.error(`Error setting up pickup order for user ${sender}:`, error);
            await this.sender.sendText(
                sender,
                "Sorry, we encountered an error while processing your pickup selection. Please try again."
            );
        }
    }
    
    /**
     * Sets up a delivery order
     */
    async setupDeliveryOrder(sender: string): Promise<void> {
        try {
            // Update user state
            await this.userStateService.setCheckoutInfo(sender, "delivery");
            const sections = {
                    "share-location": "Share Location",
                    "cancel-checkout": "Cancel"
                }                        
            
            // Ask for delivery address

            
            // Update user state to address input
            await this.userStateService.updateUserState(sender, {
                step: "location_input"
            });
            
        } catch (error) {
            console.error(`Error setting up delivery order for user ${sender}:`, error);
            await this.sender.sendText(
                sender,
                "Sorry, we encountered an error while processing your delivery selection. Please try again."
            );
        }
    }
    
    /**
     * Processes a text delivery address
     */
    async processDeliveryAddress(sender: string, address: string): Promise<void> {
        try {
            // Check if address is valid (basic validation)
            if (!address || address.trim().length < 5) {
                await this.sender.sendText(
                    sender,
                    "Please provide a valid address for delivery."
                );
                return;
            }
            
            // Update user state with address
            await this.userStateService.setCheckoutInfo(sender, "delivery", address);
            
            // Confirm address and proceed to payment
            await this.sender.sendText(
                sender,
                `Your delivery address has been set to:\n\n${address}`
            );
            
            // Proceed to payment options
            await this.sendPaymentOptions(sender);
            
        } catch (error) {
            console.error(`Error processing delivery address for user ${sender}:`, error);
            await this.sender.sendText(
                sender,
                "Sorry, we encountered an error while saving your address. Please try again."
            );
        }
    }
    
    /**
     * Saves a customer's location for delivery
     */
    async saveCustomerLocation(sender: string, location: { 
        latitude: number; 
        longitude: number; 
        name?: string; 
        address?: string; 
    }): Promise<void> {
        try {
            const address = location.address || 
                            location.name || 
                            `Location at ${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`;
            
            // Update user state with location
            await this.userStateService.setCheckoutInfo(sender, "delivery", address);
            
            // Store coordinates in user state
            await this.userStateService.updateUserState(sender, {
                locationCoordinates: {
                    latitude: location.latitude,
                    longitude: location.longitude
                }
            });
            
            // Confirm location and proceed to payment
            await this.sender.sendText(
                sender,
                `Your delivery location has been set to:\n\n${address}`
            );
            
            // Proceed to payment options
            await this.sendPaymentOptions(sender);
            
        } catch (error) {
            console.error(`Error saving customer location for user ${sender}:`, error);
            await this.sender.sendText(
                sender,
                "Sorry, we encountered an error while saving your location. Please try again."
            );
        }
    }
    
    /**
     * Processes a shared location for delivery
     */
    async processDeliveryLocation(sender: string, location?: { 
        latitude: number; 
        longitude: number; 
        name?: string; 
        address?: string; 
    }): Promise<void> {
        try {
            if (!location) {
                await this.sender.sendText(
                    sender,
                    "We couldn't process your location. Please try sharing it again or type your address instead."
                );
                return;
            }
            
            await this.saveCustomerLocation(sender, location);
            
        } catch (error) {
            console.error(`Error processing delivery location for user ${sender}:`, error);
            await this.sender.sendText(
                sender,
                "Sorry, we encountered an error while processing your location. Please try again."
            );
        }
    }
    
    /**
     * Sends payment method options to the user
     */
    async sendPaymentOptions(sender: string): Promise<void> {
        try {
            // Get user state
            const userState = await this.userStateService.getUserState(sender);
            
            // Update state to payment selection
            await this.userStateService.updateUserState(sender, {
                step: "selecting_payment"
            });
            const sections = [
                    { id: "cash", title: "Cash on Delivery", description: "Pay when your order arrives" },
                    { id: "credit-card", title: "Credit Card", description: "Pay securely online" },
                    { id: "mobile-payment", title: "Mobile Payment", description: "Pay using mobile payment apps" }
            ];
            
            // Send payment options
            await this.sender.sendList(
                    sender, "Submit", "Please select your preferred payment method:", 
                    { "Payment Options": sections}
                )
            
            
        } catch (error) {
            console.error(`Error sending payment options to user ${sender}:`, error);
            await this.sender.sendText(
                sender,
                "Sorry, we encountered an error while processing payment options. Please try again."
            );
        }
    }
    
    /**
     * Processes the selected payment method
     */
    async processPaymentMethod(sender: string, selectedId: string): Promise<void> {
        try {
            let paymentMethod: string;
            let paymentDescription: string;
            
            // Map the selected ID to a payment method
            switch (selectedId) {
                case "cash":
                    paymentMethod = "cash";
                    paymentDescription = "Cash on Delivery";
                    break;
                case "credit-card":
                    paymentMethod = "credit_card";
                    paymentDescription = "Credit Card";
                    break;
                case "mobile-payment":
                    paymentMethod = "mobile_payment";
                    paymentDescription = "Mobile Payment";
                    break;
                default:
                    paymentMethod = "cash";
                    paymentDescription = "Cash on Delivery";
            }
            
            // Update user state with payment method
            await this.userStateService.setPaymentMethod(sender, paymentMethod);
            
            // Confirm payment method selection
            await this.sender.sendText(
                sender,
                `You've selected ${paymentDescription} as your payment method.`
            );
            
            // For credit card or mobile payment, we would typically redirect to payment gateway
            // For this example, we'll just proceed to order confirmation
            if (paymentMethod === "credit_card" || paymentMethod === "mobile_payment") {
                await this.sender.sendText(
                    sender,
                    "For this demo, we'll simulate payment completion automatically."
                );
            }
            
            // Send order summary and confirmation request
            await this.sendOrderSummary(sender);
            
        } catch (error) {
            console.error(`Error processing payment method for user ${sender}:`, error);
            await this.sender.sendText(
                sender,
                "Sorry, we encountered an error while processing your payment selection. Please try again."
            );
        }
    }
    
    /**
     * Sends an order summary to the user
     */
    private async sendOrderSummary(sender: string): Promise<void> {
        try {
            // Get user's cart
            const cart = await this.cartService.getCart(sender);
            
            // Get user state for delivery and payment info
            const userState = await this.userStateService.getUserState(sender);
            
            // Create summary message
            let summaryText = "📋 *Order Summary*\n\n";
            
            // Add items
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
            if (cart.discounts && cart.discounts.length > 0) {
                cart.discounts.forEach(discount => {
                    summaryText += `*Discount (${discount.code}):* -$${discount.amount.toFixed(2)}\n`;
                });
            }
            
            summaryText += `*Total:* $${cart.total.toFixed(2)}\n\n`;
            
            // Add delivery info
            if (userState.deliveryType === "delivery") {
                summaryText += `*Delivery Address:* ${userState.deliveryAddress}\n`;
            } else {
                summaryText += "*Pickup at Store*\n";
            }
            
            // Add payment method
            const paymentMethod = userState.paymentMethod === "credit_card" 
                ? "Credit Card" 
                : userState.paymentMethod === "mobile_payment" 
                    ? "Mobile Payment" 
                    : "Cash on Delivery";
            
            summaryText += `*Payment Method:* ${paymentMethod}\n\n`;
            
            summaryText += "Please confirm your order or make changes.";
            
            // Send summary
            await this.sender.sendText(sender, summaryText);
            
            // Send confirmation buttons
            await this.sender.sendReplyButtons( sender,  "Would you like to place this order now?", 
                        {
                        "confirm-order": "Place Order" ,
                        "cancel-order": "Cancel",
                }
            );
            
        } catch (error) {
            console.error(`Error sending order summary for user ${sender}:`, error);
            await this.sender.sendText(
                sender,
                "Sorry, we encountered an error while creating your order summary. Please try again."
            );
        }
    }
    
    /**
     * Confirms and processes the final order
     */
    async confirmFinalOrder(sender: string): Promise<void> {
        try {
            // Get user state
            const userState = await this.userStateService.getUserState(sender);
            
            // Get user's cart
            const cart = await this.cartService.getCart(sender);
            
            // Generate unique order ID
            const orderId = this.generateOrderId();
            
            // Create order object
            const order = {
                id: orderId,
                userId: sender,
                items: cart.items,
                subtotal: cart.subtotal,
                tax: cart.tax,
                total: cart.total,
                discounts: cart.discounts || [],
                deliveryType: userState.deliveryType || "pickup",
                deliveryAddress: userState.deliveryAddress || null,
                paymentMethod: userState.paymentMethod || "cash",
                status: "pending",
                createdAt: Date.now(),
                estimatedDeliveryTime: this.calculateEstimatedDelivery(userState.deliveryType || "pickup")
            };
            
            // Save order to Redis
            await this.redisClient.set(
                this.getOrderKey(orderId),
                JSON.stringify(order),
                "EX",
                this.expiryTime
            );
            
            // Send confirmation message
            await this.sender.sendText(
                sender,
                `✅ *Order Confirmed!*\n\nYour order #${orderId} has been received and is being processed.\n\n${
                    order.deliveryType === "delivery" 
                        ? `Estimated delivery time: ${this.formatEstimatedTime(order.estimatedDeliveryTime)}`
                        : `Your order will be ready for pickup in approximately ${Math.floor((order.estimatedDeliveryTime - Date.now()) / 60000)} minutes.`
                }\n\nThank you for your order!`
            );
            
            // Clear the cart
            await this.cartService.clearCart(sender);
            
            // Reset user state to browsing
            await this.userStateService.resetState(sender);
            
            // Send return to menu button
            await this.sender.sendReplyButtons(sender,"You can place another order or check your order status.", 
                {
                    "main-menu": "Return to Menu",
                    "my-orders": "My Orders",
                },
                    {
                        header: {
                            type: "text",
                            text: "What would you like to do next?"
                        }
                    })        
            
        } catch (error) {
            console.error(`Error confirming final order for user ${sender}:`, error);
            await this.sender.sendText(
                sender,
                "Sorry, we encountered an error while processing your order. Please try again."
            );
        }
    }
    
    /**
     * Calculates estimated delivery time
     */
    private calculateEstimatedDelivery(deliveryType: string): number {
        const now = Date.now();
        
        // For pickup: 15-20 minutes
        // For delivery: 30-45 minutes
        const additionalMinutes = deliveryType === "delivery" 
            ? 30 + Math.floor(Math.random() * 15) // 30-45 minutes
            : 15 + Math.floor(Math.random() * 5);  // 15-20 minutes
            
        return now + (additionalMinutes * 60 * 1000); // Convert minutes to milliseconds
    }
    
    /**
     * Formats estimated time for display
     */
    private formatEstimatedTime(timestamp: number): string {
        const date = new Date(timestamp);
        const hours = date.getHours();
        const minutes = date.getMinutes();
        
        // Format as 12-hour time
        const period = hours >= 12 ? "PM" : "AM";
        const formattedHours = hours % 12 || 12;
        const formattedMinutes = minutes < 10 ? `0${minutes}` : minutes;
        
        return `${formattedHours}:${formattedMinutes} ${period}`;
    }
    
    /**
     * Cancels the current order/checkout process
     */
    async cancelOrder(sender: string): Promise<void> {
        try {
            // Reset user state to browsing
            await this.userStateService.resetState(sender);
            
            // Send cancellation confirmation
            await this.sender.sendText(
                sender,
                "Your order has been cancelled. Your cart items have been saved for later."
            );
            
            // Send return to menu button
            await this.sender.sendReplyButtons(
                    sender,
                    "You can continue shopping or view your cart.",
                        {
                         "main-menu": "Main Menu",
                         "view-cart": "View Cart",
                        },
                )
            
            
        } catch (error) {
            console.error(`Error cancelling order for user ${sender}:`, error);
            await this.sender.sendText(
                sender,
                "Sorry, we encountered an error while cancelling your order. Please try again."
            );
        }
    }
}
