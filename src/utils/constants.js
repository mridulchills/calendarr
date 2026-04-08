// Month hero images from Unsplash — season-appropriate
export const MONTH_IMAGES = {
  0: 'https://images.unsplash.com/photo-1491002052546-bf38f186af56?w=1200&h=800&fit=crop',
  1: 'https://images.unsplash.com/photo-1457269449834-928af64c684d?w=1200&h=800&fit=crop',
  2: 'https://images.unsplash.com/photo-1490750967868-88aa4f44baee?w=1200&h=800&fit=crop',
  3: 'https://images.unsplash.com/photo-1462275646964-a0e3c11f18a6?w=1200&h=800&fit=crop',
  4: 'https://images.unsplash.com/photo-1495584816685-4bdbf1b5057e?w=1200&h=800&fit=crop',
  5: 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=1200&h=800&fit=crop',
  6: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&h=800&fit=crop',
  7: 'https://images.unsplash.com/photo-1473496169904-658ba7c44d8a?w=1200&h=800&fit=crop',
  8: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=1200&h=800&fit=crop',
  9: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=1200&h=800&fit=crop',
  10: 'https://images.unsplash.com/photo-1510414842594-a61c69b5ae57?w=1200&h=800&fit=crop',
  11: 'https://images.unsplash.com/photo-1482442120256-9c03866de390?w=1200&h=800&fit=crop',
};

export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export const MONTH_ABBREVS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

export const DAY_NAMES = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

export const DAY_FULL_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export const NOTE_COLORS = [
  { name: 'rose', bg: '#fce7f3', fg: '#f43f5e', dark: '#be123c', ring: '#fda4af' },
  { name: 'amber', bg: '#fef3c7', fg: '#f59e0b', dark: '#b45309', ring: '#fbbf24' },
  { name: 'emerald', bg: '#d1fae5', fg: '#10b981', dark: '#047857', ring: '#6ee7b7' },
  { name: 'sky', bg: '#e0f2fe', fg: '#0ea5e9', dark: '#0369a1', ring: '#7dd3fc' },
  { name: 'violet', bg: '#ede9fe', fg: '#8b5cf6', dark: '#6d28d9', ring: '#a78bfa' },
  { name: 'slate', bg: '#f1f5f9', fg: '#64748b', dark: '#334155', ring: '#94a3b8' },
];

// One accent color per month — the only color besides neutrals
export const MONTH_ACCENTS = [
  '#5B8DEF', // Jan — cool steel blue
  '#E8638B', // Feb — valentines rose
  '#4CAF82', // Mar — spring green
  '#F06292', // Apr — cherry blossom pink
  '#F5A623', // May — warm gold
  '#26C6DA', // Jun — ocean teal
  '#FF7043', // Jul — warm coral
  '#EAB308', // Aug — sunflower
  '#E67E22', // Sep — burnt orange
  '#EF5350', // Oct — crimson
  '#AB47BC', // Nov — amethyst
  '#5C6BC0', // Dec — deep indigo
];

export const STORAGE_KEY = 'wall-calendar-notes';
