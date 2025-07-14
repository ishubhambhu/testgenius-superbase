/*
  # User System with Authentication and Leaderboard

  1. New Tables
    - `user_profiles`
      - `id` (uuid, references auth.users)
      - `email` (text)
      - `full_name` (text)
      - `avatar_url` (text, optional)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `test_history`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references user_profiles)
      - `test_name` (text)
      - `date_completed` (timestamp)
      - `score_percentage` (numeric)
      - `total_questions` (integer)
      - `correct_answers` (integer)
      - `attempted_questions` (integer)
      - `negative_marking_enabled` (boolean)
      - `negative_marks_per_question` (numeric)
      - `original_config` (jsonb)
      - `questions` (jsonb)
      - `was_corrected_by_user` (boolean)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage their own data
    - Add policies for leaderboard data (read-only for others)

  3. Functions
    - Function to calculate leaderboard rankings
    - Triggers to update user stats
*/

-- Create user_profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  full_name text,
  avatar_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create test_history table
CREATE TABLE IF NOT EXISTS test_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  test_name text NOT NULL,
  date_completed timestamptz DEFAULT now(),
  score_percentage numeric(5,2) NOT NULL DEFAULT 0,
  total_questions integer NOT NULL DEFAULT 0,
  correct_answers integer NOT NULL DEFAULT 0,
  attempted_questions integer NOT NULL DEFAULT 0,
  negative_marking_enabled boolean DEFAULT false,
  negative_marks_per_question numeric(4,2) DEFAULT 0,
  original_config jsonb,
  questions jsonb,
  was_corrected_by_user boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_history ENABLE ROW LEVEL SECURITY;

-- Policies for user_profiles


CREATE POLICY "Users can update own profile"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON user_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Policies for leaderboard (users can read others' aggregated stats)
CREATE POLICY "Users can read all profiles for leaderboard"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (true);

-- Policies for test_history
CREATE POLICY "Users can read own test history"
  ON test_history
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own test history"
  ON test_history
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own test history"
  ON test_history
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own test history"
  ON test_history
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Function to handle user profile creation
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO user_profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for user_profiles updated_at
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- View for leaderboard calculations
CREATE OR REPLACE VIEW leaderboard_stats AS
WITH user_stats AS (
  SELECT 
    up.id,
    up.email,
    up.full_name,
    up.avatar_url,
    COUNT(th.id) as tests_completed,
    COALESCE(AVG(th.score_percentage), 0) as avg_score,
    COALESCE(SUM(th.total_questions), 0) as total_questions_attempted,
    MAX(th.date_completed) as last_test_date
  FROM user_profiles up
  LEFT JOIN test_history th ON up.id = th.user_id
  GROUP BY up.id, up.email, up.full_name, up.avatar_url
),
normalized_stats AS (
  SELECT 
    *,
    CASE 
      WHEN MAX(tests_completed) OVER() = 0 THEN 0
      ELSE tests_completed::float / NULLIF(MAX(tests_completed) OVER(), 0)
    END as normalized_tests,
    avg_score / 100.0 as normalized_score,
    CASE 
      WHEN MAX(total_questions_attempted) OVER() = 0 THEN 0
      ELSE total_questions_attempted::float / NULLIF(MAX(total_questions_attempted) OVER(), 0)
    END as normalized_questions
  FROM user_stats
)
SELECT 
  *,
  (normalized_score * 0.5 + normalized_tests * 0.3 + normalized_questions * 0.2) * 100 as final_score,
  ROW_NUMBER() OVER (ORDER BY (normalized_score * 0.5 + normalized_tests * 0.3 + normalized_questions * 0.2) DESC, tests_completed DESC, avg_score DESC) as rank
FROM normalized_stats
WHERE tests_completed > 0
ORDER BY final_score DESC, tests_completed DESC, avg_score DESC;