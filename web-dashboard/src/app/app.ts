import { Component, OnInit } from '@angular/core';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, ArrowLeft } from 'lucide-angular';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, CommonModule, LucideAngularModule],
  template: `
    <div class="app-container">
      <div *ngIf="showBackButton" style="position: relative; min-height: 100vh;">
            <button
                (click)="goBack()"
                style="position: absolute; top: 2rem; left: 2rem; background: white; border: none; border-radius: 50%; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); cursor: pointer; z-index: 10; transition: transform 0.2s; color: #64748b;"
            >
                <lucide-icon name="arrow-left" [size]="20"></lucide-icon>
            </button>
            <router-outlet></router-outlet>
      </div>

      <div *ngIf="!showBackButton">
          <router-outlet></router-outlet>
      </div>
    </div>
  `
})
export class App implements OnInit {
  showBackButton = false;

  constructor(private router: Router) {}

  ngOnInit() {
    this.router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) {
        const url = event.urlAfterRedirects.split('?')[0];
        const noBackPaths = ['/login', '/signup', '/dashboard', '/'];
        this.showBackButton = !noBackPaths.includes(url);
      }
    });
  }

  goBack() {
    this.router.navigate(['/']);
  }
}
