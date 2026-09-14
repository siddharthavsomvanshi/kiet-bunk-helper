-- =============================================================================
-- SMART DAILY ATTENDANCE NOTIFICATIONS SUBSYSTEM
-- Isolated Supabase Schema Migration (v1)
-- =============================================================================
-- This file defines isolated tables for push subscriptions, read-only
-- attendance/schedule snapshots, and notification delivery/idempotency logs.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. PUSH SUBSCRIPTIONS TABLE
-- Stores Web Push subscriptions for students across multiple devices.
-- Multiple subscriptions per user_hash are allowed (e.g. phone + laptop).
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS push_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_hash TEXT NOT NULL,
    student_name TEXT, -- Optional, used solely for notification greeting
    endpoint TEXT NOT NULL UNIQUE, -- Unique Web Push subscription endpoint URL
    p256dh TEXT NOT NULL, -- Web Push subscription public key
    auth TEXT NOT NULL, -- Web Push subscription authentication secret
    enabled BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for retrieving all endpoints for a specific student hash
CREATE INDEX IF NOT EXISTS idx_push_sub_user_hash ON push_subscriptions(user_hash);

-- Partial index for fast lookup of active subscribers by cron runner
CREATE INDEX IF NOT EXISTS idx_push_sub_enabled ON push_subscriptions(enabled) WHERE enabled = true;

-- Auto-update trigger for updated_at column
CREATE OR REPLACE FUNCTION notification_update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_push_subscriptions_updated_at ON push_subscriptions;
CREATE TRIGGER update_push_subscriptions_updated_at
BEFORE UPDATE ON push_subscriptions
FOR EACH ROW
EXECUTE FUNCTION notification_update_timestamp();


-- -----------------------------------------------------------------------------
-- 2. DAILY ATTENDANCE SNAPSHOTS TABLE
-- Stores read-only attendance + schedule snapshots captured when the student
-- last checked attendance in the app.
-- DOES NOT store CyberVidya passwords, OTPs, or active session tokens.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS daily_attendance_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_hash TEXT NOT NULL,
    student_name TEXT, -- Student full name
    captured_at TIMESTAMPTZ NOT NULL, -- Client-side timestamp when attendance was checked
    attendance_data JSONB NOT NULL, -- Array of course components with present/total counts
    schedule_data JSONB NOT NULL, -- Weekly class timetable
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Migration for existing database instances:
-- ALTER TABLE daily_attendance_snapshots ADD COLUMN IF NOT EXISTS student_name TEXT;

-- Composite index for fast retrieval of the latest snapshot for a user
CREATE INDEX IF NOT EXISTS idx_snapshots_user_captured ON daily_attendance_snapshots(user_hash, captured_at DESC);


-- -----------------------------------------------------------------------------
-- 3. NOTIFICATION DELIVERY LOGS TABLE
-- Idempotency log preventing duplicate daily notifications per student.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notification_delivery_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_hash TEXT NOT NULL,
    notification_date DATE NOT NULL, -- Date in IST (YYYY-MM-DD)
    notification_type TEXT NOT NULL DEFAULT 'daily_attendance_plan',
    idempotency_key TEXT NOT NULL UNIQUE, -- Logical key: user_hash:notification_date:notification_type
    status TEXT NOT NULL CHECK (status IN ('success', 'failed', 'expired_subscription', 'skipped_no_classes')),
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for querying logs by student and date
CREATE INDEX IF NOT EXISTS idx_logs_user_date ON notification_delivery_logs(user_hash, notification_date);


-- -----------------------------------------------------------------------------
-- SECURITY & ROW LEVEL SECURITY (RLS) POLICIES
-- Strict Isolation: Direct public/anon client access is completely DISABLED.
-- All database interactions must occur via authenticated serverless API routes
-- utilizing the SUPABASE_SERVICE_ROLE_KEY.
-- -----------------------------------------------------------------------------
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_attendance_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_delivery_logs ENABLE ROW LEVEL SECURITY;

-- Revoke all direct permissions from public and anonymous roles
REVOKE ALL ON push_subscriptions FROM anon, authenticated;
REVOKE ALL ON daily_attendance_snapshots FROM anon, authenticated;
REVOKE ALL ON notification_delivery_logs FROM anon, authenticated;
