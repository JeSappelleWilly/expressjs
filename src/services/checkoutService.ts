// services/checkoutService.ts
import { CartService } from "./cartService";
import { UserStateService } from "./userStateService";
import { extractDataWithOmniAI } from "./ocr";
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
                    "Votre panier est vide. Veuillez ajouter des articles avant de passer à la caisse."
                );
                return;
            }
            
            // Send delivery options message
            await this.sender.sendReplyButtons(
                sender,
                "Comment souhaitez-vous recevoir votre commande ?",
                {
                    "pickup": "Retrait en Magasin",
                    "delivery": "Livraison",
                },
            );
            
            // Update user state to checkout flow
            await this.userStateService.setOrderFlow(sender, "checkout", "selecting_delivery_type");
            
        } catch (error) {
            console.error(`Error initiating checkout for user ${sender}:`, error);
            await this.sender.sendText(
                sender,
                "Désolé, une erreur est survenue. Veuillez réessayer."
            );
        }
    }
    async requestLocation(recipient: string) {
        try {
            // Update user state
            await this.userStateService.setCheckoutInfo(recipient, "delivery");
            
            // Send pickup confirmation
            await this.sender.requestLocation(
                recipient,
                "Partagez votre position pour la livraison"
            );
            
            
        } catch (error) {
            console.error(`Error setting up pickup order for user ${recipient}:`, error);
            await this.sender.sendText(
                recipient,
                "Erreur lors du traitement. Veuillez réessayer."
            );
        }    }
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
                "Retrait choisi. Votre commande sera prête dans notre boutique."
            );
            
            // Proceed to payment options
            await this.sendPaymentOptions(sender);
            
        } catch (error) {
            console.error(`Error setting up pickup order for user ${sender}:`, error);
            await this.sender.sendText(
                sender,
                "Erreur lors du traitement. Veuillez réessayer."
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
                    "share-location": "Partager position",
                    "cancel-checkout": "Annuler"
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
                "Erreur lors du traitement. Veuillez réessayer."
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
                    "Veuillez fournir une adresse valide pour la livraison."
                );
                return;
            }
            
            // Update user state with address
            await this.userStateService.setCheckoutInfo(sender, "delivery", address);
            
            // Confirm address and proceed to payment
            await this.sender.sendText(
                sender,
                `Votre adresse de livraison est définie comme :\n\n${address}`
            );
            
            // Proceed to payment options
            await this.sendPaymentOptions(sender);
            
        } catch (error) {
            console.error(`Error processing delivery address for user ${sender}:`, error);
            await this.sender.sendText(
                sender,
                "Erreur lors de l'enregistrement. Veuillez réessayer."
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
                            `Position à ${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`;
            
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
                `Votre lieu de livraison est défini comme :\n\n${address}`
            );
            
            // Proceed to payment options
            await this.sendPaymentOptions(sender);
            
        } catch (error) {
            console.error(`Error saving customer location for user ${sender}:`, error);
            await this.sender.sendText(
                sender,
                "Erreur d'enregistrement. Veuillez réessayer."
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
                    "Position non reçue. Réessayez ou saisissez votre adresse."
                );
                return;
            }
            
            await this.saveCustomerLocation(sender, location);
            
        } catch (error) {
            console.error(`Error processing delivery location for user ${sender}:`, error);
            await this.sender.sendText(
                sender,
                "Erreur de traitement. Veuillez réessayer."
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
                    { id: "pay-cash", title: "Comptant", description: "Payez à la réception" },
                    { id: "pay-credit-card", title: "Carte bancaire", description: "Paiement sécurisé en ligne" },
                    { id: "pay-mobile-payment", title: "Paiement mobile", description: "Via applications mobiles" }
            ];
            
            // Send payment options
            await this.sender.sendList(
                    sender, "Valider", "Choisissez votre mode de paiement :", 
                    { "Options de paiement": sections}
                )
            
            
        } catch (error) {
            console.error(`Error sending payment options to user ${sender}:`, error);
            await this.sender.sendText(
                sender,
                "Erreur de traitement. Veuillez réessayer."
            );
        }
    }

    async sendDeliveryOptions(sender: string): Promise<void> {
        try {
            const sections: { [sectionTitle: string]: { id: string; title: string, description: string }[] } = {
                Prioritaire: [
                    {
                        "id": "del-priority_express",
                        "title": "Express",
                        "description": "1 à 2 jours"
                      },
                      {
                        "id": "del-priority_mail",
                        "title": "Prioritaire",
                        "description": "1 à 3 jours"
                      }
                  ],
                  Standard: [
                      {
                        "id": "del-usps_ground_advantage",
                        "title": "Standard",
                        "description": "2 à 5 jours"
                      },
                      {
                        "id": "del-media_mail",
                        "title": "Économique",
                        "description": "2 à 8 jours"
                      }
                  ]}
              
        
        /// Send payment options
        await this.sender.sendList(
                sender, "Valider", "Choisissez votre option d'expédition :", 
                sections,
                {
                    footerText: "Dokal Food: Votre porte vers les succulents™",
                    header: {
                        type: "text",
                        text: "Mode d'expédition"
                    }
                }
            )
        } catch (error) {
            console.error(`Error sending payment options to user ${sender}:`, error);
            await this.sender.sendText(
                sender,
                "Erreur de traitement. Veuillez réessayer."
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
                case "pay-cash":
                    paymentMethod = "cash";
                    paymentDescription = "Paiement à la livraison";
                    break;
                case "pay-credit-card":
                    paymentMethod = "credit_card";
                    paymentDescription = "Carte bancaire";
                    break;
                case "pay-mobile-payment":
                    paymentMethod = "mobile_payment";
                    paymentDescription = "Paiement mobile";
                    break;
                default:
                    paymentMethod = "cash";
                    paymentDescription = "Paiement à la livraison";
            }
            
            // Update user state with payment method
            await this.userStateService.setPaymentMethod(sender, paymentMethod);
            
            // Confirm payment method selection
            await this.sender.sendText(
                sender,
                `Vous avez choisi ${paymentDescription} comme mode de paiement.`
            );
            
            // For credit card or mobile payment, we would typically redirect to payment gateway
            // For this example, we'll just proceed to order confirmation
            if (paymentMethod === "credit_card" || paymentMethod === "mobile_payment") {
                await this.sender.sendText(
                    sender,
                    "Pour cette démo, nous simulerons le paiement automatiquement."
                );
            }
            
            // Send order summary and confirmation request
            await this.sendOrderSummary(sender);
            
        } catch (error) {
            console.error(`Error processing payment method for user ${sender}:`, error);
            await this.sender.sendText(
                sender,
                "Erreur de traitement. Veuillez réessayer."
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
            let summaryText = "📋 *Récapitulatif*\n\n";
            
            // Add items
            cart.items.forEach((item, index) => {
                summaryText += `${index + 1}. ${item.name} x${item.quantity} - ${(item.price * item.quantity).toFixed(2)}€\n`;
                
                if (item.specialInstructions) {
                    summaryText += `   _Note: ${item.specialInstructions}_\n`;
                }
            });
            
            // Add subtotal, tax, discounts, and total
            summaryText += `\n*Sous-total:* ${cart.subtotal.toFixed(2)}€\n`;
            summaryText += `*Taxes:* ${cart.tax.toFixed(2)}€\n`;
            
            // Add any discounts
            if (cart.discounts && cart.discounts.length > 0) {
                cart.discounts.forEach(discount => {
                    summaryText += `*Remise (${discount.code}):* -${discount.amount.toFixed(2)}€\n`;
                });
            }
            
            summaryText += `*Total:* ${cart.total.toFixed(2)}€\n\n`;
            
            // Add delivery info
            if (userState.deliveryType === "delivery") {
                summaryText += `*Adresse:* ${userState.deliveryAddress}\n`;
            } else {
                summaryText += "*Retrait en magasin*\n";
            }
            
            // Add payment method
            const paymentMethod = userState.paymentMethod === "credit_card" 
                ? "Carte bancaire" 
                : userState.paymentMethod === "mobile_payment" 
                    ? "Paiement mobile" 
                    : "Paiement à la livraison";
            
            summaryText += `*Paiement:* ${paymentMethod}\n\n`;
            
            summaryText += "Confirmez ou modifiez votre commande.";
            
            // Send summary
            await this.sender.sendText(sender, summaryText);
            
            // Send confirmation buttons
            await this.sender.sendReplyButtons( sender,  "Commander maintenant ?", 
                        {
                        "confirm-order": "Commander" ,
                        "cancel-order": "Annuler",
                }
            );
            
        } catch (error) {
            console.error(`Error sending order summary for user ${sender}:`, error);
            await this.sender.sendText(
                sender,
                "Erreur de traitement. Veuillez réessayer."
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
    
            // Create a temporary order object with a pending_payment_confirmation status
            const tempOrder = {
                id: orderId,
                userId: sender,
                items: cart.items,
                subtotal: cart.subtotal,
                tax: cart.tax,
                total: cart.total,
                discounts: cart.discounts || [],
                deliveryType: userState.deliveryType || "pickup",
                deliveryAddress: userState.deliveryAddress || null,
                paymentMethod: "mobile_payment_ocr", // Indicate the payment method
                status: "pending_payment_confirmation",
                createdAt: Date.now(),
                estimatedDeliveryTime: this.calculateEstimatedDelivery(userState.deliveryType || "pickup")
            };
    
            // Save the temporary order to Redis
            await this.redisClient.set(
                this.getOrderKey(orderId),
                JSON.stringify(tempOrder),
                "EX",
                this.expiryTime
            );
    
            // Request the payment confirmation picture from the user
            await this.sender.sendText(
                sender,
                "Veuillez envoyer une photo de la confirmation de votre paiement mobile pour que nous puissions traiter votre commande."
            );
    
            // Update user state to indicate they need to send the payment confirmation
            await this.userStateService.updateUserState(sender, {
                step: "waiting_for_payment_confirmation",
                currentOrderId: orderId // Store the order ID for the next step
            });
    
        } catch (error) {
            console.error(`Error requesting payment confirmation for user ${sender}:`, error);
            await this.sender.sendText(
                sender,
                "Erreur lors de la demande de confirmation de paiement. Veuillez réessayer."
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
                "Commande annulée. Articles sauvegardés pour plus tard."
            );
            
            // Send return to menu button
            await this.sender.sendReplyButtons(
                    sender,
                    "Continuez vos achats ou consultez votre panier.",
                        {
                         "main-menu": "Menu principal",
                         "view-cart": "Voir panier",
                        },
                )
            
            
        } catch (error) {
            console.error(`Error cancelling order for user ${sender}:`, error);
            await this.sender.sendText(
                sender,
                "Erreur d'annulation. Veuillez réessayer."
            );
        }
    }

    async requestPaymentConfirmationPicture(sender: string): Promise<void> {
        try {
            // Get user's cart
            const cart = await this.cartService.getCart(sender);
            const userState = await this.userStateService.getUserState(sender); // Get the user state

            // Generate unique order ID
            const orderId = this.generateOrderId();

            // Create a temporary order in Redis
            const tempOrder = {
                id: orderId,
                userId: sender,
                items: cart.items,
                subtotal: cart.subtotal,
                tax: cart.tax,
                total: cart.total,
                discounts: cart.discounts || [],
                deliveryType: userState.deliveryType || "pickup", // Use userState.deliveryType
                deliveryAddress: userState.deliveryAddress || null, // Use userState.deliveryAddress
                paymentMethod: "mobile_payment_ocr",
                status: "pending_payment_confirmation",
                createdAt: Date.now(),
                estimatedDeliveryTime: this.calculateEstimatedDelivery(userState.deliveryType || "pickup") // Use userState.deliveryType
            };

            await this.redisClient.set(
                this.getOrderKey(orderId),
                JSON.stringify(tempOrder),
                "EX",
                this.expiryTime
            );

            // Request the payment confirmation picture
            await this.sender.sendText(
                sender,
                "Veuillez envoyer une photo de la confirmation de votre paiement mobile pour que nous puissions traiter votre commande."
            );

            // Update user state
            await this.userStateService.updateUserState(sender, {
                step: "waiting_for_payment_confirmation",
                currentOrderId: orderId
            });

        } catch (error) {
            console.error(`Error requesting payment confirmation from ${sender}:`, error);
            await this.sender.sendText(sender, "Erreur lors de la demande de confirmation de paiement.");
        }
    }

    async processPaymentConfirmationPicture(sender: string, imageUrl: string): Promise<void> {
        try {
            const userState = await this.userStateService.getUserState(sender);
            const orderId = userState.currentOrderId;
            const templateId = "your-payment-confirmation-template-id"; // Replace with your actual template ID

            if (!orderId) {
                console.error(`No order ID found in user state for ${sender}.`);
                await this.sender.sendText(sender, "Impossible de trouver la commande associée. Veuillez réessayer.");
                return;
            }

            await this.sender.sendText(sender, "Traitement de la confirmation de paiement...");
            const extractedData = await extractDataWithOmniAI(imageUrl, templateId);

            if (extractedData) {
                console.log("Extracted Payment Confirmation Data:", extractedData);

                // Update the order status in Redis to indicate payment confirmed
                const orderKey = this.getOrderKey(orderId);
                const orderData = await this.redisClient.get(orderKey);
                if (orderData) {
                    const order = JSON.parse(orderData);
                    order.status = "payment_confirmed";
                    await this.redisClient.set(orderKey, JSON.stringify(order), "EX", this.expiryTime);

                    await this.sender.sendText(sender, "Confirmation de paiement reçue et validée. Votre commande est en cours de traitement.");

                    // Proceed with the final order confirmation and potentially send a summary
                    await this.sendFinalOrderConfirmation(sender, orderId); // New function
                } else {
                    console.error(`Order data not found in Redis for order ID: ${orderId}`);
                    await this.sender.sendText(sender, "Erreur lors de la mise à jour de la commande. Veuillez réessayer.");
                }

                // Reset user state (optional, depending on your flow)
                await this.userStateService.resetState(sender);

            } else {
                await this.sender.sendReplyButtons(sender, "La confirmation de paiement n'a pas pu être validée. Veuillez réessayer d'envoyer la photo ou contactez le support.", {
                    "help": "Besoin d'assistance",
                    "menu": "Menu"
                });

                // Optionally update the order status to payment_failed
                const orderKey = this.getOrderKey(orderId);
                const orderData = await this.redisClient.get(orderKey);
                if (orderData) {
                    const order = JSON.parse(orderData);
                    order.status = "payment_failed";
                    await this.redisClient.set(orderKey, JSON.stringify(order), "EX", this.expiryTime);
                }
            }

        } catch (error) {
            console.error(`Error processing payment confirmation picture for ${sender}:`, error);
            await this.sender.sendText(
                sender,
                "Erreur lors du traitement de la confirmation de paiement. Veuillez réessayer."
            );
        }
    }

    async sendFinalOrderConfirmation(sender: string, orderId: string): Promise<void> {
        try {
            const orderKey = this.getOrderKey(orderId);
            const orderData = await this.redisClient.get(orderKey);

            if (orderData) {
                const order = JSON.parse(orderData);

                let confirmationMessage = `✅ *Commande confirmée!* (Paiement validé par image)\n\nVotre commande n°${order.id} a été reçue et est en cours de traitement.\n\n`;
                order.items.forEach((item:any, index:any) => {
                    confirmationMessage += `${index + 1}. ${item.name} x${item.quantity} - ${(item.price * item.quantity).toFixed(2)}€\n`;
                });
                confirmationMessage += `\nTotal: ${order.total.toFixed(2)}€\n`;
                if (order.deliveryType === "delivery") {
                    confirmationMessage += `Adresse de livraison: ${order.deliveryAddress}\n`;
                    confirmationMessage += `Heure estimée: ${this.formatEstimatedTime(order.estimatedDeliveryTime)}\n`;
                } else {
                    confirmationMessage += `Retrait en magasin. Prêt vers ${this.formatEstimatedTime(order.estimatedDeliveryTime)}\n`;
                }

                await this.sender.sendText(sender, confirmationMessage);

                // Clear the cart
                await this.cartService.clearCart(sender);

                // Reset user state to browsing
                await this.userStateService.resetState(sender);

                // Send return to menu button
                await this.sender.sendReplyButtons(sender,"Nouvelle commande ou vérifiez votre statut.",
                    {
                        "main-menu": "Menu principal",
                        "my-orders": "Mes commandes",
                    },
                    {
                        header: {
                            type: "text",
                            text: "Que faire ensuite?"
                        }
                    })
            } else {
                console.error(`Order data not found in Redis for order ID: ${orderId}`);
                await this.sender.sendText(sender, "Erreur lors de l'envoi de la confirmation de commande.");
            }
        } catch (error) {
            console.error(`Error sending final order confirmation for ${sender}:`, error);
            await this.sender.sendText(sender, "Erreur lors de l'envoi de la confirmation finale.");
        }
    }
}
