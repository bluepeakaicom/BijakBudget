import { GoogleGenAI, GenerateContentResponse, ChatSession } from "@google/genai";
import { BijakResponse, GroundingChunk, UserData, ShoppingStrategy, OptimizationResult, ShopperPersona, PersonalizedInsight, ProductComparisonResponse } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// --- HELPERS ---

export const cleanAndParseJson = (text: string): any => {
  try {
    const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
    // Helper to find the first JSON-like structure if mixed with text
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1) {
        return JSON.parse(cleaned.substring(firstBrace, lastBrace + 1));
    }
    return JSON.parse(cleaned);
  } catch (e) {
    console.error("JSON Parse Error:", e);
    return null;
  }
};

export const handleGeminiError = (error: any) => {
  console.error("Gemini API Error:", error);
  throw new Error(error.message || "An error occurred with the AI service.");
};

async function withRetry<T>(fn: () => Promise<T>, retries = 2): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    if (retries > 0) {
      await new Promise(r => setTimeout(r, 1000));
      return withRetry(fn, retries - 1);
    }
    throw e;
  }
}

// --- CHAT SESSION MANAGEMENT ---

let chatSession: ChatSession | null = null;

export const resetChatSession = () => {
  chatSession = null;
};

export const sendMessageToChat = async (message: string, user: UserData): Promise<{ text: string, groundingChunks: GroundingChunk[] }> => {
  try {
    if (!chatSession) {
      chatSession = ai.chats.create({
        model: 'gemini-3-flash-preview',
        config: {
          systemInstruction: `You are BijakBudget AI, a helpful Malaysian grocery assistant.
          User Profile: Name: ${user.name}, Location: ${user.address || 'Malaysia'}.
          Shopper Pattern: ${user.shopperPersona ? `Archetype: ${user.shopperPersona.archetype}. Preferences: ${user.shopperPersona.preferred_brands?.join(', ')}. Diet: ${user.shopperPersona.dietary_preferences?.join(', ')}.` : 'New User'}
          Help them save money, find cheap groceries, check SARA eligibility, and plan shopping trips.
          Use Malaysian slang (lah, bossku) occasionally but keep it professional.
          Currencies are in MYR (RM).`,
          tools: [{ googleSearch: {} }]
        }
      });
    }

    const response = await withRetry<GenerateContentResponse>(() => chatSession!.sendMessage(message));
    
    return {
      text: response.text || "Sorry, I couldn't generate a response.",
      groundingChunks: response.candidates?.[0]?.groundingMetadata?.groundingChunks as GroundingChunk[] || []
    };
  } catch (error) {
    handleGeminiError(error);
    return { text: "Error connecting to AI.", groundingChunks: [] };
  }
};

// --- IMAGE ANALYSIS ---

export const analyzeImage = async (base64Image: string, mimeType: string): Promise<{ data: BijakResponse, groundingChunks: GroundingChunk[] }> => {
  try {
    const model = 'gemini-2.5-flash-image'; 
    
    const prompt = `
      Analyze this image (receipt or product).
      If it is a receipt: Extract store name, date, items purchased (name, price, quantity/unit). Determine if items are SARA eligible (basic essentials like Rice, Oil, Eggs, Flour, Bread).
      If it is a product: Identify the product name, estimated price range in Malaysia, and category.
      
      Return JSON format matching this schema:
      {
        "store_detected": "string",
        "scan_date": "YYYY-MM-DD",
        "items": [
          {
            "item_name": "string",
            "scanned_price": number,
            "unit": "string",
            "sara_eligible": boolean,
            "competitor_prices": [
               { "store_name": "string", "price": number, "is_cheapest": boolean }
            ]
          }
        ],
        "total_sara_spendable": number
      }
    `;

    const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
      model: model,
      contents: {
        parts: [
          { inlineData: { mimeType, data: base64Image } },
          { text: prompt }
        ]
      }
      // Note: gemini-2.5-flash-image does not support responseMimeType: "application/json"
    }));

    const json = cleanAndParseJson(response.text || "{}");
    
    const result: BijakResponse = {
        store_detected: json.store_detected || "Unknown Store",
        scan_date: json.scan_date || new Date().toISOString().split('T')[0],
        items: Array.isArray(json.items) ? json.items : [],
        total_sara_spendable: typeof json.total_sara_spendable === 'number' ? json.total_sara_spendable : 0
    };

    return { 
        data: result, 
        groundingChunks: [] 
    };

  } catch (error) {
    handleGeminiError(error);
    throw error;
  }
};

