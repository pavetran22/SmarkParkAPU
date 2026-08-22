import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { NotificationService, AppNotification } from '../../services/notification.service';
import { UserService } from '../../services/user.service';
import { AuthService } from '../../services/auth.service';
import { NotifBell } from '../../components/notif-bell/notif-bell';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, NotifBell],
  template: `
    <div style="display: flex; min-height: 100vh; background: #f8fafc; font-family: 'Plus Jakarta Sans', sans-serif;">
      
      <!-- Sidebar -->
      <aside style="width: 260px; background: #1e3a8a; color: white; display: flex; flex-direction: column; justify-content: space-between; padding: 1.75rem 1.25rem; flex-shrink: 0; box-shadow: 4px 0 20px rgba(30, 58, 138, 0.15);">
        <div>
          <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 2.5rem; padding-left: 0.5rem;">
            <div style="background: rgba(255, 255, 255, 0.15); padding: 10px; border-radius: 14px; backdrop-filter: blur(8px);">
              <lucide-icon name="car" [size]="24" style="color: white;"></lucide-icon>
            </div>
            <div>
              <h2 style="font-size: 1.15rem; font-weight: 800; margin: 0; letter-spacing: 0.02em;">SmartPark</h2>
              <span style="font-size: 0.72rem; color: #93c5fd; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em;">APU Dashboard</span>
            </div>
          </div>

          <nav style="display: flex; flex-direction: column; gap: 6px;">
            <a (click)="navigate('/dashboard')" class="nav-item">
              <lucide-icon name="layout-grid" [size]="18"></lucide-icon> Dashboard
            </a>
            <a (click)="navigate('/spots')" class="nav-item">
              <lucide-icon name="map" [size]="18"></lucide-icon> Live Parking Spots
            </a>
            <a (click)="navigate('/find-my-car')" class="nav-item">
              <lucide-icon name="navigation" [size]="18"></lucide-icon> Find My Car
            </a>
            <a (click)="navigate('/my-vehicles')" class="nav-item">
              <lucide-icon name="car" [size]="18"></lucide-icon> My Vehicles
            </a>
            <a (click)="navigate('/notifications')" class="nav-item active">
              <lucide-icon name="bell" [size]="18"></lucide-icon> Notifications
            </a>
            <a (click)="navigate('/history')" class="nav-item">
              <lucide-icon name="history" [size]="18"></lucide-icon> Parking History
            </a>
          </nav>
        </div>

        <div style="border-top: 1px solid rgba(255, 255, 255, 0.12); padding-top: 1.25rem;">
          <button (click)="logout()" class="logout-btn">
            <lucide-icon name="log-out" [size]="18"></lucide-icon> Log Out
          </button>
        </div>
      </aside>

      <!-- Main Content -->
      <main style="flex: 1; padding: 2rem 2.5rem; overflow-y: auto;">
        
        <!-- Header -->
        <header style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 2rem;">
          <div>
            <h1 style="font-size: 1.85rem; font-weight: 800; color: #0f172a; margin: 0;">Notification Center</h1>
            <p style="color: #64748b; font-size: 0.9rem; margin-top: 4px; font-weight: 500;">
              Real-time activity alerts, parking entries/exits, fee deductions, and balance updates
            </p>
          </div>
          <div style="display: flex; align-items: center; gap: 1rem;">
            <app-notif-bell></app-notif-bell>
          </div>
        </header>





        <!-- Notification Panel Card -->
        <div class="glass-panel" style="background: white; border-radius: 20px; border: 1px solid #dbeafe; padding: 1.75rem; box-shadow: 0 10px 30px -5px rgba(30, 58, 138, 0.08);">
          
          <!-- Filter Tabs & Actions Header -->
          <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem; border-bottom: 1px solid #e2e8f0; padding-bottom: 1.25rem; margin-bottom: 1.5rem;">
            
            <div style="display: flex; gap: 8px;" class="tab-group">
              <button (click)="currentFilter = 'all'" [class.active]="currentFilter === 'all'" class="filter-tab">
                All Notifications
              </button>
              <button (click)="currentFilter = 'violations'" [class.active]="currentFilter === 'violations'" class="filter-tab">
                Violations
              </button>
              <button (click)="currentFilter = 'entry-exit'" [class.active]="currentFilter === 'entry-exit'" class="filter-tab">
                Entry / Exit
              </button>
              <button (click)="currentFilter = 'balance'" [class.active]="currentFilter === 'balance'" class="filter-tab">
                Balance & Payments
              </button>
            </div>

            <button *ngIf="filteredNotifications.length > 0" (click)="markAllRead()" class="action-btn">
              <lucide-icon name="check-circle" [size]="16"></lucide-icon> Mark All as Read
            </button>
          </div>

          <!-- Notification List -->
          <div *ngIf="loading" style="padding: 3rem; text-align: center; color: #64748b; font-weight: 600;">
            <lucide-icon name="refresh-cw" [size]="24" class="spin" style="margin-bottom: 8px;"></lucide-icon>
            <div>Loading notifications...</div>
          </div>

          <div *ngIf="!loading && filteredNotifications.length === 0" style="padding: 4rem 2rem; text-align: center; color: #64748b;">
            <div style="width: 64px; height: 64px; background: #eff6ff; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 1rem; color: #2563eb; border: 1px solid #bfdbfe;">
              <lucide-icon name="bell" [size]="32"></lucide-icon>
            </div>
            <h3 style="font-size: 1.2rem; font-weight: 800; color: #0f172a; margin: 0 0 6px;">No Notifications Found</h3>
            <p style="font-size: 0.88rem; margin: 0; color: #64748b;">There are no activity records for the selected filter category.</p>
          </div>

          <div *ngIf="!loading && filteredNotifications.length > 0" style="display: flex; flex-direction: column; gap: 12px;">
            
            <div *ngFor="let notif of filteredNotifications" 
                 (click)="markAsRead(notif)" 
                 [class.unread-item]="!notif.is_read" 
                 class="notif-row animate-fade-in">
              
              <div class="type-icon-pill" [ngClass]="notif.type">
                <lucide-icon [name]="getIconName(notif.type)" [size]="20"></lucide-icon>
              </div>

              <div style="flex: 1;">
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px;">
                  <div style="display: flex; align-items: center; gap: 8px;">
                    <span class="badge-tag" [ngClass]="notif.type">{{ getBadgeLabel(notif.type) }}</span>
                    <span *ngIf="notif.resolved && notif.type !== 'violation_resolved'" class="badge-tag resolved-pill">RESOLVED</span>
                  </div>
                  <span style="font-size: 0.78rem; font-weight: 600; color: #94a3b8;">{{ formatTime(notif.created_at) }}</span>
                </div>
                <div style="font-size: 0.92rem; font-weight: 600; color: #1e293b; line-height: 1.5;">
                  {{ notif.message }}
                </div>
              </div>

              <div *ngIf="!notif.is_read" class="blue-dot" title="Unread"></div>
            </div>

          </div>

        </div>

      </main>

    </div>
  `,
  styles: [`
    .nav-item { display: flex; align-items: center; gap: 12px; padding: 12px 16px; border-radius: 12px; color: #bfdbfe; font-weight: 600; text-decoration: none; cursor: pointer; transition: all 0.2s ease; }
    .nav-item:hover { background: rgba(255, 255, 255, 0.1); color: white; }
    .nav-item.active { background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: white; font-weight: 700; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3); }

    .logout-btn { width: 100%; display: flex; align-items: center; gap: 12px; padding: 12px 16px; border-radius: 12px; background: rgba(239, 68, 68, 0.15); color: #fca5a5; border: 1px solid rgba(239, 68, 68, 0.3); font-weight: 700; cursor: pointer; transition: 0.2s; }
    .logout-btn:hover { background: #ef4444; color: white; }

    .filter-tab { background: #f1f5f9; border: 1px solid #e2e8f0; color: #64748b; font-weight: 700; font-size: 0.85rem; padding: 8px 16px; border-radius: 10px; cursor: pointer; transition: 0.2s; }
    .filter-tab:hover { background: #e2e8f0; color: #1e293b; }
    .filter-tab.active { background: #2563eb; color: white; border-color: #2563eb; box-shadow: 0 4px 10px rgba(37, 99, 235, 0.25); }

    .action-btn { background: #eff6ff; border: 1px solid #bfdbfe; color: #2563eb; font-weight: 700; font-size: 0.82rem; padding: 8px 16px; border-radius: 10px; cursor: pointer; display: flex; align-items: center; gap: 6px; transition: 0.2s; }
    .action-btn:hover { background: #dbeafe; color: #1d4ed8; }

    .notif-row { display: flex; align-items: flex-start; gap: 16px; padding: 18px; border-radius: 14px; border: 1px solid #f1f5f9; background: #ffffff; cursor: pointer; transition: 0.2s; }
    .notif-row:hover { transform: translateY(-1px); box-shadow: 0 8px 20px rgba(30, 58, 138, 0.06); border-color: #cbd5e1; }
    .notif-row.unread-item { background: #f0f5ff; border-color: #bfdbfe; }

    .type-icon-pill { width: 44px; height: 44px; border-radius: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .type-icon-pill.double_park, .type-icon-pill.oku_violation { background: #fef2f2; color: #ef4444; border: 1px solid #fca5a5; }
    .type-icon-pill.violation_resolved { background: #ecfdf5; color: #10b981; border: 1px solid #a7f3d0; }
    .type-icon-pill.entry, .type-icon-pill.exit { background: #eff6ff; color: #2563eb; border: 1px solid #bfdbfe; }
    .type-icon-pill.low_balance { background: #fff7ed; color: #f97316; border: 1px solid #ffedd5; }
    .type-icon-pill.fee_deduction { background: #fef2f2; color: #dc2626; border: 1px solid #fca5a5; }
    .type-icon-pill.top_up { background: #f0fdf4; color: #16a34a; border: 1px solid #86efac; }

    .badge-tag { font-size: 0.7rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; padding: 2px 8px; border-radius: 6px; }
    .badge-tag.double_park, .badge-tag.oku_violation { background: #fee2e2; color: #dc2626; }
    .badge-tag.violation_resolved { background: #d1fae5; color: #047857; }
    .badge-tag.resolved-pill { background: #d1fae5; color: #047857; border: 1px solid #a7f3d0; }
    .badge-tag.entry, .badge-tag.exit { background: #dbeafe; color: #1d4ed8; }
    .badge-tag.low_balance { background: #ffedd5; color: #ea580c; }
    .badge-tag.fee_deduction { background: #fee2e2; color: #dc2626; }
    .badge-tag.top_up { background: #dcfce7; color: #15803d; }

    .blue-dot { width: 10px; height: 10px; background: #2563eb; border-radius: 50%; margin-top: 6px; flex-shrink: 0; }

    .spin { animation: spin 1s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
  `]
})
export class Notifications implements OnInit, OnDestroy {
  notifications: AppNotification[] = [];
  currentFilter: 'all' | 'violations' | 'entry-exit' | 'balance' = 'all';
  loading = true;
  private sub?: Subscription;
  currentUserId = '';

