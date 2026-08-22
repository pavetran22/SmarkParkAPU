import { Injectable } from '@angular/core';
import { Firestore, doc, getDoc, updateDoc, setDoc, collection, addDoc, collectionData, query, orderBy, serverTimestamp } from '@angular/fire/firestore';
import { Auth } from '@angular/fire/auth';
import { Observable, from } from 'rxjs';
import { map } from 'rxjs/operators';
import { NotificationService } from './notification.service';

export interface BalanceHistoryEntry {
  id?: string;
  amount: number;
  type: 'deduction' | 'topup';
  related_log_id?: string;
  created_at: any;
}

@Injectable({
  providedIn: 'root'
})
export class WalletService {
  constructor(
    private firestore: Firestore,
    private auth: Auth,
    private notifService: NotificationService
  ) {}

  private getCollectionName(): string {
    const currentUser = this.auth.currentUser;
    if (currentUser && currentUser.email) {
      const isStaff = currentUser.email.toLowerCase().endsWith('@staff.mail.apu.edu.my');
      return isStaff ? 'staff' : 'users';
    }
    return 'users';
  }

  getUserBalance(userId: string): Observable<number> {
    const collectionName = this.getCollectionName();
    const userDocRef = doc(this.firestore, `${collectionName}/${userId}`);
    return from(getDoc(userDocRef)).pipe(
      map(snapshot => {
        if (snapshot.exists()) {
          const data = snapshot.data() as any;
          return data.balance !== undefined ? Number(data.balance) : (data.wallet_balance !== undefined ? Number(data.wallet_balance) : 20.00);
        }
        return 20.00;
      })
    );
  }

  async topUpBalance(userId: string, amount: number, carPlate: string = ''): Promise<number> {
    const collectionName = this.getCollectionName();
    const userDocRef = doc(this.firestore, `${collectionName}/${userId}`);
    
    const snap = await getDoc(userDocRef);
    const currentBalance = (snap.exists() && snap.data()['balance'] !== undefined) 
      ? Number(snap.data()['balance']) 
      : ((snap.exists() && snap.data()['wallet_balance'] !== undefined) ? Number(snap.data()['wallet_balance']) : 20.00);
    
    const newBalance = Number((currentBalance + amount).toFixed(2));

    await setDoc(userDocRef, { balance: newBalance, wallet_balance: newBalance }, { merge: true });

    // Create Notification & Toast for Top Up
    await this.notifService.triggerTopUpNotification(userId, carPlate, amount, newBalance);

    // Log in balance_history
    try {
      const historyRef = collection(this.firestore, `${collectionName}/${userId}/balance_history`);
      await addDoc(historyRef, {
        amount: amount,
        type: 'topup',
        related_log_id: 'manual_topup',
        created_at: serverTimestamp()
      });
    } catch (e) {
      console.warn('[WalletService] History log failed:', e);
    }

    console.log(`[WalletService] Top-up of RM ${amount} completed. New balance: RM ${newBalance}`);
    return newBalance;
  }

  async deductBalance(userId: string, amount: number, relatedLogId: string = 'exit_fee', carPlate: string = ''): Promise<{ newBalance: number; isLowBalance: boolean }> {
    const collectionName = this.getCollectionName();
    const userDocRef = doc(this.firestore, `${collectionName}/${userId}`);

    const snap = await getDoc(userDocRef);
    const currentBalance = (snap.exists() && snap.data()['balance'] !== undefined) 
      ? Number(snap.data()['balance']) 
      : ((snap.exists() && snap.data()['wallet_balance'] !== undefined) ? Number(snap.data()['wallet_balance']) : 20.00);
    
    const newBalance = Number(Math.max(0, currentBalance - amount).toFixed(2));

    await setDoc(userDocRef, { balance: newBalance, wallet_balance: newBalance }, { merge: true });

    // Create Notification & Toast for Fee Deduction
    await this.notifService.triggerFeeDeductionNotification(userId, carPlate, amount, newBalance);

    // Log in balance_history
    try {
      const historyRef = collection(this.firestore, `${collectionName}/${userId}/balance_history`);
      await addDoc(historyRef, {
        amount: amount,
        type: 'deduction',
        related_log_id: relatedLogId,
        created_at: serverTimestamp()
      });
    } catch (e) {
      console.warn('[WalletService] History log failed:', e);
    }

    const isLowBalance = newBalance < 5.00;
    if (isLowBalance) {
      await this.notifService.triggerLowBalanceNotification(userId, carPlate, newBalance);
    }

    console.log(`[WalletService] Deduction of RM ${amount} completed. New balance: RM ${newBalance}. Low balance alert: ${isLowBalance}`);
    return { newBalance, isLowBalance };
  }

  getBalanceHistory(userId: string): Observable<BalanceHistoryEntry[]> {
    const collectionName = this.getCollectionName();
    const historyRef = collection(this.firestore, `${collectionName}/${userId}/balance_history`);
    const q = query(historyRef, orderBy('created_at', 'desc'));
    return collectionData(q, { idField: 'id' }) as Observable<BalanceHistoryEntry[]>;
  }
}
