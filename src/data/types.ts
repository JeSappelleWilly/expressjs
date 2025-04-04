
export interface MenuItem {
    id?: string;
    title: string;
    description: string;
    price: number;
  }
  
  export interface MenuSubcategory {
    id?: string;
    title: string;
    description: string;
    price?: number;
    items?: Map<string, MenuItem>;
  }
  
  export interface MenuCategory {
    title: string;
    description?: string;
    items: Map<string, MenuSubcategory>;
  }
  
  export interface MessageButton {
    id: string;
    title: string;
  }
  
  export interface ButtonMessageOptions {
    recipient: string;
    bodyText: string;
    footerText?: string;
    headerType?: 'text' | 'image';
    headerContent: string | { id: string };
    buttons: MessageButton[];
  }
  
  export interface Config {
    WHATSAPP_API_URL: string;
    WHATSAPP_TOKEN: string;
    headerImagePaths: Record<string, string>;
  }

  // Interface for incoming WhatsApp message
  export interface WhatsAppMessage {
    text?: {
      body: string;
    };
    interactive?: {
      list_reply?: {
        id: string;
      };
      button_reply?: {
        id: string;
      };
    };
    location?: {
      latitude: number;
      longitude: number;
      name?: string;
      address?: string;
    };
  }
  
