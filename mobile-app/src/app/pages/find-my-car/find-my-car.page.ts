import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, ToastController } from '@ionic/angular';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
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
  selector: 'app-find-my-car',
  templateUrl: './find-my-car.page.html',
  styleUrls: ['./find-my-car.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule]
})
export class FindMyCarPage implements OnInit, OnDestroy {
  carData: FoundCarData | null = null;
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
    private sanitizer: DomSanitizer,
    private toastCtrl: ToastController
  ) { }

  ngOnInit() {
    this.sub = this.auth.user$.subscribe(user => {
      if (user) {
        this.currentUserId = user.uid;
        this.fetchProfileAndFindCar(user.uid, user.email || '');
      } else {
        setTimeout(() => {
          this.auth.isLoggedIn().subscribe(isLogged => {
            if (!isLogged) this.router.navigate(['/login']);
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
      this.sanitizedImageUrl = null;
      return;
    }

    const candidateUrl = 
      this.carData['image_url'] || 
      this.carData['image url'] || 
      this.carData['imageUrl'] || 
      this.carData['plate_image_url'] || 
      this.carData['plate_cloudinary_public_id'];

    if (!candidateUrl || typeof candidateUrl !== 'string') {
      this.sanitizedImageUrl = null;
      return;
    }

    let finalUrl = candidateUrl.trim();
    if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
      finalUrl = `https://res.cloudinary.com/lftlvmu7/image/upload/${finalUrl}`;
    }

    this.sanitizedImageUrl = this.sanitizer.bypassSecurityTrustUrl(finalUrl);
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
        const toast = await this.toastCtrl.create({
          message: 'Failed to update status. Please try again.',
          duration: 3000,
          color: 'danger'
        });
        await toast.present();
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
    console.warn('[FindMyCar] Image load warning for URL:', event.target?.src);
  }
}
