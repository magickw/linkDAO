-- Project Management Tools Migration
-- This migration adds enhanced project management features for service bookings

-- Time tracking table for hourly services
CREATE TABLE time_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES service_bookings(id),
    milestone_id UUID REFERENCES service_milestones(id),
    provider_id UUID NOT NULL REFERENCES users(id),
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP,
    duration_minutes INTEGER, -- Calculated field
    description TEXT,
    is_billable BOOLEAN DEFAULT true,
    hourly_rate DECIMAL(20,8),
    total_amount DECIMAL(20,8), -- duration * hourly_rate
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'cancelled')),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Project timeline and deliverables tracking
CREATE TABLE project_deliverables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES service_bookings(id),
    milestone_id UUID REFERENCES service_milestones(id),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    deliverable_type VARCHAR(50) NOT NULL CHECK (deliverable_type IN ('file', 'link', 'text', 'code', 'design')),
    file_hash VARCHAR(128), -- IPFS hash for files
    file_name VARCHAR(255),
    file_size BIGINT,
    file_type VARCHAR(100),
    content TEXT, -- For text deliverables
    url VARCHAR(500), -- For link deliverables
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'submitted', 'approved', 'rejected')),
    submitted_at TIMESTAMP,
    reviewed_at TIMESTAMP,
    client_feedback TEXT,
    revision_notes TEXT,
    version_number INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Enhanced milestone payments with escrow integration
CREATE TABLE milestone_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    milestone_id UUID NOT NULL REFERENCES service_milestones(id),
    booking_id UUID NOT NULL REFERENCES service_bookings(id),
    amount DECIMAL(20,8) NOT NULL,
    currency VARCHAR(10) NOT NULL,
    payment_method VARCHAR(20) NOT NULL CHECK (payment_method IN ('crypto', 'fiat', 'escrow')),
    escrow_contract VARCHAR(66), -- Smart contract address for crypto payments
    payment_processor_id VARCHAR(100), -- Stripe/PayPal transaction ID for fiat
    transaction_hash VARCHAR(66), -- Blockchain transaction hash
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'held', 'released', 'refunded', 'disputed')),
    held_until TIMESTAMP, -- When payment will be auto-released
    release_conditions TEXT, -- JSON describing release conditions
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Project communication threads (enhanced messaging)
CREATE TABLE project_threads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES service_bookings(id),
    milestone_id UUID REFERENCES service_milestones(id),
    thread_type VARCHAR(30) NOT NULL CHECK (thread_type IN ('general', 'milestone', 'deliverable', 'payment', 'support')),
    title VARCHAR(255) NOT NULL,
    is_private BOOLEAN DEFAULT false, -- Private between client and provider
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Enhanced messages with thread support and file sharing
CREATE TABLE project_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    thread_id UUID NOT NULL REFERENCES project_threads(id),
    booking_id UUID NOT NULL REFERENCES service_bookings(id),
    sender_id UUID NOT NULL REFERENCES users(id),
    message_type VARCHAR(20) DEFAULT 'text' CHECK (message_type IN ('text', 'file', 'image', 'code', 'milestone_update', 'payment_update', 'system')),
    content TEXT,
    file_attachments JSONB, -- Array of file objects with metadata
    code_language VARCHAR(50), -- For code snippets
    is_read BOOLEAN DEFAULT false,
    is_pinned BOOLEAN DEFAULT false,
    reply_to UUID REFERENCES project_messages(id), -- For threaded replies
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Project approval workflow
CREATE TABLE project_approvals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES service_bookings(id),
    milestone_id UUID REFERENCES service_milestones(id),
    deliverable_id UUID REFERENCES project_deliverables(id),
    approver_id UUID NOT NULL REFERENCES users(id), -- Usually the client
    approval_type VARCHAR(30) NOT NULL CHECK (approval_type IN ('milestone', 'deliverable', 'payment', 'completion')),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'changes_requested')),
    feedback TEXT,
    approved_at TIMESTAMP,
    auto_approve_at TIMESTAMP, -- Automatic approval deadline
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Project activity log for timeline tracking
CREATE TABLE project_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES service_bookings(id),
    milestone_id UUID REFERENCES service_milestones(id),
    user_id UUID NOT NULL REFERENCES users(id),
    activity_type VARCHAR(50) NOT NULL,
    description TEXT NOT NULL,
    metadata JSONB, -- Additional activity data
    created_at TIMESTAMP DEFAULT NOW()
);

