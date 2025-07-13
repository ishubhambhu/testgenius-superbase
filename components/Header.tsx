import React from 'react';
import { APP_NAME } from '../constants';
import { SunIcon, MoonIcon, HistoryIcon, MortarBoardIcon, LeaderboardIcon, UserIcon } from './Icons';
import { UserAvatar } from './UserAvatar';
import { useAuth } from '../hooks/useAuth';
import Button from './Button';

interface HeaderProps {
  darkMode: boolean;
  toggleDarkMode: (event: React.MouseEvent) => void;
  onNavigateToHistory: () => void;
  onNavigateHome: () => void;
  onNavigateToLeaderboard?: () => void;
  onNavigateToProfile?: () => void;
}

const Header: React.FC<HeaderProps> = ({ 
  darkMode, 
  toggleDarkMode, 
  onNavigateToHistory, 
  onNavigateHome,
  onNavigateToLeaderboard,
  onNavigateToProfile
}) => {
  const { user } = useAuth();

  return (
    <header className="bg-card text-card-foreground p-4 border-b border-border sticky top-0 z-50">
      <div className="container mx-auto flex justify-between items-center">
        <button
          onClick={onNavigateHome}
          className="flex items-center space-x-2 focus:outline-none rounded-md p-1 -ml-1 group"
          aria-label={`Go to ${APP_NAME} homepage`}
        >
          <MortarBoardIcon className="h-8 w-8 text-blue-500 dark:text-blue-400 transition-transform duration-300 group-hover:scale-110" />
          <h1 className="text-2xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-purple-600 dark:from-blue-400 dark:to-purple-500 group-hover:opacity-90 transition-opacity">
            {APP_NAME}
          </h1>
        </button>
        <div className="flex items-center space-x-1">
          {onNavigateToLeaderboard && (
            <Button
              onClick={onNavigateToLeaderboard}
              variant="ghost"
              size="icon"
              aria-label="View leaderboard"
              title="View leaderboard"
            >
              <LeaderboardIcon className="h-5 w-5" />
            </Button>
          )}
          <Button
            onClick={onNavigateToHistory}
            variant="ghost"
            size="icon"
            aria-label="View test history"
            title="View test history"
          >
            <HistoryIcon className="h-5 w-5" />
          </Button>
          <Button
            onClick={(e) => toggleDarkMode(e)}
            variant="ghost"
            size="icon"
            aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
            title={darkMode ? "Switch to light mode" : "Switch to dark mode"}
          >
            {darkMode ? <SunIcon className="h-5 w-5" /> : <MoonIcon className="h-5 w-5" />}
          </Button>
          {user && onNavigateToProfile && (
            <Button
              onClick={onNavigateToProfile}
              variant="ghost"
              size="icon"
              aria-label="View profile"
              title="View profile"
            >
              <UserAvatar size="sm" />
            </Button>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;