-- Services Marketplace Migration
-- This migration adds tables for service listings, bookings, and scheduling

-- Service categories table
CREATE TABLE service_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    parent_id UUID REFERENCES service_categories(id),
    icon VARCHAR(50),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Services table
CREATE TABLE services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id UUID NOT NULL REFERENCES users(id),
    category_id UUID NOT NULL REFERENCES service_categories(id),
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    short_description VARCHAR(500),
    pricing_model VARCHAR(20) NOT NULL CHECK (pricing_model IN ('fixed', 'hourly', 'milestone')),
    base_price DECIMAL(20,8) NOT NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'USD',
    duration_minutes INTEGER, -- For fixed services
    is_remote BOOLEAN DEFAULT true,
    location_required BOOLEAN DEFAULT false,
    service_location TEXT, -- JSON for location data
    tags TEXT[], -- Array of tags
    requirements TEXT, -- What client needs to provide
    deliverables TEXT, -- What will be delivered
    portfolio_items TEXT[], -- Array of IPFS hashes for portfolio
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'paused', 'inactive')),
    featured BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Service availability table
CREATE TABLE service_availability (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_id UUID NOT NULL REFERENCES services(id),
    day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0 = Sunday
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    timezone VARCHAR(50) NOT NULL DEFAULT 'UTC',
    is_available BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Service bookings table
CREATE TABLE service_bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_id UUID NOT NULL REFERENCES services(id),
    client_id UUID NOT NULL REFERENCES users(id),
    provider_id UUID NOT NULL REFERENCES users(id),
    booking_type VARCHAR(20) NOT NULL CHECK (booking_type IN ('consultation', 'project', 'ongoing')),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'in_progress', 'completed', 'cancelled', 'disputed')),
    scheduled_start TIMESTAMP,
    scheduled_end TIMESTAMP,
    actual_start TIMESTAMP,
    actual_end TIMESTAMP,
    total_amount DECIMAL(20,8) NOT NULL,
    currency VARCHAR(10) NOT NULL,
    payment_status VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'released', 'refunded')),
    escrow_contract VARCHAR(66), -- Smart contract address
    client_requirements TEXT,
    provider_notes TEXT,
    meeting_link VARCHAR(500), -- For remote services
    location_details TEXT, -- JSON for in-person services
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Service milestones table (for milestone-based pricing)
CREATE TABLE service_milestones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES service_bookings(id),
    milestone_number INTEGER NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    amount DECIMAL(20,8) NOT NULL,
    due_date TIMESTAMP,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'approved', 'disputed')),
    deliverables TEXT[], -- Array of IPFS hashes
    client_feedback TEXT,
    completed_at TIMESTAMP,
    approved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Service reviews table (extends the existing reviews system)
CREATE TABLE service_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES service_bookings(id),
    reviewer_id UUID NOT NULL REFERENCES users(id),
    reviewee_id UUID NOT NULL REFERENCES users(id),
    service_id UUID NOT NULL REFERENCES services(id),
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    communication_rating INTEGER CHECK (communication_rating >= 1 AND communication_rating <= 5),
    quality_rating INTEGER CHECK (quality_rating >= 1 AND quality_rating <= 5),
    timeliness_rating INTEGER CHECK (timeliness_rating >= 1 AND timeliness_rating <= 5),
    title VARCHAR(200),
    comment TEXT,
    would_recommend BOOLEAN,
    ipfs_hash VARCHAR(128),
    blockchain_tx_hash VARCHAR(66),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Service provider profiles table
CREATE TABLE service_provider_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) UNIQUE,
    business_name VARCHAR(255),
    tagline VARCHAR(500),
    bio TEXT,
    skills TEXT[], -- Array of skills
    certifications TEXT[], -- Array of certification IPFS hashes
    languages TEXT[], -- Array of language codes
    response_time_hours INTEGER DEFAULT 24,
    availability_timezone VARCHAR(50) DEFAULT 'UTC',
    portfolio_description TEXT,
    years_experience INTEGER,
    education TEXT,
    website_url VARCHAR(500),
    linkedin_url VARCHAR(500),
    github_url VARCHAR(500),
    is_verified BOOLEAN DEFAULT false,
    verification_documents TEXT[], -- Array of IPFS hashes
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Service messages table (for client-provider communication)
CREATE TABLE service_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES service_bookings(id),
    sender_id UUID NOT NULL REFERENCES users(id),
    recipient_id UUID NOT NULL REFERENCES users(id),
    message_type VARCHAR(20) DEFAULT 'text' CHECK (message_type IN ('text', 'file', 'milestone_update', 'system')),
    content TEXT,
    file_attachments TEXT[], -- Array of IPFS hashes
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_services_provider_id ON services(provider_id);
CREATE INDEX idx_services_category_id ON services(category_id);
CREATE INDEX idx_services_status ON services(status);
CREATE INDEX idx_service_bookings_client_id ON service_bookings(client_id);
CREATE INDEX idx_service_bookings_provider_id ON service_bookings(provider_id);
CREATE INDEX idx_service_bookings_status ON service_bookings(status);
CREATE INDEX idx_service_availability_service_id ON service_availability(service_id);
CREATE INDEX idx_service_milestones_booking_id ON service_milestones(booking_id);
CREATE INDEX idx_service_reviews_service_id ON service_reviews(service_id);
CREATE INDEX idx_service_messages_booking_id ON service_messages(booking_id);

-- Insert default service categories
INSERT INTO service_categories (name, description, icon) VALUES
('Digital Services', 'Web development, design, marketing, and other digital services', 'computer'),
('Consulting', 'Business consulting, strategy, and advisory services', 'briefcase'),
('Local Services', 'In-person services like cleaning, repair, tutoring', 'map-pin'),
('Creative Services', 'Art, writing, music, and creative content creation', 'palette'),
('Technical Services', 'Programming, IT support, and technical consulting', 'code'),
('Marketing & Sales', 'Digital marketing, content creation, and sales support', 'megaphone'),
('Education & Training', 'Online courses, tutoring, and skill development', 'graduation-cap'),
('Health & Wellness', 'Fitness coaching, nutrition, and wellness services', 'heart');

-- Insert subcategories for Digital Services
INSERT INTO service_categories (name, description, parent_id, icon) 
SELECT 'Web Development', 'Frontend, backend, and full-stack development', id, 'globe' 
FROM service_categories WHERE name = 'Digital Services';

INSERT INTO service_categories (name, description, parent_id, icon) 
SELECT 'Graphic Design', 'Logo design, branding, and visual content', id, 'image' 
FROM service_categories WHERE name = 'Digital Services';

INSERT INTO service_categories (name, description, parent_id, icon) 
SELECT 'Content Writing', 'Blog posts, copywriting, and content creation', id, 'edit' 
FROM service_categories WHERE name = 'Digital Services';

INSERT INTO service_categories (name, description, parent_id, icon) 
SELECT 'SEO & Marketing', 'Search optimization and digital marketing', id, 'trending-up' 
FROM service_categories WHERE name = 'Digital Services';