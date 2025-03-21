import React from 'react';
import { Avatar } from '../common/Avatar';

const UserPresence = ({ user, status }) => {
  // Status indicator colors
  const statusColors = {
    active: 'bg-green-500',
    away: 'bg-yellow-500',
    inactive: 'bg-gray-500'
  };

  // Status labels for tooltips
  const statusLabels = {
    active: 'Online',
    away: 'Away',
    inactive: 'Inactive'
  };

  return (
    <div className="relative inline-flex items-center" title={`${user.name} - ${statusLabels[status]}`}>
      {/* User avatar */}
      <div className="w-8 h-8">
        <Avatar
          src={user.avatar}
          alt={user.name}
          className="rounded-full"
        />
      </div>

      {/* Status indicator */}
      <span className={`
        absolute bottom-0 right-0
        w-3 h-3 rounded-full
        ${statusColors[status]}
        border-2 border-white
        shadow-sm
      `} />

      {/* Hover card with user details */}
      <div className="
        absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2
        w-48 p-3 bg-white rounded-lg shadow-lg
        opacity-0 invisible group-hover:opacity-100 group-hover:visible
        transition-all duration-200
        z-10
      ">
        <div className="flex items-start space-x-3">
          <div className="w-10 h-10">
            <Avatar
              src={user.avatar}
              alt={user.name}
              className="rounded-full"
            />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {user.name}
            </p>
            <p className="text-sm text-gray-500 truncate">
              {user.email}
            </p>
            <p className="mt-1 text-xs">
              <span className={`inline-block w-2 h-2 rounded-full ${statusColors[status]} mr-1`} />
              <span className="text-gray-600">
                {statusLabels[status]}
              </span>
            </p>
          </div>
        </div>

        {/* Last activity timestamp */}
        {user.lastActivity && (
          <p className="mt-2 text-xs text-gray-500">
            Last active: {formatLastActive(user.lastActivity)}
          </p>
        )}
      </div>
    </div>
  );
};

// Helper function to format last active time
const formatLastActive = (timestamp) => {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = (now - date) / 1000; // Difference in seconds

  if (diff < 60) {
    return 'Just now';
  } else if (diff < 3600) {
    const minutes = Math.floor(diff / 60);
    return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
  } else if (diff < 86400) {
    const hours = Math.floor(diff / 3600);
    return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  } else {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  }
};

// Default props
UserPresence.defaultProps = {
  status: 'inactive'
};

export default UserPresence;
