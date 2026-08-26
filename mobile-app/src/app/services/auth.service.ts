import { Injectable } from '@angular/core';
import { 
  Auth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  user, 
  sendPasswordResetEmail,
  verifyPasswordResetCode,
  confirmPasswordReset,
  fetchSignInMethodsForEmail
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

  async checkAccountRegistered(email: string): Promise<boolean> {
    const normalizedEmail = (email || '').trim().toLowerCase();
    const prefix = normalizedEmail.split('@')[0].toUpperCase();
    const isStaff = normalizedEmail.endsWith('@staff.mail.apu.edu.my') || 
                    normalizedEmail.endsWith('@staffmail.apu.edu.my') || 
                    normalizedEmail.endsWith('@staff.apu.edu.my');

    try {
      if (!isStaff) {
        // 1. Check student_id (stored uppercase e.g. TP676767 or TP067847)
        const qStudent = query(collection(this.firestore, 'users'), where('student_id', '==', prefix));
        const snapStudent = await getDocs(qStudent);
        if (!snapStudent.empty) return true;

        // 2. Check email variations (lowercase, uppercase prefix)
        const qEmailLower = query(collection(this.firestore, 'users'), where('email', '==', normalizedEmail));
        const snapEmailLower = await getDocs(qEmailLower);
        if (!snapEmailLower.empty) return true;

        const qEmailUpper = query(collection(this.firestore, 'users'), where('email', '==', prefix + '@mail.apu.edu.my'));
        const snapEmailUpper = await getDocs(qEmailUpper);
        if (!snapEmailUpper.empty) return true;
      } else {
        // Check staff collection
        const qStaff = query(collection(this.firestore, 'staff'), where('staff_id', '==', prefix));
        const snapStaff = await getDocs(qStaff);
        if (!snapStaff.empty) return true;

        const qStaffEmail = query(collection(this.firestore, 'staff'), where('email', '==', normalizedEmail));
        const snapStaffEmail = await getDocs(qStaffEmail);
        if (!snapStaffEmail.empty) return true;
      }

      // 3. Fallback: check alternate collection just in case
      const altCollection = isStaff ? 'users' : 'staff';
      const idField = isStaff ? 'student_id' : 'staff_id';
      const qAlt = query(collection(this.firestore, altCollection), where(idField, '==', prefix));
      const snapAlt = await getDocs(qAlt);
      if (!snapAlt.empty) return true;

      const qAltEmail = query(collection(this.firestore, altCollection), where('email', '==', normalizedEmail));
      const snapAltEmail = await getDocs(qAltEmail);
      if (!snapAltEmail.empty) return true;

      return false;
    } catch (err: any) {
      console.warn('[MobileAuthService] Firestore registration check note:', err?.code, err?.message);
      return false;
    }
  }

  async login(email: string, password: string) {
    const normalizedEmail = (email || '').trim().toLowerCase();
    
    // Check format first
    const isStudent = /^[Tt][Pp]\d+@mail\.apu\.edu\.my$/i.test(normalizedEmail);
    const isStaff = /^[A-Za-z0-9._%+-]+@(staff\.mail\.apu\.edu\.my|staffmail\.apu\.edu\.my|staff\.apu\.edu\.my)$/i.test(normalizedEmail);
    if (!isStudent && !isStaff) {
      if (normalizedEmail.endsWith('@gmail.com') || normalizedEmail.endsWith('@yahoo.com') || normalizedEmail.endsWith('@hotmail.com') || normalizedEmail.endsWith('@outlook.com') || normalizedEmail.endsWith('@icloud.com')) {
        throw new Error('Personal emails (Gmail, Yahoo, etc.) are not permitted. Please use your official APU email (TPXXXXXX@mail.apu.edu.my).');
      }
    }

    try {
      return await signInWithEmailAndPassword(this.auth, normalizedEmail, password);
    } catch (e: any) {
      console.warn('[MobileAuthService] Login error:', e);
      if (e?.code === 'auth/wrong-password') {
        throw new Error('Incorrect password. Please verify your password and try again.');
      } else if (e?.code === 'auth/user-not-found') {
        throw new Error('Account was not registered. Please register an account first.');
      } else if (e?.code === 'auth/invalid-credential') {
        throw new Error('Invalid email or password. Please check your credentials or register an account.');
      } else if (e?.code === 'auth/too-many-requests') {
        throw new Error('Access temporarily blocked due to multiple failed login attempts. Please reset your password or try again later.');
      } else if (e?.code === 'auth/invalid-email') {
        throw new Error('Invalid email format. Please use TPXXXXXX@mail.apu.edu.my.');
      } else if (e?.code === 'auth/network-request-failed') {
        throw new Error('Network connection error. Please check your internet connection.');
      }
      throw new Error(e?.message?.replace(/^Firebase:\s*(Error\s*)?(\(auth\/[^)]+\)\.?\s*)?/i, '') || e?.message || 'Login failed. Please verify your credentials.');
    }
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
    return of(null);
  }

  getUserProfileByPlate(plateNumber: string): Observable<UserProfile | null> {
    const usersRef = collection(this.firestore, 'users');
    const q = query(usersRef, where('car_plate', '==', plateNumber.toUpperCase()));

    return from(getDocs(q)).pipe(
      map(snapshot => {
        if (!snapshot.empty) {
          const docData = snapshot.docs[0].data() as any;
          return {
            uid: snapshot.docs[0].id,
            balance: 20,
            ...docData,
            role: 'student'
          } as UserProfile;
        }
        return null;
      })
    );
  }

  isLoggedIn(): Observable<boolean> {
    return this.user$.pipe(map(u => !!u));
  }

  async sendResetEmail(email: string) {
    const rawEmail = (email || '').trim();
    const normalizedEmail = rawEmail.toLowerCase();
    
    // 1. Strict domain validation: Only APU Student or Staff emails allowed
    const isStudent = /^[Tt][Pp]\d+@mail\.apu\.edu\.my$/i.test(normalizedEmail);
    const isStaff = /^[A-Za-z0-9._%+-]+@(staff\.mail\.apu\.edu\.my|staffmail\.apu\.edu\.my|staff\.apu\.edu\.my)$/i.test(normalizedEmail);

    if (!isStudent && !isStaff) {
      if (normalizedEmail.endsWith('@gmail.com') || normalizedEmail.endsWith('@yahoo.com') || normalizedEmail.endsWith('@hotmail.com') || normalizedEmail.endsWith('@outlook.com') || normalizedEmail.endsWith('@icloud.com')) {
        throw new Error("Personal emails (Gmail, Yahoo, Outlook, etc.) are not permitted. Only official APU TP or staff email addresses (e.g. TPXXXXXX@mail.apu.edu.my) are allowed.");
      }
      throw new Error("Invalid email domain. Only official APU student email (TPXXXXXX@mail.apu.edu.my) or staff email (TPXXXXXX@staff.mail.apu.edu.my) addresses are allowed.");
    }

    // 2. Strict Database Verification: Must exist in users or staff collection
    console.log('[Mobile AuthService] Verifying email exists in database:', normalizedEmail);
    const isRegistered = await this.checkAccountRegistered(normalizedEmail);
    if (!isRegistered) {
      console.warn('[Mobile AuthService] Email not found in users database:', normalizedEmail);
      throw new Error('TP Address is not registered. Please register an account first.');
    }

    // 3. Dispatch Firebase Password Reset Link
    console.log('[Mobile AuthService] Account verified in database. Dispatching password reset email for:', normalizedEmail);

    try {
      await sendPasswordResetEmail(this.auth, normalizedEmail);
      console.log('[Mobile AuthService] Password reset email sent successfully to:', normalizedEmail);
      return { success: true, email: normalizedEmail };
    } catch (err: any) {
      console.error('[Mobile AuthService] sendPasswordResetEmail error:', err);
      if (err?.code === 'auth/user-not-found') {
        throw new Error('TP Address is not registered. Please register an account first.');
      } else if (err?.code === 'auth/invalid-email') {
        throw new Error('Please enter a valid APU email address format.');
      } else if (err?.code === 'auth/too-many-requests') {
        throw new Error('Too many requests. Please wait a few moments before requesting another reset link.');
      }
      throw new Error(err?.message?.replace(/^Firebase:\s*(Error\s*)?(\(auth\/[^)]+\)\.?\s*)?/i, '') || err?.message || 'Failed to send password reset link.');
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
