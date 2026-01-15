import React from 'react';
import { CheckCircle, AlertCircle, Smartphone } from 'lucide-react';
import { useCalendar } from '../contexts/CalendarContext';

const MOBILE_APP_SCHEME = 'com.tethru.app';

const CalendarMobileCallback: React.FC = () => {
  const { isConnected, lastError, dismissMobileRedirect } = useCalendar();

  const handleOpenApp = () => {
    // Try to open the mobile app via deep link
    window.location.href = `${MOBILE_APP_SCHEME}://calendar-connected`;
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-4">
      <div className="glass rounded-3xl p-8 max-w-md w-full text-center">
        {isConnected ? (
          <>
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-green-500 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-emerald-500/25">
              <CheckCircle size={32} className="text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Calendar Connected!</h1>
            <p className="text-slate-400 mb-8">
              Your Google Calendar has been successfully connected to Tethru.
            </p>
          </>
        ) : (
          <>
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-red-500/25">
              <AlertCircle size={32} className="text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Connection Failed</h1>
            <p className="text-slate-400 mb-4">
              {lastError || 'Unable to connect your calendar. Please try again.'}
            </p>
          </>
        )}

        <button
          onClick={handleOpenApp}
          className="w-full px-6 py-4 bg-gradient-to-r from-violet-500 to-cyan-500 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-violet-500/25 transition-all flex items-center justify-center gap-3"
        >
          <Smartphone size={20} />
          Open Tethru App
        </button>

        <p className="text-xs text-slate-500 mt-4">
          If the app doesn't open automatically, please return to the Tethru app manually.
        </p>

        <button
          onClick={dismissMobileRedirect}
          className="mt-6 text-sm text-slate-400 hover:text-white transition-colors"
        >
          Continue to web version instead
        </button>
      </div>
    </div>
  );
};

export default CalendarMobileCallback;
