export interface Store {
  id?: string;
  name: string;
  phone: string;
  hours: string;
  distance: number;
  address?: Address; // Use the Address interface
}

export interface CustomerLocation {
  id?: string;
  name?: string;
  address?: Address; // Use the Address interface
  longitude: number;  
  latitude: number;
}

interface Address {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country?: string;
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



  
  export interface MenuSubcategory {
    id?: string;
    title: string;
    description: string;
    price?: number;
    items?: Map<string, MenuItem>;
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


  export interface MenuItem {
    id: string;
    title: string;
    description: string;
    price: number;
    allergens: string[];
    hasCustomOptions: boolean;
  }
  
  export interface MenuCategory {
    id: string;
    name: string;
    description: string;
    items: MenuItem[];
  }
  
  export interface Cart {
    items: CartItem[];
    total: number;
    totalAmount: number;
    subtotal: number;
    tax: number;
    discounts: Discount[];
  }
  
  export interface CartItem {
    id: string;
    name: string;
    price: number;
    quantity: number;
    specialInstructions: string;
  }
  
  export interface Discount {
    code: string;
    amount: number;
    type: string;
    value: number;
  }
  
  export interface MessageButton {
    id: string;
    title: string;
  }
  
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

  // ../data/types.ts

export type OrderFlow = "browsing" | "checkout" | "order_placed";

export type OrderStep =
  | "main_menu"
  | "category"
  | "item_list"
  | "location_input"
  | "specials"
  | "selecting_delivery_type"
  | "selecting_payment"
  | "confirming_order";

export interface UserState {
  flow: OrderFlow;
  step: OrderStep;
  currentCategory: string | null;
  currentSubcategory: string | null;
  selectedItems: any[]; // Replace 'any' with the actual type
  paymentMethod: string | null;
  deliveryAddress: string | null;
  deliveryType: "pickup" | "delivery" | null;
  lastInteractionAt: number;
  hasDeliveryAddress?: boolean;
  locationCoordinates?: {
    longitude: number
    latitude: number
  }
}

// ... other interfaces and types ...
