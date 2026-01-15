import React, { useState } from 'react';
import {
  Calendar,
  Check,
  AlertCircle,
  RefreshCw,
  Unlink,
  CheckSquare,
  Gift,
  Star,
  Phone,
  Loader2,
} from 'lucide-react';
import { useCalendar } from '../contexts/CalendarContext';
import { Task, Contact } from '../types';

interface CalendarSettingsSectionProps {
  tasks: Task[];
  contacts: Contact[];
}

const CalendarSettingsSection: React.FC<CalendarSettingsSectionProps> = ({ tasks, contacts }) => {
  const {
    isConnected,
    isConnecting,
    settings,
    connectCalendar,
    disconnectCalendar,
    updateSettings,
    syncNow,
    syncStatus,
    lastError,
  } = useCalendar();

  const [showDisconnectConfirm, setShowDisconnectConfirm] = useState(false);

  const handleDisconnect = async () => {
    await disconnectCalendar();
    setShowDisconnectConfirm(false);
  };

  const formatLastSync = (date?: Date) => {
    if (!date) return 'Never';
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes} min ago`;
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    return `${days} day${days > 1 ? 's' : ''} ago`;
  };

  const syncToggles = [
    { key: 'syncTasks', label: 'Tasks', icon: CheckSquare, description: 'Sync tasks with due dates' },
    { key: 'syncBirthdays', label: 'Birthdays', icon: Gift, description: 'Sync contact birthdays' },
    { key: 'syncImportantDates', label: 'Important Dates', icon: Star, description: 'Sync custom important dates' },
    { key: 'syncFollowUps', label: 'Follow-ups', icon: Phone, description: 'Sync follow-up reminders' },
  ] as const;

  return (
    <div className="glass rounded-3xl p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-green-500 flex items-center justify-center shadow-lg shadow-blue-500/25">
          <Calendar size={20} className="text-white" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-white">Calendar Integration</h3>
          <p className="text-xs text-slate-400">Sync with Google Calendar</p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Connection Status */}
        <div className="p-4 rounded-xl glass-light">
          {isConnected ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                  <Check size={16} className="text-emerald-400" />
                </div>
                <div>
                  <div className="text-sm font-medium text-white">Connected to Google Calendar</div>
                  <div className="text-xs text-slate-400">
                    Last synced: {formatLastSync(settings?.lastSyncAt)}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setShowDisconnectConfirm(true)}
                className="p-2 text-slate-400 hover:text-red-400 transition-colors"
                title="Disconnect"
              >
                <Unlink size={18} />
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
                  <AlertCircle size={16} className="text-amber-400" />
                </div>
                <div>
                  <div className="text-sm font-medium text-white">Not Connected</div>
                  <div className="text-xs text-slate-400">
                    Connect to sync events to your calendar
                  </div>
                </div>
              </div>
              <button
                onClick={connectCalendar}
                disabled={isConnecting}
                className="px-4 py-2 bg-gradient-to-r from-blue-500 to-green-500 text-white text-sm font-semibold rounded-xl hover:shadow-lg hover:shadow-blue-500/25 transition-all disabled:opacity-50 flex items-center gap-2"
              >
                {isConnecting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Connecting...
                  </>
                ) : (
                  'Connect'
                )}
              </button>
            </div>
          )}
        </div>

        {/* Disconnect Confirmation */}
        {showDisconnectConfirm && (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20">
            <p className="text-sm text-red-300 mb-3">
              Disconnect Google Calendar? All synced events will be removed from your calendar.
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleDisconnect}
                disabled={isConnecting}
                className="px-4 py-2 bg-red-500 text-white text-sm font-semibold rounded-xl hover:bg-red-600 transition-all disabled:opacity-50"
              >
                {isConnecting ? 'Disconnecting...' : 'Disconnect'}
              </button>
              <button
                onClick={() => setShowDisconnectConfirm(false)}
                className="px-4 py-2 glass-light text-white text-sm font-semibold rounded-xl hover:bg-white/10 transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Error Message */}
        {lastError && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20">
            <p className="text-sm text-red-300">{lastError}</p>
          </div>
        )}

        {/* Sync Options (only show when connected) */}
        {isConnected && settings && (
          <>
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-3 block">
                Sync Settings
              </label>
              <div className="space-y-2">
                {syncToggles.map(({ key, label, icon: Icon, description }) => (
                  <label
                    key={key}
                    className="flex items-center justify-between p-3 rounded-xl glass-light cursor-pointer hover:bg-white/5 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Icon size={16} className="text-slate-400" />
                      <div>
                        <div className="text-sm text-white">{label}</div>
                        <div className="text-xs text-slate-500">{description}</div>
                      </div>
                    </div>
                    <div className="relative">
                      <input
                        type="checkbox"
                        checked={settings[key]}
                        onChange={(e) => updateSettings({ [key]: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-10 h-6 bg-slate-700 rounded-full peer peer-checked:bg-gradient-to-r peer-checked:from-blue-500 peer-checked:to-green-500 transition-all" />
                      <div className="absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform peer-checked:translate-x-4" />
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Sync Now Button */}
            <div className="flex items-center justify-between pt-4 border-t border-white/5">
              <div className="text-xs text-slate-400">
                {syncStatus === 'success' && 'Sync completed!'}
                {syncStatus === 'error' && 'Sync failed'}
                {syncStatus === 'idle' && 'Sync your CRM data to Google Calendar'}
              </div>
              <button
                onClick={() => syncNow(tasks, contacts)}
                disabled={syncStatus === 'syncing'}
                className="px-5 py-2.5 bg-gradient-to-r from-blue-500 to-green-500 text-white text-sm font-semibold rounded-xl hover:shadow-lg hover:shadow-blue-500/25 transition-all disabled:opacity-50 flex items-center gap-2"
              >
                {syncStatus === 'syncing' ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Syncing...
                  </>
                ) : syncStatus === 'success' ? (
                  <>
                    <Check size={16} />
                    Synced!
                  </>
                ) : (
                  <>
                    <RefreshCw size={16} />
                    Sync Now
                  </>
                )}
              </button>
            </div>
          </>
        )}

        {/* Info notice */}
        <div className="p-4 rounded-xl glass-light border border-white/5">
          <div className="flex items-start gap-3">
            <Calendar size={16} className="text-blue-400 mt-0.5 flex-shrink-0" />
            <div className="text-xs text-slate-400">
              <strong className="text-slate-300">One-way sync.</strong> Events created in Tethru will appear on your Google Calendar. Changes sync automatically when you add or update items.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CalendarSettingsSection;