  constructor(
    private notifService: NotificationService,
    private userService: UserService,
    private auth: AuthService,
    private router: Router
  ) {}

  ngOnInit() {
    this.auth.user$.subscribe(user => {
      if (user) {
        this.currentUserId = user.uid;
        this.userService.getUserProfile(user.uid, user.email || '').subscribe(profile => {
          const plate = profile?.car_plate || '';
          this.subscribeToNotifs(user.uid, plate);
        });
      }
    });
  }

  ngOnDestroy() {
    if (this.sub) this.sub.unsubscribe();
  }

  subscribeToNotifs(userId: string, carPlate?: string) {
    this.loading = true;
    this.sub = this.notifService.listenToNotifications(userId, carPlate).subscribe(list => {
      this.notifications = list;
      this.loading = false;
    });
  }



  get filteredNotifications(): AppNotification[] {
    if (this.currentFilter === 'violations') {
      return this.notifications.filter(n => n.type === 'double_park' || n.type === 'oku_violation' || n.type === 'violation_resolved');
    }
    if (this.currentFilter === 'entry-exit') {
      return this.notifications.filter(n => n.type === 'entry' || n.type === 'exit');
    }
    if (this.currentFilter === 'balance') {
      return this.notifications.filter(n => n.type === 'low_balance' || n.type === 'fee_deduction' || n.type === 'top_up');
    }
    return this.notifications;
  }

