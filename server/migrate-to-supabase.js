import { createClient } from '@supabase/supabase-js';
import Database from 'better-sqlite3';
import dotenv from 'dotenv';

dotenv.config();

// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL || 'https://vkappuaapscvteexogtp.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY is required in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// SQLite database
const db = new Database('./data/socio-copy.db');

// SQL to create all tables - COPY THIS TO SUPABASE SQL EDITOR
const createTablesSQL = `
-- Drop existing tables if they exist (careful in production!)
DROP TABLE IF EXISTS qr_scan_logs CASCADE;
DROP TABLE IF EXISTS attendance_status CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS registrations CASCADE;
DROP TABLE IF EXISTS fests CASCADE;
DROP TABLE IF EXISTS events CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_uuid UUID UNIQUE,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  avatar_url TEXT,
  is_organiser BOOLEAN DEFAULT FALSE,
  course TEXT,
  register_number TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Events table
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  event_date DATE,
  event_time TIME,
  end_date DATE,
  venue TEXT,
  category TEXT,
  department_access JSONB,
  claims_applicable BOOLEAN DEFAULT FALSE,
  registration_fee NUMERIC,
  participants_per_team INTEGER,
  max_participants INTEGER,
  event_image_url TEXT,
  banner_url TEXT,
  pdf_url TEXT,
  rules JSONB,
  schedule JSONB,
  prizes JSONB,
  organizer_email TEXT,
  organizer_phone TEXT,
  whatsapp_invite_link TEXT,
  organizing_dept TEXT,
  fest TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  registration_deadline TIMESTAMPTZ,
  total_participants INTEGER DEFAULT 0
);

-- Fests table
CREATE TABLE fests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fest_id TEXT UNIQUE NOT NULL,
  fest_title TEXT NOT NULL,
  description TEXT,
  opening_date DATE,
  closing_date DATE,
  fest_image_url TEXT,
  organizing_dept TEXT,
  department_access JSONB,
  category TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  event_heads JSONB,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Registrations table
CREATE TABLE registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_id TEXT UNIQUE NOT NULL,
  event_id TEXT,
  user_email TEXT,
  registration_type TEXT CHECK (registration_type IN ('individual', 'team')),
  individual_name TEXT,
  individual_email TEXT,
  individual_register_number TEXT,
  team_name TEXT,
  team_leader_name TEXT,
  team_leader_email TEXT,
  team_leader_register_number TEXT,
  teammates JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  qr_code_data JSONB,
  qr_code_generated_at TIMESTAMPTZ
);

-- Attendance status table
CREATE TABLE attendance_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_id TEXT,
  event_id TEXT,
  status TEXT CHECK (status IN ('attended', 'absent', 'pending')),
  marked_at TIMESTAMPTZ,
  marked_by TEXT
);

-- Notifications table
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email TEXT,
  title TEXT NOT NULL,
  message TEXT,
  type TEXT,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- QR scan logs table
CREATE TABLE qr_scan_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_id TEXT,
  event_id TEXT,
  scanned_by TEXT,
  scan_timestamp TIMESTAMPTZ DEFAULT NOW(),
  scan_result TEXT,
  scanner_info JSONB
);

-- Create indexes for better performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_auth_uuid ON users(auth_uuid);
CREATE INDEX idx_events_event_id ON events(event_id);
CREATE INDEX idx_registrations_event_id ON registrations(event_id);
CREATE INDEX idx_registrations_user_email ON registrations(user_email);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE fests ENABLE ROW LEVEL SECURITY;
ALTER TABLE registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE qr_scan_logs ENABLE ROW LEVEL SECURITY;

-- Create policies to allow all access (you can restrict these later)
CREATE POLICY "Allow all access to users" ON users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to events" ON events FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to fests" ON fests FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to registrations" ON registrations FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to attendance_status" ON attendance_status FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to notifications" ON notifications FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to qr_scan_logs" ON qr_scan_logs FOR ALL USING (true) WITH CHECK (true);
`;

async function migrateUsers() {
  console.log('👤 Migrating users...');
  const users = db.prepare('SELECT * FROM users').all();
  
  if (users.length === 0) {
    console.log('  ℹ️ No users to migrate');
    return;
  }
  
  for (const user of users) {
    const { error } = await supabase.from('users').upsert({
      auth_uuid: user.auth_uuid,
      email: user.email,
      name: user.name,
      avatar_url: user.avatar_url,
      is_organiser: user.is_organiser === 1,
      course: user.course,
      created_at: user.created_at
    }, { onConflict: 'email' });
    
    if (error) {
      console.error(`  ❌ Error: ${user.email} - ${error.message}`);
    } else {
      console.log(`  ✅ ${user.email}`);
    }
  }
}

