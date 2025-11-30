const ImageSlider = require("../models/imageSlider");
const fs = require("fs");
const path = require("path");

exports.uploadImage = async (req, res) => {
  try {
    console.log("Uploading image:", req.file);

    if (!req.file) {
      return res.status(400).json({ message: "Image file is required" });
    }

    const baseUrl = process.env.BASE_URL || 'http://localhost:5000';
    const imageUrl = `${baseUrl}/api/imageslider/uploads/${req.file.filename}`;

    const image = await ImageSlider.create({
      filename: req.file.filename,
      originalName: req.file.originalname,
      path: req.file.path,
      size: req.file.size,
      imageUrl: imageUrl
    });

    console.log("Image uploaded successfully:", image._id);

    res.status(201).json({
      message: "Image uploaded successfully",
      image: {
        id: image._id,
        imageUrl: image.imageUrl,
        originalName: image.originalName,
        createdAt: image.createdAt
      }
    });

  } catch (err) {
    console.error("Image upload error:", err);
    
    if (req.file && req.file.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
      console.log("Deleted uploaded file due to error");
    }
    
    res.status(500).json({ 
      message: "Server error",
      error: err.message 
    });
  }
};

exports.getImages = async (req, res) => {
  try {
    const images = await ImageSlider.find({ isActive: true })
      .sort({ order: 1, createdAt: -1 });

    res.status(200).json({
      images: images.map(img => ({
        id: img._id,
        imageUrl: img.imageUrl,
        originalName: img.originalName,
        order: img.order,
        isActive: img.isActive,
        createdAt: img.createdAt
      }))
    });
  } catch (err) {
    console.error("Get images error:", err);
    res.status(500).json({ 
      message: "Server error",
      error: err.message 
    });
  }
};

exports.deleteImage = async (req, res) => {
  try {
    const { id } = req.params;

    const image = await ImageSlider.findById(id);
    if (!image) {
      return res.status(404).json({ message: "Image not found" });
    }

    // Delete file from filesystem
    if (fs.existsSync(image.path)) {
      fs.unlinkSync(image.path);
    }

    // Delete from database
    await ImageSlider.findByIdAndDelete(id);

    res.status(200).json({ message: "Image deleted successfully" });
  } catch (err) {
    console.error("Delete image error:", err);
    res.status(500).json({ 
      message: "Server error",
      error: err.message 
    });
  }
};