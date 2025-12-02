import { useState, useEffect, useMemo } from 'react';
import { Calendar, Clock, Users, ChevronLeft, ChevronRight, Loader2, Video, Mail, Phone, ExternalLink } from 'lucide-react';

interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  location?: string;
  start: { dateTime?: string; date?: string; timeZone?: string };
  end: { dateTime?: string; date?: string; timeZone?: string };
  attendees?: { email: string; displayName?: string; responseStatus?: string }[];
  creator?: { email: string };
  organizer?: { email: string; displayName?: string };
  status?: string;
  htmlLink?: string;
  eventType?: string;
}

// Parse Topmate description HTML to extract all form fields
interface ParsedTopmateData {
  email: string | null;
  phone: string | null;
  preferredContact: string | null;
  fullName: string | null;
  gender: string | null;
  age: string | null;
  dateOfBirth: string | null;
  occupation: string | null;
  location: string | null;
  relationshipStatus: string | null;
  primaryConcern: string | null;
  detailedConcern: string | null;
  whenNoticed: string | null;
  stepsTried: string | null;
  previousSupport: string | null;
  successSigns: string | null;
  additionalInfo: string | null;
  callAbout: string | null;
  introText: string | null;
  college: string | null;
  course: string | null;
  collegeId: string | null;
}

const parseTopmateDescription = (description?: string): ParsedTopmateData => {
  const result: ParsedTopmateData = {
    email: null,
    phone: null,
    preferredContact: null,
    fullName: null,
    gender: null,
    age: null,
    dateOfBirth: null,
    occupation: null,
    location: null,
    relationshipStatus: null,
    primaryConcern: null,
    detailedConcern: null,
    whenNoticed: null,
    stepsTried: null,
    previousSupport: null,
    successSigns: null,
    additionalInfo: null,
    callAbout: null,
    introText: null,
    college: null,
    course: null,
    collegeId: null,
  };

  if (!description) return result;

  // Extract intro text (before first <h4>)
  const introMatch = description.match(/^([^<]+)/);
  if (introMatch) result.introText = introMatch[1].replace(/<br>/gi, '').trim();

  // Helper to extract field value - gets content between this h4 and the next h4 or end
  const extractField = (labelPatterns: string[]): string | null => {
    for (const label of labelPatterns) {
      // Match the h4 tag and capture everything until the next <h4> or <br><br>Click or end
      const regex = new RegExp(
        `<h4>\\s*${label}[^<]*<\\/h4>\\s*<br>\\s*([\\s\\S]*?)(?=<h4>|<br><br>Click|$)`,
        'i'
      );
      const match = description.match(regex);
      if (match && match[1]) {
        // Clean up the extracted text
        const value = match[1]
          .replace(/<br>/gi, ' ')
          .replace(/<[^>]+>/g, '')
          .trim();
        if (value && value.length > 0) {
          return value;
        }
      }
    }
    return null;
  };

  // Extract all fields with multiple possible label patterns
  result.email = extractField(['Email']);
  result.phone = extractField(['Phone']);
  result.preferredContact = extractField(['Preferred Contact Number']);
  result.fullName = extractField(['Full Name']);
  result.gender = extractField(['Gender.*Pronouns', 'Gender']);
  result.age = extractField(['Age \\*', 'Age']);
  result.dateOfBirth = extractField(['Date of Birth']);
  result.occupation = extractField(['Occupation']);
  result.location = extractField(['Location.*City.*State', 'Location.*City.*Country', 'Location']);
  result.relationshipStatus = extractField(['Relationship Status']);
  result.callAbout = extractField(['What is the call about']);
  
  // Student session specific fields
  result.college = extractField(['College.*University.*Name', 'College']);
  result.course = extractField(['Course.*Year']);
  result.collegeId = extractField(['Attach your valid College ID']);
  
  // Longer form fields - Intimate care specific
  result.primaryConcern = extractField([
    'What is the primary concern.*brings you to this session',
    'Primary Concern'
  ]);
  result.detailedConcern = extractField([
    'Please share your concern in as much detail',
    'Detailed.*concern'
  ]);
  result.whenNoticed = extractField([
    'When did you first start noticing this concern',
    'When.*first.*noticing'
  ]);
  result.stepsTried = extractField([
    'What steps have you already tried',
    'Steps.*tried'
  ]);
  result.previousSupport = extractField([
    'Have you worked with a coach.*therapist',
    'Previous.*support'
  ]);
  result.successSigns = extractField([
    'What signs or changes would help you feel',
    '14\\..*signs.*changes'
  ]);
  result.additionalInfo = extractField([
    'Is there anything else you.*like me to know',
    '15\\..*anything else'
  ]);

  // Calculate age from date of birth if age not directly available
  if (!result.age && result.dateOfBirth) {
    try {
      const parts = result.dateOfBirth.split('/');
      if (parts.length === 3) {
        const birthYear = parseInt(parts[2]);
        const currentYear = new Date().getFullYear();
        result.age = String(currentYear - birthYear);
      }
    } catch {
      // Ignore parsing errors
    }
  }

  return result;
};

