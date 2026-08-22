import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  template: `
    <div style="display: flex; min-height: 100vh; align-items: center; justify-content: center; padding: 1rem; background: linear-gradient(180deg, #f0f5ff 0%, #eaf1ff 50%, #f4f8ff 100%);">
        <div class="glass-panel animate-fade-in" style="width: 100%; max-width: 440px; padding: 2.5rem; background: white; border-radius: 1.5rem; box-shadow: 0 20px 40px -10px rgba(30, 58, 138, 0.12); border: 1px solid #dbeafe; position: relative;">

            <!-- State 1: Verifying Link Loading State -->
            <div *ngIf="verifyingLink" style="text-align: center; padding: 2rem 0;">
                <div style="display: flex; justify-content: center; margin-bottom: 1rem;">
                    <div class="spinner"></div>
                </div>
                <h2 style="font-size: 1.25rem; font-weight: 800; color: #0f172a; margin: 0;">Verifying Reset Link...</h2>
                <p style="color: #64748b; font-size: 0.88rem; margin-top: 0.5rem;">Please wait while we validate your security token.</p>
            </div>

            <!-- State 2: Invalid / Expired Link State -->
            <div *ngIf="!verifyingLink && linkInvalid" style="text-align: center; padding: 1rem 0;">
                <div style="display: flex; justify-content: center; margin-bottom: 1.25rem;">
                    <div style="background: #fef2f2; padding: 16px; border-radius: 50%; color: #ef4444; border: 1px solid #fca5a5;">
                        <lucide-icon name="alert-triangle" [size]="36"></lucide-icon>
                    </div>
                </div>
                <h1 style="font-size: 1.5rem; font-weight: 800; color: #0f172a; margin: 0;">Invalid or Expired Link</h1>
                <p style="color: #64748b; font-size: 0.9rem; margin-top: 0.5rem; line-height: 1.5;">
                    This password reset link is invalid, malformed, or has already expired.
                </p>
                <button (click)="goToForgotPassword()" class="submit-btn" style="margin-top: 1.5rem;">
                    Request a New Reset Link
                </button>
            </div>

            <!-- State 3: Valid Link & Password Form -->
            <div *ngIf="!verifyingLink && !linkInvalid">
                <div style="text-align: center; margin-top: 0.5rem; margin-bottom: 2rem;">
                    <div style="display: flex; justify-content: center; margin-bottom: 1rem;">
                        <div style="background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%); padding: 16px; border-radius: 50%; color: #2563eb; border: 1px solid #bfdbfe;">
                            <lucide-icon name="lock-keyhole" [size]="32"></lucide-icon>
                        </div>
                    </div>
                    <h1 style="font-size: 1.75rem; font-weight: 800; color: #0f172a; margin: 0;">Create New Password</h1>
                    <p style="color: #64748b; font-size: 0.88rem; margin-top: 0.5rem; line-height: 1.4;">
                        Set a new password for <strong style="color: #0f172a;">{{ associatedEmail }}</strong>
                    </p>
                </div>

                <form (ngSubmit)="handleResetPassword()" style="display: flex; flex-direction: column; gap: 1.25rem;">
                    <div *ngIf="error" style="background: #fee2e2; color: #ef4444; padding: 0.75rem 1rem; border-radius: 12px; font-size: 0.875rem; font-weight: 600; border: 1px solid #fca5a5;">
                        {{ error }}
                    </div>
                    <div *ngIf="successMessage" style="background: #ecfdf5; color: #059669; padding: 0.75rem 1rem; border-radius: 12px; font-size: 0.875rem; font-weight: 600; border: 1px solid #a7f3d0;">
                        {{ successMessage }}
                    </div>

                    <!-- Associated Email (Read-Only) -->
                    <div class="input-group">
                        <label>Account Email</label>
                        <input class="modern-input read-only-input" type="email" [value]="associatedEmail" disabled readonly />
                    </div>

                    <div class="input-group">
                        <label>Enter New Password</label>
                        <div class="password-input-wrap">
                            <input class="modern-input" 
                                   [type]="showPassword ? 'text' : 'password'" 
                                   [(ngModel)]="newPassword" 
                                   name="newPassword" 
                                   placeholder="••••••••" 
                                   (input)="validateInput()" 
                                   required />
                            <lucide-icon [name]="showPassword ? 'eye-off' : 'eye'" 
                                         [size]="18" 
                                         class="eye-icon" 
                                         (click)="showPassword = !showPassword">
                            </lucide-icon>
                        </div>
                    </div>

                    <div class="input-group">
                        <label>Confirm New Password</label>
                        <div class="password-input-wrap">
                            <input class="modern-input" 
                                   [type]="showConfirmPassword ? 'text' : 'password'" 
                                   [(ngModel)]="confirmPassword" 
                                   name="confirmPassword" 
                                   placeholder="••••••••" 
                                   (input)="validateInput()" 
                                   required />
                            <lucide-icon [name]="showConfirmPassword ? 'eye-off' : 'eye'" 
                                         [size]="18" 
                                         class="eye-icon" 
                                         (click)="showConfirmPassword = !showConfirmPassword">
                            </lucide-icon>
                        </div>
                    </div>

                    <!-- Password Rules Checklist -->
                    <div class="rules-box">
                        <div class="rule-item" [class.valid]="hasMinLength">
                            <lucide-icon [name]="hasMinLength ? 'check-circle' : 'circle'" [size]="14"></lucide-icon>
                            <span>At least 8 characters long</span>
                        </div>
                        <div class="rule-item" [class.valid]="hasNumber">
                            <lucide-icon [name]="hasNumber ? 'check-circle' : 'circle'" [size]="14"></lucide-icon>
                            <span>Contains at least one number</span>
                        </div>
                        <div class="rule-item" [class.valid]="passwordsMatch && confirmPassword.length > 0">
                            <lucide-icon [name]="passwordsMatch && confirmPassword.length > 0 ? 'check-circle' : 'circle'" [size]="14"></lucide-icon>
                            <span>Passwords match</span>
                        </div>
                    </div>

                    <button type="submit" class="submit-btn" [disabled]="loading || !isValidForm()">
                        {{ loading ? 'Updating Password...' : 'Reset Password' }}
                    </button>
                </form>
            </div>
        </div>
    </div>
  `,
  styles: [`
    .modern-input { width: 100%; background: #f8fafc; border: 1px solid #cbd5e1; padding: 12px 42px 12px 16px; border-radius: 12px; font-weight: 600; outline: none; transition: 0.2s; box-sizing: border-box; color: #0f172a; }
    .modern-input:focus { background: white; border-color: #2563eb; box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.12); }
    .read-only-input { background: #f1f5f9 !important; border-color: #e2e8f0 !important; color: #64748b !important; cursor: not-allowed; }

    .password-input-wrap { position: relative; width: 100%; }
    .eye-icon { position: absolute; right: 14px; top: 50%; transform: translateY(-50%); color: #64748b; cursor: pointer; transition: color 0.2s; }
    .eye-icon:hover { color: #2563eb; }

    .input-group label { display: block; font-size: 0.75rem; font-weight: 800; color: #64748b; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.05em; }

    .rules-box { background: #f8fafc; border: 1px solid #e2e8f0; padding: 12px; border-radius: 12px; display: flex; flex-direction: column; gap: 8px; }
    .rule-item { display: flex; align-items: center; gap: 8px; font-size: 0.8rem; font-weight: 600; color: #94a3b8; transition: color 0.2s; }
    .rule-item.valid { color: #059669; }

    .submit-btn { width: 100%; background: linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%); color: white; border: none; padding: 14px; border-radius: 12px; font-weight: 800; font-size: 1rem; cursor: pointer; transition: 0.2s; margin-top: 0.5rem; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3); }
    .submit-btn:hover { transform: translateY(-2px); box-shadow: 0 8px 20px rgba(37, 99, 235, 0.4); }
    .submit-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }

    .spinner { width: 36px; height: 36px; border: 3px solid #e2e8f0; border-top-color: #2563eb; border-radius: 50%; animation: spin 0.8s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
  `]
})
export class ResetPassword implements OnInit {
  oobCode = '';
  associatedEmail = '';
  verifyingLink = true;
  linkInvalid = false;

  newPassword = '';
  confirmPassword = '';
  showPassword = false;
  showConfirmPassword = false;
  error = '';
  successMessage = '';
  loading = false;

  hasMinLength = false;
  hasNumber = false;
  passwordsMatch = false;

  constructor(
    private auth: AuthService,
    private router: Router,
    private route: ActivatedRoute
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
      console.warn('[ResetPassword] Invalid oobCode:', e?.message);
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
      this.error = 'Please fulfill all password requirements before proceeding.';
      return;
    }

    this.loading = true;
    this.error = '';
    this.successMessage = '';

    try {
      await this.auth.confirmPasswordReset(this.oobCode, this.newPassword, this.associatedEmail);
      this.successMessage = 'Your password has been reset successfully. Redirecting to login...';
      setTimeout(() => {
        this.router.navigate(['/login']);
      }, 2000);
    } catch (e: any) {
      this.error = e.message || 'Failed to reset password. The link may have expired.';
    } finally {
      this.loading = false;
    }
  }

  goToForgotPassword() {
    this.router.navigate(['/forgot-password']);
  }
}
