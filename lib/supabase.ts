import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Database = {
  public: {
    Tables: {
      user_profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      test_history: {
        Row: {
          id: string;
          user_id: string;
          test_name: string;
          date_completed: string;
          score_percentage: number;
          total_questions: number;
          correct_answers: number;
          attempted_questions: number;
          negative_marking_enabled: boolean;
          negative_marks_per_question: number;
          original_config: any;
          questions: any;
          was_corrected_by_user: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          test_name: string;
          date_completed?: string;
          score_percentage: number;
          total_questions: number;
          correct_answers: number;
          attempted_questions: number;
          negative_marking_enabled?: boolean;
          negative_marks_per_question?: number;
          original_config?: any;
          questions?: any;
          was_corrected_by_user?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          test_name?: string;
          date_completed?: string;
          score_percentage?: number;
          total_questions?: number;
          correct_answers?: number;
          attempted_questions?: number;
          negative_marking_enabled?: boolean;
          negative_marks_per_question?: number;
          original_config?: any;
          questions?: any;
          was_corrected_by_user?: boolean;
          created_at?: string;
        };
      };
    };
    Views: {
      leaderboard_stats: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          avatar_url: string | null;
          tests_completed: number;
          avg_score: number;
          total_questions_attempted: number;
          last_test_date: string | null;
          final_score: number;
          rank: number;
        };
      };
    };
  };
};