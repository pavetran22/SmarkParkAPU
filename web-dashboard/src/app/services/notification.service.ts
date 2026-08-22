import { Injectable } from '@angular/core';
import { Firestore, collection, collectionData, query, where, updateDoc, doc, addDoc, serverTimestamp, arrayUnion, getDocs, writeBatch } from '@angular/fire/firestore';
import { Auth } from '@angular/fire/auth';
import { Observable, BehaviorSubject, of, combineLatest } from 'rxjs';
import { map, tap, catchError } from 'rxjs/operators';

export interface AppNotification {
  id?: string;
  user_id: string;
  car_plate: string;
  type: 'double_park' | 'oku_violation' | 'entry' | 'exit' | 'low_balance' | 'fee_deduction' | 'top_up' | 'violation_resolved';
  message: string;
  is_read: boolean;
  created_at: any;
  spot_id?: string;
  source?: string;
  resolved?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  public static lastError: string | null = null;
  private unreadCountSubject = new BehaviorSubject<number>(0);
  unreadCount$ = this.unreadCountSubject.asObservable();
  private lastNotifId: string | null = null;

  constructor(
    private firestore: Firestore,
    private auth: Auth
  ) {}

  private getCollectionName(): string {
    const currentUser = this.auth.currentUser;
    if (currentUser && currentUser.email) {
      const isStaff = currentUser.email.toLowerCase().endsWith('@staff.mail.apu.edu.my');
      return isStaff ? 'staff' : 'users';
    }
    return 'users';
  }

  listenToNotifications(userId: string, carPlate?: string): Observable<AppNotification[]> {
    const notifsRef = collection(this.firestore, 'notifications');
    const violsRef = collection(this.firestore, 'violations');

    const notifs$ = (collectionData(notifsRef, { idField: 'id' }) as Observable<any[]>).pipe(
      catchError(err => {
        console.warn('[NotificationService] Error reading notifications collection:', err);
        return of([]);
      })
    );

    const viols$ = (collectionData(violsRef, { idField: 'id' }) as Observable<any[]>).pipe(
      catchError(err => {
        console.warn('[NotificationService] Error reading violations collection:', err);
        return of([]);
      })
    );

    return combineLatest([notifs$, viols$]).pipe(
      map(([notifs, viols]) => {
        const cleanedPlate = carPlate ? carPlate.replace(/\s+/g, '').toUpperCase() : '';
        const currentUser = this.auth.currentUser;
        const currentEmail = (currentUser?.email || '').toLowerCase().trim();

        // 1. Process regular notifications from notifications collection
        const filteredNotifs: AppNotification[] = (notifs || [])
          .filter(n => {
            if (!n) return false;
            const cleanedNotifPlate = n.car_plate ? n.car_plate.replace(/\s+/g, '').toUpperCase() : '';
            if (cleanedPlate) {
              return cleanedNotifPlate === cleanedPlate || (n.user_id && n.user_id === userId);
            }
            return (n.user_id && n.user_id === userId) || (currentEmail && n.email && n.email.toLowerCase().trim() === currentEmail);
          })
          .map(n => ({
            id: n.id,
            user_id: n.user_id || userId,
            car_plate: n.car_plate || '',
            type: (n.type || 'entry') as AppNotification['type'],
            message: n.message || '',
            is_read: !!n.is_read,
            created_at: n.created_at || n.timestamp || new Date().toISOString(),
            resolved: n.resolved === true
          }));

        // 2. Process violations from violations collection (strictly matched to registered car plate)
        const filteredViols: AppNotification[] = [];
        (viols || [])
          .filter(v => {
            if (!v) return false;
            const cleanedViolPlate = (v.car_plate || v.car_plate_search || '').replace(/\s+/g, '').toUpperCase();
            if (cleanedPlate) {
              return cleanedViolPlate === cleanedPlate;
            }
            const vEmail = (v.email || '').toLowerCase().trim();
            return (v.user_id && v.user_id === userId) || (currentEmail && vEmail && vEmail === currentEmail);
          })
          .forEach(v => {
            let vType: AppNotification['type'] = 'oku_violation';
            const reason = (v.reason || '').toLowerCase();
            const source = (v.source || '').toLowerCase();
            const msg = (v.message || '').toLowerCase();
            if (reason.includes('double') || source.includes('double') || msg.includes('double')) {
              vType = 'double_park';
            } else if (reason.includes('oku') || source.includes('oku') || msg.includes('oku')) {
              vType = 'oku_violation';
            }

            const plate = v.car_plate || v.car_plate_search || '';
            const spot = v.spot_id ? ` at ${v.spot_id}` : '';
            const isResolved = v.resolved === true || String(v.status || '').toLowerCase() === 'resolved';

            // Violation entry
            filteredViols.push({
              id: v.id,
              user_id: v.user_id || userId,
              car_plate: plate,
              type: vType,
              message: v.message || `Violation detected for ${plate}${spot}`,
              is_read: !!v.is_read,
              created_at: v.created_at || v.timestamp || v.time || new Date().toISOString(),
              spot_id: v.spot_id || '',
              source: v.source || '',
              resolved: isResolved
            });

            // When resolved is true, generate the resolved notification
            if (isResolved) {
              const violationLabel = vType === 'oku_violation' ? 'OKU Parking Violation' : 'Double Parking Alert';
              filteredViols.push({
                id: `${v.id}_resolved`,
                user_id: v.user_id || userId,
                car_plate: plate,
                type: 'violation_resolved',
                message: `Violation Resolved: The ${violationLabel} for vehicle ${plate}${spot} has been resolved.`,
                is_read: !!v.is_read,
                created_at: v.resolved_at || v.updated_at || v.created_at || v.timestamp || new Date().toISOString(),
                spot_id: v.spot_id || '',
                source: v.source || '',
                resolved: true
              });
            }
          });

        // Combine and deduplicate
        const mapById = new Map<string, AppNotification>();
        filteredNotifs.forEach(item => { if (item.id) mapById.set(item.id, item); });
        filteredViols.forEach(item => { if (item.id) mapById.set(item.id, item); });

        const allItems = Array.from(mapById.values());

        // Sort descending by created_at / timestamp
        return allItems.sort((a, b) => {
          const getMs = (val: any) => {
            if (!val) return 0;
            if (typeof val.toMillis === 'function') return val.toMillis();
            if (val.seconds) return val.seconds * 1000;
            const parsed = new Date(val).getTime();
            return isNaN(parsed) ? 0 : parsed;
          };
          return getMs(b.created_at) - getMs(a.created_at);
        });
      }),
      tap(notifs => {
        const unreadCount = notifs.filter(n => !n.is_read).length;
        this.unreadCountSubject.next(unreadCount);

        if (notifs.length > 0) {
          const newest = notifs[0];
          if (this.lastNotifId !== null && newest.id !== this.lastNotifId && !newest.is_read) {
            this.showWebToast(newest);
          }
          this.lastNotifId = newest.id || null;
        }
      }),
      catchError(err => {
        console.warn('[NotificationService] Error listening to notifications:', err);
        NotificationService.lastError = err.stack || err.message || String(err);
        return of([]);
      })
    );
  }

