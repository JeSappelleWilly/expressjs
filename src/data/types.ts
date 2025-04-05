export interface Cart {
  id?: string;
  items: CartItem[];
  totalAmount: number
}


export interface CartItem {
  id?: string;
  item: MenuItem;

    name: string;
    description: string;
    price: number;
    quantity: number;
    customizations: [];
    specialInstructions: string
}


export interface Store {
  id?: string;
  name: string;
  phone: string;
  hours: string;
  distance: number;
  address: {}
}

export interface CustomerLocation {
  id?: string;
  name?: string;
  address?: {}
  longitude: number;
  latitude: number;
}



export interface Order {
  id?: string;
  items: CartItem[];
  notes: string;
  totalAmount: number;
  discount: number;
  tax: number;
  subtotal: number;
  total: number;
  type:string;
  store: Store;
  estimatedTime: number;
  deliveryAddress: {}
  paymentMethod: string
}


export interface MenuItem {
    id?: string;
    title: string;
    description: string;
    price: number;
    customizationOptions: any;
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
        id?: string;
        title?: string;
        description?: string
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
  
