const express = require("express");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const swaggerJsDoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");

// Route files
const coworkingspaces = require("./routes/coworkingspaces");
const reservations = require("./routes/reservations");
const auth = require("./routes/auth");
const rooms = require("./routes/rooms");
const timeslots = require("./routes/timeslots");

const app = express();

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
            ? "https://6-noob7-hack-backend.vercel.app/api/v1" // 🔥 CHANGE THIS
            : `http://localhost:${process.env.PORT || 5000}/api/v1`,
      },
    ],
  },
  apis: ["./docs/*.js"],
};

const swaggerDocs = swaggerJsDoc(swaggerOptions);

// =====================================================
// CORS CONFIG (FIXED)
// =====================================================
const allowedOrigins = [
  "http://localhost:3000",
  "https://your-frontend.vercel.app", // 🔥 CHANGE THIS
];

app.use(
  cors({
    origin: function (origin, callback) {
      // allow requests with no origin (mobile apps, curl, postman)
      if (!origin) return callback(null, true);

      // allow Vercel preview URLs
      if (origin.includes(".vercel.app")) {
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      } else {
        return callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// 🔥 VERY IMPORTANT (preflight)
app.options("*", cors());

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

module.exports = app;