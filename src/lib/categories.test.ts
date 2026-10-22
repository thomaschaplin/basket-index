import { describe, expect, it } from 'vitest';
import { CATEGORIES, categorise, weighedUnit } from './categories';

// Real-looking product names, including the cases the keyword order exists for. Add one here whenever a keyword changes.
const cases: [string, ReturnType<typeof categorise>][] = [
  // Fuel and health
  ['Unleaded Petrol', 'Fuel'],
  ['Diesel', 'Fuel'],
  ['Calpol Infant Suspension 6+ Months 100ml', 'Health'],
  ['Tesco Health Paracetamol 500mg Caplets 16 Pack', 'Health'],
  ['Tesco Vitamin D 1000iu Tablets 90 Pack', 'Health'],
  ['Robinsons Orange Squash with Vitamins 1L', 'Drinks'],
  // Clothing and home, word-bounded
  ['F&F Kids Pyjamas', 'Clothing & home'],
  ['Woodmansterne Birthday Card', 'Clothing & home'],
  ['Tesco Tulips 10 Stems', 'Clothing & home'],
  ["Hellmann's Caesar Dressing 250ml", 'Cupboard'],
  ['Tesco Hand Towel', 'Clothing & home'],
  ['Tesco Kitchen Towel 2 Roll', 'Household'],
  // Cupboard before produce, crisps and cheese
  ['Dolmio Bolognese Sauce 500g', 'Cupboard'],
  ['Tesco Lemon Curd 411g', 'Cupboard'],
  ['Lemons Loose', 'Fruit & veg'],
  ['Sun-Pat Smooth Peanut Butter 400g', 'Cupboard'],
  ['Tesco Long Grain Rice 1kg', 'Cupboard'],
  ['Kallo Rice Cakes Lightly Salted', 'Snacks & treats'],
  ['Heinz Baked Beanz 4 x 415g', 'Cupboard'],
  ['Tesco Granola 1kg', 'Cupboard'],
  ['Nature Valley Granola Bar Oats & Honey', 'Snacks & treats'],
  // Baby, but not baby veg
  ['Pampers Baby Dry Nappies Size 4', 'Baby & kids'],
  ['Tesco Baby Plum Tomatoes 325g', 'Fruit & veg'],
  ['Tesco Baby Spinach 240g', 'Fruit & veg'],
  // Household and toiletries
  ['Finish Dishwasher Tablets 60 Pack', 'Household'],
  ['Lenor Fabric Conditioner 1.19L', 'Household'],
  ['Pantene Conditioner 400ml', 'Toiletries'],
  ['Colgate Toothpaste 75ml', 'Toiletries'],
  // Meat and fish, not their look-alikes
  ['Tesco British Chicken Breast Fillets 640g', 'Meat & fish'],
  ['Tesco Beef Burgers 4 Pack', 'Meat & fish'],
  ['Tesco Burger Buns 6 Pack', 'Bakery'],
  ['Walkers Prawn Cocktail Crisps 6 Pack', 'Snacks & treats'],
  // Drinks
  ['Coca Cola Zero 8 x 330ml Cans', 'Drinks'],
  ['Kenco Smooth Instant Coffee 200g', 'Drinks'],
  ['Tesco Still Water 6 x 2L', 'Drinks'],
  // Frozen and snacks
  ['Birds Eye Fish Fingers 10 Pack', 'Frozen'],
  ['Tesco Garden Peas 1kg', 'Frozen'],
  ['Cadbury Dairy Milk Chocolate Bar 110g', 'Snacks & treats'],
  ["McVitie's Digestive Biscuits 400g", 'Snacks & treats'],
  // Dairy, not its look-alikes
  ['Tesco Semi Skimmed Milk 2.272L, 4 Pints', 'Dairy & eggs'],
  ['Cathedral City Mature Cheddar 350g', 'Dairy & eggs'],
  ["Jacob's Cream Crackers 200g", 'Snacks & treats'],
  ['Lurpak Slightly Salted Butter 250g', 'Dairy & eggs'],
  ['Tesco British Free Range Eggs 12 Pack', 'Dairy & eggs'],
  // Bakery, chilled, produce
  ['Tesco White Baguette', 'Bakery'],
  ['Warburtons Toastie White Bread 800g', 'Bakery'],
  ['Tesco Reduced Fat Houmous 200g', 'Chilled & ready'],
  ['Bananas Loose', 'Fruit & veg'],
  ['Tesco Garlic 4 Pack', 'Fruit & veg'],
  ['Tesco Garlic Baguette 2 Pack', 'Bakery'],
  ['Tesco Red Peppers 3 Pack', 'Fruit & veg'],
  // Nothing matches, including Tesco's nameless in-store lines
  ['', 'Other'],
  ['Tesco Thing 1 Pack', 'Other'],
];

describe('categorise', () => {
  it.each(cases)('%s -> %s', (name, category) => {
    expect(categorise(name)).toBe(category);
  });

  it('ignores case', () => {
    expect(categorise('UNLEADED')).toBe('Fuel');
  });

  it('has no duplicate category names', () => {
    const names = CATEGORIES.map(([name]) => name);
    expect(new Set(names).size).toBe(names.length);
  });

  it('prices fuel by the litre and loose produce by the kg', () => {
    expect(weighedUnit('Fuel')).toBe('litre');
    expect(weighedUnit('Fruit & veg')).toBe('kg');
  });
});
