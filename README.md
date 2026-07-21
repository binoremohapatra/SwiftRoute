# SwiftRoute: Project Report Document

**Developer Name:** Binore Mohapatra  
**College / University:** GGSIPU, Delhi  
**Project Description:** A real-time delivery tracking, order management, and fleet intelligence engine built for quick-commerce and logistics operations.

---

## 1. EXECUTIVE SUMMARY & ABSTRACT

In the rapidly evolving landscape of quick-commerce and on-demand logistics, real-time visibility and efficient fleet management are critical differentiators. **SwiftRoute** is a comprehensive, full-stack web application designed to orchestrate the entire lifecycle of a delivery operation. It serves as an end-to-end logistics platform that bridges the gap between Customers, Delivery Agents, and Administrators. 

The system provides an intuitive interface for users to place orders, a dedicated Progressive Web App (PWA) for delivery agents to accept jobs and stream their live GPS coordinates, and a centralized "God-Mode" radar dashboard for administrators to monitor the fleet. By leveraging a modern technology stack—including React 19, Node.js, Prisma ORM, and WebSockets—SwiftRoute delivers a scalable, low-latency, and event-driven architecture capable of handling concurrent geolocation streams and high-throughput order processing.

---

## 2. PROBLEM STATEMENT & PROPOSED SOLUTION

### Challenges in Traditional Logistics
Traditional logistics and delivery systems often suffer from significant latency in tracking updates, leading to a poor customer experience. Key challenges include:
- **Opaque Delivery Tracking:** Customers lack real-time visibility into the exact location of their orders, relying on delayed milestone updates.
- **Inefficient Fleet Management:** Administrators struggle to dispatch orders optimally without live geospatial data of available agents.
- **Communication Bottlenecks:** Manual coordination between dispatchers and drivers causes operational delays.

### The SwiftRoute Solution
SwiftRoute directly addresses these challenges by implementing an **event-driven architecture** over WebSockets. 
- **Real-Time GPS Streaming:** Instead of polling REST APIs, agents broadcast their geographic coordinates over persistent TCP connections (Socket.IO).
- **Smart Auto-Assignment:** The backend engine utilizes geospatial queries to instantly assign new orders to the nearest available agent.
- **Low-Latency Updates:** Both customers and administrators receive sub-second updates on order statuses and driver locations without refreshing the client application.

---

## 3. SYSTEM ARCHITECTURE & DESIGN

SwiftRoute follows a modernized multi-tier Client-Server Architecture, characterized by strict separation of concerns:

- **Presentation Layer (Frontend):** A Single Page Application (SPA) built with React 19 and Vite. It consumes REST APIs for CRUD operations and maintains a persistent WebSocket connection for real-time telemetry.
- **Application Layer (Backend API):** A Node.js/Express.js server that acts as the central orchestration engine. It handles business logic, authentication, payment verification, and acts as the WebSocket hub.
- **Persistence Layer (Database):** A relational PostgreSQL database managed via Prisma ORM for type-safe queries and data integrity.

### Event-Driven Communication Flow
1. An Agent's device captures physical GPS coordinates.
2. The client emits an `agent:locationUpdate` event over Socket.IO.
3. The Node.js server receives the payload and broadcasts it to specific rooms (e.g., `order:{id}` and `admin_dashboard`).
4. Connected Customer and Admin clients receive the broadcast and instantly re-render the MapLibre GL map markers.

---

## 4. TECHNICAL STACK & LIBRARIES

### Frontend Architecture
- **Framework:** React 19, bundled via Vite for lightning-fast HMR and optimized builds.
- **Styling:** Tailwind CSS for utility-first, responsive, and scalable UI design.
- **Maps & Geospatial:** MapLibre GL JS combined with `react-map-gl` for rendering interactive maps and dynamic routing layers.
- **Real-Time Client:** `socket.io-client` for bidirectional event listening.

### Backend Engine
- **Runtime & Framework:** Node.js paired with Express.js.
- **Database ORM:** Prisma ORM for database migrations, schema definitions, and type-safe SQL execution.
- **Real-Time Engine:** Socket.IO for handling concurrent WebSocket connections and room-based broadcasting.
- **Push Notifications:** Firebase Admin SDK (FCM) for reliable out-of-band mobile and web push notifications.

### Database & Cloud Infrastructure
- **Database:** PostgreSQL, hosted serverlessly on Neon DB for connection pooling and high availability.
- **Deployment:** 
  - Frontend: Vercel (Edge CDN, Automated CI/CD).
  - Backend: Render (Node.js runtime environment).

---

## 5. CORE MODULES & USER ROLES

### Customer Portal
- **Order Creation:** Users can drop pins on the map to define precise pickup and drop-off coordinates.
- **Live Tracking:** An interactive map view displaying the delivery agent's real-time movement and estimated time of arrival.
- **Payment Checkout:** Integration with Razorpay for secure online transactions and Cash on Delivery (COD) options.

