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
  | 'Toys'
  | 'Music'
  | 'Art'
  | 'Other';

export interface User {
  id: string;
  displayName: string;
  email: string;
  avatarUrl?: string;
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

/** All mock items (25+) for deck and browsing */
export const MOCK_ITEMS: Item[] = [
  { id: 'item-1', ownerId: 'user-a', title: 'Vintage Record Player', description: 'Working turntable with wooden case. Great condition, comes with cables.', photos: [picsum('item-1')], valueTier: '$$', pickupLocation: 'Ra\'anana', category: 'Music' },
  { id: 'item-2', ownerId: 'user-b', title: 'Designer Leather Jacket', description: 'Barely worn, size M. Perfect for fall and winter.', photos: [picsum('item-2')], valueTier: '$$$', pickupLocation: 'Tel Aviv', category: 'Clothing' },
  { id: 'item-3', ownerId: 'user-c', title: 'Board Game Collection', description: 'Catan, Ticket to Ride, Codenames. All complete with boxes.', photos: [picsum('item-3')], valueTier: '$', pickupLocation: 'Herzliya', category: 'Toys' },
  { id: 'item-4', ownerId: 'user-d', title: 'Mechanical Keyboard', description: 'Cherry MX Brown, RGB. Used for 6 months.', photos: [picsum('item-4')], valueTier: '$$', pickupLocation: 'Ra\'anana', category: 'Electronics' },
  { id: 'item-5', ownerId: 'user-e', title: 'Pottery Set (4 Mugs)', description: 'Handmade ceramic mugs, dishwasher safe.', photos: [picsum('item-5')], valueTier: '$', pickupLocation: 'Netanya', category: 'Home' },
  { id: 'item-6', ownerId: 'user-f', title: 'Wireless Earbuds', description: 'Brand new, sealed. Great sound and battery life.', photos: [picsum('item-6')], valueTier: '$$', pickupLocation: 'Tel Aviv', category: 'Electronics' },
  { id: 'item-7', ownerId: 'user-g', title: 'Running Shoes Size 10', description: 'Lightly used, excellent cushioning. Model: Cloudflow.', photos: [picsum('item-7')], valueTier: '$$', pickupLocation: 'Haifa', category: 'Sports' },
  { id: 'item-8', ownerId: 'user-h', title: 'Oil Painting Landscape', description: 'Original art, 24x18 in. Signed by artist.', photos: [picsum('item-8')], valueTier: '$$$', pickupLocation: 'Herzliya', category: 'Art' },
  { id: 'item-9', ownerId: 'user-a', title: 'Standing Desk Lamp', description: 'LED, adjustable brightness and color temp.', photos: [picsum('item-9')], valueTier: '$', pickupLocation: 'Ramat Gan', category: 'Home' },
  { id: 'item-10', ownerId: 'user-b', title: 'Vintage Denim Jacket', description: 'Levi’s, size L. Broken in, great fit.', photos: [picsum('item-10')], valueTier: '$$', pickupLocation: 'Tel Aviv', category: 'Clothing' },
  { id: 'item-11', ownerId: 'user-c', title: 'Yoga Mat + Block', description: 'Eco-friendly mat, like new. Block included.', photos: [picsum('item-11')], valueTier: '$', pickupLocation: 'Kfar Saba', category: 'Sports' },
  { id: 'item-12', ownerId: 'user-d', title: 'Bluetooth Speaker', description: 'JBL Flip 5. Waterproof, great bass.', photos: [picsum('item-12')], valueTier: '$$', pickupLocation: 'Ra\'anana', category: 'Electronics' },
  { id: 'item-13', ownerId: 'user-e', title: 'Cookbook Set (3)', description: 'Italian, Baking, and Quick Meals. Hardcovers.', photos: [picsum('item-13')], valueTier: '$', pickupLocation: 'Hod HaSharon', category: 'Books' },
  { id: 'item-14', ownerId: 'user-f', title: 'Throw Pillows (4)', description: 'Velvet, neutral colors. 18x18 in.', photos: [picsum('item-14')], valueTier: '$', pickupLocation: 'Rishon LeZion', category: 'Home' },
  { id: 'item-15', ownerId: 'user-g', title: 'Acoustic Guitar', description: 'Beginner-friendly. Includes soft case and picks.', photos: [picsum('item-15')], valueTier: '$$$', pickupLocation: 'Ra\'anana', category: 'Music' },
  { id: 'item-16', ownerId: 'user-h', title: 'Skateboard Complete', description: '8" deck, good bearings. Some wear.', photos: [picsum('item-16')], valueTier: '$$', pickupLocation: 'Herzliya', category: 'Sports' },
  { id: 'item-17', ownerId: 'user-a', title: 'Desk Organizer Set', description: 'Bamboo, multiple compartments. Minimal style.', photos: [picsum('item-17')], valueTier: '$', pickupLocation: 'Ra\'anana', category: 'Home' },
  { id: 'item-18', ownerId: 'user-b', title: 'Sunglasses Polarized', description: 'Classic aviator style. UV400 protection.', photos: [picsum('item-18')], valueTier: '$$', pickupLocation: 'Petah Tikva', category: 'Clothing' },
  { id: 'item-19', ownerId: 'user-c', title: 'Puzzle 1000 pcs', description: 'Landscape scene, sealed. Family-friendly.', photos: [picsum('item-19')], valueTier: '$', pickupLocation: 'Netanya', category: 'Toys' },
  { id: 'item-20', ownerId: 'user-d', title: 'Tablet Stand', description: 'Adjustable angle, fits 10" tablets. Aluminum.', photos: [picsum('item-20')], valueTier: '$', pickupLocation: 'Ra\'anana', category: 'Electronics' },
  { id: 'item-21', ownerId: 'user-e', title: 'Watercolor Set', description: '24 colors, brushes included. Barely used.', photos: [picsum('item-21')], valueTier: '$$', pickupLocation: 'Haifa', category: 'Art' },
  { id: 'item-22', ownerId: 'user-f', title: 'Novel Collection (5)', description: 'Fiction bestsellers. Good condition.', photos: [picsum('item-22')], valueTier: '$', pickupLocation: 'Ramat Gan', category: 'Books' },
  { id: 'item-23', ownerId: 'user-g', title: 'Camping Chair', description: 'Folding, lightweight. Cup holder and pocket.', photos: [picsum('item-23')], valueTier: '$$', pickupLocation: 'Kfar Saba', category: 'Sports' },
  { id: 'item-24', ownerId: 'user-h', title: 'Vinyl Records (6)', description: 'Classic rock. Played a few times.', photos: [picsum('item-24')], valueTier: '$$', pickupLocation: 'Herzliya', category: 'Music' },
  { id: 'item-25', ownerId: 'user-a', title: 'Plant Pot Set (3)', description: 'Terracotta, drainage holes. 6" each.', photos: [picsum('item-25')], valueTier: '$', pickupLocation: 'Hod HaSharon', category: 'Home' },
  { id: 'item-26', ownerId: 'user-b', title: 'Winter Scarf', description: 'Wool blend, neutral gray. One season.', photos: [picsum('item-26')], valueTier: '$', pickupLocation: 'Ra\'anana', category: 'Clothing' },
  { id: 'item-27', ownerId: 'user-c', title: 'Card Game Bundle', description: 'Uno, Phase 10, Skip-Bo. All complete.', photos: [picsum('item-27')], valueTier: '$', pickupLocation: 'Rishon LeZion', category: 'Toys' },
  { id: 'item-28', ownerId: 'user-d', title: 'USB-C Hub', description: '7-in-1: HDMI, SD, USB 3.0. For Mac/PC.', photos: [picsum('item-28')], valueTier: '$$', pickupLocation: 'Ra\'anana', category: 'Electronics' },
  { id: 'item-29', ownerId: 'user-e', title: 'Framed Print', description: 'Abstract art print, 12x16. Frame included.', photos: [picsum('item-29')], valueTier: '$$', pickupLocation: 'Netanya', category: 'Art' },
  { id: 'item-30', ownerId: 'user-f', title: 'Resistance Bands', description: 'Set of 5, various strengths. With door anchor.', photos: [picsum('item-30')], valueTier: '$', pickupLocation: 'Petah Tikva', category: 'Sports' },
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
