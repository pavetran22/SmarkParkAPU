import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { UserService } from '../../services/user.service';
import { AuthService, UserProfile } from '../../services/auth.service';
import { Subscription } from 'rxjs';
import { Router } from '@angular/router';

@Component({
  selector: 'app-view-plates',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  template: `
    <div class="page-shell animate-fade-in">
        <header class="app-header">
            <div class="header-wrap">
                <div style="display: flex; align-items: center; gap: 12px;">
                    <button (click)="goBack()" class="back-btn">
                        <lucide-icon name="arrow-left" [size]="20"></lucide-icon>
                    </button>
                    <h1>My Vehicle Details</h1>
                </div>
                <div *ngIf="profile?.car_plate && !isEditing" style="display: flex; gap: 8px;">
                    <button (click)="removeVehicle()" class="delete-btn">
                        <lucide-icon name="trash-2" [size]="20"></lucide-icon>
                        <span>Unregister</span>
                    </button>
                    <button (click)="toggleEdit()" class="edit-btn">
                        <lucide-icon [name]="isEditing ? 'x' : 'edit'" [size]="20"></lucide-icon>
                        <span>Edit</span>
                    </button>
                </div>
            </div>
        </header>

        <div class="page-content">
            <div *ngIf="loadingProfile" class="loader-wrap">
                <lucide-icon name="refresh-cw" class="spinning" [size]="32"></lucide-icon>
                <p style="margin-top: 1rem; color: #64748b;">Connecting to system...</p>
                <button (click)="loadingProfile = false; isNewUser = true" style="margin-top: 1rem; background: none; border: 1px solid #cbd5e1; padding: 8px 16px; border-radius: 8px; cursor: pointer; color: #64748b; font-weight: 600;">
                    Having trouble? Click to bypass
                </button>
            </div>

            <!-- No Profile / No Car Mode -->
            <div *ngIf="(!profile || !profile?.car_plate || profile?.car_plate === '') && !loadingProfile && !isEditing" class="no-profile-view animate-up">
                <div class="empty-state">
                    <div class="icon-circle">
                        <lucide-icon name="plus" [size]="40"></lucide-icon>
                    </div>
                    <h2>No Vehicle Registered</h2>
                    <p>You haven't added your vehicle details yet. Please complete your profile to start using SmartPark.</p>
                    <button (click)="isEditing = true; isNewUser = true" class="add-btn">
                        <lucide-icon name="plus-circle" [size]="20"></lucide-icon>
                        <span>Add My Vehicle</span>
                    </button>
                </div>
            </div>

            <!-- View Mode -->
            <div *ngIf="profile?.car_plate && profile?.car_plate !== '' && !isEditing" class="vehicle-view animate-up">
                <div class="vehicle-card main">
                    <div class="card-body">
                        <div class="icon-wrap">
                            <lucide-icon name="car" [size]="40"></lucide-icon>
                        </div>
                        <div class="details">
                            <div class="plate-row">
                                <h2 class="plate">{{ profile?.car_plate }}</h2>
                                <div *ngIf="profile?.role === 'staff'" class="staff-badge" style="background: #fffbeb; color: #d97706; border: 1px solid #fde68a; padding: 4px 10px; border-radius: 6px; font-size: 0.7rem; font-weight: 800; display: flex; align-items: center; gap: 4px; margin-left: 8px;">
                                    <lucide-icon name="briefcase" [size]="14"></lucide-icon>
                                    Staff
                                </div>
                                <div *ngIf="profile?.is_oku" class="oku-badge">
                                    <lucide-icon name="accessibility" [size]="14"></lucide-icon>
                                    OKU
                                </div>
                            </div>
                            <p class="model">{{ profile?.car_colour }} {{ profile?.car_model }}</p>
                        </div>
                    </div>
                </div>

                <div class="info-grid">
                    <div class="info-item">
                        <label>{{ profile?.role === 'staff' ? 'Staff Name' : 'Student Name' }}</label>
                        <p>{{ profile?.name }}</p>
                    </div>
                    <div class="info-item">
                        <label>{{ profile?.role === 'staff' ? 'Staff ID' : 'Student ID' }}</label>
                        <p>{{ profile?.role === 'staff' ? profile?.staff_id : profile?.student_id }}</p>
                    </div>
                </div>
            </div>

            <!-- Edit / Create Mode -->
            <div *ngIf="(profile || isNewUser) && isEditing" class="form-container animate-up">
                <div class="form-card">
                    <div class="card-content">
                        <h3 class="form-title">{{ !profile?.car_plate ? 'Register Your Vehicle' : 'Update Details' }}</h3>
                        <div class="input-stack">
                            <div class="input-item">
                                <label>PLATE NUMBER</label>
                                <input [(ngModel)]="editData.car_plate" placeholder="VDL 2269" (input)="editData.car_plate = editData.car_plate.toUpperCase()" />
                            </div>
                            <div class="input-item">
                                <label>CAR MODEL</label>
                                <input [(ngModel)]="editData.car_model" placeholder="Honda HRV" />
                            </div>
                            <div class="input-item">
                                <label>COLOR</label>
                                <input [(ngModel)]="editData.car_colour" placeholder="Modern Steel" />
                            </div>
                            <div class="input-item toggle-row">
                                <label>OKU STATUS</label>
                                <div class="toggle-switch">
                                    <input type="checkbox" id="oku-toggle" [(ngModel)]="editData.is_oku">
                                    <label for="oku-toggle"></label>
                                    <span class="toggle-label">{{ editData.is_oku ? 'YES' : 'NO' }}</span>
                                </div>
                            </div>
                        </div>
                        
                        <div *ngIf="error" class="error-msg">{{ error }}</div>

                        <button class="submit-btn" (click)="saveChanges()" [disabled]="loading">
                            {{ loading ? 'Processing...' : (isNewUser ? 'Register Vehicle' : 'Update Records') }}
                        </button>
                    </div>
                </div>
            </div>
            
            <div style="margin-top: 3rem; padding: 1rem; border-top: 2px solid #3b82f6; color: #1e293b; font-size: 0.8rem; text-align: center; background: #eff6ff; font-weight: 800;">
                 MASTER SYNC: V1.0.X | UID: {{ profile?.uid || 'SEARCHING...' }} | NAME: {{ profile?.name }}
            </div>
        </div>

        <!-- Custom Success Popup Modal -->
        <div *ngIf="showSuccessModal" class="modal-overlay animate-fade-in" (click)="closeSuccessModal()">
            <div class="custom-modal-card animate-scale-up" (click)="$event.stopPropagation()">
                <div class="modal-icon-circle success">
                    <lucide-icon name="check-circle-2" [size]="48"></lucide-icon>
                </div>
                <h2 class="modal-title">Car Registered Successfully</h2>
                <p class="modal-subtitle">Your vehicle has been successfully linked to your SmartPark APU account.</p>
                
                <div class="vehicle-summary-badge" *ngIf="registeredSuccessPlate">
                    <span class="summary-plate">{{ registeredSuccessPlate }}</span>
                    <span class="summary-model">{{ registeredSuccessModel }}</span>
                </div>

                <button (click)="closeSuccessModal()" class="modal-btn-primary">
                    <span>Awesome, Got It!</span>
                </button>
            </div>
        </div>

        <!-- Custom Confirmation Modal for Unregistering -->
        <div *ngIf="showConfirmModal" class="modal-overlay animate-fade-in" (click)="showConfirmModal = false">
            <div class="custom-modal-card animate-scale-up" (click)="$event.stopPropagation()">
                <div class="modal-icon-circle warning">
                    <lucide-icon name="alert-triangle" [size]="48"></lucide-icon>
                </div>
                <h2 class="modal-title">Unregister Vehicle?</h2>
                <p class="modal-subtitle">Are you sure you want to unregister <strong>{{ profile?.car_plate }}</strong>? This will remove your vehicle access from APU SmartPark.</p>
                
                <div class="modal-actions-row">
                    <button (click)="showConfirmModal = false" class="modal-btn-secondary">
                        Cancel
                    </button>
                    <button (click)="executeRemoveVehicle()" class="modal-btn-danger" [disabled]="loading">
                        {{ loading ? 'Unregistering...' : 'Yes, Unregister' }}
                    </button>
                </div>
            </div>
        </div>
    </div>
  `,
  styles: [`
    .page-shell { min-height: 100vh; background: #f8fafc; }
    .app-header { background: white; color: #1e293b; padding: 1.25rem 2rem; border-bottom: 1px solid #e2e8f0; position: sticky; top: 0; z-index: 100; }
    .header-wrap { max-width: 800px; margin: 0 auto; display: flex; justify-content: space-between; align-items: center; }
    .header-wrap h1 { margin: 0; font-size: 1.1rem; font-weight: 800; }
    
    .back-btn { background: #f1f5f9; border: none; width: 36px; height: 36px; border-radius: 10px; display: flex; align-items: center; justify-content: center; cursor: pointer; color: #64748b; }
    .delete-btn { display: flex; align-items: center; gap: 8px; background: #fee2e2; color: #ef4444; border: none; padding: 8px 16px; border-radius: 10px; font-weight: 700; font-size: 0.9rem; cursor: pointer; transition: 0.2s; }
    .delete-btn:hover { background: #fecaca; transform: translateY(-1px); }
    .edit-btn { display: flex; align-items: center; gap: 8px; background: #3b82f6; color: white; border: none; padding: 8px 16px; border-radius: 10px; font-weight: 700; font-size: 0.9rem; cursor: pointer; transition: 0.2s; }
    .edit-btn:hover { background: #2563eb; transform: translateY(-1px); }
    
    .page-content { max-width: 800px; margin: 0 auto; padding: 2rem; }

    .vehicle-card { background: white; border-radius: 1.5rem; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); border: 1px solid #e2e8f0; margin-bottom: 1.5rem; }
    .card-body { padding: 2rem; display: flex; gap: 1.5rem; align-items: center; }
    .icon-wrap { background: #eff6ff; color: #3b82f6; width: 80px; height: 80px; border-radius: 1.25rem; display: flex; align-items: center; justify-content: center; }
    .plate { font-size: 2.25rem; font-weight: 900; margin: 0; color: #0f172a; letter-spacing: 1px; }
    .plate-row { display: flex; align-items: center; gap: 12px; }
    .oku-badge { background: #eff6ff; color: #3b82f6; border: 1px solid #dbeafe; padding: 4px 10px; border-radius: 6px; font-size: 0.7rem; font-weight: 800; display: flex; align-items: center; gap: 4px; }
    .model { color: #64748b; font-size: 1.1rem; margin: 4px 0 0; font-weight: 500; }

    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; }
    .info-item { background: white; padding: 1.5rem; border-radius: 1.25rem; border: 1px solid #e2e8f0; }
    .info-item label { display: block; font-size: 0.7rem; font-weight: 800; color: #94a3b8; text-transform: uppercase; margin-bottom: 6px; }
    .info-item p { margin: 0; font-size: 1.1rem; font-weight: 700; color: #1e293b; }

    .form-card { background: white; border-radius: 1.5rem; border: 1px solid #e2e8f0; padding: 2rem; }
    .input-stack { display: grid; gap: 1.25rem; margin-bottom: 2rem; }
    .input-item { display: flex; flex-direction: column; gap: 6px; }
    .input-item label { font-size: 0.7rem; font-weight: 800; color: #94a3b8; text-transform: uppercase; }
    .input-item input { background: #f8fafc; border: 1px solid #e2e8f0; padding: 14px; border-radius: 12px; font-weight: 600; outline: none; }
    .input-item input:focus { border-color: #3b82f6; background: white; }

    .toggle-row { flex-direction: row !important; align-items: center; justify-content: space-between; }
    .toggle-switch { display: flex; align-items: center; }
    .toggle-switch input { display: none; }
    .toggle-switch label { width: 44px; height: 24px; background: #cbd5e1; border-radius: 12px; position: relative; cursor: pointer; transition: 0.3s; }
    .toggle-switch label:after { content: ''; width: 20px; height: 20px; background: white; border-radius: 50%; position: absolute; top: 2px; left: 2px; transition: 0.3s; }
    .toggle-switch input:checked + label { background: #10b981; }
    .toggle-switch input:checked + label:after { left: 22px; }
    .toggle-label { font-size: 0.75rem; font-weight: 800; color: #64748b; margin-left: 10px; width: 30px; }

    .submit-btn { width: 100%; background: #0f172a; color: white; border: none; padding: 1rem; border-radius: 12px; font-weight: 800; cursor: pointer; transition: 0.2s; }
    .submit-btn:hover { background: #334155; transform: translateY(-2px); }
    .error-msg { background: #fee2e2; border: 1px solid #fca5a5; color: #b91c1c; padding: 12px 16px; border-radius: 12px; font-weight: 700; font-size: 0.9rem; margin-bottom: 1.25rem; text-align: center; }

    .no-profile-view { display: flex; justify-content: center; padding: 2rem 0; }
    .empty-state { text-align: center; max-width: 400px; }
    .icon-circle { width: 100px; height: 100px; background: #f1f5f9; color: #94a3b8; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 1.5rem; }
    .empty-state h2 { font-size: 1.5rem; font-weight: 800; color: #1e293b; margin-bottom: 0.75rem; }
    .empty-state p { color: #64748b; margin-bottom: 2rem; line-height: 1.6; }
    .add-btn { display: flex; align-items: center; gap: 8px; background: #3b82f6; color: white; border: none; padding: 12px 24px; border-radius: 12px; font-weight: 700; cursor: pointer; margin: 0 auto; transition: 0.2s; }
    .add-btn:hover { background: #2563eb; transform: translateY(-2px); }

    .form-title { font-size: 1.25rem; font-weight: 800; margin-bottom: 1.5rem; color: #1e293b; border-bottom: 1px solid #f1f5f9; padding-bottom: 1rem; }
    .spinning { animation: rotate 1s linear infinite; }
    @keyframes rotate { to { transform: rotate(360deg); } }
    .animate-up { animation: animateUp 0.5s ease-out; }
    @keyframes animateUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

    /* Modern Popup Modal Styles */
    .modal-overlay { position: fixed; inset: 0; background: rgba(15, 23, 42, 0.65); backdrop-filter: blur(8px); display: flex; align-items: center; justify-content: center; z-index: 9999; padding: 1.5rem; }
    .custom-modal-card { background: #ffffff; border-radius: 24px; padding: 2.5rem 2rem; max-width: 440px; width: 100%; text-align: center; box-shadow: 0 25px 50px -12px rgba(15, 23, 42, 0.35); border: 1px solid #e2e8f0; }
    
    .modal-icon-circle { width: 84px; height: 84px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 1.5rem; }
    .modal-icon-circle.success { background: #ecfdf5; color: #10b981; border: 2px solid #a7f3d0; box-shadow: 0 10px 20px -5px rgba(16, 185, 129, 0.3); }
    .modal-icon-circle.warning { background: #fffbeb; color: #f59e0b; border: 2px solid #fde68a; box-shadow: 0 10px 20px -5px rgba(245, 158, 11, 0.3); }

    .modal-title { font-size: 1.45rem; font-weight: 800; color: #0f172a; margin: 0 0 0.5rem; }
    .modal-subtitle { font-size: 0.95rem; color: #64748b; margin: 0 0 1.5rem; line-height: 1.5; font-weight: 500; }
    
    .vehicle-summary-badge { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; padding: 12px 16px; margin-bottom: 1.75rem; display: flex; flex-direction: column; gap: 4px; }
    .summary-plate { font-size: 1.35rem; font-weight: 900; color: #0f172a; letter-spacing: 1px; }
    .summary-model { font-size: 0.85rem; font-weight: 600; color: #64748b; }

    .modal-btn-primary { width: 100%; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; border: none; padding: 1rem; border-radius: 14px; font-size: 1rem; font-weight: 800; cursor: pointer; transition: 0.2s; box-shadow: 0 8px 16px -4px rgba(16, 185, 129, 0.4); }
    .modal-btn-primary:hover { transform: translateY(-2px); box-shadow: 0 12px 20px -4px rgba(16, 185, 129, 0.5); }

    .modal-actions-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .modal-btn-secondary { background: #f1f5f9; color: #475569; border: 1px solid #cbd5e1; padding: 0.85rem; border-radius: 12px; font-weight: 700; font-size: 0.95rem; cursor: pointer; transition: 0.2s; }
    .modal-btn-secondary:hover { background: #e2e8f0; color: #1e293b; }
    .modal-btn-danger { background: #ef4444; color: white; border: none; padding: 0.85rem; border-radius: 12px; font-weight: 700; font-size: 0.95rem; cursor: pointer; transition: 0.2s; box-shadow: 0 6px 14px -3px rgba(239, 68, 68, 0.4); }
    .modal-btn-danger:hover { background: #dc2626; transform: translateY(-2px); }

    .animate-scale-up { animation: scaleUp 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
    @keyframes scaleUp { from { opacity: 0; transform: scale(0.92); } to { opacity: 1; transform: scale(1); } }
  `]
})
export class ViewPlates implements OnInit, OnDestroy {
  profile: UserProfile | null = null;
  currentUid: string = '';
  isEditing = false;
  isNewUser = false;
  loading = false;
  loadingProfile = true;
  error = '';
  
