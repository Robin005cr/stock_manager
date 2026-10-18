import { useCallback, useEffect, useState } from 'react';
import { fetchStockBookingReminders } from '../api/stockBookings';
import './ReminderBell.css';

const DAY_IN_MILLISECONDS = 24 * 60 * 60 * 1000;

function formatExpiryDate(value) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(value));
}

export default function ReminderBell() {
  const [reminders, setReminders] = useState([]);
  const [now, setNow] = useState(() => Date.now());
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState('');

  const loadReminders = useCallback(async () => {
    try {
      const data = await fetchStockBookingReminders();
      setReminders(data.items || []);
      setError('');
    } catch (loadError) {
      setError(loadError.message || 'Could not load stock booking reminders.');
    }
  }, []);

  useEffect(() => {
    loadReminders();

    const refreshInterval = window.setInterval(loadReminders, 5 * 60 * 1000);
    const clockInterval = window.setInterval(() => setNow(Date.now()), 60 * 1000);
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') loadReminders();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', loadReminders);
    return () => {
      window.clearInterval(refreshInterval);
      window.clearInterval(clockInterval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', loadReminders);
    };
  }, [loadReminders]);

  const activeReminders = reminders.filter((reminder) => new Date(reminder.expiresAt).getTime() > now);

  return (
    <div className="reminder-control">
      <button
        type="button"
        className="reminder-button"
        aria-label={`Stock booking reminders, ${activeReminders.length} active`}
        aria-expanded={isOpen}
        aria-controls="stock-booking-reminders"
        title="Stock booking reminders"
        onClick={() => setIsOpen((open) => !open)}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" />
        </svg>
        {activeReminders.length > 0 && (
          <span className="reminder-count" aria-hidden="true">
            {activeReminders.length > 99 ? '99+' : activeReminders.length}
          </span>
        )}
      </button>
      {isOpen && (
        <section
          className="reminder-popover"
          id="stock-booking-reminders"
          aria-label="Stock booking reminders"
        >
          <h2>Stock booking reminders</h2>
          {error ? (
            <div className="reminder-error" role="alert">
              <p>{error}</p>
              <button type="button" onClick={loadReminders}>Try again</button>
            </div>
          ) : activeReminders.length === 0 ? (
            <p className="reminder-empty">No active stock bookings.</p>
          ) : (
            <ul className="reminder-list">
              {activeReminders.map((reminder) => {
                const daysRemaining = Math.ceil(
                  (new Date(reminder.expiresAt).getTime() - now) / DAY_IN_MILLISECONDS,
                );
                const dayLabel = daysRemaining === 1 ? 'day' : 'days';

                return (
                  <li key={reminder.id}>
                    <strong>{reminder.customerName}</strong>: {daysRemaining} remaining {dayLabel} left,
                    {' '}will expire on {formatExpiryDate(reminder.expiresAt)}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
