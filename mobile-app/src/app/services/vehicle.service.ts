import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of, throwError } from 'rxjs';
import { delay, tap } from 'rxjs/operators';

export interface Vehicle {
  student_id: string;
  plate_number: string;
  vehicle_model: string;
  color: string;
  is_oku?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class VehicleService {
  private vehicleSubject = new BehaviorSubject<Vehicle | null>(null);
  private STORAGE_KEY = 'apu_mobile_vehicle';

  constructor(private http: HttpClient) {
    this.loadFromStorage();
  }

  private loadFromStorage() {
    const saved = localStorage.getItem(this.STORAGE_KEY);
    if (saved) {
      try { this.vehicleSubject.next(JSON.parse(saved)); } catch(e) { localStorage.removeItem(this.STORAGE_KEY); }
    }
  }

  private saveToStorage(vehicle: Vehicle | null) {
    if (vehicle) localStorage.setItem(this.STORAGE_KEY, JSON.stringify(vehicle));
    else localStorage.removeItem(this.STORAGE_KEY);
    this.vehicleSubject.next(vehicle);
  }

  /**
   * Returns current value immediately
   */
  getVehicleValue(): Vehicle | null {
    return this.vehicleSubject.value;
  }

  /**
   * Returns a stream that components can subscribe to for real-time updates
   */
  getVehicleStream(): Observable<Vehicle | null> {
    return this.vehicleSubject.asObservable();
  }

  /**
   * GET /api/vehicle/my-vehicle
   */
  getMyVehicle(): Observable<Vehicle | null> {
    const val = this.vehicleSubject.value;
    if (val) return of(val);
    return of(null).pipe(delay(50));
  }

  /**
   * POST /api/vehicle/register
   * Enforces the "One car per student" rule
   */
  registerVehicle(vehicle: Vehicle): Observable<any> {
    if (this.vehicleSubject.value) {
      return throwError(() => new Error("You already have a registered vehicle. Please remove the existing vehicle before adding a new one."));
    }
    
    this.saveToStorage(vehicle);
    return of({ success: true, vehicle }).pipe(delay(400));
  }

  /**
   * DELETE /api/vehicle/remove
   */
  removeVehicle(): Observable<any> {
    this.saveToStorage(null);
    return of({ success: true }).pipe(delay(300));
  }
}
