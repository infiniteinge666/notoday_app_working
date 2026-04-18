const express = require("express");
const path = require("path");

const httpCheckHandler = require("./http/handlers/httpCheckHandler");
const httpIntelHandler = require("./http/handlers/httpIntelHandler");
const loadIntelOrDie = require("./intel/loadIntel");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));

app.use(express.static(path.join(__dirname, "public")));

app.post("/check", httpCheckHandler);
app.get("/intel", httpIntelHandler);

app.use((req, res) => {
  return res.status(404).json({
    success: false,
    message: "Endpoint not found",
    data: {
      band: "SUSPICIOUS",
      score: 20,
      reasons: ["This route does not exist."],
      whatNotToDo: ["Do not trust unknown endpoints."]
    }
  });
});

app.listen(PORT, () => {
  try {
    const intel = loadIntelOrDie();
    console.log(
      `[notoday] intel version=${intel.version || "unknown"} degraded=${Boolean(intel.degraded)}`
    );
  } catch (err) {
    console.error("[notoday] intel load failed:", err && err.message ? err.message : err);
  }

  console.log(`[notoday] listening on :${PORT}`);
});