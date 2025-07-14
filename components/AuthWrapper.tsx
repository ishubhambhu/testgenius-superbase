import { ReactNode } from 'react';
import { useAuth } from '../hooks/useAuth';
import { WelcomePage } from './WelcomePage';


export const AuthWrapper: React.FC<AuthWrapperProps> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <WelcomePage />;
  }

  return <>{children}</>;
};