#!/usr/bin/env node
/**
 * seedTestItems.js
 *
 * Creates 3 test items (tier $$) in Firestore for two Firebase accounts so both
 * users can see each other's listings in the swipe deck and test the full
 * match → chat flow.
 *
 * Usage:
 *   node scripts/seedTestItems.js \
 *     --u1 YOUR_EMAIL --p1 YOUR_PASSWORD \
 *     --u2 SECOND_EMAIL --p2 SECOND_PASSWORD
 *
 * Both accounts must already exist in Firebase Auth (sign up in the app first).
 */

// Set these via env vars or replace with your own values locally (do not commit keys)
const API_KEY    = process.env.FIREBASE_API_KEY    || '';
const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'trades-4903d';

// ── Parse CLI args ────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const get  = (flag) => { const i = args.indexOf(flag); return i !== -1 ? args[i + 1] : null; };

const U1_EMAIL    = get('--u1');
const U1_PASSWORD = get('--p1');
const U2_EMAIL    = get('--u2');
const U2_PASSWORD = get('--p2');

if (!U1_EMAIL || !U1_PASSWORD || !U2_EMAIL || !U2_PASSWORD) {
  console.error('Usage: node scripts/seedTestItems.js --u1 <email> --p1 <pass> --u2 <email> --p2 <pass>');
  process.exit(1);
}

// ── Firebase helpers ──────────────────────────────────────────────────────────
async function signIn(email, password) {
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    }
  );
  const data = await res.json();
  if (!res.ok) throw new Error(`Sign-in failed for ${email}: ${data.error?.message}`);
  return { uid: data.localId, idToken: data.idToken };
}

async function createItem(idToken, ownerId, item) {
  const docId = `test-${ownerId.slice(0, 6)}-${item.slug}`;
  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/items/${docId}`;

  const body = {
    fields: {
      ownerId:        { stringValue: ownerId },
      title:          { stringValue: item.title },
      description:    { stringValue: item.description },
      photos:         { arrayValue: { values: item.photos.map(u => ({ stringValue: u })) } },
      valueTier:      { stringValue: item.valueTier },
      pickupLocation: { stringValue: item.pickupLocation },
      category:       { stringValue: item.category },
      status:         { stringValue: 'active' },
      createdAt:      { timestampValue: new Date().toISOString() },
    },
  };

  const res = await fetch(url + '?updateMask.fieldPaths=ownerId&updateMask.fieldPaths=title&updateMask.fieldPaths=description&updateMask.fieldPaths=photos&updateMask.fieldPaths=valueTier&updateMask.fieldPaths=pickupLocation&updateMask.fieldPaths=category&updateMask.fieldPaths=status&updateMask.fieldPaths=createdAt', {
    method: 'PATCH',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${idToken}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(`Failed to create item "${item.title}": ${JSON.stringify(err.error)}`);
  }
  console.log(`  ✓ ${item.title} (${docId})`);
}

// ── Test items per user ───────────────────────────────────────────────────────
const ITEMS_FOR_USER1 = [
  {
    slug: 'camera',
    title: 'Sony Mirrorless Camera',
    description: 'Sony A6000, great condition. Includes kit lens and charger.',
    photos: ['https://picsum.photos/seed/cam-test/600/400'],
    valueTier: '$$',
    pickupLocation: 'Tel Aviv',
    category: 'Electronics',
  },
  {
    slug: 'jacket',
    title: 'North Face Fleece Jacket',
    description: 'Size M, worn once. Navy blue. Perfect for hiking.',
    photos: ['https://picsum.photos/seed/jacket-test/600/400'],
    valueTier: '$$',
    pickupLocation: 'Tel Aviv',
    category: 'Clothing',
  },
  {
    slug: 'headphones',
    title: 'Sony WH-1000XM4 Headphones',
    description: 'Noise cancelling, excellent sound. Box and cable included.',
    photos: ['https://picsum.photos/seed/headphones-test/600/400'],
    valueTier: '$$',
    pickupLocation: 'Tel Aviv',
    category: 'Electronics',
  },
];

const ITEMS_FOR_USER2 = [
  {
    slug: 'keyboard',
    title: 'Keychron K2 Mechanical Keyboard',
    description: 'Wireless, RGB backlight. Brown switches. Barely used.',
    photos: ['https://picsum.photos/seed/keyboard-test/600/400'],
    valueTier: '$$',
    pickupLocation: 'Ra\'anana',
    category: 'Electronics',
  },
  {
    slug: 'backpack',
    title: 'Fjallraven Kanken Backpack',
    description: '16L, forest green. Light scratches on bottom. Great condition.',
    photos: ['https://picsum.photos/seed/backpack-test/600/400'],
    valueTier: '$$',
    pickupLocation: 'Ra\'anana',
    category: 'Clothing',
  },
  {
    slug: 'speaker',
    title: 'Bose SoundLink Mini II',
    description: 'Portable Bluetooth speaker, great bass. Includes charging cable.',
    photos: ['https://picsum.photos/seed/speaker-test/600/400'],
    valueTier: '$$',
    pickupLocation: 'Ra\'anana',
    category: 'Electronics',
  },
];

// ── Main ──────────────────────────────────────────────────────────────────────
(async () => {
  try {
    console.log(`\nSigning in as User 1 (${U1_EMAIL})...`);
    const u1 = await signIn(U1_EMAIL, U1_PASSWORD);
    console.log(`  UID: ${u1.uid}`);

    console.log(`\nSigning in as User 2 (${U2_EMAIL})...`);
    const u2 = await signIn(U2_EMAIL, U2_PASSWORD);
    console.log(`  UID: ${u2.uid}`);

    console.log('\nCreating items for User 1...');
    for (const item of ITEMS_FOR_USER1) {
      await createItem(u1.idToken, u1.uid, item);
    }

    console.log('\nCreating items for User 2...');
    for (const item of ITEMS_FOR_USER2) {
      await createItem(u2.idToken, u2.uid, item);
    }

    console.log('\nDone! Both users now have 3 active $$ listings.');
    console.log('Steps to test the match flow:');
    console.log('  1. Log in as User 1, go to Swipe, filter to $$, swipe RIGHT on User 2\'s items');
    console.log('  2. Log in as User 2, go to Swipe, filter to $$, swipe RIGHT on User 1\'s items');
    console.log('  3. The match overlay should appear for User 2 with a "Start Chatting" button');
    console.log('  4. User 1 sees the new chat appear automatically in the Chat tab\n');
  } catch (e) {
    console.error('\nError:', e.message);
    process.exit(1);
  }
})();
