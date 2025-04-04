import { MenuCategory, MenuSubcategory, MenuItem } from "./types";



const menuCategories: Map<string, MenuCategory> = new Map([
  ["popular", { title: "Popular Items", items: new Map() }],
  ["main_menu", { title: "Main Menu", items: new Map() }],
  ["drinks_extras", { title: "Drinks & Extras", items: new Map() }]
]);

// Populate categories with their respective items
// Popular Items
menuCategories.get("popular")?.items.set("specials", {
  id: "specials",
  title: "Today's Specials",
  description: "Check out our chef's special dishes",
  items: new Map([
    ["original_bucket", {
      title: "Original Bucket",
      description: "Classic fried chicken bucket",
      price: 19.99
    }],
    ["zinger_bucket", {
      title: "Zinger Bucket",
      description: "Spicy bucket with crispy chicken",
      price: 21.99
    }],
    ["family_feast", {
      title: "Family Feast",
      description: "Meal for sharing with family",
      price: 29.99
    }],
    ["chicken_burger", {
      title: "Chicken Burger",
      description: "Juicy chicken with fresh toppings",
      price: 8.99
    }],
    ["crispy_sandwich", {
      title: "Crispy Sandwich",
      description: "Crunchy chicken in a soft bun",
      price: 7.99
    }],
    ["mashed_potatoes", {
      title: "Mashed Potatoes",
      description: "Creamy, buttery mashed potatoes",
      price: 3.99
    }]
  ])
});

menuCategories.get("popular")?.items.set("bestsellers", {
  id: "bestsellers",
  title: "Best Sellers",
  description: "Our most popular dishes",
  items: new Map()
});

// Main Menu items
menuCategories.get("main_menu")?.items.set("appetizers", {
  id: "appetizers",
  title: "Appetizers",
  description: "Starters and small plates",
  items: new Map()
  // Add appetizer items here
});

menuCategories.get("main_menu")?.items.set("main_courses", {
  id: "main_courses",
  title: "Main Courses",
  description: "Signature dishes and entrees",
  items: new Map([
    ["classic_chicken", {
      title: "Classic Chicken",
      description: "Crispy, seasoned chicken served with your choice of sides.",
      price: 12.99
    }],
    ["spicy_chicken", {
      title: "Spicy Chicken",
      description: "For those who love a little heat with their crunch.",
      price: 13.99
    }]
  ])
});

menuCategories.get("main_menu")?.items.set("desserts", {
  id: "desserts",
  title: "Desserts",
  description: "Sweet treats to finish",
  items: new Map()
  // Add dessert items here
});

// Drinks & Extras
menuCategories.get("drinks_extras")?.items.set("beverages", {
  id: "beverages",
  title: "Beverages",
  description: "Soft drinks, coffee, and tea",
  items: new Map()
  // Add beverage items here
});

menuCategories.get("drinks_extras")?.items.set("sides", {
  id: "sides",
  title: "Side Orders",
  description: "Extra additions to your meal",
  items: new Map([
    ["crispy_fries", {
      title: "Crispy Fries",
      description: "Golden fries seasoned to perfection.",
      price: 2.99
    }],
    ["coleslaw", {
      title: "Coleslaw",
      description: "Fresh and tangy coleslaw to complement your meal.",
      price: 2.49
    }],
    ["buttermilk_biscuits", {
      title: "Buttermilk Biscuits",
      description: "Fluffy biscuits, a perfect side to your chicken.",
      price: 1.99
    }]
  ])
});

export { menuCategories };
