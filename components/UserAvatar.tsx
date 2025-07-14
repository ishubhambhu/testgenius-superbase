import { } from 'react';
import { useAuth } from '../hooks/useAuth';

interface UserAvatarProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export const UserAvatar: React.FC<UserAvatarProps> = ({ size = 'md', className = '' }) => {
  const { profile, getInitials } = useAuth();

  const sizeClasses = {
    sm: 'w-6 h-6 text-xs',
    md: 'w-8 h-8 text-sm',
    lg: 'w-10 h-10 text-base',
    xl: 'w-16 h-16 text-xl'
  };

  if (!profile) return null;

  const initials = getInitials(profile.full_name, profile.email);

  if (profile.avatar_url) {
    return (
      <img
        src={profile.avatar_url}
        alt={profile.full_name || profile.email}
        className={`${sizeClasses[size]} rounded-full object-cover ${className}`}
      />
    );
  }

  return (
    <div className={`${sizeClasses[size]} rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold ${className}`}>
      {initials}
    </div>
  );
};