  async createNotification(userId: string, carPlate: string, type: AppNotification['type'], message: string): Promise<string> {
    const notifsRef = collection(this.firestore, 'notifications');
    const nowIso = new Date().toISOString();
    const newDoc = await addDoc(notifsRef, {
      user_id: userId || '',
      car_plate: carPlate || '',
      type: type,
      message: message,
      is_read: false,
      created_at: nowIso
    });

    const notifObj: AppNotification = {
      id: newDoc.id,
      user_id: userId,
      car_plate: carPlate,
      type: type,
      message: message,
      is_read: false,
      created_at: nowIso
    };
    
    // Trigger pop-up toast immediately on screen
    this.showWebToast(notifObj);

    console.log(`[NotificationService] Notification created (${type}) for user ${userId}: ${message}`);
    return newDoc.id;
  }

  async triggerEntryNotification(userId: string, carPlate: string, spotName: string): Promise<string> {
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const message = `Vehicle Entry: Your car ${carPlate || ''} has entered APU Parking Lot (${spotName || 'Spot A1'}) at ${timeStr}.`;
    return this.createNotification(userId, carPlate, 'entry', message);
  }

  async triggerExitNotification(userId: string, carPlate: string): Promise<string> {
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const message = `Vehicle Exited: Your car ${carPlate || ''} has exited APU Parking Lot at ${timeStr}.`;
    return this.createNotification(userId, carPlate, 'exit', message);
  }

  async triggerFeeDeductionNotification(userId: string, carPlate: string, fee: number, balance: number): Promise<string> {
    const message = `Parking Fee Deducted: RM ${fee.toFixed(2)} deducted from your APU e-Wallet for parking session. New Balance: RM ${balance.toFixed(2)}.`;
    return this.createNotification(userId, carPlate, 'fee_deduction', message);
  }

  async triggerTopUpNotification(userId: string, carPlate: string, amount: number, balance: number): Promise<string> {
    const message = `Top Up Successful! RM ${amount.toFixed(2)} added to your APU e-Wallet. New Balance: RM ${balance.toFixed(2)}.`;
    return this.createNotification(userId, carPlate, 'top_up', message);
  }

  async triggerLowBalanceNotification(userId: string, carPlate: string, balance: number): Promise<string> {
    const message = `Your SmartPark balance is low (RM ${balance.toFixed(2)}). Please top up to avoid service interruption.`;
    return this.createNotification(userId, carPlate, 'low_balance', message);
  }

