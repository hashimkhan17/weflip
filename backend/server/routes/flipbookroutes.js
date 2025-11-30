const express = require("express");
const router = express.Router();
const upload = require("../middleware/upload");

const { 
  registerFlipbook, 
  verifyFlipbookAccess,
  updateFlipbookAccess,
  getAllFlipbooks,
  getFlipbookPage,
  getFlipbookMetadata // ADD THIS IMPORT
} = require("../controllers/flipbookController");

// Public routes
router.post("/register", upload.single("pdf"), registerFlipbook);
router.get("/verify/:accessToken", verifyFlipbookAccess);
router.get("/:flipbookId/page/:pageNumber", getFlipbookPage);
router.get("/:flipbookId/metadata", getFlipbookMetadata); // ADD THIS ROUTE

// Admin routes
router.get("/admin/flipbooks", getAllFlipbooks);
router.patch("/admin/flipbook/:flipbookId", updateFlipbookAccess);

module.exports = router;