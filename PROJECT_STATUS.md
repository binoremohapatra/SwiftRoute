# SwiftRoute (Real-Time Delivery Tracking & Order Management System)
**Project Status & Audit Report**

This report is a complete, code-level audit of the currently implemented features, database schema, endpoints, and real-time events in the SwiftRoute project.

---

## 1. TECH STACK

**Frontend**
- **Framework**: React 19 (via Vite)
- **Routing**: React Router DOM (v7.18)
- **Styling**: Custom CSS (`index.css`, `components.css`)
- **Maps/Tracking**: `maplibre-gl`, `react-map-gl`
- **Animations**: `gsap`, `@gsap/react`, `lenis` (smooth scrolling)
- **Icons & Visuals**: `lucide-react`, `recharts`
- **PWA**: `vite-plugin-pwa` (Partially implemented)
- **State/Real-time**: `socket.io-client`, Context API

**Backend**
- **Framework**: Node.js / Express (v5.2.1)
- **Database & ORM**: PostgreSQL, Prisma (`@prisma/client` v5.22.0)
- **Real-time Layer**: Socket.IO (v4.8.3)
- **Security**: `helmet`, `cors`, `express-rate-limit`, `bcryptjs`, `jsonwebtoken`
- **Storage/Uploads**: `multer`, `cloudinary`, `streamifier`
- **Payments**: Razorpay (`razorpay` v2.9.8) - **✅ Fully wired**
- **Push Notifications**: Firebase Admin (`firebase-admin`) - **🟡 Partially wired (backend implemented, frontend missing some pieces)**

---

## 2. DATABASE SCHEMA

*From Prisma Schema*

| Model | Key Fields | Relationships | Notes |
|---|---|---|---|
| **Admin** | `id`, `name`, `email`, `role`, `isActive` | None | Fully used for admin dashboard access |
| **Agent** | `id`, `email`, `phone`, `currentLat/Lng`, `isAvailable`, `rating` | `assignedOrders` (Order), `locationPings`, `bankDetails` | Heavily used in Agent App & Admin tracking |
| **User** | `id`, `name`, `email`, `phone`, `role` | `orders` (Order) | Customer model |
| **Order** | `orderNumber`, `status`, `amount`, `paymentStatus`, `pickupLat/Lng`, `dropLat/Lng`, `fulfillmentType` | `customer` (User), `assignedAgent` (Agent), `locationPings`, `notifications`, `statusLogs`, `payments` | Core model of the system |
| **LocationPing** | `id`, `lat`, `lng`, `timestamp` | `agent` (Agent), `order` (Order) | Used for historical tracking paths |
| **Notification** | `onModel`, `message`, `type`, `isRead` | `order` (Order) | Used for Customer and Agent persistent alerts |
| **Payment** | `amount`, `method`, `status`, `gatewayResponse` | `order` (Order) | Razorpay transaction records |
| **StatusLog** | `status`, `notes`, `updatedBy` | `order` (Order) | Timeline events |
| **AuditLog** | `action`, `resource`, `metadata` | None | System audit trails |
| **NotificationPreference** | `orderUpdates`, `pushEnabled`, etc. | None | Linked by `userId` |
| **BankDetails** | `accountNumberEncrypted`, `ifscCode` | `agent` (Agent) | Used for agent payouts |

---

## 3. BACKEND API ENDPOINTS

