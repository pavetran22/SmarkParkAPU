import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { ParkingService, ParkingLog } from '../../services/parking.service';
import { AuthService } from '../../services/auth.service';
import { Subscription } from 'rxjs';
import { Router } from '@angular/router';

@Component({
  selector: 'app-history',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  template: `
    <div class="page-shell animate-fade-in">
        <header class="app-header">
            <div class="header-wrap">
                <div style="display: flex; align-items: center; gap: 12px;">
                    <button (click)="goBack()" class="back-btn">
                        <lucide-icon name="arrow-left" [size]="20"></lucide-icon>
                    </button>
                    <h1>Parking History</h1>
                </div>
            </div>
        </header>

        <div class="page-content">
            <div *ngIf="loading" class="loader-wrap">
                <lucide-icon name="refresh-cw" class="spinning" [size]="32"></lucide-icon>
                <p>Retrieving logs...</p>
            </div>

            <div *ngIf="!loading && logs.length > 0" class="logs-list animate-up">
                <div *ngFor="let log of logs" class="log-item">
                    <div class="log-main">
                        <div class="date-box">
                            <span class="day">{{ formatDate(log.created_at, 'day') }}</span>
                            <span class="month">{{ formatDate(log.created_at, 'month') }}</span>
                        </div>
                        <div class="log-details">
                            <div class="log-header">
                                <span class="spot-tag">{{ log.parking_spot }}</span>
                                <span class="status-badge" [ngClass]="log.status">{{ log.status }}</span>
                            </div>
                            <h3>{{ log.car_plate }}</h3>
                            <p class="model-info">{{ log.car_model }}</p>
                        </div>
                    </div>
                    <div class="log-times">
                        <div class="time-bit">
                            <label>Entry</label>
                            <span>{{ formatTime(log.entry_time) }}</span>
                        </div>
                        <div class="time-bit">
                            <label>Exit</label>
                            <span>{{ log.exit_time ? formatTime(log.exit_time) : '—' }}</span>
                        </div>
                        <div class="duration-bit">
                            <label>Duration</label>
                            <span>{{ calculateDuration(log.entry_time, log.exit_time) }}</span>
                        </div>
                    </div>
                    <div *ngIf="log.is_oku_violation || log.is_double_park" class="log-alerts">
                        <span *ngIf="log.is_double_park" class="violation-tag">Double Parked</span>
                        <span *ngIf="log.is_oku_violation" class="violation-tag warning">OKU Violation</span>
                    </div>
                </div>
            </div>

            <div *ngIf="!loading && logs.length === 0" class="empty-state animate-up">
                <lucide-icon name="history" [size]="48" style="color: #cbd5e1; margin-bottom: 1.5rem;"></lucide-icon>
                <h3>No History found</h3>
                <p>Your parking records will appear here once you start using SmartPark.</p>
                <button class="action-btn" (click)="goBack()">Dashboard</button>
            </div>
        </div>
    </div>
  `,
  styles: [`
    .page-shell { min-height: 100vh; background: #f8fafc; }
    .app-header { background: white; color: #1e293b; padding: 1.25rem 2rem; border-bottom: 1px solid #e2e8f0; position: sticky; top: 0; z-index: 100; }
    .header-wrap { max-width: 900px; margin: 0 auto; display: flex; align-items: center; }
    .header-wrap h1 { margin: 0; font-size: 1.1rem; font-weight: 800; }
    .back-btn { background: #f1f5f9; border: none; width: 36px; height: 36px; border-radius: 10px; display: flex; align-items: center; justify-content: center; cursor: pointer; color: #64748b; }

    .page-content { max-width: 900px; margin: 0 auto; padding: 2rem; }

    .logs-list { display: flex; flex-direction: column; gap: 1rem; }
    .log-item { background: white; border-radius: 1.25rem; padding: 1.5rem; border: 1px solid #e2e8f0; display: flex; flex-direction: column; gap: 1.25rem; }
    
    .log-main { display: flex; gap: 1.5rem; align-items: flex-start; }
    .date-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; width: 60px; height: 60px; display: flex; flex-direction: column; align-items: center; justify-content: center; flex-shrink: 0; }
    .date-box .day { font-size: 1.25rem; font-weight: 800; color: #0f172a; }
    .date-box .month { font-size: 0.7rem; font-weight: 800; color: #94a3b8; text-transform: uppercase; }

    .log-details { flex: 1; }
    .log-header { display: flex; gap: 8px; margin-bottom: 8px; }
    .spot-tag { background: #eff6ff; color: #3b82f6; padding: 2px 8px; border-radius: 6px; font-weight: 800; font-size: 0.7rem; }
    .status-badge { padding: 2px 8px; border-radius: 6px; font-weight: 800; font-size: 0.7rem; text-transform: uppercase; }
    .status-badge.parked { background: #ecfdf5; color: #059669; }
    .status-badge.exited { background: #f1f5f9; color: #64748b; }
    .log-details h3 { margin: 0; font-size: 1.15rem; font-weight: 900; color: #0f172a; }
    .model-info { margin: 2px 0 0; color: #64748b; font-size: 0.9rem; font-weight: 500; }

    .log-times { display: grid; grid-template-columns: 1fr 1fr 1fr; background: #f8fafc; padding: 1rem; border-radius: 12px; }
    .time-bit, .duration-bit { display: flex; flex-direction: column; gap: 4px; }
    .time-bit label, .duration-bit label { font-size: 0.65rem; font-weight: 800; color: #94a3b8; text-transform: uppercase; }
    .time-bit span, .duration-bit span { font-size: 0.9rem; font-weight: 700; color: #334155; }

    .log-alerts { display: flex; gap: 8px; }
    .violation-tag { background: #fef2f2; color: #ef4444; padding: 4px 10px; border-radius: 8px; font-size: 0.75rem; font-weight: 800; border: 1px solid #fee2e2; }
    .violation-tag.warning { background: #fffbeb; color: #f59e0b; border-color: #fef3c7; }

    .empty-state { text-align: center; padding: 5rem 2rem; background: white; border-radius: 2rem; border: 1px solid #e2e8f0; }
    .empty-state h3 { font-size: 1.25rem; font-weight: 800; color: #1e293b; }
    .empty-state p { color: #64748b; margin: 0.5rem 0 2rem; }
    .action-btn { background: #3b82f6; color: white; border: none; padding: 0.75rem 2rem; border-radius: 12px; font-weight: 800; cursor: pointer; }

    .loader-wrap { text-align: center; padding: 5rem; color: #94a3b8; font-weight: 600; }
    .spinning { animation: rotate 1s linear infinite; margin-bottom: 1rem; }
    @keyframes rotate { to { transform: rotate(360deg); } }
    .animate-up { animation: animateUp 0.5s ease-out; }
    @keyframes animateUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
  `]
})
export class History implements OnInit, OnDestroy {
  logs: ParkingLog[] = [];
  loading = true;
  private sub = new Subscription();

  constructor(
    private parkingService: ParkingService,
    private auth: AuthService,
    private router: Router
  ) {}

  ngOnInit() {
    this.sub = this.auth.user$.subscribe(user => {
      if (user) {
        this.loadLogs(user.uid);
      } else {
        this.router.navigate(['/login']);
      }
    });
  }

  ngOnDestroy() {
    this.sub.unsubscribe();
  }

  loadLogs(uid: string) {
    this.parkingService.getParkingLogs(uid).subscribe(logs => {
      this.logs = logs;
      this.loading = false;
    });
  }

  formatDate(timestamp: any, part: 'day' | 'month') {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    if (part === 'day') return date.getDate();
    return date.toLocaleString('default', { month: 'short' });
  }

  formatTime(timestamp: any) {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  calculateDuration(entry: any, exit: any) {
    if (!entry || !exit) return '—';
    const start = entry.toDate ? entry.toDate() : new Date(entry);
    const end = exit.toDate ? exit.toDate() : new Date(exit);
    const diffMs = end.getTime() - start.getTime();
    const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMins = Math.floor((diffMs / (1000 * 60)) % 60);
    return `${diffHrs}h ${diffMins}m`;
  }

  goBack() {
    this.router.navigate(['/']);
  }
}
