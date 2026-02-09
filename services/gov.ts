
// --- PRICE CATCHER LOGIC ---
// Implements the relational logic from the Python pandas script using the OpenDOSM JSON API.
// Mirrors the join operations:
// 1. lookup_item.parquet -> Filter by name -> Get item_code
// 2. pricecatcher_YYYY-MM.parquet -> Filter by item_code -> Get prices
// 3. lookup_premise.parquet -> Join on premise_code -> Get location details

export interface PriceCatcherItem {
  item_code: string;
  item: string;
  item_group: string;
  unit: string;
  price_min: number;
  price_max: number;
  price_avg: number;
  date: string;
  cheapest_premise?: {
    premise_code: string;
    premise: string;
    address: string;
    price: number;
    state: string;
  };
}

export interface PriceCatcherComparison {
  item_id: number;
  item_name: string;
  comparison: {
    store_id: number;
    price: number;
    store_name: string;
    address?: string;
    date?: string;
  }[];
}

export interface PopulationDemographics {
  state: string;
  total_population: number; 
  year: string;
  kids_pct: number; // 0-14
  adult_pct: number; // 15-64
  elderly_pct: number; // 65+
}

interface ApiItem {
  item_code: string;
  item: string;
  unit: string;
  item_group: string;
}

interface ApiPrice {
  date: string;
  item_code: string;
  premise_code: string;
  price: string | number;
}

interface ApiPremise {
  premise_code: string;
  premise: string;
  address: string;
  state: string;
  district: string;
}

const BASE_URL = "https://api.data.gov.my/data-catalogue";

// --- CACHING UTILS ---
// Using localStorage for persistent cache across reloads (User Request)
const CACHE_PREFIX = 'gov_cache_';
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 Hours

const getCached = <T>(key: string): T | null => {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + key);
    if (!raw) return null;
    const { data, timestamp } = JSON.parse(raw);
    if (Date.now() - timestamp < CACHE_TTL) return data;
    localStorage.removeItem(CACHE_PREFIX + key);
    return null;
  } catch {
    return null;
  }
};

const setCache = (key: string, data: any) => {
  try {
    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify({ data, timestamp: Date.now() }));
  } catch (e) {
    // Quota exceeded, ignore
  }
};

const fetchWithRetry = async (url: string, retries = 2, delay = 500): Promise<Response> => {
  try {
    const res = await fetch(url);
    if (!res.ok && res.status >= 500) throw new Error(`Server Error ${res.status}`);
    if (res.status === 429) throw new Error("Rate Limit");
    return res;
  } catch (e) {
    if (retries > 0) {
      await new Promise(r => setTimeout(r, delay));
      return fetchWithRetry(url, retries - 1, delay * 1.5);
    }
    throw e;
  }
};

// --- QUERY HELPERS ---
const cleanQuery = (query: string) => {
  // Remove units like 1kg, 500g, 100ml to match generic item names in OpenDOSM
  // e.g. "Milo 1kg" -> "Milo" (matches "Milo Activ-Go")
  return query.replace(/\b\d+(\.\d+)?\s*(kg|g|ml|l|pcs|biji|paket)\b/gi, '').trim();
};

// --- CORE FUNCTIONS ---

