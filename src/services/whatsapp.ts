import * as fs from 'fs';
import { ButtonMessageOptions, MenuCategory, MenuItem, MessageButton } from '../data/types';
import { headerImageUrls } from '../data/image';
import { menuCategories } from '../data/menuData';

const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN ?? ""
const WHATSAPP_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID ?? "574770619057271"
const WHATSAPP_API_URL = process.env.WHATSAPP_API_URL ?? ""
const BASE_IMAGE_URL = process.env.BASE_IMAGE_URL ?? "https://yourserver.com/images" // Replace with your base URL for images



// These functions are not defined in the original code but referenced
export function getMenuCategory(categoryId: string): MenuCategory | null {
  // Implementation would depend on where menu categories are defined
  return menuCategories.get(categoryId) || null;
}

export function getMenuItem(itemId: string): MenuItem | null {
  // Implementation would depend on where menu items are defined
  for (const [_, category] of menuCategories) {
    for (const [_, subcategory] of category.items) {
      if (subcategory.items?.has(itemId)) {
        return subcategory.items.get(itemId) || null;
      }
    }
  }
  return null;
}


// Send WhatsApp API requests
export async function sendWhatsAppRequest(payload: any): Promise<Response> {
  const token = WHATSAPP_TOKEN;
  if (!token) {
    throw new Error("WhatsApp API token not found");
  }

  const url = `${WHATSAPP_API_URL}/${WHATSAPP_PHONE_NUMBER_ID}/messages`
  
  return fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });
}

// Send a simple text message
export async function sendTextMessage(recipient: string, text: string): Promise<any> {
  try {
    const response = await sendWhatsAppRequest({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: recipient,
      type: "text",
      text: { body: text }
    });
    
    const data = await response.json();
    console.log('Text message sent:', data);
    return data;
  } catch (error) {
    console.error('Error sending text message:', error);
    throw error;
  }
}

// Create menu payload for WhatsApp API
export function createMenuPayload(categoryId: string, recipientNumber: string): any | null {
  const category = getMenuCategory(categoryId);
  
  if (!category) {
    return null;
  }
  
  const sections: Array<{title: string, rows: Array<{id: string, title: string, description: string}>}> = [];
  let currentSection = { title: category.title, rows: [] as Array<{id: string, title: string, description: string}> };
  
  // Convert items to rows format for WhatsApp API
  for (const [itemId, item] of category.items) {
    currentSection.rows.push({
      id: itemId,
      title: item.title,
      description: `${item.description} - $${item.price?.toFixed(2) || 'Price varies'}`
    });
    
    // WhatsApp has a limit of 10 items per section
    if (currentSection.rows.length >= 10) {
      sections.push(currentSection);
      currentSection = { title: `${category.title} (cont.)`, rows: [] };
    }
  }
  
  // Add remaining items
  if (currentSection.rows.length > 0) {
    sections.push(currentSection);
  }
  
  const payload: any = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: recipientNumber,
    type: "interactive",
    interactive: {
      type: "list",
      body: {
        text: category.description
      },
      footer: {
        text: "Thank you for choosing us! 🌟"
      },
      action: {
        button: "View Options",
        sections: sections
      }
    }
  };

  // Add header with image if available

    // No image specified, use text header
    payload.interactive.header = {
      type: "text",
      text: `🍽️ ${category.title}`
    };
  
  return payload;
}


export async function sendMainMenu(recipient: string): Promise<any> {
  try {
    const sections: Array<{title: string, rows: Array<{id: string, title: string, description: string}>}> = [];
    
    // Convert menu structure to WhatsApp API format
    for (const [categoryKey, category] of menuCategories) {
      const section = {
        title: category.title,
        rows: [] as Array<{id: string, title: string, description: string}>
      };
      
      for (const [subcategoryKey, subcategory] of category.items) {
        section.rows.push({
          id: subcategory.id || subcategoryKey,
          title: subcategory.title,
          description: subcategory.description
        });
      }
      
      sections.push(section);
    }
    
    const payload: any = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: recipient,
      type: "interactive",
      interactive: {
        type: "list",
        header: {
            type: "text",
            text: "🍔 KFC Main Menu"
        },
        body: {
        text: "Welcome to our restaurant! Please select a category to view our delicious options:"
        },
        footer: {
          text: "Thank you for choosing us! 🌟"
        },
        action: {
          button: "View Menu",
          sections: sections
        }
      }
    };  

    const response = await sendWhatsAppRequest(payload);
    const data = await response.json();
    console.log('Main menu sent:', data);
    return data;
  } catch (error) {
    console.error('Error sending main menu:', error);
    throw error;
  }
}

