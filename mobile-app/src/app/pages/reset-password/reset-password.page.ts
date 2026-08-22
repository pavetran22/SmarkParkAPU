import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, ToastController } from '@ionic/angular';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule],
  template: `
    <ion-header [translucent]="true">
      <ion-toolbar color="primary">
        <ion-title>New Password</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content [fullscreen]="true" class="ion-padding auth-content" color="light">
      <div class="auth-wrapper">
        <div class="auth-card animate-fade-in">

          <!-- Verifying Link Loading State -->
          <div *ngIf="verifyingLink" class="loading-state">
            <ion-spinner name="crescent" color="primary"></ion-spinner>
            <h2>Verifying Reset Link...</h2>
            <p>Please wait while we validate your security token.</p>
          </div>

          <!-- Invalid / Expired Link State -->
          <div *ngIf="!verifyingLink && linkInvalid" class="invalid-state">
            <div class="icon-circle alert">
              <ion-icon name="warning-outline"></ion-icon>
            </div>
            <h1>Invalid or Expired Link</h1>
            <p>This password reset link is invalid or has already expired.</p>
            <ion-button expand="block" shape="round" class="auth-btn" (click)="goToForgotPassword()">
              Request New Link
            </ion-button>
          </div>

          <!-- Valid Link & Form -->
          <div *ngIf="!verifyingLink && !linkInvalid">
            <div class="auth-header">
              <div class="icon-circle">
                <ion-icon name="lock-closed-outline"></ion-icon>
              </div>
              <h1>Create Password</h1>
              <p>Set a new password for <strong>{{ associatedEmail }}</strong></p>
            </div>

            <div class="error-msg" *ngIf="error">
              {{ error }}
            </div>
            <div class="success-msg" *ngIf="successMessage">
              {{ successMessage }}
            </div>

            <ion-list lines="none">
              <ion-item class="auth-item">
                <ion-label position="stacked">Account Email</ion-label>
                <ion-input type="email" [value]="associatedEmail" disabled readonly class="read-only-input"></ion-input>
              </ion-item>

              <ion-item class="auth-item">
                <ion-label position="stacked">New Password</ion-label>
                <ion-input type="password" 
                           [(ngModel)]="newPassword" 
                           placeholder="••••••••" 
                           (ionInput)="validateInput()">
                </ion-input>
              </ion-item>

              <ion-item class="auth-item">
                <ion-label position="stacked">Confirm New Password</ion-label>
                <ion-input type="password" 
                           [(ngModel)]="confirmPassword" 
                           placeholder="••••••••" 
                           (ionInput)="validateInput()">
                </ion-input>
              </ion-item>
            </ion-list>

            <div class="rules-box">
              <div class="rule-item" [class.valid]="hasMinLength">
                <ion-icon [name]="hasMinLength ? 'checkmark-circle' : 'ellipse-outline'"></ion-icon>
                <span>At least 8 characters long</span>
              </div>
              <div class="rule-item" [class.valid]="hasNumber">
                <ion-icon [name]="hasNumber ? 'checkmark-circle' : 'ellipse-outline'"></ion-icon>
                <span>Contains at least one number</span>
              </div>
              <div class="rule-item" [class.valid]="passwordsMatch && confirmPassword.length > 0">
                <ion-icon [name]="passwordsMatch && confirmPassword.length > 0 ? 'checkmark-circle' : 'ellipse-outline'"></ion-icon>
                <span>Passwords match</span>
              </div>
            </div>

            <ion-button expand="block" 
                        shape="round" 
                        class="auth-btn" 
                        (click)="handleResetPassword()" 
                        [disabled]="loading || !isValidForm()">
              {{ loading ? 'Updating...' : 'Reset Password' }}
            </ion-button>
          </div>
        </div>
      </div>
    </ion-content>
  `,
  styles: [`
    .auth-content { --background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); display: flex; align-items: center; }
    .auth-wrapper { height: 100%; display: flex; align-items: center; justify-content: center; }
    .auth-card { width: 100%; max-width: 400px; background: rgba(255, 255, 255, 0.95); backdrop-filter: blur(20px); padding: 2.5rem 1.5rem; border-radius: 1.5rem; box-shadow: 0 20px 40px -10px rgba(30, 58, 138, 0.12); border: 1px solid rgba(224, 231, 255, 0.8); }
    
    .loading-state, .invalid-state { text-align: center; padding: 1.5rem 0; h2, h1 { font-size: 1.4rem; font-weight: 800; color: #0f172a; margin-top: 1rem; } p { color: #64748b; font-size: 0.88rem; } }
    .icon-circle { display: inline-flex; background: #eff6ff; padding: 1rem; border-radius: 50%; color: #1d4ed8; border: 1px solid #bfdbfe; ion-icon { font-size: 2.2rem; } }
    .icon-circle.alert { background: #fef2f2; color: #ef4444; border-color: #fca5a5; }

    .auth-header { text-align: center; margin-bottom: 1.5rem; h1 { font-size: 1.6rem; font-weight: 800; margin: 0; color: #0f172a; } p { margin: 0.5rem 0 0 0; color: #64748b; font-size: 0.88rem; line-height: 1.4; } }
    .error-msg { background: #fee2e2; color: #ef4444; padding: 0.75rem; border-radius: 0.5rem; font-size: 0.85rem; margin-bottom: 1rem; text-align: center; border: 1px solid #fca5a5; font-weight: 600; }
    .success-msg { background: #ecfdf5; color: #059669; padding: 0.75rem; border-radius: 0.5rem; font-size: 0.85rem; margin-bottom: 1rem; text-align: center; border: 1px solid #a7f3d0; font-weight: 600; }

    .auth-item { --background: transparent; --padding-start: 0; --inner-padding-end: 0; margin-bottom: 0.75rem; ion-label { color: #334155; font-weight: 700; margin-bottom: 0.4rem; } ion-input { background: white; border: 1px solid #cbd5e1; border-radius: 0.75rem; padding: 0.75rem 1rem !important; --padding-start: 1rem; } }
    .read-only-input { opacity: 0.7; }

    .rules-box { background: #f8fafc; border: 1px solid #e2e8f0; padding: 12px; border-radius: 12px; display: flex; flex-direction: column; gap: 8px; margin: 0.5rem 0 1.25rem 0; }
    .rule-item { display: flex; align-items: center; gap: 8px; font-size: 0.8rem; font-weight: 600; color: #94a3b8; ion-icon { font-size: 1rem; } }
    .rule-item.valid { color: #059669; }

    .auth-btn { --background: linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%); --box-shadow: 0 4px 14px 0 rgba(29, 78, 216, 0.35); height: 3.25rem; font-weight: 800; }
  `]
})
export class ResetPasswordPage implements OnInit {
  oobCode = '';
  associatedEmail = '';
  verifyingLink = true;
  linkInvalid = false;

