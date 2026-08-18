const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5175;

const MONGO_URI =
  process.env.MONGO_URI ||
  "mongodb+srv://sandeenakrub_db_user:DtrtkZ6zxaIz7t8P@cluster0.nsacwyj.mongodb.net/";

mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log("Connected to MongoDB");
  })
  .catch((error) => {
    console.error("MongoDB connection error:", error);
  });

app.get("/", (req, res) => {
  res.json({
    message: "Backend is running",
  });
});

app.get("/api/hello", (req, res) => {
  res.json({
    message: "Hello from Express!",
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});