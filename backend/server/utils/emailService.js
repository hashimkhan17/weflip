const nodemailer = require('nodemailer');

// Create transporter - FIXED: createTransport instead of createTransporter
const createTransporter = () => {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS // Use app password for Gmail
    }
  });
};

// Email templates
const emailTemplates = {
  flipbookAccess: (userName, flipbookLink, expiresAt, isTrial = true) => `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        .warning { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 15px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Your Flipbook is Ready! 📖</h1>
        </div>
        <div class="content">
          <h2>Hello ${userName},</h2>
          <p>Your PDF has been successfully converted into a flipbook. Click the button below to access your interactive flipbook:</p>
          
          <div style="text-align: center;">
            <a href="${flipbookLink}" class="button">View Your Flipbook</a>
          </div>

          ${isTrial ? `
          <div class="warning">
            <strong>⏰ Trial Period</strong>
            <p>This is a <strong>7-day trial access</strong>. Your flipbook link will expire on <strong>${expiresAt}</strong>.</p>
            <p>To get permanent access, please complete the payment process.</p>
          </div>
          ` : `
          <div style="background: #d1ecf1; border: 1px solid #bee5eb; padding: 15px; border-radius: 5px; margin: 15px 0;">
            <strong>✅ Paid Access</strong>
            <p>You have full permanent access to your flipbook!</p>
          </div>
          `}

          <p><strong>Flipbook Link:</strong><br>
          <a href="${flipbookLink}">${flipbookLink}</a></p>

          <p>If you have any questions, please contact our support team.</p>
          
          <p>Best regards,<br>Flipbook Team</p>
        </div>
        <div class="footer">
          <p>© 2024 Flipbook App. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `
};

// utils/emailService.js - SIMULATION VERSION (NO CONFIG NEEDED)
exports.sendFlipbookEmail = async (userEmail, userName, flipbookLink, expiresAt, isTrial = true) => {
  try {
    console.log('══════════════════════════════════════════════════════════════════');
    console.log('🎉 FLIPBOOK CREATED - EMAIL NOTIFICATION');
    console.log('══════════════════════════════════════════════════════════════════');
    console.log('📨 To:', userEmail);
    console.log('👤 User:', userName);
    console.log('🔗 Flipbook Link:', flipbookLink);
    console.log('⏰ Expires:', expiresAt);
    console.log('📊 Access Type:', isTrial ? '7-Day Trial' : 'Permanent Access');
    console.log('💡 In production, this would send a real email to the user');
    console.log('══════════════════════════════════════════════════════════════════');
    
    // Always return true to simulate successful email send
    return true;
  } catch (error) {
    console.error('Email simulation error:', error);
    return false;
  }
};

exports.sendPaymentReminder = async (userEmail, userName, flipbookLink, expiresAt) => {
  console.log('⏰ PAYMENT REMINDER WOULD BE SENT TO:', userEmail);
  console.log('🔗 Link:', flipbookLink);
  console.log('📅 Expires:', expiresAt);
  return true;
};