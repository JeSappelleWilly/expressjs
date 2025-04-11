// data/menuData.ts

import { MenuCategory, MenuItem } from "./types";

// Sample menu items for appetizers
const appetizerItems: MenuItem[] = [
  {
    id: "app1",
    title: "Mozzarella Sticks",
    description: "Golden-fried mozzarella sticks served with marinara sauce",
    price: 7.99,
    allergens: ["Dairy", "Gluten"],
    hasCustomOptions: false
  },
  {
    id: "app2",
    title: "Loaded Nachos",
    description: "Crispy tortilla chips topped with cheese, jalapeños, guacamole, and sour cream",
    price: 9.99,
    allergens: ["Dairy"],
    hasCustomOptions: true
  },
  {
    id: "app3",
    title: "Chicken Wings",
    description: "Crispy wings tossed in your choice of sauce: Buffalo, BBQ, or Honey Garlic",
    price: 11.99,
    allergens: [],
    hasCustomOptions: true
  }
];

// Sample menu items for main courses
const mainItems: MenuItem[] = [
  {
    id: "main1",
    title: "Classic Cheeseburger",
    description: "Juicy beef patty with cheddar cheese, lettuce, tomato, and special sauce on a brioche bun",
    price: 13.99,
    allergens: ["Dairy", "Gluten"],
    hasCustomOptions: true
  },
  {
    id: "main2",
    title: "Margherita Pizza",
    description: "Traditional pizza with tomato sauce, fresh mozzarella, and basil",
    price: 14.99,
    allergens: ["Dairy", "Gluten"],
    hasCustomOptions: true
  },
  {
    id: "main3",
    title: "Grilled Salmon",
    description: "Fresh Atlantic salmon with lemon butter sauce, served with seasonal vegetables",
    price: 18.99,
    allergens: ["Fish"],
    hasCustomOptions: false
  }
];

// Sample menu items for desserts
const dessertItems: MenuItem[] = [
  {
    id: "des1",
    title: "Chocolate Brownie",
    description: "Warm chocolate brownie served with vanilla ice cream and chocolate sauce",
    price: 6.99,
    allergens: ["Dairy", "Gluten", "Eggs"],
    hasCustomOptions: false
  },
  {
    id: "des2",
    title: "Cheesecake",
    description: "New York style cheesecake with your choice of topping: Strawberry, Caramel, or Chocolate",
    price: 7.99,
    allergens: ["Dairy", "Gluten"],
    hasCustomOptions: true
  }
];

// Sample menu items for beverages
const beverageItems: MenuItem[] = [
  {
    id: "bev1",
    title: "Soft Drinks",
    description: "Coca-Cola, Diet Coke, Sprite, or Fanta",
    price: 2.99,
    allergens: [],
    hasCustomOptions: true
  },
  {
    id: "bev2",
    title: "Fresh Lemonade",
    description: "Freshly squeezed lemonade with mint",
    price: 3.99,
    allergens: [],
    hasCustomOptions: false
  },
  {
    id: "bev3",
    title: "Coffee",
    description: "Freshly brewed coffee, available as regular or decaf",
    price: 2.49,
    allergens: [],
    hasCustomOptions: true
  }
];

// Create and export menuCategories as a Map
export const menuCategories: Map<string, MenuCategory> = new Map([
  ["appetizers", {
    id: "appetizers",
    name: "Appetizers",
    description: "Start your meal with our delicious appetizers",
    items: appetizerItems
  }],
  ["mains", {
    id: "mains",
    name: "Main Courses",
    description: "Satisfying entrees for every appetite",
    items: mainItems
  }],
  ["desserts", {
    id: "desserts",
    name: "Desserts",
    description: "Sweet treats to end your meal",
    items: dessertItems
  }],
  ["beverages", {
    id: "beverages",
    name: "Beverages",
    description: "Refreshing drinks to complement your meal",
    items: beverageItems
  }]
]);

// Helper function to find a menu item by ID across all categories
export function findAllMenuItems(): MenuItem[] {
  let allItems: MenuItem[] = [];
  
  menuCategories.forEach(category => {
    allItems = allItems.concat(category.items);
  });
  
  return allItems;
}
