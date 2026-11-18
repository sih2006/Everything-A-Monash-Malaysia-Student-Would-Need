// Quick, easy home cooking, one serving each: every recipe takes 20 minutes or less. Chosen with the owner on
// 18 November 2026: home cooking only (no takeout), no noodles, no oats, and made for a countertop stove with
// a pan and a pot, an air fryer and a toaster. Calories and protein are estimates for the amounts listed.
// Costs are ESTIMATES in ringgit for the amount used, from usual Malaysian supermarket prices in 2026.

export const EQUIPMENT = ['Stove', 'Air fryer', 'Toaster', 'Oil spray bottle', 'Microwave', 'Rice cooker', 'Oven', 'Kettle', 'Blender'];
export const MAX_MINUTES = 20;

const i = (item, amount, cost) => ({ item, amount, cost });

export const RECIPES = [
  {
    id: 'airfryer-chicken-rice', name: 'Air-fryer chicken thighs with rice', kcal: 650, protein: 40, minutes: 20,
    equipment: ['Air fryer', 'Stove'],
    ingredients: [i('Chicken thigh (boneless)', '200 g', 4.5), i('Rice', '80 g dry', 0.4), i('Soy sauce', '1 tbsp', 0.1), i('Garlic or garlic powder', '2 cloves or 1 tsp', 0.2), i('Cucumber', 'half', 0.5)],
    steps: ['Rinse the rice and simmer it in the pot with 1.5 times as much water, lid on, for 15 minutes.', 'Meanwhile mix the chicken with soy sauce and crushed garlic.', 'Air-fry at 200 °C for 15 to 18 minutes, turning once.', 'Slice the cucumber and serve.']
  },
  {
    id: 'airfryer-chicken-bites', name: 'Air-fryer crispy chicken bites', kcal: 450, protein: 45, minutes: 15,
    equipment: ['Air fryer'],
    ingredients: [i('Chicken breast', '200 g', 4.0), i('Cornflour', '1 tbsp', 0.2), i('Cajun rub, paprika or chilli powder', '1 tsp', 0.2), i('Cooking oil', '1 tsp', 0.1)],
    steps: ['Cut the chicken into bite-size pieces.', 'Toss with cornflour, the spice, salt and a spray of oil.', 'Air-fry at 200 °C for 10 to 12 minutes, shaking once.']
  },
  {
    id: 'airfryer-tandoori-naan', name: 'Air-fryer tandoori chicken with naan', kcal: 650, protein: 45, minutes: 18,
    equipment: ['Air fryer'],
    ingredients: [i('Chicken thigh (boneless)', '200 g', 4.5), i('Tandoori paste', '2 tbsp', 1.0), i('Plain yoghurt', '2 tbsp', 0.5), i('Naan (ready-made)', '1', 2.0), i('Cucumber', 'half', 0.5)],
    steps: ['Coat the chicken in tandoori paste mixed with yoghurt.', 'Air-fry at 200 °C for 14 to 16 minutes.', 'Warm the naan in the air fryer for the last 2 minutes.']
  },
  {
    id: 'pan-shawarma-wrap', name: 'Pan chicken shawarma wrap', kcal: 600, protein: 38, minutes: 15,
    equipment: ['Stove'],
    ingredients: [i('Chicken thigh (boneless)', '150 g', 3.4), i('Tortilla wrap', '1', 1.0), i('Cajun rub, paprika or chilli powder', '1 tsp', 0.2), i('Garlic mayo', '1 tbsp', 0.4), i('Tomato', '1', 0.5), i('Cucumber', 'half', 0.5)],
    steps: ['Slice the chicken thin and mix with the spice, garlic powder and a pinch of salt.', 'Fry in a hot pan for 6 to 8 minutes until browned and cooked through.', 'Warm the wrap in the pan, then fill with chicken, garlic mayo, tomato and cucumber.']
  },
  {
    id: 'egg-fried-rice', name: 'Egg fried rice with chicken', kcal: 700, protein: 32, minutes: 15,
    equipment: ['Stove'],
    ingredients: [i('Cooked rice (left over)', '1 bowl', 0.4), i('Eggs', '2', 1.0), i('Chicken breast', '100 g', 2.0), i('Frozen mixed vegetables', '1 cup', 0.8), i('Soy sauce', '1 tbsp', 0.1), i('Cooking oil', '1 tbsp', 0.1)],
    steps: ['Fry the diced chicken in oil until done.', 'Push it aside and scramble the eggs.', 'Add the vegetables and the cold rice, then the soy sauce; fry for 3 minutes.']
  },
  {
    id: 'chicken-broccoli-stirfry', name: 'Chicken and broccoli stir-fry with rice', kcal: 650, protein: 42, minutes: 20,
    equipment: ['Stove'],
    ingredients: [i('Chicken breast', '180 g', 3.6), i('Broccoli', '150 g', 1.5), i('Rice', '80 g dry', 0.4), i('Oyster sauce', '1 tbsp', 0.2), i('Garlic or garlic powder', '2 cloves or 1 tsp', 0.2), i('Cooking oil', '1 tbsp', 0.1)],
    steps: ['Start the rice in the pot (15 minutes, lid on).', 'Fry the garlic and sliced chicken until cooked.', 'Add the broccoli and a splash of water; cover for 3 minutes.', 'Stir in the oyster sauce and serve on the rice.']
  },
  {
    id: 'tofu-egg-stirfry', name: 'Tofu and egg stir-fry', kcal: 450, protein: 28, minutes: 12,
    equipment: ['Stove'],
    ingredients: [i('Firm tofu', '1 block', 1.8), i('Eggs', '2', 1.0), i('Spring onion', '1 stalk', 0.2), i('Soy sauce', '1 tbsp', 0.1), i('Cooking oil', '1 tbsp', 0.1)],
    steps: ['Fry cubes of tofu until golden.', 'Add the beaten eggs and stir until set.', 'Finish with soy sauce and spring onion.']
  },
  {
    id: 'airfryer-egg-wrap', name: 'Air-fryer egg and cheese wrap', kcal: 450, protein: 24, minutes: 10,
    equipment: ['Air fryer'],
    ingredients: [i('Tortilla wrap', '1', 1.0), i('Eggs', '2', 1.0), i('Cheese (shredded or slices)', '30 g', 0.8), i('Tomato', '1', 0.5)],
    steps: ['Beat the eggs and pour onto the wrap in a small tray.', 'Add cheese and sliced tomato, fold.', 'Air-fry at 180 °C for 6 to 8 minutes.']
  },
  {
    id: 'airfryer-cheesy-garlic-bread', name: 'Air-fryer cheesy garlic bread', kcal: 420, protein: 16, minutes: 8,
    equipment: ['Air fryer'],
    ingredients: [i('Bread', '2 thick slices', 0.6), i('Butter', '1 tbsp', 0.5), i('Garlic or garlic powder', '2 cloves or 1 tsp', 0.2), i('Cheese (shredded or slices)', '50 g', 1.4)],
    steps: ['Mix soft butter with crushed garlic or garlic powder and spread it on the bread.', 'Top with the cheese.', 'Air-fry at 180 °C for 4 to 5 minutes until the cheese bubbles.']
  },
  {
    id: 'eggs-on-toast', name: 'Scrambled eggs on toast', kcal: 400, protein: 22, minutes: 7,
    equipment: ['Stove', 'Toaster'],
    ingredients: [i('Eggs', '3', 1.5), i('Bread', '2 slices', 0.6), i('Butter', '1 tsp', 0.2)],
    steps: ['Toast the bread.', 'Melt the butter in a pan on low heat, add the beaten eggs and stir slowly for 2 to 3 minutes.', 'Serve on the toast.']
  },
  {
    id: 'beans-eggs-toast', name: 'Baked beans and fried eggs on toast', kcal: 480, protein: 26, minutes: 8,
    equipment: ['Stove', 'Toaster'],
    ingredients: [i('Baked beans', 'half a can', 1.5), i('Eggs', '2', 1.0), i('Bread', '2 slices', 0.6), i('Cooking oil', '1 tsp', 0.1)],
    steps: ['Warm the beans in the pot.', 'Fry the eggs in the pan.', 'Toast the bread and serve everything together.']
  },
  {
    id: 'tuna-melt', name: 'Tuna melt toast', kcal: 500, protein: 34, minutes: 8,
    equipment: ['Air fryer'],
    ingredients: [i('Canned tuna', '1 can', 4.5), i('Bread', '2 slices', 0.6), i('Mayonnaise', '1 tbsp', 0.3), i('Cheese (shredded or slices)', '30 g', 0.8)],
    steps: ['Mix the drained tuna with mayonnaise.', 'Spread on the bread and top with cheese.', 'Air-fry at 180 °C for 4 minutes.']
  },
  {
    id: 'chickpea-tuna-salad', name: 'Chickpea and tuna salad (no cooking)', kcal: 460, protein: 35, minutes: 5,
    equipment: [],
    ingredients: [i('Canned tuna', '1 can', 4.5), i('Canned chickpeas', 'half a can', 1.5), i('Tomato', '1', 0.5), i('Cucumber', 'half', 0.5), i('Lime or lemon', 'half', 0.3)],
    steps: ['Drain the tuna and chickpeas.', 'Chop the tomato and cucumber.', 'Mix everything with lime juice and a pinch of salt.']
  },
  {
    id: 'yoghurt-bowl', name: 'Greek yoghurt bowl (no cooking)', kcal: 320, protein: 22, minutes: 3,
    equipment: [],
    ingredients: [i('Greek yoghurt', '200 g', 4.0), i('Banana', '1', 0.6), i('Honey', '1 tsp', 0.2)],
    steps: ['Spoon the yoghurt into a bowl.', 'Top with sliced banana and honey.']
  }
];

// Every ingredient used by any recipe, once, in A to Z order: the list the user ticks in the kitchen.
export const INGREDIENTS = [...new Set(RECIPES.flatMap((r) => r.ingredients.map((x) => x.item)))].sort((a, b) => a.localeCompare(b));
