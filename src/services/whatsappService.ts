import { createMessageSender, MessageSender } from "../types/bot";
import { SendMessageResult, sendRequestHelper } from "../types/request";

export class WhatsAppService {
  private sendRequest: <T>(data: T) => Promise<SendMessageResult>;
  private phoneNumberId: string;
  private sender: MessageSender;

  constructor(config?: { apiUrl?: string, authToken?: string, phoneNumberId?: string }) {
    this.phoneNumberId = config?.phoneNumberId || process.env.PHONE_NUMBER_ID!;
    const authToken = config?.authToken || process.env.WHATSAPP_AUTH_TOKEN || '';
    this.sender = createMessageSender(this.phoneNumberId, authToken);

    // Use the helper from the package
    this.sendRequest = sendRequestHelper(
      this.phoneNumberId,
      authToken,
      // Optional logger implementation
      async (obj) => {
        console.log(`Sent message to ${obj.responseSummary.phoneNumber}`, obj);
      }
    );
  }
  
    /**
   * Sends a simple text message
   */
    async sendText(recipient: string, text: string, options?: { preview_url?: boolean }): Promise<any> {
      return this.sender.sendText(recipient, text, options);
    }
  /**
   * Sends an interactive message with reply buttons
   */
  async sendReplyButtons(
    recipient: string,
    bodyText: string,
    buttons: { [id: string]: string },
    options?: { footerText?: string, header?: any }
  ): Promise<any> {
    return this.sender.sendReplyButtons(recipient, bodyText, buttons, options);
  }

    /**
   * Sends an interactive message with a list
   */
    async sendList(
      recipient: string,
      buttonName: string,
      bodyText: string,
      sections: {
        [sectionTitle: string]: {
          id: string;
          title: string;
          description?: string;
        }[];
      },
      options?: { footerText?: string, header?: any }
    ): Promise<any> {
      return this.sender.sendList(recipient, buttonName, bodyText, sections, options);
    }
/**
   * Sends a template message
   */
async sendTemplate(
  recipient: string,
  templateName: string,
  languageCode: string,
  components?: any[]
): Promise<any> {
  return this.sender.sendTemplate(recipient, templateName, languageCode, components);
}

/**
 * Sends a location message
 */
async sendLocation(
  recipient: string,
  latitude: number,
  longitude: number,
  options?: { name?: string, address?: string }
): Promise<any> {
  return this.sender.sendLocation(recipient, latitude, longitude, options);
}

/**
 * Sends an image message
 */
async sendImage(
  recipient: string,
  imageUrl: string,
  options?: { caption?: string }
): Promise<any> {
  return this.sender.sendImage(recipient, imageUrl, options);
}

/**
 * Sends a document message
 */
async sendDocument(
  recipient: string,
  documentUrl: string,
  options?: { caption?: string, filename?: string }
): Promise<any> {
  return this.sender.sendDocument(recipient, documentUrl, options);
}

  // Your other methods can remain the same but return SendMessageResult
}
