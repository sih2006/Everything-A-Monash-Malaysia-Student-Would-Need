// Common meals for a student in Malaysia, ready for quick add. No noodle dishes, by the owner's choice.
// Every number is an APPROXIMATE estimate for a usual portion, not an official figure: Burger King and the
// other chains do not publish Malaysian nutrition data that could be checked. The user corrects a meal once
// by logging it with their own numbers; their saved meal then wins over the preset of the same name.

export const PRESET_MEALS = [
  // Burger King
  { name: 'Burger King Whopper', kcal: 650, protein: 30, group: 'Burger King' },
  { name: 'Burger King Whopper meal (medium fries, Coke)', kcal: 1150, protein: 34, group: 'Burger King' },
  { name: 'Burger King Whopper Jr', kcal: 330, protein: 16, group: 'Burger King' },
  { name: 'Burger King Chicken Royale', kcal: 650, protein: 25, group: 'Burger King' },
  { name: 'Burger King medium fries', kcal: 380, protein: 4, group: 'Burger King' },
  // Other fast food
  { name: "McDonald's McChicken", kcal: 400, protein: 14, group: 'Fast food' },
  { name: "McDonald's Ayam Goreng (2 pieces)", kcal: 520, protein: 36, group: 'Fast food' },
  { name: 'KFC 2-piece chicken', kcal: 500, protein: 38, group: 'Fast food' },
  { name: 'Subway 6-inch chicken teriyaki', kcal: 360, protein: 25, group: 'Fast food' },
  // Mamak and Malaysian plates
  { name: 'Nasi lemak with fried chicken', kcal: 800, protein: 32, group: 'Malaysian' },
  { name: 'Nasi lemak with egg', kcal: 550, protein: 14, group: 'Malaysian' },
  { name: 'Chicken rice (roasted)', kcal: 600, protein: 30, group: 'Malaysian' },
  { name: 'Economy rice: chicken and 2 vegetables', kcal: 650, protein: 30, group: 'Malaysian' },
  { name: 'Nasi goreng ayam', kcal: 750, protein: 25, group: 'Malaysian' },
  { name: 'Roti canai (2) with dhal', kcal: 600, protein: 14, group: 'Malaysian' },
  { name: 'Chapati (2) with dhal', kcal: 400, protein: 14, group: 'Malaysian' },
  { name: 'Chicken tandoori with naan', kcal: 650, protein: 40, group: 'Malaysian' },
  // Breakfast and snacks
  { name: 'Oats with milk and a banana', kcal: 400, protein: 15, group: 'Breakfast and snacks' },
  { name: '2 eggs and 2 slices of toast', kcal: 350, protein: 18, group: 'Breakfast and snacks' },
  { name: 'Banana with peanut butter', kcal: 300, protein: 8, group: 'Breakfast and snacks' },
  { name: 'Protein shake (1 scoop, water)', kcal: 130, protein: 25, group: 'Breakfast and snacks' },
  { name: 'Milo ais', kcal: 250, protein: 5, group: 'Breakfast and snacks' },
  { name: 'Teh tarik', kcal: 180, protein: 4, group: 'Breakfast and snacks' }
];
