import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { LucideAngularModule } from 'lucide-angular';
import { AuthService } from '../../services/auth.service';
import { UserService } from '../../services/user.service';
import { ParkingService } from '../../services/parking.service';
import { WalletService } from '../../services/wallet.service';
import { NotificationService } from '../../services/notification.service';
import { Subscription } from 'rxjs';
import { Router } from '@angular/router';

export interface FoundCarData {
  name?: string;
  email?: string;
  student_id?: string;
  car_model?: string;
  car_colour?: string;
  car_plate?: string;
  is_oku?: boolean;
  parking_row?: string;
  parking_slot?: string;
  parking_zone?: string;
  parking_level?: string;
  image_url?: string;
  plate_image_url?: string;
  plate_cloudinary_public_id?: string;
  status?: string;
  entry_time?: string | null;
  exit_time?: string | null;
  [key: string]: any;
}

@Component({
  selector: 'app-find-car',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  template: `
    <div class="page-shell animate-fade-in">
        <header class="app-header">
            <div class="header-wrap">
                <button (click)="goBack()" class="back-btn">
                    <lucide-icon name="arrow-left" [size]="20"></lucide-icon>
                </button>
                <h1>Find My Car</h1>
                <div style="width: 36px;"></div>
            </div>
        </header>

        <div class="page-content">
            <!-- Loading State -->
            <div *ngIf="loading" class="loader-wrap">
                <lucide-icon name="refresh-cw" class="spinning" [size]="36"></lucide-icon>
                <p>Searching APU Firestore records for <strong>{{ userPlate || 'registered vehicle' }}</strong>...</p>
            </div>

            <!-- Case 1: Document exists & exit_time is null (Car is currently parked) -->
            <div *ngIf="!loading && searchState === 'parked' && carData" class="result-container animate-up">
                <div class="status-card">
                    <div class="card-header">
                        <div class="status-badge parked">
                            <span class="live-dot"></span> Currently Parked
                        </div>
                        <span class="plate-text">{{ carData.car_plate || userPlate }}</span>
                    </div>

                    <!-- Car Snapshot Image from image_url field -->
                    <div class="snapshot-container" *ngIf="carImageUrl">
                        <div class="snapshot-header">
                            <lucide-icon name="camera" [size]="16"></lucide-icon>
                            <span>Live Camera Snapshot</span>
                        </div>
                        <img [src]="carImageUrl" alt="Live Car Snapshot" class="car-snapshot-img" referrerpolicy="no-referrer" (error)="onImageError($event)" />
                    </div>
                    
                    <div class="location-box">
                        <div class="spot-circle">
                            <span class="spot-id">{{ getSpotLabel() }}</span>
                        </div>
                        <div class="location-details">
                            <h3>{{ carData.parking_row || 'Row Location Detected' }}</h3>
                            <p>{{ carData.parking_zone || 'APU Main Lot' }} • {{ carData.parking_slot ? 'Slot ' + carData.parking_slot : 'Active Zone' }}</p>
                        </div>
                    </div>

                    <div class="info-row">
                        <div class="info-bit">
                            <label>Vehicle Details</label>
                            <p>{{ carData.car_colour || '' }} {{ carData.car_model || 'Vehicle' }}</p>
                        </div>
                        <div class="info-bit">
                            <label>Entry Timestamp</label>
                            <p>{{ formatTime(carData.entry_time) }}</p>
                        </div>
                    </div>

                    <div *ngIf="carData.is_oku" class="oku-banner">
                        <lucide-icon name="accessibility" [size]="18"></lucide-icon>
                        <span>Parked in Designated OKU Accessibility Spot</span>
                    </div>

                    <!-- "I am out of the premises" Button - Only visible when parked -->
                    <button class="out-premises-btn" (click)="markOutOfPremises()" [disabled]="updatingStatus">
                        <lucide-icon *ngIf="!updatingStatus" name="log-out" [size]="18"></lucide-icon>
                        <lucide-icon *ngIf="updatingStatus" name="refresh-cw" class="spinning" [size]="18"></lucide-icon>
                        <span>{{ updatingStatus ? 'Updating Status & Processing Exit...' : 'I am out of the premises' }}</span>
                    </button>
                </div>
            </div>

            <!-- Case 2: Document exists but exit_time is NOT null -->
            <div *ngIf="!loading && searchState === 'exited'" class="empty-state notice animate-up">
                <div class="icon-box warning">
                    <lucide-icon name="log-out" [size]="48"></lucide-icon>
                </div>
                <h3>Vehicle Exited</h3>
                <p class="notice-msg">Your car is not currently parked in the APU parking lot</p>
                <div *ngIf="userPlate || (carData && carData.car_plate)" class="registered-plate-tag">Registered Plate: {{ userPlate || carData?.car_plate }}</div>
                <button class="action-btn" (click)="goBack()">Return to Dashboard</button>
            </div>

            <!-- Case 3: Document does NOT exist -->
            <div *ngIf="!loading && searchState === 'not_found'" class="empty-state animate-up">
                <div class="icon-box info">
                    <lucide-icon name="info" [size]="48"></lucide-icon>
                </div>
                <h3>No Parking Record</h3>
                <p class="notice-msg">No parking record found for your vehicle</p>
                <div *ngIf="userPlate" class="registered-plate-tag">Registered Plate: {{ userPlate }}</div>
                <p class="sub-text">Please ensure your vehicle plate is correctly registered under your APU profile.</p>
                <button class="action-btn" (click)="goBack()">Return to Dashboard</button>
            </div>
        </div>
    </div>
  `,
  styles: [`
    .page-shell { min-height: 100vh; background: #f8fafc; font-family: 'Plus Jakarta Sans', sans-serif; }
    .app-header { background: white; color: #1e293b; padding: 1rem 2rem; border-bottom: 1px solid #e2e8f0; position: sticky; top: 0; z-index: 100; }
    .header-wrap { max-width: 800px; margin: 0 auto; display: flex; justify-content: space-between; align-items: center; }
    .header-wrap h1 { margin: 0; font-size: 1.1rem; font-weight: 800; }
    .back-btn { background: #f1f5f9; border: none; width: 36px; height: 36px; border-radius: 10px; display: flex; align-items: center; justify-content: center; cursor: pointer; color: #64748b; transition: 0.2s; }
    .back-btn:hover { background: #e2e8f0; color: #0f172a; }

    .page-content { max-width: 800px; margin: 0 auto; padding: 2rem; }

    .status-card { background: white; border-radius: 1.5rem; padding: 2rem; box-shadow: 0 10px 25px -5px rgba(30, 58, 138, 0.08); border: 1px solid #e2e8f0; margin-bottom: 1.5rem; }
    .card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; }
    .status-badge { padding: 6px 14px; border-radius: 20px; font-size: 0.75rem; font-weight: 800; text-transform: uppercase; display: flex; align-items: center; gap: 6px; }
    .status-badge.parked { background: #dcfce7; color: #15803d; border: 1px solid #86efac; }
    .live-dot { width: 8px; height: 8px; background: #22c55e; border-radius: 50%; display: inline-block; }
    .plate-text { font-size: 1.6rem; font-weight: 900; color: #0f172a; letter-spacing: -0.02em; }

    .snapshot-container { background: #0f172a; border-radius: 1.25rem; overflow: hidden; margin-bottom: 1.5rem; border: 1px solid #334155; }
    .snapshot-header { background: #1e293b; color: #94a3b8; padding: 8px 16px; font-size: 0.75rem; font-weight: 800; display: flex; align-items: center; gap: 6px; text-transform: uppercase; }
    .car-snapshot-img { width: 100%; max-height: 380px; object-fit: contain; background: #020617; display: block; border-radius: 0 0 1.25rem 1.25rem; }

    .location-box { background: #eff6ff; border-radius: 1.25rem; padding: 1.5rem; display: flex; align-items: center; gap: 1.5rem; margin-bottom: 1.5rem; border: 1px solid #bfdbfe; }
    .spot-circle { min-width: 68px; height: 68px; background: #2563eb; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; box-shadow: 0 8px 20px rgba(37, 99, 235, 0.3); }
    .spot-id { font-size: 1.2rem; font-weight: 900; text-align: center; line-height: 1.1; }
    .location-details h3 { margin: 0; font-size: 1.15rem; font-weight: 800; color: #1e293b; }
    .location-details p { margin: 4px 0 0; color: #64748b; font-weight: 600; font-size: 0.88rem; }

    .info-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem; }
    .info-bit label { display: block; font-size: 0.72rem; font-weight: 800; color: #64748b; text-transform: uppercase; margin-bottom: 4px; letter-spacing: 0.05em; }
    .info-bit p { margin: 0; font-size: 1.05rem; font-weight: 800; color: #0f172a; }

    .oku-banner { background: #eff6ff; color: #2563eb; border: 1px solid #bfdbfe; padding: 10px 16px; border-radius: 12px; font-weight: 800; font-size: 0.85rem; display: flex; align-items: center; gap: 8px; margin-top: 1rem; }

    .out-premises-btn { width: 100%; margin-top: 1.5rem; background: linear-gradient(135deg, #ef4444, #dc2626); color: white; border: none; padding: 14px 20px; border-radius: 14px; font-weight: 800; font-size: 0.95rem; display: flex; align-items: center; justify-content: center; gap: 10px; cursor: pointer; box-shadow: 0 4px 14px rgba(239, 68, 68, 0.35); transition: all 0.2s ease; }
    .out-premises-btn:hover { background: linear-gradient(135deg, #dc2626, #b91c1c); transform: translateY(-1px); box-shadow: 0 6px 18px rgba(239, 68, 68, 0.45); }
    .out-premises-btn:disabled { opacity: 0.7; cursor: not-allowed; transform: none; }

    .empty-state { text-align: center; padding: 3.5rem 2rem; background: white; border-radius: 2rem; border: 1px solid #e2e8f0; box-shadow: 0 10px 25px -5px rgba(30, 58, 138, 0.05); }
    .icon-box { margin-bottom: 1.25rem; }
    .icon-box.warning { color: #f59e0b; }
    .icon-box.info { color: #3b82f6; }
    .empty-state h3 { font-size: 1.35rem; font-weight: 800; color: #0f172a; margin: 0 0 0.5rem; }
    .notice-msg { font-size: 1.05rem; font-weight: 700; color: #334155; margin-bottom: 1rem; }
    .registered-plate-tag { display: inline-block; background: #f1f5f9; color: #475569; font-weight: 800; font-size: 0.85rem; padding: 4px 12px; border-radius: 20px; margin-bottom: 1.5rem; border: 1px solid #cbd5e1; }
    .sub-text { color: #64748b; font-size: 0.85rem; margin-bottom: 1.5rem; }
    .action-btn { background: #2563eb; color: white; border: none; padding: 12px 24px; border-radius: 12px; font-weight: 800; cursor: pointer; transition: 0.2s; }
    .action-btn:hover { background: #1d4ed8; }

    .loader-wrap { text-align: center; padding: 4rem; color: #64748b; font-weight: 700; }
    .spinning { animation: rotate 1s linear infinite; margin-bottom: 1rem; color: #2563eb; }
    @keyframes rotate { to { transform: rotate(360deg); } }
    .animate-up { animation: animateUp 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
    @keyframes animateUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
  `]
})
export class FindCar implements OnInit, OnDestroy {
  carData: FoundCarData | null = null;
  carImageUrl: string | null = null;
  sanitizedImageUrl: SafeUrl | null = null;
  userPlate: string = '';
  currentUserId: string = '';
  loading = true;
  updatingStatus = false;
  searchState: 'loading' | 'parked' | 'exited' | 'not_found' = 'loading';
  private sub = new Subscription();

