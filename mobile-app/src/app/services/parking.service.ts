import { Injectable } from '@angular/core';
import { Firestore, collection, collectionData, query, where, orderBy, doc, getDoc, getDocs, updateDoc, setDoc } from '@angular/fire/firestore';
import { from, Observable, of } from 'rxjs';
import { map, switchMap, catchError } from 'rxjs/operators';

export interface ParkingLog {
  id?: string;
  user_id: string;
  student_id: string;
  car_plate: string;
  car_model: string;
  car_colour: string;
  entry_time: any;
  exit_time: any | null;
  parking_spot: string;
  status: 'parked' | 'exited' | 'out of premises';
  is_oku: boolean;
  is_double_park: boolean;
  is_oku_violation: boolean;
  created_at: any;
}

export interface ParkingSpot {
  id?: string;
  is_occupied: boolean;
  is_oku_spot: boolean;
  current_car_plate: string | null;
  current_user_id: string | null;
  last_updated: any;
  spot_id: string;
  plate_number?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ParkingService {
  constructor(private firestore: Firestore) {}

  /**
   * Direct Firestore lookup in find_my_car collection using document ID = plate without spaces (uppercase)
   */
  findCarByPlateDirect(carPlate: string): Observable<{ exists: boolean; carData: any | null }> {
    if (!carPlate) {
      return of({ exists: false, carData: null });
    }
    const docId = carPlate.replace(/\s+/g, '').toUpperCase();
    const carDocRef = doc(this.firestore, `find_my_car/${docId}`);
    
    return from(getDoc(carDocRef)).pipe(
      switchMap(snapshot => {
        if (snapshot.exists()) {
          return of({ exists: true, carData: snapshot.data() });
        }
        // Fallback: search by car_plate_search or car_plate field in find_my_car collection
        const carsRef = collection(this.firestore, 'find_my_car');
        const q = query(carsRef, where('car_plate_search', '==', docId));
        return from(getDocs(q)).pipe(
          map(querySnap => {
            if (!querySnap.empty) {
              return { exists: true, carData: querySnap.docs[0].data() };
            }
            return { exists: false, carData: null };
          })
        );
      }),
      catchError(err => {
        console.warn('[ParkingService] Error in findCarByPlateDirect:', err);
        return of({ exists: false, carData: null });
      })
    );
  }

  /**
   * Mark vehicle as "out of premises" in Firestore find_my_car collection
   */
  markCarAsOut(carPlate: string): Observable<boolean> {
    if (!carPlate) return of(false);
    const cleanedDocId = carPlate.replace(/\s+/g, '').toUpperCase();
    const carDocRef = doc(this.firestore, `find_my_car/${cleanedDocId}`);
    const exitTime = new Date().toISOString();

    return from(updateDoc(carDocRef, {
      exit_time: exitTime,
      status: 'out of premises'
    })).pipe(
      map(() => true),
      catchError(err => {
        console.warn('[ParkingService] Failed to updateDoc, trying setDoc with merge:', err);
        return from(setDoc(carDocRef, {
          exit_time: exitTime,
          status: 'out of premises'
        }, { merge: true })).pipe(
          map(() => true),
          catchError(e => {
            console.error('[ParkingService] Error marking car out of premises:', e);
            return of(false);
          })
        );
      })
    );
  }

  findMyCar(searchTarget: string): Observable<any[]> {
    const carsRef = collection(this.firestore, 'find_my_car');
    const cleaned = searchTarget.replace(/\s+/g, '').toUpperCase();
    const q = query(carsRef, where('car_plate_search', '==', cleaned));
    return (collectionData(q, { idField: 'id' }) as Observable<any[]>).pipe(
      catchError(() => of([]))
    );
  }

  getParkingLogs(userId: string): Observable<ParkingLog[]> {
    const logsRef = collection(this.firestore, 'parking_logs');
    const q = query(
      logsRef, 
      where('user_id', '==', userId),
      orderBy('created_at', 'desc')
    );
    return collectionData(q, { idField: 'id' }) as Observable<ParkingLog[]>;
  }

  getParkingSpots(): Observable<ParkingSpot[]> {
    const spotsRef = collection(this.firestore, 'parking_spots');
    return collectionData(spotsRef, { idField: 'id' }) as Observable<ParkingSpot[]>;
  }
}
