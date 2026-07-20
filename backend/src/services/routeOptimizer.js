const AutoAssignService = require('./autoAssign.service');

class RouteOptimizer {
  /**
   * Optimize a list of stops (TSP approximation using nearest neighbor)
   * Stops format: [{ id: 'order1_pickup', lat, lng, type: 'pickup' }, { id: 'order1_drop', lat, lng, type: 'drop' }]
   * @param {number} startLat 
   * @param {number} startLng 
   * @param {Array} stops 
   */
  static optimizeMultiStopRoute(startLat, startLng, stops) {
    if (!stops || stops.length === 0) return [];

    let currentLat = startLat;
    let currentLng = startLng;
    let unvisited = [...stops];
    let route = [];
    
    // We must ensure that drops only happen after their respective pickups.
    // For simplicity, we just use a nearest neighbor approach while checking constraints.
    let pickedUpOrders = new Set();
    
    // Auto pickup condition: if the stop type is drop but it doesn't have a pickup in the unvisited list, we assume it's already picked up
    stops.forEach(s => {
      if (s.type === 'drop') {
        const hasPickup = stops.find(x => x.type === 'pickup' && x.orderId === s.orderId);
        if (!hasPickup) pickedUpOrders.add(s.orderId);
      }
    });

    while (unvisited.length > 0) {
      let nearestIdx = -1;
      let minDistance = Infinity;

      for (let i = 0; i < unvisited.length; i++) {
        const stop = unvisited[i];
        
        // Constraint: Can't drop if haven't picked up
        if (stop.type === 'drop' && !pickedUpOrders.has(stop.orderId)) {
          continue;
        }

        const distance = AutoAssignService._haversineKm(currentLat, currentLng, stop.lat, stop.lng);
        if (distance < minDistance) {
          minDistance = distance;
          nearestIdx = i;
        }
      }

      if (nearestIdx === -1) {
        // Should not happen unless constraints are violated, but break to prevent infinite loop
        break;
      }

      const nextStop = unvisited[nearestIdx];
      route.push({
        ...nextStop,
        distanceFromPreviousKm: minDistance
      });
      
      if (nextStop.type === 'pickup') {
        pickedUpOrders.add(nextStop.orderId);
      }

      currentLat = nextStop.lat;
      currentLng = nextStop.lng;
      unvisited.splice(nearestIdx, 1);
    }

    return route;
  }
}

module.exports = RouteOptimizer;