// --- STORE FINDER ---

export const findNearbyStores = async (query: string, lat?: number, lng?: number, locationName?: string): Promise<{ text: string, groundingChunks: GroundingChunk[] }> => {
  try {
    const locationContext = lat && lng 
      ? `near coordinates ${lat}, ${lng} (${locationName || ''})` 
      : `in ${locationName || 'Malaysia'}`;

    const prompt = `Find 5 ${query} ${locationContext}. Return a JSON list of stores with details.
    Schema:
    [
      {
        "name": "string",
        "address": "string",
        "rating": "string",
        "distance": "string",
        "status": "string (Open/Closed)",
        "hours": "string",
        "location": { "lat": number, "lng": number }
      }
    ]`;

    const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        tools: [{ googleMaps: {} }],
        responseMimeType: "application/json"
      }
    }));

    return {
      text: response.text || "[]",
      groundingChunks: response.candidates?.[0]?.groundingMetadata?.groundingChunks as GroundingChunk[] || []
    };

  } catch (error) {
    handleGeminiError(error);
    return { text: "[]", groundingChunks: [] };
  }
};

// --- PRICE COMPARISON ---

export const compareProductPrices = async (query: string, variant: string, mode: string, userAddress?: string): Promise<{ data: ProductComparisonResponse, groundingChunks: GroundingChunk[] }> => {
  try {
    const prompt = `
      Compare prices for "${query} ${variant}" in Malaysia.
      Mode: ${mode} (Retail, Online, Wholesale).
      User Location: ${userAddress || 'General Malaysia'}.
      Find current prices from 99 Speedmart, Lotus's, Mydin, Econsave, Shopee, Lazada.
      
      Return JSON:
      {
        "product_query": "${query}",
        "average_market_price": number,
        "best_deal_savings": number,
        "buying_tip": "string",
        "listings": [
          {
            "store_name": "string",
            "price": number,
            "product_variant": "string",
            "is_cheapest": boolean,
            "store_type": "Online" | "Physical" | "Wholesale",
            "link": "string (optional)",
            "unit_price": number (optional),
            "bulk_qty": number (optional),
            "image_url": "string (optional)"
          }
        ]
      }
    `;

    const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json"
      }
    }));

    const json = cleanAndParseJson(response.text || "{}");
    return {
        data: json,
        groundingChunks: response.candidates?.[0]?.groundingMetadata?.groundingChunks as GroundingChunk[] || []
    };

  } catch (error) {
    handleGeminiError(error);
    throw error;
  }
};

// --- SMART PLANNER ---