// Send a specific category menu
export async function sendCategoryMenu(recipient: string, categoryId: string): Promise<any | void> {
  try {
    const payload = createMenuPayload(categoryId, recipient);
    
    if (!payload) {
      await sendTextMessage(recipient, "Sorry, that menu category is not available.");
      await sendWhatsAppRequest(createNavigationButtons(recipient));
      return;
    }
    
    const response = await sendWhatsAppRequest(payload);
    const data = await response.json();
    console.log(`${categoryId} menu sent:`, data);
    
    // Send navigation buttons after sending the menu
    await sendWhatsAppRequest(createNavigationButtons(recipient, categoryId));
    
    return data;
  } catch (error) {
    console.error(`Error sending ${categoryId} menu:`, error);
    throw error;
  }
}

// Send item details
export async function sendItemDetails(recipient: string, itemId: string): Promise<any | void> {
  const item = getMenuItem(itemId);
  
  if (!item) {
    await sendTextMessage(recipient, "Sorry, that item is not available.");
    await sendWhatsAppRequest(createNavigationButtons(recipient));
    return;
  }
  
  // Get parent category for navigation and image
  let parentCategoryId: string | null = null;
  for (const [categoryKey, category] of menuCategories) {
    for (const [subcategoryKey, subcategory] of category.items) {
      if (subcategory.items && subcategory.items.has(itemId)) {
        parentCategoryId = subcategoryKey;
        break;
      }
    }
    if (parentCategoryId) break;
  }
  
  // Check if this item has a specific image URL, otherwise use parent category image
  const imageUrl = headerImageUrls[itemId] || 
                 (parentCategoryId ? headerImageUrls[parentCategoryId] : null);
  
  let headerContent: string = "🍽️ Menu Item";
  let headerType: 'text' | 'image' = "text";
  
  if (imageUrl) {
    headerType = "image";
    headerContent = imageUrl;
  }
  
  const message = createButtonMessage({
    recipient,
    bodyText: `${item.title}\n\n${item.description}\n\nPrice: $${item.price.toFixed(2)}`,
    footerText: "Would you like to order this item?",
    headerType: headerType,
    headerContent: headerContent,
    buttons: [
      { id: `add-${itemId}`, title: "Add to Cart" },
      parentCategoryId ? { id: `back-${parentCategoryId}`, title: "Back" } : { id: "main-menu", title: "Main Menu" },
      { id: "checkout", title: "Checkout" }
    ]
  });
  
  const response = await sendWhatsAppRequest(message);
  return response.json();
}

// Create navigation buttons
export function createNavigationButtons(recipient: string, currentCategory: string | null = null): any {
  const buttons: MessageButton[] = [];
  
  // If we're in a subcategory, add "Back to Main Menu" button
  if (currentCategory) {
    buttons.push({ id: "main-menu", title: "Main Menu" });
  }
  
  // If user has items in cart, add checkout button
  // This would require cart tracking - placeholder for now
  const hasItemsInCart = false; // Replace with actual cart check
  if (hasItemsInCart) {
    buttons.push({ id: "checkout", title: "Checkout" });
  } else {
    // If no items in cart and we're in main menu, maybe add a popular option
    if (!currentCategory) {
      buttons.push({ id: "specials", title: "Today's Specials" });
    }
  }
  
  // Always have help option
  buttons.push({ id: "help", title: "Help" });
  
  return createButtonMessage({
    recipient,
    bodyText: currentCategory 
      ? `You are viewing ${currentCategory}. What would you like to do next?`
      : "How would you like to proceed?",
    headerType: "text", 
    headerContent: "🧭 Navigation",
    buttons: buttons.slice(0, 3) // WhatsApp only allows up to 3 buttons
  });
}

