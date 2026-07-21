const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const swaggerUi = require('swagger-ui-express');
const rateLimit = require('express-rate-limit');

const env = require('./src/config/env');
const { connectDB } = require('./src/config/db');
const logger = require('./src/utils/logger');
const errorHandler = require('./src/middleware/errorHandler');
const routes = require('./src/routes');
const socketHandler = require('./src/socket');
const swaggerSpec = require('./src/config/swagger');
require('./src/config/firebase'); // Initialize Firebase Admin

const app = express();
const server = http.createServer(app);

// ── Allowed Origins Config (FIX FOR CORS) ───────────────────────────────────
const allowedOrigins = [
  'https://swiftroute-cbdwl5pnz-binore-mohapatras-projects.vercel.app', // Tera Live Frontend URL
  process.env.CLIENT_URL,
  process.env.FRONTEND_URL,
  'http://localhost:5173',
  'http://localhost:3000'
].filter(Boolean); // Clean up undefined values

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, curl, postman) or if origin is allowed
    if (!origin || allowedOrigins.includes(origin) || origin.endsWith('.vercel.app')) {
      callback(null, true);
    } else {
      callback(null, true); // Production mein safe connectivity ke liye
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

// ── Socket.io ──────────────────────────────────────────────────────────────
const io = new Server(server, {
  cors: {
    origin: '*', // Allow all origins for WebSocket handshake to prevent CORS block
    methods: ['GET', 'POST'],
    credentials: true,
  },
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000,
});
app.set('io', io);
socketHandler(io);

// ── Security Middlewares ───────────────────────────────────────────────────
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: false, // Prevents blocking external assets/swagger on production
}));

app.use(cors(corsOptions));

// Global rate limiter — 200 req per 15 min per IP
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later.' },
});
app.use(globalLimiter);

// ── Body Parsers ───────────────────────────────────────────────────────────
app.use(express.json({ limit: '16kb' }));
app.use(express.urlencoded({ extended: true, limit: '16kb' }));
app.use(cookieParser());
app.use(compression());

// ── Health Check ───────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── Swagger Docs ───────────────────────────────────────────────────────────
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  explorer: true,
  customSiteTitle: 'SwiftRoute API Docs',
}));

// ── API Routes ─────────────────────────────────────────────────────────────
app.use('/api/v1', routes);

// ── Error Handler ──────────────────────────────────────────────────────────
app.use(errorHandler);

// ── Start Server ───────────────────────────────────────────────────────────
const startServer = async () => {
  try {
    await connectDB();
    server.listen(env.PORT, () => {
      logger.info(`Server is running on port ${env.PORT}`);
      logger.info(`Swagger docs: http://localhost:${env.PORT}/api/docs`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();