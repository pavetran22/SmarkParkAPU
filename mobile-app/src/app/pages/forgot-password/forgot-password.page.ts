import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule],
  template: `
    <ion-header [translucent]="true">
      <ion-toolbar color="primary">
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/login"></ion-back-button>
        </ion-buttons>
        <ion-title>Reset Password</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content [fullscreen]="true" class="ion-padding auth-content" color="light">
      <div class="auth-wrapper">
        <div class="auth-card animate-fade-in">
          <div class="auth-header">
            <div class="icon-circle">
              <ion-icon name="mail-outline"></ion-icon>
            </div>
            <h1>Reset Password</h1>
            <p>Enter your registered APU email to receive an official password reset link.</p>
          </div>

          <!-- Form State -->
          <div *ngIf="!emailSent">
            <div class="error-msg" *ngIf="error">
              {{ error }}
            </div>

            <ion-list lines="none">
              <ion-item class="auth-item">
                <ion-label position="stacked">Email Address</ion-label>
                <ion-input type="email" [(ngModel)]="email" placeholder="student@mail.com"></ion-input>
              </ion-item>
            </ion-list>

            <ion-button expand="block" shape="round" class="auth-btn" (click)="handleSendLink()" [disabled]="loading || !email.trim()">
              {{ loading ? 'Sending Link...' : 'Send Reset Link' }}
            </ion-button>
          </div>

          <!-- In-Page Confirmation State -->
          <div *ngIf="emailSent" class="confirmation-box">
            <div class="confirm-icon-wrap">
              <ion-icon name="send-outline"></ion-icon>
            </div>
            <h2>Check Your Inbox</h2>
            <p>
              If <strong>{{ sentEmail }}</strong> is registered, a password reset link has been sent. Please check your inbox and click the link to reset your password.
            </p>

            <div class="resend-wrap">
              <ion-button fill="clear" 
                          size="small" 
                          (click)="handleResendLink()" 
                          [disabled]="cooldownSeconds > 0 || loading">
                {{ cooldownSeconds > 0 ? 'Resend link in ' + cooldownSeconds + 's' : (loading ? 'Sending...' : 'Resend Reset Link') }}
              </ion-button>
            </div>

            <div class="back-link-wrap">
              <span (click)="goBack()" class="back-link">Back to Sign In</span>
            </div>
          </div>
        </div>
      </div>
    </ion-content>
  `,
  styles: [`
    .auth-content { --background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); display: flex; align-items: center; }
    .auth-wrapper { height: 100%; display: flex; align-items: center; justify-content: center; }
    .auth-card { width: 100%; max-width: 400px; background: rgba(255, 255, 255, 0.95); backdrop-filter: blur(20px); padding: 2.5rem 1.5rem; border-radius: 1.5rem; box-shadow: 0 20px 40px -10px rgba(30, 58, 138, 0.12); border: 1px solid rgba(224, 231, 255, 0.8); }
    .auth-header { text-align: center; margin-bottom: 1.75rem; }
    .icon-circle { display: inline-flex; background: #eff6ff; padding: 1rem; border-radius: 50%; color: #1d4ed8; margin-bottom: 1rem; border: 1px solid #bfdbfe; ion-icon { font-size: 2.2rem; } }
    .auth-header h1 { font-size: 1.6rem; font-weight: 800; margin: 0; color: #0f172a; }
    .auth-header p { margin: 0.5rem 0 0 0; color: #64748b; font-size: 0.88rem; line-height: 1.4; }
    .error-msg { background: #fee2e2; color: #ef4444; padding: 0.75rem; border-radius: 0.5rem; font-size: 0.85rem; margin-bottom: 1rem; text-align: center; border: 1px solid #fca5a5; font-weight: 600; }
    .auth-item { --background: transparent; --padding-start: 0; --inner-padding-end: 0; margin-bottom: 1rem; ion-label { color: #334155; font-weight: 700; margin-bottom: 0.5rem; } ion-input { background: white; border: 1px solid #cbd5e1; border-radius: 0.75rem; padding: 0.75rem 1rem !important; --padding-start: 1rem; } }
    .auth-btn { margin-top: 1rem; --background: linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%); --box-shadow: 0 4px 14px 0 rgba(29, 78, 216, 0.35); height: 3.25rem; font-weight: 800; }

    .confirmation-box { text-align: center; }
    .confirm-icon-wrap { width: 56px; height: 56px; background: #eff6ff; color: #1d4ed8; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 1rem; border: 1px solid #bfdbfe; ion-icon { font-size: 1.8rem; } }
    .confirmation-box h2 { margin: 0 0 0.5rem; font-size: 1.35rem; font-weight: 800; color: #0f172a; }
    .confirmation-box p { color: #475569; font-size: 0.88rem; line-height: 1.5; margin: 0 0 1.25rem; }

    .resend-wrap { background: #f8fafc; padding: 10px; border-radius: 12px; border: 1px solid #e2e8f0; ion-button { font-weight: 700; --color: #1d4ed8; text-transform: none; } }
    .back-link-wrap { margin-top: 1.25rem; .back-link { font-size: 0.85rem; font-weight: 700; color: #1d4ed8; cursor: pointer; } }
  `]
})
export class ForgotPasswordPage implements OnInit, OnDestroy {
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
