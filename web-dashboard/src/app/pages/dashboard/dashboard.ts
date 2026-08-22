import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService, UserProfile } from '../../services/auth.service';
import { UserService } from '../../services/user.service';
import { ParkingService, ParkingLog } from '../../services/parking.service';
import { ApiService } from '../../services/api.service';
import { NotificationService, AppNotification } from '../../services/notification.service';
import { WalletService, BalanceHistoryEntry } from '../../services/wallet.service';
import { LucideAngularModule } from 'lucide-angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NotifBell } from '../../components/notif-bell/notif-bell';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [LucideAngularModule, CommonModule, FormsModule, NotifBell],
  template: `
    <div class="dashboard-shell animate-fade-in">
        <!-- Looping Background Video -->
        <video autoplay loop muted playsinline class="bg-video-overlay">
            <source src="/videos/cctv-surveillance.mp4" type="video/mp4">
        </video>
        
        <!-- CRT scanline overlay on background -->
        <div class="cctv-scanlines-fixed"></div>

        <div class="hud-time-overlay">
            SYS MONITOR // REC [CAM 01] // {{ cctvTime }}
        </div>

        <header class="web-header">
            <div class="header-content">
                <div class="brand-group">
                    <div class="brand-logo">
                        <lucide-icon name="shield" [size]="20"></lucide-icon>
                    </div>
                    <span class="brand">SmartPark APU</span>
                </div>
                <div class="header-actions">
                    <app-notif-bell></app-notif-bell>
                    <button class="logout-btn" (click)="logout()" title="Sign Out">
                        <lucide-icon name="log-out" [size]="18"></lucide-icon>
                        <span class="logout-text">Logout</span>
                    </button>
                </div>
            </div>
        </header>

        <main class="dashboard-main">
            <!-- Welcome Section -->
            <section class="welcome-section animate-up">
                <div class="welcome-row">
                    <div class="user-meta-column">
                        <div class="user-name-row">
                            <h2 class="welcome-title">Welcome, {{ profile?.name || 'User' }}</h2>
                            <div *ngIf="profile?.role === 'staff'" class="staff-indicator" title="Staff Account">
                                <lucide-icon name="briefcase" [size]="14"></lucide-icon>
                                <span>STAFF</span>
                            </div>
                            <div *ngIf="profile?.is_oku" class="oku-indicator" title="OKU User Account">
                                <lucide-icon name="accessibility" [size]="14"></lucide-icon>
                                <span>OKU</span>
                            </div>
                        </div>
                        <p class="user-subtext">
                            <span *ngIf="profile?.role === 'staff'">Staff ID: {{ profile?.staff_id }}</span>
                            <span *ngIf="profile?.role !== 'staff'">{{ profile?.student_id ? 'Student ID: ' + profile?.student_id : 'Loading profile...' }}</span>
                        </p>
                    </div>
                    <div *ngIf="profile?.car_plate" class="active-car-badge animate-up">
                        <div class="car-badge-icon">
                            <lucide-icon name="car" [size]="16"></lucide-icon>
                        </div>
                        <span class="car-plate-text">{{ profile?.car_plate }}</span>
                    </div>
                </div>
            </section>

            <!-- Occupancy Section -->
            <section class="occupancy-section animate-up">
                <div class="occupancy-card">
                    <div class="occupancy-header">
                        <span class="occupancy-title">Live APU Lot Occupancy</span>
                        <div class="occupancy-pill">
                            <span class="live-pulse"></span> LIVE
                        </div>
                    </div>
                    <div class="gauge-and-stats">
                        <div class="gauge-box">
                            <svg viewBox="0 0 100 60" class="gauge-svg">
                                <path d="M 10 50 A 40 40 0 0 1 90 50" fill="none" stroke="#e2e8f0" stroke-width="8" stroke-linecap="round"/>
                                <path d="M 10 50 A 40 40 0 0 1 90 50" fill="none" stroke="url(#gauge-gradient)" stroke-width="8" stroke-linecap="round"
                                      [attr.stroke-dasharray]="251.2"
                                      [attr.stroke-dashoffset]="251.2 - (251.2 * occupancyPercent / 100)"/>
                                <defs>
                                    <linearGradient id="gauge-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                        <stop offset="0%" stop-color="#3b82f6"/>
                                        <stop offset="100%" stop-color="#1d4ed8"/>
                                    </linearGradient>
                                </defs>
                            </svg>
                            <div class="gauge-center">
                                <span class="gauge-percent">{{ occupancyPercent }}%</span>
                                <span class="gauge-label">Occupied</span>
                            </div>
                        </div>
                        <div class="occupancy-details">
                            <div class="prediction-chip" style="cursor: pointer;" (click)="navigate('/analytics')">
                                <lucide-icon name="brain-circuit" [size]="16" class="chip-icon"></lucide-icon>
                                <span>AI Forecast: {{ predictionText }} ({{ accuracy }}% accuracy)</span>
                                <lucide-icon name="arrow-right" [size]="14" style="margin-left: 6px;"></lucide-icon>
                            </div>
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 8px; flex-wrap: wrap; gap: 8px;">
                                <p class="occupancy-desc" style="margin: 0;">Real-time computer vision tracking enabled.</p>
                                <button (click)="navigate('/analytics')" style="background: rgba(37, 99, 235, 0.1); border: 1px solid #bfdbfe; color: #1d4ed8; padding: 4px 10px; border-radius: 8px; font-size: 0.75rem; font-weight: 800; cursor: pointer; display: flex; align-items: center; gap: 4px;">
                                    <span>View Analytics</span>
                                    <lucide-icon name="chevron-right" [size]="14"></lucide-icon>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <!-- Wallet & Quick Actions Grid -->
            <section style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 1.5rem; margin-bottom: 2rem;" class="animate-up">
                
                <!-- Wallet & Balance Card -->
                <div class="glass-panel" style="background: linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 100%); border-radius: 20px; padding: 1.5rem; color: white; box-shadow: 0 12px 30px rgba(30, 58, 138, 0.25); position: relative; overflow: hidden;">
                    <div style="position: absolute; right: -20px; bottom: -20px; opacity: 0.08; font-size: 8rem; font-weight: 900; pointer-events: none;">
                        RM
                    </div>
                    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem;">
                        <span style="font-size: 0.8rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #93c5fd;">SmartPark Wallet</span>
                        <span *ngIf="userBalance < 5" style="background: #ef4444; color: white; font-size: 0.68rem; font-weight: 800; padding: 2px 8px; border-radius: 10px;">
                            LOW BALANCE
                        </span>
                    </div>

                    <div style="font-size: 2.2rem; font-weight: 900; margin-bottom: 0.5rem; letter-spacing: -0.02em;">
                        RM {{ userBalance | number:'1.2-2' }}
                    </div>
                    <p style="font-size: 0.8rem; color: #cbd5e1; margin-bottom: 1.25rem;">
                        Automated deduction on parking exit. (First 2h free, then RM 2/hour)
                    </p>

                    <!-- Top Up Quick Actions -->
                    <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                        <button (click)="quickTopUp(10)" class="wallet-chip-btn">+ RM 10</button>
                        <button (click)="quickTopUp(20)" class="wallet-chip-btn">+ RM 20</button>
                        <button (click)="quickTopUp(50)" class="wallet-chip-btn">+ RM 50</button>
                        <button (click)="showTopUpModal = true" class="wallet-chip-btn custom">Custom Top-up</button>
                    </div>
                </div>

                <!-- Simulation & Test Panel -->
                <div class="glass-panel" style="background: rgba(255, 255, 255, 0.72); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); border-radius: 20px; border: 1px solid rgba(255, 255, 255, 0.3); padding: 1.5rem; box-shadow: 0 8px 24px rgba(0, 0, 0, 0.05);">
                    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 1rem;">
                        <lucide-icon name="sparkles" [size]="18" style="color: #2563eb;"></lucide-icon>
                        <h3 style="margin: 0; font-size: 1rem; font-weight: 800; color: #0f172a;">Simulate Parking Notifications</h3>
                    </div>
                    <p style="font-size: 0.8rem; color: #64748b; margin-bottom: 1.25rem;">
                        Test real-time in-app toasts & notification logs for FYP demonstration:
                    </p>
                    <div style="display: flex; flex-direction: column; gap: 8px;">
                        <button (click)="simulateEntry()" class="sim-btn entry">
                            <lucide-icon name="car" [size]="14"></lucide-icon> Simulate Parking Entry
                        </button>
                        <button (click)="simulateExitDeduction()" class="sim-btn exit">
                            <lucide-icon name="log-out" [size]="14"></lucide-icon> Simulate Parking Exit (RM 4.00 Fee)
                        </button>
                    </div>
                </div>
            </section>

            <!-- Navigation Grid -->
            <section class="nav-cards-grid animate-up">
                <div class="nav-card" (click)="navigate('/spots')">
                    <div class="card-icon-wrapper">
                        <lucide-icon name="map" [size]="24"></lucide-icon>
                    </div>
                    <h3>Live Parking Spots</h3>
                    <p>View vacant, occupied, and OKU spots in real-time.</p>
                </div>

                <div class="nav-card" (click)="navigate('/analytics')">
                    <div class="card-icon-wrapper" style="background: #e0f2fe; color: #0284c7;">
                        <lucide-icon name="trending-up" [size]="24"></lucide-icon>
                    </div>
                    <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 2px;">
                        <h3 style="margin: 0;">AI Analytics</h3>
                        <span style="background: #0284c7; color: white; font-size: 0.65rem; font-weight: 800; padding: 2px 6px; border-radius: 6px;">AI PREDICT</span>
                    </div>
                    <p>Tomorrow's ML forecast & hourly traffic flow.</p>
                </div>

                <div class="nav-card" (click)="navigate('/find-my-car')">
                    <div class="card-icon-wrapper">
                        <lucide-icon name="navigation" [size]="24"></lucide-icon>
                    </div>
                    <h3>Find My Car</h3>
                    <p>Locate your vehicle on the floor plan map.</p>
                </div>

                <div class="nav-card" (click)="navigate('/my-vehicles')">
                    <div class="card-icon-wrapper">
                        <lucide-icon name="car" [size]="24"></lucide-icon>
                    </div>
                    <h3>My Vehicles</h3>
                    <p>Manage plate numbers & vehicle details.</p>
                </div>

                <div class="nav-card center-card" (click)="navigate('/notifications')">
                    <div class="card-icon-wrapper">
                        <lucide-icon name="bell" [size]="24"></lucide-icon>
                    </div>
                    <h3>Notifications</h3>
                    <p>Check entry, exit, violation & wallet alerts.</p>
                </div>
            </section>
        </main>

        <!-- Custom Top Up Modal -->
        <div *ngIf="showTopUpModal" class="modal-backdrop animate-fade-in">
            <div class="modal-content glass-panel animate-up">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem;">
                    <h3 style="margin: 0; font-size: 1.25rem; font-weight: 800; color: #0f172a;">Top Up Wallet</h3>
                    <button (click)="showTopUpModal = false" style="background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #64748b;">&times;</button>
                </div>

                <div class="input-group" style="margin-bottom: 1.25rem;">
                    <label style="display: block; font-size: 0.75rem; font-weight: 800; color: #64748b; margin-bottom: 6px; text-transform: uppercase;">Amount (RM)</label>
                    <input class="modern-input" type="number" [(ngModel)]="customTopUpAmount" placeholder="Enter amount (e.g. 50)" min="1" />
                </div>

                <div style="display: flex; gap: 8px; justify-content: flex-end;">
                    <button (click)="showTopUpModal = false" class="wallet-chip-btn" style="background: #e2e8f0; color: #475569;">Cancel</button>
                    <button (click)="submitCustomTopUp()" [disabled]="!customTopUpAmount || customTopUpAmount <= 0" class="wallet-chip-btn" style="background: #2563eb; color: white;">Confirm Top Up</button>
                </div>
            </div>
        </div>
    </div>
  `,
  styles: [`
    .dashboard-shell { 
        min-height: 100vh; 
        position: relative; 
        font-family: 'Plus Jakarta Sans', sans-serif; 
        background: #070a13;
        overflow-x: hidden; 
    }
    .bg-video-overlay {
        position: fixed;
        inset: 0;
        width: 100vw;
        height: 100vh;
        object-fit: cover;
        z-index: 1;
        filter: brightness(0.28) contrast(1.1) saturate(0.85);
        pointer-events: none;
    }
    .cctv-scanlines-fixed {
        position: fixed;
        inset: 0;
        width: 100vw;
        height: 100vh;
        z-index: 2;
        pointer-events: none;
        background: linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.03), rgba(0, 255, 0, 0.01), rgba(0, 0, 255, 0.03));
        background-size: 100% 4px, 6px 100%;
        opacity: 0.6;
    }
    .hud-time-overlay {
        position: fixed;
        bottom: 24px;
        right: 24px;
        font-family: monospace;
        font-size: 12px;
        font-weight: bold;
        color: rgba(16, 185, 129, 0.35);
        z-index: 2;
        pointer-events: none;
        letter-spacing: 0.05em;
        text-shadow: 0 0 2px rgba(0,0,0,0.5);
    }
    .web-header { 
        background: rgba(10, 15, 30, 0.7); 
        backdrop-filter: blur(16px); 
        -webkit-backdrop-filter: blur(16px); 
        border-bottom: 1px solid rgba(255,255,255,0.08); 
        padding: 1rem 2rem; 
        color: white; 
        position: sticky; 
        top: 0; 
        z-index: 100; 
    }
    .header-content { max-width: 1200px; margin: 0 auto; display: flex; align-items: center; justify-content: space-between; position: relative; z-index: 10; }
    .brand-group { display: flex; align-items: center; gap: 12px; }
    .brand-logo { background: rgba(255, 255, 255, 0.1); padding: 8px; border-radius: 10px; display: flex; border: 1px solid rgba(255,255,255,0.15); }
    .brand { font-size: 1.25rem; font-weight: 800; letter-spacing: 0.02em; }
    .header-actions { display: flex; align-items: center; gap: 12px; }
    .logout-btn { background: rgba(255, 255, 255, 0.08); border: 1px solid rgba(255,255,255,0.15); color: #cbd5e1; padding: 8px 14px; border-radius: 10px; display: flex; align-items: center; gap: 6px; cursor: pointer; font-weight: 700; transition: 0.2s; }
    .logout-btn:hover { background: rgba(239, 68, 68, 0.2); color: #ef4444; border-color: #ef4444; }

    .dashboard-main { max-width: 1200px; margin: 0 auto; padding: 2rem; position: relative; z-index: 10; }
    
    .welcome-section { margin-bottom: 2rem; }
    .welcome-row { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem; }
    .welcome-title { font-size: 1.75rem; font-weight: 800; color: #ffffff; margin: 0; text-shadow: 0 2px 8px rgba(0,0,0,0.5); }
    .user-name-row { display: flex; align-items: center; gap: 12px; }
    .staff-indicator { background: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe; font-size: 0.75rem; font-weight: 800; padding: 4px 10px; border-radius: 20px; display: flex; align-items: center; gap: 4px; }
    .oku-indicator { background: #eff6ff; color: #2563eb; border: 1px solid #dbeafe; font-size: 0.75rem; font-weight: 800; padding: 4px 10px; border-radius: 20px; display: flex; align-items: center; gap: 4px; }
    .user-subtext { color: #94a3b8; font-size: 0.95rem; margin: 4px 0 0; font-weight: 600; text-shadow: 0 1px 4px rgba(0,0,0,0.5); }
    .active-car-badge { background: rgba(255, 255, 255, 0.95); border: 1px solid #bfdbfe; padding: 8px 16px; border-radius: 50px; display: flex; align-items: center; gap: 8px; box-shadow: 0 4px 12px rgba(30, 58, 138, 0.15); }
    .car-badge-icon { color: #2563eb; display: flex; }
    .car-plate-text { font-weight: 800; color: #1e3a8a; font-size: 0.95rem; letter-spacing: 0.05em; }

    .occupancy-card { 
        background: rgba(255, 255, 255, 0.88); 
        backdrop-filter: blur(20px); 
        -webkit-backdrop-filter: blur(20px); 
        border-radius: 24px; 
        padding: 1.75rem 2rem; 
        border: 1px solid rgba(255, 255, 255, 0.25); 
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.15); 
        margin-bottom: 1.5rem; 
    }
    .occupancy-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.25rem; }
    .occupancy-title { font-size: 1.1rem; font-weight: 800; color: #0f172a; }
    .occupancy-pill { background: #dcfce7; color: #15803d; border: 1px solid #86efac; font-size: 0.75rem; font-weight: 800; padding: 4px 10px; border-radius: 20px; display: flex; align-items: center; gap: 6px; }
    .live-pulse { width: 8px; height: 8px; background: #22c55e; border-radius: 50%; animation: pulse 1.5s infinite; }

    .gauge-and-stats { display: flex; align-items: center; gap: 2.5rem; flex-wrap: wrap; }
    .gauge-box { position: relative; width: 140px; height: 90px; }
    .gauge-svg { width: 100%; height: 100%; }
    .gauge-center { position: absolute; bottom: 0; left: 50%; transform: translateX(-50%); text-align: center; }
    .gauge-percent { font-size: 1.5rem; font-weight: 900; color: #0f172a; display: block; line-height: 1; }
    .gauge-label { font-size: 0.72rem; color: #64748b; font-weight: 700; text-transform: uppercase; }

    .prediction-chip { display: flex; align-items: center; gap: 8px; background: #f0f5ff; border: 1px solid #c7d2fe; color: #3730a3; padding: 8px 14px; border-radius: 12px; font-weight: 700; font-size: 0.85rem; margin-bottom: 8px; }
    .occupancy-desc { color: #475569; font-size: 0.85rem; margin: 0; font-weight: 600; }

    .wallet-chip-btn { background: rgba(255, 255, 255, 0.2); border: 1px solid rgba(255, 255, 255, 0.4); color: white; padding: 8px 14px; border-radius: 10px; font-weight: 800; font-size: 0.82rem; cursor: pointer; transition: 0.2s; }
    .wallet-chip-btn:hover { background: white; color: #1d4ed8; }
    .wallet-chip-btn.custom { background: rgba(255, 255, 255, 0.9); color: #1e3a8a; border: none; }

    .sim-btn { width: 100%; padding: 10px; border-radius: 10px; font-weight: 700; font-size: 0.82rem; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; transition: 0.2s; }
    .sim-btn.entry { background: #eff6ff; border: 1px solid #bfdbfe; color: #2563eb; }
    .sim-btn.entry:hover { background: #dbeafe; }
    .sim-btn.exit { background: #fff7ed; border: 1px solid #ffedd5; color: #ea580c; }
    .sim-btn.exit:hover { background: #ffedd5; }

    .nav-cards-grid { 
        display: grid; 
        grid-template-columns: repeat(2, 1fr); 
        gap: 1.25rem; 
    }
    .nav-card { 
        background: rgba(255, 255, 255, 0.88); 
        backdrop-filter: blur(20px); 
        -webkit-backdrop-filter: blur(20px); 
        border-radius: 18px; 
        padding: 1.5rem; 
        border: 1px solid rgba(255, 255, 255, 0.25); 
        box-shadow: 0 6px 18px rgba(0, 0, 0, 0.05); 
        cursor: pointer; 
        transition: 0.2s; 
        text-align: center; 
    }
    .nav-card:hover { transform: translateY(-4px); box-shadow: 0 12px 30px rgba(0, 0, 0, 0.15); border-color: #2563eb; }
    .nav-card.center-card {
        grid-column: 1 / -1;
        justify-self: center;
        width: 100%;
        max-width: 480px;
    }

    @media (min-width: 1024px) {
        .nav-cards-grid { 
            grid-template-columns: repeat(4, 1fr); 
        }
        .nav-card.center-card {
            grid-column: 2 / span 2;
            width: 100%;
            max-width: none;
        }
    }

    .card-icon-wrapper { width: 52px; height: 52px; background: #eff6ff; color: #2563eb; border-radius: 14px; display: flex; align-items: center; justify-content: center; margin: 0 auto 1rem; border: 1px solid #bfdbfe; }
    .nav-card h3 { font-size: 1.05rem; font-weight: 800; color: #0f172a; margin: 0 0 6px; }
    .nav-card p { font-size: 0.82rem; color: #475569; margin: 0; line-height: 1.4; font-weight: 600; }

    .modal-backdrop { position: fixed; inset: 0; background: rgba(15, 23, 42, 0.5); backdrop-filter: blur(4px); z-index: 1100; display: flex; align-items: center; justify-content: center; padding: 1rem; }
    .modal-content { width: 100%; max-width: 400px; background: white; border-radius: 20px; padding: 1.75rem; border: 1px solid #dbeafe; }
    .modern-input { width: 100%; background: #f8fafc; border: 1px solid #cbd5e1; padding: 10px 14px; border-radius: 10px; font-size: 1rem; font-weight: 700; color: #0f172a; box-sizing: border-box; }

    @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
    @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
  `]
})
export class Dashboard implements OnInit, OnDestroy {
  profile: UserProfile | null = null;
  occupancyPercent = 64;
  predictionText = 'Peak occupancy in 2 hours';
  accuracy = 94.2;
  currentUid = '';
  userBalance = 20.00;
  showTopUpModal = false;
  customTopUpAmount: number | null = null;
  cctvTime = '';

