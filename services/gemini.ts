
import { GoogleGenAI, Type, Schema, Chat, GenerateContentResponse } from "@google/genai";
import { BijakResponse, ProductComparisonResponse, OptimizationResult, UserData } from "../types";

// Initialize the client
// API Key is guaranteed to be in process.env.API_KEY per instructions
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Helper to pause execution
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Helper to clean and parse JSON from AI response (handling Markdown blocks)
export const cleanAndParseJson = (text: string) => {
  try {
    // Remove markdown code blocks if present (e.g. ```json ... ```)
    let cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    
    // Find the first '{' or '[' and last '}' or ']' to handle potential conversational fluff
    const firstBrace = cleaned.search(/[{[]/);
    const lastBrace = cleaned.search(/[}\]]$/); // Simplified search for end
    
    // Improved extraction logic to handle Arrays or Objects
    if (firstBrace !== -1) {
        // Find the last matching closing brace/bracket
        const lastChar = cleaned.lastIndexOf(cleaned[firstBrace] === '{' ? '}' : ']');
        if (lastChar !== -1) {
            cleaned = cleaned.substring(firstBrace, lastChar + 1);
        }
    }

    return JSON.parse(cleaned);
  } catch (e) {
    console.error("JSON Parse Error on text:", text);
    throw new Error("Failed to parse AI response. The model might have returned unstructured text.");
  }
};

// Wrapper function to handle retries for Rate Limiting (429) or Server Overload (503)
async function withRetry<T>(operation: () => Promise<T>, retries = 4, initialDelay = 2000): Promise<T> {
  try {
    return await operation();
  } catch (error: any) {
    if (retries <= 0) throw error;

    // Check for specific error codes or messages indicating temporary issues
    const errString = JSON.stringify(error, Object.getOwnPropertyNames(error));
    const isRateLimit = errString.includes("429") || errString.includes("RESOURCE_EXHAUSTED") || errString.includes("quota");
    const isServerOverload = errString.includes("503") || errString.includes("Overloaded") || errString.includes("Internal Server Error");

    if (isRateLimit || isServerOverload) {
      console.warn(`Gemini API Busy/Quota Hit. Retrying in ${initialDelay}ms... (${retries} attempts left)`);
      await wait(initialDelay);
      // Exponential backoff: double the delay for the next attempt
      return withRetry(operation, retries - 1, initialDelay * 2);
    }

    throw error;
  }
}

// Helper to handle API errors with user-friendly messages
const handleGeminiError = (error: any): never => {
  console.error("Gemini Operation Error:", error);
  
  // Convert error to string to check for codes if they are embedded in messages or objects
  const errString = JSON.stringify(error, Object.getOwnPropertyNames(error));
  const errMsg = error?.message || "";

  // 1. Quota Exceeded (429) - Most common with Free Tier
  if (
    error?.status === 429 || 
    error?.response?.status === 429 || 
    errString.includes("429") || 
    errString.includes("RESOURCE_EXHAUSTED") || 
    errMsg.includes("429") || 
    errMsg.includes("quota")
  ) {
    throw new Error("Server busy (High Traffic). Please try again in a moment.");
  }

  // 2. Network/Connection Errors & Timeouts
  if (
    errMsg.includes("network") || 
    errMsg.includes("fetch") || 
    errMsg.includes("Failed to fetch") || 
    errMsg.includes("NetworkError") ||
    errMsg.includes("timeout") || 
    errMsg.includes("aborted")
  ) {
    throw new Error("Connection unstable or timed out. Please check your internet.");
  }

  // 3. Authentication/API Key Errors (400/403)
  if (
    error?.status === 403 || 
    errMsg.includes("API key") ||
    errMsg.includes("unauthorized") ||
    errMsg.includes("permission denied")
  ) {
     // Don't expose technical details to user, just say auth failed
    throw new Error("Service access denied. Please refresh the app.");
  }

  // 4. Blocked Content (Safety Settings)
  if (
    errString.includes("SAFETY") || 
    errString.includes("BLOCKED") || 
    error?.response?.promptFeedback?.blockReason ||
    errMsg.includes("safety")
  ) {
    throw new Error("Content flagged by safety filters. Please try a clearer image.");
  }

  // 5. Server Errors (5xx)
  if (
    error?.status >= 500 || 
    error?.response?.status >= 500 || 
    errMsg.includes("500") || 
    errMsg.includes("503") || 
    errMsg.includes("Internal Server Error") ||
    errMsg.includes("Overloaded")
  ) {
    throw new Error("AI Service is temporarily unavailable. Please try again later.");
  }

  // 6. Client Errors (400) - Bad Request / Invalid Argument
  // Often happens with empty prompts or invalid image data
  if (
    error?.status === 400 || 
    errMsg.includes("400") || 
    errMsg.includes("INVALID_ARGUMENT")
  ) {
    throw new Error("Unable to process request. Please try again with different input.");
  }

  // 7. JSON Parsing / Response Structure Errors
  if (error instanceof SyntaxError || errMsg.includes("JSON") || errMsg.includes("parse")) {
    throw new Error("Received malformed data from AI. Please try again.");
  }

  // Default fallback
  if (errMsg && errMsg.length < 100) {
      throw new Error(`Error: ${errMsg}`);
  }
  
  throw new Error("An unexpected error occurred. Please try again.");
};

