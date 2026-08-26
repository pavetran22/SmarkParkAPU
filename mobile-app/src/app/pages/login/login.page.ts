import { Component, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule, RouterModule]
})
export class LoginPage {
  email = '';
  password = '';
  error = '';
  loading = false;

  constructor(
    private auth: AuthService, 
    private router: Router,
    private cdr: ChangeDetectorRef
  ) { }

  async handleLogin() {
    if (!this.email || !this.password) {
      this.error = 'Please fill in all fields';
      this.cdr.detectChanges();
      return;
    }
    this.loading = true;
    this.error = '';
    this.cdr.detectChanges();

    try {
      await this.auth.login(this.email, this.password);
      this.router.navigate(['/home']);
    } catch (e: any) {
      console.warn('[LoginPage] Error caught:', e);
      this.error = e.message || 'Login failed. Please check your credentials.';
      this.loading = false;
      this.cdr.detectChanges();
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  goToForgotPassword() {
    this.router.navigate(['/forgot-password'], { queryParams: { email: this.email } });
  }
}