  private subs = new Subscription();
  private timerInterval: any;

  constructor(
    private auth: AuthService,
    private userService: UserService,
    private parkingService: ParkingService,
    private walletService: WalletService,
    private notifService: NotificationService,
    private api: ApiService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.subs.add(
      this.auth.user$.subscribe(user => {
        if (user) {
          this.currentUid = user.uid;
          this.loadProfile(user.uid);
          this.loadBalance(user.uid);
        } else {
          this.router.navigate(['/login']);
        }
      })
    );
    this.loadOccupancy();
    this.updateCctvTime();
    this.timerInterval = setInterval(() => this.updateCctvTime(), 1000);
  }

  ngOnDestroy() {
    this.subs.unsubscribe();
    if (this.timerInterval) clearInterval(this.timerInterval);
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
    this.cdr.detectChanges();
  }

  loadProfile(uid: string) {
    this.subs.add(
      this.userService.getUserProfile(uid).subscribe(profile => {
        if (profile) {
          this.profile = profile;
          this.cdr.detectChanges();
        }
      })
    );
  }

  loadBalance(uid: string) {
    this.subs.add(
      this.walletService.getUserBalance(uid).subscribe(balance => {
        this.userBalance = balance;
        this.cdr.detectChanges();
      })
    );
  }

  async quickTopUp(amount: number) {
    if (!this.currentUid) return;
    const plate = this.profile?.car_plate || '';
    const newBal = await this.walletService.topUpBalance(this.currentUid, amount, plate);
    this.userBalance = newBal;
    this.showTopUpModal = false;
    this.customTopUpAmount = null;
    this.cdr.detectChanges();
  }

