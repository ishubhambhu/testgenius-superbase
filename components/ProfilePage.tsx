import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { UserAvatar } from './UserAvatar';
import Button from './Button';
import { ChevronLeftIcon, EditIcon, ClockIcon } from './Icons';

interface ProfilePageProps {
  onNavigateHome: () => void;
  onNavigateToHistory: () => void;
  onNavigateToSettings: () => void;
}

export const ProfilePage: React.FC<ProfilePageProps> = ({ 
  onNavigateHome, 
  onNavigateToHistory, 
  onNavigateToSettings 
}) => {
  const { profile } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(profile?.full_name || '');

  // Mock data for now - will be replaced with real data from Supabase
  const stats = {
    testsCompleted: 1,
    averageScore: 100,
    totalQuestions: 1
  };

  const recentActivity = [
    {
      testName: 'Computer',
      date: '04/07/2025',
      score: 100.0,
      questionsAnswered: '1/1'
    }
  ];

  const sidebarItems = [
    { id: 'profile', label: 'Profile', icon: '👤', active: true },
    { id: 'history', label: 'Test History', icon: '🕒', onClick: onNavigateToHistory },
    { id: 'answer-key', label: 'Answer Key Check', icon: '✏️' },
    { id: 'settings', label: 'Settings', icon: '⚙️', onClick: onNavigateToSettings },
    { id: 'about', label: 'Know the App', icon: '✨' }
  ];

  if (!profile) return null;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto p-6">
        <div className="bg-card border border-border rounded-lg shadow-xl overflow-hidden">
          {/* Header */}
          <div className="bg-secondary/50 p-6 border-b border-border">
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
                <h1 className="text-2xl font-bold text-foreground">Profile</h1>
              </div>
            </div>
          </div>

          <div className="flex">
            {/* Sidebar */}
            <div className="w-64 bg-secondary/30 border-r border-border p-4">
              <nav className="space-y-2">
                {sidebarItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={item.onClick}
                    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-colors ${
                      item.active 
                        ? 'bg-primary text-primary-foreground' 
                        : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                    }`}
                  >
                    <span className="text-lg">{item.icon}</span>
                    <span className="font-medium">{item.label}</span>
                  </button>
                ))}
              </nav>
            </div>

            {/* Main Content */}
            <div className="flex-1 p-8">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Profile Info */}
                <div className="lg:col-span-1">
                  <div className="text-center">
                    <div className="relative inline-block">
                      <UserAvatar size="xl" className="mx-auto mb-4" />
                      <button className="absolute bottom-0 right-0 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center">
                        <EditIcon className="w-3 h-3" />
                      </button>
                    </div>
                    
                    <div className="flex items-center justify-center space-x-2 mb-2">
                      {isEditing ? (
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="text-xl font-bold text-center bg-transparent border-b border-primary focus:outline-none"
                          onBlur={() => setIsEditing(false)}
                          onKeyPress={(e) => e.key === 'Enter' && setIsEditing(false)}
                          autoFocus
                        />
                      ) : (
                        <>
                          <h2 className="text-xl font-bold text-foreground">
                            {profile.full_name || 'Test User'}
                          </h2>
                          <button
                            onClick={() => setIsEditing(true)}
                            className="text-muted-foreground hover:text-foreground"
                          >
                            <EditIcon className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                    
                    <p className="text-muted-foreground">{profile.email}</p>
                  </div>
                </div>

                {/* Stats */}
                <div className="lg:col-span-2">
                  <div className="grid grid-cols-3 gap-4 mb-8">
                    <div className="bg-secondary/50 p-4 rounded-lg text-center">
                      <div className="text-2xl font-bold text-primary mb-1">
                        {stats.testsCompleted}
                      </div>
                      <div className="text-sm text-muted-foreground">Tests Completed</div>
                    </div>
                    
                    <div className="bg-secondary/50 p-4 rounded-lg text-center">
                      <div className="text-2xl font-bold text-primary mb-1">
                        {stats.averageScore}%
                      </div>
                      <div className="text-sm text-muted-foreground">Average Score</div>
                    </div>
                    
                    <div className="bg-secondary/50 p-4 rounded-lg text-center">
                      <div className="text-2xl font-bold text-primary mb-1">
                        {stats.totalQuestions}
                      </div>
                      <div className="text-sm text-muted-foreground">Total Questions</div>
                    </div>
                  </div>

                  {/* Recent Activity */}
                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-4">Recent Activity</h3>
                    <div className="space-y-3">
                      {recentActivity.map((activity, index) => (
                        <div key={index} className="bg-secondary/50 p-4 rounded-lg">
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-medium text-foreground">{activity.testName}</h4>
                              <p className="text-sm text-muted-foreground flex items-center">
                                <ClockIcon className="w-4 h-4 mr-1" />
                                {activity.date}
                              </p>
                            </div>
                            <div className="text-right">
                              <div className="text-lg font-bold text-primary">
                                {activity.score}%
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {activity.questionsAnswered}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};