export const optimizeShoppingList = async (items: {name: string, qty: number}[], location: string, transport: string, persona?: ShopperPersona): Promise<{ data: OptimizationResult }> => {
  try {
    const prompt = `
      Optimize this shopping list for a user in ${location} using ${transport}.
      Items: ${JSON.stringify(items)}.
      Shopper Persona: ${persona ? JSON.stringify(persona) : 'General Shopper'}.
      
      **BEHAVIORAL INSTRUCTION**:
      - If persona has 'preferred_stores' (e.g. ${persona?.preferred_stores?.join(', ')}), prioritize them if prices are within 10% of cheapest.
      - If persona has 'preferred_brands' (e.g. ${persona?.preferred_brands?.join(', ')}), assume the user wants those specific brands for generic items like 'Coffee' or 'Milk'.
      - If 'price_sensitivity' is 'High', prioritize strictly cheapest options regardless of brand.
      
      Suggest two strategies: "max_savings" (cheapest total) and "best_convenience" (least travel).
      Calculate fuel costs based on transport mode.
      
      Return JSON:
      {
        "meta": {
          "location_processed": "string",
          "currency": "MYR",
          "recommended_strategy_id": "max_savings" | "best_convenience"
        },
        "strategies": [
          {
            "id": "max_savings" | "best_convenience",
            "type": "string",
            "display_title": "string",
            "display_summary": "string",
            "total_grocery_cost": number,
            "estimated_fuel_cost": number,
            "total_trip_cost": number,
            "total_savings_vs_market": number,
            "distance_km": number,
            "shopping_plan": [
              {
                "step_number": number,
                "store_name": "string",
                "action_type": "string",
                "subtotal": number,
                "items_to_buy": [
                  { "name": "string", "quantity": number, "price": number, "is_sara_eligible": boolean, "notes": "string" }
                ]
              }
            ]
          }
        ]
      }
    `;

    const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json"
      }
    }));

    const json = cleanAndParseJson(response.text || "{}");
    return { data: json };

  } catch (error) {
    handleGeminiError(error);
    throw error;
  }
};

export const predictShoppingNeeds = async (user: UserData): Promise<{item: string, reason: string}[]> => {
  try {
    const prompt = `
      Predict 3 shopping items for this user based on history and persona.
      
      Profile:
      - Archetype: ${user.shopperPersona?.archetype || "Unknown"}
      - Preferred Brands: ${user.shopperPersona?.preferred_brands?.join(", ") || "None"}
      - Preferred Stores: ${user.shopperPersona?.preferred_stores?.join(", ") || "None"}
      - History Sample: ${JSON.stringify(user.activityHistory?.slice(0, 10).map(h => h.detail) || [])}
      
      Rules:
      1. If they frequently buy 'Milo', suggest 'Milo' or 'Milk'.
      2. If they have 'preferred_brands', use those in the item name (e.g., "Nestle Koko Krunch" instead of "Cereal").
      3. Suggest complementary items (e.g. bought Coffee -> suggest Sugar/Creamer).
      
      Return JSON array: [{"item": "string", "reason": "string"}]
    `;
    
    const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: { responseMimeType: "application/json" }
    }));
    
    return cleanAndParseJson(response.text || "[]");
  } catch (error) {
    return [];
  }
};

// --- MERCHANT ANALYTICS ---

export const analyzeMerchantMetrics = async (businessName: string, metrics: any) => {
  try {
    // Include store type if available in metrics for better context
    const context = metrics.storeType ? `Type: ${metrics.storeType}.` : '';
    
    const prompt = `
      Analyze merchant metrics for ${businessName}. ${context} 
      Data: ${JSON.stringify(metrics)}.
      
      Output JSON Schema:
      {
        "efficiency_grade": "string (e.g. A, B+, C)",
        "behavior_summary": "string (brief insight)",
        "roi_analysis": "string (brief financial note)",
        "optimization_tip": "string (actionable advice)",
        "projected_growth": "string (e.g. +12% next month)"
      }
    `;
    const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: { responseMimeType: "application/json" }
    }));
    return cleanAndParseJson(response.text || "{}");
  } catch (error) { handleGeminiError(error); }
};