const CALENDAR_WEBHOOK_URL = 'https://backend-n8n.7za6uc.easypanel.host/webhook/Calendar';

export function CalendarPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [selectedDateEvents, setSelectedDateEvents] = useState<CalendarEvent[]>([]);
  const [isLoadingDateEvents, setIsLoadingDateEvents] = useState(false);

  // Fetch events for a specific month range
  const fetchEventsForMonth = async (monthDate: Date, isInitial = false) => {
    try {
      if (isInitial) setIsLoading(true);
      
      // Get first and last day of the month
      const startOfMonth = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
      startOfMonth.setHours(0, 0, 0, 0);
      
      const endOfMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);
      endOfMonth.setHours(23, 59, 59, 999);
      
      const response = await fetch(CALENDAR_WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          after: startOfMonth.toISOString(),
          before: endOfMonth.toISOString(),
        }),
      });
      
      if (!response.ok) throw new Error('Failed to fetch calendar events');
      const data = await response.json();
      const eventList = Array.isArray(data) ? data : data.events || data.data || [];
      setEvents(eventList);
      setError(null);
    } catch (err) {
      console.error('Error fetching calendar events:', err);
      // Fallback to GET request for all events
      try {
        const response = await fetch(CALENDAR_WEBHOOK_URL);
        if (response.ok) {
          const data = await response.json();
          const eventList = Array.isArray(data) ? data : data.events || data.data || [];
          setEvents(eventList);
        }
      } catch {
        setError('Failed to load calendar events. Please try again later.');
      }
    } finally {
      if (isInitial) setIsLoading(false);
    }
  };

  // Fetch events on initial load and when month changes
  useEffect(() => {
    fetchEventsForMonth(currentMonth, events.length === 0);
  }, [currentMonth]);

  // Fetch events for selected date via POST
  const fetchEventsForDate = async (date: Date) => {
    try {
      setIsLoadingDateEvents(true);
      
      // Create date range for the selected day (start of day to end of day)
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      
      const response = await fetch(CALENDAR_WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          after: startOfDay.toISOString(),
          before: endOfDay.toISOString(),
        }),
      });
      
      if (!response.ok) throw new Error('Failed to fetch events for date');
      
      const data = await response.json();
      const eventList = Array.isArray(data) ? data : data.events || data.data || [];
      setSelectedDateEvents(eventList);
    } catch (err) {
      console.error('Error fetching events for date:', err);
      // Fallback to filtering from existing events
      const filtered = events.filter((event) => {
        const eventDate = getEventDateTime(event);
        eventDate.setHours(0, 0, 0, 0);
        const compareDate = new Date(date);
        compareDate.setHours(0, 0, 0, 0);
        return eventDate.getTime() === compareDate.getTime();
      });
      setSelectedDateEvents(filtered);
    } finally {
      setIsLoadingDateEvents(false);
    }
  };

  const getEventDateTime = (event: CalendarEvent): Date => {
    const dateStr = event.start.dateTime || event.start.date || '';
    return new Date(dateStr);
  };

  const formatTime = (dateStr?: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const todaysEvents = useMemo(() => {
    return events.filter((event) => {
      const eventDate = getEventDateTime(event);
      eventDate.setHours(0, 0, 0, 0);
      return eventDate.getTime() === today.getTime();
    }).sort((a, b) => getEventDateTime(a).getTime() - getEventDateTime(b).getTime());
  }, [events, today]);

  const upcomingEvents = useMemo(() => {
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return events
      .filter((event) => {
        const eventDate = getEventDateTime(event);
        return eventDate >= tomorrow;
      })
      .sort((a, b) => getEventDateTime(a).getTime() - getEventDateTime(b).getTime())
      .slice(0, 10);
  }, [events, today]);

  // Calendar grid helpers
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay();
    return { daysInMonth, startingDay };
  };

  const { daysInMonth, startingDay } = getDaysInMonth(currentMonth);

  const eventsOnDay = (day: number) => {
    const checkDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    checkDate.setHours(0, 0, 0, 0);
    return events.filter((event) => {
      const eventDate = getEventDateTime(event);
      eventDate.setHours(0, 0, 0, 0);
      return eventDate.getTime() === checkDate.getTime();
    });
  };

  const isToday = (day: number) => {
    const checkDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    checkDate.setHours(0, 0, 0, 0);
    return checkDate.getTime() === today.getTime();
  };

  const isSelected = (day: number) => {
    if (!selectedDate) return false;
    const checkDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    checkDate.setHours(0, 0, 0, 0);
    return checkDate.getTime() === selectedDate.getTime();
  };

  const handleDayClick = (day: number) => {
    const clickedDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    clickedDate.setHours(0, 0, 0, 0);
    setSelectedDate(clickedDate);
    fetchEventsForDate(clickedDate);
  };

  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const getEventColor = (event: CalendarEvent) => {
    const summary = (event.summary || '').toLowerCase();
    if (summary.includes('meeting') || summary.includes('call')) return 'bg-blue-500';
    if (summary.includes('deadline') || summary.includes('due')) return 'bg-red-500';
    if (summary.includes('review') || summary.includes('check')) return 'bg-amber-500';
    return 'bg-emerald-500';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-indigo-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading calendar events...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center bg-red-50 p-8 rounded-2xl">
          <Calendar className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <p className="text-red-600 font-medium">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Calendar & Events</h1>
          <p className="text-gray-600 mt-1">Manage your upcoming events and schedule</p>
        </div>
        <div className="flex items-center gap-2 bg-indigo-50 px-4 py-2 rounded-xl">
          <Calendar className="w-5 h-5 text-indigo-600" />
          <span className="text-sm font-semibold text-indigo-700">{events.length} Total Events</span>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-5 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm font-medium">Today's Events</p>
              <p className="text-3xl font-bold mt-1">{todaysEvents.length}</p>
            </div>
            <div className="bg-white/20 p-3 rounded-xl">
              <Clock className="w-6 h-6" />
            </div>
          </div>
        </div>
        <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl p-5 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-emerald-100 text-sm font-medium">Upcoming Events</p>
              <p className="text-3xl font-bold mt-1">{upcomingEvents.length}</p>
            </div>
            <div className="bg-white/20 p-3 rounded-xl">
              <Calendar className="w-6 h-6" />
            </div>
          </div>
        </div>
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-5 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm font-medium">This Month</p>
              <p className="text-3xl font-bold mt-1">
                {events.filter((e) => {
                  const d = getEventDateTime(e);
                  return d.getMonth() === currentMonth.getMonth() && d.getFullYear() === currentMonth.getFullYear();
                }).length}
              </p>
            </div>
            <div className="bg-white/20 p-3 rounded-xl">
              <Users className="w-6 h-6" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">
              {currentMonth.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
            </h2>
            <div className="flex items-center gap-2">
              <button
                onClick={prevMonth}
                title="Previous month"
                aria-label="Previous month"
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ChevronLeft className="w-5 h-5 text-gray-600" />
              </button>
              <button
                onClick={() => setCurrentMonth(new Date())}
                className="px-3 py-1.5 text-sm font-medium text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
              >
                Today
              </button>
              <button
                onClick={nextMonth}
                title="Next month"
                aria-label="Next month"
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ChevronRight className="w-5 h-5 text-gray-600" />
              </button>
            </div>
          </div>

          {/* Days of week header */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div key={day} className="text-center text-xs font-semibold text-gray-500 py-2">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1">
            {/* Empty cells for days before the 1st */}
            {Array.from({ length: startingDay }).map((_, i) => (
              <div key={`empty-${i}`} className="aspect-square p-1" />
            ))}
            {/* Days of the month */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dayEvents = eventsOnDay(day);
              const hasEvents = dayEvents.length > 0;
              return (
                <button
                  key={day}
                  onClick={() => handleDayClick(day)}
                  className={`aspect-square p-1 rounded-xl transition-all relative group ${
                    isSelected(day)
                      ? 'bg-indigo-600 text-white shadow-lg'
                      : isToday(day)
                      ? 'bg-indigo-100 text-indigo-700 font-bold'
                      : 'hover:bg-gray-100'
                  }`}
                >
                  <span className="text-sm">{day}</span>
                  {hasEvents && (
                    <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5">
                      {dayEvents.slice(0, 3).map((event, idx) => (
                        <div
                          key={idx}
                          className={`w-1.5 h-1.5 rounded-full ${
                            isSelected(day) ? 'bg-white' : getEventColor(event)
                          }`}
                        />
                      ))}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Selected date indicator */}
          {selectedDate && (
            <div className="mt-4 pt-4 border-t border-gray-100 text-center">
              <p className="text-sm text-gray-600">
                Selected: <span className="font-semibold text-indigo-600">{selectedDate.toLocaleDateString('en-IN', { weekday: 'long', month: 'long', day: 'numeric' })}</span>
                {' '}({selectedDateEvents.length} events)
              </p>
            </div>
          )}
        </div>

        {/* Right sidebar - Today & Upcoming */}
        <div className="space-y-6">
          {/* Today's Events */}
          <div className="bg-white rounded-2xl shadow-lg p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
              <h3 className="font-bold text-gray-900">Today's Events</h3>
            </div>
            {todaysEvents.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-500 text-sm">No events today</p>
              </div>
            ) : (
              <div className="space-y-3">
                {todaysEvents.map((event) => {
                  const parsed = parseTopmateDescription(event.description);
                  return (
                    <div
                      key={event.id}
                      onClick={() => setSelectedEvent(event)}
                      className="p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100 cursor-pointer hover:shadow-md transition-all"
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-1 h-full min-h-[50px] rounded-full ${getEventColor(event)}`} />
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 truncate">{event.summary}</p>
                          {parsed.fullName && (
                            <p className="text-sm text-indigo-600 font-medium">{parsed.fullName}</p>
                          )}
                          <div className="flex items-center gap-1 mt-1 text-xs text-gray-500">
                            <Clock className="w-3 h-3" />
                            <span>{formatTime(event.start.dateTime)} - {formatTime(event.end.dateTime)}</span>
                          </div>
                          <div className="flex flex-wrap items-center gap-2 mt-1">
                            {parsed.age && (
                              <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">{parsed.age} yrs</span>
                            )}
                            {parsed.gender && (
                              <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">{parsed.gender}</span>
                            )}
                            {parsed.location && (
                              <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded truncate max-w-[100px]">{parsed.location}</span>
                            )}
                          </div>
                          {(parsed.phone || parsed.preferredContact) && (
                            <div className="flex items-center gap-1 mt-1 text-xs text-gray-500">
                              <Phone className="w-3 h-3" />
                              <span>{parsed.preferredContact || parsed.phone}</span>
                            </div>
                          )}
                          {event.location && event.location.includes('topmate') && (
                            <div className="flex items-center gap-1 mt-1 text-xs text-indigo-600">
                              <Video className="w-3 h-3" />
                              <span>Video Call</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Upcoming Events */}
          <div className="bg-white rounded-2xl shadow-lg p-5">
            <h3 className="font-bold text-gray-900 mb-4">Upcoming Events</h3>
            {upcomingEvents.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-500 text-sm">No upcoming events</p>
              </div>
            ) : (
              <div className="space-y-3">
                {upcomingEvents.map((event) => {
                  const parsed = parseTopmateDescription(event.description);
                  return (
                    <div
                      key={event.id}
                      onClick={() => setSelectedEvent(event)}
                      className="p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 w-12 text-center">
                          <div className="text-xs font-medium text-gray-500">
                            {new Date(event.start.dateTime || event.start.date || '').toLocaleDateString('en-IN', { month: 'short' })}
                          </div>
                          <div className="text-lg font-bold text-gray-900">
                            {new Date(event.start.dateTime || event.start.date || '').getDate()}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 truncate">{event.summary}</p>
                          {parsed.fullName && (
                            <p className="text-sm text-indigo-600">{parsed.fullName}</p>
                          )}
                          <p className="text-xs text-gray-500 mt-0.5">
                            {formatTime(event.start.dateTime)}
                            {parsed.age && ` • ${parsed.age} yrs`}
                            {parsed.location && ` • ${parsed.location}`}
                          </p>
                        </div>
                        <div className={`w-2 h-2 rounded-full mt-2 ${getEventColor(event)}`} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Selected Date Events Modal */}
      {selectedDate && selectedDateEvents.length > 0 && !selectedEvent && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full p-6 relative max-h-[80vh] overflow-y-auto">
            <button
              type="button"
              onClick={() => setSelectedDate(null)}
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 text-xl leading-none"
            >
              ×
            </button>
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              Events on {selectedDate.toLocaleDateString('en-IN', { weekday: 'long', month: 'long', day: 'numeric' })}
            </h3>
            {isLoadingDateEvents ? (
              <div className="flex items-center justify-center gap-2 text-gray-500 py-8">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Loading events...</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {selectedDateEvents.map((event) => {
                  const parsed = parseTopmateDescription(event.description);
                  return (
                    <div
                      key={event.id}
                      onClick={() => setSelectedEvent(event)}
                      className="p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer border border-gray-100"
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-1 h-full min-h-[60px] rounded-full ${getEventColor(event)}`} />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 text-sm line-clamp-2">{event.summary}</p>
                          {parsed.fullName && (
                            <p className="text-sm text-indigo-600 font-medium mt-1">{parsed.fullName}</p>
                          )}
                          <p className="text-xs text-gray-500 mt-1">
                            {formatTime(event.start.dateTime)} - {formatTime(event.end.dateTime)}
                          </p>
                          {(parsed.phone || parsed.preferredContact) && (
                            <p className="text-xs text-gray-400 mt-0.5">{parsed.preferredContact || parsed.phone}</p>
                          )}
                          {parsed.location && (
                            <p className="text-xs text-gray-400 mt-0.5 truncate">{parsed.location}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Event Details Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-3xl w-full p-6 relative max-h-[90vh] overflow-y-auto">
            <button
              type="button"
              onClick={() => setSelectedEvent(null)}
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 text-xl leading-none"
            >
              ×
            </button>
            
            <div className="flex items-start gap-3 mb-4">
              <div className={`w-1.5 h-12 rounded-full ${getEventColor(selectedEvent)}`} />
              <div>
                <h3 className="text-lg font-bold text-gray-900">{selectedEvent.summary}</h3>
                <p className="text-sm text-gray-500">
                  {selectedEvent.organizer?.displayName || 'Calendar Event'}
                </p>
              </div>
            </div>

            {/* Grid layout for event details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Left Column */}
              <div className="space-y-4">
                {/* Date & Time */}
                <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
                  <Clock className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="font-medium text-gray-900">
                      {formatDate(selectedEvent.start.dateTime || selectedEvent.start.date)}
                    </p>
                    <p className="text-sm text-gray-500">
                      {formatTime(selectedEvent.start.dateTime)} - {formatTime(selectedEvent.end.dateTime)}
                    </p>
                  </div>
                </div>

                {/* Client Info from Description */}
                {(() => {
                  const parsed = parseTopmateDescription(selectedEvent.description);
                  return (
                    <>
                      {/* Client Profile Card */}
                      {(parsed.fullName || parsed.email || parsed.phone) && (
                        <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
                          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Client Profile</h4>
                          <div className="space-y-2 text-sm">
                            {parsed.fullName && (
                              <div>
                                <span className="text-gray-500">Name:</span>
                                <span className="ml-2 font-medium text-gray-900">{parsed.fullName}</span>
                              </div>
                            )}
                            {parsed.email && (
                              <div className="flex items-center gap-2">
                                <Mail className="w-4 h-4 text-blue-500" />
                                <a href={`mailto:${parsed.email}`} className="text-blue-600 hover:underline text-sm">
                                  {parsed.email}
                                </a>
                              </div>
                            )}
                            {(parsed.phone || parsed.preferredContact) && (
                              <div className="flex items-center gap-2">
                                <Phone className="w-4 h-4 text-green-500" />
                                <a href={`tel:${parsed.phone || parsed.preferredContact}`} className="text-green-600 hover:underline">
                                  {parsed.preferredContact || parsed.phone}
                                </a>
                              </div>
                            )}
                            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-blue-100">
                              {parsed.gender && (
                                <div>
                                  <span className="text-gray-500 text-xs">Gender:</span>
                                  <span className="ml-1 text-gray-900">{parsed.gender}</span>
                                </div>
                              )}
                              {parsed.age && (
                                <div>
                                  <span className="text-gray-500 text-xs">Age:</span>
                                  <span className="ml-1 text-gray-900">{parsed.age}</span>
                                </div>
                              )}
                              {parsed.occupation && (
                                <div className="col-span-2">
                                  <span className="text-gray-500 text-xs">Occupation:</span>
                                  <span className="ml-1 text-gray-900">{parsed.occupation}</span>
                                </div>
                              )}
                              {parsed.location && (
                                <div className="col-span-2">
                                  <span className="text-gray-500 text-xs">Location:</span>
                                  <span className="ml-1 text-gray-900">{parsed.location}</span>
                                </div>
                              )}
                              {parsed.relationshipStatus && (
                                <div className="col-span-2">
                                  <span className="text-gray-500 text-xs">Relationship:</span>
                                  <span className="ml-1 text-gray-900">{parsed.relationshipStatus}</span>
                                </div>
                              )}
                              {parsed.college && (
                                <div className="col-span-2">
                                  <span className="text-gray-500 text-xs">College:</span>
                                  <span className="ml-1 text-gray-900">{parsed.college}</span>
                                </div>
                              )}
                              {parsed.course && (
                                <div className="col-span-2">
                                  <span className="text-gray-500 text-xs">Course:</span>
                                  <span className="ml-1 text-gray-900">{parsed.course}</span>
                                </div>
                              )}
                            </div>
                            {parsed.collegeId && (
                              <div className="mt-2 pt-2 border-t border-blue-100">
                                <span className="text-gray-500 text-xs">College ID:</span>
                                <a href={parsed.collegeId} target="_blank" rel="noopener noreferrer" className="ml-1 text-blue-600 hover:underline text-xs">
                                  View ID
                                </a>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Call Topic */}
                      {parsed.callAbout && (
                        <div className="p-3 bg-amber-50 rounded-xl border border-amber-100">
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Call Topic</p>
                          <p className="text-gray-900 text-sm">{parsed.callAbout}</p>
                        </div>
                      )}

                      {/* Meeting Link */}
                      {selectedEvent.location && (
                        <div className="flex items-center gap-3 p-3 bg-indigo-50 rounded-xl border border-indigo-100">
                          <Video className="w-5 h-5 text-indigo-500" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-gray-500 uppercase tracking-wide">Meeting Link</p>
                            <a
                              href={selectedEvent.location}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-indigo-600 font-medium hover:underline flex items-center gap-1 text-sm"
                            >
                              Join Video Call <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>

              {/* Right Column - Concerns & Details */}
              <div className="space-y-4">
                {(() => {
                  const parsed = parseTopmateDescription(selectedEvent.description);
                  return (
                    <>
                      {/* Primary Concern */}
                      {parsed.primaryConcern && (
                        <div className="p-3 bg-rose-50 rounded-xl border border-rose-100">
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Primary Concern</p>
                          <p className="text-gray-800 text-sm whitespace-pre-wrap">{parsed.primaryConcern}</p>
                        </div>
                      )}

                      {/* Detailed Concern */}
                      {parsed.detailedConcern && (
                        <div className="p-3 bg-gray-50 rounded-xl">
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Detailed Background</p>
                          <p className="text-gray-700 text-sm whitespace-pre-wrap max-h-32 overflow-y-auto">{parsed.detailedConcern}</p>
                        </div>
                      )}

                      {/* When Noticed */}
                      {parsed.whenNoticed && (
                        <div className="p-3 bg-gray-50 rounded-xl">
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">When First Noticed</p>
                          <p className="text-gray-700 text-sm whitespace-pre-wrap">{parsed.whenNoticed}</p>
                        </div>
                      )}

                      {/* Steps Tried */}
                      {parsed.stepsTried && (
                        <div className="p-3 bg-gray-50 rounded-xl">
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Steps Already Tried</p>
                          <p className="text-gray-700 text-sm whitespace-pre-wrap">{parsed.stepsTried}</p>
                        </div>
                      )}

                      {/* Previous Support */}
                      {parsed.previousSupport && (
                        <div className="p-3 bg-gray-50 rounded-xl">
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Previous Professional Support</p>
                          <p className="text-gray-700 text-sm whitespace-pre-wrap">{parsed.previousSupport}</p>
                        </div>
                      )}

                      {/* Success Signs */}
                      {parsed.successSigns && (
                        <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">What Would Help</p>
                          <p className="text-gray-700 text-sm whitespace-pre-wrap">{parsed.successSigns}</p>
                        </div>
                      )}

                      {/* Additional Info */}
                      {parsed.additionalInfo && (
                        <div className="p-3 bg-gray-50 rounded-xl">
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Additional Notes</p>
                          <p className="text-gray-700 text-sm whitespace-pre-wrap">{parsed.additionalInfo}</p>
                        </div>
                      )}
                    </>
                  );
                })()}

                {/* Attendees */}
                {selectedEvent.attendees && selectedEvent.attendees.length > 0 && (
                  <div className="p-3 bg-gray-50 rounded-xl">
                    <div className="flex items-center gap-2 mb-2">
                      <Users className="w-4 h-4 text-gray-400" />
                      <p className="text-xs text-gray-500 uppercase tracking-wide">Attendees</p>
                    </div>
                    <div className="space-y-1">
                      {selectedEvent.attendees.map((attendee, idx) => (
                        <div key={idx} className="flex items-center justify-between text-sm">
                          <span className="text-gray-700">{attendee.displayName || attendee.email}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            attendee.responseStatus === 'accepted' ? 'bg-green-100 text-green-700' :
                            attendee.responseStatus === 'declined' ? 'bg-red-100 text-red-700' :
                            'bg-gray-100 text-gray-600'
                          }`}>
                            {attendee.responseStatus || 'pending'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Footer - Status & Actions */}
            <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">Status:</span>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                  selectedEvent.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                  selectedEvent.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                  'bg-gray-100 text-gray-700'
                }`}>
                  {selectedEvent.status || 'confirmed'}
                </span>
              </div>

              {/* Google Calendar Link */}
              {selectedEvent.htmlLink && (
                <a
                  href={selectedEvent.htmlLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors"
                >
                  Open in Google Calendar
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
