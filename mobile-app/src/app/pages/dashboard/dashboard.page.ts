import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { ParkingOccupancyService, ParkingOccupancyResponse, SectionOccupancy, RowOccupancy } from '../../services/parking-occupancy.service';
import { Subscription } from 'rxjs';

export interface MapRow {
  id: string;
  label: string;
  section: 'A' | 'B' | 'C';
  total: number;
  occupied: number;
  available: number;
  occupancyPercentage: number;
  status: string;
  orientation: 'horizontal' | 'vertical';
  left: number;
  top: number;
  width: number;
  height: number;
}

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.page.html',
  styleUrls: ['./dashboard.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule]
})
export class DashboardPage implements OnInit, OnDestroy {
  mapRows: MapRow[] = [];
  filteredRows: MapRow[] = [];
  selectedRow: MapRow | null = null;
  activeFilter: 'ALL' | 'A' | 'B' | 'C' = 'ALL';

  loading = true;
  refreshing = false;
  errorMessage: string | null = null;
  lastUpdatedTime: string = '';
  private sub = new Subscription();

  // Canonical APU Parking Layout Coordinates - Perfectly Centered
  private readonly baseRows: MapRow[] = [
    // Section A (Right vertical rows A to F, centered inside Section A box left: 69.5%, width: 28.0%, top: 38%, height: 58%)
    { id: 'A', label: 'Row A', section: 'A', total: 40, occupied: 0, available: 40, occupancyPercentage: 0, status: 'LOW', orientation: 'vertical', left: 93.2, top: 46.0, width: 3.2, height: 46.0 },
    { id: 'B', label: 'Row B', section: 'A', total: 42, occupied: 0, available: 42, occupancyPercentage: 0, status: 'LOW', orientation: 'vertical', left: 89.0, top: 46.0, width: 3.2, height: 46.0 },
    { id: 'C', label: 'Row C', section: 'A', total: 42, occupied: 0, available: 42, occupancyPercentage: 0, status: 'LOW', orientation: 'vertical', left: 84.8, top: 46.0, width: 3.2, height: 46.0 },
    { id: 'D', label: 'Row D', section: 'A', total: 44, occupied: 0, available: 44, occupancyPercentage: 0, status: 'LOW', orientation: 'vertical', left: 80.6, top: 46.0, width: 3.2, height: 46.0 },
    { id: 'E', label: 'Row E', section: 'A', total: 44, occupied: 0, available: 44, occupancyPercentage: 0, status: 'LOW', orientation: 'vertical', left: 76.4, top: 46.0, width: 3.2, height: 46.0 },
    { id: 'F', label: 'Row F', section: 'A', total: 45, occupied: 0, available: 45, occupancyPercentage: 0, status: 'LOW', orientation: 'vertical', left: 72.2, top: 46.0, width: 3.2, height: 46.0 },

    // Section B (Bottom left/middle vertical rows G to Q, centered inside Section B box left: 3.5%, width: 63.5%, top: 45.5%, height: 50.5%)
    { id: 'G', label: 'Row G', section: 'B', total: 48, occupied: 0, available: 48, occupancyPercentage: 0, status: 'LOW', orientation: 'vertical', left: 58.5, top: 50.0, width: 3.2, height: 43.0 },
    { id: 'H', label: 'Row H', section: 'B', total: 48, occupied: 0, available: 48, occupancyPercentage: 0, status: 'LOW', orientation: 'vertical', left: 53.2, top: 50.0, width: 3.2, height: 43.0 },
    { id: 'I', label: 'Row I', section: 'B', total: 48, occupied: 0, available: 48, occupancyPercentage: 0, status: 'LOW', orientation: 'vertical', left: 47.9, top: 50.0, width: 3.2, height: 43.0 },
    { id: 'J', label: 'Row J', section: 'B', total: 48, occupied: 0, available: 48, occupancyPercentage: 0, status: 'LOW', orientation: 'vertical', left: 42.6, top: 50.0, width: 3.2, height: 43.0 },
    { id: 'K', label: 'Row K', section: 'B', total: 48, occupied: 0, available: 48, occupancyPercentage: 0, status: 'LOW', orientation: 'vertical', left: 37.3, top: 50.0, width: 3.2, height: 43.0 },
    { id: 'L', label: 'Row L', section: 'B', total: 48, occupied: 0, available: 48, occupancyPercentage: 0, status: 'LOW', orientation: 'vertical', left: 32.0, top: 50.0, width: 3.2, height: 43.0 },
    { id: 'M', label: 'Row M', section: 'B', total: 48, occupied: 0, available: 48, occupancyPercentage: 0, status: 'LOW', orientation: 'vertical', left: 26.7, top: 50.0, width: 3.2, height: 43.0 },
    { id: 'N', label: 'Row N', section: 'B', total: 48, occupied: 0, available: 48, occupancyPercentage: 0, status: 'LOW', orientation: 'vertical', left: 21.4, top: 50.0, width: 3.2, height: 43.0 },
    { id: 'O', label: 'Row O', section: 'B', total: 48, occupied: 0, available: 48, occupancyPercentage: 0, status: 'LOW', orientation: 'vertical', left: 16.1, top: 50.0, width: 3.2, height: 43.0 },
    { id: 'P', label: 'Row P', section: 'B', total: 48, occupied: 0, available: 48, occupancyPercentage: 0, status: 'LOW', orientation: 'vertical', left: 10.8, top: 50.0, width: 3.2, height: 43.0 },
    { id: 'Q', label: 'Row Q', section: 'B', total: 50, occupied: 0, available: 50, occupancyPercentage: 0, status: 'LOW', orientation: 'vertical', left: 5.5, top: 50.0, width: 3.2, height: 43.0 },

    // Section C (Top horizontal rows R to X, centered inside Section C box left: 3.5%, width: 63.5%, top: 3.5%, height: 40.0%)
    { id: 'R', label: 'Row R', section: 'C', total: 45, occupied: 0, available: 45, occupancyPercentage: 0, status: 'LOW', orientation: 'horizontal', left: 6.0, top: 36.0, width: 28.5, height: 4.8 },
    { id: 'S', label: 'Row S', section: 'C', total: 45, occupied: 0, available: 45, occupancyPercentage: 0, status: 'LOW', orientation: 'horizontal', left: 6.0, top: 30.0, width: 28.5, height: 4.8 },
    { id: 'T', label: 'Row T', section: 'C', total: 48, occupied: 0, available: 48, occupancyPercentage: 0, status: 'LOW', orientation: 'horizontal', left: 35.5, top: 36.0, width: 28.5, height: 4.8 },
    { id: 'U', label: 'Row U', section: 'C', total: 48, occupied: 0, available: 48, occupancyPercentage: 0, status: 'LOW', orientation: 'horizontal', left: 35.5, top: 30.0, width: 28.5, height: 4.8 },
    { id: 'V', label: 'Row V', section: 'C', total: 48, occupied: 0, available: 48, occupancyPercentage: 0, status: 'LOW', orientation: 'horizontal', left: 6.0, top: 22.5, width: 58.0, height: 4.8 },
    { id: 'W', label: 'Row W', section: 'C', total: 48, occupied: 0, available: 48, occupancyPercentage: 0, status: 'LOW', orientation: 'horizontal', left: 6.0, top: 16.0, width: 58.0, height: 4.8 },
    { id: 'X', label: 'Row X', section: 'C', total: 50, occupied: 0, available: 50, occupancyPercentage: 0, status: 'LOW', orientation: 'horizontal', left: 6.0, top: 7.5, width: 58.0, height: 4.8 }
  ];

