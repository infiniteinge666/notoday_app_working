const express = require("express");
const path = require("path");

// ========================================
// 🔒 FIXED IMPORTS (NO DESTRUCTURING)
// ========================================
const httpCheckHandler = require("./http/handlers/httpCheckHandler");
const httpIntelHandler = require("./http/handlers/httpIntelHandler");

const app = express();

// ========================================
// 🔒 TRANSPORT FIX (UNCHANGED)
// ========================================
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));

// ========================================
// STATIC
// ========================================
app.use(express.static(path.join(__dirname, "public")));

// ========================================
// ROUTES
// ========================================
app.post("/check", httpCheckHandler);
app.get("/intel", httpIntelHandler);

// ========================================
// FAIL CLOSED
// ========================================
app.use((req, res) => {
  return res.status(404).json({
    success: false,
    message: "Endpoint not found",
    data: {
      band: "SUSPICIOUS",
      score: 50,
      reasons: ["Unknown endpoint"],
    },
  });
});

// ========================================
// START
// ========================================
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`[notoday] listening on :${PORT}`);
});
