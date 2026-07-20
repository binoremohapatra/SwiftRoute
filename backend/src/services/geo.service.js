const { calculateDistance, calculateETA } = require('../utils/haversine');

class GeoService {
  /**
   * Get distance and ETA between two points
   */
  static getRouteDetails(originLat, originLng, destLat, destLng) {
    const distanceKm = calculateDistance(originLat, originLng, destLat, destLng);
    const etaMinutes = calculateETA(distanceKm);
    
    return {
      distanceKm: parseFloat(distanceKm.toFixed(2)),
      etaMinutes,
    };
  }
}

module.exports = GeoService;
