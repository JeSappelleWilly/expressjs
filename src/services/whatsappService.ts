// services/whatsappService.ts
/**
 * Service for WhatsApp API communications
 */

import { CurrencyParameter, DateTimeParameter, ImageParameter, TextParameter, WhatsAppTemplateParams } from "../data/types";

const WHATSAPP_API_VERSION = "v22.0";
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID || "574770619057271";
const WHATSAPP_API_URL = `https://graph.facebook.com/${WHATSAPP_API_VERSION}/${PHONE_NUMBER_ID}/messages`;

export class WhatsAppService {
  private apiUrl: string;
  private authToken: string;
  private phoneNumberId: string;
  
  constructor(config?: { apiUrl?: string, authToken?: string, phoneNumberId?: string }) {
    this.phoneNumberId = config?.phoneNumberId || PHONE_NUMBER_ID;
    this.apiUrl = config?.apiUrl || WHATSAPP_API_URL;
    this.authToken = config?.authToken || process.env.WHATSAPP_AUTH_TOKEN || '';
  }
  
  /**
   * Sends a message to the WhatsApp API
   */
  async sendMessage(payload: any): Promise<any> {
    try {
      console.warn("phone number", this.apiUrl!);
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.authToken}`
        },
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) {
        throw new Error(`WhatsApp API error: ${response.status} ${response.statusText}`);
      }
      
      return response.json();
    } catch (error) {
      console.warn('Error sending WhatsApp payload:', payload);
      console.error('Error sending WhatsApp message:', error);
      throw error;
    }
  }
  
  /**
   * Sends a simple text message
   */
  async sendText(recipient: string, text: string): Promise<any> {
    const payload = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: recipient,
      type: "text",
      text: {
        body: text
      }
    };
    
    return this.sendMessage(payload);
  }
  
  /**
   * Sends an interactive message
   */
  async sendInteractive(recipient: string, interactive: any): Promise<any> {
    const payload = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: recipient,
      type: "interactive",
      interactive
    };
    
    return this.sendMessage(payload);
  }

  /**
   * Builds template components based on provided parameters
   * @private
   */
  private buildTemplateComponents(params: WhatsAppTemplateParams): any[] {
    const components: any[] = [];
    
    // Add header component if header parameter is provided
    if (params.headerParameter) {
      components.push({
        type: 'header',
        parameters: [params.headerParameter]
      });
    }
    
    // Add body component if any body parameters are provided
    if (params.bodyParameters && params.bodyParameters.length > 0) {
      components.push({
        type: 'body',
        parameters: params.bodyParameters
      });
    }
    
    // Add button components if button payloads are provided
    if (params.buttonPayloads && params.buttonPayloads.length > 0) {
      params.buttonPayloads.forEach((payload, index) => {
        components.push({
          type: 'button',
          sub_type: 'quick_reply',
          index: index.toString(),
          parameters: [
            {
              type: 'payload',
              payload: payload
            }
          ]
        });
      });
    }
    
    return components;
  }

  /**
   * Sends a template message
   * @param recipient The recipient's phone number
   * @param params Template parameters
   */
  async sendTemplate(recipient: string, params: WhatsAppTemplateParams): Promise<any> {
    const components = this.buildTemplateComponents(params);
    
    const payload = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: recipient,
      type: "template",
      template: {
        name: params.templateName,
        language: {
          code: params.languageCode
        },
        components: components
      }
    };
    
    return this.sendMessage(payload);
  }

  /**
   * Convenience method to send a simple template with just text parameters
   * @param recipient The recipient's phone number
   * @param templateName The name of the template
   * @param languageCode The language code (e.g., "en_US")
   * @param textValues Array of text values to include in the body
   */
  async sendSimpleTemplate(
    recipient: string, 
    templateName: string, 
    languageCode: string, 
    textValues: string[]
  ): Promise<any> {
    const bodyParameters = textValues.map(text => ({
      type: 'text',
      text
    } as TextParameter));
    
    return this.sendTemplate(recipient, {
      templateName,
      languageCode,
      bodyParameters
    });
  }

   /**
   * Sends a welcome message template
   * @param recipient The recipient's phone number
   * @param restaurantName The name of the restaurant
   * @param languageCode The language code (e.g., "en_US")
   * @param templateName Optional template name (defaults to "welcome_message")
   */
   async sendWelcomeTemplate(
    recipient: string,
    restaurantName: string,
    languageCode: string = "en_US",
    templateName: string = "welcome"
  ): Promise<any> {
    return this.sendTemplate(recipient, {
      templateName,
      languageCode,
      bodyParameters: [
        {
          type: 'text',
          text: restaurantName
        }
      ],
    });
  }

  /**
   * Helper method to create a header image parameter
   */
  createHeaderImage(imageUrl: string): ImageParameter {
    return {
      type: 'image',
      image: {
        link: imageUrl
      }
    };
  }

  /**
   * Helper method to create a text parameter
   */
  createTextParameter(text: string): TextParameter {
    return {
      type: 'text',
      text
    };
  }

  /**
   * Helper method to create a currency parameter
   */
  createCurrencyParameter(amount: number, code: string = 'USD', fallbackValue?: string): CurrencyParameter {
    return {
      type: 'currency',
      currency: {
        fallback_value: fallbackValue || `${amount / 1000}`,
        code,
        amount_1000: amount
      }
    };
  }

  /**
   * Helper method to create a date time parameter
   */
  createDateTimeParameter(fallbackValue: string): DateTimeParameter {
    return {
      type: 'date_time',
      date_time: {
        fallback_value: fallbackValue
      }
    };
  }
}
