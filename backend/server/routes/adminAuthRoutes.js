const express = require("express");
const router = express.Router();
const { registerAdmin, loginAdmin, checkAdminExists } = require("../controllers/adminAuthController");

// These routes are PUBLIC - no protection
router.get("/check", checkAdminExists);
router.post("/register", registerAdmin);
router.post("/login", loginAdmin);

module.exports = router;