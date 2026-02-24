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

/** Mock users – password is "password" for all in mock */
export const MOCK_USERS: User[] = [
  { id: 'user-a', displayName: 'Yael', email: 'yael@example.com', password: 'password', avatarUrl: 'https://i.pravatar.cc/150?u=yael' },
  { id: 'user-b', displayName: 'Omer', email: 'omer@example.com', password: 'password', avatarUrl: 'https://i.pravatar.cc/150?u=omer' },
  { id: 'user-c', displayName: 'Noa', email: 'noa@example.com', password: 'password', avatarUrl: 'https://i.pravatar.cc/150?u=noa' },
  { id: 'user-d', displayName: 'Dan', email: 'dan@example.com', password: 'password', avatarUrl: 'https://i.pravatar.cc/150?u=dan' },
  { id: 'user-e', displayName: 'Shira', email: 'shira@example.com', password: 'password', avatarUrl: 'https://i.pravatar.cc/150?u=shira' },
  { id: 'user-f', displayName: 'Eitan', email: 'eitan@example.com', password: 'password', avatarUrl: 'https://i.pravatar.cc/150?u=eitan' },
  { id: 'user-g', displayName: 'Tamar', email: 'tamar@example.com', password: 'password', avatarUrl: 'https://i.pravatar.cc/150?u=tamar' },
  { id: 'user-h', displayName: 'Roni', email: 'roni@example.com', password: 'password', avatarUrl: 'https://i.pravatar.cc/150?u=roni' },
];

const unsplash = (id: string, w = 600) =>
  `https://images.unsplash.com/photo-${id}?w=${w}`;

