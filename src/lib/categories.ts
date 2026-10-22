// Keyword categoriser. First match wins, so the more specific groups come first
// (jars and sauces before produce, crisps before cheese, baguettes before garlic).
export const CATEGORIES = [
  ['Fuel', /\b(diesel|unleaded|petrol)\b/i],
  // Medicines, vitamins and supplements, first aid, cold and flu, maternity. "vitamin <word>" so squash
  // "with Vitamins" stays a drink.
  ['Health', /tesco health|calpol|paracetamol|ibuprofen|pain relief|\bvitamin \w|multivitamin|supplement|cough|lemsip|strepsils|vapou?r (rub|plug)|snufflebabe|plasters|antiseptic|electrolyte|rehydration|pregnancy|maternity|breast pads|sterilising|insect bites|anthisan/i],
  // Non-food: F&F clothing, homeware, flowers, toys, books, cards and stationery. Word-bounded so
  // "dressing", "cardigan" vs "card" and kitchen towel don't cross over.
  ['Clothing & home', /f&f|\b(jeans|trousers|cardigan|hoodie|jumper|t-shirt|sweatshirt|dress|leggings|pyjamas|socks|gloves)\b|candle|bedding|fitted sheets?|fleece throw|pillow|duvet|cushion|(beach|bath|hand|tea) towel|hiball|food ?savers|mixing bowl|tulips|bouquet(?!.*(deodorant|antiperspirant|cake))|daffodil|\bflowers\b|lego|early learning centre|activity book|sticker|peter rabbit|julia donaldson|greeting card|\bcard\b|\bbday\b|mother's day|father's day|valentine|carlton|woodmansterne|hallmark|uk ?greetings|paperlink|paper rose|in(k)?drops|balloons|rosette|\bpens\b|pencil|hole punch|craft supplies/i],
  ['Cupboard', /sauce|stock pot|soup|conserve|chutney|\bjam\b|pasta|noodles|seasoning|vinegar|lemon curd|chocolate chips|condensed milk|\boil\b|mayonnaise|ketchup|flour|sugar\b(?! free)|cereal(?! (biscuit|snack|bar))|cornflakes|granola(?! bar)|muesli|porridge|(clear|set|runny) honey|raisins|peanut butter(?! chip)|dressing|\brice\b(?! cakes?)|cous ?cous|(jumbo|rolled) oats|wheats|passata|pesto|baked bean|beanz|\bextract\b|syrup|food colou?r|sprinkle|hundreds & thousands|bicarbonate|paprika \d|oregano|crushed chillies|ras el hanout|(ginger|tomato) puree|mustard|chia seeds|walnuts|pecan|chopped apricots/i],
  ['Baby & kids', /napp|\bbaby\b(?! (plum|tomato|spinach|potato|corn|leaf|carrot))|wipes|fred & flo|huggies|pampers|swim pants|little yeos|kids|kiddylicious|goodies|childs farm|ella's|organix|fromage frais pouch|\bmam\b|munchkin|tiny to tots|tommee tippee|soothers?|anti-colic/i],
  ['Household', /dishwasher|rinse aid|detergent|washing powder|laundry|disinfectant|zoflora|fabric conditioner|washing up|cleaner|polish|sponge|bin liner|caddy liner|kitchen (foil|towel|roll)|toilet tissue|diffuser|difuser|bleach|anti ?bac|cling film|batteries|dishmatic|tumble dryer|cistern|toilet bowl|descal|soda crystals|de-?icer|foil platters|baking paper|household towel/i],
  ['Toiletries', /shampoo|conditioner|cond\b|shower gel|body wash|deodorant|anti ?perspirant|razor|cotton wool|spf|revitalift|toothpaste|mouthwash|toothbrush|hand ?wash|bodywash|\bwash\b|lotion|cleanser|toner|lip balm|foundation|pressed powder|foot mask|maybelline|rimmel|tampons|free spirit/i],
  ['Meat & fish', /beef|chicken|ham\b|ham slices|sausage|chorizo|tuna|mince|pork|bacon|salmon|cod\b|turkey|lamb|prawn(?!.*crisps)|gammon|burgers?(?! buns?)|quarter pounders?|lardons|steaks?(?! slice)/i],
  ['Drinks', /squash|juice|lemonade|tango|dr pepper|fanta|\bcoca\b|\bcola\b|pepsi|capsules|cof+ee|espresso|rubicon|\bwater\b|matcha|tea ?bags|cans\b|\bstout\b|\bbeer\b|lager|cider/i],
  ['Frozen', /frozen|ice cream|dippers|fries|chips\b|garden peas|fish fingers|hash browns|ice cubes/i],
  ['Snacks & treats', /crisps|chocolate|biscuit|biscotti|biscoff|nutella|flapjack|crackers|ritz|rice cakes|poppadom|oat sticks|sweets|haribo|cookies|cake|cadbury|toblerone|maltesers|\brolo\b|creme egg|crunchie|wispa|\bbites\b|munch bars?|hula hoops|crisp sticks|\bpeanuts\b|fruit treasures|fruit shapes|soreen|nature valley/i],
  ['Dairy & eggs', /milk(?! chocolate)|cheese|cheddar|yog(h)?urt|cream(?! crackers)|(?<!peanut )butter(?!milk)|butterpak|eggs|babybel|mozzarella|feta|parmigiano|philadelphia|tzatziki|fromage|creme fraiche|mild slices/i],
  ['Bakery', /bread|baguette|naan|wrap|crumpet|muf+ins|mufns|breadstick|bagel|croissant|brioche|pancake|\bbuns?\b|pain au chocolat|ciabatt|sourdough|\brolls\b|\bbaton\b/i],
  ['Chilled & ready', /houmous|hummus|tortelloni|ravioli|tofu|gnocchi|dips?\b|pizza|ready meal|quiche|coleslaw|pastry|steak slice/i],
  ['Fruit & veg', /apple|banana|courgette|kiwi|grape|plum|pear|orange|peeler|pineapple|watermelon|melon|mango|berr(y|ies)|avocado|potato|onion|carrot|parsnip|broccoli|cucumber|pepper|celery|tomato|green beans|iceberg|lettuce|salad|beansprout|garlic|basil|thyme|sweet ?corn|jalapeno|peas\b|lemon(?! curd)|lime|fruit mix|spinach(?! &)|nectarine|pumpkin|\bmint\b/i],
] as const satisfies readonly (readonly [string, RegExp])[];

/** Anything no keyword matches, including in-store lines Tesco prints without a name. */
export type Category = (typeof CATEGORIES)[number][0] | 'Other';

export const categorise = (name: string): Category =>
  (CATEGORIES.find(([, re]) => re.test(name))?.[0] as Category | undefined) ?? 'Other';

/** Unit for weighed prices: fuel is sold by the litre, loose produce by the kg. */
export const weighedUnit = (category: Category) => (category === 'Fuel' ? 'litre' : 'kg');

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
  Fuel: '⛽',
  Health: '💊',
  'Clothing & home': '👕',
  Other: '🏷️',
};