export const getPriceCatcherBenchmark = async (query: string): Promise<PriceCatcherItem | null> => {
  const cacheKey = `benchmark_${query.toLowerCase()}`;
  const cached = getCached<PriceCatcherItem>(cacheKey);
  if (cached) return cached;

  try {
    // 1. LOOKUP ITEM (Try specific, then broad)
    let item = await lookupItem(query);
    if (!item) {
        const cleaned = cleanQuery(query);
        if (cleaned !== query) item = await lookupItem(cleaned);
    }
    
    if (!item) return null;

    // 2. FETCH PRICES (Smart Date Handling)
    const { prices, date } = await fetchRecentPrices(item.item_code);
    if (prices.length === 0) return null;

    // 3. STATS
    const priceValues = prices.map(p => typeof p.price === 'string' ? parseFloat(p.price) : p.price).filter(p => !isNaN(p));
    if (priceValues.length === 0) return null;

    const minPrice = Math.min(...priceValues);
    const maxPrice = Math.max(...priceValues);
    const avgPrice = priceValues.reduce((a, b) => a + b, 0) / priceValues.length;

    // 4. FIND CHEAPEST PREMISE
    // Only fetch premise details for the absolute winner to save bandwidth
    const cheapestRecord = prices.find(p => (typeof p.price === 'string' ? parseFloat(p.price) : p.price) === minPrice);
    let cheapestPremiseData = undefined;

    if (cheapestRecord) {
       const premise = await lookupPremise(cheapestRecord.premise_code);
       if (premise) {
         cheapestPremiseData = {
           premise_code: premise.premise_code,
           premise: premise.premise,
           address: premise.address,
           price: minPrice,
           state: premise.state
         };
       }
    }

    const result: PriceCatcherItem = {
      item_code: item.item_code,
      item: item.item,
      item_group: item.item_group,
      unit: item.unit,
      price_min: minPrice,
      price_max: maxPrice,
      price_avg: avgPrice,
      date: date,
      cheapest_premise: cheapestPremiseData
    };

    setCache(cacheKey, result);
    return result;

  } catch (error) {
    console.warn("PriceCatcher API Error:", error);
    return null;
  }
};

export const getItemPriceComparison = async (query: string): Promise<PriceCatcherComparison | null> => {
  const cacheKey = `comparison_${query.toLowerCase()}`;
  const cached = getCached<PriceCatcherComparison>(cacheKey);
  if (cached) return cached;

  try {
    let item = await lookupItem(query);
    if (!item) {
        const cleaned = cleanQuery(query);
        if (cleaned !== query) item = await lookupItem(cleaned);
    }
    if (!item) return null;

    const { prices } = await fetchRecentPrices(item.item_code);
    if (!prices.length) return null;

    // Sort Lowest -> Highest
    const parsedPrices = prices.map(p => ({
        ...p,
        priceVal: typeof p.price === 'string' ? parseFloat(p.price) : p.price
    })).filter(p => !isNaN(p.priceVal));

    parsedPrices.sort((a, b) => a.priceVal - b.priceVal);

    // Get Top 5 Unique Premises (Avoid duplicates if data has multiple entries for same store)
    const seenPremises = new Set<string>();
    const topPrices = [];
    
    for (const p of parsedPrices) {
        if (!seenPremises.has(p.premise_code)) {
            seenPremises.add(p.premise_code);
            topPrices.push(p);
            if (topPrices.length >= 5) break;
        }
    }

    // Resolve Premises (Parallel)
    const comparison = await Promise.all(topPrices.map(async (p) => {
        const premise = await lookupPremise(p.premise_code);
        return {
            store_id: parseInt(p.premise_code),
            price: p.priceVal,
            store_name: premise?.premise || `Store #${p.premise_code}`,
            address: premise?.address,
            date: p.date
        };
    }));

    const result = {
        item_id: parseInt(item.item_code),
        item_name: `${item.item} (${item.unit})`,
        comparison
    };

    setCache(cacheKey, result);
    return result;

  } catch (error) {
    return null;
  }
};

// --- DATA FETCHING PRIMITIVES ---

const lookupItem = async (query: string): Promise<ApiItem | null> => {
  const cacheKey = `item_raw_${query.toLowerCase()}`;
  const cached = getCached<ApiItem>(cacheKey);
  if (cached) return cached;

  try {
    // API equivalent of: df_item[df_item['item'].str.contains(query)]
    const url = `${BASE_URL}?id=lookup_item&contains=${encodeURIComponent(query)}&limit=5`;
    const res = await fetchWithRetry(url);
    if (!res.ok) return null;
    const data: ApiItem[] = await res.json();
    
    if (data.length > 0) {
      // Logic: Prefer shortest match or exact match start
      // e.g. Query "Milo" -> matches "Milo 1kg", "Milo Ais". Prefer "Milo 1kg" over longer strings if simpler.
      // Actually, OpenDOSM items are like "MILO (1KG)".
      
      const bestMatch = data.find(d => d.item.toLowerCase() === query.toLowerCase()) || data[0];
      setCache(cacheKey, bestMatch);
      return bestMatch;
    }
    return null;
  } catch (e) {
    return null;
  }
};