// Create help message
export async function sendHelpMessage(recipient: string): Promise<any> {
  const message = createButtonMessage({
    recipient,
    bodyText: "Here's how to use our chatbot:\n\n• Type 'menu' to see our full menu\n• Select categories to explore dishes\n• Use buttons to navigate easily\n• Add items to your cart and checkout when ready",
    headerType: "text",
    headerContent: "❓ Help & Guide",
    buttons: [
      { id: "main-menu", title: "Main Menu" },
      { id: "specials", title: "Today's Specials" }
    ]
  });
  
  const response = await sendWhatsAppRequest(message);
  return response.json();
}

// Create interactive button message with customizable options
export function createButtonMessage({
  recipient,
  bodyText,
  footerText = "Thank you for choosing us! 🌟",
  headerType = "text",
  headerContent = "🍽️ Restaurant Menu",
  buttons = [
    { id: "change-button", title: "Change" },
    { id: "cancel-button", title: "Cancel" }
  ]
}: ButtonMessageOptions): any {
  const message: any = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: recipient,
    type: "interactive",
    interactive: {
      type: "button",
      body: {
        text: bodyText
      },
      footer: {
        text: footerText
      },
      action: {
        buttons: buttons.map(button => ({
          type: "reply",
          reply: {
            id: button.id,
            title: button.title
          }
        }))
      }
    }
  };

  // Add header based on provided type
  if (headerType === "text") {
    message.interactive.header = {
      type: "text",
      text: headerContent as string
    };
  } else if (headerType === "image") {
    message.interactive.header = {
      type: "image",
      image: {
        link: headerContent as string
      }
    };
  }

  return message;
}

// Send cart summary to the user
export async function sendCartSummary(recipient: string): Promise<any> {
  try {
    // Fetch cart data for the recipient
    const cart = await getCart(recipient);
    
    if (!cart || cart.items.length === 0) {
      await sendTextMessage(recipient, "Your cart is empty. Browse our menu to add items.");
      return sendWhatsAppRequest(createNavigationButtons(recipient));
    }
    
    // Prepare cart content as text
    let cartText = "🛒 *Your Cart*\n\n";
    let totalAmount = 0;
    
    cart.items.forEach((item: CartItem, index: number) => {
      const itemTotal = item.price * item.quantity;
      totalAmount += itemTotal;
      
      // Format each cart item
      cartText += `${index + 1}. ${item.name} x${item.quantity} - $${itemTotal.toFixed(2)}\n`;
      
      // Add customizations if any
      if (item.customizations && item.customizations.length > 0) {
        cartText += "   • " + item.customizations.join("\n   • ") + "\n";
      }
      
      // Add special instructions if any
      if (item.specialInstructions) {
        cartText += `   • Note: ${item.specialInstructions}\n`;
      }
      
      cartText += "\n";
    });
    
    // Add subtotal, tax, and total
    const tax = totalAmount * 0.08; // Assuming 8% tax
    let finalTotal = totalAmount + tax;
    
    cartText += `Subtotal: $${totalAmount.toFixed(2)}\n`;
    cartText += `Tax (8%): $${tax.toFixed(2)}\n`;
    
    // Add discount if applicable
    if (cart.discount && cart.discount > 0) {
      cartText += `Discount: -$${cart.discount.toFixed(2)}\n`;
      finalTotal -= cart.discount;
    }
    
    cartText += `\n*Total: $${finalTotal.toFixed(2)}*`;
    
    // Create buttons for cart actions
    const buttons: MessageButton[] = [
      { id: "checkout", title: "Checkout" },
      { id: "main-menu", title: "Add More" }
    ];
    
    // Add a clear cart button if there are items
    if (cart.items.length > 0) {
      buttons.push({ id: "cancel-order", title: "Clear Cart" });
    }
    
    const message = createButtonMessage({
      recipient,
      bodyText: cartText,
      footerText: "Ready to complete your order?",
      headerType: "text",
      headerContent: "🛒 Your Cart",
      buttons: buttons.slice(0, 3) // Maximum 3 buttons allowed
    });
    
    const response = await sendWhatsAppRequest(message);
    return response.json();
  } catch (error) {
    console.error('Error sending cart summary:', error);
    throw error;
  }
}

