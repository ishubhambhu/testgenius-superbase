import { supabase } from '../lib/supabase';
import { TestHistoryEntry, Question, QuestionStatus } from '../types';

export const saveTestToSupabase = async (
  testName: string,
  questions: Question[],
  originalConfig: any,
  negativeMarkingSettings: any
): Promise<string | null> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const attemptedCount = questions.filter(q => q.status === QuestionStatus.ATTEMPTED).length;
    const correctCount = questions.filter(q => 
      q.userAnswerIndex === q.correctAnswerIndex && q.status === QuestionStatus.ATTEMPTED
    ).length;
    
    let score = 0;
    if (questions.length > 0) {
      const rawScore = (correctCount / questions.length) * 100;
      score = rawScore;
      
      if (negativeMarkingSettings?.enabled) {
        const incorrectAttemptedCount = questions.filter(q => 
          q.userAnswerIndex !== undefined && 
          q.userAnswerIndex !== q.correctAnswerIndex &&
          q.status === QuestionStatus.ATTEMPTED
        ).length;
        const penalty = incorrectAttemptedCount * negativeMarkingSettings.marksPerQuestion;
        const marksObtained = correctCount - penalty;
        score = (marksObtained / questions.length) * 100;
        score = Math.max(0, score);
      }
    }

    const testHistoryEntry = {
      user_id: user.id,
      test_name: testName,
      score_percentage: score,
      total_questions: questions.length,
      correct_answers: correctCount,
      attempted_questions: attemptedCount,
      negative_marking_enabled: negativeMarkingSettings?.enabled || false,
      negative_marks_per_question: negativeMarkingSettings?.marksPerQuestion || 0,
      original_config: originalConfig,
      questions: questions,
      was_corrected_by_user: questions.some(q => q.wasCorrectedByUser)
    };

    const { data, error } = await supabase
      .from('test_history')
      .insert(testHistoryEntry)
      .select()
      .single();

    if (error) throw error;
    return data.id;
  } catch (error) {
    console.error('Error saving test to Supabase:', error);
    return null;
  }
};

export const updateTestInSupabase = async (
  testId: string,
  questions: Question[],
  wasCorrectByUser: boolean = false
): Promise<boolean> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const attemptedCount = questions.filter(q => q.status === QuestionStatus.ATTEMPTED).length;
    const correctCount = questions.filter(q => 
      q.userAnswerIndex === q.correctAnswerIndex && q.status === QuestionStatus.ATTEMPTED
    ).length;

    // Get the original test to recalculate score with same negative marking settings
    const { data: originalTest, error: fetchError } = await supabase
      .from('test_history')
      .select('negative_marking_enabled, negative_marks_per_question')
      .eq('id', testId)
      .eq('user_id', user.id)
      .single();

    if (fetchError) throw fetchError;

    let score = 0;
    if (questions.length > 0) {
      const rawScore = (correctCount / questions.length) * 100;
      score = rawScore;
      
      if (originalTest.negative_marking_enabled) {
        const incorrectAttemptedCount = questions.filter(q => 
          q.userAnswerIndex !== undefined && 
          q.userAnswerIndex !== q.correctAnswerIndex &&
          q.status === QuestionStatus.ATTEMPTED
        ).length;
        const penalty = incorrectAttemptedCount * originalTest.negative_marks_per_question;
        const marksObtained = correctCount - penalty;
        score = (marksObtained / questions.length) * 100;
        score = Math.max(0, score);
      }
    }

    const { error } = await supabase
      .from('test_history')
      .update({
        score_percentage: score,
        correct_answers: correctCount,
        attempted_questions: attemptedCount,
        questions: questions,
        was_corrected_by_user: wasCorrectByUser || questions.some(q => q.wasCorrectedByUser)
      })
      .eq('id', testId)
      .eq('user_id', user.id);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error updating test in Supabase:', error);
    return false;
  }
};

export const getTestHistoryFromSupabase = async (): Promise<TestHistoryEntry[]> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('test_history')
      .select('*')
      .eq('user_id', user.id)
      .order('date_completed', { ascending: false });

    if (error) throw error;

    return (data || []).map(entry => ({
      id: entry.id,
      testName: entry.test_name,
      dateCompleted: new Date(entry.date_completed).getTime(),
      scorePercentage: entry.score_percentage,
      totalQuestions: entry.total_questions,
      correctAnswers: entry.correct_answers,
      attemptedQuestions: entry.attempted_questions,
      negativeMarkingSettings: {
        enabled: entry.negative_marking_enabled,
        marksPerQuestion: entry.negative_marks_per_question
      },
      originalConfig: entry.original_config,
      questions: entry.questions,
      wasCorrectedByUser: entry.was_corrected_by_user
    }));
  } catch (error) {
    console.error('Error fetching test history from Supabase:', error);
    return [];
  }
};

export const deleteTestFromSupabase = async (testId: string): Promise<boolean> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase
      .from('test_history')
      .delete()
      .eq('id', testId)
      .eq('user_id', user.id);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error deleting test from Supabase:', error);
    return false;
  }
};

export const clearAllTestHistoryFromSupabase = async (): Promise<boolean> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase
      .from('test_history')
      .delete()
      .eq('user_id', user.id);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error clearing test history from Supabase:', error);
    return false;
  }
};