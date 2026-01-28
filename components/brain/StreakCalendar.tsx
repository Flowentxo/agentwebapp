'use client';

import { useState, useEffect } from 'react';
import { Flame, Trophy, TrendingUp, Calendar } from 'lucide-react';

interface StreakDay {
  date: string;
  questionsAnswered: number;
  rating: number;
}

interface StreakCalendarProps {
  userId?: string;
}

export function StreakCalendar({ userId = 'demo-user' }: StreakCalendarProps) {
  const [streakData, setStreakData] = useState<StreakDay[]>([]);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [longestStreak, setLongestStreak] = useState(0);
  const [totalDays, setTotalDays] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchStreakData();
  }, [userId]);

  const fetchStreakData = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/learning/streak?userId=${userId}`);
      const data = await response.json();

      if (data.success) {
        setStreakData(data.days || []);
        setCurrentStreak(data.currentStreak || 0);
        setLongestStreak(data.longestStreak || 0);
        setTotalDays(data.totalActiveDays || 0);
      }
    } catch (error) {
      console.error('Failed to fetch streak data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Generate 365 days grid (last 52 weeks)
  const generateCalendarGrid = () => {
    const today = new Date();
    const days: (Date | null)[] = [];

    // Start from 364 days ago (52 weeks * 7 days - 1 for today)
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - 364);

    // Find the most recent Sunday
    const dayOfWeek = startDate.getDay();
    const daysToSubtract = dayOfWeek; // 0 (Sunday) to 6 (Saturday)
    startDate.setDate(startDate.getDate() - daysToSubtract);

    // Fill leading empty cells
    for (let i = 0; i < daysToSubtract; i++) {
      days.push(null);
    }

    // Fill 365 days
    for (let i = 0; i < 365; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      if (date <= today) {
        days.push(date);
      }
    }

    return days;
  };

  const getActivityLevel = (date: Date): number => {
    const dateStr = date.toISOString().split('T')[0];
    const dayData = streakData.find(d => d.date.startsWith(dateStr));

    if (!dayData || dayData.questionsAnswered === 0) return 0;
    if (dayData.questionsAnswered >= 5) return 4;
    if (dayData.questionsAnswered >= 3) return 3;
    if (dayData.questionsAnswered >= 2) return 2;
    return 1;
  };

  const getActivityColor = (level: number): string => {
    switch (level) {
      case 4:
        return '#00D26A'; // Darkest green
      case 3:
        return '#26A641';
      case 2:
        return '#39D353';
      case 1:
        return '#9BE9A8'; // Lightest green
      default:
        return 'var(--oracle-surface-secondary)';
    }
  };

  const getDayTooltip = (date: Date): string => {
    const dateStr = date.toISOString().split('T')[0];
    const dayData = streakData.find(d => d.date.startsWith(dateStr));

    const formattedDate = date.toLocaleDateString('de-DE', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });

    if (!dayData || dayData.questionsAnswered === 0) {
      return `${formattedDate}: Keine Aktivität`;
    }

    return `${formattedDate}: ${dayData.questionsAnswered} Frage${dayData.questionsAnswered > 1 ? 'n' : ''} beantwortet`;
  };

  const calendarDays = generateCalendarGrid();
  const weeks: (Date | null)[][] = [];

  for (let i = 0; i < calendarDays.length; i += 7) {
    weeks.push(calendarDays.slice(i, i + 7));
  }

  const monthLabels = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
  const dayLabels = ['Mo', 'Mi', 'Fr'];

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl bg-gradient-to-br from-orange-500/10 to-orange-600/5 border border-orange-500/20 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Flame className="h-5 w-5 text-orange-400" />
            <span className="text-xs font-medium text-orange-400 uppercase tracking-wider">Streak</span>
          </div>
          <p className="text-3xl font-bold oracle-text-primary-color">{currentStreak}</p>
          <p className="text-xs oracle-text-secondary-color mt-1">Tage in Folge</p>
        </div>

        <div className="rounded-xl bg-gradient-to-br from-purple-500/10 to-purple-600/5 border border-purple-500/20 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Trophy className="h-5 w-5 text-purple-400" />
            <span className="text-xs font-medium text-purple-400 uppercase tracking-wider">Rekord</span>
          </div>
          <p className="text-3xl font-bold oracle-text-primary-color">{longestStreak}</p>
          <p className="text-xs oracle-text-secondary-color mt-1">Längste Serie</p>
        </div>

        <div className="rounded-xl bg-gradient-to-br from-blue-500/10 to-blue-600/5 border border-blue-500/20 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="h-5 w-5 text-blue-400" />
            <span className="text-xs font-medium text-blue-400 uppercase tracking-wider">Total</span>
          </div>
          <p className="text-3xl font-bold oracle-text-primary-color">{totalDays}</p>
          <p className="text-xs oracle-text-secondary-color mt-1">Aktive Tage</p>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="rounded-xl bg-gradient-to-br from-gray-500/5 to-gray-600/5 border border-gray-500/10 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="oracle-text-primary-color font-semibold">Letztes Jahr</h3>
          <div className="flex items-center gap-2">
            <span className="text-xs oracle-text-secondary-color">Weniger</span>
            <div className="flex gap-1">
              {[0, 1, 2, 3, 4].map(level => (
                <div
                  key={level}
                  className="w-3 h-3 rounded-sm"
                  style={{ backgroundColor: getActivityColor(level) }}
                />
              ))}
            </div>
            <span className="text-xs oracle-text-secondary-color">Mehr</span>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="flex gap-1">
              <span className="w-2 h-2 rounded-full bg-[var(--oracle-blue)] animate-pulse" />
              <span className="w-2 h-2 rounded-full bg-[var(--oracle-blue)] animate-pulse delay-75" />
              <span className="w-2 h-2 rounded-full bg-[var(--oracle-blue)] animate-pulse delay-150" />
            </div>
          </div>
        ) : (
          <div className="flex gap-1 overflow-x-auto pb-2">
            {/* Day labels */}
            <div className="flex flex-col gap-1 pr-2 text-xs oracle-text-secondary-color pt-5">
              {dayLabels.map((label, idx) => (
                <div key={label} className="h-3 flex items-center" style={{ marginTop: idx > 0 ? '2px' : 0 }}>
                  {label}
                </div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="flex gap-1">
              {weeks.map((week, weekIdx) => (
                <div key={weekIdx} className="flex flex-col gap-1">
                  {/* Month label (only first week of each month) */}
                  {weekIdx % 4 === 0 && week[0] && (
                    <div className="text-xs oracle-text-secondary-color mb-1 h-4">
                      {monthLabels[week[0].getMonth()]}
                    </div>
                  )}
                  {!week[0] && weekIdx % 4 === 0 && <div className="h-4" />}

                  {/* Week squares */}
                  {week.map((day, dayIdx) => (
                    <div
                      key={dayIdx}
                      className="relative group"
                      style={{ marginTop: weekIdx % 4 === 0 && dayIdx === 0 ? '0' : undefined }}
                    >
                      {day ? (
                        <>
                          <div
                            className="w-3 h-3 rounded-sm transition-all duration-200 hover:ring-2 hover:ring-white hover:ring-opacity-50 cursor-pointer"
                            style={{ backgroundColor: getActivityColor(getActivityLevel(day)) }}
                          />
                          {/* Tooltip */}
                          <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 px-2 py-1 rounded bg-popover text-popover-foreground text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 border border-border shadow-lg">
                            {getDayTooltip(day)}
                          </div>
                        </>
                      ) : (
                        <div className="w-3 h-3" />
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Progress towards next milestone */}
        {currentStreak > 0 && (
          <div className="mt-6 pt-6 border-t border-white/10">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm oracle-text-secondary-color">
                Nächster Meilenstein: {Math.ceil(currentStreak / 7) * 7} Tage
              </span>
              <span className="text-sm font-medium oracle-text-primary-color">
                {currentStreak}/{Math.ceil(currentStreak / 7) * 7}
              </span>
            </div>
            <div className="h-2 rounded-full bg-card/10 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-orange-500 to-yellow-500 transition-all duration-500"
                style={{ width: `${(currentStreak / (Math.ceil(currentStreak / 7) * 7)) * 100}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
