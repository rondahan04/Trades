/**
 * Trades – Data models and mock data.
 * Value tier: $ | $$ | $$$. Categories for filtering.
 */

export type ValueTier = '$' | '$$' | '$$$';

export type ItemCategory =
  | 'Electronics'
  | 'Clothing'
  | 'Home'
  | 'Sports'
  | 'Books'
  | 'SneakerHead'
  | 'Art'
  | 'Other';

export interface User {
  id: string;
  displayName: string;
  email: string;
  avatarUrl?: string;
  bio?: string;
  location?: string;
  /** Plain text for mock auth only */
  password?: string;
}

export interface Item {
  id: string;
  ownerId: string;
  title: string;
  description: string;
  photos: string[];
  valueTier: ValueTier;
  pickupLocation: string;
  category: ItemCategory;
}

/** Mock users – password as noted; a@gmail.com uses 123456 */
export const MOCK_USERS: User[] = [
  { id: 'user-mock', displayName: 'Alex', email: 'a@gmail.com', password: '123456', avatarUrl: 'https://i.pravatar.cc/150?u=a' },
  { id: 'user-a', displayName: 'Yael', email: 'yael@example.com', password: 'password', avatarUrl: 'https://i.pravatar.cc/150?u=yael' },
  { id: 'user-b', displayName: 'Omer', email: 'omer@example.com', password: 'password', avatarUrl: 'https://i.pravatar.cc/150?u=omer' },
  { id: 'user-c', displayName: 'Noa', email: 'noa@example.com', password: 'password', avatarUrl: 'https://i.pravatar.cc/150?u=noa' },
  { id: 'user-d', displayName: 'Dan', email: 'dan@example.com', password: 'password', avatarUrl: 'https://i.pravatar.cc/150?u=dan' },
  { id: 'user-e', displayName: 'Shira', email: 'shira@example.com', password: 'password', avatarUrl: 'https://i.pravatar.cc/150?u=shira' },
  { id: 'user-f', displayName: 'Eitan', email: 'eitan@example.com', password: 'password', avatarUrl: 'https://i.pravatar.cc/150?u=eitan' },
  { id: 'user-g', displayName: 'Tamar', email: 'tamar@example.com', password: 'password', avatarUrl: 'https://i.pravatar.cc/150?u=tamar' },
  { id: 'user-h', displayName: 'Roni', email: 'roni@example.com', password: 'password', avatarUrl: 'https://i.pravatar.cc/150?u=roni' },
];

const picsum = (seed: string, w = 600, h = 400) =>
  `https://picsum.photos/seed/${encodeURIComponent(seed)}/${w}/${h}`;

/** Mock items (~10) for deck and browsing */
export const MOCK_ITEMS: Item[] = [
  { id: 'item-1', ownerId: 'user-a', title: 'Vintage Record Player', description: 'Working turntable with wooden case. Great condition, comes with cables.', photos: [picsum('item-1')], valueTier: '$$', pickupLocation: 'Ra\'anana', category: 'Electronics' },
  { id: 'item-2', ownerId: 'user-b', title: 'Designer Leather Jacket', description: 'Barely worn, size M. Perfect for fall and winter.', photos: [picsum('item-2')], valueTier: '$$$', pickupLocation: 'Tel Aviv', category: 'Clothing' },
  { id: 'item-3', ownerId: 'user-c', title: 'Board Game Collection', description: 'Catan, Ticket to Ride, Codenames. All complete with boxes.', photos: [picsum('item-3')], valueTier: '$', pickupLocation: 'Herzliya', category: 'Other' },
  { id: 'item-4', ownerId: 'user-d', title: 'Mechanical Keyboard', description: 'Cherry MX Brown, RGB. Used for 6 months.', photos: [picsum('item-4')], valueTier: '$$', pickupLocation: 'Ra\'anana', category: 'Electronics' },
  { id: 'item-5', ownerId: 'user-e', title: 'Pottery Set (4 Mugs)', description: 'Handmade ceramic mugs, dishwasher safe.', photos: [picsum('item-5')], valueTier: '$', pickupLocation: 'Netanya', category: 'Home' },
  { id: 'item-6', ownerId: 'user-f', title: 'Wireless Earbuds', description: 'Brand new, sealed. Great sound and battery life.', photos: [picsum('item-6')], valueTier: '$$', pickupLocation: 'Tel Aviv', category: 'Electronics' },
  { id: 'item-7', ownerId: 'user-g', title: 'Running Shoes Size 10', description: 'Lightly used, excellent cushioning. Model: Cloudflow.', photos: [picsum('item-7')], valueTier: '$$', pickupLocation: 'Haifa', category: 'Sports' },
  { id: 'item-8', ownerId: 'user-h', title: 'Oil Painting Landscape', description: 'Original art, 24x18 in. Signed by artist.', photos: [picsum('item-8')], valueTier: '$$$', pickupLocation: 'Herzliya', category: 'Art' },
  { id: 'item-9', ownerId: 'user-a', title: 'Standing Desk Lamp', description: 'LED, adjustable brightness and color temp.', photos: [picsum('item-9')], valueTier: '$', pickupLocation: 'Ramat Gan', category: 'Home' },
  { id: 'item-10', ownerId: 'user-b', title: 'Vintage Denim Jacket', description: 'Levi\'s, size L. Broken in, great fit.', photos: [picsum('item-10')], valueTier: '$$', pickupLocation: 'Tel Aviv', category: 'Clothing' },
  { id: 'item-mock', ownerId: 'user-mock', title: 'Demo Listed Item', description: 'Your first item when logged in as a@gmail.com.', photos: [picsum('item-mock')], valueTier: '$', pickupLocation: 'Tel Aviv', category: 'Other' },
];

/** Default deck for Swipe (same as all items; filter by tier in UI) */
export const MOCK_DECK_ITEMS: Item[] = [...MOCK_ITEMS];

export function getItemById(id: string): Item | undefined {
  return MOCK_ITEMS.find((i) => i.id === id);
}

export function getUserById(id: string): User | undefined {
  return MOCK_USERS.find((u) => u.id === id);
}

export function getItemsByOwnerId(ownerId: string): Item[] {
  return MOCK_ITEMS.filter((i) => i.ownerId === ownerId);
}