export const verifyBusinessDocument = async (base64Data: string, mimeType: string, expectedName: string, expectedRoc: string) => {
  try {
    const systemInstruction = `
      You are an expert document verification officer for SSM (Suruhanjaya Syarikat Malaysia).
      
      ### TASK
      Analyze the provided document (SSM Certificate, ROC, ROB, or Business License).
      Extract the "Business Name" and "Registration Number".
      Compare them strictly against the User Inputs provided below.
      
      ### USER INPUTS
      - Expected Business Name: "${expectedName}"
      - Expected Registration No: "${expectedRoc}"
      
      ### MATCHING LOGIC
      1. **Registration Number (Critical)**:
         - Strip non-alphanumeric chars (e.g. "202001001234 (12345-X)" -> "20200100123412345X").
         - If the Expected ROC is contained within the Document ROC (or vice versa), consider it a MATCH.
      2. **Business Name**:
         - Case-insensitive.
         - Ignore legal suffixes like "Sdn. Bhd.", "Bhd.", "Enterprise" for the comparison.
         - Allow minor typos (Levenshtein distance < 3).
         
      ### OUTPUT JSON
      {
        "verified": boolean,
        "extracted_roc": "string",
        "extracted_name": "string",
        "confidence_score": number (0-100),
        "reason": "string (Brief explanation of match status)"
      }
    `;

    const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
      model: 'gemini-2.5-flash-image', // Capable of reading text from images/docs
      contents: { 
        parts: [
          { inlineData: { mimeType: mimeType, data: base64Data } }, 
          { text: "Perform SSM Verification." }
        ] 
      },
      config: { 
        // responseMimeType: "application/json", // NOT SUPPORTED for gemini-2.5-flash-image
        systemInstruction: systemInstruction
      }
    }));
    return cleanAndParseJson(response.text || "{}");
  } catch (error) { handleGeminiError(error); }
};


// --- USER INSIGHTS ---

export const analyzeUserBehavior = async (user: UserData): Promise<ShopperPersona> => {
    try {
        const prompt = `
          Analyze this user's activity history to build a deep shopper persona.
          History: ${JSON.stringify(user.activityHistory || [])}.
          
          **TASKS**:
          1. **Identify Brands**: Look for repeated brand names in scan or search details (e.g. "Milo", "Hup Seng", "Maggi").
          2. **Identify Stores**: Look for store names in "view_store" or "scan_product" actions (e.g. "99 Speedmart", "Jaya Grocer").
          3. **Infer Diet**: Look for keywords like "Halal", "Organic", "Vegetarian", "Gluten Free" in item names.
          4. **Determine Tier**: 
             - "Budget": Frequent searches for "cheapest", "99 Speedmart", "Econsave".
             - "Premium": Frequent searches for "Jaya Grocer", "Import", "Organic".
          
          Return JSON:
          {
            "archetype": "string (e.g. 'The Bulk Hunter')",
            "description": "string",
            "savings_score": number,
            "top_category_interest": "string",
            "price_sensitivity": "High" | "Medium" | "Low",
            "preferred_shopping_days": ["string"],
            "predicted_next_need": "string",
            "behavioral_tips": ["string"],
            "dietary_preferences": ["string"],
            "preferred_brands": ["string"],
            "preferred_stores": ["string"],
            "spending_tier": "Budget" | "Mid-range" | "Premium"
          }
        `;
        const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: { responseMimeType: "application/json" }
        }));
        const persona = cleanAndParseJson(response.text || "{}");
        return {
            ...persona,
            last_updated: new Date().toISOString()
        };
    } catch (e) {
        throw e;
    }
};

export const generateDailyInsight = async (user: UserData): Promise<PersonalizedInsight | null> => {
    try {
        const prompt = `
           Generate a single sentence daily shopping insight or tip for this user.
           Persona: ${JSON.stringify(user.shopperPersona)}.
           
           Rules:
           - If they like specific brands (${user.shopperPersona?.preferred_brands?.join(', ')}), mention a deal for them.
           - If they are 'Budget' tier, focus on raw savings.
           
           Return JSON:
           {
             "message": "string",
             "action_type": "compare" | "navigate" | "info",
             "action_payload": "string (item name or store name)"
           }
        `;
        const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: { responseMimeType: "application/json" }
        }));
        return cleanAndParseJson(response.text || "{}");
    } catch (e) { return null; }
};

export const generateBirthdayWish = async (user: UserData): Promise<string> => {
    try {
        const prompt = `Write a short, fun birthday wish for ${user.name} who loves saving money on groceries.`;
        const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
             model: 'gemini-3-flash-preview',
             contents: prompt
        }));
        return response.text || "Happy Birthday!";
    } catch (e) { return "Happy Birthday!"; }
};

export const generateNotificationContent = async (type: string, data: any): Promise<string> => {
   return `New update regarding ${type}`;
};