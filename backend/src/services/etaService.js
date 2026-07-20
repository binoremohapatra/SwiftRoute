const AutoAssignService = require('./autoAssign.service');

class EtaService {
  /**
   * Calculate smart ETA using traffic patterns (mocked) and haversine distance.
   * Assumes average speed of 30 km/h under normal conditions.
   * @param {number} startLat 
   * @param {number} startLng 
   * @param {number} endLat 
   * @param {number} endLng 
   * @returns {number} ETA in minutes
   */
  static calculateETA(startLat, startLng, endLat, endLng) {
    if (!startLat || !startLng || !endLat || !endLng) return 30; // fallback

    const distanceKm = AutoAssignService._haversineKm(startLat, startLng, endLat, endLng);
    
    // Average speed in city: 30 km/h
    let speedKmH = 30;

    // Traffic modifier based on hour of day (mocked)
    const hour = new Date().getHours();
    
    // Peak hours: 8-10 AM and 5-8 PM (17-20)
    if ((hour >= 8 && hour <= 10) || (hour >= 17 && hour <= 20)) {
      speedKmH = 15; // Heavy traffic
    } else if (hour >= 22 || hour <= 5) {
      speedKmH = 45; // Clear roads
    }

    const timeHours = distanceKm / speedKmH;
    const timeMinutes = Math.round(timeHours * 60);

    // Add 5 mins buffer for pickup/dropoff handling
    return timeMinutes + 5;
  }
}

module.exports = EtaService;
