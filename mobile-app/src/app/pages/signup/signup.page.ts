import { Component, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { RouterModule, Router } from '@angular/router';
import { AuthService, UserProfile } from '../../services/auth.service';

@Component({
  selector: 'app-signup',
  templateUrl: './signup.page.html',
  styleUrls: ['./signup.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule, RouterModule]
})
export class SignupPage {
  name = '';
  email = '';
  password = '';
  
  error = '';
  loading = false;

  constructor(
    private auth: AuthService, 
    private router: Router,
    private cdr: ChangeDetectorRef
  ) { }

  async handleSignup() {
    if (!this.email || !this.password || !this.name) {
      this.error = 'Please fill in all mandatory fields';
      this.cdr.detectChanges();
      return;
    }

    this.loading = true;
    this.error = '';
    this.cdr.detectChanges();

    try {
      await this.auth.register(this.email, this.password, this.name);
      this.router.navigate(['/home']);
    } catch (e: any) {
      console.warn('[SignupPage] Error caught:', e);
      this.error = e.message || 'Signup failed. Please try again.';
      this.loading = false;
      this.cdr.detectChanges();
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }
}