### Delivery Agent Portal
- **Real-Time Status:** A toggle to switch between Online/Offline modes, making them visible to the Smart Assign algorithm.
- **Job Dispatch:** Real-time popups allowing agents to immediately Accept or Reject incoming delivery requests.
- **GPS Streaming:** Background location tracking that continuously syncs coordinates with the server.

### Admin Dashboard
- **Global Fleet Radar:** A "God-mode" map interface displaying all active agents, pending orders, and live traffic across the city.
- **Smart Driver Assignment:** Automated logic to calculate the nearest agent and dispatch orders without manual intervention.
- **Fleet Analytics:** Data visualization dashboards tracking daily deliveries, revenue, and agent performance.

---

## 6. DATABASE SCHEMA & DATA MODEL

The relational data model is designed for high consistency and fast geospatial querying. Key entities include:

- **User Model:** Stores authentication credentials, profile data, and roles (`CUSTOMER`, `AGENT`, `ADMIN`).
- **Order Model:** Central entity linking the Customer and the assigned Agent. It tracks `pickupLocation`, `dropLocation` (stored as JSON coordinates), `status` (PENDING, IN_TRANSIT, DELIVERED), and payment metadata.
- **Agent Model:** An extension of the User model containing fleet-specific data such as `currentLocation`, `isAvailable`, `vehicleType`, and total earnings.
- **Notification Model:** Persistent storage for in-app alerts, linked to a specific User with a `read` boolean flag.

---

## 7. REST API & WEBSOCKET ENGINE

### REST API Overview
The backend exposes modular RESTful endpoints categorized by domain:
- `/api/v1/auth/*`: JWT generation, login, and registration.
- `/api/v1/orders/*`: Order creation, historical retrieval, and status mutations.
- `/api/v1/admin/*`: Fleet analytics, user management, and manual dispatching overrides.
- `/api/v1/agents/*`: Profile updates, location syncing fallbacks, and delivery history.
- `/api/v1/payments/*`: Order ID generation and Razorpay webhook verification.

### WebSocket Engine Flow
Socket.IO is heavily utilized for low-latency operations:
- `joinOrderRoom`: Customers and Agents join a specific isolated room (e.g., `order_123`) when tracking begins.
- `agent:locationUpdate`: The high-frequency event emitted by the agent's device containing `{ lat, lng, heading }`.
- `agent:statusUpdate`: Instantly reflects when an agent goes offline, updating the Admin radar without an HTTP refresh.

---

## 8. SECURITY, RATE LIMITING & PERFORMANCE

To ensure production readiness and data integrity, SwiftRoute implements strict security policies:

- **Authentication:** Stateless JWT (JSON Web Tokens) used for validating all protected API routes. Tokens are signed securely and verified via custom Express middleware.
- **CORS Policies:** Cross-Origin Resource Sharing is strictly configured to only accept requests from the deployed Vercel frontend domain.
- **HTTP Security Headers:** Helmet.js is deployed to protect against XSS, clickjacking, and MIME sniffing attacks.
- **Rate Limiting:** `express-rate-limit` prevents brute-force attacks on authentication endpoints and mitigates DDoS risks on the public APIs.
- **Connection Pooling:** Neon DB leverages PgBouncer to manage database connections efficiently, preventing Prisma connection exhaustion under heavy load.

---

## 9. DEPLOYMENT & CI/CD PIPELINE

The application utilizes a modern, serverless-friendly CI/CD pipeline:

- **Frontend on Vercel:** Connected directly to the GitHub repository. Any pushes to the `main` branch trigger an automated Vite build, minification, and deployment to Vercel's global Edge Network.
- **Backend on Render:** The Node.js application is deployed as a Web Service. Environment variables (DB URI, JWT Secrets, Razorpay Keys) are securely injected at runtime.
- **Neon PostgreSQL:** The database operates on a serverless architecture, scaling compute resources automatically based on concurrent backend queries.

---

## 10. CONCLUSION & FUTURE ENHANCEMENTS

### Conclusion
SwiftRoute successfully demonstrates the capability to orchestrate complex logistics workflows using a modern JavaScript stack. By utilizing WebSockets for real-time telemetry and a robust relational database for transactional integrity, the system provides a highly scalable foundation for quick-commerce delivery operations.

### Future Scope
- **AI-Based Route Optimization:** Integrating machine learning algorithms to calculate optimal multi-stop delivery routes, minimizing fuel consumption and time.
- **Offline Caching:** Enhancing the Agent PWA with Service Workers to queue API requests (like delivery completion) when traversing areas with poor cellular network coverage.
- **Predictive Dispatching:** Forecasting order volumes in specific geofences and proactively guiding agents to high-demand zones.
