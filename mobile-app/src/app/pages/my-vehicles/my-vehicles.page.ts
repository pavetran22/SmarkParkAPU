import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, ToastController } from '@ionic/angular';
import { UserService } from '../../services/user.service';
import { AuthService, UserProfile } from '../../services/auth.service';
import { Subscription } from 'rxjs';
import { Router } from '@angular/router';

@Component({
  selector: 'app-my-vehicles',
  templateUrl: './my-vehicles.page.html',
  styleUrls: ['./my-vehicles.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule]
})
export class MyVehiclesPage implements OnInit, OnDestroy {
  profile: UserProfile | null = null;
  currentUid: string = '';
  isEditing = false;
  isNewUser = false;
  loading = false;
  loadingProfile = true;
  editData: any = {
    name: '',
    student_id: '',
    car_plate: '',
    car_model: '',
    car_colour: '',
    is_oku: false
  };
  
  private sub = new Subscription();

  constructor(
    private userService: UserService,
    private auth: AuthService,
    private router: Router,
    private toastCtrl: ToastController,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit() {
    this.sub = this.auth.user$.subscribe(user => {
      if (user) {
        this.currentUid = user.uid;
        this.loadProfile(user.uid);
      } else {
        this.router.navigate(['/login']);
      }
    });
  }

  ngOnDestroy() {
    this.sub.unsubscribe();
  }

  loadProfile(uid: string) {
    this.loadingProfile = true;
    
    const timeout = setTimeout(() => {
        if (this.loadingProfile) {
            this.loadingProfile = false;
        }
    }, 2000);

    this.userService.getUserProfile(uid).subscribe({
      next: (p) => {
        clearTimeout(timeout);
        this.profile = p;
        this.loadingProfile = false;

        if (p) {
            this.profile = p;
            this.loadingProfile = false;
    
            if (!p.car_plate || p.car_plate.trim() === '') {
                this.isNewUser = true;
                this.isEditing = false;
            } else {
                this.isNewUser = false;
                this.isEditing = false;
                this.editData = { ...p };
            }
        }
      },
      error: () => {
        clearTimeout(timeout);
        this.loadingProfile = false;
        this.isNewUser = true;
      }
    });
  }

  toggleEdit() {
    this.isEditing = !this.isEditing;
    if (this.isEditing) {
      this.editData = { ...this.profile };
    }
  }

  async saveChanges() {

    if (!this.editData.car_plate || !this.editData.car_model) {
      const toast = await this.toastCtrl.create({ message: 'Plate and Model are required', duration: 2000, color: 'danger' });
      toast.present();
      return;
    }

    try {
      this.loading = true;
      const user = await new Promise(resolve => {
        const s = this.auth.user$.subscribe(u => { s.unsubscribe(); resolve(u); });
      }) as any;

      if (user) {
        const normalizedPlate = this.editData.car_plate.replace(/\s+/g, '').toUpperCase();
        const carData = {
          car_plate: normalizedPlate,
          car_model: this.editData.car_model,
          car_colour: this.editData.car_colour,
          is_oku: this.editData.is_oku ?? false
        };
        
        await this.userService.updateUserProfile(user.uid, carData);
        
        // Re-fetch from DB to get confirmed fresh copy
        this.loadProfile(user.uid);
        
        this.isEditing = false;
        this.isNewUser = false;

        const toast = await this.toastCtrl.create({ 
          message: 'Vehicle Registered Successfully!', 
          duration: 3000, 
          color: 'success',
          position: 'bottom'
        });
        toast.present();
      }
    } catch (e: any) {
      const toast = await this.toastCtrl.create({ message: e.message || 'Plate has been registered under another user', duration: 4000, color: 'danger' });
      toast.present();
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  async removeVehicle() {
    const confirm = await this.toastCtrl.create({
      message: 'Unregister this vehicle?',
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        { 
          text: 'Unregister', 
          handler: async () => {
            if (this.profile?.uid) {
                const resetData = { car_plate: '', car_model: '', car_colour: '' };
                await this.userService.updateUserProfile(this.profile.uid, resetData);
                this.profile = { ...this.profile, ...resetData };
                this.isNewUser = true;
                const t = await this.toastCtrl.create({ message: 'Vehicle removed', duration: 2000 });
                t.present();
            }
          }
        }
      ]
    });
    confirm.present();
  }
}
