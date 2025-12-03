// server.js
// SilentAid SOS backend - Express + Firebase Firestore

const express = require("express");
const cors = require("cors");
const admin = require("firebase-admin");
require("dotenv").config();

// -------------- Express Setup --------------
const app = express();

// Allow frontend to talk to this backend
app.use(
  cors({
    origin: "*", // change to your frontend URL in production
  })
);

app.use(express.json());

// -------------- Firebase Admin Setup --------------
// Make sure serviceAccountKey.json is in the SAME folder as this file
// Firebase Console -> Project Settings -> Service Accounts -> Generate new private key

const serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

// Collection names
const CONTACTS_COLLECTION = "contacts";
const ALERTS_COLLECTION = "alerts";

// -------------- Routes --------------

// Simple health check
app.get("/", (req, res) => {
  res.send("✅ SilentAid SOS backend is running");
});

// ------------- CONTACTS -------------

/**
 * POST /api/contacts
 * Save an emergency contact
 *
 * Body:
 * {
 *   "userId": "user_123",
 *   "name": "Mom",
 *   "phone": "+91 9XXXXXXXXX",
 *   "isEmergency": true,
 *   "photo": null
 * }
 */
app.post("/api/contacts", async (req, res) => {
  try {
    const { userId, name, phone, isEmergency, photo } = req.body;

    if (!userId || !name || !phone) {
      return res
        .status(400)
        .json({ error: "userId, name, and phone are required" });
    }

    const contactData = {
      userId,
      name,
      phone,
      isEmergency: !!isEmergency,
      photo: photo || null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    const docRef = await db.collection(CONTACTS_COLLECTION).add(contactData);

    console.log("✅ Contact saved with id:", docRef.id);

    return res.status(201).json({
      message: "Contact saved successfully",
      contactId: docRef.id,
    });
  } catch (err) {
    console.error("❌ Error in /api/contacts:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

/**
 * GET /api/contacts?userId=...
 * Get contacts for a specific user
 */
app.get("/api/contacts", async (req, res) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: "userId query param is required" });
    }

    const snapshot = await db
      .collection(CONTACTS_COLLECTION)
      .where("userId", "==", userId)
      .orderBy("createdAt", "desc")
      .get();

    const contacts = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return res.json(contacts);
  } catch (err) {
    console.error("❌ Error in GET /api/contacts:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// ------------- SOS ALERTS -------------

/**
 * POST /api/sos
 * Save an SOS alert
 *
 * Body:
 * {
 *   "userId": "user_123",
 *   "userName": "Adhish",
 *   "phone": "+91 9XXXXXXXXX",
 *   "lat": 12.97,
 *   "lng": 77.59,
 *   "accuracy": 10,
 *   "emergencyType": "MEDICAL",
 *   "extraMessage": "Optional message"
 * }
 */
app.post("/api/sos", async (req, res) => {
  try {
    const {
      userId,
      userName,
      phone,
      lat,
      lng,
      accuracy,
      emergencyType,
      extraMessage,
    } = req.body;

    if (!userId) {
      return res.status(400).json({ error: "userId is required" });
    }

    const alertData = {
      userId,
      userName: userName || "",
      phone: phone || "",
      lat: typeof lat === "number" ? lat : null,
      lng: typeof lng === "number" ? lng : null,
      accuracy: typeof accuracy === "number" ? accuracy : null,
      emergencyType: emergencyType || "GENERAL",
      extraMessage: extraMessage || "",
      status: "NEW", // NEW, ACKNOWLEDGED, RESOLVED (you can update later)
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    const docRef = await db.collection(ALERTS_COLLECTION).add(alertData);

    console.log("🚨 SOS alert saved with id:", docRef.id);

    return res.status(201).json({
      message: "SOS alert stored successfully",
      alertId: docRef.id,
    });
  } catch (err) {
    console.error("❌ Error in /api/sos:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

/**
 * GET /api/alerts
 * List latest SOS alerts
 */
app.get("/api/alerts", async (req, res) => {
  try {
    const snapshot = await db
      .collection(ALERTS_COLLECTION)
      .orderBy("createdAt", "desc")
      .limit(50)
      .get();

    const alerts = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return res.json(alerts);
  } catch (err) {
    console.error("❌ Error in GET /api/alerts:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

/**
 * GET /api/alerts/:id
 * Get single alert by id
 */
app.get("/api/alerts/:id", async (req, res) => {
  try {
    const docRef = db.collection(ALERTS_COLLECTION).doc(req.params.id);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return res.status(404).json({ error: "Alert not found" });
    }

    return res.json({ id: docSnap.id, ...docSnap.data() });
  } catch (err) {
    console.error("❌ Error in GET /api/alerts/:id:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// -------------- Start Server --------------
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 SilentAid backend running at http://localhost:${PORT}`);
});
