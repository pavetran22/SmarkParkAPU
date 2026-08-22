import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { VehicleService, Vehicle } from '../../services/vehicle.service';

@Component({
  selector: 'app-my-vehicles',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="vehicles-page">
      <div class="header">
        <h1 class="page-title">My Vehicles</h1>
        <p class="subtitle">Manage your registered parking vehicle</p>
      </div>

      <div *ngIf="loading" class="loading-state">
        <div class="spinner"></div> Loaded...
      </div>

      <div class="content-wrapper" *ngIf="!loading">
        <!-- If User Has Vehicle -->
        <div *ngIf="vehicle" class="vehicle-card">
          <div class="card-header">
            <h3>Registered Vehicle</h3>
            <span class="badge">Approved</span>
          </div>

          <div class="plate-display">
            {{ vehicle.plate_number }}
          </div>

          <div class="vehicle-details">
            <div class="detail-group">
              <label>Student ID</label>
              <span>{{ vehicle.student_id }}</span>
            </div>
            <div class="detail-group">
              <label>Model</label>
              <span>{{ vehicle.vehicle_model }}</span>
            </div>
            <div class="detail-group">
              <label>Color</label>
              <span>{{ vehicle.color }}</span>
            </div>
          </div>

          <p class="rule-hint">Only one vehicle is allowed per student ID.</p>

          <button class="btn btn-danger" (click)="removeVehicle()" [disabled]="actionLoading">
             <span *ngIf="!actionLoading">Remove Vehicle</span>
             <span *ngIf="actionLoading">Processing...</span>
          </button>
        </div>

        <!-- Registration Form (If No Vehicle) -->
        <div *ngIf="!vehicle" class="register-card">
          <h3>Register New Vehicle</h3>
          <p class="rule-hint">Link a vehicle license plate to your student ID <strong>TP065432</strong>.</p>
          
          <form (ngSubmit)="registerVehicle()" #vForm="ngForm" class="form-layout">
            <div class="form-group">
              <label>License Plate Number</label>
              <input type="text" [(ngModel)]="formData.plate_number" name="plate" required 
                     placeholder="e.g. WXY1234" class="form-control" [disabled]="actionLoading">
            </div>
            
            <div class="form-group">
              <label>Vehicle Model</label>
              <input type="text" [(ngModel)]="formData.vehicle_model" name="model" required 
                     placeholder="e.g. Honda City" class="form-control" [disabled]="actionLoading">
            </div>

            <div class="form-group">
              <label>Color</label>
              <input type="text" [(ngModel)]="formData.color" name="color" required 
                     placeholder="e.g. Silver" class="form-control" [disabled]="actionLoading">
            </div>

            <button type="submit" class="btn btn-primary" [disabled]="!vForm.form.valid || actionLoading">
              <span *ngIf="!actionLoading">Register Vehicle</span>
              <span *ngIf="actionLoading" class="spinner-small"></span>
            </button>
          </form>
        </div>

      </div>
    </div>
  `,
  styles: [`
    .vehicles-page { animation: fadeIn 0.4s ease; max-width: 600px; }
    .page-title { margin: 0 0 8px 0; font-size: 1.75rem; color: #0f172a; }
    .subtitle { margin: 0 0 32px 0; color: #64748b; }

    .vehicle-card, .register-card { background: white; border-radius: 12px; padding: 32px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
    .card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
    .card-header h3 { margin: 0; color: #0f172a; }
    .badge { background: #dcfce7; color: #166534; padding: 4px 12px; border-radius: 9999px; font-size: 0.875rem; font-weight: 600; }

    .plate-display {
      background: #0f172a; color: white; display: inline-block; padding: 16px 32px;
      font-size: 2rem; font-weight: 700; letter-spacing: 2px; font-family: monospace;
      border-radius: 8px; margin-bottom: 24px; width: 100%; text-align: center; box-sizing: border-box;
      border: 4px solid #e2e8f0;
    }

    .vehicle-details { background: #f8fafc; border-radius: 8px; padding: 16px; margin-bottom: 24px; }
    .detail-group { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e2e8f0; }
    .detail-group:last-child { border: none; padding-bottom: 0; }
    .detail-group label { color: #64748b; font-weight: 500; }
    .detail-group span { font-weight: 600; color: #334155; }

    .rule-hint { font-size: 0.875rem; color: #64748b; background: #f1f5f9; padding: 12px; border-radius: 6px; margin-bottom: 24px; }

    .btn {
      width: 100%; padding: 14px; border: none; border-radius: 8px; font-size: 1rem;
      font-weight: 600; cursor: pointer; transition: all 0.2s;
    }
    .btn:disabled { opacity: 0.7; cursor: not-allowed; }
    .btn-danger { background: #fef2f2; color: #ef4444; border: 1px solid #fecaca; }
    .btn-danger:not(:disabled):hover { background: #fee2e2; }
    .btn-primary { background: #0ea5e9; color: white; }
    .btn-primary:not(:disabled):hover { background: #0284c7; transform: translateY(-1px); }

    /* Form Styles */
    .form-layout { display: flex; flex-direction: column; gap: 20px; }
    .form-group { display: flex; flex-direction: column; gap: 8px; }
    .form-group label { font-weight: 600; font-size: 0.875rem; color: #475569; }
    .form-control {
      padding: 12px 16px; border: 1px solid #cbd5e1; border-radius: 8px;
      font-size: 1rem; color: #334155; transition: border-color 0.2s;
    }
    .form-control:focus { outline: none; border-color: #0ea5e9; box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.1); }

    .spinner { width: 32px; height: 32px; border: 3px solid #e2e8f0; border-top-color: #3b82f6; border-radius: 50%; animation: spin 1s infinite linear; }
    .spinner-small { display: inline-block; width: 16px; height: 16px; border: 2px solid white; border-top-color: transparent; border-radius: 50%; animation: spin 1s infinite linear; }

    @keyframes spin { to { transform: rotate(360deg); } }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
  `]
})
export class MyVehicles implements OnInit {
  vehicle: Vehicle | null = null;
  loading = true;
  actionLoading = false;

  formData = {
    plate_number: '',
    vehicle_model: '',
    color: ''
  };

  constructor(private vehicleService: VehicleService) {}

  ngOnInit() {
    this.loadVehicle();
  }

  loadVehicle() {
    this.loading = true;
    this.vehicleService.getMyVehicle().subscribe(v => {
      this.vehicle = v;
      this.loading = false;
    });
  }

  registerVehicle() {
    this.actionLoading = true;
    const newVehicle: Vehicle = {
      student_id: 'TP065432', // Mocked user ID
      plate_number: this.formData.plate_number.toUpperCase(),
      vehicle_model: this.formData.vehicle_model,
      color: this.formData.color
    };

    this.vehicleService.registerVehicle(newVehicle).subscribe(v => {
      this.vehicle = v;
      this.actionLoading = false;
    });
  }

  removeVehicle() {
    if (confirm('Are you sure you want to remove this vehicle?')) {
      this.actionLoading = true;
      this.vehicleService.removeVehicle().subscribe(() => {
        this.vehicle = null;
        this.actionLoading = false;
        this.formData = { plate_number: '', vehicle_model: '', color: '' };
      });
    }
  }
}
