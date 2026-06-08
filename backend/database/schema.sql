-- UDIKSHA Luxury Clothing Store - PostgreSQL DDL Schema

-- 1. Products Table
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(100) NOT NULL,
    base_price NUMERIC(10, 2) NOT NULL,
    discount_percent INTEGER DEFAULT 0,
    stock_qty INTEGER DEFAULT 0,
    rating DECIMAL(2, 1) DEFAULT 5.0,
    image_url TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Product Sizes Table
CREATE TABLE product_sizes (
    id SERIAL PRIMARY KEY,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    size_label VARCHAR(10) NOT NULL -- 'S', 'M', 'L', 'XL', 'XXL', etc.
);

-- 3. Product Colors Table
CREATE TABLE product_colors (
    id SERIAL PRIMARY KEY,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    color_name VARCHAR(50) NOT NULL, -- e.g., 'Royal Blue'
    color_hex VARCHAR(7) NOT NULL     -- e.g., '#1e3a8a'
);

-- 4. Orders Table
CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    bill_id VARCHAR(50) UNIQUE NOT NULL, -- e.g., 'UDK-2026-0001'
    customer_name VARCHAR(255) NOT NULL,
    customer_email VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(20) NOT NULL,
    delivery_address TEXT NOT NULL,
    total_paid NUMERIC(10, 2) NOT NULL,
    payment_method VARCHAR(50) NOT NULL, -- 'UPI', 'Credit Card', etc.
    order_status VARCHAR(50) DEFAULT 'Placed', -- 'Placed', 'Processing', 'Dispatched', 'Delivered'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Order Items Table
CREATE TABLE order_items (
    id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id),
    product_title VARCHAR(255) NOT NULL,
    size_label VARCHAR(10) NOT NULL,
    color_name VARCHAR(50) NOT NULL,
    quantity INTEGER NOT NULL,
    price NUMERIC(10, 2) NOT NULL
);
