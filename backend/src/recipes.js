// Simple recipes for a student kitchen, one serving each. No noodle dishes, by the owner's choice.
// Calories and protein are estimates for the amounts listed. Costs are ESTIMATES in ringgit for the amount
// used, from usual Malaysian supermarket prices in 2026; real prices change by shop and week.

export const EQUIPMENT = ['Air fryer', 'Rice cooker', 'Microwave', 'Stove', 'Oven', 'Kettle', 'Blender', 'Toaster'];

const i = (item, amount, cost) => ({ item, amount, cost });

export const RECIPES = [
  {
    id: 'airfryer-chicken-rice', name: 'Air-fryer chicken thighs with rice and cucumber', kcal: 650, protein: 40, minutes: 25,
    equipment: ['Air fryer', 'Rice cooker'],
    ingredients: [i('Chicken thigh (boneless)', '200 g', 4.5), i('Rice', '80 g dry', 0.4), i('Cucumber', 'half', 0.5), i('Soy sauce', '1 tbsp', 0.1), i('Garlic', '2 cloves', 0.2)],
    steps: ['Start the rice in the rice cooker.', 'Mix the chicken with soy sauce and crushed garlic.', 'Air-fry at 200 °C for 18 to 20 minutes, turning once.', 'Slice the cucumber and serve with the rice.']
  },
  {
    id: 'airfryer-chicken-wedges', name: 'Air-fryer chicken breast and potato wedges', kcal: 600, protein: 50, minutes: 30,
    equipment: ['Air fryer'],
    ingredients: [i('Chicken breast', '200 g', 4.0), i('Potato', '1 large', 0.8), i('Cooking oil', '1 tsp', 0.1), i('Chilli powder or paprika', '1 tsp', 0.2)],
    steps: ['Cut the potato into wedges, toss with oil and spice.', 'Air-fry the wedges at 200 °C for 10 minutes.', 'Add the spiced chicken and cook 15 more minutes, until the chicken is cooked through.']
  },
  {
    id: 'egg-fried-rice', name: 'Egg fried rice with chicken', kcal: 700, protein: 32, minutes: 15,
    equipment: ['Stove'],
    ingredients: [i('Rice', '80 g dry (cooked earlier)', 0.4), i('Eggs', '2', 1.0), i('Chicken breast', '100 g', 2.0), i('Frozen mixed vegetables', '1 cup', 0.8), i('Soy sauce', '1 tbsp', 0.1), i('Cooking oil', '1 tbsp', 0.1)],
    steps: ['Cook the diced chicken in oil until done.', 'Push it aside, scramble the eggs.', 'Add the vegetables and the cold rice, then the soy sauce; fry for 3 minutes.']
  },
  {
    id: 'one-pot-chicken-rice', name: 'Rice-cooker chicken rice', kcal: 650, protein: 35, minutes: 40,
    equipment: ['Rice cooker'],
    ingredients: [i('Chicken thigh (boneless)', '150 g', 3.4), i('Rice', '80 g dry', 0.4), i('Ginger', '1 thumb', 0.3), i('Garlic', '2 cloves', 0.2), i('Chicken stock cube', 'half', 0.3)],
    steps: ['Put rice, water, stock, sliced ginger and garlic in the rice cooker.', 'Lay the chicken on top and start the cooker.', 'When it finishes, rest 5 minutes and slice the chicken.']
  },
  {
    id: 'chicken-broccoli-stirfry', name: 'Chicken and broccoli stir-fry with rice', kcal: 650, protein: 42, minutes: 20,
    equipment: ['Stove', 'Rice cooker'],
    ingredients: [i('Chicken breast', '180 g', 3.6), i('Broccoli', '150 g', 1.5), i('Rice', '80 g dry', 0.4), i('Oyster sauce', '1 tbsp', 0.2), i('Garlic', '2 cloves', 0.2), i('Cooking oil', '1 tbsp', 0.1)],
    steps: ['Start the rice.', 'Fry the garlic and sliced chicken until cooked.', 'Add the broccoli and a splash of water; cover 3 minutes.', 'Stir in the oyster sauce and serve on rice.']
  },
  {
    id: 'tofu-egg-stirfry', name: 'Tofu and egg stir-fry with rice', kcal: 550, protein: 28, minutes: 15,
    equipment: ['Stove', 'Rice cooker'],
    ingredients: [i('Firm tofu', '1 block', 1.8), i('Eggs', '2', 1.0), i('Rice', '80 g dry', 0.4), i('Spring onion', '1 stalk', 0.2), i('Soy sauce', '1 tbsp', 0.1), i('Cooking oil', '1 tbsp', 0.1)],
    steps: ['Start the rice.', 'Fry cubes of tofu until golden.', 'Add the beaten eggs and stir until set; finish with soy sauce and spring onion.']
  },
  {
    id: 'airfryer-egg-wrap', name: 'Air-fryer egg and cheese wrap', kcal: 450, protein: 24, minutes: 10,
    equipment: ['Air fryer'],
    ingredients: [i('Tortilla wrap', '1', 1.0), i('Eggs', '2', 1.0), i('Cheese slice', '1', 0.7), i('Tomato', '1', 0.5)],
    steps: ['Beat the eggs and pour onto the wrap in a small tray.', 'Add cheese and sliced tomato, fold.', 'Air-fry at 180 °C for 6 to 8 minutes.']
  },
  {
    id: 'eggs-on-toast', name: 'Microwave scrambled eggs on toast', kcal: 400, protein: 22, minutes: 5,
    equipment: ['Microwave'],
    ingredients: [i('Eggs', '3', 1.5), i('Bread', '2 slices', 0.6), i('Milk', 'a splash', 0.1)],
    steps: ['Beat the eggs with a splash of milk in a bowl.', 'Microwave 40 seconds, stir, then 20 to 30 seconds more until just set.', 'Serve on the bread (toasted if you have a toaster).']
  },
  {
    id: 'beans-eggs-toast', name: 'Baked beans and eggs on toast', kcal: 480, protein: 26, minutes: 8,
    equipment: ['Microwave'],
    ingredients: [i('Baked beans', 'half a can', 1.5), i('Eggs', '2', 1.0), i('Bread', '2 slices', 0.6)],
    steps: ['Heat the beans in the microwave for 1 to 2 minutes.', 'Scramble the eggs in the microwave as above.', 'Serve both on the bread.']
  },
  {
    id: 'tuna-sandwich', name: 'Tuna and cucumber sandwich', kcal: 450, protein: 30, minutes: 5,
    equipment: [],
    ingredients: [i('Canned tuna', '1 can', 4.5), i('Bread', '2 slices', 0.6), i('Mayonnaise', '1 tbsp', 0.3), i('Cucumber', 'half', 0.5)],
    steps: ['Drain the tuna and mix with the mayonnaise.', 'Slice the cucumber.', 'Build the sandwich.']
  },
  {
    id: 'chickpea-tuna-salad', name: 'Chickpea and tuna salad', kcal: 460, protein: 35, minutes: 5,
    equipment: [],
    ingredients: [i('Canned tuna', '1 can', 4.5), i('Canned chickpeas', 'half a can', 1.5), i('Tomato', '1', 0.5), i('Cucumber', 'half', 0.5), i('Lime or lemon', 'half', 0.3)],
    steps: ['Drain the tuna and chickpeas.', 'Chop the tomato and cucumber.', 'Mix everything with lime juice and a pinch of salt.']
  },
  {
    id: 'overnight-oats', name: 'Overnight oats with banana and peanut butter', kcal: 500, protein: 20, minutes: 5,
    equipment: [],
    ingredients: [i('Rolled oats', '50 g', 0.5), i('Milk', '250 ml', 1.5), i('Banana', '1', 0.6), i('Peanut butter', '1 tbsp', 0.4)],
    steps: ['Mix the oats and milk in a jar the night before.', 'In the morning, top with sliced banana and peanut butter.']
  },
  {
    id: 'yoghurt-bowl', name: 'Greek yoghurt bowl', kcal: 320, protein: 22, minutes: 3,
    equipment: [],
    ingredients: [i('Greek yoghurt', '200 g', 4.0), i('Banana', '1', 0.6), i('Honey', '1 tsp', 0.2)],
    steps: ['Spoon the yoghurt into a bowl.', 'Top with sliced banana and honey.']
  }
];

// Every ingredient used by any recipe, once, in A to Z order: the list the user ticks in the kitchen.
export const INGREDIENTS = [...new Set(RECIPES.flatMap((r) => r.ingredients.map((x) => x.item)))].sort((a, b) => a.localeCompare(b));
