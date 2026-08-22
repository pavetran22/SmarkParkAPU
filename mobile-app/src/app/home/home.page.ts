import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService, UserProfile } from '../services/auth.service';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserService } from '../services/user.service';
import { NotificationService, AppNotification } from '../services/notification.service';
import { WalletService } from '../services/wallet.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule]
})
export class HomePage implements OnInit, OnDestroy {
  user: UserProfile | null = null;
  currentUid: string = '';
  unreadNotifications: AppNotification[] = [];
  unreadCount: number = 0;
  userBalance: number = 20.00;
  cctvTime = '';
  
  private subs = new Subscription();
  private notifSub?: Subscription;
  private timerInterval: any;

  constructor(
    private auth: AuthService, 
    private router: Router,
    private userService: UserService,
    private notifService: NotificationService,
    private walletService: WalletService
  ) {}

  ngOnInit() {
    this.subs.add(
      this.auth.user$.subscribe(user => {
        if (user) {
          this.currentUid = user.uid;
          this.loadProfile(user.uid);
          this.loadBalance(user.uid);
          this.notifService.initPushNotifications(user.uid);
        } else {
          this.router.navigate(['/login']);
        }
      })
    );

    this.subs.add(
      this.notifService.unreadCount$.subscribe(count => this.unreadCount = count)
    );

    this.updateCctvTime();
    this.timerInterval = setInterval(() => this.updateCctvTime(), 1000);
  }

  ngOnDestroy() {
    this.subs.unsubscribe();
    if (this.notifSub) {
      this.notifSub.unsubscribe();
    }
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
  }

  updateCctvTime() {
    const now = new Date();
    const pad = (num: number) => String(num).padStart(2, '0');
    
    const yyyy = now.getFullYear();
    const mm = pad(now.getMonth() + 1);
    const dd = pad(now.getDate());
    
    const hh = pad(now.getHours());
    const min = pad(now.getMinutes());
    const ss = pad(now.getSeconds());
    
    this.cctvTime = `${yyyy}-${mm}-${dd} ${hh}:${min}:${ss}`;
  }

  loadProfile(uid: string) {
    this.subs.add(
      this.userService.getUserProfile(uid).subscribe(profile => {
        this.user = profile;
        if (profile) {
          this.currentUid = profile.uid;
          this.listenToNotifications(profile.uid, profile.car_plate);
        } else {
          this.currentUid = uid;
          this.listenToNotifications(uid);
        }
      })
    );
  }

  loadBalance(uid: string) {
    this.subs.add(
      this.walletService.getUserBalance(uid).subscribe(balance => {
        this.userBalance = balance;
      })
    );
  }

  async quickTopUp(amount: number) {
    if (!this.currentUid) return;
    const plate = this.user?.car_plate || '';
    const newBal = await this.walletService.topUpBalance(this.currentUid, amount, plate);
    this.userBalance = newBal;
  }

  listenToNotifications(uid: string, carPlate?: string) {
    if (this.notifSub) {
      this.notifSub.unsubscribe();
    }
    this.notifSub = this.notifService.listenToNotifications(uid, carPlate).subscribe(notifs => {
      this.unreadNotifications = notifs.filter(n => !n.is_read);
    });
  }

  getBadgeTitle(type: AppNotification['type']): string {
    switch (type) {
      case 'double_park': return 'Double Parking Alert';
      case 'oku_violation': return 'OKU Violation';
      case 'low_balance': return 'Low Balance Warning';
      case 'entry': return 'Parking Entry';
      case 'exit': return 'Parking Exit';
      default: return 'SmartPark Notification';
    }
  }

  navigate(path: string) {
    this.router.navigate([path]);
  }

  handleLogout() {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}
