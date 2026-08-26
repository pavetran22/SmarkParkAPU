import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  template: `
    <div style="display: flex; min-height: 100vh; align-items: center; justify-content: center; padding: 1rem; background: linear-gradient(180deg, #f0f5ff 0%, #eaf1ff 50%, #f4f8ff 100%); position: relative; font-family: 'Inter', sans-serif;">
        
        <!-- Floating Success Toast Notification -->
        <div *ngIf="showToast" class="floating-toast animate-bounce-in">
            <div class="toast-icon-wrap">
                <lucide-icon name="mail-check" [size]="22"></lucide-icon>
            </div>
            <div class="toast-content">
                <strong>Check your inbox for the reset link</strong>
                <span>We've sent a password reset link to {{ sentEmail }}</span>
            </div>
        </div>

        <div class="glass-panel animate-fade-in" style="width: 100%; max-width: 440px; padding: 2.5rem; background: white; border-radius: 1.5rem; box-shadow: 0 20px 40px -10px rgba(30, 58, 138, 0.12); border: 1px solid #dbeafe; position: relative;">
            
            <div (click)="goBack()" style="position: absolute; top: 1.5rem; left: 1.5rem; cursor: pointer; color: #64748b; display: flex; align-items: center; gap: 4px; font-weight: 700; font-size: 0.85rem;" class="back-btn">
                <lucide-icon name="arrow-left" [size]="18"></lucide-icon> Back to Login
            </div>

            <div style="text-align: center; margin-top: 1.25rem; margin-bottom: 2rem;">
                <div style="display: flex; justify-content: center; margin-bottom: 1rem;">
                    <div style="background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%); padding: 16px; border-radius: 50%; color: #2563eb; border: 1px solid #bfdbfe;">
                        <lucide-icon name="mail" [size]="32"></lucide-icon>
                    </div>
                </div>
                <h1 style="font-size: 1.75rem; font-weight: 800; color: #0f172a; margin: 0;">Reset Password</h1>
                <p style="color: #64748b; font-size: 0.88rem; margin-top: 0.5rem; line-height: 1.4;">
                    Enter your official APU email to receive a password reset link directly in your inbox.
                </p>
            </div>

            <!-- Pre-Submit Form -->
            <form *ngIf="!emailSent" (ngSubmit)="handleSendLink()" style="display: flex; flex-direction: column; gap: 1.25rem;">
                <!-- Error Alert Banner -->
                <div *ngIf="error" style="background: rgba(239, 68, 68, 0.12); color: #dc2626; padding: 0.85rem 1rem; border-radius: 12px; font-size: 0.875rem; font-weight: 600; border: 1px solid rgba(239, 68, 68, 0.3); display: flex; align-items: flex-start; gap: 8px; line-height: 1.4;">
                    <lucide-icon name="alert-circle" [size]="18" style="color: #dc2626; flex-shrink: 0; margin-top: 2px;"></lucide-icon>
                    <span>{{ error }}</span>
                </div>

                <div class="input-group">
                    <label>APU Email Address</label>
                    <input class="modern-input" type="email" [(ngModel)]="email" name="email" placeholder="TP067847@mail.apu.edu.my" required />
                    <span style="display: block; font-size: 0.72rem; color: #64748b; margin-top: 4px; font-weight: 500;">
                        Use your official <strong>TPXXXXXX&#64;mail.apu.edu.my</strong> or staff email.
                    </span>
                </div>

                <button type="submit" class="submit-btn" [disabled]="loading || !email.trim()">
                    {{ loading ? 'Sending Reset Link...' : 'Send Reset Link' }}
                </button>
            </form>

            <!-- In-Page Confirmation State -->
            <div *ngIf="emailSent" class="confirmation-box animate-fade-in">
                <div class="confirm-icon-wrap">
                    <lucide-icon name="send" [size]="28"></lucide-icon>
                </div>
                <h3>Check Your Inbox</h3>
                <p class="confirm-text">
                    A password reset link has been dispatched to <strong>{{ sentEmail }}</strong>. Please check your inbox (and spam folder) and click the link to set your new password.
                </p>

                <div class="resend-container">
                    <button (click)="handleResendLink()" 
                            [disabled]="cooldownSeconds > 0 || loading" 
                            class="resend-btn">
                        {{ cooldownSeconds > 0 ? 'Resend link in ' + cooldownSeconds + 's' : (loading ? 'Sending...' : 'Resend Reset Link') }}
                    </button>
                </div>

                <div style="margin-top: 1.25rem;">
                    <a (click)="goBack()" class="back-link">Return to Sign In</a>
                </div>
            </div>
        </div>
    </div>
  `,
  styles: [`
    .floating-toast {
        position: fixed;
        top: 24px;
        right: 24px;
        z-index: 9999;
        background: #0f172a;
        color: #ffffff;
        padding: 16px 20px;
        border-radius: 16px;
        box-shadow: 0 20px 40px -10px rgba(15, 23, 42, 0.35);
        border-left: 6px solid #10b981;
        max-width: 380px;
        display: flex;
        align-items: center;
        gap: 12px;
        animation: toastIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .toast-icon-wrap {
        background: rgba(16, 185, 129, 0.2);
        color: #10b981;
        padding: 8px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
    }
    .toast-content {
        display: flex;
        flex-direction: column;
        gap: 2px;
    }
    .toast-content strong {
        font-size: 0.9rem;
        font-weight: 800;
        color: #34d399;
    }
    .toast-content span {
        font-size: 0.8rem;
        color: #cbd5e1;
        font-weight: 500;
    }
    @keyframes toastIn {
        from { opacity: 0; transform: translateY(-12px); }
        to { opacity: 1; transform: translateY(0); }
    }

    .modern-input { width: 100%; background: #f8fafc; border: 1px solid #cbd5e1; padding: 12px 16px; border-radius: 12px; font-weight: 600; outline: none; transition: 0.2s; box-sizing: border-box; color: #0f172a; }
    .modern-input:focus { background: white; border-color: #2563eb; box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.12); }
    .input-group label { display: block; font-size: 0.75rem; font-weight: 800; color: #64748b; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.05em; }

    .submit-btn { width: 100%; background: linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%); color: white; border: none; padding: 14px; border-radius: 12px; font-weight: 800; font-size: 1rem; cursor: pointer; transition: 0.2s; margin-top: 0.5rem; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3); }
    .submit-btn:hover { transform: translateY(-2px); box-shadow: 0 8px 20px rgba(37, 99, 235, 0.4); }
    .submit-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
    .back-btn:hover { color: #2563eb; }

    .confirmation-box { text-align: center; }
    .confirm-icon-wrap { width: 56px; height: 56px; background: #eff6ff; color: #2563eb; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 1rem; border: 1px solid #bfdbfe; }
    .confirmation-box h3 { margin: 0 0 0.5rem; font-size: 1.35rem; font-weight: 800; color: #0f172a; }
    .confirm-text { color: #475569; font-size: 0.9rem; line-height: 1.5; margin: 0 0 1.5rem; }

    .resend-container { background: #f8fafc; padding: 12px; border-radius: 12px; border: 1px solid #e2e8f0; }
    .resend-btn { background: none; border: none; color: #2563eb; font-weight: 700; cursor: pointer; font-size: 0.88rem; font-family: inherit; }
    .resend-btn:hover:not(:disabled) { text-decoration: underline; color: #1d4ed8; }
    .resend-btn:disabled { color: #94a3b8; cursor: not-allowed; }

    .back-link { font-size: 0.88rem; font-weight: 700; color: #2563eb; cursor: pointer; }
    .back-link:hover { text-decoration: underline; color: #1d4ed8; }
  `]
})
export class ForgotPassword implements OnInit, OnDestroy {
  email = '';
  sentEmail = '';
  error = '';
  loading = false;
  emailSent = false;
  showToast = false;
  cooldownSeconds = 60;
  private timer: any;
  private toastTimer: any;