  // Custom Popups State
  showSuccessModal = false;
  showConfirmModal = false;
  registeredSuccessPlate = '';
  registeredSuccessModel = '';

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
    private cdr: ChangeDetectorRef
  ) {}

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
    console.log('[ViewPlates] Loading profile for UID:', uid);

    this.userService.getUserProfile(uid).subscribe({
      next: (p) => {
        if (p) {
          console.log('[ViewPlates] Profile loaded:', p.name, '| car_plate:', p.car_plate);
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
        } else {
          console.warn('[ViewPlates] No profile document found.');
          this.loadingProfile = false;
          this.isNewUser = true;
        }
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('[ViewPlates] Error loading profile:', err);
        this.loadingProfile = false;
        this.isNewUser = true;
        this.cdr.detectChanges();
      }
    });
  }

  toggleEdit() {
    this.isEditing = !this.isEditing;
    if (this.isEditing) {
      this.editData = { ...this.profile };
    }
    this.error = '';
  }

  async saveChanges() {
    this.error = '';

    if (!this.editData.car_plate || !this.editData.car_model) {
      this.error = 'Plate and Model are required';
      return;
    }

    this.loading = true;
    this.error = '';
    
    try {
      const user = await new Promise(resolve => {
        const s = this.auth.user$.subscribe(u => { s.unsubscribe(); resolve(u); });
      }) as any;

      if (user) {
        const normalizedPlate = this.editData.car_plate.replace(/\s+/g, '').toUpperCase();
        const carData = {
          car_plate: normalizedPlate,
          car_model: this.editData.car_model,
          car_colour: this.editData.car_colour,
          is_oku: this.editData.is_oku
        };
        
        console.log('Protecting identity - only updating car fields:', carData);
        await this.userService.updateUserProfile(user.uid, carData);
        
        if (this.profile) {
          this.profile = { ...this.profile, ...carData };
        }
        this.isEditing = false;
        this.isNewUser = false;
        this.loadingProfile = false;
        
        // Show clean modern custom modal popup
        this.registeredSuccessPlate = normalizedPlate;
        this.registeredSuccessModel = `${this.editData.car_colour || ''} ${this.editData.car_model || ''}`.trim();
        this.showSuccessModal = true;
      }
    } catch (e: any) {
      console.error('Firestore Error:', e);
      this.error = e.message || 'Plate has been registered under another user';
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  closeSuccessModal() {
    this.showSuccessModal = false;
    this.cdr.detectChanges();
  }

  removeVehicle() {
    this.showConfirmModal = true;
    this.cdr.detectChanges();
  }

  async executeRemoveVehicle() {
    this.loading = true;
    try {
      if (this.profile?.uid) {
        const resetData = {
          car_plate: '',
          car_model: '',
          car_colour: ''
        };
        await this.userService.updateUserProfile(this.profile.uid, resetData);
        this.profile = { ...this.profile, ...resetData };
        this.isNewUser = true;
        this.showConfirmModal = false;
      }
    } catch (e: any) {
      this.error = 'Failed to remove vehicle: ' + (e.message || 'Unknown error');
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  goBack() {
    this.router.navigate(['/']);
  }
}
