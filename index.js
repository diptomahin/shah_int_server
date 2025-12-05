import express from "express";
import cors from "cors";
import multer from "multer";
import { MongoClient, ObjectId } from "mongodb";
import nodemailer from "nodemailer";
import dotenv from "dotenv";
import path from "path";

dotenv.config();

const app = express();
app.use(cors({ origin: process.env.CLIENT_URL || "*" }));
app.use(express.json());

// =====================================================
// 🔹 1. Multer Setup for Image Uploads
// =====================================================
const storage = multer.diskStorage({
  destination: "uploads/",
  filename: (req, file, cb) => {
    cb(null, Date.now() + "_" + file.originalname);
  },
});
const upload = multer({ storage });

app.use("/uploads", express.static("uploads"));

// =====================================================
// 🔹 2. ENV + Mongo Configuration
// =====================================================
const PORT = process.env.PORT || 4000;
const client = new MongoClient(process.env.MONGO_URI);
let db;

async function connectDB() {
  try {
    await client.connect();
    db = client.db(process.env.DB_NAME);
    console.log("🔥 MongoDB Connected");
  } catch (err) {
    console.error("❌ Mongo Error:", err);
  }
}
connectDB();

// =====================================================
// 🔹 3. Nodemailer
// =====================================================
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS,
  },
});

// =====================================================
// 🔹 4. Contact Email Route
// =====================================================
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
    res.json({ success: false, error: err.message });
  }
});

// =====================================================
// 🔹 Helper Function to Create CRUD Routes
// =====================================================
function createCRUDRoutes(collectionName) {
  const router = express.Router();
  const collection = () => db.collection(collectionName);

  // CREATE
  router.post("/", upload.single("image"), async (req, res) => {
    try {
      const data = req.body;

      if (req.file) {
        data.imageUrl = "/uploads/" + req.file.filename;
      }
      const result = await collection().insertOne(data);
      res.json({ success: true, insertedId: result.insertedId });
    } catch (err) {
      res.json({ success: false, error: err.message });
    }
  });

  // READ ALL
  router.get("/", async (req, res) => {
    try {
      const items = await collection().find().toArray();
      res.json(items);
    } catch (err) {
      res.json({ success: false, error: err.message });
    }
  });

  // READ ONE
  router.get("/:id", async (req, res) => {
    try {
      const item = await collection().findOne({ _id: new ObjectId(req.params.id) });
      res.json(item);
    } catch (err) {
      res.json({ success: false, error: err.message });
    }
  });

  // UPDATE
  router.put("/:id", upload.single("image"), async (req, res) => {
    try {
      const data = req.body;

      if (req.file) {
        data.imageUrl = "/uploads/" + req.file.filename;
      }

      const result = await collection().updateOne(
        { _id: new ObjectId(req.params.id) },
        { $set: data }
      );

      res.json({ success: true, modifiedCount: result.modifiedCount });
    } catch (err) {
      res.json({ success: false, error: err.message });
    }
  });

  // DELETE
  router.delete("/:id", async (req, res) => {
    try {
      const result = await collection().deleteOne({ _id: new ObjectId(req.params.id) });
      res.json({ success: true, deletedCount: result.deletedCount });
    } catch (err) {
      res.json({ success: false, error: err.message });
    }
  });

  return router;
}

// =====================================================
// 🔹 5. Register CRUD Routes for All Collections
// =====================================================
app.use("/api/subsidiaries", createCRUDRoutes("subsidiaries"));
app.use("/api/proprietor", createCRUDRoutes("proprietor"));
app.use("/api/certifications", createCRUDRoutes("certifications"));
app.use("/api/clients", createCRUDRoutes("clients"));
app.use("/api/gallery", createCRUDRoutes("gallery"));

// =====================================================
// 🔹 6. Default Route
// =====================================================
app.get("/", (req, res) => {
  res.send("<h2>Express API Running — All CRUD + File Upload + Mail Active</h2>");
});

// =====================================================
// 🔹 7. Start Server
// =====================================================
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
