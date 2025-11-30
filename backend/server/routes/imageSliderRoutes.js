const express = require("express");
const router = express.Router();
const path = require("path");
const fs = require("fs");
const upload = require("../middleware/uploadImage");

const { uploadImage, getImages, deleteImage } = require("../controllers/imageSlidercontroller.js");

const uploadPath = path.join(__dirname, "../uploads/images");

if (!fs.existsSync(uploadPath)) {
  fs.mkdirSync(uploadPath, { recursive: true });
  console.log("Created images upload folder:", uploadPath);
}

// Routes
router.post("/upload", upload.single("image"), uploadImage);
router.get("/", getImages);
router.delete("/:id", deleteImage);

// Serve uploaded images
router.get("/uploads/:filename", (req, res) => {
  const filePath = path.join(uploadPath, req.params.filename);
  
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    console.error("Image not found:", filePath);
    res.status(404).json({ message: "Image file not found" });
  }
});

module.exports = router;