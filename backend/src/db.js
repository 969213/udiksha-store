const { Pool } = require('pg');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

let sqlite3 = null;

// Check if we are running in cloud/production with PostgreSQL database
let isPostgres = process.env.DATABASE_URL && (
  process.env.DATABASE_URL.startsWith('postgres://') || 
  process.env.DATABASE_URL.startsWith('postgresql://')
);

let db = null;
let pgPool = null;

const initializePg = () => {
  pgPool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false } // Required for hosting platforms like Neon/Render/Supabase
  });
};

const initializeSqlite = () => {
  console.log('Database Engine: SQLite (Local Host)');
  if (!sqlite3) {
    try {
      sqlite3 = require('sqlite3').verbose();
    } catch (err) {
      console.error('Failed to load sqlite3 module. Please run npm install sqlite3:', err.message);
      throw err;
    }
  }
  // Ensure db directory exists
  const dbDir = path.join(__dirname, '../data');
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }
  const dbPath = path.join(dbDir, 'store.db');
  db = new sqlite3.Database(dbPath);
};

if (isPostgres) {
  console.log('Database Engine: PostgreSQL (Cloud Host)');
  initializePg();
} else {
  initializeSqlite();
}

// Convert SQLite '?' placeholders to PostgreSQL '$1', '$2', ... placeholders
function convertPlaceholders(sql) {
  let index = 1;
  return sql.replace(/\?/g, () => `$${index++}`);
}

// Convert SQLite schema definitions to PostgreSQL compatible DDL
function convertDdl(sql) {
  return sql
    .replace(/INTEGER PRIMARY KEY AUTOINCREMENT/g, 'SERIAL PRIMARY KEY')
    .replace(/DATETIME/g, 'TIMESTAMP');
}

// Unified Helper function to run DB actions inside a Promise
const dbRun = (sql, params = []) => {
  if (isPostgres) {
    let pgSql = convertPlaceholders(sql);
    if (pgSql.trim().toUpperCase().includes('CREATE TABLE')) {
      pgSql = convertDdl(pgSql);
    } else if (pgSql.trim().toUpperCase().startsWith('INSERT ')) {
      pgSql += ' RETURNING id';
    }
    return pgPool.query(pgSql, params).then(result => {
      const lastID = result.rows[0]?.id || null;
      return { lastID, changes: result.rowCount };
    });
  } else {
    return new Promise((resolve, reject) => {
      db.run(sql, params, function (err) {
        if (err) reject(err);
        else resolve(this);
      });
    });
  }
};

