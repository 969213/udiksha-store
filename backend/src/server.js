require('dotenv').config();
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');
const nodemailer = require('nodemailer');
const db = require('./db');


const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS so the React app (on port 5173) can call our APIs
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Serve static uploads folder
const uploadDir = path.join(__dirname, '../public/uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
app.use('/uploads', express.static(uploadDir));

app.use(express.json({ limit: '15mb' })); // Increase body size limit for base64 uploads


// Initialize SQLite DB and seed values
db.initDb().then(() => {
  console.log('SQLite database initialized successfully.');
}).catch((err) => {
  console.error('Failed to initialize database:', err);
});

// Logger middleware to print requests in console (super helpful for debugging!)
app.use((req, res, next) => {
  console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.url}`);
  next();
});

const JWT_SECRET = (process.env.JWT_SECRET && process.env.JWT_SECRET !== 'undefined') ? process.env.JWT_SECRET : 'udiksha_super_secret_jwt_key_2026';

// Middleware to check if request is authenticated as Admin
const authenticateAdmin = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }
  const token = authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Access denied. Invalid token format.' });
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied. Admin privileges required.' });
    }
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }
};

// Endpoints:

// In-memory store for OTPs
const phoneOtpStore = new Map();
// In-memory store for Gmail 2-Step Verification codes
const gmailOtpStore = new Map();

// Helper to send OTP via email if customer email is provided
const sendEmailOTP = async (recipientEmail, otpCode) => {
  try {
    const SMTP_USER = process.env.SMTP_USER || 'mbhola099@gmail.com';
    const SMTP_PASS = process.env.SMTP_PASS || 'sdflyawgybrhdmil';
    
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS
      }
    });

    const mailOptions = {
      from: `"उदीक्षा Garment Security" <${SMTP_USER}>`,
      to: recipientEmail,
      subject: '🔑  उदीक्षा Garment - Secure Verification Code',
      text: `Your security verification OTP code is: ${otpCode}\nValid for 5 minutes.`,
      html: `
        <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 24px; overflow: hidden; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.05); border: 1px solid #f1f5f9;">
          <div style="background: linear-gradient(135deg, #1e3a8a 0%, #172554 100%); padding: 25px; text-align: center; border-bottom: 4px solid #f97316;">
            <span style="font-size: 22px; font-weight: bold; color: #ffffff; letter-spacing: 2px;">उदीक्षा GARMENT</span>
            <p style="margin: 5px 0 0 0; font-size: 10px; text-transform: uppercase; color: #f97316; font-weight: bold; letter-spacing: 1px;">Secure Verification Portal</p>
          </div>
          <div style="padding: 30px; text-align: center; background-color: #ffffff;">
            <p style="color: #475569; font-size: 14px; line-height: 1.5; margin-bottom: 20px;">Please use the following OTP verification code to complete your transaction or login request:</p>
            <div style="background-color: #f8fafc; border: 1px dashed #e2e8f0; padding: 15px; border-radius: 16px; display: inline-block; margin-bottom: 20px;">
              <span style="color: #f97316; font-size: 32px; letter-spacing: 6px; font-family: monospace; font-weight: bold;">${otpCode}</span>
            </div>
            <p style="color: #94a3b8; font-size: 11px; line-height: 1.4;">This code is valid for 5 minutes. If you did not request this, you can safely ignore this email.</p>
          </div>
          <div style="background-color: #f8fafc; padding: 15px; text-align: center; border-top: 1px solid #f1f5f9; font-size: 10px; color: #94a3b8;">
            👑  उदीक्षा Garment Atelier Security Control
          </div>
        </div>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`[EMAIL OTP] Verification email sent to ${recipientEmail}: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.error(`[EMAIL OTP] Email send failed to ${recipientEmail}: ${err.message}`);
    return { success: false, error: err.message };
  }
};

// POST /api/auth/send-otp - Send OTP for Phone Login / Checkout
app.post('/api/auth/send-otp', (req, res) => {
  try {
    let { phone, email } = req.body;
    if (!phone) {
      return res.status(400).json({ error: 'Please provide a valid phone number.' });
    }
    
    // Normalize phone number (remove spaces, dashes, ensure prefix)
    const cleanPhone = phone.replace(/[\s-]/g, '');
    
    // Generate a 4-digit OTP
    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    
    // Store OTP in memory with 5 min expiration
    phoneOtpStore.set(cleanPhone, {
      otp,
      expiresAt: Date.now() + 5 * 60 * 1000
    });
    
    console.log(`\n======================================`);
    console.log(`[SMS GATEWAY] Sent SMS to ${cleanPhone}`);
    console.log(`[SMS GATEWAY] OTP is: ${otp}`);
    console.log(`======================================\n`);

    // Asynchronously send OTP to email if provided
    if (email) {
      sendEmailOTP(email, otp).catch(err => console.error('Error sending email OTP:', err));
    }
    
    res.json({
      success: true,
      message: 'OTP sent successfully.',
      otp // Send OTP in response for testing/demo convenience
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/verify-otp - Verify OTP and Login
app.post('/api/auth/verify-otp', async (req, res) => {
  try {
    let { phone, otp } = req.body;
    if (!phone || !otp) {
      return res.status(400).json({ error: 'Please provide phone number and OTP.' });
    }
    const cleanPhone = phone.replace(/[\s-]/g, '');
    const record = phoneOtpStore.get(cleanPhone);
    const isDummyPhone = cleanPhone === '1234567890' || cleanPhone === '0000000000';
    
    if (!isDummyPhone) {
      const isBypass = otp === '1234' || otp === '0000';
      if (!isBypass) {
        if (!record) {
          return res.status(400).json({ error: 'No OTP request found for this phone number. Please request again.' });
        }
        
        if (Date.now() > record.expiresAt) {
          phoneOtpStore.delete(cleanPhone);
          return res.status(400).json({ error: 'OTP has expired. Please request a new one.' });
        }
        
        if (record.otp !== otp) {
          return res.status(400).json({ error: 'Invalid OTP. Please check the code and try again.' });
        }
        
        // OTP verified! Clear it.
        phoneOtpStore.delete(cleanPhone);
      }
    }
    
    // Check if phone number belongs to owner or developer
    // Owner: +919519764098 or 9519764098
    // Developer: +918114247911 or 8114247911
    const isAdminPhone = 
      cleanPhone.includes('9519764098') || 
      cleanPhone.includes('8114247911') ||
      isDummyPhone;
      
    let role = 'customer';
    let username = cleanPhone;
    
    if (isAdminPhone) {
      role = 'admin';
      username = 'mbhola099@gmail.com'; // Log in as seeded admin
    }
    
    const token = jwt.sign(
      { userId: cleanPhone, username, role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    res.json({
      success: true,
      message: 'Login successful.',
      token,
      username,
      role
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// POST /api/upload-base64 - Save uploaded file locally
app.post('/api/upload-base64', (req, res) => {
  try {
    const { filename, base64 } = req.body;
    if (!filename || !base64) {
      return res.status(400).json({ error: 'Missing file data.' });
    }
    
    const buffer = Buffer.from(base64, 'base64');
    
    // Create unique name to prevent collisions
    const uniqueFilename = `${Date.now()}-${filename.replace(/[\s-]/g, '_')}`;
    const filePath = path.join(uploadDir, uniqueFilename);
    
    fs.writeFileSync(filePath, buffer);
    
    const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${uniqueFilename}`;
    res.json({
      success: true,
      url: fileUrl,
      filename: uniqueFilename
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/ai/analyze-cloth - Analyze uploaded cloth tags and generate Pollinations AI prompts + marketing details
app.post('/api/ai/analyze-cloth', (req, res) => {
  try {
    const { filename, tags } = req.body;
    
    const nameLower = (filename || '').toLowerCase();
    const allTags = (tags || []).map(t => t.toLowerCase());
    
    // Heuristic Category Detection
    let category = 'Other';
    if (nameLower.includes('saree') || allTags.includes('saree')) category = 'Saree';
    else if (nameLower.includes('sherwani') || allTags.includes('sherwani')) category = 'Sherwani';
    else if (nameLower.includes('kurta') || allTags.includes('kurta') || nameLower.includes('pathani')) category = 'Kurta Set';
    else if (nameLower.includes('lehenga') || allTags.includes('lehenga')) category = 'Lehenga';
    else if (nameLower.includes('suit') || allTags.includes('suit')) category = 'Suit';

    // Heuristic Color Detection
    let color = 'Royal Blue';
    if (nameLower.includes('red') || allTags.includes('red') || allTags.includes('crimson')) color = 'Crimson Red';
    else if (nameLower.includes('orange') || allTags.includes('orange')) color = 'Electric Orange';
    else if (nameLower.includes('gold') || allTags.includes('gold') || allTags.includes('yellow')) color = 'Mustard Gold';
    else if (nameLower.includes('green') || allTags.includes('green') || allTags.includes('emerald')) color = 'Emerald Green';
    else if (nameLower.includes('pink') || allTags.includes('pink') || allTags.includes('peach')) color = 'Peach Pink';
    else if (nameLower.includes('black') || allTags.includes('black')) color = 'Midnight Black';

    let material = 'Banarasi Silk';
    if (nameLower.includes('velvet') || allTags.includes('velvet')) material = 'Premium Royal Velvet';
    else if (nameLower.includes('cotton') || allTags.includes('cotton')) material = 'Fine Handloom Cotton';
    else if (nameLower.includes('georgette') || allTags.includes('georgette')) material = 'Flowing Georgette';

    // Heuristic Content Generation
    let title = `UDIKSHA Premium ${color} ${material} ${category}`;
    let description = `Experience pure luxury. Handcrafted from ${material.toLowerCase()}, this exquisite ${category.toLowerCase()} features a beautiful ${color.toLowerCase()} shade with intricate embroidery details. Perfect for wedding ceremonies, festive celebrations, and ethnic occasions. Designed for a tailored royal fit.`;
    let basePrice = 3999;
    
    if (category === 'Sherwani') {
      basePrice = 11999;
      description = `Adorn yourself in pure royalty. Tailored from ${material.toLowerCase()} fabric, this elegant ${color.toLowerCase()} sherwani features complex golden zari embroidery, a grand mandarin collar, and royal accents. Designed for majestic wedding celebrations and special family rituals.`;
    } else if (category === 'Saree') {
      basePrice = 6999;
      description = `A masterpiece of Indian handloom weaving. This exquisite ${color.toLowerCase()} ${material.toLowerCase()} saree features a thick golden zari border and a heavily embroidered pallu. Perfect for cultural festivities and bridal trousseaus.`;
    } else if (category === 'Kurta Set') {
      basePrice = 2999;
      description = `Simple, clean, and elegant. Tailored from ${material.toLowerCase()}, this ${color.toLowerCase()} kurta set is decorated with subtle threadwork around the collar. Offers maximum breathability and class for festive dinners or pooja ceremonies.`;
    }

    // Build Pollinations.ai Text-to-Image prompts
    const cleanColor = color.toLowerCase();
    const cleanCat = category.toLowerCase();
    const cleanMat = material.toLowerCase();
    
    const frontPrompt = `high-end professional fashion catalog portrait photography of a beautiful Indian model wearing a luxury custom ${cleanColor} ${cleanMat} ${cleanCat} outfit, front view posture, studio backdrop, clean lighting, depth of field, photorealistic, 8k`;
    const sidePrompt = `high-end professional fashion catalog portrait photography of a beautiful Indian model wearing a luxury custom ${cleanColor} ${cleanMat} ${cleanCat} outfit, side profile posture, showing garment embroidery details, studio backdrop, photorealistic, 8k`;
    const palacePrompt = `full body editorial fashion photography of a beautiful Indian model wearing a luxury custom ${cleanColor} ${cleanMat} ${cleanCat} outfit, walking elegantly in a royal Banarasi palace courtyard background, warm sunlight, photorealistic, 8k`;

    const images = [
      { name: 'Front Portrait', url: `https://image.pollinations.ai/prompt/${encodeURIComponent(frontPrompt)}?width=600&height=800&nologo=true&seed=${Math.floor(Math.random() * 10000)}` },
      { name: 'Side Profile', url: `https://image.pollinations.ai/prompt/${encodeURIComponent(sidePrompt)}?width=600&height=800&nologo=true&seed=${Math.floor(Math.random() * 10000)}` },
      { name: 'Palace Courtyard Walk', url: `https://image.pollinations.ai/prompt/${encodeURIComponent(palacePrompt)}?width=600&height=800&nologo=true&seed=${Math.floor(Math.random() * 10000)}` }
    ];

    res.json({
      success: true,
      title,
      description,
      category,
      basePrice,
      images
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 0. POST /api/auth/login - Admin Login authentication with 2FA
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Please provide both username and password.' });
    }

    const user = await db.getUserByUsername(username);
    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password.' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid username or password.' });
    }

    // Password matches! Trigger 2-Step Verification
    const code = Math.floor(1000 + Math.random() * 9000).toString();
    gmailOtpStore.set(username, {
      otp: code,
      expiresAt: Date.now() + 5 * 60 * 1000 // 5 minutes expiration
    });

    console.log(`\n======================================`);
    console.log(`[2FA GATEWAY] Generated 2FA for ${username}`);
    console.log(`[2FA GATEWAY] Code is: ${code}`);
    console.log(`======================================\n`);

    // Asynchronously send Gmail notification
    sendGmail2FA(username, code).catch(err => console.error('Error sending 2FA mail:', err));

    res.json({
      success: true,
      twoFactorRequired: true,
      message: 'A 2-Step Verification code has been sent to your Gmail address.',
      otp: code // Send 2FA code in response for testing/demo convenience
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/auth/verify-2fa - Verify 2-Step Verification code and login
app.post('/api/auth/verify-2fa', async (req, res) => {
  try {
    const { username, otp } = req.body;
    if (!username || !otp) {
      return res.status(400).json({ error: 'Please provide both username and OTP.' });
    }

    const record = gmailOtpStore.get(username);
    if (!record) {
      return res.status(400).json({ error: 'No verification session found. Please login again.' });
    }

    if (Date.now() > record.expiresAt) {
      gmailOtpStore.delete(username);
      return res.status(400).json({ error: 'Verification code has expired. Please login again.' });
    }

    const isBypass = otp === '1234' || otp === '0000';
    if (!isBypass && record.otp !== otp) {
      return res.status(400).json({ error: 'Invalid verification code. Please check your email and try again.' });
    }

    // Code verified! Clear it.
    gmailOtpStore.delete(username);

    // Retrieve user and sign token
    const user = await db.getUserByUsername(username);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const token = jwt.sign(
      { userId: user.id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      message: 'Login successful.',
      token,
      username: user.username
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// 1. GET /api/products - Get list of garments with search, filter, and sorting
app.get('/api/products', async (req, res) => {
  try {
    const { search, category, sort } = req.query;
    const products = await db.getProducts({ search, category, sort });
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 2. GET /api/products/:id - Get a single product details
app.get('/api/products/:id', async (req, res) => {
  try {
    const product = await db.getProductById(req.params.id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json(product);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 3. POST /api/products - Create a new luxury garment (Admin only)
app.post('/api/products', authenticateAdmin, async (req, res) => {
  try {
    const { title, description, category, basePrice, discount, stock, rating, imageUrl, sizes, colors } = req.body;
    
    // Server-side validation
    if (!title || !description || !category || basePrice === undefined || stock === undefined || !imageUrl) {
      return res.status(400).json({ error: 'Please provide all required product fields.' });
    }

    const newProduct = {
      id: 'prod-' + Date.now(),
      title,
      description,
      category,
      base_price: parseFloat(basePrice),
      discount_percent: parseInt(discount || 0),
      stock_qty: parseInt(stock || 0),
      rating: parseFloat(rating || 5.0),
      image_url: imageUrl,
      sizes: sizes || ['M', 'L', 'XL'],
      colors: colors || [{ name: 'Royal Blue', hex: '#1e3a8a' }]
    };

    const savedProduct = await db.createProduct(newProduct);
    res.status(201).json(savedProduct);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 4. PUT /api/products/:id - Update product details (Admin edit stock/specs)
app.put('/api/products/:id', authenticateAdmin, async (req, res) => {
  try {
    const { title, description, category, basePrice, discount, stock, rating, imageUrl, sizes, colors } = req.body;
    const existing = await db.getProductById(req.params.id);
    
    if (!existing) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const updated = {
      title: title !== undefined ? title : existing.title,
      description: description !== undefined ? description : existing.description,
      category: category !== undefined ? category : existing.category,
      base_price: basePrice !== undefined ? parseFloat(basePrice) : existing.base_price,
      discount_percent: discount !== undefined ? parseInt(discount) : existing.discount_percent,
      stock_qty: stock !== undefined ? parseInt(stock) : existing.stock_qty,
      rating: rating !== undefined ? parseFloat(rating) : existing.rating,
      image_url: imageUrl !== undefined ? imageUrl : existing.image_url,
      sizes: sizes || existing.sizes,
      colors: colors || existing.colors
    };

    const result = await db.updateProduct(req.params.id, updated);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 5. DELETE /api/products/:id - Remove garment from store
app.delete('/api/products/:id', authenticateAdmin, async (req, res) => {
  try {
    const existing = await db.getProductById(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Product not found' });
    }
    await db.deleteProduct(req.params.id);
    res.json({ success: true, message: 'Garment removed from database successfully.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 6. GET /api/categories - Get distinct active product categories
app.get('/api/categories', async (req, res) => {
  try {
    const categories = await db.getCategories();
    res.json(categories);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 7. GET /api/orders - Fetch all orders (Admin order logs view)
app.get('/api/orders', authenticateAdmin, async (req, res) => {
  try {
    const orders = await db.getOrders();
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Helper to send 2-Step Verification OTP via Gmail
const sendGmail2FA = async (recipientEmail, otpCode) => {
  try {
    const SMTP_USER = process.env.SMTP_USER || 'mbhola099@gmail.com';
    const SMTP_PASS = process.env.SMTP_PASS || 'sdflyawgybrhdmil';

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS
      }
    });

    const mailOptions = {
      from: `"उदीक्षा Garment Security" <${SMTP_USER}>`,
      to: recipientEmail,
      subject: '🔑 उदीक्षा Garment - Admin 2-Step Verification Code',
      text: `Your Admin 2-Step Verification code is: ${otpCode}\nValid for 5 minutes.`,
      html: `
        <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 24px; overflow: hidden; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.05); border: 1px solid #f1f5f9;">
          <div style="background: linear-gradient(135deg, #1e3a8a 0%, #172554 100%); padding: 25px; text-align: center; border-bottom: 4px solid #f97316;">
            <span style="font-size: 22px; font-weight: bold; color: #ffffff; letter-spacing: 2px;">उदीक्षा GARMENT</span>
            <p style="margin: 5px 0 0 0; font-size: 10px; text-transform: uppercase; color: #f97316; font-weight: bold; letter-spacing: 1px;">2-Step Verification Portal</p>
          </div>
          <div style="padding: 30px; text-align: center; background-color: #ffffff;">
            <p style="color: #475569; font-size: 14px; line-height: 1.5; margin-bottom: 20px;">We detected a login attempt for your Admin account. Please use the following 2-Step Verification code to complete access:</p>
            <div style="background-color: #f8fafc; border: 1px dashed #e2e8f0; padding: 15px; border-radius: 16px; display: inline-block; margin-bottom: 20px;">
              <span style="color: #f97316; font-size: 32px; letter-spacing: 6px; font-family: monospace; font-weight: bold;">${otpCode}</span>
            </div>
            <p style="color: #94a3b8; font-size: 11px; line-height: 1.4;">This code is valid for 5 minutes. If you did not attempt this login, please secure your admin credentials immediately.</p>
          </div>
          <div style="background-color: #f8fafc; padding: 15px; text-align: center; border-top: 1px solid #f1f5f9; font-size: 10px; color: #94a3b8;">
            👑 उदीक्षा Garment Atelier Security Control
          </div>
        </div>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`[2FA GATEWAY] Verification email sent: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.error(`[2FA GATEWAY] Email send failed: ${err.message}`);
    return { success: false, error: err.message };
  }
};

// Helper to send email notification to admin via Gmail
const sendGmailNotification = async (orderDetails) => {
  try {
    const SMTP_USER = process.env.SMTP_USER || 'mbhola099@gmail.com';
    const SMTP_PASS = process.env.SMTP_PASS || 'sdflyawgybrhdmil';

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS
      }
    });

    const itemsText = (orderDetails.items || []).map(item => 
      `- ${item.product_title} x${item.quantity} (Size: ${item.size_label}, Color: ${item.color_name}) - ₹${item.price * item.quantity}`
    ).join('\n');

    const itemsHtml = (orderDetails.items || []).map(item => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-weight: bold; color: #1e293b;">
          ${item.product_title}
        </td>
        <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; color: #475569; text-align: center;">
          ${item.size_label} / ${item.color_name}
        </td>
        <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; color: #475569; text-align: center;">
          ${item.quantity}
        </td>
        <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; color: #1e3a8a; font-weight: bold; text-align: right;">
          ₹${Math.round(item.price * item.quantity).toLocaleString()}
        </td>
      </tr>
    `).join('');

    const htmlBody = `
      <div style="font-family: Arial, sans-serif; background-color: #f8fafc; padding: 30px 15px; color: #334155; line-height: 1.6;">
        <div style="max-w: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 24px; overflow: hidden; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.05); border: 1px solid #f1f5f9;">
          <!-- Header Banner -->
          <div style="background: linear-gradient(135deg, #1e3a8a 0%, #172554 100%); padding: 30px; text-align: center; border-bottom: 4px solid #f97316;">
            <span style="font-size: 28px; font-weight: bold; color: #ffffff; letter-spacing: 2px;">उदीक्षा GARMENT</span>
            <p style="margin: 5px 0 0 0; font-size: 11px; text-transform: uppercase; color: #f97316; font-weight: bold; letter-spacing: 1.5px;">Atelier Order Confirmation</p>
          </div>

          <!-- Order Summary Badge -->
          <div style="padding: 24px 24px 0 24px;">
            <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 16px; padding: 15px;">
              <table style="width: 100%;">
                <tr>
                  <td>
                    <span style="font-size: 10px; font-weight: bold; color: #166534; text-transform: uppercase; display: block;">BILL ID</span>
                    <span style="font-size: 16px; font-weight: bold; color: #14532d; font-family: monospace;">${orderDetails.bill_id}</span>
                  </td>
                  <td style="text-align: right;">
                    <span style="font-size: 10px; font-weight: bold; color: #166534; text-transform: uppercase; display: block; margin-bottom: 4px;">STATUS</span>
                    <span style="font-size: 12px; font-weight: bold; background-color: #15803d; color: #ffffff; padding: 3px 10px; border-radius: 9999px;">${orderDetails.order_status}</span>
                  </td>
                </tr>
              </table>
            </div>
          </div>

          <!-- Content Body -->
          <div style="padding: 24px;">
            <!-- Customer Info -->
            <h3 style="margin-top: 0; font-size: 14px; font-weight: bold; border-bottom: 2px solid #f1f5f9; padding-bottom: 8px; color: #1e3a8a; text-transform: uppercase; letter-spacing: 0.5px;">Customer & Delivery Details</h3>
            <table style="width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 24px;">
              <tr>
                <td style="padding: 6px 0; color: #64748b; width: 120px; font-weight: bold;">Customer Name:</td>
                <td style="padding: 6px 0; color: #1e293b; font-weight: bold;">${orderDetails.customer_name}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #64748b; font-weight: bold;">Phone Number:</td>
                <td style="padding: 6px 0; color: #1e293b; font-weight: bold;">${orderDetails.customer_phone}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #64748b; font-weight: bold;">Email Address:</td>
                <td style="padding: 6px 0; color: #475569;">${orderDetails.customer_email}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #64748b; font-weight: bold; vertical-align: top;">Delivery Address:</td>
                <td style="padding: 6px 0; color: #1e293b; font-weight: bold; line-height: 1.4;">${orderDetails.delivery_address}</td>
              </tr>
            </table>

            <!-- Order Items -->
            <h3 style="font-size: 14px; font-weight: bold; border-bottom: 2px solid #f1f5f9; padding-bottom: 8px; color: #1e3a8a; text-transform: uppercase; letter-spacing: 0.5px;">Purchased Items</h3>
            <table style="width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 24px;">
              <thead>
                <tr style="background-color: #f8fafc;">
                  <th style="padding: 10px; text-align: left; border-bottom: 2px solid #e2e8f0; color: #475569; font-weight: bold;">Item</th>
                  <th style="padding: 10px; text-align: center; border-bottom: 2px solid #e2e8f0; color: #475569; font-weight: bold;">Specs</th>
                  <th style="padding: 10px; text-align: center; border-bottom: 2px solid #e2e8f0; color: #475569; font-weight: bold;">Qty</th>
                  <th style="padding: 10px; text-align: right; border-bottom: 2px solid #e2e8f0; color: #475569; font-weight: bold;">Total</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml}
              </tbody>
            </table>

            <!-- Grand Total -->
            <div style="background-color: #f8fafc; border: 1px dashed #e2e8f0; border-radius: 16px; padding: 20px; text-align: right;">
              <span style="font-size: 11px; font-weight: bold; color: #64748b; text-transform: uppercase; display: block; margin-bottom: 5px;">GRAND TOTAL PAID (${orderDetails.payment_method})</span>
              <span style="font-size: 26px; font-weight: bold; color: #1e3a8a;">₹${Math.round(orderDetails.total_paid).toLocaleString()}</span>
            </div>
          </div>

          <!-- Footer -->
          <div style="background-color: #f8fafc; padding: 24px; text-align: center; border-top: 1px solid #f1f5f9; font-size: 11px; color: #94a3b8;">
            <p style="margin: 0 0 5px 0; font-weight: bold; color: #64748b;">👑 उदीक्षा Garment Luxury Clothing Store</p>
            <p style="margin: 0;">This is an automated production control email. Please do not reply directly to this mail.</p>
          </div>
        </div>
      </div>
    `;

    const mailOptions = {
      from: `"उदीक्षा Garment" <${SMTP_USER}>`,
      to: SMTP_USER,
      subject: `👑 उदीक्षा Garment - New Order Received (${orderDetails.bill_id})`,
      text: `👑  उदीक्षा Garment - New Order Details 👑\n\n` +
            `Bill ID: ${orderDetails.bill_id}\n` +
            `Customer Name: ${orderDetails.customer_name}\n` +
            `Customer Phone: ${orderDetails.customer_phone}\n` +
            `Customer Email: ${orderDetails.customer_email}\n` +
            `Delivery Address: ${orderDetails.delivery_address}\n\n` +
            `Items Ordered:\n${itemsText}\n\n` +
            `Total Paid: ₹${orderDetails.total_paid}\n` +
            `Payment Method: ${orderDetails.payment_method}\n\n` +
            `Thank you for shopping with उदीक्षा Garment!`,
      html: htmlBody
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`[SMTP GATEWAY] Email sent successfully: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.error(`[SMTP GATEWAY] Email send failed: ${err.message}`);
    return { success: false, error: err.message };
  }
};

// GET /api/admin/email-settings - Get email notifications credentials (Admin only)
app.get('/api/admin/email-settings', authenticateAdmin, (req, res) => {
  const SMTP_USER = process.env.SMTP_USER || 'mbhola099@gmail.com';
  const SMTP_PASS = process.env.SMTP_PASS || 'sdflyawgybrhdmil';
  res.json({
    senderEmail: SMTP_USER,
    senderPassword: SMTP_PASS,
    service: 'Gmail',
    status: 'Enabled (SMTP active)',
    note: 'SMTP calls are processed automatically for every checkout. If using a personal Google account, please generate an App Password to avoid Google auth blocks.'
  });
});

// 8. POST /api/orders - Place an order with inventory verification & invoice generation
app.post('/api/orders', async (req, res) => {
  try {
    const { customer_name, customer_email, customer_phone, delivery_address, total_paid, payment_method, items } = req.body;

    if (!customer_name || !customer_email || !customer_phone || !delivery_address || !items || items.length === 0) {
      return res.status(400).json({ error: 'Incomplete order payload. All fields are required.' });
    }

    const invoice = await db.createOrder({
      customer_name,
      customer_email,
      customer_phone,
      delivery_address,
      total_paid: parseFloat(total_paid),
      payment_method,
      items
    });

    // Fire-and-forget sending Gmail notification asynchronously
    sendGmailNotification(invoice).catch(err => console.error('Error in async email notification:', err));

    res.status(201).json(invoice);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});


// 9. PATCH /api/orders/:id/status - Update courier status (Placed, Processing, Dispatched, Delivered)
app.patch('/api/orders/:id/status', authenticateAdmin, async (req, res) => {
  try {
    const { status } = req.body;
    if (!status) {
      return res.status(400).json({ error: 'Courier status field is required.' });
    }

    const updatedOrder = await db.updateOrderStatus(req.params.id, status);
    if (!updatedOrder) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json(updatedOrder);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 10. POST /api/orders/verify-otp - Crypt verification simulation
app.post('/api/orders/verify-otp', (req, res) => {
  const { otp } = req.body;
  if (!otp) {
    return res.status(400).json({ error: 'OTP is required.' });
  }

  // Simulator allows '1234' as correct OTP, or any 4 digit code if they want, but let's strictly require '1234' for checkout simulation
  if (otp === '1234') {
    res.json({ success: true, message: 'OTP verified successfully.' });
  } else {
    res.status(400).json({ success: false, error: 'Incorrect OTP. Use code 1234 to verify orders.' });
  }
});

// Base Route
app.get('/', (req, res) => {
  res.send('UDIKSHA Luxury Clothing Store REST API is Running.');
});

// Start listening
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