const fetchRecentPrices = async (itemCode: string): Promise<{ prices: ApiPrice[], date: string }> => {
  const now = new Date();
  // Ensure we check current month data
  const getResourceName = (d: Date) => `pricecatcher_${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  
  // Try Current Month
  let resourceId = getResourceName(now);
  let prices = await getPricesFromResource(resourceId, itemCode);
  let date = prices.length > 0 ? prices[0].date : ''; // Data is usually sorted or uniform in date if filtered by latest

  // If current month empty (e.g. 1st of month), try Previous Month
  if (prices.length === 0) {
      const prev = new Date();
      prev.setMonth(now.getMonth() - 1);
      resourceId = getResourceName(prev);
      prices = await getPricesFromResource(resourceId, itemCode);
      if (prices.length > 0) date = prices[0].date;
  }

  return { prices, date };
};

const getPricesFromResource = async (resourceId: string, itemCode: string): Promise<ApiPrice[]> => {
    try {
        // We want the LATEST prices.
        // API doesn't support "max(date)" easily without fetching.
        // Strategy: Fetch filtered by item_code, sort by date desc, limit 100.
        // Note: API `sort` param works like `sort=-date`
        
        const url = `${BASE_URL}?id=${resourceId}&item_code=${itemCode}&sort=-date&limit=100`;
        const res = await fetchWithRetry(url);
        if (!res.ok) return [];
        
        const data: ApiPrice[] = await res.json();
        if (data.length === 0) return [];

        // Filter to keep only the absolute latest date present in the dataset
        const latestDate = data[0].date;
        return data.filter(d => d.date === latestDate);
    } catch (e) {
        return [];
    }
};

const lookupPremise = async (premiseCode: string): Promise<ApiPremise | null> => {
  const cacheKey = `premise_${premiseCode}`;
  const cached = getCached<ApiPremise>(cacheKey);
  if (cached) return cached;

  try {
    const url = `${BASE_URL}?id=lookup_premise&premise_code=${premiseCode}`;
    const res = await fetchWithRetry(url);
    if (!res.ok) return null;
    const data = await res.json();
    if (data.length > 0) {
       setCache(cacheKey, data[0]);
       return data[0];
    }
    return null;
  } catch (e) {
    return null;
  }
};

// --- POPULATION DATA ---
export const getPopulationByState = async (stateRaw: string): Promise<PopulationDemographics | null> => {
    const cacheKey = `pop_${stateRaw.toLowerCase()}`;
    const cached = getCached<PopulationDemographics>(cacheKey);
    if (cached) return cached;
  
    try {
      // Standardize state name for OpenDOSM
      const mapState = (s: string) => {
          const l = s.toLowerCase();
          if (l.includes('kuala lumpur') || l.includes('kl')) return 'W.P. Kuala Lumpur';
          if (l.includes('putrajaya')) return 'W.P. Putrajaya';
          if (l.includes('labuan')) return 'W.P. Labuan';
          if (l.includes('penang')) return 'Pulau Pinang';
          return s;
      };

      const dosmState = mapState(stateRaw);
      const url = `${BASE_URL}?id=population_state&state=${encodeURIComponent(dosmState)}&sex=overall&ethnicity=overall&sort=-date&limit=50`;
      
      const res = await fetchWithRetry(url);
      if (!res.ok) return null;
      const data = await res.json();
      
      if (!data.length) return null;
      
      const latestDate = data[0].date;
      const records = data.filter((d: any) => d.date === latestDate);
      
      let total = 0, kids = 0, adults = 0, elderly = 0;
      
      records.forEach((r: any) => {
          const val = parseFloat(r.population) * 1000;
          if (r.age_group === 'overall') total = val;
          else {
              const startAge = parseInt(r.age_group.split('-')[0] || r.age_group.replace('+',''));
              if (!isNaN(startAge)) {
                  if (startAge < 15) kids += val;
                  else if (startAge < 65) adults += val;
                  else elderly += val;
              }
          }
      });

      if (total === 0) total = kids + adults + elderly;
      if (total === 0) return null;

      const result = {
          state: dosmState,
          total_population: total,
          year: latestDate.substring(0, 4),
          kids_pct: (kids/total)*100,
          adult_pct: (adults/total)*100,
          elderly_pct: (elderly/total)*100
      };
      
      setCache(cacheKey, result);
      return result;
    } catch {
      return null;
    }
};
