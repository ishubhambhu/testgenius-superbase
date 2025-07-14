import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import Button from './Button';
import { APP_NAME } from '../constants';
import { MortarBoardIcon, ElsaAvatarIcon, EyeIcon } from './Icons';

type AuthMode = 'signin' | 'signup' | 'reset';

export const WelcomePage: React.FC = () => {
  const [authMode, setAuthMode] = useState<AuthMode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const { signIn, signUp, signInWithGoogle, resetPassword } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      if (authMode === 'signin') {
        const { error } = await signIn(email, password);
        if (error) throw error;
      } else if (authMode === 'signup') {
        const { error } = await signUp(email, password, fullName);
        if (error) throw error;
        setMessage('Check your email for the confirmation link!');
      } else if (authMode === 'reset') {
        const { error } = await resetPassword(email);
        if (error) throw error;
        setMessage('Check your email for the password reset link!');
      }
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      const { error } = await signInWithGoogle();
      if (error) throw error;
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const getTitle = () => {
    switch (authMode) {
      case 'signin': return 'Sign In';
      case 'signup': return 'Create Account';
      case 'reset': return 'Reset Password';
    }
  };

  const getSubtitle = () => {
    switch (authMode) {
      case 'signin': return 'Welcome back! Please sign in to continue';
      case 'signup': return 'Join TestGenius to start creating intelligent tests';
      case 'reset': return 'Enter your email to reset your password';
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left side - Welcome content */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="max-w-lg">
          <div className="flex items-center mb-8">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mr-4">
              <MortarBoardIcon className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-foreground">
                Welcome to
              </h1>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-500 to-purple-600 bg-clip-text text-transparent">
                {APP_NAME}!
              </h1>
            </div>
          </div>

          <p className="text-xl text-muted-foreground mb-8">
            Create intelligent tests from documents, syllabus, or topics with AI-powered 
            question generation and instant feedback.
          </p>

          <div className="space-y-4">
            <div className="flex items-center p-4 bg-card border border-border rounded-lg">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
              <span className="text-foreground">AI-powered question generation</span>
            </div>
            <div className="flex items-center p-4 bg-card border border-border rounded-lg">
              <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
              <span className="text-foreground">Multiple input formats supported</span>
            </div>
            <div className="flex items-center p-4 bg-card border border-border rounded-lg">
              <div className="w-2 h-2 bg-purple-500 rounded-full mr-3"></div>
              <span className="text-foreground">Instant feedback and explanations</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Auth form */}
      <div className="w-full max-w-md bg-card border-l border-border flex flex-col">
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="w-full max-w-sm">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-foreground mb-2">{getTitle()}</h2>
              <p className="text-muted-foreground">{getSubtitle()}</p>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-md text-sm">
                {error}
              </div>
            )}

            {message && (
              <div className="mb-4 p-3 bg-green-500/10 border border-green-500/20 text-green-600 dark:text-green-400 rounded-md text-sm">
                {message}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {authMode === 'signup' && (
                <div>
                  <label htmlFor="fullName" className="block text-sm font-medium text-foreground mb-1">
                    Name
                  </label>
                  <input
                    id="fullName"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Enter your Name"
                    className="w-full px-3 py-2 border border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    required
                  />
                </div>
              )}

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-foreground mb-1">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="w-full px-3 py-2 border border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  required
                />
              </div>

              {authMode !== 'reset' && (
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-foreground mb-1">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      className="w-full px-3 py-2 pr-10 border border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    >
                      <EyeIcon className="h-4 w-4 text-muted-foreground" />
                    </button>
                  </div>
                </div>
              )}

              <Button
                type="submit"
                className="w-full"
                isLoading={loading}
                disabled={loading}
              >
                {authMode === 'signin' && 'Sign In'}
                {authMode === 'signup' && 'Create Account'}
                {authMode === 'reset' && 'Send Reset Email'}
              </Button>
            </form>

            {authMode !== 'reset' && (
              <>
                <div className="my-4 text-center text-sm text-muted-foreground">
                  Or continue with
                </div>

                <Button
                  onClick={handleGoogleSignIn}
                  variant="outline"
                  className="w-full"
                  disabled={loading}
                  leftIcon={
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                  }
                >
                  Sign in with Google
                </Button>
              </>
            )}

            <div className="mt-6 text-center text-sm">
              {authMode === 'signin' && (
                <>
                  <button
                    type="button"
                    onClick={() => setAuthMode('reset')}
                    className="text-primary hover:underline"
                  >
                    Forgot Password?
                  </button>
                  <div className="mt-2">
                    Don't have an account?{' '}
                    <button
                      type="button"
                      onClick={() => setAuthMode('signup')}
                      className="text-primary hover:underline"
                    >
                      Sign up
                    </button>
                  </div>
                </>
              )}

              {authMode === 'signup' && (
                <div>
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => setAuthMode('signin')}
                    className="text-primary hover:underline"
                  >
                    Sign in
                  </button>
                </div>
              )}

              {authMode === 'reset' && (
                <button
                  type="button"
                  onClick={() => setAuthMode('signin')}
                  className="text-primary hover:underline"
                >
                  Back to sign in
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-border">
          <div className="flex items-center justify-center text-xs text-muted-foreground">
            <ElsaAvatarIcon className="w-4 h-4 mr-1" />
            Powered by Elsa
          </div>
        </div>
      </div>
    </div>
  );
};