/**
 * Buckets do Supabase Storage dedicados ao HomologaPneu Media Manager.
 * Nomes exatamente como pedido — não colidem com os buckets já usados por
 * lib/storage/supabaseStorage.ts (logos, vehicle-images, tire-images, do
 * rehost de logos existente, não alterado).
 */
export const MEDIA_BUCKETS = {
  manufacturers: "manufacturers",
  vehicles: "vehicles",
  tires: "tires",
  wheels: "wheels",
  documents: "documents",
  thumbnails: "thumbnails",
} as const;

export type MediaBucketKey = keyof typeof MEDIA_BUCKETS;

export const ALL_MEDIA_BUCKETS = Object.values(MEDIA_BUCKETS);
