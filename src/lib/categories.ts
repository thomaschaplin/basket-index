// Keyword categoriser. First match wins, so the more specific groups come first
// (jars and sauces before produce, crisps before cheese, baguettes before garlic).
export const CATEGORIES = [
  ['Cupboard', /sauce|stock pot|soup|conserve|chutney|\bjam\b|pasta|noodles|seasoning|vinegar|lemon curd|chocolate chips|condensed milk|\boil\b|mayonnaise|ketchup|flour|sugar\b(?! free)/i],
  ['Baby & kids', /napp|\bbaby\b(?! (plum|tomato|spinach|potato|corn|leaf|carrot))|wipes|fred & flo|huggies|pampers|swim pants|little yeos|kids|kiddylicious|goodies|childs farm|ella's|organix|fromage frais pouch/i],
  ['Household', /dishwasher|rinse aid|detergent|washing powder|fabric conditioner|washing up|cleaner|polish|sponge|bin liner|caddy liner|kitchen (foil|towel|roll)|toilet tissue|diffuser|difuser|bleach|anti ?bac|cling film|batteries/i],
  ['Toiletries', /shampoo|conditioner|cond\b|shower gel|body wash|deodorant|anti ?perspirant|razor|cotton wool|spf|revitalift|toothpaste|mouthwash|toothbrush|hand wash|lotion/i],
  ['Meat & fish', /beef|chicken|ham\b|ham slices|sausage|chorizo|tuna|mince|pork|bacon|salmon|cod\b|turkey|lamb|prawn(?!.*crisps)/i],
  ['Drinks', /squash|juice|lemonade|tango|dr pepper|fanta|\bcoca\b|\bcola\b|pepsi|capsules|cof+ee|espresso|rubicon|\bwater\b|matcha|tea ?bags|cans\b/i],
  ['Frozen', /frozen|ice cream|dippers|fries|chips\b|garden peas/i],
  ['Snacks & treats', /crisps|chocolate|biscuit|biscotti|biscoff|nutella|flapjack|crackers|ritz|rice cakes|poppadom|oat sticks|sweets|haribo|cookies|cake/i],
  ['Dairy & eggs', /milk(?! chocolate)|cheese|cheddar|yog(h)?urt|cream(?! crackers)|(?<!peanut )butter(?!milk)|butterpak|eggs|babybel|mozzarella|feta|parmigiano|philadelphia|tzatziki|fromage/i],
  ['Bakery', /bread|baguette|naan|wrap|crumpet|muf+ins|mufns|breadstick|bagel|croissant|brioche|pancake/i],
  ['Chilled & ready', /houmous|hummus|tortelloni|ravioli|tofu|gnocchi|dip\b|pizza|ready meal|quiche|coleslaw/i],
  ['Fruit & veg', /apple|banana|courgette|kiwi|grape|plum|pear|orange|peeler|pineapple|watermelon|melon|mango|berr(y|ies)|avocado|potato|onion|carrot|parsnip|broccoli|cucumber|pepper|celery|tomato|green beans|iceberg|lettuce|salad|beansprout|garlic|basil|thyme|sweet ?corn|jalapeno|peas\b|lemon(?! curd)|lime|fruit mix|spinach(?! &)/i],
] as const satisfies readonly (readonly [string, RegExp])[];

export type Category = (typeof CATEGORIES)[number][0];

export const categorise = (name: string): Category =>
  (CATEGORIES.find(([, re]) => re.test(name))?.[0] as Category | undefined) ?? 'Cupboard';

export const CATEGORY_EMOJI: Record<Category, string> = {
  'Fruit & veg': '🥦',
  'Dairy & eggs': '🧀',
  'Meat & fish': '🍗',
  Drinks: '🥤',
  'Snacks & treats': '🍫',
  Bakery: '🥖',
  'Baby & kids': '🍼',
  Toiletries: '🧴',
  Household: '🧽',
  Frozen: '🧊',
  'Chilled & ready': '🥡',
  Cupboard: '🥫',
};
