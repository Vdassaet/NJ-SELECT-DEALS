/**
 * Carrier Integration & Shipping Engine for NJ Select Deals
 * Supports: USPS, UPS, FedEx architecture with manual tracking fallback when unconfigured.
 * Calculation: Free Shipping, Flat-rate, Weight-based, Order-value-based, Zones, Methods & Estimated Delivery.
 */

export type SupportedCarrier = 'USPS' | 'UPS' | 'FEDEX' | 'OTHER';

export interface CarrierConfig {
  name: string;
  code: SupportedCarrier;
  logo: string;
  trackingUrlTemplate: string;
  apiConfigured: boolean;
  supportedMethods: Array<{
    id: string;
    name: string;
    estimatedDays: string;
    defaultRate: number;
  }>;
}

export interface ShippingZone {
  id: string;
  name: string;
  states: string[]; // State codes or ['*'] for all
  country: string;
}

export interface ShippingRateCalculationInput {
  subtotal: number;
  totalWeightLbs?: number;
  state: string;
  postalCode?: string;
  country?: string;
}

export interface ShippingOption {
  id: string;
  carrier: SupportedCarrier;
  methodName: string;
  price: number;
  estimatedDelivery: string;
  isFree: boolean;
  description: string;
}

/**
 * Carrier definitions & architecture
 */
export const CARRIERS: Record<SupportedCarrier, CarrierConfig> = {
  USPS: {
    name: 'United States Postal Service (USPS)',
    code: 'USPS',
    logo: '/images/carriers/usps.svg',
    trackingUrlTemplate: 'https://tools.usps.com/go/TrackConfirmAction?tLabels={tracking}',
    apiConfigured: Boolean(process.env.USPS_USER_ID && process.env.USPS_USER_ID !== 'placeholder'),
    supportedMethods: [
      { id: 'usps-ground', name: 'USPS Ground Advantage', estimatedDays: '2–5 business days', defaultRate: 4.99 },
      { id: 'usps-priority', name: 'USPS Priority Mail', estimatedDays: '1–3 business days', defaultRate: 9.99 },
      { id: 'usps-express', name: 'USPS Priority Mail Express', estimatedDays: '1–2 business days', defaultRate: 24.99 },
    ],
  },
  UPS: {
    name: 'United Parcel Service (UPS)',
    code: 'UPS',
    logo: '/images/carriers/ups.svg',
    trackingUrlTemplate: 'https://www.ups.com/track?tracknum={tracking}',
    apiConfigured: Boolean(process.env.UPS_CLIENT_ID && process.env.UPS_CLIENT_ID !== 'placeholder'),
    supportedMethods: [
      { id: 'ups-ground', name: 'UPS Ground', estimatedDays: '1–5 business days', defaultRate: 7.99 },
      { id: 'ups-3day', name: 'UPS 3 Day Select', estimatedDays: '3 business days', defaultRate: 14.99 },
      { id: 'ups-2day', name: 'UPS 2nd Day Air', estimatedDays: '2 business days', defaultRate: 18.99 },
      { id: 'ups-nextday', name: 'UPS Next Day Air', estimatedDays: '1 business day', defaultRate: 29.99 },
    ],
  },
  FEDEX: {
    name: 'FedEx',
    code: 'FEDEX',
    logo: '/images/carriers/fedex.svg',
    trackingUrlTemplate: 'https://www.fedex.com/fedextrack/?trknbr={tracking}',
    apiConfigured: Boolean(process.env.FEDEX_API_KEY && process.env.FEDEX_API_KEY !== 'placeholder'),
    supportedMethods: [
      { id: 'fedex-ground', name: 'FedEx Home Delivery', estimatedDays: '1–5 business days', defaultRate: 8.49 },
      { id: 'fedex-2day', name: 'FedEx 2Day', estimatedDays: '2 business days', defaultRate: 17.99 },
      { id: 'fedex-overnight', name: 'FedEx Standard Overnight', estimatedDays: 'Next business day', defaultRate: 32.99 },
    ],
  },
  OTHER: {
    name: 'Standard Carrier',
    code: 'OTHER',
    logo: '',
    trackingUrlTemplate: '',
    apiConfigured: false,
    supportedMethods: [
      { id: 'standard', name: 'Standard Delivery', estimatedDays: '3–5 business days', defaultRate: 4.99 },
      { id: 'expedited', name: 'Expedited Delivery', estimatedDays: '2 business days', defaultRate: 12.99 },
    ],
  },
};

/**
 * Build deep-link tracking URL for any carrier with manual fallback
 */
export function getTrackingUrl(carrier: string | null | undefined, trackingNumber: string | null | undefined): string | null {
  if (!trackingNumber || !trackingNumber.trim()) return null;
  const cleanTracking = trackingNumber.trim();
  const upperCarrier = (carrier || 'USPS').toUpperCase();

  if (upperCarrier.includes('USPS')) {
    return `https://tools.usps.com/go/TrackConfirmAction?tLabels=${cleanTracking}`;
  }
  if (upperCarrier.includes('UPS')) {
    return `https://www.ups.com/track?tracknum=${cleanTracking}`;
  }
  if (upperCarrier.includes('FEDEX')) {
    return `https://www.fedex.com/fedextrack/?trknbr=${cleanTracking}`;
  }
  if (upperCarrier.includes('DHL')) {
    return `https://www.dhl.com/en/express/tracking.html?AWB=${cleanTracking}`;
  }
  return null;
}

