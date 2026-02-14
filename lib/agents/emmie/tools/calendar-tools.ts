/**
 * Emmie Calendar Tools
 *
 * Calendar availability checking via Google Calendar API or internal mock.
 */

export interface CalendarCheckAvailabilityInput {
  date: string;
  time_from?: string;
  time_to?: string;
  duration_minutes?: number;
}

export interface TimeSlot {
  start: string;
  end: string;
  available: boolean;
}

export interface CalendarCheckAvailabilityResult {
  date: string;
  available_slots: TimeSlot[];
  busy_slots: TimeSlot[];
  formatted_output: string;
}

export const CALENDAR_CHECK_AVAILABILITY_TOOL = {
  name: 'calendar_check_availability',
  description: 'Pruefe die Kalender-Verfuegbarkeit fuer ein bestimmtes Datum. Zeigt freie und belegte Zeitfenster an.',
  input_schema: {
    type: 'object',
    properties: {
      date: { type: 'string', description: 'Datum im Format YYYY-MM-DD' },
      time_from: { type: 'string', description: 'Start-Zeit (HH:MM, default: 08:00)' },
      time_to: { type: 'string', description: 'End-Zeit (HH:MM, default: 18:00)' },
      duration_minutes: { type: 'number', description: 'Gewuenschte Meeting-Dauer in Minuten (default: 30)' },
    },
    required: ['date'],
  },
};

// Mock calendar data (will be replaced with Google Calendar API)
const mockEvents = [
  { title: 'Team Standup', start: '09:00', end: '09:30' },
  { title: 'Sprint Planning', start: '10:00', end: '11:00' },
  { title: 'Mittagspause', start: '12:00', end: '13:00' },
  { title: 'Client Call', start: '14:00', end: '14:30' },
  { title: 'Review Meeting', start: '16:00', end: '17:00' },
];

export async function checkCalendarAvailability(
  input: CalendarCheckAvailabilityInput
): Promise<CalendarCheckAvailabilityResult> {
  const { date, time_from = '08:00', time_to = '18:00', duration_minutes = 30 } = input;

  // Validate date format
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(date)) {
    return {
      date,
      available_slots: [],
      busy_slots: [],
      formatted_output: '❌ Ungueltiges Datumsformat. Bitte YYYY-MM-DD verwenden.',
    };
  }

  const busySlots: TimeSlot[] = mockEvents.map(event => ({
    start: event.start,
    end: event.end,
    available: false,
  }));

  // Calculate available slots
  const availableSlots: TimeSlot[] = [];
  const fromMinutes = parseTime(time_from);
  const toMinutes = parseTime(time_to);

  let currentTime = fromMinutes;

  // Sort busy slots by start time
  const sortedBusy = [...busySlots].sort(
    (a, b) => parseTime(a.start) - parseTime(b.start)
  );

  for (const busy of sortedBusy) {
    const busyStart = parseTime(busy.start);
    const busyEnd = parseTime(busy.end);

    // Check if there's a free slot before this busy period
    if (currentTime + duration_minutes <= busyStart) {
      availableSlots.push({
        start: formatTime(currentTime),
        end: formatTime(busyStart),
        available: true,
      });
    }
    currentTime = Math.max(currentTime, busyEnd);
  }

  // Check for remaining time after last busy slot
  if (currentTime + duration_minutes <= toMinutes) {
    availableSlots.push({
      start: formatTime(currentTime),
      end: formatTime(toMinutes),
      available: true,
    });
  }

  const dayOfWeek = new Date(date).toLocaleDateString('de-DE', { weekday: 'long' });

  const formatted = [
    `📅 **Kalender-Verfuegbarkeit: ${date}** (${dayOfWeek})`,
    `Zeitraum: ${time_from} - ${time_to} | Gewuenschte Dauer: ${duration_minutes} Min.`,
    '',
    '**Belegte Zeitfenster:**',
    ...(busySlots.length > 0
      ? busySlots.map((s, i) => `- 🔴 ${s.start} - ${s.end} (${mockEvents[i]?.title || 'Termin'})`)
      : ['- Keine Termine']),
    '',
    '**Freie Zeitfenster:**',
    ...(availableSlots.length > 0
      ? availableSlots.map(s => `- 🟢 ${s.start} - ${s.end}`)
      : ['- Keine freien Zeitfenster gefunden']),
  ].join('\n');

  return {
    date,
    available_slots: availableSlots,
    busy_slots: busySlots,
    formatted_output: formatted,
  };
}

function parseTime(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

function formatTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

export const EMMIE_CALENDAR_TOOLS = [CALENDAR_CHECK_AVAILABILITY_TOOL];