async function migrateEvents() {
  console.log('\n📅 Migrating events...');
  const events = db.prepare('SELECT * FROM events').all();
  
  if (events.length === 0) {
    console.log('  ℹ️ No events to migrate');
    return;
  }
  
  for (const event of events) {
    const { error } = await supabase.from('events').upsert({
      event_id: event.event_id,
      title: event.title,
      description: event.description,
      event_date: event.event_date,
      event_time: event.event_time,
      end_date: event.end_date,
      venue: event.venue,
      category: event.category,
      department_access: event.department_access ? JSON.parse(event.department_access) : null,
      claims_applicable: event.claims_applicable === 1,
      registration_fee: event.registration_fee,
      participants_per_team: event.participants_per_team,
      max_participants: event.max_participants,
      event_image_url: event.event_image_url,
      banner_url: event.banner_url,
      pdf_url: event.pdf_url,
      rules: event.rules ? JSON.parse(event.rules) : null,
      schedule: event.schedule ? JSON.parse(event.schedule) : null,
      prizes: event.prizes ? JSON.parse(event.prizes) : null,
      organizer_email: event.organizer_email,
      organizer_phone: event.organizer_phone,
      whatsapp_invite_link: event.whatsapp_invite_link,
      organizing_dept: event.organizing_dept,
      fest: event.fest,
      created_by: event.created_by,
      created_at: event.created_at,
      updated_at: event.updated_at,
      registration_deadline: event.registration_deadline,
      total_participants: event.total_participants || 0
    }, { onConflict: 'event_id' });
    
    if (error) {
      console.error(`  ❌ Error: ${event.title} - ${error.message}`);
    } else {
      console.log(`  ✅ ${event.title}`);
    }
  }
}

async function migrateFests() {
  console.log('\n🎉 Migrating fests...');
  const fests = db.prepare('SELECT * FROM fests').all();
  
  if (fests.length === 0) {
    console.log('  ℹ️ No fests to migrate');
    return;
  }
  
  for (const fest of fests) {
    const { error } = await supabase.from('fests').upsert({
      fest_id: fest.fest_id,
      fest_title: fest.fest_title,
      description: fest.description,
      opening_date: fest.opening_date,
      closing_date: fest.closing_date,
      fest_image_url: fest.fest_image_url,
      organizing_dept: fest.organizing_dept,
      department_access: fest.department_access ? JSON.parse(fest.department_access) : null,
      category: fest.category,
      contact_email: fest.contact_email,
      contact_phone: fest.contact_phone,
      event_heads: fest.event_heads ? JSON.parse(fest.event_heads) : null,
      created_by: fest.created_by,
      created_at: fest.created_at
    }, { onConflict: 'fest_id' });
    
    if (error) {
      console.error(`  ❌ Error: ${fest.fest_title} - ${error.message}`);
    } else {
      console.log(`  ✅ ${fest.fest_title}`);
    }
  }
}

async function migrateRegistrations() {
  console.log('\n📝 Migrating registrations...');
  const registrations = db.prepare('SELECT * FROM registrations').all();
  
  if (registrations.length === 0) {
    console.log('  ℹ️ No registrations to migrate');
    return;
  }
  
  for (const reg of registrations) {
    const { error } = await supabase.from('registrations').upsert({
      registration_id: reg.registration_id,
      event_id: reg.event_id,
      user_email: reg.user_email,
      registration_type: reg.registration_type,
      individual_name: reg.individual_name,
      individual_email: reg.individual_email,
      individual_register_number: reg.individual_register_number,
      team_name: reg.team_name,
      team_leader_name: reg.team_leader_name,
      team_leader_email: reg.team_leader_email,
      team_leader_register_number: reg.team_leader_register_number,
      teammates: reg.teammates ? JSON.parse(reg.teammates) : null,
      created_at: reg.created_at,
      qr_code_data: reg.qr_code_data ? JSON.parse(reg.qr_code_data) : null,
      qr_code_generated_at: reg.qr_code_generated_at
    }, { onConflict: 'registration_id' });
    
    if (error) {
      console.error(`  ❌ Error: ${reg.registration_id} - ${error.message}`);
    } else {
      console.log(`  ✅ ${reg.registration_id}`);
    }
  }
}

