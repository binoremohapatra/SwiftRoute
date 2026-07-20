/**
 * Calculates the great-circle distance between two points on the Earth's surface.
 * @param {number} lat1 Latitude of point 1
 * @param {number} lon1 Longitude of point 1
 * @param {number} lat2 Latitude of point 2
 * @param {number} lon2 Longitude of point 2
 * @returns {number} Distance in kilometers
 */
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const toRadians = (deg) => (deg * Math.PI) / 180;
  const R = 6371; // Earth's radius in km

  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
};

/**
 * Calculates estimated time of arrival based on distance and average speed
 * @param {number} distanceKm Distance in kilometers
 * @param {number} avgSpeedKmh Average speed in km/h (default 30)
 * @returns {number} Estimated time in minutes
 */
const calculateETA = (distanceKm, avgSpeedKmh = 30) => {
  const timeHours = distanceKm / avgSpeedKmh;
  return Math.round(timeHours * 60);
};

module.exports = { calculateDistance, calculateETA };
