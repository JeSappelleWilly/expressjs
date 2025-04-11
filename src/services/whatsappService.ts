// services/whatsappService.ts
/**
 * Service for WhatsApp API communications
 */

const WHATSAPP_API_VERSION = "v22.0";
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID || "574770619057271";
const WHATSAPP_API_URL = `https://graph.facebook.com/${WHATSAPP_API_VERSION}/${PHONE_NUMBER_ID}/messages`;

export class WhatsAppService {
    private apiUrl: string;
    private authToken: string;
    
    constructor(config?: { apiUrl?: string, authToken?: string }) {
      this.apiUrl = WHATSAPP_API_URL;
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
  }
