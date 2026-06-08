require('dotenv').config();
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');
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

const JWT_SECRET = process.env.JWT_SECRET || 'udiksha_super_secret_jwt_key_2026';

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

// POST /api/auth/send-otp - Send OTP for Phone Login
app.post('/api/auth/send-otp', (req, res) => {
  try {
    let { phone } = req.body;
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
    
    // Check if phone number belongs to owner or developer
    // Owner: +919519764098 or 9519764098
    // Developer: +918114247911 or 8114247911
    const isAdminPhone = 
      cleanPhone.includes('9519764098') || 
      cleanPhone.includes('8114247911');
      
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

// 0. POST /api/auth/login - Admin Login authentication
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