/** All mock items (25+) for deck and browsing */
export const MOCK_ITEMS: Item[] = [
  { id: 'item-1', ownerId: 'user-a', title: 'Vintage Record Player', description: 'Working turntable with wooden case. Great condition, comes with cables.', photos: [unsplash('1588979353373-340e129bb785')], valueTier: '$$', pickupLocation: 'Ra\'anana', category: 'Music' },
  { id: 'item-2', ownerId: 'user-b', title: 'Designer Leather Jacket', description: 'Barely worn, size M. Perfect for fall and winter.', photos: [unsplash('1551028719-00167b16eac5')], valueTier: '$$$', pickupLocation: 'Tel Aviv', category: 'Clothing' },
  { id: 'item-3', ownerId: 'user-c', title: 'Board Game Collection', description: 'Catan, Ticket to Ride, Codenames. All complete with boxes.', photos: [unsplash('1611892440504-42a792e24d32')], valueTier: '$', pickupLocation: 'Herzliya', category: 'Toys' },
  { id: 'item-4', ownerId: 'user-d', title: 'Mechanical Keyboard', description: 'Cherry MX Brown, RGB. Used for 6 months.', photos: [unsplash('1511467687858-23d96c32e4ae')], valueTier: '$$', pickupLocation: 'Ra\'anana', category: 'Electronics' },
  { id: 'item-5', ownerId: 'user-e', title: 'Pottery Set (4 Mugs)', description: 'Handmade ceramic mugs, dishwasher safe.', photos: [unsplash('1578749556568-bc2c40e68b61')], valueTier: '$', pickupLocation: 'Netanya', category: 'Home' },
  { id: 'item-6', ownerId: 'user-f', title: 'Wireless Earbuds', description: 'Brand new, sealed. Great sound and battery life.', photos: [unsplash('1598335624144-7d340393ef42')], valueTier: '$$', pickupLocation: 'Tel Aviv', category: 'Electronics' },
  { id: 'item-7', ownerId: 'user-g', title: 'Running Shoes Size 10', description: 'Lightly used, excellent cushioning. Model: Cloudflow.', photos: [unsplash('1542291026-7eec264c27ff')], valueTier: '$$', pickupLocation: 'Haifa', category: 'Sports' },
  { id: 'item-8', ownerId: 'user-h', title: 'Oil Painting Landscape', description: 'Original art, 24x18 in. Signed by artist.', photos: [unsplash('1579783902614-a3eb389d2f0d')], valueTier: '$$$', pickupLocation: 'Herzliya', category: 'Art' },
  { id: 'item-9', ownerId: 'user-a', title: 'Standing Desk Lamp', description: 'LED, adjustable brightness and color temp.', photos: [unsplash('1507473886365-60a050696e96')], valueTier: '$', pickupLocation: 'Ramat Gan', category: 'Home' },
  { id: 'item-10', ownerId: 'user-b', title: 'Vintage Denim Jacket', description: 'Levi’s, size L. Broken in, great fit.', photos: [unsplash('1551028719-00167b16eac5')], valueTier: '$$', pickupLocation: 'Tel Aviv', category: 'Clothing' },
  { id: 'item-11', ownerId: 'user-c', title: 'Yoga Mat + Block', description: 'Eco-friendly mat, like new. Block included.', photos: [unsplash('1601925260363-bb5909f0d1e0')], valueTier: '$', pickupLocation: 'Kfar Saba', category: 'Sports' },
  { id: 'item-12', ownerId: 'user-d', title: 'Bluetooth Speaker', description: 'JBL Flip 5. Waterproof, great bass.', photos: [unsplash('1545454675392-871ae56342b0')], valueTier: '$$', pickupLocation: 'Ra\'anana', category: 'Electronics' },
  { id: 'item-13', ownerId: 'user-e', title: 'Cookbook Set (3)', description: 'Italian, Baking, and Quick Meals. Hardcovers.', photos: [unsplash('1544947950-fa07a98d237f')], valueTier: '$', pickupLocation: 'Hod HaSharon', category: 'Books' },
  { id: 'item-14', ownerId: 'user-f', title: 'Throw Pillows (4)', description: 'Velvet, neutral colors. 18x18 in.', photos: [unsplash('1584100936595-4a2c90e4c819')], valueTier: '$', pickupLocation: 'Rishon LeZion', category: 'Home' },
  { id: 'item-15', ownerId: 'user-g', title: 'Acoustic Guitar', description: 'Beginner-friendly. Includes soft case and picks.', photos: [unsplash('1510915365374-1b7d0e1e7b2a')], valueTier: '$$$', pickupLocation: 'Ra\'anana', category: 'Music' },
  { id: 'item-16', ownerId: 'user-h', title: 'Skateboard Complete', description: '8" deck, good bearings. Some wear.', photos: [unsplash('1561214115-f8f18f2a4a0d')], valueTier: '$$', pickupLocation: 'Herzliya', category: 'Sports' },
  { id: 'item-17', ownerId: 'user-a', title: 'Desk Organizer Set', description: 'Bamboo, multiple compartments. Minimal style.', photos: [unsplash('1582735689369-4fe89db7114c')], valueTier: '$', pickupLocation: 'Ra\'anana', category: 'Home' },
  { id: 'item-18', ownerId: 'user-b', title: 'Sunglasses Polarized', description: 'Classic aviator style. UV400 protection.', photos: [unsplash('1572635198757-2e8e0c2c2c2c')], valueTier: '$$', pickupLocation: 'Petah Tikva', category: 'Clothing' },
  { id: 'item-19', ownerId: 'user-c', title: 'Puzzle 1000 pcs', description: 'Landscape scene, sealed. Family-friendly.', photos: [unsplash('1587654780291-39c9404d7462')], valueTier: '$', pickupLocation: 'Netanya', category: 'Toys' },
  { id: 'item-20', ownerId: 'user-d', title: 'Tablet Stand', description: 'Adjustable angle, fits 10" tablets. Aluminum.', photos: [unsplash('1527864550417-8fd3357ea8e2')], valueTier: '$', pickupLocation: 'Ra\'anana', category: 'Electronics' },
  { id: 'item-21', ownerId: 'user-e', title: 'Watercolor Set', description: '24 colors, brushes included. Barely used.', photos: [unsplash('1513364776144-60967b0f800f')], valueTier: '$$', pickupLocation: 'Haifa', category: 'Art' },
  { id: 'item-22', ownerId: 'user-f', title: 'Novel Collection (5)', description: 'Fiction bestsellers. Good condition.', photos: [unsplash('1544947950-fa07a98d237f')], valueTier: '$', pickupLocation: 'Ramat Gan', category: 'Books' },
  { id: 'item-23', ownerId: 'user-g', title: 'Camping Chair', description: 'Folding, lightweight. Cup holder and pocket.', photos: [unsplash('1504280390367-6c43544e1c66')], valueTier: '$$', pickupLocation: 'Kfar Saba', category: 'Sports' },
  { id: 'item-24', ownerId: 'user-h', title: 'Vinyl Records (6)', description: 'Classic rock. Played a few times.', photos: [unsplash('1588979353373-340e129bb785')], valueTier: '$$', pickupLocation: 'Herzliya', category: 'Music' },
  { id: 'item-25', ownerId: 'user-a', title: 'Plant Pot Set (3)', description: 'Terracotta, drainage holes. 6" each.', photos: [unsplash('1485955901406-8c4498f2a2a2')], valueTier: '$', pickupLocation: 'Hod HaSharon', category: 'Home' },
  { id: 'item-26', ownerId: 'user-b', title: 'Winter Scarf', description: 'Wool blend, neutral gray. One season.', photos: [unsplash('1520903920243-00d872a2d1c9')], valueTier: '$', pickupLocation: 'Ra\'anana', category: 'Clothing' },
  { id: 'item-27', ownerId: 'user-c', title: 'Card Game Bundle', description: 'Uno, Phase 10, Skip-Bo. All complete.', photos: [unsplash('1611892440504-42a792e24d32')], valueTier: '$', pickupLocation: 'Rishon LeZion', category: 'Toys' },
  { id: 'item-28', ownerId: 'user-d', title: 'USB-C Hub', description: '7-in-1: HDMI, SD, USB 3.0. For Mac/PC.', photos: [unsplash('1593640408182-4f7c2a1a0a0a')], valueTier: '$$', pickupLocation: 'Ra\'anana', category: 'Electronics' },
  { id: 'item-29', ownerId: 'user-e', title: 'Framed Print', description: 'Abstract art print, 12x16. Frame included.', photos: [unsplash('1579783902614-a3eb389d2f0d')], valueTier: '$$', pickupLocation: 'Netanya', category: 'Art' },
  { id: 'item-30', ownerId: 'user-f', title: 'Resistance Bands', description: 'Set of 5, various strengths. With door anchor.', photos: [unsplash('1517836351103-84c1c8e0c0c0')], valueTier: '$', pickupLocation: 'Petah Tikva', category: 'Sports' },
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
