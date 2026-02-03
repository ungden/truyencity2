'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, TrendingUp } from 'lucide-react';

interface AnalyticsChartsProps {
  recentSessions: Array<{
    duration_seconds: number;
    started_at: string;
  }>;
  topNovels: Array<{
    id: string;
    title: string;
    view_count: number;
  }>;
}

export function AnalyticsCharts({ recentSessions, topNovels }: AnalyticsChartsProps) {
  // Group sessions by day for the last 7 days
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - i));
    return date.toISOString().split('T')[0];
  });

  const sessionsByDay = last7Days.map(day => {
    const daySessions = recentSessions.filter(s => 
      s.started_at.startsWith(day)
    );
    const totalMinutes = daySessions.reduce(
      (sum, s) => sum + (s.duration_seconds || 0) / 60,
      0
    );
    return {
      day: new Date(day).toLocaleDateString('vi-VN', { weekday: 'short' }),
      minutes: Math.floor(totalMinutes),
      sessions: daySessions.length
    };
  });

  const maxMinutes = Math.max(...sessionsByDay.map(d => d.minutes), 1);
  const maxSessions = Math.max(...sessionsByDay.map(d => d.sessions), 1);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Reading Time Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 size={20} />
            Thời gian đọc 7 ngày qua
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {sessionsByDay.map((data, index) => (
              <div key={index} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{data.day}</span>
                  <span className="text-muted-foreground">{data.minutes} phút</span>
                </div>
                <div className="h-8 bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg transition-all duration-500"
                    style={{ width: `${(data.minutes / maxMinutes) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Sessions Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp size={20} />
            Số phiên đọc 7 ngày qua
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {sessionsByDay.map((data, index) => (
              <div key={index} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{data.day}</span>
                  <span className="text-muted-foreground">{data.sessions} phiên</span>
                </div>
                <div className="h-8 bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg transition-all duration-500"
                    style={{ width: `${(data.sessions / maxSessions) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}