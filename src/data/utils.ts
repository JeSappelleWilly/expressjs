import { findAllMenuItems, menuCategories } from "./db";
import { MenuItem } from "./types";
import { RequestHandler } from 'express';

export interface FreeFormObject {
  [key: string]: any;
}


export const logRequest: RequestHandler = (req, res, next) => {
  console.log(req.url);
  if (req.body != null) {
    console.log(JSON.stringify(req.body));
  }
  next();
};
/**
 * Finds a menu item by its ID across all categories
 * @param itemId The ID of the menu item to find
 * @returns The menu item if found, or undefined if not found
 */
export function findMenuItemById(itemId: string): MenuItem | undefined {
    const allItems = findAllMenuItems();
    return allItems.find(item => item.id === itemId);
  }
  
  /**
   * Gets a list of menu items by category ID
   * @param categoryId The ID of the category
   * @returns Array of menu items in the category, or empty array if category not found
   */
  export function getItemsByCategory(categoryId: string): MenuItem[] {
    const category = menuCategories.get(categoryId);
    return category ? category.items : [];
  }