// Mode 1: Receipt & Product Analysis
export const processReceiptImage = async (base64Image: string, mimeType: string) => {
  try {
    // Switch to gemini-2.5-flash for better quota handling and speed
    const modelId = 'gemini-2.5-flash'; 
    
    const systemInstruction = `
      You are "BijakBudget Core", an AI assistant for Malaysian shoppers.
      
      ### INPUT TYPE ANALYSIS
      Determine if the image is a **Receipt** or a **Single Product**.

      ### IF RECEIPT:
      1. **Extraction**: Extract Store Name, Date, and **ALL** line items (Name, Price, Weight).
      
      2. **NORMALIZATION & CLEANING (CRITICAL)**:
         You are an expert in Malaysian "Bahasa Pasar" and receipt shorthand. Map abbreviations to FULL ENGLISH names.
         
         **Dictionary of Common Abbreviations (Fuzzy Match These):**
         - **Oils**: "MYK", "M.MSK", "MINYAK", "SAJI", "BURUH", "SERI MURNI" -> "Cooking Oil"
         - **Sugar**: "GL", "GL PSR", "GULA", "GULA PRA", "KASAR" -> "Sugar"
         - **Flour**: "TPG", "T.GANDUM", "CAP SAUH", "FAIZA", "BLUE KEY" -> "Wheat Flour"
         - **Eggs**: "TLR", "TELUR", "GRED A", "GRED B", "OMEGA", "NUTRI" -> "Eggs"
         - **Veg**: "B.MERAH" -> "Red Onion", "B.PUTIH" -> "Garlic", "CILI" -> "Chili", "KNTG" -> "Potato"
         - **Dairy**: "SUSU PEKAT", "S.PKT" -> "Condensed Milk", "SUSU CAIR" -> "Evaporated Milk"
         - **Canned**: "SARDIN", "MACKEREL", "AYAM BRAND" -> "Canned Sardines/Mackerel"
         - **Carbs**: "ROTI", "GARDENIA" -> "Bread", "MEE", "MAGGI", "CINTAN" -> "Instant Noodles"
         
         **Cleaning Rules:**
         - Remove tax codes at end: "SR", "ZR", "P01", "TX", "NP".
         - Remove random digits at start/end unless it is weight (e.g. remove "9556...", "001").
         - **PRESERVE BRANDS**: Keep brand names like "Milo", "Nescafe", "Adabi", "Babas", "Top".
         - **SEPARATE UNITS**: If a weight/volume is found (e.g., "1kg", "500g", "1L"), move it to the 'unit' field and REMOVE it from 'item_name' to allow better price comparison.

      3. **Units**: Extract weight/volume into the 'unit' field. Default to "1 unit" if unknown. Estimate common standards (e.g., Standard Sugar pack is 1kg).

      ### IF SINGLE PRODUCT:
      1. Detect the product name, brand, and weight/volume visible on packaging.
      2. Set 'store_detected' to "Product Scan".
      3. Set 'scanned_price' to 0 unless a price tag is clearly visible.

      ### CORE TASKS (APPLIES TO BOTH):
      1. **Language**: Output strictly in **ENGLISH**. Translate Malay terms.
      2. **SARA Eligibility**: Set sara_eligible=true ONLY for: Rice, Cooking Oil, Flour, Bread, Eggs, Sugar.
      3. **Price Comparison**: For items > RM5, find market prices at Lotus's, Mydin, 99 Speedmart.
         - Populate 'market_price_comparison' with the CHEAPEST found.
         - Store names must be normalized: "Lotus's", "99 Speedmart", "Mydin", "Econsave".

      ### OUTPUT FORMAT
      Return strictly RAW JSON (no markdown formatting). Follow this schema:
      {
        "store_detected": "string",
        "scan_date": "string",
        "items": [
          {
            "item_name": "string", // CLEAN English Name + Brand (e.g. "Milo Activ-Go")
            "scanned_price": number,
            "unit": "string", // e.g. "1kg" or "N/A"
            "sara_eligible": boolean,
            "market_price_comparison": {
              "cheapest_store": "string",
              "cheapest_price": number,
              "savings_alert": "string" // e.g. "Save RM2.50 at Lotus's"
            } // nullable
          }
        ],
        "total_sara_spendable": number
      }
    `;

    const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
      model: modelId,
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: base64Image
            }
          },
          {
            text: "Analyze this image (Receipt or Product) for BijakBudget. Output valid JSON."
          }
        ]
      },
      config: {
        systemInstruction: systemInstruction,
        tools: [{ googleSearch: {} }],
        // NOTE: responseMimeType: "application/json" is NOT supported with tools in this context
      }
    }));

    const jsonText = response.text;
    
    if (!jsonText) {
       throw new Error("AI analysis failed: No data returned. The image might be unclear or flagged.");
    }

    let data: BijakResponse;
    try {
      data = cleanAndParseJson(jsonText);
    } catch (e) {
      throw new Error("Failed to parse AI response. Please try again.");
    }

    // Validate Structure
    if (!data || !Array.isArray(data.items)) {
      throw new Error("Could not detect any items. Please ensure the image is a clear receipt or product.");
    }

    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];

    return { data, groundingChunks };

  } catch (error) {
    handleGeminiError(error);
  }
};

