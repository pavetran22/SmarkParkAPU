import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, timer } from 'rxjs';
import { switchMap } from 'rxjs/operators';

export interface RowOccupancy {
  section: string;
  row: string;
  capacity: number;
  occupied: number;
  available: number;
  occupancyPercentage: number;
  status?: string;
}

export interface SectionOccupancy {
  section: string;
  capacity?: number;
  totalCapacity?: number;
  occupied?: number;
  totalOccupied?: number;
  available?: number;
  totalAvailable?: number;
  occupancyPercentage?: number;
  rows: RowOccupancy[];
}

export interface ParkingOccupancyResponse {
  totalCapacity: number;
  totalOccupied: number;
  totalAvailable: number;
  overallOccupancyPercentage: number;
  timestamp: string;
  source?: string;
  sections: SectionOccupancy[];
}

@Injectable({
  providedIn: 'root'
})
export class ParkingOccupancyService {
  private readonly apiUrl = 'http://localhost:5070/api/parking/occupancy';

  constructor(private http: HttpClient) {}

  getOccupancy(): Observable<ParkingOccupancyResponse> {
    return this.http.get<ParkingOccupancyResponse>(this.apiUrl);
  }

  getPollOccupancy(intervalMs: number = 60000): Observable<ParkingOccupancyResponse> {
    return timer(0, intervalMs).pipe(
      switchMap(() => this.getOccupancy())
    );
  }
}
