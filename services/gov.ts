// --- PRICE CATCHER LOGIC ---
// Adapts the Python Parquet logic to a browser-friendly API call.
// Python source: https://storage.data.gov.my/pricecatcher/pricecatcher_2026-02.parquet
// We use the JSON API equivalent to avoid loading 50MB+ parquet files in the browser.

export interface PriceCatcherItem {
  item: string;
  item_group: string;
  unit: string;
  price_min: number;
  price_max: number;
  price_avg: number;
  date: string;
}

export const getPriceCatcherBenchmark = async (query: string): Promise<PriceCatcherItem | null> => {
  try {
    const now = new Date();
    // Format: YYYY-MM (e.g. 2025-02)
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const resourceId = `pricecatcher_${year}-${month}`;

    // We use the 'contains' filter to find the item in the current month's dataset
    // This is much lighter than downloading the whole parquet file
    const apiUrl = `https://api.data.gov.my/data-catalogue?id=${resourceId}&limit=5&contains=${encodeURIComponent(query)}`;

    const response = await fetch(apiUrl);
    
    if (!response.ok) {
      // Fallback: Try previous month if current month has no data yet (common at start of month)
      if (response.status === 404 || response.status === 400) {
         const lastMonthDate = new Date();
         lastMonthDate.setMonth(lastMonthDate.getMonth() - 1);
         const prevYear = lastMonthDate.getFullYear();
         const prevMonth = String(lastMonthDate.getMonth() + 1).padStart(2, '0');
         const prevResourceId = `pricecatcher_${prevYear}-${prevMonth}`;
         const fallbackUrl = `https://api.data.gov.my/data-catalogue?id=${prevResourceId}&limit=5&contains=${encodeURIComponent(query)}`;
         
         const fallbackResponse = await fetch(fallbackUrl);
         if (!fallbackResponse.ok) return null;
         const fallbackData = await fallbackResponse.json();
         return processPriceCatcherData(fallbackData, query);
      }
      return null;
    }

    const data = await response.json();
    return processPriceCatcherData(data, query);

  } catch (error) {
    console.warn("Gov API Error (PriceCatcher):", error);
    return null;
  }
};

// Helper to process raw API response and find best match
const processPriceCatcherData = (data: any[], query: string): PriceCatcherItem | null => {
  if (!Array.isArray(data) || data.length === 0) return null;

  // Find the closest match to the query (simple robust check)
  const match = data.find((d: any) => 
    d.item.toLowerCase().includes(query.toLowerCase())
  );

  if (match) {
    return {
      item: match.item,
      item_group: match.item_group,
      unit: match.unit,
      price_min: parseFloat(match.price_min),
      price_max: parseFloat(match.price_max),
      price_avg: parseFloat(match.price_avg),
      date: match.date
    };
  }

  return null;
};
