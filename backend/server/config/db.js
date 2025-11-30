const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    console.log('🚀 Attempting MongoDB Atlas connection...');
    
    // Direct connection string - no variables
    const conn = await mongoose.connect(
   process.env.MONGO_URI,
      {
        serverSelectionTimeoutMS: 30000,
        socketTimeoutMS: 45000,
      }
    );
    
    console.log('✅ SUCCESS! MongoDB Atlas Connected');
 
    
  } catch (err) {
    console.error('💥 CONNECTION FAILED!');
    console.error('Error:', err.message);
    
 
    
    process.exit(1);
  }
};

module.exports = connectDB;