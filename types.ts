
export interface PriceComparison {
  cheapest_store: string;
  cheapest_price: number;
  savings_alert: string;
}

export interface CompetitorPrice {
  store_name: string;
  price: number;
  is_cheapest: boolean;
}

export interface ScannedItem {
  item_name: string;
  scanned_price: number;
  unit: string;
  sara_eligible: boolean;
  market_price_comparison?: PriceComparison;
  competitor_prices?: CompetitorPrice[]; // New field for visual comparison
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
  image_url?: string; // Product image URL
}

export interface ProductComparisonResponse {
  product_query: string;
  listings: ProductListing[];
  average_market_price: number;
  government_benchmark_price?: number; // Derived from OpenDOSM/PriceCatcher search
  best_deal_savings: number; // Amount saved compared to average
  buying_tip: string;
}

export interface WishlistItem {
  id: string;
  productName: string;
  storeName: string;
  initialPrice: number;
  currentPrice: number; // Used for tracking drops
  addedDate: string;
  storeType: 'Online' | 'Physical' | 'Wholesale';
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

// Data Collection Types
export interface ActivityLog {
  action: 'scan_product' | 'search_price' | 'view_store' | 'generate_plan' | 'check_sara';
  detail: string; // e.g., "Milo 1kg", "99 Speedmart", "Route to Cheras"
  timestamp: string;
}

export interface ShopperPersona {
  archetype: string; // e.g. "The Bulk Hunter", "The Brand Loyalist"
  description: string;
  savings_score: number; // 0-100
  top_category_interest: string;
  price_sensitivity: 'High' | 'Medium' | 'Low';
  preferred_shopping_days: string[]; // e.g., ["Friday", "Sunday"]
  predicted_next_need: string; // e.g., "Restock Rice"
  behavioral_tips: string[];
  last_updated: string;
  // Enhanced Learning Fields
  dietary_preferences?: string[]; // e.g. ["Halal", "Vegetarian"]
  preferred_brands?: string[];    // e.g. ["Milo", "Maggi", "Saji"]
  preferred_stores?: string[];    // e.g. ["99 Speedmart", "Lotus's"]
  spending_tier?: 'Budget' | 'Mid-range' | 'Premium';
}

export interface PersonalizedInsight {
  message: string;
  action_type: 'compare' | 'navigate' | 'info';
  action_payload?: string; // e.g., "Rice 10kg"
}

export interface MerchantAnalytics {
  impressions: number;
  clicks: number;
  reach: number;
  live_viewers: number;
  weekly_trend: number[]; // Array of 7 days impressions
}

export interface MerchantProfile {
  businessName: string;
  rocNo: string;
  storeType: string; // e.g. "Grocery", "Mini Market"
  state: string;
  address: string;
  contact: string;
  email: string;
  isVerified: boolean;
  joinedDate: string;
  analytics?: MerchantAnalytics; // New Analytics Data
}

export interface LoginSession {
  id: string;
  device: string;
  location: string;
  date: string;
  isCurrent: boolean;
}

export interface SecuritySettings {
  twoFactorEnabled: boolean;
  lastPasswordChange: string;
  loginHistory: LoginSession[];
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
  wishlist?: WishlistItem[]; // Added wishlist
  activityHistory?: ActivityLog[]; // New: For AI Behavioral Study
  shopperPersona?: ShopperPersona; // New: Cached AI Analysis
  dailyInsight?: PersonalizedInsight; // New: Daily smart suggestion
  merchantProfile?: MerchantProfile; // New: Persistent Merchant Data
  security?: SecuritySettings; // New: Account Security
  birthdayWish?: { // New: AI Birthday Wish
    message: string;
    dateGenerated: string;
  };
}

// Smart Planner Types
export interface ShoppingItemPlan {
  name: string;
  quantity?: number;
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

export interface ShoppingStrategy {
  id: "max_savings" | "best_convenience";
  type: "Single Store" | "Split Trip";
  display_title: string; // e.g. "Cheapest Option"
  display_summary: string;
  total_grocery_cost: number;
  estimated_fuel_cost: number;
  total_trip_cost: number; // grocery + fuel
  total_savings_vs_market: number;
  distance_km: number;
  shopping_plan: ShoppingStep[];
}

export interface OptimizationResult {
  meta: {
    location_processed: string;
    currency: string;
    recommended_strategy_id: "max_savings" | "best_convenience";
  };
  strategies: ShoppingStrategy[]; // Return multiple options
}

export type NavTab = 'scan' | 'compare' | 'chat' | 'stores' | 'profile' | 'plan' | 'sara' | 'business';
