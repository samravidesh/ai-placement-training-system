-- Users table for authentication module
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password TEXT NOT NULL,
  branch VARCHAR(120) NOT NULL,
  education_level VARCHAR(120) NOT NULL,
  interest_type VARCHAR(20) NOT NULL CHECK (interest_type IN ('govt', 'private', 'tech', 'non-tech')),
  onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE users
  ALTER COLUMN name SET DEFAULT 'New User',
  ALTER COLUMN branch SET DEFAULT 'Not specified',
  ALTER COLUMN education_level SET DEFAULT 'Not specified',
  ALTER COLUMN interest_type SET DEFAULT 'tech';

-- Skill assessment table
CREATE TABLE IF NOT EXISTS skill_assessments (
  id SERIAL PRIMARY KEY,
  user_id INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  aptitude_score NUMERIC(5,2) NOT NULL CHECK (aptitude_score >= 0 AND aptitude_score <= 100),
  communication_score NUMERIC(5,2) NOT NULL CHECK (communication_score >= 0 AND communication_score <= 100),
  psychometric_score NUMERIC(5,2) NOT NULL CHECK (psychometric_score >= 0 AND psychometric_score <= 100),
  overall_rating NUMERIC(5,2) NOT NULL CHECK (overall_rating >= 0 AND overall_rating <= 100),
  profile_rating_percentage NUMERIC(5,2) NOT NULL CHECK (profile_rating_percentage >= 0 AND profile_rating_percentage <= 100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Jobs table
CREATE TABLE IF NOT EXISTS jobs (
  id SERIAL PRIMARY KEY,
  company_name VARCHAR(180) NOT NULL,
  job_role VARCHAR(180) NOT NULL,
  package_offered NUMERIC(10,2) NOT NULL CHECK (package_offered >= 0),
  job_type VARCHAR(100) NOT NULL,
  required_skills TEXT NOT NULL,
  location VARCHAR(180) NOT NULL,
  interest_type VARCHAR(20) NOT NULL CHECK (interest_type IN ('govt', 'private', 'tech', 'non-tech')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Job applications table
CREATE TABLE IF NOT EXISTS job_applications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  job_id INTEGER NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  status VARCHAR(50) NOT NULL DEFAULT 'applied',
  applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (user_id, job_id)
);

-- Company analytics table
CREATE TABLE IF NOT EXISTS company_analytics (
  id SERIAL PRIMARY KEY,
  company_name VARCHAR(180) NOT NULL,
  total_hires_last_3_years INTEGER NOT NULL CHECK (total_hires_last_3_years >= 0),
  average_package NUMERIC(10,2) NOT NULL CHECK (average_package >= 0),
  roles_offered TEXT[] NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Training courses table
CREATE TABLE IF NOT EXISTS training_courses (
  id SERIAL PRIMARY KEY,
  course_name VARCHAR(180) NOT NULL,
  description TEXT NOT NULL,
  duration_weeks INTEGER NOT NULL CHECK (duration_weeks > 0),
  level VARCHAR(60) NOT NULL DEFAULT 'beginner',
  provider VARCHAR(120) NOT NULL DEFAULT 'Internal',
  category VARCHAR(80) NOT NULL DEFAULT 'General',
  course_link TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE training_courses
  ADD COLUMN IF NOT EXISTS provider VARCHAR(120) NOT NULL DEFAULT 'Internal',
  ADD COLUMN IF NOT EXISTS category VARCHAR(80) NOT NULL DEFAULT 'General',
  ADD COLUMN IF NOT EXISTS course_link TEXT;

CREATE INDEX IF NOT EXISTS idx_training_courses_category ON training_courses (category);
CREATE INDEX IF NOT EXISTS idx_training_courses_provider ON training_courses (provider);

-- Course assignments table
CREATE TABLE IF NOT EXISTS course_assignments (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id INTEGER NOT NULL REFERENCES training_courses(id) ON DELETE CASCADE,
  assigned_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  start_date DATE,
  target_end_date DATE,
  status VARCHAR(50) NOT NULL DEFAULT 'assigned',
  completion_percentage NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (completion_percentage >= 0 AND completion_percentage <= 100),
  assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (user_id, course_id)
);

-- 6 month structured training plan table
CREATE TABLE IF NOT EXISTS training_plans (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  month_no INTEGER NOT NULL CHECK (month_no >= 1 AND month_no <= 6),
  module_title VARCHAR(200) NOT NULL,
  key_outcomes TEXT NOT NULL,
  workshop_module VARCHAR(200) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (user_id, month_no)
);

-- Workshop catalog table
CREATE TABLE IF NOT EXISTS workshops (
  id SERIAL PRIMARY KEY,
  title VARCHAR(180) NOT NULL,
  description TEXT NOT NULL,
  scheduled_date DATE,
  duration_hours NUMERIC(6,2),
  mode VARCHAR(60) NOT NULL DEFAULT 'offline',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Workshop assignments table
CREATE TABLE IF NOT EXISTS workshop_assignments (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  workshop_id INTEGER NOT NULL REFERENCES workshops(id) ON DELETE CASCADE,
  assigned_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'assigned',
  completion_percentage NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (completion_percentage >= 0 AND completion_percentage <= 100),
  assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (user_id, workshop_id)
);

-- Comprehensive educational profile details stored per user
CREATE TABLE IF NOT EXISTS user_profiles (
  id SERIAL PRIMARY KEY,
  user_id INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  profile JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Vectorized recommendation corpus for RAG retrieval and semantic ranking signals
CREATE TABLE IF NOT EXISTS recommendation_vectors (
  id SERIAL PRIMARY KEY,
  document_key VARCHAR(255) UNIQUE NOT NULL,
  document_type VARCHAR(20) NOT NULL CHECK (document_type IN ('job', 'course', 'workshop')),
  source_id INTEGER NOT NULL,
  interest_type VARCHAR(20),
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  embedding_model VARCHAR(120) NOT NULL,
  embedding JSONB,
  embedding_dimensions INTEGER NOT NULL DEFAULT 0,
  content_hash VARCHAR(64) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_recommendation_vectors_type_source
  ON recommendation_vectors (document_type, source_id);

CREATE INDEX IF NOT EXISTS idx_recommendation_vectors_interest
  ON recommendation_vectors (interest_type);