  constructor(
    private occupancyService: ParkingOccupancyService,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit() {
    this.mapRows = JSON.parse(JSON.stringify(this.baseRows));
    this.applyFilter();
    this.fetchOccupancy(false);

    // Auto refresh every 60s
    this.sub = this.occupancyService.getPollOccupancy(60000).subscribe({
      next: (res) => {
        this.processOccupancyData(res);
      },
      error: (err) => {
        console.error('[DashboardPage] Poll error:', err);
        if (!this.mapRows.length) {
          this.errorMessage = 'Unable to connect to live parking occupancy server at http://localhost:5070.';
        }
        this.loading = false;
        this.refreshing = false;
        this.cdr.detectChanges();
      }
    });
  }

  ngOnDestroy() {
    this.sub.unsubscribe();
  }

  fetchOccupancy(isManual = false) {
    if (isManual) this.refreshing = true;
    else if (this.loading) this.loading = true;
    this.cdr.detectChanges();

    this.occupancyService.getOccupancy().subscribe({
      next: (res) => {
        this.processOccupancyData(res);
      },
      error: (err) => {
        console.error('[DashboardPage] Fetch error:', err);
        this.errorMessage = 'Unable to connect to live parking occupancy server at http://localhost:5070.';
        this.loading = false;
        this.refreshing = false;
        this.cdr.detectChanges();
      }
    });
  }

  doRefresh(event: any) {
    this.occupancyService.getOccupancy().subscribe({
      next: (res) => {
        this.processOccupancyData(res);
        event.target.complete();
      },
      error: () => {
        event.target.complete();
      }
    });
  }

  processOccupancyData(res: ParkingOccupancyResponse) {
    const previousSelectedId = this.selectedRow?.id;
    const apiMap = new Map<string, { capacity: number; occupied: number; available: number; pct: number; status: string }>();

    res.sections.forEach(sec => {
      sec.rows.forEach(r => {
        apiMap.set(r.row, {
          capacity: r.capacity,
          occupied: r.occupied,
          available: r.available,
          pct: r.occupancyPercentage,
          status: r.status || (r.occupancyPercentage >= 80 ? 'HIGH' : r.occupancyPercentage >= 50 ? 'MEDIUM' : 'LOW')
        });
      });
    });

    this.mapRows = this.baseRows.map(base => {
      const live = apiMap.get(base.id);
      return {
        ...base,
        total: live?.capacity ?? base.total,
        occupied: live?.occupied ?? base.occupied,
        available: live?.available ?? (base.total - base.occupied),
        occupancyPercentage: live?.pct ?? Math.round((base.occupied / base.total) * 100),
        status: live?.status ?? 'LOW'
      };
    });

    this.applyFilter();
    this.selectedRow = this.mapRows.find(r => r.id === previousSelectedId) ?? this.mapRows[0] ?? null;
    this.loading = false;
    this.refreshing = false;
    this.errorMessage = null;
    this.lastUpdatedTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    this.cdr.detectChanges();
  }

  setFilter(filter: 'ALL' | 'A' | 'B' | 'C') {
    this.activeFilter = filter;
    this.applyFilter();
    this.cdr.detectChanges();
  }

  applyFilter() {
    if (this.activeFilter === 'ALL') {
      this.filteredRows = [...this.mapRows];
    } else {
      this.filteredRows = this.mapRows.filter(r => r.section === this.activeFilter);
    }
  }

  selectRow(row: MapRow) {
    this.selectedRow = row;
    this.cdr.detectChanges();
  }

  get totalCapacity(): number {
    return this.mapRows.reduce((acc, r) => acc + r.total, 0);
  }

  get totalOccupied(): number {
    return this.mapRows.reduce((acc, r) => acc + r.occupied, 0);
  }

  get totalAvailable(): number {
    return this.mapRows.reduce((acc, r) => acc + r.available, 0);
  }

  get overallPct(): number {
    return this.totalCapacity ? (this.totalOccupied / this.totalCapacity) * 100 : 0;
  }

  getSectionPct(sec: 'A' | 'B' | 'C'): number {
    const secRows = this.mapRows.filter(r => r.section === sec);
    const tot = secRows.reduce((acc, r) => acc + r.total, 0);
    const occ = secRows.reduce((acc, r) => acc + r.occupied, 0);
    return tot ? Math.round((occ / tot) * 100) : 0;
  }

  getOccupancyColor(pct: number): string {
    if (pct >= 80) return '#ef4444'; // Red
    if (pct >= 50) return '#f59e0b'; // Amber
    return '#10b981'; // Green
  }

  getOccupancyBg(pct: number): string {
    if (pct >= 80) return 'rgba(239, 68, 68, 0.15)';
    if (pct >= 50) return 'rgba(245, 158, 11, 0.15)';
    return 'rgba(16, 185, 129, 0.15)';
  }

  getRowStyle(row: MapRow): Record<string, string> {
    const color = this.getOccupancyColor(row.occupancyPercentage);
    return {
      left: `${row.left}%`,
      top: `${row.top}%`,
      width: `${row.width}%`,
      height: `${row.height}%`,
      '--row-color': color
    };
  }

  getFillStyle(row: MapRow): Record<string, string> {
    const color = this.getOccupancyColor(row.occupancyPercentage);
    const pct = `${row.occupancyPercentage}%`;
    const bg = `linear-gradient(135deg, ${color}, rgba(255,255,255,0.2))`;
    return row.orientation === 'horizontal'
      ? { width: pct, background: bg }
      : { height: pct, background: bg };
  }

  getSimulatedSpots(row: MapRow): { index: number; occupied: boolean }[] {
    const count = Math.min(row.total, 30);
    const occupiedCount = Math.round((row.occupied / row.total) * count);
    const spots = [];
    for (let i = 1; i <= count; i++) {
      spots.push({
        index: i,
        occupied: i <= occupiedCount
      });
    }
    return spots;
  }
}
