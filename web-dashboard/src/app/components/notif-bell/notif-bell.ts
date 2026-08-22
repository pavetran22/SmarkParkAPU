import { Component, OnInit, OnDestroy, ElementRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { NotificationService, AppNotification } from '../../services/notification.service';
import { AuthService } from '../../services/auth.service';
import { UserService } from '../../services/user.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-notif-bell',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  template: `
    <div class="notif-bell-container">
      <!-- Bell Icon & Badge -->
      <button (click)="toggleDropdown()" class="bell-btn" title="Notifications">
        <lucide-icon name="bell" [size]="20"></lucide-icon>
        <span *ngIf="unreadCount > 0" class="badge-count animate-pulse">
          {{ unreadCount > 99 ? '99+' : unreadCount }}
        </span>
      </button>

      <!-- Glassmorphism Dropdown -->
      <div *ngIf="isOpen" class="notif-dropdown glass-panel animate-fade-in">
        <div class="dropdown-header">
          <div class="header-title">
            <h3>Notifications</h3>
            <span *ngIf="unreadCount > 0" class="unread-pill">{{ unreadCount }} new</span>
          </div>
          <button *ngIf="unreadCount > 0" (click)="markAllAsRead()" class="mark-all-btn">
            Mark all read
          </button>
        </div>

        <div class="dropdown-body">
          <div *ngIf="loading" class="loading-state">
            <lucide-icon name="refresh-cw" [size]="18" class="spin"></lucide-icon>
            <span>Loading notifications...</span>
          </div>

          <div *ngIf="!loading && notifications.length === 0" class="empty-state">
            <lucide-icon name="check-circle" [size]="32" class="empty-icon"></lucide-icon>
            <p>You're all caught up!</p>
            <span>No notifications to show right now.</span>
          </div>

          <div *ngFor="let notif of notifications.slice(0, 5)" 
               (click)="onNotifClick(notif)" 
               [class.unread]="!notif.is_read" 
               class="notif-item">
            
            <div class="icon-wrap" [ngClass]="notif.type">
              <lucide-icon [name]="getIconName(notif.type)" [size]="18"></lucide-icon>
            </div>

            <div class="notif-content">
              <div class="notif-text">{{ notif.message }}</div>
              <div class="notif-time">{{ formatTime(notif.created_at) }}</div>
            </div>

            <div *ngIf="!notif.is_read" class="unread-dot"></div>
          </div>
        </div>

        <div class="dropdown-footer">
          <button (click)="goToAllNotifications()" class="view-all-btn">
            View All Notifications
            <lucide-icon name="arrow-right" [size]="14"></lucide-icon>
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .notif-bell-container { position: relative; display: inline-block; }
    .bell-btn { position: relative; background: rgba(255, 255, 255, 0.8); border: 1px solid #dbeafe; padding: 10px; border-radius: 12px; color: #1e3a8a; cursor: pointer; transition: all 0.2s ease; display: flex; align-items: center; justify-content: center; }
    .bell-btn:hover { background: #eff6ff; color: #2563eb; transform: translateY(-1px); border-color: #bfdbfe; }
    
    .badge-count { position: absolute; top: -5px; right: -5px; background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; font-size: 0.68rem; font-weight: 800; padding: 2px 6px; border-radius: 10px; border: 2px solid white; box-shadow: 0 2px 6px rgba(239, 68, 68, 0.4); }

    .notif-dropdown { position: absolute; right: 0; top: calc(100% + 12px); width: 360px; background: rgba(255, 255, 255, 0.96); backdrop-filter: blur(20px); border-radius: 20px; border: 1px solid #dbeafe; box-shadow: 0 20px 40px -10px rgba(30, 58, 138, 0.18); z-index: 1000; overflow: hidden; }

    .dropdown-header { display: flex; align-items: center; justify-content: space-between; padding: 16px 20px; border-bottom: 1px solid #f1f5f9; background: #f8fafc; }
    .header-title { display: flex; align-items: center; gap: 8px; h3 { margin: 0; font-size: 1rem; font-weight: 800; color: #0f172a; } }
    .unread-pill { background: #dbeafe; color: #1d4ed8; font-size: 0.72rem; font-weight: 800; padding: 2px 8px; border-radius: 12px; }
    .mark-all-btn { background: none; border: none; color: #2563eb; font-size: 0.78rem; font-weight: 700; cursor: pointer; &:hover { text-decoration: underline; } }

    .dropdown-body { max-height: 340px; overflow-y: auto; }
    .loading-state, .empty-state { padding: 32px 20px; text-align: center; color: #64748b; font-size: 0.85rem; font-weight: 600; display: flex; flex-direction: column; align-items: center; gap: 8px; }
    .empty-icon { color: #10b981; }

    .notif-item { display: flex; align-items: flex-start; gap: 12px; padding: 14px 20px; border-bottom: 1px solid #f1f5f9; cursor: pointer; transition: background 0.2s; position: relative; }
    .notif-item:hover { background: #f8fafc; }
    .notif-item.unread { background: #f0f5ff; }

    .icon-wrap { width: 36px; height: 36px; border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .icon-wrap.double_park, .icon-wrap.oku_violation { background: #fef2f2; color: #ef4444; border: 1px solid #fca5a5; }
    .icon-wrap.violation_resolved { background: #ecfdf5; color: #10b981; border: 1px solid #a7f3d0; }
    .icon-wrap.entry, .icon-wrap.exit { background: #eff6ff; color: #2563eb; border: 1px solid #bfdbfe; }
    .icon-wrap.low_balance { background: #fff7ed; color: #f97316; border: 1px solid #ffedd5; }

    .notif-content { flex: 1; }
    .notif-text { font-size: 0.83rem; font-weight: 600; color: #1e293b; line-height: 1.4; }
    .notif-time { font-size: 0.72rem; color: #94a3b8; margin-top: 4px; font-weight: 500; }
    .unread-dot { width: 8px; height: 8px; background: #2563eb; border-radius: 50%; margin-top: 6px; flex-shrink: 0; }

    .dropdown-footer { padding: 12px; background: #f8fafc; border-top: 1px solid #f1f5f9; text-align: center; }
    .view-all-btn { width: 100%; background: white; border: 1px solid #cbd5e1; padding: 8px; border-radius: 10px; color: #1e3a8a; font-weight: 700; font-size: 0.82rem; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; transition: 0.2s; }
    .view-all-btn:hover { background: #eff6ff; border-color: #bfdbfe; color: #2563eb; }

    .spin { animation: spin 1s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
  `]
})
export class NotifBell implements OnInit, OnDestroy {
  isOpen = false;
  unreadCount = 0;
  notifications: AppNotification[] = [];
  loading = true;
  private sub?: Subscription;
  private currentUserId = '';

