-- Migration: Add not_received_reports table for tracking data allocation issues
-- This allows users to report numbers that didn't receive data and admins to manage these reports

CREATE TABLE IF NOT EXISTS not_received_reports (
  id SERIAL PRIMARY KEY,
  order_id VARCHAR NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  order_entry_id INTEGER NOT NULL REFERENCES order_entries(id) ON DELETE CASCADE,
  number VARCHAR(15) NOT NULL,
  allocation_gb DECIMAL(10, 2) NOT NULL,
  reported_by_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  report_date TIMESTAMP DEFAULT NOW(),
  status VARCHAR(20) DEFAULT 'pending' NOT NULL, -- 'pending', 'resolved', 'confirmed_sent'
  resolved_by_admin_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  resolution_date TIMESTAMP,
  admin_notes TEXT,
  evidence_url VARCHAR(500), -- For admin to upload evidence that data was sent
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_not_received_reports_order_id ON not_received_reports(order_id);
CREATE INDEX IF NOT EXISTS idx_not_received_reports_order_entry_id ON not_received_reports(order_entry_id);
CREATE INDEX IF NOT EXISTS idx_not_received_reports_reported_by ON not_received_reports(reported_by_user_id);
CREATE INDEX IF NOT EXISTS idx_not_received_reports_status ON not_received_reports(status);
CREATE INDEX IF NOT EXISTS idx_not_received_reports_number ON not_received_reports(number);

-- Add unique constraint to prevent duplicate reports for the same order entry by the same user
CREATE UNIQUE INDEX IF NOT EXISTS idx_not_received_reports_unique 
ON not_received_reports(order_entry_id, reported_by_user_id);

-- Add comments for documentation
COMMENT ON TABLE not_received_reports IS 'Tracks user reports of numbers that did not receive data allocation';
COMMENT ON COLUMN not_received_reports.status IS 'pending: awaiting admin action, resolved: issue fixed, confirmed_sent: admin confirmed data was sent';
COMMENT ON COLUMN not_received_reports.evidence_url IS 'URL to evidence file uploaded by admin to prove data was sent';