| Feature Area | Endpoint | Method | Purpose | Status |
|---|---|---|---|---|
| **Auth** | `/api/v1/auth/login` | `POST` | Authenticate user/agent/admin | ✅ Fully Wired |
| **Auth** | `/api/v1/auth/register` | `POST` | Create new customer account | ✅ Fully Wired |
| **Orders** | `/api/v1/orders` | `GET`, `POST` | List and create orders | ✅ Fully Wired |
| **Orders** | `/api/v1/orders/:id/status` | `PATCH` | Update order status (Picked up, Delivered) | ✅ Fully Wired |
| **Orders** | `/api/v1/orders/:id/accept` | `POST` | Agent accepts order dispatch | ✅ Fully Wired |
| **Orders** | `/api/v1/orders/:id/assign-3pl` | `POST` | Assign order to Shiprocket/Delhivery | 🟡 Mocked Response |
| **Admin** | `/api/v1/admin/dashboard-stats` | `GET` | KPI metrics for Admin Dashboard | ✅ Fully Wired |
| **Admin** | `/api/v1/admin/smart-assign/:id` | `POST` | Auto-assign nearest available agent | ✅ Fully Wired |
| **Agent** | `/api/v1/agents/location` | `POST` | Fallback REST endpoint for GPS pings | ✅ Fully Wired |
| **Profile**| `/api/v1/profile/bank-details` | `GET`, `PUT` | Manage agent payout info | ✅ Fully Wired |
| **Payments**| `/api/v1/payments/create-order` | `POST` | Generate Razorpay order ID | ✅ Fully Wired |
| **Payments**| `/api/v1/payments/webhook` | `POST` | Razorpay server-to-server webhook | ✅ Fully Wired |
| **Notifs** | `/api/v1/notifications` | `GET` | Fetch persistent notification history | ✅ Fully Wired |

---

## 4. SOCKET.IO / REAL-TIME EVENTS

*Role-based rooms are used effectively (e.g., `admin`, `order:{id}`, `{userId}`).*

- **`agent:locationUpdate`** (Emitted by Agent)
  - **Triggers**: Agent device sends GPS coordinates every few seconds.
  - **Action**: Updates DB, broadcasts to `order:{id}` (for customer tracking) and `admin` room (for global map).
- **`agent:statusUpdate`** (Emitted by Agent)
  - **Triggers**: Agent toggles Online/Offline.
  - **Action**: Updates DB, notifies Admin map to change pin color/status.
- **`order:dispatchRequest`** (Emitted by Server)
  - **Triggers**: Auto-assign or manual assign.
  - **Action**: Pops up an "Accept/Reject" modal on the specific Agent's screen.

---

## 5. FRONTEND PAGES

**Customer Pages**
- `CustomerDashboard.jsx`: ✅ Fully wired (Recent orders, active tracking).
- `PlaceOrder.jsx`: ✅ Fully wired (Maps integration, address geocoding, pricing).
- `TrackOrder.jsx`: ✅ Fully wired (Live MapLibre GPS tracking, timeline).
- `MyOrders.jsx`: ✅ Fully wired (List of all past/current orders).
- `Notifications.jsx`: ✅ Fully wired (Persistent DB notifications).

**Agent Pages**
- `AgentDashboard.jsx`: ✅ Fully wired (Status toggle, active order map, earnings).
- `AgentDeliveries.jsx`: ✅ Fully wired (Delivery history).
- `AgentPerformance.jsx`: ✅ Fully wired (KPI charts, bank details).

**Admin Pages**
- `AdminDashboard.jsx`: ✅ Fully wired (Global stats, revenue charts).
- `AdminLiveTracking.jsx`: ✅ Fully wired (Global map showing all active agents & orders).
- `AdminAssign.jsx`: ✅ Fully wired (Manual and Smart Assignment interface).
- `AdminOrders.jsx` & `AdminUsers.jsx`: ✅ Fully wired (Data tables with status toggles).

---

## 6. SHARED/REUSABLE COMPONENTS

- `DashboardLayout.jsx`: The core wrapper providing responsive sidebars, bottom navs, and Topbar.
- `Login.jsx` & `Signup.jsx`: Auth forms using AuthContext.
- `RatingModal.jsx`: Reusable modal for customer reviews.
- `MapVisual.jsx`: Base map component (used in marketing pages).
- UI Components: Buttons, Inputs, Modals, Toasts (implemented natively without an external UI library).

---

## 7. AUTHENTICATION & AUTHORIZATION