  newPassword = '';
  confirmPassword = '';
  error = '';
  successMessage = '';
  loading = false;

  hasMinLength = false;
  hasNumber = false;
  passwordsMatch = false;

  constructor(
    private auth: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private toastCtrl: ToastController
  ) {}

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      this.oobCode = params['oobCode'] || '';
      if (!this.oobCode) {
        this.verifyingLink = false;
        this.linkInvalid = true;
      } else {
        this.verifyCode();
      }
    });
  }

  async verifyCode() {
    this.verifyingLink = true;
    this.linkInvalid = false;
    try {
      this.associatedEmail = await this.auth.verifyResetCode(this.oobCode);
      this.linkInvalid = false;
    } catch (e: any) {
      this.linkInvalid = true;
    } finally {
      this.verifyingLink = false;
    }
  }

  validateInput() {
    this.hasMinLength = this.newPassword.length >= 8;
    this.hasNumber = /\d/.test(this.newPassword);
    this.passwordsMatch = this.newPassword === this.confirmPassword && this.confirmPassword.length > 0;
  }

  isValidForm(): boolean {
    return this.hasMinLength && this.hasNumber && this.passwordsMatch;
  }

  async handleResetPassword() {
    if (!this.isValidForm()) {
      this.error = 'Please fulfill all password requirements.';
      return;
    }

    this.loading = true;
    this.error = '';
    this.successMessage = '';

    try {
      await this.auth.confirmPasswordReset(this.oobCode, this.newPassword, this.associatedEmail);
      const toast = await this.toastCtrl.create({
        message: 'Your password has been reset successfully!',
        duration: 2000,
        color: 'success'
      });
      await toast.present();
      
      this.successMessage = 'Your password has been reset successfully! Redirecting...';
      setTimeout(() => {
        this.router.navigate(['/login']);
      }, 1500);
    } catch (e: any) {
      this.error = e.message || 'Failed to reset password.';
    } finally {
      this.loading = false;
    }
  }

  goToForgotPassword() {
    this.router.navigate(['/forgot-password']);
  }
}
