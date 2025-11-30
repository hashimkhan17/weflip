const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const adminSchema = new mongoose.Schema({
  email: { 
    type: String, 
    required: true, 
    unique: true,
    lowercase: true
  },
  password: { 
    type: String, 
    required: true 
  },
  isRegistered: { 
    type: Boolean, 
    default: false 
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  }
});

// Hash password before saving
adminSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Compare password method
adminSchema.methods.correctPassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Only allow one admin
adminSchema.statics.createAdmin = async function(email, password) {
  const adminCount = await this.countDocuments();
  if (adminCount > 0) {
    throw new Error('Admin already exists');
  }
  
  return await this.create({
    email,
    password,
    isRegistered: true
  });
};

module.exports = mongoose.model('Admin', adminSchema);