  constructor(
    private auth: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      if (params['email']) {
        this.email = params['email'];
      }
    });
  }

  ngOnDestroy() {
    if (this.timer) clearInterval(this.timer);
    if (this.toastTimer) clearTimeout(this.toastTimer);
  }

  triggerToast() {
    this.showToast = true;
    this.cdr.detectChanges();
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => {
      this.showToast = false;
      this.cdr.detectChanges();
    }, 6000);
  }

  startCooldown() {
    this.cooldownSeconds = 60;
    if (this.timer) clearInterval(this.timer);
    this.timer = setInterval(() => {
      if (this.cooldownSeconds > 0) {
        this.cooldownSeconds--;
      } else {
        clearInterval(this.timer);
      }
      this.cdr.detectChanges();
    }, 1000);
  }

  async handleSendLink() {
    const normalized = (this.email || '').trim().toLowerCase();
    if (!normalized) {
      this.error = 'Please enter your registered APU email address.';
      this.cdr.detectChanges();
      return;
    }

    const isStudent = /^[Tt][Pp]\d+@mail\.apu\.edu\.my$/i.test(normalized);
    const isStaff = /^[A-Za-z0-9._%+-]+@(staff\.mail\.apu\.edu\.my|staffmail\.apu\.edu\.my|staff\.apu\.edu\.my)$/i.test(normalized);
    if (!isStudent && !isStaff) {
      this.error = 'Only official APU email addresses (e.g. TPXXXXXX@mail.apu.edu.my) are allowed.';
      this.cdr.detectChanges();
      return;
    }

    this.loading = true;
    this.error = '';
    this.cdr.detectChanges();

    try {
      await this.auth.sendResetEmail(normalized);
      this.sentEmail = normalized;
      this.emailSent = true;
      this.startCooldown();
      this.triggerToast();
    } catch (e: any) {
      console.warn('[ForgotPassword] Error caught:', e);
      this.error = e.message || 'Failed to send reset link. Please check the email address.';
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  async handleResendLink() {
    if (this.cooldownSeconds > 0 || !this.sentEmail) return;

    this.loading = true;
    this.error = '';
    this.cdr.detectChanges();

    try {
      await this.auth.sendResetEmail(this.sentEmail);
      this.startCooldown();
      this.triggerToast();
    } catch (e: any) {
      this.error = e.message || 'Failed to resend reset link.';
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  goBack() {
    this.router.navigate(['/login']);
  }
}