-- File sharing and version control
CREATE TABLE project_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES service_bookings(id),
    milestone_id UUID REFERENCES service_milestones(id),
    deliverable_id UUID REFERENCES project_deliverables(id),
    uploader_id UUID NOT NULL REFERENCES users(id),
    file_name VARCHAR(255) NOT NULL,
    file_hash VARCHAR(128) NOT NULL, -- IPFS hash
    file_size BIGINT NOT NULL,
    file_type VARCHAR(100) NOT NULL,
    version_number INTEGER DEFAULT 1,
    is_current_version BOOLEAN DEFAULT true,
    access_level VARCHAR(20) DEFAULT 'project' CHECK (access_level IN ('public', 'project', 'milestone', 'private')),
    download_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_time_tracking_booking_id ON time_tracking(booking_id);
CREATE INDEX idx_time_tracking_provider_id ON time_tracking(provider_id);
CREATE INDEX idx_time_tracking_start_time ON time_tracking(start_time);
CREATE INDEX idx_project_deliverables_booking_id ON project_deliverables(booking_id);
CREATE INDEX idx_project_deliverables_milestone_id ON project_deliverables(milestone_id);
CREATE INDEX idx_project_deliverables_status ON project_deliverables(status);
CREATE INDEX idx_milestone_payments_milestone_id ON milestone_payments(milestone_id);
CREATE INDEX idx_milestone_payments_status ON milestone_payments(status);
CREATE INDEX idx_project_threads_booking_id ON project_threads(booking_id);
CREATE INDEX idx_project_messages_thread_id ON project_messages(thread_id);
CREATE INDEX idx_project_messages_booking_id ON project_messages(booking_id);
CREATE INDEX idx_project_approvals_booking_id ON project_approvals(booking_id);
CREATE INDEX idx_project_approvals_status ON project_approvals(status);
CREATE INDEX idx_project_activities_booking_id ON project_activities(booking_id);
CREATE INDEX idx_project_activities_created_at ON project_activities(created_at);
CREATE INDEX idx_project_files_booking_id ON project_files(booking_id);
CREATE INDEX idx_project_files_file_hash ON project_files(file_hash);

-- Add triggers for automatic activity logging
CREATE OR REPLACE FUNCTION log_project_activity()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO project_activities (booking_id, milestone_id, user_id, activity_type, description, metadata)
        VALUES (
            COALESCE(NEW.booking_id, (SELECT booking_id FROM service_milestones WHERE id = NEW.milestone_id)),
            NEW.milestone_id,
            COALESCE(NEW.provider_id, NEW.uploader_id, NEW.sender_id, NEW.created_by),
            TG_TABLE_NAME || '_created',
            'New ' || TG_TABLE_NAME || ' created',
            row_to_json(NEW)
        );
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO project_activities (booking_id, milestone_id, user_id, activity_type, description, metadata)
        VALUES (
            COALESCE(NEW.booking_id, (SELECT booking_id FROM service_milestones WHERE id = NEW.milestone_id)),
            NEW.milestone_id,
            COALESCE(NEW.provider_id, NEW.uploader_id, NEW.sender_id, NEW.created_by),
            TG_TABLE_NAME || '_updated',
            TG_TABLE_NAME || ' updated',
            jsonb_build_object('old', row_to_json(OLD), 'new', row_to_json(NEW))
        );
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create triggers for activity logging
CREATE TRIGGER trigger_log_milestone_activity
    AFTER INSERT OR UPDATE ON service_milestones
    FOR EACH ROW EXECUTE FUNCTION log_project_activity();

CREATE TRIGGER trigger_log_deliverable_activity
    AFTER INSERT OR UPDATE ON project_deliverables
    FOR EACH ROW EXECUTE FUNCTION log_project_activity();

CREATE TRIGGER trigger_log_payment_activity
    AFTER INSERT OR UPDATE ON milestone_payments
    FOR EACH ROW EXECUTE FUNCTION log_project_activity();

CREATE TRIGGER trigger_log_approval_activity
    AFTER INSERT OR UPDATE ON project_approvals
    FOR EACH ROW EXECUTE FUNCTION log_project_activity();