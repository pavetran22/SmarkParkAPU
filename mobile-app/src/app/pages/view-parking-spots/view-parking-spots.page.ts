import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { ParkingService, ParkingSpot } from '../../services/parking.service';

@Component({
  selector: 'app-view-parking-spots',
  templateUrl: './view-parking-spots.page.html',
  styleUrls: ['./view-parking-spots.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule]
})
export class ViewParkingSpotsPage implements OnInit {
  spots: ParkingSpot[] = [];
  loading = true;
  
  selectedLevel = 'B1';
  selectedRow = 'A';
  
  levels = ['B1', 'B2', 'B3'];
  rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R'];

  availableCount = 0;
  occupiedCount = 0;
  userCount = 0;

  constructor(private parkingService: ParkingService) { }

  ngOnInit() {
    this.fetchSpots();
  }

  fetchSpots() {
    this.loading = true;
    this.parkingService.getParkingSpots(this.selectedLevel, this.selectedRow).subscribe((data: any) => {
      this.spots = data;
      this.availableCount = data.filter((s: any) => s.status === 'free').length;
      this.occupiedCount = data.filter((s: any) => s.status === 'occupied').length;
      this.userCount = data.filter((s: any) => s.status === 'user').length;
      this.loading = false;
    });
  }
}
