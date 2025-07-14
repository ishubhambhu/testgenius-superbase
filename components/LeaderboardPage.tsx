import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { UserAvatar } from './UserAvatar';
import Button from './Button';
import { ChevronLeftIcon, TrophyIcon, MedalIcon, AwardIcon } from './Icons';

interface LeaderboardEntry {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  tests_completed: number;
  avg_score: number;
  total_questions_attempted: number;
  final_score: number;
  rank: number;
}

interface LeaderboardPageProps {
  onNavigateHome: () => void;
}

export const LeaderboardPage: React.FC<LeaderboardPageProps> = ({ onNavigateHome }) => {
  const { profile, getInitials } = useAuth();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRank, setUserRank] = useState<LeaderboardEntry | null>(null);

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const fetchLeaderboard = async () => {
    try {
      const { data, error } = await supabase
        .from('leaderboard_stats')
        .select('*')
        .order('rank', { ascending: true })
        .limit(23); // Top 3 + 20 for table

      if (error) throw error;

      setLeaderboard(data || []);
      
      // Find current user's rank
      if (profile) {
        const currentUser = data?.find(entry => entry.id === profile.id);
        setUserRank(currentUser || null);
      }
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-500';
    if (score >= 70) return 'text-yellow-500';
    if (score >= 50) return 'text-orange-500';
    return 'text-red-500';
  };

  const getScoreBackground = (score: number) => {
    if (score >= 90) return 'bg-green-500/10';
    if (score >= 70) return 'bg-yellow-500/10';
    if (score >= 50) return 'bg-orange-500/10';
    return 'bg-red-500/10';
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <TrophyIcon className="w-6 h-6 text-yellow-500" />;
      case 2:
        return <MedalIcon className="w-6 h-6 text-gray-400" />;
      case 3:
        return <AwardIcon className="w-6 h-6 text-amber-600" />;
      default:
        return <span className="text-lg font-bold text-muted-foreground">#{rank}</span>;
    }
  };

  const top3 = leaderboard.slice(0, 3);
  const tableData = leaderboard.slice(0, 20); // Show top 20 in table

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto p-6">
        <div className="bg-card border border-border rounded-lg shadow-xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-primary/10 to-purple-500/10 p-6 border-b border-border">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Button
                  onClick={onNavigateHome}
                  variant="outline"
                  size="sm"
                  leftIcon={<ChevronLeftIcon className="w-4 h-4" />}
                >
                  Home
                </Button>
                <div>
                  <h1 className="text-3xl font-bold text-foreground">🏆 Leaderboard</h1>
                  <p className="text-muted-foreground">See how you rank against other TestGenius users</p>
                </div>
              </div>
            </div>
          </div>

          <div className="p-8">
            {/* User's Rank (if not in top 20) */}
            {userRank && userRank.rank > 20 && (
              <div className="mb-8 p-4 bg-primary/10 border border-primary/20 rounded-lg">
                <h3 className="text-lg font-semibold text-foreground mb-3">Your Rank</h3>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <span className="text-2xl font-bold text-primary">#{userRank.rank}</span>
                    <UserAvatar size="md" />
                    <div>
                      <p className="font-medium text-foreground">
                        {userRank.full_name || getInitials(userRank.full_name, userRank.email)}
                      </p>
                      <p className="text-sm text-muted-foreground">{userRank.email}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-xl font-bold ${getScoreColor(userRank.final_score)}`}>
                      {userRank.final_score.toFixed(1)}
                    </div>
                    <div className="text-sm text-muted-foreground">Final Score</div>
                  </div>
                </div>
              </div>
            )}

            {/* Top 3 Podium */}
            {top3.length > 0 && (
              <div className="mb-12">
                <h2 className="text-2xl font-bold text-foreground mb-8 text-center">🥇 Top Performers</h2>
                <div className="flex items-end justify-center space-x-8">
                  {/* 2nd Place */}
                  {top3[1] && (
                    <div className="text-center">
                      <div className="bg-gradient-to-t from-gray-300 to-gray-100 p-6 rounded-t-lg mb-4 h-32 flex flex-col justify-end">
                        <UserAvatar size="lg" />
                        <div className="mt-2">
                          <p className="font-semibold text-gray-800">
                            {top3[1].full_name || getInitials(top3[1].full_name, top3[1].email)}
                          </p>
                          <div className="flex items-center justify-center mt-1">
                            <MedalIcon className="w-5 h-5 text-gray-400 mr-1" />
                            <span className="text-lg font-bold text-gray-600">
                              {top3[1].final_score.toFixed(1)}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="bg-gray-200 text-gray-800 py-2 px-4 rounded-b-lg font-bold">
                        2nd Place
                      </div>
                    </div>
                  )}

                  {/* 1st Place */}
                  {top3[0] && (
                    <div className="text-center">
                      <div className="bg-gradient-to-t from-yellow-400 to-yellow-200 p-6 rounded-t-lg mb-4 h-40 flex flex-col justify-end">
                        <UserAvatar size="xl" />
                        <div className="mt-2">
                          <p className="font-semibold text-yellow-900">
                            {top3[0].full_name || getInitials(top3[0].full_name, top3[0].email)}
                          </p>
                          <div className="flex items-center justify-center mt-1">
                            <TrophyIcon className="w-6 h-6 text-yellow-600 mr-1" />
                            <span className="text-xl font-bold text-yellow-800">
                              {top3[0].final_score.toFixed(1)}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="bg-yellow-300 text-yellow-900 py-2 px-4 rounded-b-lg font-bold">
                        1st Place
                      </div>
                    </div>
                  )}

                  {/* 3rd Place */}
                  {top3[2] && (
                    <div className="text-center">
                      <div className="bg-gradient-to-t from-amber-600 to-amber-400 p-6 rounded-t-lg mb-4 h-28 flex flex-col justify-end">
                        <UserAvatar size="md" />
                        <div className="mt-2">
                          <p className="font-semibold text-amber-900">
                            {top3[2].full_name || getInitials(top3[2].full_name, top3[2].email)}
                          </p>
                          <div className="flex items-center justify-center mt-1">
                            <AwardIcon className="w-5 h-5 text-amber-700 mr-1" />
                            <span className="text-lg font-bold text-amber-800">
                              {top3[2].final_score.toFixed(1)}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="bg-amber-500 text-amber-900 py-2 px-4 rounded-b-lg font-bold">
                        3rd Place
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Leaderboard Table */}
            <div>
              <h2 className="text-2xl font-bold text-foreground mb-6">📊 Full Rankings</h2>
              <div className="bg-secondary/30 rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-secondary">
                      <tr>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Rank</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">User</th>
                        <th className="px-6 py-4 text-center text-sm font-semibold text-foreground">Tests</th>
                        <th className="px-6 py-4 text-center text-sm font-semibold text-foreground">Avg Score</th>
                        <th className="px-6 py-4 text-center text-sm font-semibold text-foreground">Questions</th>
                        <th className="px-6 py-4 text-center text-sm font-semibold text-foreground">Final Score</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {tableData.map((entry, index) => (
                        <tr 
                          key={entry.id} 
                          className={`hover:bg-accent/50 transition-colors ${
                            entry.id === profile?.id ? 'bg-primary/10 border-l-4 border-primary' : ''
                          }`}
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center">
                              {getRankIcon(entry.rank)}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center space-x-3">
                              <UserAvatar size="sm" />
                              <div>
                                <p className="font-medium text-foreground">
                                  {entry.full_name || getInitials(entry.full_name, entry.email)}
                                  {entry.id === profile?.id && (
                                    <span className="ml-2 text-xs bg-primary text-primary-foreground px-2 py-1 rounded">
                                      You
                                    </span>
                                  )}
                                </p>
                                <p className="text-sm text-muted-foreground">{entry.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className="font-semibold text-foreground">{entry.tests_completed}</span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className="font-semibold text-foreground">{entry.avg_score.toFixed(1)}%</span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className="font-semibold text-foreground">{entry.total_questions_attempted}</span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-bold ${getScoreBackground(entry.final_score)} ${getScoreColor(entry.final_score)}`}>
                              {entry.final_score.toFixed(1)}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {tableData.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-xl text-muted-foreground">No rankings available yet.</p>
                  <p className="text-muted-foreground mt-2">Complete some tests to see the leaderboard!</p>
                </div>
              )}
            </div>

            {/* Scoring Explanation */}
            <div className="mt-8 p-6 bg-secondary/30 rounded-lg">
              <h3 className="text-lg font-semibold text-foreground mb-4">📈 How Rankings Work</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <h4 className="font-medium text-foreground mb-2">Average Score (50%)</h4>
                  <p className="text-muted-foreground">Your average performance across all tests</p>
                </div>
                <div>
                  <h4 className="font-medium text-foreground mb-2">Tests Completed (30%)</h4>
                  <p className="text-muted-foreground">Total number of tests you've finished</p>
                </div>
                <div>
                  <h4 className="font-medium text-foreground mb-2">Questions Attempted (20%)</h4>
                  <p className="text-muted-foreground">Total questions you've answered</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};