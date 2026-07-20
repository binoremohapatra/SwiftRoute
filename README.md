<div align="center">
  <img src="https://img.icons8.com/color/120/delivery.png" alt="SwiftRoute Logo" />
  <h1>🚀 SwiftRoute - Next Gen Logistics & Tracking</h1>
  <p>A high-performance, real-time delivery tracking and logistics management platform.</p>
</div>

<div align="center">
  <img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" />
  <img src="https://img.shields.io/badge/Vite-B73BFE?style=for-the-badge&logo=vite&logoColor=FFD62E" />
  <img src="https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" />
  <img src="https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white" />
  <img src="https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white" />
  <img src="https://img.shields.io/badge/Prisma-3982CE?style=for-the-badge&logo=Prisma&logoColor=white" />
  <img src="https://img.shields.io/badge/Socket.io-010101?style=for-the-badge&logo=socketdotio&logoColor=white" />
  <img src="https://img.shields.io/badge/Razorpay-02042B?style=for-the-badge&logo=razorpay&logoColor=3395FF" />
</div>

<br/>

## ✨ Key Features

- **📍 Real-Time Agent Tracking**: WebSockets stream high-precision GPS coordinates directly to live maps.
- **🗺️ Open-Source Mapping**: Fully powered by **MapLibre GL JS** and OpenStreetMap for rich map rendering without vendor lock-in.
- **💳 Integrated Payments**: Seamless **Razorpay** integration for COD (Cash on Delivery) to Online conversion and real-time payment status tracking.
- **🚗 Route Optimization**: Dynamic route lines and ETA calculations powered by the OpenRouteService API.
- **👩‍💻 Role-Based Dashboards**: 
  - **Customer Panel**: Track orders, manage addresses, and make payments.
  - **Agent Dashboard**: Accept/reject deliveries, optimize routes, update status, and collect cash.
- **🛡️ Secure Infrastructure**: Rate-limiting, Helmet security headers, Zod payload validation, and JWT-based authentication.

---

## 🛠️ Tech Stack & Architecture

### Frontend
- **React 18** with **Vite** for blazing fast HMR and builds.
- **Lucide-React** for crisp, scalable UI icons.
- **React-Map-GL** & **MapLibre** for interactive, animated map components.
- **Socket.io-client** for real-time order updates and agent location streaming.

### Backend
- **Node.js & Express.js** for a robust API architecture.
- **Prisma ORM** for type-safe database access and migrations.
- **PostgreSQL** (hosted on Neon) for high-performance relational data.
- **Razorpay API** for payment gateway integration.
- **Socket.io** for bidirectional, event-based communication.

---

## 🚀 How it Works

1. **Order Placement**: Customers place an order. An order ID is generated and a delivery agent is assigned.
2. **Real-Time Dispatch**: The agent receives a push notification and the order appears on their dashboard.
3. **Tracking & ETA**: As the agent moves, their device streams GPS coordinates to the backend via WebSockets, which broadcasts it to the customer's tracking screen.
4. **Delivery & Payments**: The customer can track the agent's route live on a map. If it's a COD order, the customer can pay online via Razorpay, or the agent can mark the cash as collected.
5. **Completion**: Order status is marked as 'Delivered' and the customer can rate the delivery experience.

---

## 💻 Setup & Installation

### Prerequisites
- Node.js (v18+)
- PostgreSQL Database
- Razorpay Account (Test Keys)
- OpenRouteService API Key

### 1. Clone the Repository
\`\`\`bash
git clone https://github.com/binoremohapatra/SwiftRoute.git
cd SwiftRoute
\`\`\`

### 2. Backend Setup
\`\`\`bash
cd backend
npm install
\`\`\`
Create a \`.env\` file in the \`backend\` directory:
\`\`\`env
PORT=5000
DATABASE_URL="your_postgres_url"
JWT_SECRET="your_jwt_secret"
RAZORPAY_KEY_ID="your_razorpay_key"
RAZORPAY_KEY_SECRET="your_razorpay_secret"
\`\`\`
Run Database Migrations and Start Server:
\`\`\`bash
npx prisma db push
npm run dev
\`\`\`

### 3. Frontend Setup
\`\`\`bash
cd ../frontend
npm install
\`\`\`
Create a \`.env\` file in the \`frontend\` directory:
\`\`\`env
VITE_ORS_API_KEY="your_openrouteservice_api_key"
VITE_RAZORPAY_KEY_ID="your_razorpay_key"
\`\`\`
Start the Frontend Client:
\`\`\`bash
npm run dev
\`\`\`

---

<p align="center">
  <i>Built for scale. Designed for speed. Delivered with precision.</i>
</p>
