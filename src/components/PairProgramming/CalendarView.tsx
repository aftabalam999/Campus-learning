import React, { useState, useEffect } from 'react';
import { CalendarEvent } from '../../types';
import { ChevronLeft, ChevronRight, Calendar, Clock } from 'lucide-react';
import { EnhancedPairProgrammingService } from '../../services/dataServices';
import { useAuth } from '../../contexts/AuthContext';

interface CalendarViewProps {
  onEventClick?: (event: CalendarEvent) => void;
}

const CalendarView: React.FC<CalendarViewProps> = ({ onEventClick }) => {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const { userData } = useAuth();

  useEffect(() => {
    const fetchEvents = async () => {
      if (!userData?.id) return;

      try {
        setLoading(true);
        // Fetch sessions and convert to calendar events
        const sessionsData = await EnhancedPairProgrammingService.getSessionsByUser(userData.id);
        
        const calendarEvents: CalendarEvent[] = sessionsData.map(session => ({
          id: session.id,
          type: 'pair_session' as const,
          title: `Pair Programming: ${session.topic}`,
          description: session.description,
          start_date: session.scheduled_date || new Date(),
          end_date: session.scheduled_date || new Date(),
          user_id: userData.id,
          session_id: session.id,
          status: session.status === 'completed' ? 'completed' : session.status === 'cancelled' ? 'cancelled' : 'scheduled',
          priority: session.priority
        }));
        setEvents(calendarEvents);
      } catch (error) {
        console.error('Error fetching calendar events:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, [userData?.id]);

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }

    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }

    return days;
  };

  const getEventsForDate = (date: Date) => {
    return events.filter(event => {
      if (!event.start_date) return false;
      const eventDate = new Date(event.start_date);
      return eventDate.toDateString() === date.toDateString();
    });
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prevDate => {
      const newDate = new Date(prevDate);
      if (direction === 'prev') {
        newDate.setMonth(newDate.getMonth() - 1);
      } else {
        newDate.setMonth(newDate.getMonth() + 1);
      }
      return newDate;
    });
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const days = getDaysInMonth(currentDate);
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const getEventColor = (type: string) => {
    switch (type) {
      case 'pair_session':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'leave':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'goal_deadline':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'reflection_deadline':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'urgent':
        return 'ring-2 ring-red-400';
      case 'high':
        return 'ring-2 ring-orange-400';
      case 'medium':
        return 'ring-2 ring-yellow-400';
      case 'low':
        return 'ring-2 ring-green-400';
      default:
        return '';
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">Loading calendar...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Calendar Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h2 className="text-xl font-semibold text-gray-900">
              {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
            </h2>
            <button
              onClick={goToToday}
              className="text-sm text-primary-600 hover:text-primary-800 font-medium"
            >
              Today
            </button>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => navigateMonth('prev')}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              onClick={() => navigateMonth('next')}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="p-6">
        {/* Day Headers */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {dayNames.map(day => (
            <div key={day} className="p-2 text-center text-sm font-medium text-gray-500">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Days */}
        <div className="grid grid-cols-7 gap-1">
          {days.map((date, index) => {
            if (!date) {
              return <div key={index} className="h-24 bg-gray-50 rounded-md"></div>;
            }

            const dayEvents = getEventsForDate(date);
            const isToday = date.toDateString() === new Date().toDateString();
            const isPast = date < new Date() && !isToday;

            return (
              <div
                key={index}
                className={`h-24 p-1 border rounded-md ${
                  isToday
                    ? 'bg-primary-50 border-primary-200'
                    : isPast
                    ? 'bg-gray-50 border-gray-200'
                    : 'bg-white border-gray-200 hover:bg-gray-50'
                }`}
              >
                <div className={`text-sm font-medium mb-1 ${
                  isToday ? 'text-primary-700' : isPast ? 'text-gray-400' : 'text-gray-900'
                }`}>
                  {date.getDate()}
                </div>

                {/* Events for this day */}
                <div className="space-y-1">
                  {dayEvents.slice(0, 2).map((event, eventIndex) => (
                    <div
                      key={eventIndex}
                      onClick={() => {
                        onEventClick?.(event);
                      }}
                      className={`text-xs p-1 rounded border ${getEventColor(event.type)} ${getPriorityColor(event.priority)} truncate cursor-pointer hover:opacity-80 transition-opacity`}
                      title={event.title}
                    >
                      {event.title}
                    </div>
                  ))}

                  {dayEvents.length > 2 && (
                    <div className="text-xs text-gray-500 text-center">
                      +{dayEvents.length - 2} more
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Upcoming Events Sidebar */}
      <div className="border-t border-gray-200 p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Upcoming Events</h3>

        {events.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No upcoming events</p>
        ) : (
          <div className="space-y-3">
            {events
              .filter(event => event.start_date && new Date(event.start_date) >= new Date())
              .sort((a, b) => new Date(a.start_date!).getTime() - new Date(b.start_date!).getTime())
              .slice(0, 5)
              .map((event, index) => (
                <div 
                  key={index} 
                  onClick={() => onEventClick?.(event)}
                  className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors"
                >
                  <div className={`flex-shrink-0 w-3 h-3 rounded-full mt-1.5 ${
                    event.type === 'pair_session' ? 'bg-blue-500' :
                    event.type === 'leave' ? 'bg-red-500' :
                    event.type === 'goal_deadline' ? 'bg-yellow-500' :
                    'bg-purple-500'
                  }`}></div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {event.title}
                    </p>
                    <div className="flex items-center space-x-4 mt-1">
                      <div className="flex items-center text-xs text-gray-500">
                        <Calendar className="h-3 w-3 mr-1" />
                        {event.start_date ? new Date(event.start_date).toLocaleDateString() : 'TBD'}
                      </div>
                      {event.start_date && (
                        <div className="flex items-center text-xs text-gray-500">
                          <Clock className="h-3 w-3 mr-1" />
                          {new Date(event.start_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      )}
                    </div>
                    {event.description && (
                      <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                        {event.description}
                      </p>
                    )}
                  </div>

                  <div className={`flex-shrink-0 px-2 py-1 text-xs font-medium rounded-full ${
                    event.status === 'scheduled' ? 'bg-green-100 text-green-800' :
                    event.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                    event.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {event.status}
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CalendarView;