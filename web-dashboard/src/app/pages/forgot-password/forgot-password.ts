import { Component, OnInit, OnDestroy } from '@angular/core';
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
    <div style="display: flex; min-height: 100vh; align-items: center; justify-content: center; padding: 1rem; background: linear-gradient(180deg, #f0f5ff 0%, #eaf1ff 50%, #f4f8ff 100%);">
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
                    Enter your email to receive an official password reset link directly to your inbox.
                </p>
            </div>

            <!-- Pre-Submit Form -->
            <form *ngIf="!emailSent" (ngSubmit)="handleSendLink()" style="display: flex; flex-direction: column; gap: 1.25rem;">
                <div *ngIf="error" style="background: #fee2e2; color: #ef4444; padding: 0.75rem 1rem; border-radius: 12px; font-size: 0.875rem; font-weight: 600; border: 1px solid #fca5a5;">
                    {{ error }}
                </div>

                <div class="input-group">
                    <label>Email Address</label>
                    <input class="modern-input" type="email" [(ngModel)]="email" name="email" placeholder="student@mail.com" required />
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
                    If <strong>{{ sentEmail }}</strong> corresponds to a registered APU account, a password reset link has been sent. Please check your inbox and click the link to reset your password.
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
  cooldownSeconds = 60;
  private timer: any;

  constructor(
    private auth: AuthService,
    private router: Router,
    private route: ActivatedRoute
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
    }, 1000);
  }

  async handleSendLink() {
    if (!this.email || !this.email.trim()) {
      this.error = 'Please enter a valid email address.';
      return;
    }

    this.loading = true;
    this.error = '';

    try {
      await this.auth.sendResetEmail(this.email);
      this.sentEmail = this.email.trim().toLowerCase();
      this.emailSent = true;
      this.startCooldown();
    } catch (e: any) {
      this.error = e.message || 'Failed to send reset link.';
    } finally {
      this.loading = false;
    }
  }

  async handleResendLink() {
    if (this.cooldownSeconds > 0 || !this.sentEmail) return;

    this.loading = true;
    this.error = '';

    try {
      await this.auth.sendResetEmail(this.sentEmail);
      this.startCooldown();
    } catch (e: any) {
      this.error = e.message || 'Failed to resend reset link.';
    } finally {
      this.loading = false;
    }
  }

  goBack() {
    this.router.navigate(['/login']);
  }
}