// Send order confirmation details
export async function sendOrderConfirmation(recipient: string, order: Order): Promise<any> {
  try {
    // Format order items and details for confirmation
    let orderText = "🎉 *Order Confirmed!* 🎉\n\n";
    orderText += `Order #: ${order.id}\n`;
    orderText += `Date: ${new Date().toLocaleString()}\n\n`;
    
    orderText += "*Order Details:*\n";
    order.items.forEach((item: CartItem, index: number) => {
      orderText += `${index + 1}. ${item.name} x${item.quantity} - $${(item.price * item.quantity).toFixed(2)}\n`;
      
      // Add customizations if any
      if (item.customizations && item.customizations.length > 0) {
        orderText += "   • " + item.customizations.join("\n   • ") + "\n";
      }
    });
    
    orderText += `\nSubtotal: $${order.subtotal.toFixed(2)}\n`;
    orderText += `Tax: $${order.tax.toFixed(2)}\n`;
    
    if (order.discount > 0) {
      orderText += `Discount: -$${order.discount.toFixed(2)}\n`;
    }
    
    orderText += `*Total: $${order.total.toFixed(2)}*\n\n`;
    
    // Add delivery/pickup info
    if (order.type === 'delivery') {
      orderText += `*Delivery Details:*\n`;
      orderText += `Address: ${order.deliveryAddress}\n`;
      orderText += `Estimated Delivery: ${order.estimatedTime} minutes\n`;
    } else {
      orderText += `*Pickup Details:*\n`;
      orderText += `Store: ${order.store.name}\n`;
      orderText += `Address: ${order.store.address}\n`;
      orderText += `Ready in: ${order.estimatedTime} minutes\n`;
    }
    
    orderText += `\nPayment Method: ${order.paymentMethod}\n`;
    
    if (order.paymentMethod === 'Cash on Delivery/Pickup') {
      orderText += "Please have the exact amount ready.\n";
    }
    
    orderText += "\nThank you for your order! 🙏";
    
    // Create buttons for order actions
    const message = createButtonMessage({
      recipient,
      bodyText: orderText,
      footerText: "We're preparing your order!",
      headerType: "text",
      headerContent: "✅ Order Confirmed",
      buttons: [
        { id: "main-menu", title: "Main Menu" },
        { id: "help", title: "Need Help?" }
      ]
    });
    
    const response = await sendWhatsAppRequest(message);
    return response.json();
  } catch (error) {
    console.error('Error sending order confirmation:', error);
    throw error;
  }
}

// Send nearby store locations based on customer location
export async function sendStoreLocations(
  recipient: string, 
  customerLocation?: CustomerLocation
): Promise<any> {
  try {
    // Get nearby stores (would typically use a location-based service)
    // For now, we'll use sample stores
    const stores: Store[] = await getNearbyStores(customerLocation);
    
    if (stores.length === 0) {
      await sendTextMessage(recipient, "Sorry, we couldn't find any stores near your location.");
      return;
    }
    
    // Format store information
    let storeText = "*Nearby Stores:*\n\n";
    
    stores.forEach((store, index) => {
      storeText += `*${index + 1}. ${store.name}*\n`;
      storeText += `📍 ${store.address}\n`;
      storeText += `📞 ${store.phone}\n`;
      storeText += `⏰ ${store.hours}\n`;
      
      if (store.distance) {
        storeText += `📏 ${store.distance.toFixed(1)} miles away\n`;
      }
      
      storeText += "\n";
    });
    
    storeText += "Select a store by responding with the store number.";
    
    // Send store locations as text message
    await sendTextMessage(recipient, storeText);
    
    // If fewer than 3 stores, create buttons for quick selection
    if (stores.length <= 3) {
      const buttons: MessageButton[] = stores.map((store, index) => ({
        id: `store-${store.id}`,
        title: `Store ${index + 1}`
      }));
      
      // Add a button to continue
      if (buttons.length < 3) {
        buttons.push({ id: "continue", title: "Continue" });
      }
      
      const message = createButtonMessage({
        recipient,
        bodyText: "Select a store for pickup:",
        headerType: "text",
        headerContent: "🏪 Select Store",
        buttons
      });
      
      await sendWhatsAppRequest(message);
    }
    
    return;
  } catch (error) {
    console.error('Error sending store locations:', error);
    throw error;
  }
}

