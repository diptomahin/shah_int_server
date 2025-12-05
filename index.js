import express from "express";
import cors from "cors";
import { MongoClient } from "mongodb";
import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

// middleware
const app = express();
app.use(cors({
  origin: process.env.CLIENT_URL || "*",
}));
app.use(express.json());

// ====================================
// 1. ENV Variables
// ====================================
const PORT = process.env.PORT || 4000;
const MONGO_URI = process.env.MONGO_URI;
const DB_NAME = process.env.DB_NAME;

// ====================================
// 2. MongoDB Atlas Connection (For other purposes)
// ====================================
const client = new MongoClient(MONGO_URI);
let db;

async function connectDB() {
  try {
    await client.connect();
    db = client.db(DB_NAME);
    console.log("Connected to MongoDB Atlas");
  } catch (error) {
    console.error("MongoDB Connection Error:", error);
  }
}
connectDB();

// ====================================
// 3. Nodemailer Setup
// ====================================
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS,
  },
});

// ====================================
// 4. API — ONLY Send Email
// ====================================
app.post("/api/contact", async (req, res) => {
  try {
    const { name, email, message } = req.body;

    await transporter.sendMail({
      from: process.env.GMAIL_USER,
      to: email,
      subject: "Thank you for contacting us!",
      text: `Hi ${name},\n\nWe received your message:\n"${message}"\n\nRegards,\nTeam`,
    });

    res.json({ success: true, message: "Email Sent Successfully" });
  } catch (err) {
    console.error(err);
    res.json({ success: false, error: err.message });
  }
});

// ====================================
// 5. Default Route
// ====================================
app.get("/", (req, res) => {
  res.send("<h1>Express + MongoDB Atlas + Nodemailer + ENV</h1>");
});

// ====================================
// 6. Start Server
// ====================================
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
