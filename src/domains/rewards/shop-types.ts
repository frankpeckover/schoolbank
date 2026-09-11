export type ShopPurchaseStatus = "pending" | "approved" | "denied";

export type ShopItem = {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  price: number;
  quantity: number;
  isActive: boolean;
};

export type SaveShopItemInput = {
  id?: string;
  name: string;
  description: string;
  imageUrl: string;
  price: number;
  quantity: number;
};

export type ImportShopItemInput = {
  name: string;
  description: string;
  imageUrl: string;
  price: number;
  quantity: number;
};

export type ImportShopItemsInput = {
  items: ImportShopItemInput[];
};

export type ImportShopItemError = {
  message: string;
  name: string;
  rowNumber: number;
};

export type ImportShopItemsResult = {
  createdCount: number;
  errors: ImportShopItemError[];
  updatedCount: number;
};

export type ShopPurchaseRequest = {
  decidedAt: string | null;
  decisionNote: string;
  id: string;
  isVoided: boolean;
  itemName: string;
  price: number;
  purchasedAt: string;
  status: ShopPurchaseStatus;
  studentName: string;
  studentUsername: string;
};

export type StudentShopRequest = {
  id: string;
  itemName: string;
  price: number;
  purchasedAt: string;
  decidedAt: string | null;
  decisionNote: string;
  isVoided: boolean;
  status: ShopPurchaseStatus;
};

export type ShopItemRow = {
  id: string;
  name: string;
  description: string;
  image_url: string;
  price: number;
  quantity: number;
  is_active: boolean;
};

export type ShopPurchaseRequestRow = {
  decided_at: Date | null;
  decision_note: string;
  id: string;
  is_voided: boolean;
  item_name: string;
  price: number;
  purchased_at: Date;
  status: ShopPurchaseStatus;
  student_name: string;
  student_username: string;
};

export type StudentShopRequestRow = {
  id: string;
  item_name: string;
  price: number;
  purchased_at: Date;
  decided_at: Date | null;
  decision_note: string;
  is_voided: boolean;
  status: ShopPurchaseStatus;
};
