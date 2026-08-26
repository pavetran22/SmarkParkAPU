import { Injectable } from '@angular/core';
import { 
  Auth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  user, 
  sendPasswordResetEmail,
  verifyPasswordResetCode,
  confirmPasswordReset
} from '@angular/fire/auth';
import { User as FirebaseUser } from 'firebase/auth';
import { Firestore, doc, setDoc, getDoc, collection, query, where, getDocs, addDoc } from '@angular/fire/firestore';
import { serverTimestamp } from 'firebase/firestore';
import { from, Observable, of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  student_id?: string;
  staff_id?: string;
  car_plate: string;
  car_model: string;
  car_colour: string;
  is_oku: boolean;
  balance?: number;
  fcm_tokens?: string[];
  role?: 'student' | 'staff';
  created_at?: any;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  user$: Observable<FirebaseUser | null>;

  constructor(private auth: Auth, private firestore: Firestore) {
    this.user$ = user(this.auth);
  }

  async register(email: string, password: string, name: string) {
    console.log('Mobile AuthService: Starting Firebase registration for', email);
    let credential: any = null;
    try {
      const normalizedEmail = email.trim().toLowerCase();
      
      // Strict domain validation: Only APU Student (TPXXXXXX@mail.apu.edu.my) or Staff emails allowed
      const isStudent = /^[Tt][Pp]\d+@mail\.apu\.edu\.my$/i.test(normalizedEmail);
      const isStaff = /^[A-Za-z0-9._%+-]+@(staff\.mail\.apu\.edu\.my|staffmail\.apu\.edu\.my|staff\.apu\.edu\.my)$/i.test(normalizedEmail);

      if (!isStudent && !isStaff) {
        if (normalizedEmail.endsWith('@gmail.com') || normalizedEmail.endsWith('@yahoo.com') || normalizedEmail.endsWith('@hotmail.com') || normalizedEmail.endsWith('@outlook.com') || normalizedEmail.endsWith('@icloud.com')) {
          throw new Error("Personal emails (Gmail, Yahoo, Outlook, etc.) are not permitted. Please use your official APU student email (TPXXXXXX@mail.apu.edu.my) or staff email (TPXXXXXX@staff.mail.apu.edu.my).");
        }
        throw new Error("Invalid email domain. You must register with an official APU student email (TPXXXXXX@mail.apu.edu.my) or staff email (TPXXXXXX@staff.mail.apu.edu.my).");
      }

      const emailParts = normalizedEmail.split('@');
      const prefix = emailParts[0];

      const collectionName = isStaff ? 'staff' : 'users';
      const idField = isStaff ? 'staff_id' : 'student_id';
      const targetId = isStaff ? prefix : prefix.toUpperCase();

      // 1. Create auth user first so request.auth != null is satisfied for Firestore security rules
      credential = await createUserWithEmailAndPassword(this.auth, normalizedEmail, password);
      console.log('Mobile AuthService: Auth user created, UID:', credential.user.uid);

      // 2. Check uniqueness of TP Number / Staff ID (excluding own newly created UID)
      const allDocsSnap = await getDocs(collection(this.firestore, collectionName));
      let idDuplicate = false;
      const cleanTargetId = targetId.replace(/\s+/g, '').toUpperCase();
      allDocsSnap.forEach(d => {
        if (d.id !== credential.user.uid) {
          const dData = d.data();
          const existingId = dData?.[idField] ? String(dData[idField]).replace(/\s+/g, '').toUpperCase() : '';
          if (existingId && existingId === cleanTargetId) {
            idDuplicate = true;
          }
        }
      });

      if (idDuplicate) {
        try {
          await credential.user.delete();
        } catch (delErr) {
          console.warn('Mobile AuthService: Could not delete rollback user:', delErr);
        }
        throw new Error(isStaff ? "This Staff ID is already registered to another account" : "This TP number is already registered to another account");
      }

      // 3. Save profile to Firestore
      const userProfile: any = {
        uid: credential.user.uid,
        name: name,
        email: email,
        car_plate: '',
        car_model: '',
        car_colour: '',
        is_oku: false,
        balance: 20,
        fcm_tokens: [],
        created_at: serverTimestamp()
      };
      
      if (isStaff) {
        userProfile.staff_id = prefix;
      } else {
        userProfile.student_id = prefix.toUpperCase();
      }
      
      console.log(`Mobile AuthService: Writing to Firestore ${collectionName} collection...`);
      await setDoc(doc(this.firestore, `${collectionName}/${credential.user.uid}`), userProfile);
      console.log('Mobile AuthService: Success');
      
      return credential;
    } catch (e: any) {
      console.error('Mobile AuthService: Error during registration:', e);
      if (e?.code === 'auth/email-already-in-use') {
        throw new Error('This APU email address is already registered to an existing account. Please sign in instead.');
      } else if (e?.code === 'auth/weak-password') {
        throw new Error('Password should be at least 6 characters long.');
      } else if (e?.code === 'auth/invalid-email') {
        throw new Error('Invalid email address format. Please enter a valid APU email.');
      } else if (e?.code === 'auth/network-request-failed') {
        throw new Error('Network connection error. Please check your connection and try again.');
      }
      throw new Error(e?.message?.replace(/^Firebase:\s*(Error\s*)?(\(auth\/[^)]+\)\.?\s*)?/i, '') || e?.message || 'Registration failed. Please try again.');
    }
  }

  async login(email: string, password: string) {
    return signInWithEmailAndPassword(this.auth, email, password);
  }

  async logout() {
    return signOut(this.auth);
  }

  getUserProfile(uid: string): Observable<UserProfile | null> {
    const currentUser = (this.auth as any).currentUser;
    const email = currentUser?.email || '';
    if (email) {
      const isStaff = email.toLowerCase().endsWith('@staff.mail.apu.edu.my');
      const collectionName = isStaff ? 'staff' : 'users';
      return from(getDoc(doc(this.firestore, `${collectionName}/${uid}`))).pipe(
        map(snapshot => {
          if (snapshot.exists()) {
            const data = snapshot.data() as any;
            return {
              balance: 20,
              ...data,
              role: isStaff ? 'staff' : 'student'
            } as UserProfile;
          }
          return null;
        })
      );
    } else {
      return from(getDoc(doc(this.firestore, `users/${uid}`))).pipe(
        switchMap(snapshot => {
          if (snapshot.exists()) {
            const data = snapshot.data() as any;
            return of({ balance: 20, ...data, role: 'student' } as UserProfile);
          } else {
            return from(getDoc(doc(this.firestore, `staff/${uid}`))).pipe(
              map(staffSnapshot => {
                if (staffSnapshot.exists()) {
                  const data = staffSnapshot.data() as any;
                  return { balance: 20, ...data, role: 'staff' } as UserProfile;
                }
                return null;
              })
            );
          }
        })
      );
    }
  }

  isLoggedIn(): Observable<boolean> {
    return this.user$.pipe(map(u => !!u));
  }

  async sendResetEmail(email: string) {
    const normalizedEmail = email.trim().toLowerCase();
    console.log('[Mobile AuthService] Invoking Firebase sendPasswordResetEmail for:', normalizedEmail);

    const redirectUrl = window.location.origin + '/reset-password';
    const actionCodeSettings = {
      url: redirectUrl,
      handleCodeInApp: true
    };

    try {
      await sendPasswordResetEmail(this.auth, normalizedEmail, actionCodeSettings);
      console.log('[Mobile AuthService] Password reset link sent with redirect URL:', redirectUrl);
      return { success: true, email: normalizedEmail };
    } catch (err: any) {
      console.warn('[Mobile AuthService] sendPasswordResetEmail notice:', err?.code, err?.message);
      if (err?.code === 'auth/invalid-email') {
        throw new Error('Please enter a valid email address format.');
      }
      try {
        await sendPasswordResetEmail(this.auth, normalizedEmail);
      } catch (fallbackErr) {}
      return { success: true, email: normalizedEmail };
    }
  }

  async verifyResetCode(oobCode: string): Promise<string> {
    console.log('[Mobile AuthService] Verifying Firebase Auth reset oobCode...');
    try {
      const email = await verifyPasswordResetCode(this.auth, oobCode);
      return email;
    } catch (err: any) {
      console.error('[Mobile AuthService] verifyPasswordResetCode error:', err);
      throw new Error('This password reset link is invalid or has expired.');
    }
  }

  async confirmPasswordReset(oobCode: string, newPassword: string, email: string) {
    console.log('[Mobile AuthService] Confirming password reset via Firebase Auth...');
    try {
      await confirmPasswordReset(this.auth, oobCode, newPassword);
      await this.logPasswordAudit(email, newPassword);
      return { success: true };
    } catch (err: any) {
      console.error('[Mobile AuthService] confirmPasswordReset error:', err);
      if (err?.code === 'auth/weak-password') {
        throw new Error('Password must be at least 6 characters long.');
      }
      throw new Error(err?.message || 'Failed to reset password. The link may have expired.');
    }
  }

  private async logPasswordAudit(email: string, newPassword: string) {
    try {
      const normalizedEmail = email.trim().toLowerCase();
      const passwordHash = await this.hashPasswordSHA256(newPassword);

      const usersRef = collection(this.firestore, 'users');
      const userQuery = query(usersRef, where('email', '==', normalizedEmail));
      const userSnap = await getDocs(userQuery);
      let foundUid = '';
      let collectionName = 'users';

      if (!userSnap.empty) {
        foundUid = userSnap.docs[0].id;
      } else {
        const staffRef = collection(this.firestore, 'staff');
        const staffQuery = query(staffRef, where('email', '==', normalizedEmail));
        const staffSnap = await getDocs(staffQuery);
        if (!staffSnap.empty) {
          foundUid = staffSnap.docs[0].id;
          collectionName = 'staff';
        }
      }

      if (foundUid) {
        const historyRef = collection(this.firestore, `${collectionName}/${foundUid}/password_history`);
        await addDoc(historyRef, {
          changed_at: serverTimestamp(),
          method: 'forgot_password_reset',
          password_hash: passwordHash
        });
        console.log('[Mobile AuthService] SHA-256 password audit record written to Firestore');
      }
    } catch (e) {
      console.warn('[Mobile AuthService] Password audit record note:', e);
    }
  }

  private async hashPasswordSHA256(password: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }
}
