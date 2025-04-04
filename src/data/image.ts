export const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN ?? ""
export const WHATSAPP_API_URL = process.env.WHATSAPP_API_URL ?? ""
export const BASE_IMAGE_URL = process.env.BASE_IMAGE_URL ?? "https://yourserver.com/images" // Replace with your base URL for images

export const headerImageUrls: Record<string, string> = {
  "checkout": `${BASE_IMAGE_URL}/headers/checkout.jpg`,
  "main_menu": `${BASE_IMAGE_URL}/headers/main.jpg`,
  "drinks_extras": `${BASE_IMAGE_URL}/headers/drinks.jpg`,
  "specials": `${BASE_IMAGE_URL}/headers/default.jpg`,
  "bestsellers": `${BASE_IMAGE_URL}/headers/wings.jpg`,
  "popular": `${BASE_IMAGE_URL}/headers/wings.jpg`,
  "appetizers": `${BASE_IMAGE_URL}/headers/default.jpg`,
  "main_courses": `${BASE_IMAGE_URL}/headers/pizza.jpg`,
  "desserts": `${BASE_IMAGE_URL}/headers/desserts.jpg`,
  "welcome": `${BASE_IMAGE_URL}/headers/welcome.jpg`,
  "sides": `${BASE_IMAGE_URL}/headers/default.jpg`
};