/**
 * Standardized Order Fulfillment & Shipping Statuses
 */
export const ORDER_LIFECYCLE_STATUSES = [
  { key: 'PENDING', label: 'Pending', description: 'Order created, awaiting confirmation or payment', color: 'amber' },
  { key: 'PAID', label: 'Paid', description: 'Payment confirmed, ready for processing', color: 'emerald' },
  { key: 'PROCESSING', label: 'Processing', description: 'Order verified and sent to warehouse', color: 'indigo' },
  { key: 'PACKED', label: 'Packed', description: 'Items boxed and ready for carrier pickup', color: 'purple' },
  { key: 'SHIPPED', label: 'Shipped', description: 'Package in transit with carrier tracking', color: 'sky' },
  { key: 'DELIVERED', label: 'Delivered', description: 'Order successfully delivered to customer', color: 'emerald' },
  { key: 'CANCELLED', label: 'Cancelled', description: 'Order cancelled, inventory restored', color: 'rose' },
  { key: 'REFUNDED', label: 'Refunded', description: 'Payment returned and transaction closed', color: 'rose' },
] as const;

/**
 * Computes Estimated Delivery Date string based on transit days and warehouse handling
 */
export function calculateEstimatedDeliveryDate(transitDaysMin = 2, transitDaysMax = 5, handlingDays = 1): string {
  const now = new Date();
  
  function addBusinessDays(date: Date, days: number): Date {
    const result = new Date(date);
    let added = 0;
    while (added < days) {
      result.setDate(result.getDate() + 1);
      const dayOfWeek = result.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Skip weekends
        added++;
      }
    }
    return result;
  }

  const startEst = addBusinessDays(now, handlingDays + transitDaysMin);
  const endEst = addBusinessDays(now, handlingDays + transitDaysMax);

  const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', weekday: 'short' };
  return `${startEst.toLocaleDateString('en-US', options)} – ${endEst.toLocaleDateString('en-US', options)}`;
}

/**
 * Evaluates Shipping Options based on store settings, cart value, weight, and zones
 */
export function calculateAvailableShippingOptions(
  input: ShippingRateCalculationInput,
  settings: Record<string, string>
): ShippingOption[] {
  const subtotal = input.subtotal;
  const weight = input.totalWeightLbs || 1.0;
  const isTriStateNJ = ['NJ', 'NY', 'PA', 'CT'].includes((input.state || '').toUpperCase());

  // 1. Settings parameters
  const freeThreshold = parseFloat(settings['free_shipping_threshold'] || '50');
  const freeShippingEnabled = settings['free_shipping_enabled'] !== 'false';
  const standardRate = parseFloat(settings['standard_shipping_rate'] || '4.99');
  const expeditedRate = parseFloat(settings['expedited_shipping_rate'] || '12.99');
  const weightBasedEnabled = settings['shipping_weight_enabled'] === 'true';
  const weightRatePerLb = parseFloat(settings['shipping_rate_per_lb'] || '0.75');
  const handlingDays = parseInt(settings['handling_days'] || '1', 10);

  const options: ShippingOption[] = [];

  // Check if cart qualifies for Free Shipping
  const qualifiesForFree = freeShippingEnabled && subtotal >= freeThreshold;

  // Option 1: Standard Ground Delivery (USPS / UPS Ground)
  let standardCost = qualifiesForFree ? 0 : standardRate;
  if (!qualifiesForFree && weightBasedEnabled && weight > 2.0) {
    // Add extra fee for overweight items
    standardCost += Math.round((weight - 2.0) * weightRatePerLb * 100) / 100;
  }

  options.push({
    id: 'standard-ground',
    carrier: 'USPS',
    methodName: qualifiesForFree ? 'Free Standard Shipping' : 'Standard Ground Delivery',
    price: standardCost,
    estimatedDelivery: calculateEstimatedDeliveryDate(isTriStateNJ ? 1 : 2, isTriStateNJ ? 3 : 5, handlingDays),
    isFree: standardCost === 0,
    description: qualifiesForFree
      ? `Free shipping unlocked on orders over $${freeThreshold.toFixed(2)}`
      : 'Economical 2–5 business day delivery via USPS Ground Advantage',
  });

  // Option 2: Expedited 2-Day Priority Delivery
  let expeditedCost = expeditedRate;
  if (weightBasedEnabled && weight > 2.0) {
    expeditedCost += Math.round((weight - 2.0) * (weightRatePerLb * 1.5) * 100) / 100;
  }

  options.push({
    id: 'expedited-2day',
    carrier: 'UPS',
    methodName: 'Expedited 2-Day Delivery',
    price: expeditedCost,
    estimatedDelivery: calculateEstimatedDeliveryDate(1, 2, handlingDays),
    isFree: false,
    description: 'Fast guaranteed delivery in 2 business days via UPS / Priority',
  });

  // Option 3: Next Day Air (Optional / Premium)
  if (settings['overnight_shipping_enabled'] === 'true') {
    const overnightRate = parseFloat(settings['overnight_shipping_rate'] || '29.99');
    options.push({
      id: 'express-overnight',
      carrier: 'FEDEX',
      methodName: 'FedEx Priority Overnight',
      price: overnightRate,
      estimatedDelivery: calculateEstimatedDeliveryDate(1, 1, handlingDays),
      isFree: false,
      description: 'Morning next business day delivery',
    });
  }

  return options;
}
