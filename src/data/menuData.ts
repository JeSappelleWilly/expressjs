import { MenuCategory, MenuItem, MenuSubcategory } from "../data/types";

/**
 * Menu data structure with categories, subcategories, and items
 */
export const menuCategories: Map<string, MenuCategory> = new Map();
export const dealsCategories: Map<string, MenuCategory> = new Map();

// Specials Category
export const specialsCategory: MenuCategory = {
  id: "specials",
  title: "Today's Specials",
  description: "Limited time offers and daily specials",
  items: new Map()
};

const dailySpecials: MenuSubcategory = {
  id: "daily-specials",
  title: "Daily Specials",
  description: "Fresh dishes available today only",
  items: new Map()
};

dailySpecials.items = new Map([
  ["special-1", {
    id: "special-1",
    title: "Chef's Special Pasta",
    description: "House-made pasta with seasonal ingredients",
    price: 16.99,
    imageUrl: "https://example.com/images/chefs-pasta.jpg",
    customizationOptions: [
      { id: "spice-level", title: "Spice Level", options: ["Mild", "Medium", "Hot"] },
      { id: "add-protein", title: "Add Protein", options: ["Chicken (+$4)", "Shrimp (+$6)"] }
    ]
  }],
  ["special-2", {
    id: "special-2",
    title: "Serge's Special Pasta",
    description: "House-made pasta with seasonal ingredients",
    price: 18.99,
    imageUrl: "https://example.com/images/chefs-pasta.jpg",
    customizationOptions: [
      { id: "spice-level", title: "Spice Level", options: ["Mild", "Medium", "Hot"] },
      { id: "add-protein", title: "Add Protein", options: ["Chicken (+$4)", "Shrimp (+$6)"] }
    ]
  }]
 
]);

const weeklyDeals: MenuSubcategory = {
  id: "weekly-deals",
  title: "Weekly Deals",
  description: "Special offers valid this week",
  items: new Map()
};

weeklyDeals.items = new Map([
  ["deal-1", {
    id: "deal-1",
    title: "Family Bundle",
    description: "Feeds 4: Includes 1 large pizza, 4 sides, and 2L drink",
    price: 39.99,
    imageUrl: "https://example.com/images/family-bundle.jpg"
  }],
  ["deal-2", {
    id: "deal-2",
    title: "Bros Bundle",
    description: "Feeds 2: Includes 1 large pizza, 4 sides, and 2L drink",
    price: 19.99,
    imageUrl: "https://example.com/images/family-bundle.jpg"
  }]
]);

specialsCategory.items.set("daily-specials", dailySpecials);
specialsCategory.items.set("weekly-deals", weeklyDeals);

// Appetizers Category
const appetizersCategory: MenuCategory = {
  id: "appetizers",
  title: "Appetizers",
  description: "Starters and small plates",
  items: new Map()
};

const hotAppetizers: MenuSubcategory = {
  id: "hot-appetizers",
  title: "Hot Appetizers",
  description: "Warm starters to begin your meal",
  items: new Map()
};

hotAppetizers.items = new Map([
  ["app-1", {
    id: "app-1",
    title: "Spinach & Artichoke Dip",
    description: "Creamy dip with warm tortilla chips",
    price: 9.99,
    imageUrl: "https://example.com/images/spinach-dip.jpg"
  }]
]);

const coldAppetizers: MenuSubcategory = {
  id: "cold-appetizers",
  title: "Cold Appetizers",
  description: "Refreshing starters and shareable plates",
  items: new Map()
};

coldAppetizers.items = new Map([
  ["app-4", {
    id: "app-4",
    title: "Hummus Platter",
    description: "House-made hummus with vegetables and pita",
    price: 10.99,
    imageUrl: "https://example.com/images/hummus.jpg"
  }]
]);

appetizersCategory.items.set("hot-appetizers", hotAppetizers);
appetizersCategory.items.set("cold-appetizers", coldAppetizers);
menuCategories.set("appetizers", appetizersCategory);

// Main Courses Category
const mainsCategory: MenuCategory = {
  id: "mains",
  title: "Main Courses",
  description: "Hearty entrees and signature dishes",
  items: new Map()
};

const pasta: MenuSubcategory = {
  id: "pasta",
  title: "Pasta Dishes",
  description: "Fresh pasta with house-made sauces",
  items: new Map()
};

pasta.items = new Map([
  ["pasta-1", {
    id: "pasta-1",
    title: "Spaghetti Bolognese",
    description: "Classic meat sauce with parmesan",
    price: 15.99,
    imageUrl: "https://example.com/images/bolognese.jpg"
  }]
]);

const grill: MenuSubcategory = {
  id: "grill",
  title: "From the Grill",
  description: "Perfectly grilled meats and seafood",
  items: new Map()
};

grill.items = new Map([
  ["grill-1", {
    id: "grill-1",
    title: "Ribeye Steak",
    description: "12oz aged beef with roasted vegetables",
    price: 28.99,
    imageUrl: "https://example.com/images/ribeye.jpg",
    customizationOptions: [
      { id: "steak-doneness", title: "Doneness", options: ["Rare", "Medium Rare", "Medium", "Medium Well", "Well Done"] },
      { id: "steak-sides", title: "Side Option", options: ["Mashed Potatoes", "French Fries", "Rice Pilaf", "Seasonal Vegetables"] }
    ]
  }]
]);

mainsCategory.items.set("pasta", pasta);
mainsCategory.items.set("grill", grill);
menuCategories.set("mains", mainsCategory);
dealsCategories.set("specials", specialsCategory);