  async triggerDoubleParkNotification(userId: string, carPlate: string, spotName: string): Promise<string> {
    const message = `Double parking alert detected for vehicle ${carPlate || ''} at spot ${spotName || 'Spot A1'}.`;
    return this.createNotification(userId, carPlate, 'double_park', message);
  }

  async triggerOkuViolationNotification(userId: string, carPlate: string, spotName: string): Promise<string> {
    const message = `OKU parking violation alert detected for vehicle ${carPlate || ''} at spot ${spotName || 'OKU-1'}.`;
    return this.createNotification(userId, carPlate, 'oku_violation', message);
  }

  async markAsRead(notifId: string): Promise<void> {
    try {
      const notifDocRef = doc(this.firestore, `notifications/${notifId}`);
      await updateDoc(notifDocRef, { is_read: true });
    } catch (e) {
      try {
        const violDocRef = doc(this.firestore, `violations/${notifId}`);
        await updateDoc(violDocRef, { is_read: true });
      } catch (err) {
        console.warn('Could not mark as read in notifications or violations:', err);
      }
    }
  }

  async markAllAsRead(userId: string, carPlate?: string): Promise<void> {
    const notifsRef = collection(this.firestore, 'notifications');
    const violsRef = collection(this.firestore, 'violations');
    const cleanedPlate = carPlate ? carPlate.replace(/\s+/g, '').toUpperCase() : '';

    const [notifSnap, violSnap] = await Promise.all([
      getDocs(notifsRef).catch(() => null),
      getDocs(violsRef).catch(() => null)
    ]);

    const batch = writeBatch(this.firestore);

    if (notifSnap) {
      notifSnap.docs.forEach(docSnap => {
        const data = docSnap.data();
        const p = data['car_plate'] ? data['car_plate'].replace(/\s+/g, '').toUpperCase() : '';
        if ((data['user_id'] === userId || (cleanedPlate && p === cleanedPlate)) && !data['is_read']) {
          batch.update(docSnap.ref, { is_read: true });
        }
      });
    }

    if (violSnap) {
      violSnap.docs.forEach(docSnap => {
        const data = docSnap.data();
        const p = (data['car_plate'] || data['car_plate_search'] || '').replace(/\s+/g, '').toUpperCase();
        if ((data['user_id'] === userId || (cleanedPlate && p === cleanedPlate)) && !data['is_read']) {
          batch.update(docSnap.ref, { is_read: true });
        }
      });
    }

    return batch.commit();
  }

  async registerFcmToken(userId: string, token: string): Promise<void> {
    if (!userId || !token) return;
    const collectionName = this.getCollectionName();
    const userDocRef = doc(this.firestore, `${collectionName}/${userId}`);
    await updateDoc(userDocRef, {
      fcm_tokens: arrayUnion(token)
    });
    console.log(`[NotificationService] FCM token saved to ${collectionName}/${userId}`);
  }

  public showWebToast(notif: AppNotification) {
    const toast = document.createElement('div');
    toast.className = 'custom-web-toast animate-up';
    toast.style.cssText = `
      position: fixed;
      top: 24px;
      right: 24px;
      z-index: 9999;
      background: #ffffff;
      color: #0f172a;
      padding: 16px 20px;
      border-radius: 16px;
      box-shadow: 0 20px 40px -10px rgba(30, 58, 138, 0.25);
      border-left: 6px solid ${this.getToastColor(notif.type)};
      max-width: 380px;
      font-family: 'Plus Jakarta Sans', sans-serif;
      display: flex;
      flex-direction: column;
      gap: 4px;
      animation: toastIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    `;

    toast.innerHTML = `
      <div style="font-weight: 800; font-size: 0.85rem; color: ${this.getToastColor(notif.type)}; text-transform: uppercase; letter-spacing: 0.05em;">
        ${this.getToastTitle(notif.type)}
      </div>
      <div style="font-size: 0.9rem; font-weight: 600; color: #1e293b;">${notif.message}</div>
    `;

    document.body.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(-10px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 4500);
  }

  private getToastColor(type: AppNotification['type']): string {
    switch (type) {
      case 'violation_resolved': return '#10b981';
      case 'fee_deduction': return '#dc2626';
      case 'top_up': return '#16a34a';
      case 'double_park':
      case 'oku_violation': return '#ef4444';
      case 'low_balance': return '#f59e0b';
      case 'entry':
      case 'exit':
      default: return '#2563eb';
    }
  }

  private getToastTitle(type: AppNotification['type']): string {
    switch (type) {
      case 'violation_resolved': return 'Violation Resolved';
      case 'fee_deduction': return 'Fee Deducted';
      case 'top_up': return 'Top Up Successful';
      case 'double_park': return 'Double Parking Alert';
      case 'oku_violation': return 'OKU Violation Alert';
      case 'low_balance': return 'Low Balance Warning';
      case 'entry': return 'Parking Entry';
      case 'exit': return 'Parking Exit';
      default: return 'SmartPark Alert';
    }
  }
}
