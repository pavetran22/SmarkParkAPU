import { Injectable } from '@angular/core';
import { Firestore, doc, getDoc, updateDoc, setDoc, collection, query, where, getDocs } from '@angular/fire/firestore';
import { Auth } from '@angular/fire/auth';
import { from, Observable, of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { UserProfile } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  constructor(private firestore: Firestore, private auth: Auth) {}

  getUserProfile(uid: string, userEmail?: string): Observable<UserProfile | null> {
    const email = userEmail || this.auth.currentUser?.email || '';
    const isStaff = email.toLowerCase().includes('@staff.mail.apu.edu.my');
    const primaryCollection = isStaff ? 'staff' : 'users';
    const altCollection = isStaff ? 'users' : 'staff';

    const primaryDocRef = doc(this.firestore, `${primaryCollection}/${uid}`);
    return from(getDoc(primaryDocRef)).pipe(
      switchMap(snapshot => {
        if (snapshot.exists()) {
          return of({
            ...snapshot.data(),
            role: primaryCollection === 'staff' ? 'staff' : 'student'
          } as UserProfile);
        }
        // Fallback to checking alternate collection if UID is in the other collection
        const altDocRef = doc(this.firestore, `${altCollection}/${uid}`);
        return from(getDoc(altDocRef)).pipe(
          map(altSnapshot => {
            if (altSnapshot.exists()) {
              return {
                ...altSnapshot.data(),
                role: altCollection === 'staff' ? 'staff' : 'student'
              } as UserProfile;
            }
            return null;
          })
        );
      })
    );
  }

  createUserProfile(uid: string, data: UserProfile): Promise<void> {
    const isStaff = data.email ? data.email.toLowerCase().includes('@staff.mail.apu.edu.my') : false;
    const collectionName = isStaff ? 'staff' : 'users';
    const userDocRef = doc(this.firestore, `${collectionName}/${uid}`);
    return setDoc(userDocRef, data, { merge: true });
  }

  async updateUserProfile(uid: string, data: Partial<UserProfile>): Promise<void> {
    // 1. Check student_id uniqueness if modified
    if (data.student_id) {
      const studentIdNormalized = data.student_id.toUpperCase();
      data.student_id = studentIdNormalized;
      const q = query(collection(this.firestore, 'users'), where('student_id', '==', studentIdNormalized));
      const snap = await getDocs(q);
      let dup = false;
      snap.forEach(d => {
        if (d.id !== uid) dup = true;
      });
      if (dup) {
        throw new Error("This TP number is already registered to another account");
      }
    }

    // 2. Check staff_id uniqueness if modified
    if (data.staff_id) {
      const q = query(collection(this.firestore, 'staff'), where('staff_id', '==', data.staff_id));
      const snap = await getDocs(q);
      let dup = false;
      snap.forEach(d => {
        if (d.id !== uid) dup = true;
      });
      if (dup) {
        throw new Error("This Staff ID is already registered to another account");
      }
    }

    // 3. Check car_plate uniqueness if modified
    if (data.car_plate !== undefined) {
      const normalizedPlate = data.car_plate ? data.car_plate.replace(/\s+/g, '').toUpperCase() : '';
      data.car_plate = normalizedPlate; // Save normalized to database

      if (normalizedPlate !== '') {
        const [usersSnap, staffSnap] = await Promise.all([
          getDocs(collection(this.firestore, 'users')),
          getDocs(collection(this.firestore, 'staff'))
        ]);

        let duplicateFound = false;
        usersSnap.forEach(d => {
          if (d.id !== uid) {
            const dData = d.data();
            const existing = dData?.['car_plate'] ? String(dData['car_plate']).replace(/\s+/g, '').toUpperCase() : '';
            if (existing && existing === normalizedPlate) {
              duplicateFound = true;
            }
          }
        });

        staffSnap.forEach(d => {
          if (d.id !== uid) {
            const dData = d.data();
            const existing = dData?.['car_plate'] ? String(dData['car_plate']).replace(/\s+/g, '').toUpperCase() : '';
            if (existing && existing === normalizedPlate) {
              duplicateFound = true;
            }
          }
        });

        if (duplicateFound) {
          throw new Error("This car plate is already registered to another account");
        }
      }
    }

    const isStaff = data.email ? data.email.toLowerCase().includes('@staff.mail.apu.edu.my') : (this.auth.currentUser?.email?.toLowerCase().includes('@staff.mail.apu.edu.my') || false);
    const collectionName = isStaff ? 'staff' : 'users';
    const userDocRef = doc(this.firestore, `${collectionName}/${uid}`);
    return updateDoc(userDocRef, data);
  }
}