  async markAsRead(notif: AppNotification) {
    if (notif.id && !notif.is_read) {
      await this.notifService.markAsRead(notif.id);
    }
  }

  async markAllRead() {
    if (this.currentUserId) {
      await this.notifService.markAllAsRead(this.currentUserId);
    }
  }

  navigate(path: string) {
    this.router.navigate([path]);
  }

  logout() {
    this.auth.logout().then(() => this.router.navigate(['/login']));
  }

  getIconName(type: AppNotification['type']): string {
    switch (type) {
      case 'violation_resolved':
        return 'check-circle';
      case 'double_park':
      case 'oku_violation':
        return 'alert-triangle';
      case 'fee_deduction':
        return 'receipt';
      case 'top_up':
        return 'arrow-down-circle';
      case 'low_balance':
        return 'wallet';
      case 'entry':
      case 'exit':
      default:
        return 'car';
    }
  }

  getBadgeLabel(type: AppNotification['type']): string {
    switch (type) {
      case 'violation_resolved': return 'Issue Resolved';
      case 'double_park': return 'Double Parking Alert';
      case 'oku_violation': return 'OKU Violation';
      case 'fee_deduction': return 'Fee Deducted';
      case 'top_up': return 'Top Up Successful';
      case 'low_balance': return 'Low Balance';
      case 'entry': return 'Parking Entry';
      case 'exit': return 'Parking Exit';
      default: return 'Notification';
    }
  }

  formatTime(timestamp: any): string {
    if (!timestamp) return 'Just now';
    let date: Date;
    if (timestamp.toDate) {
      date = timestamp.toDate();
    } else if (typeof timestamp === 'number') {
      date = new Date(timestamp);
    } else {
      date = new Date(timestamp);
    }

    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minutes ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays === 1) return 'Yesterday';
    return `${diffDays} days ago`;
  }
}
