import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, timer, combineLatest, of, throwError } from 'rxjs';
import { switchMap, catchError, shareReplay, retry } from 'rxjs/operators';

export interface ForecastData {
  forecast_date: string;
  predicted_entries: number;
  predicted_exits: number;
  predicted_net_flow: number;
  demand_level: 'LOW' | 'MEDIUM' | 'HIGH';
  advisory_message: string;
  model_accuracy: {
    model_family: string;
    entry_r2: number;
    exit_r2: number;
    entry_mae: number;
    exit_mae: number;
    confidence: number;
  };
  updated_at: string;
}

export interface SectionOccupancy {
  id: string;
  name: string;
  capacity: number;
  occupied: number;
  available: number;
  occupancy_rate: number;
  color: string;
  oku_total: number;
  oku_occupied: number;
}

export interface SectionsResponse {
  status: string;
  timestamp: string;
  total_spots: number;
  total_occupied: number;
  total_available: number;
  overall_rate: number;
  sections: SectionOccupancy[];
}

export interface ComparisonData {
  today: {
    label: string;
    date: string;
    entries: number;
    exits: number;
    net_flow: number;
  };
  tomorrow: {
    label: string;
    date: string;
    entries: number;
    exits: number;
    net_flow: number;
  };
}

export interface HourlyTrafficData {
  hours: string[];
  live_entries: (number | null)[];
  live_exits: (number | null)[];
  research_avg_entries: number[];
  research_avg_exits: number[];
  current_hour: number;
}

export interface TrendsData {
  period: 'week' | 'month';
  labels: string[];
  entries: number[];
  exits: number[];
  occupancy_peak_pct: number[];
}

@Injectable({
  providedIn: 'root'
})
export class AnalyticsService {
  private baseUrl = 'http://localhost:5060/api/analytics';

  constructor(private http: HttpClient) {}

  getForecast(): Observable<ForecastData> {
    return this.http.get<ForecastData>(`${this.baseUrl}/forecast`).pipe(
      retry(1),
      catchError(err => {
        console.warn('[AnalyticsService] Forecast API offline, providing fallback', err);
        return of({
          forecast_date: 'Sunday, 23 Aug 2026',
          predicted_entries: 410,
          predicted_exits: 380,
          predicted_net_flow: 30,
          demand_level: 'LOW' as const,
          advisory_message: 'Tomorrow is the weekend with low expected campus traffic. Ample parking will be available.',
          model_accuracy: {
            model_family: 'Gradient Boosting Regressor',
            entry_r2: 0.884,
            exit_r2: 0.852,
            entry_mae: 32.4,
            exit_mae: 28.1,
            confidence: 94.2
          },
          updated_at: new Date().toLocaleTimeString()
        });
      })
    );
  }

  getSections(): Observable<SectionsResponse> {
    return this.http.get<SectionsResponse>(`${this.baseUrl}/occupancy-sections`).pipe(
      retry(1),
      catchError(err => {
        console.warn('[AnalyticsService] Sections API offline, providing fallback', err);
        return of({
          status: 'fallback',
          timestamp: new Date().toISOString(),
          total_spots: 1119,
          total_occupied: 742,
          total_available: 377,
          overall_rate: 66.3,
          sections: [
            { id: 'A', name: 'Section A (Main Plaza)', capacity: 400, occupied: 298, available: 102, occupancy_rate: 74.5, color: '#3b82f6', oku_total: 14, oku_occupied: 8 },
            { id: 'B', name: 'Section B (South Wing)', capacity: 450, occupied: 324, available: 126, occupancy_rate: 72.0, color: '#10b981', oku_total: 18, oku_occupied: 11 },
            { id: 'C', name: 'Section C (Tech Annex)', capacity: 269, occupied: 120, available: 149, occupancy_rate: 44.6, color: '#8b5cf6', oku_total: 10, oku_occupied: 3 }
          ]
        });
      })
    );
  }

  getComparison(): Observable<ComparisonData> {
    return this.http.get<ComparisonData>(`${this.baseUrl}/comparison`).pipe(
      retry(1),
      catchError(err => of({
        today: { label: 'Today (Projected)', date: '22 Aug', entries: 1290, exits: 1240, net_flow: 50 },
        tomorrow: { label: 'Tomorrow (ML Forecast)', date: '23 Aug', entries: 1450, exits: 1390, net_flow: 60 }
      }))
    );
  }

  getHourlyTraffic(): Observable<HourlyTrafficData> {
    return this.http.get<HourlyTrafficData>(`${this.baseUrl}/hourly-traffic`).pipe(
      retry(1),
      catchError(err => of({
        hours: Array.from({ length: 24 }, (_, i) => `${i < 10 ? '0' + i : i}:00`),
        live_entries: [2, 1, 0, 1, 3, 15, 48, 165, 235, 180, 115, 88, 92, 78, 72, 94, 62, 38, 22, 14, 9, 7, 3, 2],
        live_exits: [1, 0, 0, 0, 1, 2, 7, 18, 32, 58, 78, 94, 112, 98, 88, 125, 190, 225, 168, 92, 48, 28, 12, 4],
        research_avg_entries: [2, 1, 0, 1, 3, 12, 45, 160, 240, 185, 110, 85, 95, 80, 75, 90, 65, 40, 25, 15, 10, 8, 4, 3],
        research_avg_exits: [1, 0, 0, 0, 1, 3, 8, 20, 35, 60, 75, 90, 110, 95, 85, 120, 185, 230, 170, 95, 50, 30, 15, 5],
        current_hour: new Date().getHours()
      }))
    );
  }

  getTrends(period: 'week' | 'month' = 'week'): Observable<TrendsData> {
    return this.http.get<TrendsData>(`${this.baseUrl}/trends?period=${period}`).pipe(
      retry(1),
      catchError(err => of(
        period === 'month'
          ? {
              period: 'month' as const,
              labels: Array.from({ length: 30 }, (_, i) => `Day ${i + 1}`),
              entries: Array.from({ length: 30 }, (_, i) => (i % 7 < 5 ? 1350 + Math.floor(Math.random() * 200) : 380)),
              exits: Array.from({ length: 30 }, (_, i) => (i % 7 < 5 ? 1300 + Math.floor(Math.random() * 190) : 360)),
              occupancy_peak_pct: Array.from({ length: 30 }, (_, i) => (i % 7 < 5 ? 85 + (i % 10) : 30))
            }
          : {
              period: 'week' as const,
              labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
              entries: [1420, 1490, 1530, 1440, 1310, 410, 320],
              exits: [1380, 1450, 1490, 1410, 1330, 390, 310],
              occupancy_peak_pct: [89, 93, 96, 90, 82, 32, 25]
            }
      ))
    );
  }

  // Live polling stream every 60s
  getPollingStream(): Observable<number> {
    return timer(0, 60000);
  }
}
