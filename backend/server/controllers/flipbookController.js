const User = require("../models/User");
const Flipbook = require("../models/flipbookModel");
const bcrypt = require("bcryptjs");
const fs = require("fs");
const path = require("path");
const { PDFDocument } = require('pdf-lib');

const nodemailer = require('nodemailer');



// ==================== CACHE CONFIGURATION ====================
// Simple in-memory cache for frequently accessed pages
const pageCache = new Map();
const CACHE_MAX_SIZE = 50; // Reduced from 100 to save memory
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes TTL

// Clean cache periodically to prevent memory leaks
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of pageCache.entries()) {
    if (now - value.timestamp > CACHE_TTL) {
      pageCache.delete(key);
    }
  }
  
  // If cache is still too large, remove oldest entries
  if (pageCache.size > CACHE_MAX_SIZE) {
    const entries = Array.from(pageCache.entries());
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
    
    for (let i = 0; i < Math.floor(CACHE_MAX_SIZE * 0.3); i++) {
      pageCache.delete(entries[i][0]);
    }
  }
}, 5 * 60 * 1000); // Run every 5 minutes






// ==================== EMAIL SERVICE ==================== using gmail
const sendFlipbookEmail = async (userEmail, userName, flipbookLink, expiresAt, isTrial = true) => {
  try {
    // Use Gmail with environment variables
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER, // Your Gmail
        pass: process.env.GMAIL_APP_PASSWORD, // Gmail App Password
      },
    });

    const emailContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; padding: 12px 24px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 10px 0; }
          .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 Your Flipbook is Ready!</h1>
          </div>
          <div class="content">
            <p>Hello <strong>${userName}</strong>,</p>
            <p>Your PDF has been successfully converted into an interactive flipbook!</p>
            
            <div style="text-align: center; margin: 20px 0;">
              <a href="${flipbookLink}" class="button">View Your Flipbook</a>
            </div>
            
            <p><strong>Flipbook Link:</strong><br>
            <a href="${flipbookLink}">${flipbookLink}</a></p>
            
            <p><strong>Access Type:</strong> ${isTrial ? '7-Day Free Trial' : 'Full Access'}</p>
            ${expiresAt ? `<p><strong>Expires:</strong> ${new Date(expiresAt).toLocaleDateString()}</p>` : ''}
            
            <p>You can share this link with anyone to view your flipbook.</p>
          </div>
          <div class="footer">
            <p>If you have any questions, please contact our support team.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const info = await transporter.sendMail({
      from: process.env.GMAIL_USER,
      to: userEmail, // This will now go to the real Gmail
      subject: `🎉 Your Flipbook is Ready - ${userName}`,
      html: emailContent,
    });

    console.log('✅ REAL EMAIL SENT TO:', userEmail);
    console.log('📫 Message ID:', info.messageId);
    
    return {
      success: true,
      messageId: info.messageId,
      to: userEmail
    };

  } catch (error) {
    console.error('❌ Gmail sending error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};
// ==================== PDF PROCESSING ====================
const processPDFPages = async (pdfPath, userId) => {
  let outputDir;
  
  try {
    console.log('Starting PDF processing for:', pdfPath);
    
    // Create output directory
    outputDir = path.join(
      __dirname, 
      '../uploads/flipbook-pages', 
      `user_${userId}_${Date.now()}`
    );
    
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Use streams to read PDF file efficiently
    const pdfBuffer = await new Promise((resolve, reject) => {
      const chunks = [];
      const stream = fs.createReadStream(pdfPath, { 
        highWaterMark: 64 * 1024
      });
      
      stream.on('data', chunk => chunks.push(chunk));
      stream.on('end', () => resolve(Buffer.concat(chunks)));
      stream.on('error', reject);
    });

    // Load PDF
    const pdfDoc = await PDFDocument.load(pdfBuffer, {
      ignoreEncryption: true,
      updateMetadata: false
    });
    
    const totalPages = pdfDoc.getPageCount();

    // Copy original PDF to output directory
    const originalPdfPath = path.join(outputDir, 'original.pdf');
    fs.copyFileSync(pdfPath, originalPdfPath);

    console.log(`PDF extraction complete: ${totalPages} pages`);

    return {
      totalPages,
      outputDir,
      originalPdfPath
    };

  } catch (error) {
    console.error('PDF processing error:', error);
    
    if (outputDir && fs.existsSync(outputDir)) {
      fs.rmSync(outputDir, { recursive: true, force: true });
      console.log('Cleaned up output directory due to error');
    }
    
    throw new Error('Failed to process PDF: ' + error.message);
  }
};

// ==================== CONTROLLER FUNCTIONS ====================

// ==================== REGISTER FLIPBOOK ====================
exports.registerFlipbook = async (req, res) => {
  try {
    console.log("req.body:", req.body);
    console.log("req.file:", req.file);

    const { firstname, lastname, email } = req.body;

     let user = await User.findOne({ email });

    if(user){
      console.log("user already there")
      return res.status(500).json("use another email already regestred")
    }
   

    // Validation
    if (!firstname || !lastname || !email) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (!req.file) {
      return res.status(400).json({ message: "PDF file is required" });
    }

    // Validate file type
    if (!req.file.mimetype.includes('pdf')) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ message: "Only PDF files are allowed" });
    }

    // Find or create user
   
    
    if (!user) {
     
      user = await User.create({
        firstname,
        lastname,
        email,
       
      });
      console.log("New user created:", user._id);
    } else {
      console.log("User already exists:", user._id);
    }

    // Process PDF
    console.log('Processing PDF...');
    const pdfData = await processPDFPages(req.file.path, user._id);
    console.log(`PDF processed: ${pdfData.totalPages} pages`);
    
    // Create flipbook URL
    const baseUrl = process.env.FRONT_URI || 'http://localhost:5173';
    const flipbookUrl = `${baseUrl}/flipbook/view`;

    // Set expiry (7 days for trial users)
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    
    // Check if admin
    const isAdmin = email === process.env.ADMIN_EMAIL;
    const paymentStatus = isAdmin ? 'admin' : 'pending';

    // Create flipbook record
    const accessToken = require('crypto').randomBytes(32).toString('hex');
    
    const flipbook = await Flipbook.create({
      userId: user._id,
      filename: req.file.filename,
      originalName: req.file.originalname,
      path: req.file.path,
      size: req.file.size,
      flipbookLink: `${flipbookUrl}/${accessToken}`,
      expiresAt: isAdmin ? null : expiresAt,
      paymentStatus: paymentStatus,
      isPaid: isAdmin,
      pagesDirectory: pdfData.outputDir,
      totalPages: pdfData.totalPages
    });

    console.log("Flipbook created successfully:", flipbook._id);

    // Send email
    const userName = `${firstname} ${lastname}`;
    const emailSent = await sendFlipbookEmail(
      email, 
      userName, 
      flipbook.flipbookLink, 
      expiresAt.toLocaleDateString(),
      !isAdmin
    );

    res.status(201).json({
      message: "Flipbook created successfully" + (emailSent ? " and email sent" : " but email failed"),
      flipbookLink: flipbook.flipbookLink,
      expiresAt: isAdmin ? null : expiresAt,
      flipbookId: flipbook._id,
      accessToken: accessToken,
      isTrial: !isAdmin,
      emailSent: emailSent,
      totalPages: pdfData.totalPages,
      user: {
        firstname: user.firstname,
        lastname: user.lastname,
        email: user.email
      }
    });

  } catch (err) {
    console.error("Flipbook upload error:", err);
    
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

// ==================== GET FLIPBOOK PAGE ====================
exports.getFlipbookPage = async (req, res) => {
  try {
    const { flipbookId, pageNumber } = req.params;
    const cacheKey = `${flipbookId}_${pageNumber}`;

    // Check cache first
    if (pageCache.has(cacheKey)) {
      const cached = pageCache.get(cacheKey);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Cache-Control', 'public, max-age=86400');
      res.setHeader('X-Cache', 'HIT');
      return res.send(cached.data);
    }

    const flipbook = await Flipbook.findById(flipbookId);
    
    if (!flipbook) {
      return res.status(404).json({ message: "Flipbook not found" });
    }

    if (!flipbook.isActive) {
      return res.status(403).json({ message: "Flipbook deactivated" });
    }

    if (flipbook.expiresAt && new Date() > flipbook.expiresAt) {
      return res.status(403).json({ message: "Flipbook expired" });
    }

    // Get original PDF path
    const originalPdfPath = path.join(flipbook.pagesDirectory, 'original.pdf');
    
    if (!fs.existsSync(originalPdfPath)) {
      return res.status(500).json({ message: "PDF file not found on server" });
    }

    const pageNum = parseInt(pageNumber);
    
    if (pageNum < 1 || pageNum > flipbook.totalPages) {
      return res.status(404).json({ message: "Page not found" });
    }

    // Use streams for memory-efficient file reading
    const pdfBuffer = await new Promise((resolve, reject) => {
      const chunks = [];
      const stream = fs.createReadStream(originalPdfPath, { 
        highWaterMark: 64 * 1024
      });
      
      stream.on('data', chunk => chunks.push(chunk));
      stream.on('end', () => resolve(Buffer.concat(chunks)));
      stream.on('error', reject);
    });

    // Load PDF
    const pdfDoc = await PDFDocument.load(pdfBuffer, {
      ignoreEncryption: true,
      updateMetadata: false
    });
    
    // Create a new PDF with just this page
    const singlePagePdf = await PDFDocument.create();
    const [copiedPage] = await singlePagePdf.copyPages(pdfDoc, [pageNum - 1]);
    singlePagePdf.addPage(copiedPage);
    
    const pdfBytes = await singlePagePdf.save();
    const pdfBufferFinal = Buffer.from(pdfBytes);

    // Cache the result
    if (pageCache.size < CACHE_MAX_SIZE) {
      pageCache.set(cacheKey, {
        data: pdfBufferFinal,
        timestamp: Date.now()
      });
    }

    // Send as PDF
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.setHeader('X-Cache', 'MISS');
    res.send(pdfBufferFinal);

  } catch (err) {
    console.error("Get page error:", err);
    
    if (err.message.includes('Array buffer allocation failed') || err.message.includes('memory')) {
      return res.status(500).json({ 
        message: "PDF too large to process. Please try a smaller file or contact support.",
        error: "Memory allocation failed"
      });
    }
    
    res.status(500).json({ 
      message: "Server error",
      error: err.message 
    });
  }
};

// ==================== GET FLIPBOOK INFO ====================
exports.getFlipbookInfo = async (req, res) => {
  try {
    const { flipbookId } = req.params;

    const flipbook = await Flipbook.findById(flipbookId).populate('userId');
    
    if (!flipbook) {
      return res.status(404).json({ message: "Flipbook not found" });
    }

    res.status(200).json({
      flipbook: {
        id: flipbook._id,
        filename: flipbook.filename,
        originalName: flipbook.originalName,
        totalPages: flipbook.totalPages,
        accessCount: flipbook.accessCount,
        expiresAt: flipbook.expiresAt,
        isPaid: flipbook.isPaid,
        paymentStatus: flipbook.paymentStatus,
        isActive: flipbook.isActive,
        createdAt: flipbook.createdAt,
        user: {
          firstname: flipbook.userId.firstname,
          lastname: flipbook.userId.lastname,
          email: flipbook.userId.email
        }
      }
    });

  } catch (err) {
    console.error("Get flipbook info error:", err);
    res.status(500).json({ 
      message: "Server error",
      error: err.message 
    });
  }
};

// ==================== VERIFY FLIPBOOK ACCESS ====================
exports.verifyFlipbookAccess = async (req, res) => {
  try {
    const { accessToken } = req.params;

    const flipbook = await Flipbook.findOne({
      flipbookLink: { $regex: accessToken, $options: 'i' }
    }).populate('userId');

    if (!flipbook) {
      return res.status(404).json({ 
        message: "Flipbook not found or invalid access token" 
      });
    }

    if (!flipbook.isActive) {
      return res.status(403).json({ 
        message: "This flipbook has been deactivated" 
      });
    }

    if (flipbook.expiresAt && new Date() > flipbook.expiresAt) {
      return res.status(403).json({ 
        message: "This flipbook link has expired" 
      });
    }

    flipbook.accessCount += 1;
    flipbook.lastAccessed = new Date();
    await flipbook.save();

    res.status(200).json({
      message: "Access granted",
      flipbook: {
        id: flipbook._id,
        filename: flipbook.filename,
        originalName: flipbook.originalName,
        totalPages: flipbook.totalPages,
        accessCount: flipbook.accessCount,
        expiresAt: flipbook.expiresAt,
        isPaid: flipbook.isPaid,
        paymentStatus: flipbook.paymentStatus,
        user: {
          firstname: flipbook.userId.firstname,
          lastname: flipbook.userId.lastname
        }
      }
    });

  } catch (err) {
    console.error("Flipbook access verification error:", err);
    res.status(500).json({ 
      message: "Server error",
      error: err.message 
    });
  }
};

// ==================== UPDATE FLIPBOOK ACCESS ====================
exports.updateFlipbookAccess = async (req, res) => {
  try {
    const { flipbookId } = req.params;
    const { action, days } = req.body;

    const flipbook = await Flipbook.findById(flipbookId).populate('userId');
    
    if (!flipbook) {
      return res.status(404).json({ message: "Flipbook not found" });
    }

    switch (action) {
      case 'extend':
        const extensionDays = days || 30;
        flipbook.expiresAt = new Date(Date.now() + extensionDays * 24 * 60 * 60 * 1000);
        flipbook.paymentStatus = 'paid';
        flipbook.isPaid = true;
        break;

      case 'make_permanent':
        flipbook.expiresAt = null;
        flipbook.paymentStatus = 'admin';
        flipbook.isPaid = true;
        break;

      case 'deactivate':
        flipbook.isActive = false;
        break;

      case 'activate':
        flipbook.isActive = true;
        break;

      default:
        return res.status(400).json({ message: "Invalid action" });
    }

    await flipbook.save();

    // Clear cache for this flipbook
    for (const key of pageCache.keys()) {
      if (key.startsWith(flipbookId)) {
        pageCache.delete(key);
      }
    }

    if (action !== 'deactivate') {
      const user = flipbook.userId;
      await sendFlipbookEmail(
        user.email,
        `${user.firstname} ${user.lastname}`,
        flipbook.flipbookLink,
        flipbook.expiresAt ? flipbook.expiresAt.toLocaleDateString() : 'Never',
        false
      );
    }

    res.status(200).json({
      message: `Flipbook ${action} successful`,
      flipbook: {
        id: flipbook._id,
        expiresAt: flipbook.expiresAt,
        isActive: flipbook.isActive,
        isPaid: flipbook.isPaid,
        paymentStatus: flipbook.paymentStatus
      }
    });

  } catch (err) {
    console.error("Flipbook update error:", err);
    res.status(500).json({ 
      message: "Server error",
      error: err.message 
    });
  }
};

// ==================== GET ALL FLIPBOOKS ====================
exports.getAllFlipbooks = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '' } = req.query;
    
    const query = {};
    
    if (search) {
      query.$or = [
        { originalName: { $regex: search, $options: 'i' } },
        { 'userId.firstname': { $regex: search, $options: 'i' } },
        { 'userId.lastname': { $regex: search, $options: 'i' } },
        { 'userId.email': { $regex: search, $options: 'i' } }
      ];
    }

    const flipbooks = await Flipbook.find(query)
      .populate('userId', 'firstname lastname email')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Flipbook.countDocuments(query);

    res.status(200).json({
      count: flipbooks.length,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      flipbooks: flipbooks.map(fb => ({
        id: fb._id,
        user: fb.userId,
        originalName: fb.originalName,
        flipbookLink: fb.flipbookLink,
        totalPages: fb.totalPages,
        expiresAt: fb.expiresAt,
        isActive: fb.isActive,
        isPaid: fb.isPaid,
        paymentStatus: fb.paymentStatus,
        accessCount: fb.accessCount,
        lastAccessed: fb.lastAccessed,
        createdAt: fb.createdAt,
        size: fb.size
      }))
    });
  } catch (err) {
    console.error("Get flipbooks error:", err);
    res.status(500).json({ 
      message: "Server error",
      error: err.message 
    });
  }
};

