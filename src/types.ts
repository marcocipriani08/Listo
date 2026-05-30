export interface UserProfile {
  id: string;
  email: string;
  familyId?: string;
  joinedFamilies?: string[];
  name?: string;
  createdAt: Date | any;
  updatedAt: Date | any;
}

export interface Family {
  id: string;
  name: string;
  ownerId: string;
  password?: string;
  createdAt: Date | any;
}

export interface ShoppingItem {
  id: string;
  title: string;
  categoryId: string;
  quantity: number;
  completed: boolean;
  addedBy: string;
  createdAt: Date | any;
  updatedAt: Date | any;
}

export interface ShoppingHistory {
  id: string;
  title: string;
  categoryId: string;
  count: number;
  updatedAt: Date | any;
}

export interface Invitation {
  id: string;
  familyId: string;
  familyName: string;
  fromUserEmail: string;
  toUserEmail: string;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: Date | any;
}

export const CATEGORIES = [
  { id: 'fruit', label: 'Frutta & Verdura', icon: 'Apple' },
  { id: 'dairy', label: 'Latticini & Uova', icon: 'Milk' },
  { id: 'meat', label: 'Carne & Pesce', icon: 'Beef' },
  { id: 'bakery', label: 'Pane & Dolci', icon: 'Croissant' },
  { id: 'drinks', label: 'Bevande', icon: 'Wine' },
  { id: 'pantry', label: 'Dispensa', icon: 'Package' },
  { id: 'household', label: 'Casa & Igiene', icon: 'Sparkles' },
  { id: 'other', label: 'Altro', icon: 'ShoppingBag' }
];

export function guessCategory(title: string): string {
  const t = title.toLowerCase();
  if (t.match(/(mela|banana|insalata|pomodor|zucchine|patat|cipoll|frutt|verdur)/)) return 'fruit';
  if (t.match(/(latte|formagg|burro|uov|yogurt|mozzarella|parmigiano)/)) return 'dairy';
  if (t.match(/(carne|pesce|pollo|bistec|salsicci|prosciutt|salame)/)) return 'meat';
  if (t.match(/(pane|biscott|croissant|torta|farin)/)) return 'bakery';
  if (t.match(/(acqu|vino|birr|succo|coca|caff|tè)/)) return 'drinks';
  if (t.match(/(past|ris|oli|sal|zucher|cereal|sug)/)) return 'pantry';
  if (t.match(/(sapon|bagnoschium|dentifrici|carta|detersiv|spugn)/)) return 'household';
  return 'other';
}
