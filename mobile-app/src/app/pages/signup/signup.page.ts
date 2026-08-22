import { Component } from '@angular/core';
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

  constructor(private auth: AuthService, private router: Router) { }

  async handleSignup() {
    if (!this.email || !this.password || !this.name) {
      this.error = 'Please fill in all mandatory fields';
      return;
    }

    this.loading = true;
    this.error = '';

    try {
      await this.auth.register(this.email, this.password, this.name);
      this.router.navigate(['/home']);
    } catch (e: any) {
      this.error = e.message || 'Signup failed';
    } finally {
      this.loading = false;
    }
  }
}