- **Method**: JWT (JSON Web Tokens) passed in `Authorization: Bearer <token>`.
- **Enforcement**: 
  - **Backend**: Strict. `authenticate` middleware verifies JWT. `authorize('admin', 'agent')` middleware checks DB roles before allowing controller execution.
  - **Frontend**: Protected routes redirect unauthenticated users to `/login`.
  - **Socket.IO**: Handshake requires valid JWT to establish connection.

---

## 8. FEATURES STATUS SUMMARY TABLE

| Feature | Status | Notes |
|---|---|---|
| Order creation & lifecycle management | ✅ Fully Working | DB schema, APIs, and UI fully integrated. |
| Live GPS tracking (customer + admin view) | ✅ Fully Working | Real-time websockets & DB polling. |
| Agent dispatch/assignment (manual + auto) | ✅ Fully Working | Smart assign uses basic geofencing/distance logic. |
| Real-time status updates (Socket.IO) | ✅ Fully Working | |
| Payments (online + COD) | ✅ Fully Working | Razorpay integration complete. |
| Analytics dashboard | ✅ Fully Working | Recharts integration with real DB aggregations. |
| Agent performance tracking | ✅ Fully Working | |
| User/Agent profile management | ✅ Fully Working | |
| Bank/payout details | ✅ Fully Working | |
| Notification system (persistent & live) | ✅ Fully Working | Real-time popups + DB history implemented. |
| Responsive/mobile layout | ✅ Fully Working | Polished with bottom navs and collapsible menus. |
| PWA/installable app features | 🟡 Partial | Vite plugin configured, but missing manifest polish and offline support. |
| Route optimization / smart assignment | 🟡 Partial | Assignment works based on straight-line distance, no advanced traffic/routing algorithms yet. |
| Third-party logistics (3PL) integration | 🔧 UI Only | Endpoints exist but return mocked Shiprocket tracking IDs. |
| Rating/review system | ✅ Fully Working | |

---

## 9. KNOWN GAPS / INCOMPLETE ITEMS

1. **3PL Integration**: The `/api/v1/orders/:id/assign-3pl` route exists but currently uses dummy logic. Needs actual Shiprocket API credentials to work.
2. **Push Notifications (FCM)**: The backend has fully functioning FCM routes (`/api/v1/fcm/send`), but the frontend React app lacks the Service Worker (`firebase-messaging-sw.js`) and permission request logic to receive background push notifications.
3. **PWA Manifest**: `vite.svg` is throwing a fetch error in the console. Needs proper 192x192 and 512x512 icons in the `public` folder to be fully installable.
4. **Geolocation Error Handling**: If a user denies location permissions in `TrackOrder.jsx` or `PlaceOrder.jsx`, the fallback logic is rigid.

---

## 10. FILE STRUCTURE OVERVIEW

```text
d:\delhivery\
├── backend\
│   ├── prisma\             # DB schema & migrations
│   ├── src\
│   │   ├── config\         # DB, Env, Razorpay, Swagger configs
│   │   ├── controllers\    # Business logic
│   │   ├── middleware\     # Auth, Error handling, Rate limiting
│   │   ├── routes\         # API endpoints (auth, orders, admin, etc.)
│   │   ├── utils\          # Loggers, Geolocation math, Token helpers
│   │   ├── app.js / server.js
│   │   └── socket.js       # Real-time WebSockets
│   └── package.json
└── frontend\
    ├── public\             # Static assets
    ├── src\
    │   ├── components\     # Reusable UI & Shared components
    │   ├── context\        # React Context (AuthContext, etc.)
    │   ├── pages\          # Page-level components
    │   │   ├── admin\      # Admin dashboards
    │   │   ├── agent\      # Agent app pages
    │   │   └── customer\   # Customer tracking & ordering
    │   ├── services\       # API interceptors and client endpoints (api.js)
    │   ├── App.jsx         # App router and layout wrapper
    │   ├── index.css       # Core design system & CSS variables
    │   └── main.jsx        # Entry point
    └── package.json
```
