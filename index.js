// server.js
const express = require("express");
const cors = require("cors");
const app = express();
const PORT = 5000;

// CORS + JSON parsing
app.use(cors());
app.use(express.json());

let alerts = []; // memory me store karenge, hackathon ke liye enough

app.get("/", (req, res) => {
  res.send(`
    <h2>SilentAid Backend Running ✅</h2>
    <p>Use <a href="/dashboard">/dashboard</a> to view received SOS alerts.</p>
  `);
});

// === SOS NOTIFICATION API ===
app.post("/api/emergency", (req, res) => {
  const alert = {
    id: Date.now(),
    receivedAt: new Date().toLocaleString(),
    source: req.body.source || "unknown",
    userId: req.body.userId || "demo-user",
    contacts: req.body.contacts || [],
    location: req.body.location || null,
    message: req.body.message || "SilentAid SOS Emergency Alert",
  };

  alerts.unshift(alert); // latest upar
  console.log("🔥 New SOS alert received:", alert);

  res.json({
    ok: true,
    id: alert.id,
    msg: "SOS alert received on backend",
  });
});

// === SIMPLE DASHBOARD FOR JUDGES ===
app.get("/dashboard", (req, res) => {
  const listItems = alerts
    .map(
      (a) => `
      <div style="
        border:1px solid #e5e7eb;
        border-radius:10px;
        padding:10px 14px;
        margin-bottom:10px;
        background:#020617;
        color:#e5e7eb;
        font-family:system-ui, sans-serif;
      ">
        <div style="font-size:13px; color:#9ca3af;">
          <strong>ID:</strong> ${a.id} • <strong>Time:</strong> ${a.receivedAt}
        </div>
        <div style="margin-top:4px; font-size:14px;">
          <strong>Message:</strong> ${a.message}
        </div>
        <div style="margin-top:4px; font-size:13px;">
          <strong>User:</strong> ${a.userId} • <strong>Source:</strong> ${a.source}
        </div>
        <div style="margin-top:4px; font-size:13px;">
          <strong>Contacts:</strong><br/>
          ${a.contacts.map((c) => `- ${c}`).join("<br/>") || "No contacts sent"}
        </div>
        <div style="margin-top:4px; font-size:13px;">
          <strong>Location:</strong><br/>
          ${
            a.location && (a.location.lat || a.location.address)
              ? `Lat: ${a.location.lat || "-"}, Lon: ${a.location.lon || "-"}<br/>
                 ${a.location.address || ""}`
              : "Not provided"
          }
        </div>
      </div>
    `
    )
    .join("");

  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>SilentAid – SOS Dashboard</title>
      <meta charset="UTF-8" />
    </head>
    <body style="background:#0f172a; margin:0; padding:20px; font-family:system-ui, sans-serif; color:#e5e7eb;">
      <h1 style="margin-top:0;">SilentAid SOS Dashboard</h1>
      <p style="color:#9ca3af; font-size:14px;">
        Jab bhi app se SOS trigger hota hai, yahan ek naya card appear hoga.
      </p>
      <button onclick="location.reload()" style="
        padding:6px 12px;
        border-radius:999px;
        border:none;
        background:#22c55e;
        color:#022c22;
        font-weight:600;
        cursor:pointer;
        margin-bottom:10px;
      ">
        🔄 Refresh
      </button>
      <div>
        ${alerts.length === 0 ? "<p>No alerts yet.</p>" : listItems}
      </div>
    </body>
    </html>
  `);
});

app.listen(PORT, () => {
  console.log(`✅ SilentAid backend running on http://localhost:${PORT}`);
  console.log(`🔍 Dashboard: http://localhost:${PORT}/dashboard`);
});
