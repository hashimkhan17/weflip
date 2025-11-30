const mongoose = require('mongoose');

const flipbookSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User", 
    required: true 
  },
  filename: { type: String, required: true },
  originalName: { type: String, required: true },
  path: { type: String, required: true },
  size: { type: Number, required: true },
  flipbookLink: { type: String, required: true },
  
  // NEW: Store the directory where page images are stored
  pagesDirectory: { type: String },
  totalPages: { type: Number, default: 0 },
  
  expiresAt: { type: Date, default: null },
  isActive: { type: Boolean, default: true },
  isPaid: { type: Boolean, default: false },
  paymentStatus: { 
    type: String, 
    enum: ['pending', 'paid', 'free', 'admin'],
    default: 'pending'
  },
  accessCount: { type: Number, default: 0 },
  lastAccessed: { type: Date },
  createdAt: { type: Date, default: Date.now }
});

// Add index for expiration cleanup
flipbookSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('Flipbook', flipbookSchema);