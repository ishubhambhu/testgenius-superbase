import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import Button from './Button';
import { ChevronLeftIcon, SunIcon, MoonIcon } from './Icons';

interface SettingsPageProps {
  onNavigateHome: () => void;
  onNavigateToProfile: () => void;
  onNavigateToHistory: () => void;
  darkMode: boolean;
  toggleDarkMode: () => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ 
  onNavigateHome, 
  onNavigateToProfile, 
  onNavigateToHistory,
  darkMode,
  toggleDarkMode
}) => {
  const { profile, signOut } = useAuth();
  const [isChangingEmail, setIsChangingEmail] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [newEmail, setNewEmail] = useState(profile?.email || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const sidebarItems = [
    { id: 'profile', label: 'Profile', icon: '👤', onClick: onNavigateToProfile },
    { id: 'history', label: 'Test History', icon: '🕒', onClick: onNavigateToHistory },
    { id: 'answer-key', label: 'Answer Key Check', icon: '✏️' },
    { id: 'settings', label: 'Settings', icon: '⚙️', active: true },
    { id: 'about', label: 'Know the App', icon: '✨' }
  ];

  const handleSignOut = async () => {
    if (window.confirm('Are you sure you want to sign out?')) {
      await signOut();
    }
  };

  const handleEmailChange = () => {
    // TODO: Implement email change
    setIsChangingEmail(false);
  };

  const handlePasswordChange = () => {
    // TODO: Implement password change
    setIsChangingPassword(false);
  };

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
              <div className="max-w-2xl">
                {/* Account Settings */}
                <div className="mb-8">
                  <h2 className="text-xl font-semibold text-foreground mb-6">Account Settings</h2>
                  
                  {/* Email */}
                  <div className="bg-secondary/50 p-6 rounded-lg mb-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium text-foreground">Email</h3>
                        <p className="text-muted-foreground">{profile?.email}</p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsChangingEmail(true)}
                      >
                        Change Email
                      </Button>
                    </div>
                    
                    {isChangingEmail && (
                      <div className="mt-4 pt-4 border-t border-border">
                        <div className="space-y-3">
                          <input
                            type="email"
                            value={newEmail}
                            onChange={(e) => setNewEmail(e.target.value)}
                            placeholder="New email address"
                            className="w-full px-3 py-2 border border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                          />
                          <div className="flex space-x-2">
                            <Button size="sm" onClick={handleEmailChange}>
                              Update Email
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => setIsChangingEmail(false)}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Password */}
                  <div className="bg-secondary/50 p-6 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium text-foreground">Password</h3>
                        <p className="text-muted-foreground">Last updated recently</p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsChangingPassword(true)}
                      >
                        Change Password
                      </Button>
                    </div>
                    
                    {isChangingPassword && (
                      <div className="mt-4 pt-4 border-t border-border">
                        <div className="space-y-3">
                          <input
                            type="password"
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            placeholder="Current password"
                            className="w-full px-3 py-2 border border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                          />
                          <input
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="New password"
                            className="w-full px-3 py-2 border border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                          />
                          <input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="Confirm new password"
                            className="w-full px-3 py-2 border border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                          />
                          <div className="flex space-x-2">
                            <Button size="sm" onClick={handlePasswordChange}>
                              Update Password
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => setIsChangingPassword(false)}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Preferences */}
                <div className="mb-8">
                  <h2 className="text-xl font-semibold text-foreground mb-6">Preferences</h2>
                  
                  <div className="bg-secondary/50 p-6 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium text-foreground">Theme</h3>
                        <p className="text-muted-foreground">Choose your preferred theme</p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={toggleDarkMode}
                        leftIcon={darkMode ? <SunIcon className="w-4 h-4" /> : <MoonIcon className="w-4 h-4" />}
                      >
                        {darkMode ? 'Light Mode' : 'Dark Mode'}
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Danger Zone */}
                <div>
                  <h2 className="text-xl font-semibold text-destructive mb-6">Danger Zone</h2>
                  
                  <div className="bg-destructive/10 border border-destructive/20 p-6 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium text-destructive">Sign Out</h3>
                        <p className="text-muted-foreground">Sign out of your account</p>
                      </div>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={handleSignOut}
                      >
                        Sign Out
                      </Button>
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