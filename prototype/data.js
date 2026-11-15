/*
 * FAKE DATA for the prototype. Nothing here is real.
 *
 * - The student, marks, spending, meals and health readings are invented.
 * - Unit codes are used for illustration. The assessment weights and hurdles
 *   are made up and are NOT taken from the Monash handbook.
 * - The grade bands and grade points below are unchecked assumptions.
 *   They must be verified against Monash's own sources before the real app uses them.
 * - Calorie and protein figures are rough guesses, not nutrition facts.
 */
window.FAKE = {
  student: { name: 'Alex', totalUnits: 24 },
  term: { name: 'Semester 1, 2027', week: 9, weeks: 12 },

  // Unchecked assumption: mark needed for each grade, and its grade points.
  gradeBands: [
    { grade: 'HD', min: 80, points: 4 },
    { grade: 'D', min: 70, points: 3 },
    { grade: 'C', min: 60, points: 2 },
    { grade: 'P', min: 50, points: 1 },
    { grade: 'N', min: 0, points: 0 }
  ],

  // The user's final goal. The app works out default semester targets from it.
  goal: { measure: 'CGPA', value: 3.0 },

  // A target is realistic when the mark needed is no more than this many
  // points above the average so far in that unit.
  realisticMargin: 10,

  // mark: null means the assessment is not done yet.
  units: [
    {
      code: 'FIT2004', name: 'Algorithms and data structures', credit: 6,
      target: { grade: 'D', mark: 70 },
      hurdle: { on: 'Final exam', min: 45 },
      assessments: [
        { name: 'Assignment 1', weight: 15, mark: 78 },
        { name: 'Assignment 2', weight: 15, mark: 70 },
        { name: 'Mid-semester test', weight: 10, mark: 65 },
        { name: 'Final exam', weight: 60, mark: null }
      ]
    },
    {
      code: 'FIT2099', name: 'Object-oriented design and implementation', credit: 6,
      target: { grade: 'HD', mark: 80 },
      hurdle: null,
      assessments: [
        { name: 'Assignment 1', weight: 20, mark: 74 },
        { name: 'Assignment 2', weight: 25, mark: 68 },
        { name: 'Assignment 3', weight: 25, mark: 70 },
        { name: 'Final exam', weight: 30, mark: null }
      ]
    },
    {
      code: 'FIT2094', name: 'Databases', credit: 6,
      target: { grade: 'HD', mark: 80 },
      hurdle: null,
      assessments: [
        { name: 'Assignment 1', weight: 20, mark: 88 },
        { name: 'Quiz', weight: 10, mark: 90 },
        { name: 'Assignment 2', weight: 30, mark: 81 },
        { name: 'Final exam', weight: 40, mark: null }
      ]
    },
    {
      code: 'MAT1830', name: 'Discrete mathematics for computer science', credit: 6,
      target: { grade: 'C', mark: 60 },
      hurdle: { on: 'Final exam', min: 40 },
      assessments: [
        { name: 'Weekly assignments', weight: 20, mark: 58 },
        { name: 'Mid-semester test', weight: 20, mark: 45 },
        { name: 'Final exam', weight: 60, mark: null }
      ]
    }
  ],

  // Finished semesters: final mark per unit.
  past: [
    {
      term: 'Semester 1, 2026', short: 'S1 2026',
      units: [
        { code: 'FIT1045', name: 'Introduction to programming', credit: 6, mark: 78 },
        { code: 'FIT1047', name: 'Computer systems and networks', credit: 6, mark: 72 },
        { code: 'FIT1049', name: 'IT professional practice', credit: 6, mark: 71 },
        { code: 'MAT1841', name: 'Continuous mathematics', credit: 6, mark: 64 }
      ]
    },
    {
      term: 'Semester 2, 2026', short: 'S2 2026',
      units: [
        { code: 'FIT1008', name: 'Fundamentals of algorithms', credit: 6, mark: 81 },
        { code: 'FIT1050', name: 'Web fundamentals', credit: 6, mark: 75 },
        { code: 'FIT1055', name: 'Professional practice and ethics', credit: 6, mark: 72 },
        { code: 'FIT1058', name: 'Foundations of computing', credit: 6, mark: 66 }
      ]
    }
  ],

  budget: {
    month: 'November', day: 21, days: 30, limit: 1300,
    categories: [
      { name: 'Food', spent: 520.4, limit: 600 },
      { name: 'Transport', spent: 148, limit: 200 },
      { name: 'Groceries', spent: 186.3, limit: 250 },
      { name: 'Fun', spent: 164.8, limit: 150 },
      { name: 'Study', spent: 65, limit: 100 }
    ],
    // Already counted in the category totals above.
    recent: [
      { what: 'Nasi lemak, campus canteen', category: 'Food', amount: 8.5, when: 'Today' },
      { what: 'Grab to the mall', category: 'Transport', amount: 12, when: 'Today' },
      { what: 'Weekly groceries', category: 'Groceries', amount: 46.3, when: 'Yesterday' },
      { what: 'Cinema ticket', category: 'Fun', amount: 22, when: 'Yesterday' },
      { what: 'Printing', category: 'Study', amount: 5, when: 'Wednesday' }
    ]
  },

  food: {
    targetKcal: 2400, targetProtein: 140,
    log: [
      { food: 'Nasi lemak with fried egg', when: 'Breakfast', kcal: 640, protein: 20 },
      { food: 'Chicken rice', when: 'Lunch', kcal: 610, protein: 38 },
      { food: 'Teh tarik', when: 'Snack', kcal: 150, protein: 4 },
      { food: 'Banana', when: 'Snack', kcal: 100, protein: 1 }
    ],
    quickAdd: [
      { food: 'Grilled chicken with rice', kcal: 520, protein: 45 },
      { food: 'Chicken satay, 5 sticks', kcal: 250, protein: 24 },
      { food: 'Roti canai with dhal', kcal: 360, protein: 9 },
      { food: 'Mee goreng mamak', kcal: 660, protein: 22 },
      { food: 'Nasi goreng kampung', kcal: 640, protein: 21 },
      { food: 'Milo ais', kcal: 180, protein: 5 }
    ]
  },

  health: {
    stepTarget: 8000,
    steps: [
      { day: 'Mon', value: 7810 }, { day: 'Tue', value: 9240 }, { day: 'Wed', value: 5130 },
      { day: 'Thu', value: 8460 }, { day: 'Fri', value: 6420, today: true },
      { day: 'Sat', value: null }, { day: 'Sun', value: null }
    ],
    sleepTargetMin: 450,
    sleep: [
      { day: 'Mon', minutes: 425 }, { day: 'Tue', minutes: 400 }, { day: 'Wed', minutes: 450 },
      { day: 'Thu', minutes: 350 }, { day: 'Fri', minutes: 370, today: true }
    ],
    restingHr: 62, restingHrWeek: 63,
    workouts: { done: 3, target: 4, last: 'Push day, Thursday' },
    lifts: [
      { name: 'Bench press', sets: '3 × 8', load: '60 kg' },
      { name: 'Overhead press', sets: '3 × 8', load: '35 kg' },
      { name: 'Incline dumbbell press', sets: '3 × 10', load: '20 kg' },
      { name: 'Triceps pushdown', sets: '3 × 12', load: '25 kg' }
    ]
  }
};