// ==================== DELETE FLIPBOOK ====================
exports.deleteFlipbook = async (req, res) => {
  try {
    const { flipbookId } = req.params;

    const flipbook = await Flipbook.findById(flipbookId);
    
    if (!flipbook) {
      return res.status(404).json({ message: "Flipbook not found" });
    }

    // Delete PDF file
    if (flipbook.path && fs.existsSync(flipbook.path)) {
      fs.unlinkSync(flipbook.path);
    }

    // Delete pages directory
    if (flipbook.pagesDirectory && fs.existsSync(flipbook.pagesDirectory)) {
      fs.rmSync(flipbook.pagesDirectory, { recursive: true, force: true });
    }

    // Clear cache
    for (const key of pageCache.keys()) {
      if (key.startsWith(flipbookId)) {
        pageCache.delete(key);
      }
    }

    await Flipbook.findByIdAndDelete(flipbookId);

    res.status(200).json({
      message: "Flipbook deleted successfully",
      deletedId: flipbookId
    });

  } catch (err) {
    console.error("Delete flipbook error:", err);
    res.status(500).json({ 
      message: "Server error",
      error: err.message 
    });
  }
};

// ==================== GET USER FLIPBOOKS ====================
exports.getUserFlipbooks = async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const flipbooks = await Flipbook.find({ userId })
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Flipbook.countDocuments({ userId });

    res.status(200).json({
      count: flipbooks.length,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      flipbooks: flipbooks.map(fb => ({
        id: fb._id,
        originalName: fb.originalName,
        flipbookLink: fb.flipbookLink,
        totalPages: fb.totalPages,
        expiresAt: fb.expiresAt,
        isActive: fb.isActive,
        isPaid: fb.isPaid,
        paymentStatus: fb.paymentStatus,
        accessCount: fb.accessCount,
        lastAccessed: fb.lastAccessed,
        createdAt: fb.createdAt,
        size: fb.size
      }))
    });
  } catch (err) {
    console.error("Get user flipbooks error:", err);
    res.status(500).json({ 
      message: "Server error",
      error: err.message 
    });
  }
};