  constructor(
    private notifService: NotificationService,
    private auth: AuthService,
    private userService: UserService,
    private router: Router,
    private elementRef: ElementRef
  ) {}

  ngOnInit() {
    this.auth.user$.subscribe(user => {
      if (user) {
        this.currentUserId = user.uid;
        this.userService.getUserProfile(user.uid, user.email || '').subscribe(profile => {
          const plate = profile?.car_plate || '';
          this.subscribeToNotifications(user.uid, plate);
        });
      }
    });

    this.notifService.unreadCount$.subscribe(count => {
      this.unreadCount = count;
    });
  }

  ngOnDestroy() {
    if (this.sub) this.sub.unsubscribe();
  }

  subscribeToNotifications(userId: string, carPlate?: string) {
    this.loading = true;
    if (this.sub) this.sub.unsubscribe();
    this.sub = this.notifService.listenToNotifications(userId, carPlate).subscribe(notifs => {
      this.notifications = notifs;
      this.loading = false;
    });
  }

  toggleDropdown() {
    this.isOpen = !this.isOpen;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    if (this.isOpen && !this.elementRef.nativeElement.contains(event.target)) {
      this.isOpen = false;
    }
  }

  async onNotifClick(notif: AppNotification) {
    if (notif.id && !notif.is_read) {
      await this.notifService.markAsRead(notif.id);
    }
    this.isOpen = false;
    this.router.navigate(['/notifications']);
  }

  async markAllAsRead() {
    if (this.currentUserId) {
      await this.notifService.markAllAsRead(this.currentUserId);
    }
  }

  goToAllNotifications() {
    this.isOpen = false;
    this.router.navigate(['/notifications']);
  }

  getIconName(type: AppNotification['type']): string {
    switch (type) {
      case 'violation_resolved':
        return 'check-circle';
      case 'double_park':
      case 'oku_violation':
        return 'alert-triangle';
      case 'low_balance':
        return 'briefcase'; // or credit card / wallet
      case 'entry':
      case 'exit':
      default:
        return 'car';
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
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    return `${diffDays}d ago`;
  }
}
