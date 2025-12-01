const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config();

const connectDB = require("./config/db");
const flipbookRoutes = require("./routes/flipbookroutes");
const imageSliderRoutes = require("./routes/imageSliderRoutes");
const adminRoutes = require("./routes/adminRoutes");
const adminAuthRoutes = require("./routes/adminAuthRoutes");

const app = express();

// Middleware
app.use(cors({ origin: "http://72.61.71.113" }));
 // allow frontend
app.use(express.json());

// Serve uploaded PDFs
app.use("/flipbook", express.static(path.join(__dirname, "uploads")));

// Basic route without database dependency
app.get("/", (req, res) => {
  res.send("Flipbook API Running");
});

// Connect to DB and start server
const startServer = async () => {
  try {
    console.log('Connecting to database...');
    await connectDB(); // Wait for database connection
    
    console.log('Database connected, setting up routes...');
    
    // Setup routes ONLY after database is connected
    app.use("/api/flipbook", flipbookRoutes);
    app.use("/api/imageslider", imageSliderRoutes);
    app.use("/api/admin/auth", adminAuthRoutes);
    app.use("/api/admin", adminRoutes);
    
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
    
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

// Prevent server crashes
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Promise Rejection:', err);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

// Start the server
startServer();