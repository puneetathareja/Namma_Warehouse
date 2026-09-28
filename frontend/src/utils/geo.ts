/**
 * Geographic and Logistics Calculation Utilities
 */

// Haversine formula to compute great-circle distance between two coordinates in kilometers
export function calculateDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c).toFixed(2));
}

/**
 * Calculates estimated delivery time in minutes considering:
 * - Distance in km
 * - Base urban transit speed (~28 km/h in Indian metros like Bengaluru)
 * - Local traffic multiplier (0.15 to 0.98 traffic index)
 * - Handling and last-mile dispatch buffer
 */
export function calculateDeliveryTimeMinutes(
  distanceKm: number,
  trafficIndex = 0.5,
  trafficMultiplier = 1.0
): number {
  const baseSpeedKmh = 28; // typical intra-city logistics speed
  // Traffic slows speed down: traffic index 0.15 -> speed ~32 km/h, traffic 0.95 -> speed ~14 km/h
  const effectiveSpeed = Math.max(
    12,
    baseSpeedKmh / (1 + trafficIndex * 0.9 * trafficMultiplier)
  );
  const transitTimeMin = (distanceKm / effectiveSpeed) * 60;
  const dispatchBufferMin = 6; // loading & route staging
  return Number((transitTimeMin + dispatchBufferMin).toFixed(1));
}

/**
 * Calculates fuel consumption in liters:
 * Typical commercial diesel delivery van (e.g. Tata Ace / Bolero Maxi):
 * 0.18 - 0.28 L/km under urban stop-and-go conditions
 */
export function calculateFuelLiters(
  distanceKm: number,
  ordersCount: number,
  trafficIndex = 0.5
): number {
  // Trips needed based on van batch capacity (e.g. ~45 orders per van batch)
  const trips = Math.max(1, Math.ceil(ordersCount / 45));
  const baseConsumptionPerKm = 0.22; // Liters/km
  const trafficImpact = 1 + trafficIndex * 0.45;
  // Round trip distance
  const totalKm = distanceKm * 2 * trips;
  return Number((totalKm * baseConsumptionPerKm * trafficImpact).toFixed(1));
}

/**
 * Calculates CO2 emissions in kg from diesel fuel:
 * 1 Liter diesel burning yields ~2.68 kg CO2
 */
export function calculateCO2Kg(fuelLiters: number): number {
  return Number((fuelLiters * 2.68).toFixed(1));
}
