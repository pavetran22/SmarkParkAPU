import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ParkingSpot } from '../../services/parking.service';

@Component({
  selector: 'app-parking-map',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="map-container">
      <div class="map-header">
        <h3 class="level-label">Level {{ level }} | Row {{ row }}</h3>
        <div class="legend">
          <div class="legend-item"><span class="box free"></span> Free</div>
          <div class="legend-item"><span class="box occupied"></span> Occupied</div>
          <div class="legend-item"><span class="box user"></span> Your Vehicle</div>
        </div>
      </div>
      
      <div class="spots-grid">
        <div *ngFor="let s of sortedSpots" 
             class="spot" 
             [ngClass]="s.status"
             title="{{ s.spot_id }}">
             
          <div class="spot-id">{{ s.spot_id.replace(row+'-', '') }}</div>
          <div class="spot-icon" *ngIf="s.status === 'user'">🚗</div>
          <div class="spot-icon" *ngIf="s.status === 'occupied'">🚙</div>
          
          <div class="plate-badge" *ngIf="s.status === 'user' || s.plate_number">
            {{ s.plate_number ? '...' + s.plate_number.slice(-3) : '' }}
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .map-container {
      background: #f8fafc;
      border: 1px dashed #cbd5e1;
      border-radius: 12px;
      padding: 24px;
      margin-top: 16px;
    }
    .map-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
    }
    .level-label { margin: 0; font-size: 1.25rem; }
    .legend {
      display: flex; gap: 16px; font-size: 0.875rem; color: #64748b;
    }
    .legend-item { display: flex; align-items: center; gap: 6px; }
    .box { width: 14px; height: 14px; border-radius: 4px; }
    .box.free { background: #10b981; }
    .box.occupied { background: #ef4444; }
    .box.user { background: #3b82f6; }

    .spots-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(60px, 1fr));
      gap: 12px;
    }

    .spot {
      height: 80px;
      border-radius: 6px;
      background: #e2e8f0;
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: space-between;
      padding: 6px 0;
      box-sizing: border-box;
      box-shadow: inset 0 0 0 1px rgba(0,0,0,0.05);
      transition: transform 0.2s;
    }

    .spot:hover { transform: scale(1.05); }

    .spot.free { background: #dcfce7; color: #059669; }
    .spot.occupied { background: #fee2e2; color: #b91c1c; }
    .spot.user { background: #dbeafe; box-shadow: 0 0 0 2px #3b82f6 inset; color: #1d4ed8; }

    .spot-id {
      font-size: 0.75rem;
      font-weight: 700;
      opacity: 0.8;
    }

    .spot-icon {
      font-size: 1.5rem;
      line-height: 1;
    }
    
    .plate-badge {
      font-size: 0.6rem;
      background: rgba(0,0,0,0.1);
      padding: 2px 4px;
      border-radius: 4px;
      font-family: monospace;
      letter-spacing: 0.5px;
    }
  `]
})
export class ParkingMapComponent implements OnInit {
  @Input() level!: number;
  @Input() row!: string;
  @Input() spots: ParkingSpot[] = [];
  @Input() userPlate?: string;

  get sortedSpots() {
      // Return sorted by spot_id numeric part for realistic display
      return this.spots.slice().sort((a,b) => {
          const aNum = parseInt(a.spot_id.split('-')[1]);
          const bNum = parseInt(b.spot_id.split('-')[1]);
          return aNum - bNum;
      });
  }

  ngOnInit() {}
}
