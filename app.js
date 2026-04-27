const express = require("express");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const helmet = require("helmet"); // ✅ ADD
const swaggerJsDoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");

// Route files
const coworkingspaces = require("./routes/coworkingspaces");
const reservations = require("./routes/reservations");
const auth = require("./routes/auth");
const rooms = require("./routes/rooms");
const timeslots = require("./routes/timeslots");
const payments = require("./routes/payments");

const app = express();

// =====================================================
// 🔐 SECURITY HEADERS (FIXES MOST ZAP ALERTS)
// =====================================================
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:"],
        connectSrc: ["'self'"],
        frameAncestors: ["'none'"],
      },
    },
  })
);

// Remove tech leak
app.disable("x-powered-by");

// Prevent caching of sensitive responses
app.use((req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  next();
});

// =====================================================
// Swagger config
// =====================================================
const swaggerOptions = {
  swaggerDefinition: {
    openapi: "3.0.0",
    info: {
      title: "Coworking Booking API",
      version: "2.0.0",
      description: "Room + TimeSlot Reservation System",
    },
    servers: [
      {
        url:
          process.env.NODE_ENV === "production"
            ? "https://6-noob7-hack-backend.vercel.app/api/v1"
            : `http://localhost:${process.env.PORT || 5000}/api/v1`,
      },
    ],
  },
  apis: ["./docs/*.js"],
};

const swaggerDocs = swaggerJsDoc(swaggerOptions);

// =====================================================
// 🌐 CORS CONFIG (already good, keep it)
// =====================================================
const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:5000",
  "https://6-noob7-hack-frontend.vercel.app",
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })
);

// =====================================================
// Middleware
// =====================================================
app.set("query parser", "extended");
app.use(express.json());
app.use(cookieParser());

// =====================================================
// Swagger UI
// =====================================================
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocs));

// =====================================================
// Routes
// =====================================================
app.use("/api/v1/auth", auth);
app.use("/api/v1/coworkingspaces", coworkingspaces);
app.use("/api/v1/rooms", rooms);
app.use("/api/v1/timeslots", timeslots);
app.use("/api/v1/reservations", reservations);
app.use("/api/v1/payments", payments);

// =====================================================
// ❗ GLOBAL ERROR HANDLER (FIXES ERROR DISCLOSURE)
// =====================================================
app.use((err, req, res, next) => {
  console.error(err.stack);

  res.status(err.status || 500).json({
    success: false,
    message: "Internal Server Error",
  });
});

// =====================================================
// Export
// =====================================================
module.exports = app;