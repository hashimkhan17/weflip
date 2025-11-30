const express = require("express");
const router = express.Router();
const Flipbook = require("../models/flipbookModel");
const User = require("../models/User");
const { protect } = require("../controllers/adminAuthController");

// Apply protection to all admin management routes
router.use(protect);

// Get dashboard stats
router.get("/stats", async (req, res) => {
  try {
    console.log('📊 Fetching dashboard stats...');
    
    const [totalUsers, totalFlipbooks, activeFlipbooks, paidFlipbooks, recentFlipbooks] = await Promise.all([
      User.countDocuments(),
      Flipbook.countDocuments(),
      Flipbook.countDocuments({ isActive: true }),
      Flipbook.countDocuments({ isPaid: true }),
      Flipbook.find()
        .populate('userId', 'firstname lastname email')
        .sort({ createdAt: -1 })
        .limit(5)
    ]);

    const stats = {
      totalUsers: totalUsers || 0,
      totalFlipbooks: totalFlipbooks || 0,
      activeFlipbooks: activeFlipbooks || 0,
      paidFlipbooks: paidFlipbooks || 0,
      trialFlipbooks: (totalFlipbooks - paidFlipbooks) || 0
    };

    console.log('📊 Stats fetched:', stats);

    res.status(200).json({
      success: true,
      stats,
      recentActivity: recentFlipbooks.map(fb => ({
        id: fb._id,
        user: fb.userId,
        originalName: fb.originalName,
        createdAt: fb.createdAt,
        status: fb.isActive ? 'active' : 'inactive'
      }))
    });
  } catch (err) {
    console.error('❌ Stats error:', err);
    res.status(500).json({ 
      success: false,
      message: "Server error", 
      error: err.message 
    });
  }
});

// Get all flipbooks
router.get("/flipbooks", async (req, res) => {
  try {
    console.log('📚 Fetching all flipbooks...');
    
    const flipbooks = await Flipbook.find()
      .populate('userId', 'firstname lastname email')
      .sort({ createdAt: -1 });

    console.log(`📚 Found ${flipbooks.length} flipbooks`);

    res.status(200).json({
      success: true,
      flipbooks: flipbooks.map(fb => ({
        id: fb._id,
        user: fb.userId,
        originalName: fb.originalName,
        flipbookLink: fb.flipbookLink,
        expiresAt: fb.expiresAt,
        isActive: fb.isActive,
        isPaid: fb.isPaid,
        paymentStatus: fb.paymentStatus,
        accessCount: fb.accessCount || 0,
        lastAccessed: fb.lastAccessed,
        createdAt: fb.createdAt
      }))
    });
  } catch (err) {
    console.error('❌ Flipbooks error:', err);
    res.status(500).json({ 
      success: false,
      message: "Server error", 
      error: err.message 
    });
  }
});

// Get all users
router.get("/users", async (req, res) => {
  try {
    console.log('👥 Fetching all users...');
    
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    
    const usersWithCounts = await Promise.all(
      users.map(async (user) => {
        const flipbookCount = await Flipbook.countDocuments({ userId: user._id });
        return {
          id: user._id,
          firstname: user.firstname,
          lastname: user.lastname,
          email: user.email,
          createdAt: user.createdAt,
          flipbookCount: flipbookCount || 0
        };
      })
    );

    console.log(`👥 Found ${usersWithCounts.length} users`);
    
    res.status(200).json({
      success: true,
      users: usersWithCounts
    });
  } catch (err) {
    console.error('❌ Users error:', err);
    res.status(500).json({ 
      success: false,
      message: "Server error", 
      error: err.message 
    });
  }
});

// Update flipbook access
router.patch("/flipbook/:id", async (req, res) => {
  try {
    const { action, days } = req.body;
    const flipbookId = req.params.id;

    console.log(`🔄 Flipbook action: ${action} on ${flipbookId}`);

    const flipbook = await Flipbook.findById(flipbookId).populate('userId');
    
    if (!flipbook) {
      return res.status(404).json({ 
        success: false,
        message: "Flipbook not found" 
      });
    }

    let message = "";
    
    switch (action) {
      case 'extend':
        const extensionDays = days || 30;
        flipbook.expiresAt = new Date(Date.now() + extensionDays * 24 * 60 * 60 * 1000);
        flipbook.paymentStatus = 'paid';
        flipbook.isPaid = true;
        message = `Access extended by ${extensionDays} days`;
        break;

      case 'make_permanent':
        flipbook.expiresAt = null;
        flipbook.paymentStatus = 'admin';
        flipbook.isPaid = true;
        message = "Access made permanent";
        break;

      case 'deactivate':
        flipbook.isActive = false;
        message = "Flipbook deactivated";
        break;

      case 'activate':
        flipbook.isActive = true;
        message = "Flipbook activated";
        break;

      case 'delete':
        await Flipbook.findByIdAndDelete(flipbookId);
        return res.status(200).json({ 
          success: true,
          message: "Flipbook deleted successfully" 
        });

      default:
        return res.status(400).json({ 
          success: false,
          message: "Invalid action" 
        });
    }

    await flipbook.save();

    console.log(`✅ Flipbook action successful: ${message}`);

    res.status(200).json({
      success: true,
      message,
      flipbook: {
        id: flipbook._id,
        expiresAt: flipbook.expiresAt,
        isActive: flipbook.isActive,
        isPaid: flipbook.isPaid,
        paymentStatus: flipbook.paymentStatus
      }
    });

  } catch (err) {
    console.error('❌ Flipbook update error:', err);
    res.status(500).json({ 
      success: false,
      message: "Server error", 
      error: err.message 
    });
  }
});

module.exports = router;