// Send delivery time estimate
export async function sendDeliveryTimeEstimate(recipient: string): Promise<any> {
  try {
    // Get estimated delivery time (would typically be calculated based on distance, traffic, etc.)
    // For now, we'll use sample data
    const estimatedTime = getEstimatedDeliveryTime(recipient);
    
    const message = createButtonMessage({
      recipient,
      bodyText: `Estimated delivery time: ${estimatedTime.min}-${estimatedTime.max} minutes.\n\nYour order will be prepared and delivered as quickly as possible.`,
      headerType: "text",
      headerContent: "🕒 Delivery Estimate",
      buttons: [
        { id: "continue", title: "Continue" },
        { id: "cancel-order", title: "Cancel" }
      ]
    });
    
    const response = await sendWhatsAppRequest(message);
    return response.json();
  } catch (error) {
    console.error('Error sending delivery time estimate:', error);
    throw error;
  }
}

// Send payment options to the user
export async function sendPaymentOptions(recipient: string): Promise<any> {
  try {
    // Get available payment methods
    const paymentMethods = [
      {
        id: "payment-cash",
        title: "Cash",
        description: "Pay with cash on delivery or pickup"
      },
      {
        id: "payment-card",
        title: "Credit/Debit Card",
        description: "Pay securely with your card"
      },
      {
        id: "payment-wallet",
        title: "Digital Wallet",
        description: "Pay using your preferred digital wallet"
      }
    ];
    
    // Create sections for the list
    const sections = [{
      title: "Payment Methods",
      rows: paymentMethods.map(method => ({
        id: method.id,
        title: method.title,
        description: method.description
      }))
    }];
    
    // Prepare message with payment options
    const paymentMessage = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: recipient,
      type: "interactive",
      interactive: {
        type: "list",
        header: {
          type: "text",
          text: "💳 Payment Options"
        },
        body: {
          text: "Please select your preferred payment method:"
        },
        footer: {
          text: "All transactions are secure"
        },
        action: {
          button: "Select Payment",
          sections: sections
        }
      }
    };
    
    const response = await sendWhatsAppRequest(paymentMessage);
    return response.json();
  } catch (error) {
    console.error('Error sending payment options:', error);
    throw error;
  }
}
// Create menu payload for WhatsApp API
export function createMenuPayload(categoryId: string, recipientNumber: string): any | null {
  const category = getMenuCategory(categoryId);
  
  if (!category) {
    return null;
  }
  
  const sections: Array<{title: string, rows: Array<{id: string, title: string, description: string}>}> = [];
  let currentSection = { title: category.title, rows: [] as Array<{id: string, title: string, description: string}> };
  
  // Convert items to rows format for WhatsApp API
  for (const [itemId, item] of category.items) {
    currentSection.rows.push({
      id: itemId,
      title: item.title,
      description: `${item.description} - $${item.price?.toFixed(2) || 'Price varies'}`
    });
    
    // WhatsApp has a limit of 10 items per section
    if (currentSection.rows.length >= 10) {
      sections.push(currentSection);
      currentSection = { title: `${category.title} (cont.)`, rows: [] };
    }
  }
  
  // Add remaining items
  if (currentSection.rows.length > 0) {
    sections.push(currentSection);
  }
  
  const payload: any = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: recipientNumber,
    type: "interactive",
    interactive: {
      type: "list",
      body: {
        text: category.description
      },
      footer: {
        text: "Thank you for choosing us! 🌟"
      },
      action: {
        button: "View Options",
        sections: sections
      }
    }
  };

  // Add header with image if available
  if (headerImageUrls[categoryId]) {
    payload.interactive.header = {
      type: "image",
      image: {
        link: headerImageUrls[categoryId]
      }
    };
  } else {
    // No image specified, use text header
    payload.interactive.header = {
      type: "text",
      text: `🍽️ ${category.title}`
    };
  }
  
  return payload;
}


// Get estimated delivery time
function getEstimatedDeliveryTime(sender: string): { min: number, max: number } {
  // Implementation would go here - calculate based on location, traffic, etc.
  // Placeholder implementation
  return {
    min: 25,
    max: 40
  };
}
function getNearbyStores(customerLocation: CustomerLocation | undefined): Store[] | PromiseLike<Store[]> {
  throw new Error('Function not implemented.');
}


