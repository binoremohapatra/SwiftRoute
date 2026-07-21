<div align="center">
  <img src="https://images.unsplash.com/photo-1628108427902-6e3e56bd6cf0?auto=format&fit=crop&w=1200&q=80" alt="SwiftRoute Banner" style="border-radius: 12px; margin-bottom: 20px; box-shadow: 0 4px 15px rgba(0,0,0,0.2);">

  # 🚀 SwiftRoute
  **The Next-Generation Real-Time Delivery Tracking & Fleet Management System**
  
  [![React](https://img.shields.io/badge/Frontend-React_19-61DAFB?style=for-the-badge&logo=react)](https://react.dev)
  [![Vite](https://img.shields.io/badge/Bundler-Vite-646CFF?style=for-the-badge&logo=vite)](https://vitejs.dev/)
  [![Node.js](https://img.shields.io/badge/Backend-Node.js-339933?style=for-the-badge&logo=nodedotjs)](https://nodejs.org/)
  [![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL-4169E1?style=for-the-badge&logo=postgresql)](https://postgresql.org)
  [![Prisma](https://img.shields.io/badge/ORM-Prisma-2D3748?style=for-the-badge&logo=prisma)](https://prisma.io)
  [![Socket.io](https://img.shields.io/badge/Realtime-Socket.io-010101?style=for-the-badge&logo=socketdotio)](https://socket.io/)
</div>

---

## 🌟 Overview

**SwiftRoute** is a comprehensive, end-to-end logistics platform designed for businesses to manage orders, track delivery agents in real-time, and provide an unparalleled customer experience. It acts as a unified hub for Customers, Delivery Agents, and Administrators.

Whether you're dispatching in-house agents or utilizing 3PL fallback integrations (like Shiprocket), SwiftRoute handles it automatically.

---

## ✨ Core Features & Capabilities

### 🧑‍💻 For Customers
- **Live GPS Tracking**: Watch orders move on the map in real-time (MapLibre GL).
- **Push & In-App Notifications**: Real-time Socket.IO alerts and a dedicated persistent notification bell.
- **Smart Address Geocoding**: Pick and drop addresses automatically resolve to precise lat/lng.
- **Secure Payments**: Cash on Delivery (COD) and Razorpay integration for online payments.
- **Order History & Ratings**: View past orders, download invoices, and rate delivery agents.

### 🚴 For Delivery Agents
- **Agent Dashboard**: A slick, mobile-optimized PWA to toggle Availability (Online/Offline/Break).
- **Real-Time Job Dispatch**: Instant "Accept/Reject" popup when an order is assigned.
- **Live Location Broadcasting**: Background GPS syncing directly to the Admin map and Customer view.
- **Earning & Performance Metrics**: Daily delivery stats, performance charts (Recharts), and bank details management.

### 👑 For Administrators
- **Global Fleet Radar**: Live "God-mode" map showing all active agents, their statuses, and live orders.
- **Smart Auto-Assignment**: Geofence-based algorithm to assign orders to the nearest available agent.
- **Shiprocket 3PL Integration**: Automatic fallback to Shiprocket for ad-hoc order creation and tracking if in-house agents are unavailable.
- **Actionable Analytics**: Granular business data, revenue charts, and CSV export for Agents/Orders.

---

## 🛠️ Tech Stack & Architecture

### **Frontend (Vite + React)**
- **UI & Animations**: Custom CSS System (No Tailwind), GSAP, `@gsap/react`, Lenis Smooth Scroll.
- **State & Real-time**: Context API, `socket.io-client`.
- **Maps**: `maplibre-gl`, `react-map-gl`.
- **Icons & Charts**: Lucide React, Recharts.
- **PWA Ready**: `vite-plugin-pwa` for offline capabilities and mobile installation.

### **Backend (Node.js + Express)**
- **Core**: Node.js, Express 5.
- **Database**: PostgreSQL with NeonDB, modeled using Prisma ORM.
- **Security**: Helmet, CORS, Rate Limiting, JWT Auth, Bcrypt.
- **Integrations**: Razorpay (Payments), Firebase Admin (Push Notifs), Cloudinary (Image Uploads).
- **Real-time Engine**: Socket.IO with role-based rooms (`admin`, `order:{id}`, `{userId}`).

---

## 📂 Project Structure

```bash
📦 SwiftRoute
 ┣ 📂 backend/
 ┃ ┣ 📂 prisma/           # Schema & DB Migrations
 ┃ ┣ 📂 src/
 ┃ ┃ ┣ 📂 config/         # App Configs (DB, Env, Swagger)
 ┃ ┃ ┣ 📂 controllers/    # API Request Handlers
 ┃ ┃ ┣ 📂 middleware/     # Auth, Rate Limits, Uploads
 ┃ ┃ ┣ 📂 routes/         # Express API Routes
 ┃ ┃ ┣ 📂 services/       # 3PL Services (Shiprocket), Auto-Assign Math
 ┃ ┃ ┗ 📜 socket.js       # Real-time WebSockets Logic
 ┃ ┗ 📜 server.js         # Entry Point
 ┃
 ┗ 📂 frontend/
   ┣ 📂 public/           # PWA Manifest, Service Workers, Icons
   ┣ 📂 src/
   ┃ ┣ 📂 components/     # Reusable UI & Layouts
   ┃ ┣ 📂 context/        # React Auth Context
   ┃ ┣ 📂 pages/          # Admin, Agent, and Customer Dashboards
   ┃ ┣ 📂 services/       # API Interceptors
   ┃ ┗ 📜 index.css       # Core Design System Variables
   ┗ 📜 vite.config.js
```

---

## 🔌 API & Endpoints Highlights

| Feature | Endpoint | Purpose | Method |
|---------|----------|---------|--------|
| **Smart Assign** | `/api/v1/admin/smart-assign/:id` | Auto-assign nearest agent | `POST` |
| **Accept Job** | `/api/v1/orders/:id/accept` | Agent accepts dispatch | `POST` |
| **Location Ping** | `agent:locationUpdate` | Socket event sending live GPS | `WSS` |
| **Payments** | `/api/v1/payments/webhook` | Razorpay server webhook | `POST` |
| **Shiprocket** | `/api/v1/orders/:id/assign-3pl` | Fallback to 3PL logistics | `POST` |

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- PostgreSQL Database (NeonDB recommended)
- Razorpay, Cloudinary, and Shiprocket API Keys.

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/binoremohapatra/SwiftRoute.git
   cd SwiftRoute
   ```

2. **Backend Setup**
   ```bash
   cd backend
   npm install
   # Create a .env file and add your DB, JWT, and API Keys
   npx prisma db push
   npm run dev
   ```

3. **Frontend Setup**
   ```bash
   cd ../frontend
   npm install
   # Create a .env file with VITE_API_URL=http://localhost:5000/api/v1
   npm run dev
   ```

4. **Open in Browser**
   Navigate to `http://localhost:5173`

---

## 🧪 How to Use & Test the Application

### 1. User Journey (Placing an Order)
- Create a **User** account and log in.
- Click on **New Delivery** from your dashboard.
- Pick your pickup and drop-off locations on the map.
- Confirm the order and pay via **Cash on Delivery** or **Online Payment (Razorpay)**.
- Once placed, your order goes to the pending queue.

### 2. Admin Journey (Dispatch & God-Mode)
- Create an **Admin** account.
- Go to the **Admin Dashboard** > **Radar**. You will see the entire city map with live orders and agents.
- Go to the **Orders** tab. You can manually assign an order to an agent or click **Smart Assign** to auto-assign it to the nearest available agent.

### 3. Agent Journey (Accepting & Delivering)
- Create a **Delivery Agent** account.
- Toggle your status to **Online** in the Agent Dashboard.
- When the Admin assigns you an order, a real-time popup will appear for you to **Accept** or **Reject** the job.
- After accepting, go to **Active Order**. Here you will see the pickup and drop-off route.

### 🚗 How Driver Location Movement Works (Mock vs Real)

**How it works right now (Testing/Mock Mode):**
Since you are testing the app on a desktop browser, your device's GPS does not physically move. To demonstrate the real-time tracking feature, the application currently uses a **Mock Location Simulator**. 
When an agent accepts an order, the frontend calculates the route from the pickup to the drop-off and mathematically generates waypoints. A timer fires every few seconds to emit a `socket.emit('agent:locationUpdate', ...)` event, simulating the driver moving along the route. This lets the Customer and Admin see the bike icon moving smoothly on the map for demonstration purposes.

**How it will work in a Real-World Scenario:**
In a true production environment where the Agent uses a mobile phone while driving:
1. We will use the device's native `navigator.geolocation.watchPosition()` API or a background geolocation plugin.
2. The agent's phone will continuously fetch their *actual* physical GPS coordinates.
3. Every time their latitude/longitude changes, the phone will emit the exact same `agent:locationUpdate` Socket.IO event with real data.
4. The mock calculation will be removed, and the bike icon on the Customer/Admin map will move based solely on the agent's real physical movement through the city streets.

---

## 📸 Screenshots

*(Replace these placeholders with actual screenshots from your app!)*




---

<div align="center">
  <b>Built with ❤️ for Seamless Logistics.</b>
</div>
