
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
    // Goal: "Sunway Pyramid, Bandar Sunway, 47500" or "No 12, Jalan Tun Razak, KL"
    
    const parts: string[] = [];

    // 1. Point of Interest (Mall, Shop, Landmark)
    const poi = a.amenity || a.shop || a.leisure || a.tourism || a.building || a.historic;
    if (poi) parts.push(poi);

    // 2. Road / Street
    const road = a.road || a.pedestrian || a.highway;
    if (road) parts.push(road);

    // 3. Neighborhood / Area (Taman, Seksyen, Kampung)
    const area = a.suburb || a.neighbourhood || a.residential || a.village || a.industrial;
    if (area && area !== poi) parts.push(area);

    // 4. Postcode (Crucial for Malaysian navigation)
    if (a.postcode) parts.push(a.postcode);

    // 5. District / City
    const city = a.city || a.town || a.city_district || a.district;
    if (city && city !== area) parts.push(city);

    // 6. State
    const state = a.state;
    if (parts.length < 4 && state && state !== city) {
        if (state.includes("Kuala Lumpur") && city?.includes("Kuala Lumpur")) {
            // redundant
        } else {
            parts.push(state);
        }
    }

    // Filter duplicates and Join
    const uniqueParts = parts.filter((element, index) => {
        return parts.findIndex(item => item.toLowerCase() === element.toLowerCase()) === index;
    });

    // Return the top 4 most relevant parts
    if (uniqueParts.length === 0) {
        return `Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}`;
    }

    return uniqueParts.slice(0, 4).join(", ");

  } catch (error) {
    console.warn("Reverse geocoding error:", error);
    return `Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}`;
  }
};