const dbAll = (sql, params = []) => {
  if (isPostgres) {
    const pgSql = convertPlaceholders(sql);
    return pgPool.query(pgSql, params).then(result => result.rows);
  } else {
    return new Promise((resolve, reject) => {
      db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }
};

const dbGet = (sql, params = []) => {
  if (isPostgres) {
    const pgSql = convertPlaceholders(sql);
    return pgPool.query(pgSql, params).then(result => result.rows[0]);
  } else {
    return new Promise((resolve, reject) => {
      db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }
};

// Initialize Tables and seed them with initial premium luxury clothing data
const initDb = async () => {
  try {
    if (isPostgres) {
      try {
        await pgPool.query('SELECT 1');
        console.log('PostgreSQL connection test successful.');
      } catch (pgError) {
        console.error('PostgreSQL connection failed. Falling back to SQLite:', pgError.message);
        isPostgres = false;
        initializeSqlite();
      }
    }

    // 1. Products Table
    await dbRun(`
      CREATE TABLE IF NOT EXISTS products (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        category TEXT NOT NULL,
        base_price REAL NOT NULL,
        discount_percent INTEGER DEFAULT 0,
        stock_qty INTEGER DEFAULT 0,
        rating REAL DEFAULT 5.0,
        image_url TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 2. Sizes Table
    await dbRun(`
      CREATE TABLE IF NOT EXISTS product_sizes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_id TEXT NOT NULL,
        size_label TEXT NOT NULL,
        FOREIGN KEY(product_id) REFERENCES products(id) ON DELETE CASCADE
      )
    `);

    // 3. Colors Table
    await dbRun(`
      CREATE TABLE IF NOT EXISTS product_colors (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_id TEXT NOT NULL,
        color_name TEXT NOT NULL,
        color_hex TEXT NOT NULL,
        FOREIGN KEY(product_id) REFERENCES products(id) ON DELETE CASCADE
      )
    `);

    // 4. Orders Table
    await dbRun(`
      CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        bill_id TEXT UNIQUE NOT NULL,
        customer_name TEXT NOT NULL,
        customer_email TEXT NOT NULL,
        customer_phone TEXT NOT NULL,
        delivery_address TEXT NOT NULL,
        total_paid REAL NOT NULL,
        payment_method TEXT NOT NULL,
        order_status TEXT DEFAULT 'Placed',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 5. Order Items Table
    await dbRun(`
      CREATE TABLE IF NOT EXISTS order_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id INTEGER NOT NULL,
        product_id TEXT NOT NULL,
        product_title TEXT NOT NULL,
        size_label TEXT NOT NULL,
        color_name TEXT NOT NULL,
        quantity INTEGER NOT NULL,
        price REAL NOT NULL,
        FOREIGN KEY(order_id) REFERENCES orders(id) ON DELETE CASCADE
      )
    `);

    // 6. Users Table (for Admin authentication)
    await dbRun(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT DEFAULT 'admin'
      )
    `);

    // Seed default admin user if not exists or update their credentials
    console.log('Checking for default admin user...');
    const adminUser = await dbGet('SELECT * FROM users WHERE username = ?', ['mbhola099@gmail.com']);
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash('Panditain@#143', salt);
    if (!adminUser) {
      console.log('Seeding admin user: mbhola099@gmail.com...');
      await dbRun(
        'INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)',
        ['mbhola099@gmail.com', hash, 'admin']
      );
      console.log('Admin user seeded successfully!');
    } else {
      console.log('Updating admin user password...');
      await dbRun(
        'UPDATE users SET password_hash = ? WHERE username = ?',
        [hash, 'mbhola099@gmail.com']
      );
      console.log('Admin user password updated successfully!');
    }

    // Check if products already exist. If not, seed them!
    const productCount = await dbGet('SELECT COUNT(*) as count FROM products');
    if (parseInt(productCount.count) === 0) {
      console.log('Seeding initial luxury garments data...');

      const sampleProducts = [
        {
          id: 'prod-001',
          title: 'UDIKSHA Royal Blue Velvet Sherwani',
          description: 'Step into royal elegance. Handcrafted from premium velvet with intricate zari gold embroidery, this sherwani set is custom-tailored for wedding celebrations and special events. Features a mandarin collar and a matching silk churidar bottom.',
          category: 'Sherwani',
          base_price: 12999,
          discount_percent: 15,
          stock_qty: 12,
          rating: 4.9,
          image_url: 'https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?q=80&w=600',
          sizes: ['M', 'L', 'XL', 'XXL'],
          colors: [
            { name: 'Royal Blue', hex: '#1e3a8a' },
            { name: 'Midnight Gold', hex: '#d97706' }
          ]
        },
        {
          id: 'prod-002',
          title: 'UDIKSHA Electric Orange Silk Saree',
          description: 'Experience pure Banarasi silk luxury. Boasting a vibrant electric orange hue paired with a deep royal blue pallu and a thick golden zari border. Perfect for modern Indian weddings, festive rituals, and cultural celebrations.',
          category: 'Saree',
          base_price: 7499,
          discount_percent: 10,
          stock_qty: 8,
          rating: 4.8,
          image_url: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?q=80&w=600',
          sizes: ['Free Size'],
          colors: [
            { name: 'Electric Orange', hex: '#f97316' },
            { name: 'Royal Blue', hex: '#1e3a8a' }
          ]
        },
        {
          id: 'prod-003',
          title: 'UDIKSHA Mustard Gold Handloom Kurta Set',
          description: 'A classic touch of Indian handloom. Crafted from rich cotton-silk fabric, this mustard gold kurta pathani features delicate threadwork around the collar. Light, comfortable, and perfect for pooja ceremonies or festive dinners.',
          category: 'Kurta Set',
          base_price: 3499,
          discount_percent: 20,
          stock_qty: 25,
          rating: 4.7,
          image_url: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?q=80&w=600',
          sizes: ['S', 'M', 'L', 'XL'],
          colors: [
            { name: 'Mustard Gold', hex: '#d97706' },
            { name: 'Royal Blue', hex: '#1e3a8a' }
          ]
        },
        {
          id: 'prod-004',
          title: 'UDIKSHA Indigo Block Print Anarkali Suit',
          description: 'Stunning tiered silhouette with traditional Jaipur block print. The Indigo base features beautiful hand-block floral motifs, completed with a chiffon dupatta and comfortable palazzo pants. Made from 100% breathable premium cotton.',
          category: 'Anarkali',
          base_price: 4999,
          discount_percent: 12,
          stock_qty: 15,
          rating: 4.6,
          image_url: 'https://images.unsplash.com/photo-1608748010899-18f300247112?q=80&w=600',
          sizes: ['S', 'M', 'L', 'XL'],
          colors: [
            { name: 'Indigo Blue', hex: '#1d4ed8' },
            { name: 'Teal Blue', hex: '#0d9488' }
          ]
        },
        {
          id: 'prod-005',
          title: 'UDIKSHA Royal Blue Linen Blazer',
          description: 'Modern luxury meets western design. Tailored from highly breathable premium Belgian linen, this double-vented blazer offers a structured shoulder cut and soft interior lining. Excellent for evening parties or casual-chic business wear.',
          category: 'Western Wear',
          base_price: 5999,
          discount_percent: 18,
          stock_qty: 10,
          rating: 4.9,
          image_url: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?q=80&w=600',
          sizes: ['M', 'L', 'XL'],
          colors: [
            { name: 'Royal Blue', hex: '#1e3a8a' },
            { name: 'Slate Grey', hex: '#64748b' }
          ]
        },
        {
          id: 'prod-006',
          title: 'UDIKSHA Sunset Orange Fusion Lehenga',
          description: 'Create a stunning look. Features an electric orange layered Georgette skirt paired with a Royal Blue gold-embroidered bustier top. Comes with a translucent net dupatta. An eye-catching fusion outfit for modern celebrations.',
          category: 'Lehenga',
          base_price: 15999,
          discount_percent: 15,
          stock_qty: 5,
          rating: 5.0,
          image_url: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?q=80&w=600',
          sizes: ['S', 'M', 'L'],
          colors: [
            { name: 'Electric Orange', hex: '#f97316' },
            { name: 'Royal Blue', hex: '#1e3a8a' },
            { name: 'Rose Pink', hex: '#f43f5e' }
          ]
        }
      ];

      for (const p of sampleProducts) {
        await dbRun(
          `INSERT INTO products (id, title, description, category, base_price, discount_percent, stock_qty, rating, image_url)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [p.id, p.title, p.description, p.category, p.base_price, p.discount_percent, p.stock_qty, p.rating, p.image_url]
        );

        for (const size of p.sizes) {
          await dbRun('INSERT INTO product_sizes (product_id, size_label) VALUES (?, ?)', [p.id, size]);
        }

        for (const color of p.colors) {
          await dbRun('INSERT INTO product_colors (product_id, color_name, color_hex) VALUES (?, ?, ?)', [p.id, color.name, color.hex]);
        }
      }
      console.log('Database seeded successfully!');
    }
  } catch (error) {
    console.error('Error initializing database:', error);
  }
};

// Query Operations
const getProducts = async (filters = {}) => {
  let query = 'SELECT * FROM products WHERE 1=1';
  const params = [];

  if (filters.search) {
    query += ' AND (title LIKE ? OR description LIKE ?)';
    const searchParam = `%${filters.search}%`;
    params.push(searchParam, searchParam);
  }

  if (filters.category && filters.category !== 'All') {
    query += ' AND category = ?';
    params.push(filters.category);
  }

  // Sort logic
  if (filters.sort) {
    if (filters.sort === 'price-low-high') {
      query += ' ORDER BY (base_price * (1 - discount_percent/100.0)) ASC';
    } else if (filters.sort === 'price-high-low') {
      query += ' ORDER BY (base_price * (1 - discount_percent/100.0)) DESC';
    } else if (filters.sort === 'rating') {
      query += ' ORDER BY rating DESC';
    } else {
      query += ' ORDER BY created_at DESC';
    }
  } else {
    query += ' ORDER BY created_at DESC';
  }

  const productsList = await dbAll(query, params);

  // Fetch colors and sizes for each product to make it rich
  for (const product of productsList) {
    product.sizes = (await dbAll('SELECT size_label FROM product_sizes WHERE product_id = ?', [product.id]))
      .map(row => row.size_label);
    product.colors = await dbAll('SELECT color_name as name, color_hex as hex FROM product_colors WHERE product_id = ?', [product.id]);
  }

  return productsList;
};

const getProductById = async (id) => {
  const product = await dbGet('SELECT * FROM products WHERE id = ?', [id]);
  if (product) {
    product.sizes = (await dbAll('SELECT size_label FROM product_sizes WHERE product_id = ?', [id]))
      .map(row => row.size_label);
    product.colors = await dbAll('SELECT color_name as name, color_hex as hex FROM product_colors WHERE product_id = ?', [id]);
  }
  return product;
};

const getCategories = async () => {
  const rows = await dbAll('SELECT DISTINCT category FROM products');
  return ['All', ...rows.map(row => row.category)];
};

const createProduct = async (product) => {
  const { id, title, description, category, base_price, discount_percent, stock_qty, rating, image_url, sizes = [], colors = [] } = product;
  
  await dbRun(
    `INSERT INTO products (id, title, description, category, base_price, discount_percent, stock_qty, rating, image_url)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, title, description, category, base_price, discount_percent, stock_qty, rating || 5.0, image_url]
  );

  for (const size of sizes) {
    await dbRun('INSERT INTO product_sizes (product_id, size_label) VALUES (?, ?)', [id, size]);
  }

  for (const color of colors) {
    await dbRun('INSERT INTO product_colors (product_id, color_name, color_hex) VALUES (?, ?, ?)', [id, color.name, color.hex]);
  }

  return getProductById(id);
};

const updateProduct = async (id, product) => {
  const { title, description, category, base_price, discount_percent, stock_qty, rating, image_url, sizes, colors } = product;

  await dbRun(
    `UPDATE products 
     SET title = ?, description = ?, category = ?, base_price = ?, discount_percent = ?, stock_qty = ?, rating = ?, image_url = ?
     WHERE id = ?`,
    [title, description, category, base_price, discount_percent, stock_qty, rating, image_url, id]
  );

  if (sizes) {
    await dbRun('DELETE FROM product_sizes WHERE product_id = ?', [id]);
    for (const size of sizes) {
      await dbRun('INSERT INTO product_sizes (product_id, size_label) VALUES (?, ?)', [id, size]);
    }
  }

  if (colors) {
    await dbRun('DELETE FROM product_colors WHERE product_id = ?', [id]);
    for (const color of colors) {
      await dbRun('INSERT INTO product_colors (product_id, color_name, color_hex) VALUES (?, ?, ?)', [id, color.name, color.hex]);
    }
  }

  return getProductById(id);
};

const deleteProduct = async (id) => {
  await dbRun('DELETE FROM product_sizes WHERE product_id = ?', [id]);
  await dbRun('DELETE FROM product_colors WHERE product_id = ?', [id]);
  await dbRun('DELETE FROM products WHERE id = ?', [id]);
  return { success: true };
};

const createOrder = async (orderPayload) => {
  const { customer_name, customer_email, customer_phone, delivery_address, total_paid, payment_method, items } = orderPayload;
  
  // Generate dynamic bill ID, e.g., UDK-2026-0001
  const countRow = await dbGet('SELECT COUNT(*) as count FROM orders');
  const sequentialNum = String(countRow.count + 1).padStart(4, '0');
  const currentYear = new Date().getFullYear();
  const billId = `UDK-${currentYear}-${sequentialNum}`;

  // Check and deduct stock
  for (const item of items) {
    const p = await dbGet('SELECT stock_qty, title FROM products WHERE id = ?', [item.product_id]);
    if (!p) {
      throw new Error(`Product ${item.product_id} not found.`);
    }
    if (p.stock_qty < item.quantity) {
      throw new Error(`Insufficient stock for product ${p.title}. Only ${p.stock_qty} left.`);
    }
  }

  // Deduct stock
  for (const item of items) {
    await dbRun('UPDATE products SET stock_qty = stock_qty - ? WHERE id = ?', [item.quantity, item.product_id]);
  }

  // Insert Order
  const result = await dbRun(
    `INSERT INTO orders (bill_id, customer_name, customer_email, customer_phone, delivery_address, total_paid, payment_method, order_status)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'Placed')`,
    [billId, customer_name, customer_email, customer_phone, delivery_address, total_paid, payment_method]
  );
  
  const orderId = result.lastID;

  // Insert Order Items
  for (const item of items) {
    await dbRun(
      `INSERT INTO order_items (order_id, product_id, product_title, size_label, color_name, quantity, price)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [orderId, item.product_id, item.product_title, item.size_label, item.color_name, item.quantity, item.price]
    );
  }

  return {
    order_id: orderId,
    bill_id: billId,
    customer_name,
    customer_email,
    total_paid,
    payment_method,
    order_status: 'Placed',
    created_at: new Date().toISOString()
  };
};

const getOrders = async () => {
  const ordersList = await dbAll('SELECT * FROM orders ORDER BY id DESC');
  for (const order of ordersList) {
    order.items = await dbAll('SELECT * FROM order_items WHERE order_id = ?', [order.id]);
  }
  return ordersList;
};

const updateOrderStatus = async (id, status) => {
  await dbRun('UPDATE orders SET order_status = ? WHERE id = ?', [status, id]);
  const order = await dbGet('SELECT * FROM orders WHERE id = ?', [id]);
  if (order) {
    order.items = await dbAll('SELECT * FROM order_items WHERE order_id = ?', [id]);
  }
  return order;
};

const getUserByUsername = async (username) => {
  return dbGet('SELECT * FROM users WHERE username = ?', [username]);
};

// Export init function and query methods
module.exports = {
  initDb,
  getProducts,
  getProductById,
  getCategories,
  createProduct,
  updateProduct,
  deleteProduct,
  createOrder,
  getOrders,
  updateOrderStatus,
  getUserByUsername
};
