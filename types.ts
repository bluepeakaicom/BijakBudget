
export interface PriceComparison {
  cheapest_store: string;
  cheapest_price: number;
  savings_alert: string;
}

export interface ScannedItem {
  item_name: string;
  scanned_price: number;
  unit: string;
  sara_eligible: boolean;
  market_price_comparison?: PriceComparison;
}

export interface BijakResponse {
  store_detected: string;
  scan_date: string;
  items: ScannedItem[];
  total_sara_spendable: number;
}

export interface ProductListing {
  store_name: string;
  price: number;
  product_variant: string; // To handle "1kg" vs "2kg" mismatches
  is_cheapest: boolean;
  store_type: 'Online' | 'Physical' | 'Wholesale'; // Added Wholesale
  link?: string; // New field for direct URL
  unit_price?: number; // Price per single unit (e.g. per kg or per can)
  bulk_qty?: number; // Number of units in this listing
}

export interface ProductComparisonResponse {
  product_query: string;
  listings: ProductListing[];
  average_market_price: number;
  government_benchmark_price?: number; // Derived from OpenDOSM/PriceCatcher search
  best_deal_savings: number; // Amount saved compared to average
  buying_tip: string;
}

export interface GroundingChunk {
  web?: {
    uri?: string;
    title?: string;
  };
  maps?: {
    uri?: string;
    title?: string;
    placeAnswerSources?: any;
  };
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  isThinking?: boolean;
}

export interface UserSubscription {
  tier: 'free' | 'premium';
  scanCount: number;
  maxScans: number;
  lastResetDate: string; // ISO Date string to track monthly resets
}

export interface UserData {
  name: string;
  email: string;
  phone?: string;
  address?: string;
  latitude?: number; // Precise GPS
  longitude?: number; // Precise GPS
  birthday?: string;
  subscription: UserSubscription;
}

// Smart Planner Types
export interface ShoppingStrategy {
  type: "Single Store" | "Split Trip";
  total_estimated_cost: number;
  total_savings: number;
  sara_coverage_amount: number;
  display_title: string;
  display_summary: string;
}

export interface ShoppingItemPlan {
  name: string;
  price: number;
  is_sara_eligible: boolean;
  notes: string;
}

export interface ShoppingStep {
  step_number: number;
  store_name: string;
  action_type: string;
  items_to_buy: ShoppingItemPlan[];
  subtotal: number;
}

export interface OptimizationResult {
  meta: {
    location_processed: string;
    currency: string;
  };
  strategies: {
    best_option: ShoppingStrategy;
  };
  shopping_plan: ShoppingStep[];
}

export type NavTab = 'scan' | 'compare' | 'chat' | 'stores' | 'profile' | 'plan' | 'sara';