async function migrateAttendance() {
  console.log('\n✅ Migrating attendance status...');
  const attendance = db.prepare('SELECT * FROM attendance_status').all();
  
  if (attendance.length === 0) {
    console.log('  ℹ️ No attendance records to migrate');
    return;
  }
  
  for (const att of attendance) {
    const { error } = await supabase.from('attendance_status').insert({
      registration_id: att.registration_id,
      event_id: att.event_id,
      status: att.status,
      marked_at: att.marked_at,
      marked_by: att.marked_by
    });
    
    if (error) {
      console.error(`  ❌ Error: ${att.registration_id} - ${error.message}`);
    } else {
      console.log(`  ✅ ${att.registration_id}`);
    }
  }
}

async function migrateQRScanLogs() {
  console.log('\n📱 Migrating QR scan logs...');
  const logs = db.prepare('SELECT * FROM qr_scan_logs').all();
  
  if (logs.length === 0) {
    console.log('  ℹ️ No QR scan logs to migrate');
    return;
  }
  
  for (const log of logs) {
    const { error } = await supabase.from('qr_scan_logs').insert({
      registration_id: log.registration_id,
      event_id: log.event_id,
      scanned_by: log.scanned_by,
      scan_timestamp: log.scan_timestamp,
      scan_result: log.scan_result,
      scanner_info: log.scanner_info ? JSON.parse(log.scanner_info) : null
    });
    
    if (error) {
      console.error(`  ❌ Error: ${log.scan_result} - ${error.message}`);
    } else {
      console.log(`  ✅ ${log.scan_result}`);
    }
  }
}

async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║         SQLite to Supabase Migration Tool                  ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  
  console.log(`📍 Supabase URL: ${supabaseUrl}`);
  console.log(`📁 SQLite DB: ./data/socio-copy.db\n`);
  
  console.log('═'.repeat(62));
  console.log('⚠️  STEP 1: Create tables in Supabase');
  console.log('═'.repeat(62));
  console.log('\n1. Go to: https://supabase.com/dashboard');
  console.log('2. Open your project');
  console.log('3. Click on "SQL Editor" in the left sidebar');
  console.log('4. Click "New Query"');
  console.log('5. Copy and paste the SQL below, then click "Run"\n');
  
  console.log('─'.repeat(62));
  console.log(createTablesSQL);
  console.log('─'.repeat(62));
  
  console.log('\n\n📋 The SQL has also been saved to: supabase-schema.sql');
  
  // Save SQL to file for easy copying
  const fs = await import('fs');
  fs.writeFileSync('./supabase-schema.sql', createTablesSQL);
  
  console.log('\n═'.repeat(62));
  console.log('⚠️  STEP 2: Run migration after creating tables');
  console.log('═'.repeat(62));
  
  const readline = await import('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  const answer = await new Promise(resolve => {
    rl.question('\n✋ Have you created the tables in Supabase? (yes/no): ', resolve);
  });
  rl.close();
  
  if (answer.toLowerCase() !== 'yes' && answer.toLowerCase() !== 'y') {
    console.log('\n⚠️  Please create the tables first, then run this script again.');
    console.log('   You can also run: node migrate-to-supabase.js --migrate-only');
    process.exit(0);
  }
  
  console.log('\n🔄 Starting data migration...\n');
  
  try {
    await migrateUsers();
    await migrateEvents();
    await migrateFests();
    await migrateRegistrations();
    await migrateAttendance();
    await migrateQRScanLogs();
    
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║         ✅ Migration completed successfully!               ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');
    
    // Verify migration
    console.log('📊 Verifying migration...');
    const { count: userCount } = await supabase.from('users').select('*', { count: 'exact', head: true });
    const { count: eventCount } = await supabase.from('events').select('*', { count: 'exact', head: true });
    const { count: regCount } = await supabase.from('registrations').select('*', { count: 'exact', head: true });
    
    console.log(`   👤 Users in Supabase: ${userCount}`);
    console.log(`   📅 Events in Supabase: ${eventCount}`);
    console.log(`   📝 Registrations in Supabase: ${regCount}\n`);
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
  }
  
  db.close();
}

main();
