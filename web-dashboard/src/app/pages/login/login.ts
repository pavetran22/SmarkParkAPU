import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  template: `
    <div style="position: relative; display: flex; min-height: 100vh; align-items: center; justify-content: center; padding: 1rem; background: #070a13; overflow: hidden; font-family: 'Inter', sans-serif;">
        <!-- Looping Background Video -->
        <video autoplay loop muted playsinline style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover; z-index: 1; filter: brightness(0.3) contrast(1.1) saturate(0.7);">
            <source src="/videos/cctv-surveillance.mp4" type="video/mp4">
        </video>

        <!-- CCTV Monitor HUD & Scanlines -->
        <div class="cctv-scanlines"></div>
        
        <div class="cctv-hud" style="position: absolute; top: 20px; left: 20px; color: #10b981; font-family: monospace; font-size: 14px; z-index: 2; font-weight: bold; text-shadow: 0 0 4px rgba(16,185,129,0.5);">
            <span class="rec-dot"></span> REC [CAM 01]
        </div>

        <div class="cctv-hud" style="position: absolute; top: 20px; right: 20px; color: #10b981; font-family: monospace; font-size: 14px; z-index: 2; font-weight: bold; text-shadow: 0 0 4px rgba(16,185,129,0.5);">
            LIVE SIGNAL APU
        </div>

        <!-- Glassmorphism Login Card -->
        <div class="glass-panel animate-fade-in" style="position: relative; z-index: 3; width: 100%; max-width: 420px; padding: 2.5rem; background: rgba(10, 15, 30, 0.65); backdrop-filter: blur(24px); -webkit-backdrop-filter: blur(24px); border-radius: 1.5rem; box-shadow: 0 30px 60px rgba(0, 0, 0, 0.5); border: 1px solid rgba(255, 255, 255, 0.12);">
            <div style="text-align: center; margin-bottom: 2rem;">
                <div style="display: flex; justify-content: center; margin-bottom: 1rem;">
                    <div style="background: rgba(59, 130, 246, 0.1); padding: 16px; border-radius: 50%; color: #3b82f6; border: 1px solid rgba(59, 130, 246, 0.2); box-shadow: 0 0 20px rgba(59, 130, 246, 0.15);">
                        <lucide-icon name="shield" [size]="32"></lucide-icon>
                    </div>
                </div>
                <h1 style="font-size: 1.875rem; font-weight: 800; color: #ffffff; margin: 0; letter-spacing: -0.02em;">SmartPark APU</h1>
                <p style="color: #94a3b8; font-size: 0.9rem; margin-top: 0.5rem; font-weight: 500;">Secure Surveillance Portal</p>
            </div>
 
            <form (ngSubmit)="handleSubmit()" style="display: flex; flex-direction: column; gap: 1.25rem;">
                <div *ngIf="error" style="background: rgba(239, 68, 68, 0.15); color: #f87171; padding: 0.75rem 1rem; border-radius: 12px; font-size: 0.875rem; font-weight: 600; border: 1px solid rgba(239, 68, 68, 0.3);">
                    {{ error }}
                </div>
 
                <div class="input-group">
                    <label>APU Email Address</label>
                    <input class="modern-input" type="email" [(ngModel)]="email" name="email" placeholder="TP067847@mail.apu.edu.my" />
                </div>
 
                <div class="input-group">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                        <label style="margin-bottom: 0;">Password</label>
                        <span (click)="goToForgotPassword()" class="forgot-link">
                            Forgot Password?
                        </span>
                    </div>
                    <input class="modern-input" type="password" [(ngModel)]="password" name="password" placeholder="••••••••" />
                </div>
 
                <button type="submit" class="submit-btn" [disabled]="loading">
                    {{ loading ? 'Accessing Secure Feed...' : 'Authorize Login' }}
                </button>
            </form>
 
            <div style="margin-top: 1.5rem; text-align: center; font-size: 0.875rem; color: #94a3b8; font-weight: 500;">
                Don't have authorization? 
                <span (click)="goToSignup()" style="color: #3b82f6; font-weight: 700; cursor: pointer; transition: color 0.2s;" onmouseover="this.style.color='#60a5fa'" onmouseout="this.style.color='#3b82f6'">
                    Sign up
                </span>
            </div>
        </div>
    </div>
  `,
  styles: [`
    .cctv-scanlines {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        z-index: 2;
        pointer-events: none;
        background: linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.03), rgba(0, 255, 0, 0.01), rgba(0, 0, 255, 0.03));
        background-size: 100% 4px, 6px 100%;
        opacity: 0.7;
    }
    .rec-dot {
        display: inline-block;
        width: 10px;
        height: 10px;
        background-color: #ef4444;
        border-radius: 50%;
        margin-right: 6px;
        animation: blink 1.5s infinite;
    }
    @keyframes blink {
        0%, 100% { opacity: 1; }
        50% { opacity: 0; }
    }
    .modern-input { width: 100%; background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.12); padding: 12px 16px; border-radius: 12px; font-weight: 600; outline: none; transition: 0.2s; box-sizing: border-box; color: #ffffff; }
    .modern-input::placeholder { color: rgba(255, 255, 255, 0.35); }
    .modern-input:focus { background: rgba(255, 255, 255, 0.08); border-color: #3b82f6; box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.2); }
    .input-group label { display: block; font-size: 0.75rem; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 6px; }
    
    .forgot-link { font-size: 0.8rem; font-weight: 700; color: #3b82f6; cursor: pointer; transition: color 0.2s; }
    .forgot-link:hover { color: #60a5fa; text-decoration: underline; }

    .submit-btn { width: 100%; background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: white; border: none; padding: 14px; border-radius: 12px; font-weight: 800; font-size: 1rem; cursor: pointer; transition: 0.2s; margin-top: 0.5rem; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.25); }
    .submit-btn:hover { transform: translateY(-2px); box-shadow: 0 8px 20px rgba(37, 99, 235, 0.4); }
    .submit-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
  `]
})
export class Login {
  email = '';
  password = '';
  error = '';
  loading = false;

  constructor(private auth: AuthService, private router: Router) {}

  async handleSubmit() {
    if (!this.email || !this.password) {
      this.error = 'Please fill in all fields';
      return;
    }
    this.loading = true;
    this.error = '';
    try {
      await this.auth.login(this.email, this.password);
      this.router.navigate(['/']);
    } catch (e: any) {
      this.error = e.message || 'Login failed';
    } finally {
      this.loading = false;
    }
  }

  goToForgotPassword() {
    this.router.navigate(['/forgot-password'], { queryParams: { email: this.email } });
  }

  goToSignup() {
    this.router.navigate(['/signup']);
  }
}
