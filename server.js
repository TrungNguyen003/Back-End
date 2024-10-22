const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const session = require("express-session");
const fileUpload = require("express-fileupload");
const passport = require("passport");
const path = require("path");
const config = require("./config/database");
const cookieParser = require("cookie-parser");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const app = express();
const axios = require("axios");
const MongoStore = require("connect-mongo");

// Connect to MongoDB
mongoose.connect(config.database, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});
mongoose.connection.on(
  "error",
  console.error.bind(console, "connection error:")
);
mongoose.connection.once("open", () => {
  console.log("Connected to MongoDB");
});

mongoose.set("useFindAndModify", false);

// CORS configuration
// CORS configuration
const corsOptions = {
  origin: [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://localhost:8081",
    "http://localhost:8085",
    "http://26.122.98.186:8085",
  ],
  credentials: true,
};
app.use(cors(corsOptions));

// Session configuration using MongoDB
app.use(
  session({
    secret: "yourSecretKey",
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: config.database, // URL kết nối tới MongoDB
      collectionName: "sessions", // Tên collection lưu trữ session
      ttl: 14 * 24 * 60 * 60, // Thời gian sống của session: 14 ngày
    }),
    cookie: { secure: false }, // Đặt thành `true` nếu bạn đang sử dụng HTTPS
  })
);

// Middleware to enforce HTTPS in production
if (process.env.NODE_ENV === "production") {
  app.use((req, res, next) => {
    if (req.header("x-forwarded-proto") !== "https") {
      res.redirect(`https://${req.header("host")}${req.url}`);
    } else {
      next();
    }
  });
}

// Place this line before any other body parsing middleware
app.use("/webhook", bodyParser.raw({ type: "application/json" }));
// app.use(bodyParser.urlencoded({ extended: false }));
// app.use(bodyParser.json());
app.use(fileUpload());
require("./config/passport")(passport);
app.use(passport.initialize());
app.use(passport.session());
app.use(require("connect-flash")());
app.use(cookieParser());
// Increase the payload limit
app.use(bodyParser.json({ limit: "10mb" })); // Adjust the limit as needed
app.use(bodyParser.urlencoded({ limit: "10mb", extended: true })); // Adjust the limit as needed

// Set global variables
app.use((req, res, next) => {
  res.locals.messages = require("express-messages")(req, res);
  res.locals.cart = req.session.cart;
  res.locals.user = req.user || null;
  next();
});

// Serve static files
app.use(express.static(path.join(__dirname, "public")));

// Authentication middleware
const { isAuthenticated } = require("./middleware/auth");

// Route configuration
app.use("/some-route", isAuthenticated, (req, res) => {
  res.send("You are authenticated");
});
app.use(express.static("public"));
require("./swagger")(app);

const products = require("./routes/products");
// const pages = require("./routes/pages");
const adminPages = require("./routes/admin_pages");
const imagesRouter = require("./routes/images");
const users = require("./routes/users");
const adminProducts = require("./routes/admin_products");
const adminCategories = require("./routes/admin_categories");
const cartRoutes = require("./routes/cart");
const adminUsers = require("./routes/admin_users");
const orderRouter = require("./routes/orders");
const webhookRoutes = require("./routes/webhook");
const AdminOrders = require("./routes/admin_orders");
const AdminDashboard = require("./routes/admin_dashboard");
const ship = require("./routes/ship");
const bookingRoutes = require("./routes/bookingRoutes");
const managerOrders = require("./routes/manage_orders");
const ManagerDashboard = require("./routes/manager_dashboard");
const staffDashhboard = require("./routes/staff_dashboard");
const staffOrders = require("./routes/staff_orders");
app.get("/set-cookie", (req, res) => {
  res.cookie("example", "value", {
    httpOnly: true,
    secure: true,
    sameSite: "None",
  });
  res.send("Cookie set");
});

app.use("/orders", orderRouter);
app.use("/product_images", express.static("public/product_images"));
app.use("/", products);
// app.use("/", pages);
app.use("/admin/pages", adminPages);
app.use("/cart", cartRoutes);
app.use("/admin/categories", adminCategories);
app.use("/", imagesRouter);
app.use("/users", users);
app.use("/admin/products", adminProducts);
app.use("/admin/categories", adminCategories);
app.use("/admin/users", adminUsers);
app.use("/webhook", webhookRoutes);
app.use("/", AdminOrders);
app.use("/", AdminDashboard);
app.use("/ship", ship);
app.use("/spa", bookingRoutes);
app.use("/", managerOrders);
app.use("/", ManagerDashboard);
app.use("/", staffOrders)
app.use("/", staffDashhboard);
app.get("/", (req, res) => {
  res.send("Welcome to the homepage");
});
// Fetch provinces
app.get("/api/provinces", async (req, res) => {
  try {
    const response = await axios.get("https://vapi.vnappmob.com/api/province/");
    res.json(response.data.results); // Adjust if needed depending on the API's response structure
  } catch (error) {
    console.error("Error fetching provinces:", error);
    res.status(500).json({ message: "Failed to fetch provinces" });
  }
});

app.get("/api/provinces/:provinceId/districts", async (req, res) => {
  const { provinceId } = req.params;
  try {
    const response = await axios.get(
      `https://vapi.vnappmob.com/api/province/district/${provinceId}`
    );
    res.json(response.data.results); // Adjust if needed depending on the API's response structure
  } catch (error) {
    console.error("Error fetching districts:", error);
    res.status(500).json({ message: "Failed to fetch districts" });
  }
});

app.get("/api/districts/:districtId/wards", async (req, res) => {
  const { districtId } = req.params;
  try {
    const response = await axios.get(
      `https://vapi.vnappmob.com/api/province/ward/${districtId}`
    );
    res.json(response.data.results); // Adjust if needed depending on the API's response structure
  } catch (error) {
    console.error("Error fetching wards:", error);
    res.status(500).json({ message: "Failed to fetch wards" });
  }
});

// Start the server
app.listen(10000, () => {
  console.log("Server is running on port 8081");
});
