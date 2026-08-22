import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { Router } from '@angular/router';
import { NotificationService, AppNotification } from '../../services/notification.service';
import { UserService } from '../../services/user.service';
import { AuthService } from '../../services/auth.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule],
  template: `
    <ion-header [translucent]="true">
      <ion-toolbar color="primary">
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/home"></ion-back-button>
        </ion-buttons>
        <ion-title>Notification Center</ion-title>
        <ion-buttons slot="end" *ngIf="unreadCount > 0">
          <ion-button (click)="markAllAsRead()" size="small" fill="clear">
            Mark all read
          </ion-button>
        </ion-buttons>
      </ion-toolbar>

      <ion-toolbar color="primary">
        <ion-segment [(ngModel)]="currentFilter" (ionChange)="filterChanged()" value="all" mode="md">
          <ion-segment-button value="all">
            <ion-label>All</ion-label>
          </ion-segment-button>
          <ion-segment-button value="violations">
            <ion-label>Violations</ion-label>
          </ion-segment-button>
          <ion-segment-button value="entry-exit">
            <ion-label>Entry/Exit</ion-label>
          </ion-segment-button>
          <ion-segment-button value="balance">
            <ion-label>Balance</ion-label>
          </ion-segment-button>
        </ion-segment>
      </ion-toolbar>
    </ion-header>

    <ion-content [fullscreen]="true" class="ion-padding" color="light">
      
      <div *ngIf="loading" class="ion-text-center ion-padding" style="margin-top: 3rem;">
        <ion-spinner name="crescent" color="primary"></ion-spinner>
        <p style="color: #64748b; font-weight: 600; font-size: 0.9rem;">Loading notifications...</p>
      </div>

      <div *ngIf="!loading && filteredNotifications.length === 0" class="empty-state">
        <div class="empty-icon-wrap">
          <ion-icon name="notifications-off-outline"></ion-icon>
        </div>
        <h2>No Notifications</h2>
        <p>No activity records found for this category.</p>
      </div>

      <ion-list *ngIf="!loading && filteredNotifications.length > 0" lines="none" class="notif-list">
        <ion-item *ngFor="let notif of filteredNotifications" 
                  (click)="markAsRead(notif)" 
                  [class.unread-item]="!notif.is_read" 
                  class="notif-card animate-fade-in">
          
          <div slot="start" class="type-icon-circle" [ngClass]="notif.type">
            <ion-icon [name]="getIconName(notif.type)"></ion-icon>
          </div>

          <ion-label class="ion-text-wrap">
            <div class="card-header">
              <div style="display: flex; align-items: center; gap: 6px;">
                <span class="badge-tag" [ngClass]="notif.type">{{ getBadgeLabel(notif.type) }}</span>
                <span *ngIf="notif.resolved && notif.type !== 'violation_resolved'" class="badge-tag resolved-pill">RESOLVED</span>
              </div>
              <span class="time-text">{{ formatTime(notif.created_at) }}</span>
            </div>
            <p class="notif-msg">{{ notif.message }}</p>
          </ion-label>

          <div slot="end" *ngIf="!notif.is_read" class="unread-dot"></div>
        </ion-item>
      </ion-list>

    </ion-content>
  `,
  styles: [`
    ion-segment { --background: rgba(255, 255, 255, 0.15); ion-segment-button { --color: #bfdbfe; --color-checked: #ffffff; --indicator-color: #ffffff; font-weight: 700; font-size: 0.78rem; } }

    .empty-state { text-align: center; padding: 4rem 1.5rem; h2 { font-size: 1.3rem; font-weight: 800; color: #0f172a; margin-top: 1rem; } p { color: #64748b; font-size: 0.88rem; } }
    .empty-icon-wrap { width: 64px; height: 64px; background: #eff6ff; border-radius: 50%; color: #2563eb; display: flex; align-items: center; justify-content: center; margin: 0 auto; border: 1px solid #bfdbfe; ion-icon { font-size: 2rem; } }

    .notif-list { background: transparent; padding: 0; }
    .notif-card { --background: #ffffff; border-radius: 16px; margin-bottom: 10px; box-shadow: 0 4px 12px rgba(30, 58, 138, 0.05); border: 1px solid #e2e8f0; --padding-start: 14px; --padding-end: 14px; --padding-top: 12px; --padding-bottom: 12px; }
    .notif-card.unread-item { --background: #f0f5ff; border-color: #bfdbfe; }

    .type-icon-circle { width: 42px; height: 42px; border-radius: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-right: 12px; ion-icon { font-size: 1.4rem; } }
    .type-icon-circle.double_park, .type-icon-circle.oku_violation { background: #fef2f2; color: #ef4444; border: 1px solid #fca5a5; }
    .type-icon-circle.violation_resolved { background: #ecfdf5; color: #10b981; border: 1px solid #a7f3d0; }
    .type-icon-circle.entry, .type-icon-circle.exit { background: #eff6ff; color: #2563eb; border: 1px solid #bfdbfe; }
    .type-icon-circle.low_balance { background: #fff7ed; color: #f97316; border: 1px solid #ffedd5; }
    .type-icon-circle.fee_deduction { background: #fef2f2; color: #dc2626; border: 1px solid #fca5a5; }
    .type-icon-circle.top_up { background: #f0fdf4; color: #16a34a; border: 1px solid #86efac; }

    .card-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; }
    .badge-tag { font-size: 0.68rem; font-weight: 800; text-transform: uppercase; padding: 2px 6px; border-radius: 6px; }
    .badge-tag.double_park, .badge-tag.oku_violation { background: #fee2e2; color: #dc2626; }
    .badge-tag.violation_resolved { background: #d1fae5; color: #047857; }
    .badge-tag.resolved-pill { background: #d1fae5; color: #047857; border: 1px solid #a7f3d0; }
    .badge-tag.entry, .badge-tag.exit { background: #dbeafe; color: #1d4ed8; }
    .badge-tag.low_balance { background: #ffedd5; color: #ea580c; }
    .badge-tag.fee_deduction { background: #fee2e2; color: #dc2626; }
    .badge-tag.top_up { background: #dcfce7; color: #15803d; }

    .time-text { font-size: 0.72rem; color: #94a3b8; font-weight: 600; }
    .notif-msg { color: #1e293b; font-size: 0.88rem; font-weight: 600; line-height: 1.4; margin: 0; }
    .unread-dot { width: 10px; height: 10px; background: #2563eb; border-radius: 50%; }
  `]
})
export class NotificationsPage implements OnInit, OnDestroy {
  notifications: AppNotification[] = [];
  currentFilter: 'all' | 'violations' | 'entry-exit' | 'balance' = 'all';
  unreadCount = 0;
  loading = true;
  private sub?: Subscription;
  private currentUserId = '';

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
          this.subscribeToNotifications(user.uid, plate);
        });
      }
    });

    this.notifService.unreadCount$.subscribe(c => this.unreadCount = c);
  }

  ngOnDestroy() {
    if (this.sub) this.sub.unsubscribe();
  }

  subscribeToNotifications(userId: string, carPlate?: string) {
    this.loading = true;
    this.sub = this.notifService.listenToNotifications(userId, carPlate).subscribe(list => {
      this.notifications = list;
      this.loading = false;
    });
  }

  filterChanged() {}

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

  async markAllAsRead() {
    if (this.currentUserId) {
      await this.notifService.markAllAsRead(this.currentUserId);
    }
  }

  getIconName(type: AppNotification['type']): string {
    switch (type) {
      case 'violation_resolved':
        return 'checkmark-circle-outline';
      case 'double_park':
      case 'oku_violation':
        return 'warning-outline';
      case 'fee_deduction':
        return 'card-outline';
      case 'top_up':
        return 'add-circle-outline';
      case 'low_balance':
        return 'wallet-outline';
      case 'entry':
      case 'exit':
      default:
        return 'car-outline';
    }
  }

  getBadgeLabel(type: AppNotification['type']): string {
    switch (type) {
      case 'violation_resolved': return 'Issue Resolved';
      case 'double_park': return 'Double Parking';
      case 'oku_violation': return 'OKU Violation';
      case 'fee_deduction': return 'Fee Deducted';
      case 'top_up': return 'Top Up Success';
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
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    return `${diffDays}d ago`;
  }
}