// Mode: Price Comparator (Gemini 2.5 Flash + Search)
export const compareProductPrices = async (query: string, variant?: string, mode: 'all' | 'online' | 'retail' | 'wholesale' = 'all') => {
  try {
    const searchContext = variant ? `${query} ${variant}` : query;
    const variantInstruction = variant 
      ? `STRICTLY match the variant "${variant}".` 
      : `Ensure the 'product_variant' matches the user's query.`;

    let targetStoresInstruction = "";
    if (mode === 'retail') {
        targetStoresInstruction = `
            ### STORE FOCUS: PHYSICAL RETAIL ONLY
            You must prioritize finding prices from these Malaysian physical store categories:
            1. **Supermarkets/Hypermarkets**: Lotus's, Mydin, Giant, AEON, Econsave, Jaya Grocer, Village Grocer, Hero Market.
            2. **Mini Markets**: 99 Speedmart, KK Super Mart.
            3. **Convenience Stores**: 7-Eleven, FamilyMart, MyNews.
            Set 'store_type' to "Physical".
        `;
    } else if (mode === 'online') {
        targetStoresInstruction = `
            ### STORE FOCUS: ONLINE MARKETPLACES ONLY
            You must prioritize finding prices from: Shopee Malaysia, Lazada Malaysia, TikTok Shop, PandaMart, GrabMart.
            Set 'store_type' to "Online".
        `;
    } else if (mode === 'wholesale') {
        targetStoresInstruction = `
            ### STORE FOCUS: WHOLESALE & BULK ONLY
            You must prioritize finding **BULK** or **WHOLESALE** (Borong) prices.
            Look for keywords: "Carton", "Bundle", "Guni", "Dozen", "Borong".
            Sources: NSK Trade City, GM Klang, Segi Fresh, Checkers, and Shopee/Lazada "Wholesale" sections.
            Set 'store_type' to "Wholesale".
        `;
    } else {
        targetStoresInstruction = `
            ### STORE FOCUS: HYBRID (ALL TYPES)
            Find a mix of prices from Online, Retail, and Wholesale sources if available.
        `;
    }

    const systemInstruction = `
      You are a Malaysian Price Checker AI.
      
      ### OBJECTIVE
      Find real-time prices for "${searchContext}" in Malaysia. Mode: ${mode}.

      ${targetStoresInstruction}
      
      ### INTERNAL DATABASE KNOWLEDGE (BENCHMARK DATA)
      Use these internal records for specific Wholesale/Retail benchmarks (Date: 2026-02-01):
      - **Premise**: Pasar Besar Jalan Othman (Code 3):
        - Ayam Bersih (Item 2): RM 10.60 (Retail)
        - Ayam Bersih (10 Ekor Bundle): RM 98.00 (Wholesale)
        - Cili Merah (Item 88): RM 14.90 (Retail)
        - Cili Merah (10kg Guni): RM 125.00 (Wholesale)
        - Bawang Besar (5kg Sack): RM 18.00 (Wholesale)
      
      **INSTRUCTION**: If the user query matches these items, ALWAYS include these Internal Database entries as options.

      ### DATA CLEANING & ANALYSIS
      1. **Titles**: Clean up titles. Remove "Ready Stock", "Viral", "Murah".
      2. **Wholesale Logic**:
         - If a listing is for multiple units (e.g. "Pack of 12", "Carton 24s"), set 'store_type' to "Wholesale".
         - Calculate 'unit_price' = Total Price / Quantity.
         - Populate 'bulk_qty' with the count (e.g. 12, 24). For single items, bulk_qty = 1.
      3. **Consistency**: Ensure prices match the requested variant.

      ### OUTPUT FORMAT
      Return strictly RAW JSON. Schema:
      {
        "product_query": "string",
        "listings": [
           {
             "store_name": "string",
             "store_type": "Online" | "Physical" | "Wholesale",
             "price": number,
             "product_variant": "string",
             "is_cheapest": boolean,
             "link": "string",
             "unit_price": number, // Price per 1 unit (e.g. per can, per kg)
             "bulk_qty": number // e.g. 1, 12, 24
           }
        ],
        "average_market_price": number,
        "government_benchmark_price": number,
        "best_deal_savings": number,
        "buying_tip": "string"
      }
    `;

    // Using gemini-2.5-flash for better stability and quota management
    const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Find prices for: ${searchContext} in Malaysia. Mode: ${mode}`,
      config: {
        systemInstruction: systemInstruction,
        tools: [{ googleSearch: {} }],
      }
    }));

    const jsonText = response.text;
    if (!jsonText) {
      throw new Error("AI search failed to return results.");
    }

    let data: ProductComparisonResponse;
    try {
      data = cleanAndParseJson(jsonText);
    } catch (e) {
      throw new Error("Failed to parse pricing data.");
    }
    
    if (!data.listings || !Array.isArray(data.listings)) {
       throw new Error("No price listings found for this product.");
    }

    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];

    return { data, groundingChunks };

  } catch (error) {
    handleGeminiError(error);
  }
};

// Mode: Smart Planner (BijakBudget Engine)
export const optimizeShoppingList = async (items: string[], location: string, transport: 'Car' | 'Motorcycle') => {
  try {
    const inputData = {
      user_location: location,
      shopping_list: items,
      transport_mode: transport,
    };

    const systemInstruction = `
      You are the "BijakBudget Engine," an intelligent shopping logistics AI for Malaysia.

      ### GLOBAL SETTINGS
      - Role: You are a backend processor. Do not be conversational. Output ONLY raw JSON.
      - Objective: Minimize total cost and optimize travel routes for Malaysian grocery shoppers.
      - Language: Output strictly in ENGLISH.

      ### INPUT DATA STRUCTURE
      User will provide JSON with user_location, shopping_list, transport_mode.

      ### YOUR CORE TASKS
      1. Price Search: Use Google Search to find real-time prices at major Malaysian retailers (Lotus's, Mydin, 99 Speedmart, Econsave, Giant, Jaya Grocer).
      2. SARA Logic: Identify items eligible for government SARA credits (Rice, Sugar, Flour, Cooking Oil, Eggs).
      3. Route Logic:
         - Compare "Single Store" vs. "Split Trip" (2 stores).
         - Only recommend "Split Trip" if total savings > RM8.00 (to account for petrol/effort).

      ### OUTPUT FORMAT (STRICT JSON)
      Structure:
      {
        "meta": { "location_processed": "string", "currency": "MYR" },
        "strategies": {
          "best_option": {
            "type": "Single Store" or "Split Trip",
            "total_estimated_cost": number,
            "total_savings": number,
            "sara_coverage_amount": number,
            "display_title": "DISPLAY_TEXT (e.g., 'Cheapest Option: Lotus's')",
            "display_summary": "DISPLAY_TEXT (e.g., 'You save RM12 by buying everything here.')"
          }
        },
        "shopping_plan": [
          {
            "step_number": 1,
            "store_name": "string",
            "action_type": "Shop",
            "items_to_buy": [
              {
                "name": "string",
                "price": number,
                "is_sara_eligible": boolean,
                "notes": "DISPLAY_TEXT (e.g., 'Cheapest price found')"
              }
            ],
            "subtotal": number
          }
        ]
      }
    `;

    // Switch to gemini-2.5-flash for reliability
    const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: JSON.stringify(inputData),
      config: {
        systemInstruction: systemInstruction,
        tools: [{ googleSearch: {} }],
        // responseMimeType: "application/json" removed due to conflict with tools
      }
    }));

    const jsonText = response.text;
    if (!jsonText) {
      throw new Error("AI optimization failed to return results.");
    }

    let data: OptimizationResult;
    try {
      data = cleanAndParseJson(jsonText);
    } catch (e) {
      throw new Error("Failed to parse optimization plan.");
    }

    if (!data.shopping_plan || !Array.isArray(data.shopping_plan)) {
      throw new Error("Optimization plan incomplete.");
    }

    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];

    return { data, groundingChunks };

  } catch (error) {
    handleGeminiError(error);
  }
};

// Mode 2: Chatbot (gemini-2.5-flash with Thinking)
let chatSession: Chat | null = null;

// Function to clear chat session (e.g. on logout)
export const resetChatSession = () => {
  chatSession = null;
};

export const sendMessageToChat = async (message: string, user: UserData) => {
  try {
    if (!chatSession) {
      const locationContext = user.address ? `Their location is: ${user.address}. Use this for finding nearby stores or prices.` : "They haven't specified a location yet. Ask for it if they need store info.";
      
      const systemPrompt = `
      You are "BijakBudget", a smart, local Malaysian shopping assistant.
      
      ### USER PROFILE (CONTEXT)
      - **Name**: ${user.name}
      - **Location**: ${locationContext}
      - **Subscription**: ${user.subscription.tier} tier.
      
      ### INTERNAL DATABASE (CODES & DATA)
      Use these specific codes to interpret data or answer user queries if they reference them:
      - item_code 2 = 'Ayam Bersih - Standard'
      - item_code 88 = 'Cili Merah (Red Chilli)'
      - premise_code 3 = 'Pasar Besar Jalan Othman'
      
      **INTERNAL DATASET (Date: 2026-02-01):**
      - Premise: Pasar Besar Jalan Othman (Code 3):
        - Ayam Bersih (Item 2): RM 10.60
        - Ayam Bersih (10 Ekor Bundle): RM 98.00 (Wholesale)
        - Cili Merah (Item 88): RM 14.90
        - Cili Merah (10kg Guni): RM 125.00 (Wholesale)
        - Item Code 92: RM 14.20
        - Item Code 94: RM 18.00
        - Item Code 95: RM 7.60
      
      Use this specific internal data as the "latest known price" if asked about these items or this premise.
      
      ### YOUR PERSONALITY
      - **Tone**: Friendly, knowledgeable, "Manglish" friendly (use "Boss", "Walao", "Cantik" sparingly).
      - **Role**: Expert on Malaysian groceries, SARA/STR subsidies, and saving money.
      
      ### CAPABILITIES & RULES
      1. **Subsidies**: You know about Sumbangan Asas Rahmah (SARA) and STR.
         - SARA covers: Rice, Cooking Oil, Flour, Bread, Eggs, Sugar.
         - If asked, check if they are eligible based on typical B40 criteria (income < RM2500, etc).
      2. **Grocery Tips**:
         - Always suggest **specific** stores (Lotus's, Mydin, 99 Speedmart, Econsave) if asked where to buy.
         - Use the Google Search tool to check *current* prices if the user asks "How much is Milo right now?".
      3. **Context Awareness**: 
         - Address the user by name (${user.name}).
         - If they ask for "stores near me", use their profile location: ${user.address || 'Malaysia'}.
      4. **Safety**: No medical/legal advice.
      
      ### RESPONSE STYLE
      - Keep it concise.
      - Use bullet points for lists.
      - Speak English but understand BM terms.
      `;

      chatSession = ai.chats.create({
        model: 'gemini-2.5-flash',
        config: {
          systemInstruction: systemPrompt,
          // Lower budget for 2.5 Flash (Max 24576)
          thinkingConfig: { thinkingBudget: 16000 },
          tools: [{ googleSearch: {} }] 
        }
      });
    }

    const result = await withRetry<GenerateContentResponse>(() => chatSession!.sendMessage({ message }));
    return {
      text: result.text,
      groundingChunks: result.candidates?.[0]?.groundingMetadata?.groundingChunks || []
    };
  } catch (error) {
    handleGeminiError(error);
  }
};

// Mode 3: Store Finder (gemini-2.5-flash with Google Maps)
export const findNearbyStores = async (query: string, lat?: number, lng?: number, addressLabel?: string) => {
  try {
    const isGps = lat !== undefined && lng !== undefined;
    
    // Construct config based on whether coordinates are available
    const toolConfig = isGps ? {
      retrievalConfig: {
        latLng: {
          latitude: lat!,
          longitude: lng!
        }
      }
    } : undefined;

    // Construct a more flexible prompt to ensure "No details found" is rare.
    // We prioritize "nearest" which allows Google Maps to return results even if slightly further than 1km.
    let prompt = `Find the closest ${query}`;
    if (addressLabel) {
       prompt += ` near ${addressLabel}.`;
    } else if (isGps) {
       prompt += ` near my current location.`;
    } else {
       prompt += ` in Malaysia.`; // Fallback
    }
    
    prompt += " Return precise location details including lat/lng.";

    const systemInstruction = `
      You are a specialized Store Locator AI. Your goal is to return ACCURATE, REAL-WORLD store data using Google Maps.

      ### SEARCH RULES
      1. **USE THE TOOL**: You MUST use the 'googleMaps' tool to find locations. If the tool returns nothing, return an empty array [].
      2. **NO HALLUCINATIONS**: Do not invent stores or addresses. Use only what the tool provides.
      3. **PROXIMITY**: Prioritize stores physically closest to the user's provided location (or lat/lng context).
      4. **NAMING**: Use official brand names (e.g. "99 Speedmart", "KK Super Mart", "Lotus's").
      
      ### DATA EXTRACTION
      For each store found, extract:
      - **name**: Official Name.
      - **address**: Full formatted address.
      - **rating**: Rating (e.g. "4.5") or "N/A".
      - **distance**: Distance string relative to user if available (e.g. "0.5 km").
      - **status**: e.g. "Open Now", "Closed".
      - **hours**: e.g. "8:00 AM - 10:00 PM".
      - **location**: Object { "lat": number, "lng": number } (CRITICAL for map navigation).

      ### OUTPUT FORMAT
      Return ONLY a RAW JSON Array. No markdown formatting.
      
      Example:
      [
        {
          "name": "99 Speedmart",
          "address": "123, Jalan 1/1, Taman Contoh...",
          "rating": "4.5",
          "distance": "0.5 km",
          "status": "Open",
          "hours": "9:00 AM - 10:00 PM",
          "location": { "lat": 3.123, "lng": 101.456 }
        }
      ]
    `;

    const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        tools: [{ googleMaps: {} }],
        toolConfig: toolConfig,
        systemInstruction: systemInstruction
      }
    }));
    
    return {
      text: response.text, // This should now be a JSON string
      groundingChunks: response.candidates?.[0]?.groundingMetadata?.groundingChunks || []
    };
  } catch (error) {
    handleGeminiError(error);
  }
};

// Mode 4: Quick Tips (gemini-2.5-flash-lite)
export const getDailyTip = async () => {
  try {
    const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
      model: 'gemini-2.5-flash-lite',
      contents: "Give me one short, effective money-saving tip for a Malaysian household in English. Keep it under 20 words.",
    }));
    return response.text;
  } catch (error) {
    console.warn("Quick tip error:", error);
    // Don't throw for quick tip, just return default
    return "Spend within your means, not within your wants!";
  }
};
