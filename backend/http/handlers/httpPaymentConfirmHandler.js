"use strict";

const { issueToken } = require("../../core/tokenIssuer");

/**
 * STRICT CONFIRMATION ENDPOINT
 * (Temporary controlled mode)
 *
 * Later: Replace with PayGate signature verification
 */

module.exports = async function httpPaymentConfirmHandler(req, res) {
  try {

    const { paymentId } = req.body;

    // =========================
    // HARD VALIDATION
    // =========================
    if (!paymentId || typeof paymentId !== "string") {
      return res.status(400).json({
        success: false,
        message: "Invalid payment reference"
      });
    }

    // =========================
    // CONTROLLED ISSUE
    // =========================
    // TEMP RULE: paymentId must match pattern
    if (!paymentId.startsWith("PAY-")) {
      return res.status(403).json({
        success: false,
        message: "Unverified payment"
      });
    }

    const token = issueToken({
      paymentId
    });

    return res.json({
      success: true,
      token
    });

  } catch (err) {
    console.error("Payment confirm error:", err);

    return res.status(500).json({
      success: false,
      message: "Payment processing failed"
    });
  }
};