// Beverages Category
const beveragesCategory: MenuCategory = {
  id: "beverages",
  title: "Beverages",
  description: "Refreshing drinks and cocktails",
  items: new Map()
};

const nonAlcoholic: MenuSubcategory = {
  id: "non-alcoholic",
  title: "Non-Alcoholic Drinks",
  description: "Sodas, juices, and more",
  items: new Map()
};

nonAlcoholic.items = new Map([
  ["bev-1", {
    id: "bev-1",
    title: "Soft Drinks",
    description: "Cola, Diet Cola, Lemon-Lime, Root Beer",
    price: 2.99,
    imageUrl: "https://example.com/images/soda.jpg",
    customizationOptions: [
      { id: "soda-type", title: "Type", options: ["Cola", "Diet Cola", "Lemon-Lime", "Root Beer"] },
      { id: "soda-size", title: "Size", options: ["Small", "Medium (+$0.50)", "Large (+$1)"] }
    ]
  }]
]);

const alcoholic: MenuSubcategory = {
  id: "alcoholic",
  title: "Alcoholic Beverages",
  description: "Beer, wine, and cocktails",
  items: new Map()
};

alcoholic.items = new Map([
  ["bev-4", {
    id: "bev-4",
    title: "Draft Beer",
    description: "Selection of local and imported beers",
    price: 5.99,
    imageUrl: "https://example.com/images/beer.jpg",
    customizationOptions: [
      { id: "beer-type", title: "Type", options: ["IPA", "Lager", "Stout", "Wheat"] },
      { id: "beer-size", title: "Size", options: ["Pint", "Large (+$2)"] }
    ]
  }]
]);

beveragesCategory.items.set("non-alcoholic", nonAlcoholic);
beveragesCategory.items.set("alcoholic", alcoholic);
menuCategories.set("beverages", beveragesCategory);

// Desserts Category
const dessertsCategory: MenuCategory = {
  id: "desserts",
  title: "Desserts",
  description: "Sweet treats to end your meal",
  items: new Map()
};

const cakes: MenuSubcategory = {
  id: "cakes",
  title: "Cakes & Pies",
  description: "House-made desserts",
  items: new Map()
};

cakes.items = new Map([
  ["dessert-1", {
    id: "dessert-1",
    title: "Chocolate Cake",
    description: "Rich layered cake with chocolate ganache",
    price: 7.99,
    imageUrl: "https://example.com/images/chocolate-cake.jpg"
  }]
]);

const iceCream: MenuSubcategory = {
  id: "ice-cream",
  title: "Ice Cream & Frozen Treats",
  description: "Cold and creamy desserts",
  items: new Map()
};

iceCream.items = new Map([
  ["dessert-4", {
    id: "dessert-4",
    title: "Ice Cream Sundae",
    description: "Three scoops with toppings and whipped cream",
    price: 6.99,
    imageUrl: "https://example.com/images/sundae.jpg",
    customizationOptions: [
      { id: "ice-cream-flavor", title: "Flavors", options: ["Vanilla", "Chocolate", "Strawberry", "Mint Chip"] },
      { id: "ice-cream-toppings", title: "Toppings", options: ["Hot Fudge", "Caramel", "Strawberry", "Nuts"] }
    ]
  }]
]);

dessertsCategory.items.set("cakes", cakes);
dessertsCategory.items.set("ice-cream", iceCream);
menuCategories.set("desserts", dessertsCategory);

/**
 * Helper function to get a menu category by ID
 */
export function getMenuCategory(categoryId: string): MenuCategory | undefined {
  return menuCategories.get(categoryId);
}

/**
 * Helper function to get a menu item by ID
 */
export function getMenuItem(itemId: string): MenuItem | undefined {
  for (const [, category] of menuCategories) {
    for (const [, subcategory] of category.items) {
      const item = subcategory.items?.get(itemId);
      if (item) {
        return item;
      }
    }
  }
  return undefined;
}

/**
 * Helper function to get a category key from its title
 */
export function getCategoryKeyFromTitle(title: string): string | undefined {
  for (const [key, category] of menuCategories) {
    if (category.title.toLowerCase() === title.toLowerCase()) {
      return key;
    }
  }
  return undefined;
}

/**
 * Helper function to get a menu key from its title
 */
export function getMenuKeyFromTitle(title: string): string | undefined {
  for (const [, category] of menuCategories) {
    for (const [key, subcategory] of category.items) {
      if (subcategory.title.toLowerCase() === title.toLowerCase()) {
        return key;
      }
    }
  }
  return undefined;
}

/**
 * Helper function to format the response message for an item.
 *
 * @param item - The item object containing title, description, price, etc.
 * @returns A formatted response string.
 */
function formatItemResponse(item: MenuItem): string {
  const priceText = (item?.price !== undefined)
    ? `$${item.price.toFixed(2)}`
    : "Price varies";
  return `You selected "${item.title}".\n${item.description}\nPrice: ${priceText}.\nWould you like to add this item to your cart?`;
}


/**
 * Finds a MenuItem by its id across all menu categories.
 * @param itemId The id of the menu item to search for.
 * @param categories The Map of MenuCategory to search in.
 * @returns The title of the found item or undefined if not found.
 */
export function findMenuItemTitleById(
  itemId: string,
  categories: Map<string, MenuCategory>
): string | undefined {
  for (const category of categories.values()) {
    for (const subcategory of category.items.values()) {
      const item = subcategory?.items?.get(itemId);
      const response = formatItemResponse(item!)
      if (item) {
        return response;
      }
    }
  }
  return undefined; // not found
}
