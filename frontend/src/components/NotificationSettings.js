import React from 'react';
import { useNotifications } from '../contexts/NotificationContext';
import { Bell, BellOff } from 'lucide-react';

const prefLabels = {
  new_content: 'New content from creators you follow',
  new_messages: 'New messages received',
  new_tips: 'Tips received',
  creator_live: 'Creator goes live',
};

export const NotificationSettings = () => {
  const {
    preferences, updatePreferences,
    pushSupported, pushEnabled,
    subscribePush, unsubscribePush,
  } = useNotifications();

  const togglePref = (key) => {
    if (!preferences) return;
    updatePreferences({ ...preferences, [key]: !preferences[key] });
  };

  const togglePush = async () => {
    if (pushEnabled) {
      await unsubscribePush();
    } else {
      await subscribePush();
    }
  };

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-white">Notification Settings</h3>

      {/* Push toggle */}
      {pushSupported && (
        <div className="flex items-center justify-between p-4 rounded-lg border border-white/10 bg-white/5">
          <div className="flex items-center gap-3">
            {pushEnabled ? <Bell className="w-5 h-5 text-gold" /> : <BellOff className="w-5 h-5 text-white/40" />}
            <div>
              <p className="text-white text-sm font-medium">Push Notifications</p>
              <p className="text-white/40 text-xs">Receive notifications even when the app is closed</p>
            </div>
          </div>
          <button
            onClick={togglePush}
            className={`relative w-11 h-6 rounded-full transition-colors ${
              pushEnabled ? 'bg-gold' : 'bg-white/20'
            }`}
          >
            <span
              className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                pushEnabled ? 'translate-x-[22px]' : 'translate-x-0.5'
              }`}
            />
          </button>
        </div>
      )}

      {/* Per-type toggles */}
      <div className="space-y-2">
        <p className="text-white/60 text-xs uppercase tracking-wider">Notification Types</p>
        {preferences && Object.entries(prefLabels).map(([key, label]) => (
          <div key={key} className="flex items-center justify-between p-3 rounded-lg border border-white/10 bg-white/5">
            <p className="text-white text-sm">{label}</p>
            <button
              onClick={() => togglePref(key)}
              className={`relative w-11 h-6 rounded-full transition-colors ${
                preferences[key] ? 'bg-gold' : 'bg-white/20'
              }`}
            >
              <span
                className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                  preferences[key] ? 'translate-x-[22px]' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default NotificationSettings;
