import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { ParkingService, ParkingLog } from '../../services/parking.service';
import { AuthService } from '../../services/auth.service';
import { Subscription } from 'rxjs';
import { Router } from '@angular/router';

@Component({
  selector: 'app-history',
  templateUrl: './history.page.html',
  styleUrls: ['./history.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule]
})
export class HistoryPage implements OnInit, OnDestroy {
  logs: ParkingLog[] = [];
  loading = true;
  private sub = new Subscription();

  constructor(
    private parkingService: ParkingService,
    private auth: AuthService,
    private router: Router
  ) { }

  ngOnInit() {
    this.sub = this.auth.user$.subscribe(user => {
      if (user) {
        this.loadLogs(user.uid);
      } else {
        this.router.navigate(['/login']);
      }
    });
  }

  ngOnDestroy() {
    this.sub.unsubscribe();
  }

  loadLogs(uid: string) {
    this.parkingService.getParkingLogs(uid).subscribe(logs => {
      this.logs = logs;
      this.loading = false;
    });
  }

  formatDate(timestamp: any) {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString([], { day: '2-digit', month: 'short' });
  }

  formatTime(timestamp: any) {
    if (!timestamp) return '—';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  calculateDuration(entry: any, exit: any) {
    if (!entry || !exit) return '—';
    const start = entry.toDate ? entry.toDate() : new Date(entry);
    const end = exit.toDate ? exit.toDate() : new Date(exit);
    const diffMs = end.getTime() - start.getTime();
    const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMins = Math.floor((diffMs / (1000 * 60)) % 60);
    return `${diffHrs}h ${diffMins}m`;
  }
}