  constructor(
    private auth: AuthService,
    private userService: UserService,
    private parkingService: ParkingService,
    private walletService: WalletService,
    private notifService: NotificationService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit() {
    this.sub = this.auth.user$.subscribe(user => {
      if (user) {
        this.currentUserId = user.uid;
        this.fetchProfileAndFindCar(user.uid, user.email || '');
      } else {
        setTimeout(() => {
          this.auth.user$.subscribe(u => {
            if (!u) this.router.navigate(['/login']);
          });
        }, 800);
      }
    });
  }

  ngOnDestroy() {
    this.sub.unsubscribe();
  }

  fetchProfileAndFindCar(uid: string, email: string) {
    this.loading = true;
    this.cdr.detectChanges();

    this.userService.getUserProfile(uid, email).subscribe(profile => {
      const plate = profile?.car_plate;
      if (plate) {
        this.userPlate = plate;
        this.lookupCarDirect(plate, email, uid);
      } else {
        this.lookupCarByEmailOrUid(email, uid);
      }
    });
  }

  lookupCarDirect(rawPlate: string, email: string, uid: string) {
    const cleanedPlate = rawPlate.replace(/\s+/g, '').toUpperCase();
    this.parkingService.findCarByPlateDirect(cleanedPlate).subscribe({
      next: (res) => {
        if (res && res.exists && res.carData) {
          this.loading = false;
          const car = res.carData;
          this.carData = car;
          this.updateSanitizedImageUrl();
          if (!car.exit_time) {
            this.searchState = 'parked';
          } else {
            this.searchState = 'exited';
          }
          this.cdr.detectChanges();
        } else {
          this.lookupCarByEmailOrUid(email, uid);
        }
      },
      error: () => {
        this.lookupCarByEmailOrUid(email, uid);
      }
    });
  }

  lookupCarByEmailOrUid(email: string, uid: string) {
    if (!email && !uid) {
      this.loading = false;
      this.searchState = 'not_found';
      this.cdr.detectChanges();
      return;
    }
    const searchTarget = email || uid;
    this.parkingService.findMyCar(searchTarget).subscribe({
      next: (logs) => {
        this.loading = false;
        if (logs && logs.length > 0) {
          const car = logs[0];
          this.carData = car;
          this.userPlate = car.car_plate || this.userPlate;
          this.updateSanitizedImageUrl();
          if (!car.exit_time) {
            this.searchState = 'parked';
          } else {
            this.searchState = 'exited';
          }
        } else {
          this.searchState = 'not_found';
        }
        this.cdr.detectChanges();
      },
      error: () => {
        this.loading = false;
        this.searchState = 'not_found';
        this.cdr.detectChanges();
      }
    });
  }

  updateSanitizedImageUrl() {
    if (!this.carData) {
      this.carImageUrl = null;
      this.sanitizedImageUrl = null;
      return;
    }

    // Log all fields from find_my_car document for debugging
    console.log('[FindCar Web] carData keys:', Object.keys(this.carData));
    console.log('[FindCar Web] image_url:', this.carData['image_url']);
    console.log('[FindCar Web] plate_image_url:', this.carData['plate_image_url']);
    console.log('[FindCar Web] plate_cloudinary_public_id:', this.carData['plate_cloudinary_public_id']);

    // Priority: image_url > plate_image_url > construct from plate_cloudinary_public_id
    let finalUrl: string | null = null;

    // 1. Check image_url
    if (this.carData['image_url'] && typeof this.carData['image_url'] === 'string' && this.carData['image_url'].startsWith('http')) {
      finalUrl = this.carData['image_url'].trim();
    }
    // 2. Check plate_image_url
    if (!finalUrl && this.carData['plate_image_url'] && typeof this.carData['plate_image_url'] === 'string' && this.carData['plate_image_url'].startsWith('http')) {
      finalUrl = this.carData['plate_image_url'].trim();
    }
    // 3. Construct from plate_cloudinary_public_id
    if (!finalUrl && this.carData['plate_cloudinary_public_id'] && typeof this.carData['plate_cloudinary_public_id'] === 'string') {
      finalUrl = `https://res.cloudinary.com/lftlvmu7/image/upload/${this.carData['plate_cloudinary_public_id'].trim()}`;
    }

    console.log('[FindCar Web] Final resolved URL:', finalUrl);

    if (finalUrl) {
      this.carImageUrl = finalUrl;
      this.sanitizedImageUrl = this.sanitizer.bypassSecurityTrustResourceUrl(finalUrl);
    } else {
      this.carImageUrl = null;
      this.sanitizedImageUrl = null;
    }
  }

  async markOutOfPremises() {
    const plate = this.carData?.car_plate || this.userPlate;
    if (!plate) return;

    this.updatingStatus = true;
    this.cdr.detectChanges();

    // 1. Update Firestore document (exit_time & status: "out of premises")
    this.parkingService.markCarAsOut(plate).subscribe(async success => {
      if (success) {
        if (this.carData) {
          this.carData.exit_time = new Date().toISOString();
          this.carData.status = 'out of premises';
        }

        // 2. Trigger Exit Notification
        if (this.currentUserId) {
          await this.notifService.triggerExitNotification(this.currentUserId, plate);
          // 3. Deduct RM 3.00 from Wallet & Trigger Fee Deduction Notification + Toast
          await this.walletService.deductBalance(this.currentUserId, 3.00, 'exit_fee', plate);
        }

        this.updatingStatus = false;
        this.searchState = 'exited';
      } else {
        this.updatingStatus = false;
        console.error('Failed to update status. Please try again.');
      }
      this.cdr.detectChanges();
    });
  }

  getSpotLabel(): string {
    if (!this.carData) return 'SPOT';
    if (this.carData.parking_slot) return this.carData.parking_slot;
    if (this.carData.parking_row) return this.carData.parking_row;
    return 'B-04';
  }

  formatTime(timestamp: any) {
    if (!timestamp) return 'N/A';
    const date = new Date(timestamp);
    return isNaN(date.getTime()) ? timestamp : (date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
  }

  onImageError(event: any) {
    console.warn('[FindCar] Image load warning for URL:', event.target?.src);
  }

  goBack() {
    this.router.navigate(['/']);
  }
}
