import type { TireCategory, TireSegment } from "@/lib/constants/pneu";

export type Pneu = {
  id: number;
  tireManufacturerId: number;
  tireManufacturerName: string;
  brand: string;
  model: string;
  size: string;
  width: number;
  profile: number;
  rim: number;
  loadIndex: string;
  speedIndex: string;
  runFlat: boolean;
  xl: boolean;
  seal: boolean;
  tubeless: boolean;
  category: TireCategory;
  segment: TireSegment | null;
  ean: string | null;
  description: string | null;
  imageUrl: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  homologationsCount: number;
};

export type PneuListResponse = {
  data: Pneu[];
  total: number;
  page: number;
  pageSize: number;
};
