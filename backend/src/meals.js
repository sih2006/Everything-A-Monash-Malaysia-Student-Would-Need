// The owner's usual meals, ready for quick add. Chosen by the owner on 18 November 2026: no noodles, no oats,
// no Milo or teh tarik, and only the Burger King order they actually get.
// Every number is an APPROXIMATE estimate for a usual portion, not an official figure: the chains do not
// publish Malaysian nutrition data that could be checked. The user corrects a meal once by logging it with
// their own numbers; their saved meal then replaces the estimate.

export const PRESET_MEALS = [
  // Burger King: the value meal, and sometimes extra fries
  { name: "Burger King Chick'n Crisp meal (fries, drink)", kcal: 1050, protein: 20, group: 'Burger King' },
  { name: 'Burger King extra medium fries', kcal: 380, protein: 4, group: 'Burger King' },
  // Kebab shop
  { name: 'Chicken shawarma wrap', kcal: 550, protein: 30, group: 'Kebab and shawarma' },
  { name: 'Chicken kebab wrap', kcal: 650, protein: 35, group: 'Kebab and shawarma' },
  { name: 'HSP (halal snack pack: chips, kebab meat, sauces)', kcal: 1300, protein: 55, group: 'Kebab and shawarma' },
  // Malaysian
  { name: 'Nasi lemak with fried chicken', kcal: 800, protein: 32, group: 'Malaysian' },
  { name: 'Nasi lemak with egg', kcal: 550, protein: 14, group: 'Malaysian' },
  { name: 'Nasi goreng ayam', kcal: 750, protein: 25, group: 'Malaysian' },
  { name: 'Ayam gepuk with rice', kcal: 750, protein: 35, group: 'Malaysian' },
  { name: 'Chicken tandoori with naan', kcal: 650, protein: 40, group: 'Malaysian' },
  // Other fast food
  { name: "McDonald's McChicken", kcal: 400, protein: 14, group: 'Fast food' },
  { name: "McDonald's Ayam Goreng (2 pieces)", kcal: 520, protein: 36, group: 'Fast food' },
  { name: 'Subway 6-inch chicken teriyaki', kcal: 360, protein: 25, group: 'Fast food' },
  // Breakfast and snacks
  { name: '2 eggs and 2 slices of toast', kcal: 350, protein: 18, group: 'Breakfast and snacks' },
  { name: 'Banana with peanut butter', kcal: 300, protein: 8, group: 'Breakfast and snacks' },
  { name: 'Protein shake with milk (1 scoop, 250 ml milk)', kcal: 280, protein: 33, group: 'Breakfast and snacks' },
  { name: 'Cheesy garlic bread (2 pieces)', kcal: 350, protein: 11, group: 'Breakfast and snacks' }
];
