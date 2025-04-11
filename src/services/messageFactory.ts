// services/messageFactory.ts
import { MessageButton, WhatsAppMessage } from "../data/types";

export class MessageFactory {
  /**
   * Creates a text message payload
   */
  static createTextMessage(recipient: string, text: string): any {
    return {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: recipient,
      type: "text",
      text: {
        body: text
      }
    };
  }

  /**
   * Creates a button message with customizable header, body, and buttons
   */
  static createButtonMessage(options: {
    recipient: string;
    bodyText: string;
    footerText?: string;
    headerType: 'text' | 'image';
    headerContent: string;
    buttons: MessageButton[];
  }): any {
    const { recipient, bodyText, footerText, headerType, headerContent, buttons } = options;
    
    return {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: recipient,
      type: "interactive",
      interactive: {
        type: "button",
        header: {
          type: headerType,
          text: headerContent
        },
        body: {
          text: bodyText
        },
        ...(footerText && {
          footer: {
            text: footerText
          }
        }),
        action: {
          buttons: buttons
        }
      }
    };
  }

  /**
   * Creates a list message for displaying menu items
   */
  static createListMessage(options: {
    recipient: string;
    headerText: string;
    bodyText: string;
    footerText?: string;
    buttonText: string;
    sections: Array<{
      title: string;
      rows: Array<{
        id: string;
        title: string;
        description?: string;
      }>;
    }>;
  }): any {
    const { recipient, headerText, bodyText, footerText, buttonText, sections } = options;
    
    return {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: recipient,
      type: "interactive",
      interactive: {
        type: "list",
        header: {
          type: "text",
          text: headerText
        },
        body: {
          text: bodyText
        },
        ...(footerText && {
          footer: {
            text: footerText
          }
        }),
        action: {
          button: buttonText,
          sections: sections
        }
      }
    };
  }

  /**
   * Creates a location request message
   */
  static createLocationRequestMessage(recipient: string, promptText: string): any {
    return {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      type: "interactive",
      to: recipient,
      interactive: {
        type: "location_request_message",
        body: {
          text: promptText
        },
        action: {
          name: "send_location"
        }
      }
    };
  }

  /**
   * Creates navigation buttons for the main menu
   */
  static createNavigationButtons(recipient: string): any {
    return this.createButtonMessage({
      recipient,
      headerType: "text",
      headerContent: "🍽️ Restaurant Menu",
      bodyText: "What would you like to do next?",
      footerText: "Choose an option below",
      buttons: [
        {
          reply: { id: "main-menu", title: "Main Menu" },
          type: "reply"
        },
        {
          reply: { id: "view-cart", title: "View Cart" },
          type: "reply"
        },
        {
          reply: { id: "help", title: "Help" },
          type: "reply"
        },
        
      ]
    });
  }

  /**
   * Creates checkout confirmation buttons
   */
  static createCheckoutButtons(
    recipient: string, 
    paymentMethod: string, 
    summaryText: string, 
    headerText: string = "✅ Order Summary"
  ): any {
    return this.createButtonMessage({
      recipient,
      headerType: "text",
      headerContent: headerText,
      bodyText: summaryText,
      footerText: "Ready to complete your order?",
      buttons: [    
        {
          reply:{ id: "confirm-order", title: "Confirm Order" },
          type: "reply"
        },
        {
          reply: { id: "cancel-order", title: "Cancel Order" },
          type: "reply"
        },
      ]
    });
  }
}
