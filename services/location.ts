
// Service to handle Location and Reverse Geocoding with Malaysian context

interface NominatimAddress {
  amenity?: string;
  shop?: string;
  leisure?: string;
  tourism?: string;
  building?: string;
  historic?: string;
  road?: string;
  pedestrian?: string;
  highway?: string;
  suburb?: string;
  neighbourhood?: string;
  residential?: string;
  village?: string;
  industrial?: string;
  city?: string;
  town?: string;
  city_district?: string;
  district?: string;
  state?: string;
  postcode?: string;
}

export const getReadableAddress = async (lat: number, lng: number): Promise<string> => {
  try {
    // Using OpenStreetMap Nominatim API
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
      {
        headers: {
          'Accept-Language': 'en-US,en;q=0.9,ms;q=0.8', // Prefer English/Malay
          'User-Agent': 'BijakBudget/1.0'
        }
      }
    );

    if (!response.ok) throw new Error("Geocoding failed");

    const data = await response.json();
    const a: NominatimAddress = data.address;

    // --- Malaysian Address Logic ---
    // Goal: "Sunway Pyramid, Bandar Sunway" or "No 12, Jalan Tun Razak, KL"
    
    const parts: string[] = [];

    // 1. Point of Interest (Mall, Shop, Landmark)
    // Specificity is key. If user is AT a specific building, show it.
    const poi = a.amenity || a.shop || a.leisure || a.tourism || a.building || a.historic;
    if (poi) parts.push(poi);

    // 2. Road / Street (Jalan, Lorong, Lebuh)
    const road = a.road || a.pedestrian || a.highway;
    if (road) parts.push(road);

    // 3. Neighborhood / Area (Taman, Seksyen, Kampung) - CRITICAL for Malaysia
    // 'Suburb' usually holds "Bandar Sunway", "TTDI", "Bangsar"
    // 'Neighbourhood' usually holds "Seksyen 17"
    const area = a.suburb || a.neighbourhood || a.residential || a.village || a.industrial;
    
    // Only add area if it's not effectively the same as the POI (rare but possible)
    if (area && area !== poi) parts.push(area);

    // 4. District / City
    // In KL, 'city' is Kuala Lumpur. In Selangor, 'town' might be 'Petaling Jaya'.
    // 'city_district' is often detailed like 'Lembah Pantai'.
    const city = a.city || a.town || a.city_district || a.district;
    if (city && city !== area) parts.push(city);

    // 5. State (Only if list is short, to keep it concise)
    // e.g. "Selangor", "Wilayah Persekutuan"
    const state = a.state;
    if (parts.length < 3 && state && state !== city) {
        // Clean up "Wilayah Persekutuan" to "WP" or remove if City is "Kuala Lumpur"
        if (state.includes("Kuala Lumpur") && city?.includes("Kuala Lumpur")) {
            // redundant
        } else {
            parts.push(state);
        }
    }

    // Filter duplicates (case insensitive check) and Join
    const uniqueParts = parts.filter((element, index) => {
        return parts.findIndex(item => item.toLowerCase() === element.toLowerCase()) === index;
    });

    // Return the top 3 most relevant parts to avoid overly long strings
    // e.g. "Sunway Pyramid, Jalan PJS 11/15, Bandar Sunway"
    if (uniqueParts.length === 0) {
        return `Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}`;
    }

    return uniqueParts.slice(0, 3).join(", ");

  } catch (error) {
    console.warn("Reverse geocoding error:", error);
    return `Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}`;
  }
};