// ==================== CLEAR CACHE ====================
exports.clearCache = async (req, res) => {
  try {
    const beforeSize = pageCache.size;
    pageCache.clear();
    
    res.status(200).json({
      message: "Cache cleared successfully",
      cacheSizeBefore: beforeSize,
      cacheSizeAfter: pageCache.size
    });
  } catch (err) {
    console.error("Clear cache error:", err);
    res.status(500).json({ 
      message: "Server error",
      error: err.message 
    });
  }
};


// ==================== GET FLIPBOOK METADATA ====================
exports.getFlipbookMetadata = async (req, res) => {
  try {
    const { flipbookId } = req.params;

    // FIXED: Find by access token instead of MongoDB ObjectId
    const flipbook = await Flipbook.findOne({
      flipbookLink: { $regex: flipbookId, $options: 'i' }
    }).populate('userId');
    
    if (!flipbook) {
      return res.status(404).json({ message: "Flipbook not found" });
    }

    if (!flipbook.isActive) {
      return res.status(403).json({ message: "Flipbook deactivated" });
    }

    if (flipbook.expiresAt && new Date() > flipbook.expiresAt) {
      return res.status(403).json({ message: "Flipbook expired" });
    }

    res.status(200).json({
      flipbookId: flipbook._id,
      totalPages: flipbook.totalPages,
      userData: {
        firstname: flipbook.userId.firstname,
        lastname: flipbook.userId.lastname,
        email: flipbook.userId.email
      },
      server: {
        flipbookLink: flipbook.flipbookLink,
        expiresAt: flipbook.expiresAt
      },
      accessToken: flipbook.flipbookLink.split('/').pop()
    });

  } catch (err) {
    console.error("Get flipbook metadata error:", err);
    res.status(500).json({ 
      message: "Server error",
      error: err.message 
    });
  }
};
// ==================== GET FLIPBOOK PAGE ====================
exports.getFlipbookPage = async (req, res) => {
  try {
    const { flipbookId, pageNumber } = req.params;
    const cacheKey = `${flipbookId}_${pageNumber}`;

    // Check cache first
    if (pageCache.has(cacheKey)) {
      const cached = pageCache.get(cacheKey);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Cache-Control', 'public, max-age=86400');
      res.setHeader('X-Cache', 'HIT');
      return res.send(cached.data);
    }

    // FIXED: Find by access token instead of MongoDB ObjectId
    const flipbook = await Flipbook.findOne({
      flipbookLink: { $regex: flipbookId, $options: 'i' }
    });
    
    if (!flipbook) {
      return res.status(404).json({ message: "Flipbook not found" });
    }

    if (!flipbook.isActive) {
      return res.status(403).json({ message: "Flipbook deactivated" });
    }

    if (flipbook.expiresAt && new Date() > flipbook.expiresAt) {
      return res.status(403).json({ message: "Flipbook expired" });
    }

    // Get original PDF path
    const originalPdfPath = path.join(flipbook.pagesDirectory, 'original.pdf');
    
    if (!fs.existsSync(originalPdfPath)) {
      return res.status(500).json({ message: "PDF file not found on server" });
    }

    const pageNum = parseInt(pageNumber);
    
    if (pageNum < 1 || pageNum > flipbook.totalPages) {
      return res.status(404).json({ message: "Page not found" });
    }

    // Use streams for memory-efficient file reading
    const pdfBuffer = await new Promise((resolve, reject) => {
      const chunks = [];
      const stream = fs.createReadStream(originalPdfPath, { 
        highWaterMark: 64 * 1024
      });
      
      stream.on('data', chunk => chunks.push(chunk));
      stream.on('end', () => resolve(Buffer.concat(chunks)));
      stream.on('error', reject);
    });

    // Load PDF
    const pdfDoc = await PDFDocument.load(pdfBuffer, {
      ignoreEncryption: true,
      updateMetadata: false
    });
    
    // Create a new PDF with just this page
    const singlePagePdf = await PDFDocument.create();
    const [copiedPage] = await singlePagePdf.copyPages(pdfDoc, [pageNum - 1]);
    singlePagePdf.addPage(copiedPage);
    
    const pdfBytes = await singlePagePdf.save();
    const pdfBufferFinal = Buffer.from(pdfBytes);

    // Cache the result
    if (pageCache.size < CACHE_MAX_SIZE) {
      pageCache.set(cacheKey, {
        data: pdfBufferFinal,
        timestamp: Date.now()
      });
    }

    // Send as PDF
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.setHeader('X-Cache', 'MISS');
    res.send(pdfBufferFinal);

  } catch (err) {
    console.error("Get page error:", err);
    
    if (err.message.includes('Array buffer allocation failed') || err.message.includes('memory')) {
      return res.status(500).json({ 
        message: "PDF too large to process. Please try a smaller file or contact support.",
        error: "Memory allocation failed"
      });
    }
    
    res.status(500).json({ 
      message: "Server error",
      error: err.message 
    });
  }
};
module.exports = exports;