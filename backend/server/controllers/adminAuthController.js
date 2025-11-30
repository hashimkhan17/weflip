const Admin = require('../models/admin');
const jwt = require('jsonwebtoken');

const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN
  });
};

// Register the first and only admin
exports.registerAdmin = async (req, res) => {
  try {
    console.log('🔐 Admin registration attempt:', req.body);
    
    const { email, password } = req.body;

    // Basic validation
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    // Check if admin already exists
    const existingAdmin = await Admin.findOne({});
    if (existingAdmin) {
      console.log('❌ Admin already exists');
      return res.status(400).json({ message: 'Admin already registered' });
    }

    // Create admin
    const admin = await Admin.create({
      email,
      password,
      isRegistered: true
    });

    console.log('✅ Admin registered successfully:', admin.email);

    // Remove password from output
    admin.password = undefined;

    res.status(201).json({
      message: 'Admin registered successfully',
      admin: {
        id: admin._id,
        email: admin.email,
        createdAt: admin.createdAt
      }
    });

  } catch (error) {
    console.error('❌ Admin registration error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Login admin
exports.loginAdmin = async (req, res) => {
  try {
    console.log('🔐 Admin login attempt:', req.body.email);
    
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Please provide email and password' });
    }

    // Check if admin exists and password is correct
    const admin = await Admin.findOne({ email }).select('+password');
    
    if (!admin) {
      console.log('❌ Admin not found:', email);
      return res.status(401).json({ message: 'Incorrect email or password' });
    }

    const isPasswordCorrect = await admin.correctPassword(password);
    if (!isPasswordCorrect) {
      console.log('❌ Incorrect password for:', email);
      return res.status(401).json({ message: 'Incorrect email or password' });
    }

    // Create token
    const token = signToken(admin._id);

    console.log('✅ Admin login successful:', email);

    // Remove password from output
    admin.password = undefined;

    res.status(200).json({
      message: 'Login successful',
      token,
      admin: {
        id: admin._id,
        email: admin.email
      }
    });
  } catch (error) {
    console.error('❌ Admin login error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Check if admin is registered
exports.checkAdminExists = async (req, res) => {
  try {
    console.log('🔍 Checking if admin exists...');
    const admin = await Admin.findOne({ isRegistered: true });
    const exists = !!admin;
    console.log('📊 Admin exists:', exists);
    res.json({ adminExists: exists });
  } catch (error) {
    console.error('❌ Check admin error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Protect routes middleware
exports.protect = async (req, res, next) => {
  try {
    console.log('🛡️ Checking admin authentication...');
    
    // 1) Get token from header
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
      console.log('📨 Token found in header');
    } else {
      console.log('❌ No token found in header');
    }

    if (!token) {
      return res.status(401).json({ message: 'You are not logged in. Please log in to get access.' });
    }

    // 2) Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('✅ Token verified');

    // 3) Check if admin still exists
    const currentAdmin = await Admin.findById(decoded.id);
    if (!currentAdmin) {
      console.log('❌ Admin not found for token');
      return res.status(401).json({ message: 'Admin no longer exists.' });
    }

    console.log('✅ Admin authenticated:', currentAdmin.email);
    
    // Grant access to protected route
    req.admin = currentAdmin;
    next();
  } catch (error) {
    console.error('❌ Admin protection error:', error.message);
    res.status(401).json({ message: 'Invalid token. Please log in again.' });
  }
};