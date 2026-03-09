/**
 * AI service – uses Gemini Flash to auto-suggest item metadata from a photo.
 * Requires EXPO_PUBLIC_GEMINI_API_KEY in .env
 */

import * as FileSystem from 'expo-file-system/legacy';
import type { ItemCategory, ValueTier } from '../utils/mockData';

export interface ItemMetadataSuggestion {
  title: string;
  description: string;
  category: ItemCategory;
  valueTier: ValueTier;
}

const VALID_CATEGORIES: ItemCategory[] = [
  'Electronics', 'Clothing', 'Home', 'Sports', 'Books', 'SneakerHead', 'Art', 'Other',
];
const VALID_TIERS: ValueTier[] = ['$', '$$', '$$$'];

const GEMINI_MODEL = 'gemini-2.5-flash';

const PROMPT = `You are helping categorize a second-hand item for a local trading app where people swap belongings when moving apartments.
Look at this item image and return ONLY a JSON object (no markdown, no explanation) with these fields:
- title: short item name, max 60 characters
- description: brief condition/detail note, max 200 characters
- category: exactly one of: Electronics, Clothing, Home, Sports, Books, SneakerHead, Art, Other
- valueTier: exactly one of: $, $$, $$$  ($ = under ~50, $$ = 50-200, $$$ = 200+)`;

export async function suggestItemMetadata(imageUri: string): Promise<ItemMetadataSuggestion> {
  const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('EXPO_PUBLIC_GEMINI_API_KEY is not set.');
  }

  const base64 = await FileSystem.readAsStringAsync(imageUri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  const url = `https://generativelanguage.googleapis.com/v1/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;

  const body = {
    contents: [
      {
        parts: [
          { inline_data: { mime_type: 'image/jpeg', data: base64 } },
          { text: PROMPT },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 1024,
    },
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Gemini API error ${response.status}: ${err}`);
  }

  const data = await response.json();

  // gemini-2.5-flash returns multiple parts (thinking + answer); find the non-thought text part
  const parts: Array<{ text?: string; thought?: boolean }> =
    data?.candidates?.[0]?.content?.parts ?? [];
  const textPart = parts.find((p) => !p.thought && typeof p.text === 'string');
  const text: string = textPart?.text ?? '';

  // Extract JSON object from the response, stripping any markdown fences.
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  const cleaned = jsonMatch ? jsonMatch[0] : text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  if (!cleaned) {
    throw new Error('Gemini returned an empty response. Check your API key or try again.');
  }
  let parsed: Partial<ItemMetadataSuggestion>;
  try {
    parsed = JSON.parse(cleaned) as Partial<ItemMetadataSuggestion>;
  } catch {
    throw new Error('Could not parse Gemini response. Try again.');
  }

  return {
    title: typeof parsed.title === 'string' ? parsed.title.slice(0, 100) : '',
    description: typeof parsed.description === 'string' ? parsed.description.slice(0, 500) : '',
    category: VALID_CATEGORIES.includes(parsed.category as ItemCategory)
      ? (parsed.category as ItemCategory)
      : 'Other',
    valueTier: VALID_TIERS.includes(parsed.valueTier as ValueTier)
      ? (parsed.valueTier as ValueTier)
      : '$$',
  };
}
