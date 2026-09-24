export type Role = 'ADMIN' | 'CUSTOMER';

export type OrderStatus = 'PENDING' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';

export type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED' | 'CANCELLED' | 'REFUNDED';

export type AddressType = 'SHIPPING' | 'BILLING';

export interface UserSession {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export interface CategoryItem {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image: string | null;
  isActive: boolean;
  sortOrder: number;
  _count?: {
    products: number;
  };
}

export interface ProductImageItem {
  id: string;
  productId: string;
  url: string;
  altText: string | null;
  isPrimary: boolean;
  sortOrder: number;
}

export interface ProductVariantItem {
  id: string;
  productId: string;
  name: string;
  sku: string;
  price: number | null;
  inventory: number;
}

export interface ProductItem {
  id: string;
  name: string;
  slug: string;
  sku: string;
  brand: string | null;
  description: string;
  price: number;
  salePrice: number | null;
  costPrice?: number | null;
  inventory: number;
  reservedQuantity?: number;
  availableQuantity?: number;
  lowStockThreshold: number;
  inventoryStatus?: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';
  weight: number | null;
  isFeatured: boolean;
  isNewArrival: boolean;
  isBestSeller: boolean;
  isActive: boolean;
  rating: number;
  reviewCount: number;
  categoryId: string;
  category?: CategoryItem;
  images: ProductImageItem[];
  variants?: ProductVariantItem[];
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface CartItem {
  id: string; // Product ID
  variantId?: string;
  variantName?: string;
  name: string;
  slug: string;
  brand: string | null;
  price: number;
  salePrice: number | null;
  image: string;
  quantity: number;
  maxInventory: number;
}

export interface AddressItem {
  id: string;
  userId: string;
  type: AddressType;
  fullName: string;
  street: string;
  apartment?: string | null;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone?: string | null;
  isDefault: boolean;
}

export interface OrderItemDetail {
  id: string;
  orderId: string;
  productId: string;
  variantId?: string | null;
  productName: string;
  productImage?: string | null;
  price: number;
  quantity: number;
  total: number;
}

export interface OrderDetail {
  id: string;
  orderNumber: string;
  userId?: string | null;
  guestEmail?: string | null;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  subtotal: number;
  discount: number;
  shippingCost: number;
  tax: number;
  total: number;
  stripePaymentId?: string | null;
  stripeSessionId?: string | null;
  shippingName: string;
  shippingStreet: string;
  shippingApartment?: string | null;
  shippingCity: string;
  shippingState: string;
  shippingPostalCode: string;
  shippingCountry: string;
  shippingPhone?: string | null;
  carrier?: string | null;
  trackingNumber?: string | null;
  trackingUrl?: string | null;
  notes?: string | null;
  createdAt: string | Date;
  updatedAt: string | Date;
  items: OrderItemDetail[];
  user?: {
    id: string;
    name: string;
    email: string;
  } | null;
  emails?: EmailLogItem[];
}

export interface StoreSettingsMap {
  store_name?: string;
  store_email?: string;
  store_phone?: string;
  store_address?: string;
  currency?: string;
  currency_symbol?: string;
  free_shipping_threshold?: string;
  standard_shipping_rate?: string;
  announcement_text?: string;
  order_notification_email?: string;
  [key: string]: string | undefined;
}

export type EmailStatus = 'PENDING' | 'SENT' | 'FAILED';

export interface EmailLogItem {
  id: string;
  orderId?: string | null;
  recipient: string;
  subject: string;
  template: string;
  status: EmailStatus;
  error?: string | null;
  providerId?: string | null;
  sentAt?: string | Date | null;
  createdAt: string | Date;
}

export type InventoryStatus = 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';

export interface InventoryLogItem {
  id: string;
  productId: string;
  sku: string;
  previousQuantity: number;
  newQuantity: number;
  difference: number;
  reason: string;
  orderNumber?: string | null;
  performedBy?: string | null;
  userId?: string | null;
  createdAt: string | Date;
  product?: {
    name: string;
    slug: string;
    price: number;
  } | null;
  user?: {
    name: string;
    email: string;
  } | null;
}

export interface InventoryMetrics {
  totalProducts: number;
  lowStockCount: number;
  outOfStockCount: number;
  inStockCount: number;
  inventoryValuation: number;
}

export type PromotionType =
  | 'PERCENTAGE'
  | 'FIXED_AMOUNT'
  | 'SALE_PRICE'
  | 'TIERED_VOLUME'
  | 'BUY_X_GET_Y'
  | 'BUNDLE'
  | 'FREE_SHIPPING'
  | 'FLASH_SALE';

export type PromotionScope = 'ALL_PRODUCTS' | 'CATEGORY' | 'PRODUCT' | 'BUNDLE';

export interface TieredDiscountRule {
  minQty: number;
  discountPercent: number;
}

export interface PromotionItem {
  id: string;
  name: string;
  description?: string | null;
  type: PromotionType;
  scope: PromotionScope;
  discountType?: string | null;
  discountValue?: number | null;
  salePrice?: number | null;
  couponCode?: string | null;
  categoryId?: string | null;
  minOrderSubtotal?: number | null;
  minQuantity?: number | null;
  buyQuantity?: number | null;
  getQuantity?: number | null;
  getDiscountPercent?: number | null;
  tieredRules?: TieredDiscountRule[] | null;
  bundleProductIds?: string[] | null;
  maxQuantity?: number | null;
  usageLimit?: number | null;
  usedCount: number;
  startDate: string | Date;
  endDate?: string | Date | null;
  isActive: boolean;
  isFlashSale: boolean;
  bannerText?: string | null;
  category?: CategoryItem | null;
  products?: ProductItem[];
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface ProductRelationItem {
  id: string;
  productId: string;
  relatedId: string;
  relationship: string;
  sortOrder: number;
  relatedProduct?: ProductItem;
}

export interface ItemDiscountBreakdown {
  productId: string;
  name: string;
  originalPrice: number;
  effectiveUnitPrice: number;
  unitDiscount: number;
  quantity: number;
  lineSubtotal: number;
  lineDiscount: number;
  lineTotal: number;
  appliedPromotionId?: string;
  appliedPromotionName?: string;
  appliedPromotionType?: PromotionType;
  reason?: string;
}

export interface AppliedPromotionSummary {
  id: string;
  name: string;
  type: PromotionType;
  discountAmount: number;
  description?: string | null;
  couponCode?: string | null;
}

export interface OrderPricingResult {
  originalSubtotal: number;
  subtotal: number; // after product/item level discounts
  totalItemDiscount: number;
  orderDiscount: number; // e.g. coupon or order-level discount
  totalSavings: number; // totalItemDiscount + orderDiscount
  shippingCost: number;
  isFreeShipping: boolean;
  freeShippingThreshold: number;
  tax: number;
  taxRate: number;
  total: number;
  itemBreakdowns: ItemDiscountBreakdown[];
  appliedPromotions: AppliedPromotionSummary[];
  coupon?: {
    code: string;
    valid: boolean;
    discountAmount: number;
    message?: string;
  } | null;
}