  async submitCustomTopUp() {
    if (!this.customTopUpAmount || this.customTopUpAmount <= 0) return;
    await this.quickTopUp(this.customTopUpAmount);
  }

  async simulateEntry() {
    if (!this.currentUid) return;
    const plate = this.profile?.car_plate || 'WXX 8888';
    await this.notifService.triggerEntryNotification(this.currentUid, plate, 'Spot B-04');
  }

  async simulateExitDeduction() {
    if (!this.currentUid) return;
    const plate = this.profile?.car_plate || 'WXX 8888';
    const fee = 3.00;
    await this.notifService.triggerExitNotification(this.currentUid, plate);
    const res = await this.walletService.deductBalance(this.currentUid, fee, 'sim_exit_log', plate);
    this.userBalance = res.newBalance;
    this.cdr.detectChanges();
  }

  loadOccupancy() {
    this.api.getOccupancyPrediction().subscribe({
      next: (res) => {
        this.occupancyPercent = res.occupancy || 64;
        this.predictionText = res.prediction || 'Peak occupancy in 2 hours';
        this.accuracy = res.accuracy || 94.2;
      },
      error: () => {
        this.occupancyPercent = 64;
      }
    });
  }

  logout() {
    this.auth.logout();
    this.router.navigate(['/login']);
  }

  navigate(path: string) {
    this.router.navigate([path]);
  }
}
