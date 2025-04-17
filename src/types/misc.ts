// types/menu.ts
export interface CustomizationOption {
    id: string;
    name: string;
    choices: string[];
  }
  
  export interface MenuItem {
    id: string;
    name: string;
    categoryId: string;
    price: number;
    description: string;
    customizationOptions?: CustomizationOption[];
  }
  
  export interface MenuCategory {
    id: string;
    title: string;
  }
    
  export const sampleCategories: MenuCategory[] = [
    { id: 'appetizers', title: 'Appetizers' },
    { id: 'mains',       title: 'Main Courses' },
    { id: 'desserts',    title: 'Desserts' },
    { id: 'drinks',      title: 'Beverages' },
  ];
  
  export const sampleItems: MenuItem[] = [
    {
      id: 'spring_rolls',
      name: 'Vegetable Spring Rolls',
      categoryId: 'appetizers',
      price: 6.50,
      description: 'Crispy rolls stuffed with cabbage, carrots, and glass noodles.',
      customizationOptions: [
        {
          id: 'dipping_sauce',
          name: 'Dipping Sauce',
          choices: ['Sweet Chili', 'Soy-Ginger', 'Peanut'],
        },
      ],
    },
    {
      id: 'chicken_wings',
      name: 'Buffalo Chicken Wings',
      categoryId: 'appetizers',
      price: 9.00,
      description: 'Spicy wings served with celery and blue‑cheese dip.',
    },
    {
      id: 'grilled_salmon',
      name: 'Grilled Salmon',
      categoryId: 'mains',
      price: 18.75,
      description: 'Atlantic salmon fillet with lemon‑butter sauce.',
      customizationOptions: [
        {
          id: 'side_dish',
          name: 'Choose Your Side',
          choices: ['Steamed Veggies', 'Mashed Potatoes', 'House Salad'],
        },
      ],
    },
    {
      id: 'burger_classic',
      name: 'Classic Cheeseburger',
      categoryId: 'mains',
      price: 12.00,
      description: 'Beef patty, cheddar, lettuce, tomato, house sauce on brioche bun.',
      customizationOptions: [
        {
          id: 'cheese',
          name: 'Cheese Type',
          choices: ['Cheddar', 'Swiss', 'Pepper Jack'],
        },
        {
          id: 'doneness',
          name: 'Cook Level',
          choices: ['Rare', 'Medium Rare', 'Medium', 'Well Done'],
        },
      ],
    },
    {
      id: 'chocolate_cake',
      name: 'Chocolate Lava Cake',
      categoryId: 'desserts',
      price: 7.25,
      description: 'Warm chocolate cake with a gooey center, served with vanilla ice cream.',
    },
    {
      id: 'cheesecake',
      name: 'New York Cheesecake',
      categoryId: 'desserts',
      price: 7.00,
      description: 'Creamy cheesecake on a graham cracker crust.',
    },
    {
      id: 'iced_tea',
      name: 'Iced Tea',
      categoryId: 'drinks',
      price: 3.50,
      description: 'Freshly brewed black tea, served over ice.',
    },
    {
      id: 'latte',
      name: 'Caffè Latte',
      categoryId: 'drinks',
      price: 4.50,
      description: 'Espresso with steamed milk and a light layer of foam.',
    },
  ];
  
