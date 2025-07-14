/*
  # Create user profiles and test history tables

  1. New Tables
    - `user_profiles`
      - `id` (uuid, primary key, references auth.users)
      - `email` (text, unique)
      - `full_name` (text, nullable)
      - `avatar_url` (text, nullable)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    - `test_history`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to user_profiles)
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
    - Enable RLS on both tables
    - Add policies for authenticated users to manage their own data

  3. Functions
    - Add trigger function to handle new user creation
    - Add trigger function to update updated_at timestamp
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
  user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
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

-- Enable Row Level Security
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_history ENABLE ROW LEVEL SECURITY;

-- Create policies for user_profiles
CREATE POLICY "Users can read own profile"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can read all profiles for leaderboard"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert own profile"
  ON user_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- Create policies for test_history
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

-- Function to handle updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for user_profiles updated_at
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to handle new user creation
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ language 'plpgsql' security definer;

-- Trigger for new user creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- Create leaderboard view
CREATE OR REPLACE VIEW leaderboard_stats AS
WITH user_stats AS (
  SELECT 
    up.id,
    up.email,
    up.full_name,
    up.avatar_url,
    COUNT(th.id) as tests_completed,
    COALESCE(AVG(th.score_percentage), 0) as avg_score,
    COALESCE(SUM(th.attempted_questions), 0) as total_questions_attempted,
    MAX(th.date_completed) as last_test_date
  FROM user_profiles up
  LEFT JOIN test_history th ON up.id = th.user_id
  GROUP BY up.id, up.email, up.full_name, up.avatar_url
),
normalized_stats AS (
  SELECT *,
    -- Normalize tests completed (0-1 scale)
    CASE 
      WHEN MAX(tests_completed) OVER() = 0 THEN 0
      ELSE tests_completed::float / NULLIF(MAX(tests_completed) OVER(), 0)
    END as normalized_tests,
    -- Normalize average score (0-1 scale)
    CASE 
      WHEN MAX(avg_score) OVER() = 0 THEN 0
      ELSE avg_score / NULLIF(MAX(avg_score) OVER(), 0)
    END as normalized_score,
    -- Normalize total questions (0-1 scale)
    CASE 
      WHEN MAX(total_questions_attempted) OVER() = 0 THEN 0
      ELSE total_questions_attempted::float / NULLIF(MAX(total_questions_attempted) OVER(), 0)
    END as normalized_questions
  FROM user_stats
),
final_scores AS (
  SELECT *,
    -- Weighted final score: 50% avg_score + 30% tests_completed + 20% questions_attempted
    (normalized_score * 0.5 + normalized_tests * 0.3 + normalized_questions * 0.2) * 100 as final_score
  FROM normalized_stats
)
SELECT *,
  ROW_NUMBER() OVER (ORDER BY final_score DESC, tests_completed DESC, avg_score DESC) as rank
FROM final_scores
WHERE tests_completed > 0  -- Only show users who have completed at least one test
ORDER BY rank;