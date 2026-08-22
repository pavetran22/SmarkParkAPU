import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private baseUrl = environment.aiApiUrl;

  constructor(private http: HttpClient) {}

  private getHeaders() {
    return new HttpHeaders({
      'x-api-key': environment.aiApiKey,
      'Content-Type': 'application/json'
    });
  }

  getParkingStatus(): Observable<any> {
    return this.http.get(`${this.baseUrl}/parking/status`, { headers: this.getHeaders() });
  }

  getOccupancyPrediction(): Observable<any> {
    return this.http.get(`${this.baseUrl}/occupancy/prediction`, { headers: this.getHeaders() });
  }

  findCarByPlate(plateNumber: string): Observable<any> {
    const cleaned = plateNumber.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    return this.http.get(`http://localhost:5002/find-car/${cleaned}`);
  }
}
