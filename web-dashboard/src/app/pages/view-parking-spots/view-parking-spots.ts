import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { ParkingOccupancyService, ParkingOccupancyResponse, SectionOccupancy, RowOccupancy } from '../../services/parking-occupancy.service';
import { Subscription } from 'rxjs';
import { Router } from '@angular/router';

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
  selector: 'app-view-parking-spots',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  template: `
    <div class="page-shell animate-fade-in">
      <!-- App Header -->
      <header class="app-header">
        <div class="header-wrap">
          <div class="header-left">
            <button (click)="goBack()" class="back-btn" title="Back to Dashboard">
              <lucide-icon name="arrow-left" [size]="20"></lucide-icon>
            </button>
            <div>
              <h1>APU SmartPark Floor Plan</h1>
              <p class="sub-header">Interactive 3D-Style View of Sections A, B & C • Rows A to X</p>
            </div>
          </div>

          <div class="header-actions">
            <button (click)="fetchOccupancy(true)" class="refresh-btn" [disabled]="refreshing">
              <lucide-icon name="refresh-cw" [size]="16" [class.spinning]="refreshing"></lucide-icon>
              <span>Refresh</span>
            </button>

            <!-- Section Filter Tabs -->
            <div class="filter-tabs">
              <button [class.active]="activeFilter === 'ALL'" (click)="setFilter('ALL')">All</button>
              <button [class.active]="activeFilter === 'A'" (click)="setFilter('A')">Sec A</button>
              <button [class.active]="activeFilter === 'B'" (click)="setFilter('B')">Sec B</button>
              <button [class.active]="activeFilter === 'C'" (click)="setFilter('C')">Sec C</button>
            </div>
          </div>
        </div>
      </header>

      <div class="page-content">
        <!-- Summary Metrics Bar -->
        <div class="summary-strip">
          <div class="metric-card total-card">
            <span class="m-label">Total Slots</span>
            <strong class="m-val">{{ totalCapacity }}</strong>
          </div>
          <div class="metric-card occupied-card">
            <span class="m-label">Occupied</span>
            <strong class="m-val occupied">{{ totalOccupied }}</strong>
          </div>
          <div class="metric-card available-card">
            <span class="m-label">Available</span>
            <strong class="m-val free">{{ totalAvailable }}</strong>
          </div>
          <div class="metric-card percent-card">
            <span class="m-label">Overall %</span>
            <strong class="m-val" [style.color]="getOccupancyColor(overallPct)">{{ overallPct.toFixed(1) }}%</strong>
          </div>
          <div class="metric-card sec-a-card" (click)="setFilter('A')">
            <span class="m-label">Section A</span>
            <strong class="m-val">{{ getSectionPct('A') }}%</strong>
          </div>
          <div class="metric-card sec-b-card" (click)="setFilter('B')">
            <span class="m-label">Section B</span>
            <strong class="m-val">{{ getSectionPct('B') }}%</strong>
          </div>
          <div class="metric-card sec-c-card" (click)="setFilter('C')">
            <span class="m-label">Section C</span>
            <strong class="m-val">{{ getSectionPct('C') }}%</strong>
          </div>
        </div>

        <!-- Loading State -->
        <div *ngIf="loading" class="state-card loader-box">
          <lucide-icon name="refresh-cw" class="spinning primary-spinner" [size]="40"></lucide-icon>
          <h3>Connecting to APU Parking Sensors...</h3>
          <p>Fetching real-time row geometry & occupancy from http://localhost:5070</p>
        </div>

        <!-- Error State -->
        <div *ngIf="!loading && errorMessage" class="state-card error-box">
          <lucide-icon name="alert-triangle" class="error-icon" [size]="48"></lucide-icon>
          <h3>API Connection Error</h3>
          <p class="err-msg">{{ errorMessage }}</p>
          <button (click)="fetchOccupancy(true)" class="retry-btn">
            <lucide-icon name="refresh-cw" [size]="16"></lucide-icon> Retry Connection
          </button>
        </div>

        <!-- Main Layout Canvas Stage -->
        <div *ngIf="!loading && mapRows.length > 0" class="layout-stage">
          <!-- Interactive Map Canvas -->
          <div class="map-panel">
            <div class="map-toolbar">
              <div class="legend">
                <span class="leg-sec sec-c"><i class="dot c"></i> Sec C (R–X)</span>
                <span class="leg-sec sec-b"><i class="dot b"></i> Sec B (G–Q)</span>
                <span class="leg-sec sec-a"><i class="dot a"></i> Sec A (A–F)</span>
              </div>
              <div class="status-legend">
                <span class="pulse-badge"><span class="pulse-dot"></span> LIVE 5070 FEED</span>
                <span class="time-label">Synced: {{ lastUpdatedTime }}</span>
                <span class="level-tag low"><i class="lvl low"></i> Low (&lt;50%)</span>
                <span class="level-tag medium"><i class="lvl medium"></i> Med (50-79%)</span>
                <span class="level-tag high"><i class="lvl high"></i> High (&ge;80%)</span>
              </div>
            </div>

            <!-- Floor Plan Canvas -->
            <div class="parking-map">
              <div class="map-bg"></div>

              <!-- Section Zone Outlines -->
              <div class="section-zone section-c" [class.highlight]="activeFilter === 'C' || activeFilter === 'ALL'">
                <div class="section-name">SECTION C</div>
              </div>
              <div class="section-zone section-b" [class.highlight]="activeFilter === 'B' || activeFilter === 'ALL'">
                <div class="section-name">SECTION B</div>
              </div>
              <div class="section-zone section-a" [class.highlight]="activeFilter === 'A' || activeFilter === 'ALL'">
                <div class="section-name">SECTION A</div>
              </div>

              <!-- Entry / Exit Driveway Markers -->
              <div class="entry-exit-arrows">
                <div class="arrow-group in">
                  <span>IN</span>
                  <lucide-icon name="navigation" [size]="12" class="arrow-in"></lucide-icon>
                </div>
                <div class="arrow-group out">
                  <lucide-icon name="navigation" [size]="12" class="arrow-out"></lucide-icon>
                  <span>OUT</span>
                </div>
              </div>

              <!-- Driveways -->
              <div class="road road-c">Driveway C</div>
              <div class="road road-b">Driveway B</div>
              <div class="road road-a">Driveway A</div>

              <!-- Interactive Row Blocks -->
              <button
                *ngFor="let row of filteredRows"
                class="parking-row"
                [class.horizontal]="row.orientation === 'horizontal'"
                [class.vertical]="row.orientation === 'vertical'"
                [class.selected]="selectedRow?.id === row.id"
                [attr.data-section]="row.section"
                [ngStyle]="getRowStyle(row)"
                (click)="selectRow(row)"
                [title]="getRowTooltip(row)"
              >
                <span class="row-fill" [ngStyle]="getFillStyle(row)"></span>
                <span class="row-shine"></span>
                <span class="row-label">{{ row.id }}</span>
                <span class="row-pct-pill" [style.color]="getOccupancyColor(row.occupancyPercentage)">
                  {{ row.occupancyPercentage.toFixed(0) }}%
                </span>
              </button>
            </div>
          </div>

          <!-- Interactive Inspector Detail Panel -->
          <div class="detail-panel">
            <div *ngIf="selectedRow; else noSelection" class="detail-content animate-up">
              <div class="detail-header" [attr.data-section]="selectedRow.section">
                <span>SECTION {{ selectedRow.section }}</span>
                <h2>Row {{ selectedRow.id }}</h2>
              </div>

              <!-- Circular Radial Occupancy Ring -->
              <div class="occupancy-ring" [style.--percent.%]="selectedRow.occupancyPercentage">
                <div class="ring-inner">
                  <strong [style.color]="getOccupancyColor(selectedRow.occupancyPercentage)">
                    {{ selectedRow.occupancyPercentage.toFixed(1) }}%
                  </strong>
                  <span class="status-chip" [style.color]="getOccupancyColor(selectedRow.occupancyPercentage)" [style.background]="getOccupancyBg(selectedRow.occupancyPercentage)">
                    {{ selectedRow.status }}
                  </span>
                </div>
              </div>

              <!-- Detailed Stats Grid -->
              <div class="detail-grid">
                <div class="grid-bit">
                  <span class="g-lbl">Total Capacity</span>
                  <strong class="g-val cap">{{ selectedRow.total }}</strong>
                </div>
                <div class="grid-bit">
                  <span class="g-lbl">Occupied</span>
                  <strong class="g-val busy">{{ selectedRow.occupied }}</strong>
                </div>
                <div class="grid-bit">
                  <span class="g-lbl">Available</span>
                  <strong class="g-val free">{{ selectedRow.available }}</strong>
                </div>
                <div class="grid-bit">
                  <span class="g-lbl">Section</span>
                  <strong class="g-val sec">{{ selectedRow.section }}</strong>
                </div>
              </div>

              <!-- Simulated Spot Occupancy Grid -->
              <div class="spot-matrix">
                <span class="matrix-lbl">Simulated Slot Occupancy (Row {{ selectedRow.id }})</span>
                <div class="matrix-grid">
                  <div *ngFor="let s of getSimulatedSpots(selectedRow)" 
                       class="spot-dot" 
                       [class.taken]="s.occupied" 
                       [title]="'Spot ' + selectedRow.id + s.index + ' (' + (s.occupied ? 'Occupied' : 'Free') + ')'"
                  ></div>
                </div>
              </div>
            </div>

            <ng-template #noSelection>
              <div class="empty-detail">
                <lucide-icon name="mouse-pointer-2" [size]="40" class="empty-icon"></lucide-icon>
                <h3>Select a Row</h3>
                <p>Click any row block on the APU floor plan map to inspect live occupancy details.</p>
              </div>
            </ng-template>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .page-shell { min-height: 100vh; background: #0b1329; color: white; font-family: 'Plus Jakarta Sans', sans-serif; }
    .app-header { background: rgba(15, 23, 42, 0.9); backdrop-filter: blur(12px); color: white; padding: 1rem 2rem; border-bottom: 1px solid rgba(255,255,255,0.08); position: sticky; top: 0; z-index: 100; }
    .header-wrap { max-width: 1400px; margin: 0 auto; display: flex; justify-content: space-between; align-items: center; gap: 1rem; }
    .header-left { display: flex; align-items: center; gap: 1rem; }
    .header-left h1 { margin: 0; font-size: 1.3rem; font-weight: 900; letter-spacing: -0.02em; }
    .sub-header { margin: 2px 0 0; font-size: 0.78rem; color: #94a3b8; font-weight: 600; }

    .back-btn { background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.1); width: 38px; height: 38px; border-radius: 10px; display: flex; align-items: center; justify-content: center; cursor: pointer; color: white; transition: 0.2s; }
    .back-btn:hover { background: rgba(255,255,255,0.18); }

    .header-actions { display: flex; align-items: center; gap: 1.25rem; }
    .refresh-btn { background: #2563eb; color: white; border: none; padding: 8px 16px; border-radius: 10px; font-weight: 800; font-size: 0.82rem; display: flex; align-items: center; gap: 6px; cursor: pointer; transition: 0.2s; }
    .refresh-btn:hover { background: #1d4ed8; }
    .refresh-btn:disabled { opacity: 0.6; cursor: not-allowed; }

    .filter-tabs { display: flex; background: rgba(30, 41, 59, 0.8); border: 1px solid rgba(255,255,255,0.08); border-radius: 10px; padding: 3px; gap: 2px; }
    .filter-tabs button { background: transparent; border: none; color: #94a3b8; font-size: 0.75rem; font-weight: 800; padding: 6px 12px; border-radius: 8px; cursor: pointer; transition: 0.2s; }
    .filter-tabs button.active { background: #2563eb; color: white; }

    .page-content { max-width: 1400px; margin: 0 auto; padding: 1.5rem 2rem; }

    .summary-strip { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 0.85rem; margin-bottom: 1.5rem; }
    .metric-card { background: rgba(30, 41, 59, 0.7); border: 1px solid rgba(255,255,255,0.08); border-radius: 1rem; padding: 0.85rem 1rem; cursor: pointer; transition: 0.2s; }
    .metric-card:hover { transform: translateY(-2px); border-color: rgba(255,255,255,0.2); }
    .m-label { display: block; font-size: 0.65rem; font-weight: 900; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; }
    .m-val { font-size: 1.35rem; font-weight: 900; display: block; margin-top: 2px; }
    .m-val.free { color: #10b981; }
    .m-val.occupied { color: #ef4444; }

    .sec-a-card { border-left: 4px solid #f59e0b; }
    .sec-b-card { border-left: 4px solid #14b8a6; }
    .sec-c-card { border-left: 4px solid #8b5cf6; }

    .state-card { background: rgba(30, 41, 59, 0.6); border: 1px solid rgba(255,255,255,0.08); border-radius: 1.5rem; padding: 4rem 2rem; text-align: center; margin-top: 2rem; }
    .loader-box h3 { font-size: 1.2rem; font-weight: 800; margin: 1rem 0 0.5rem; }
    .loader-box p { color: #94a3b8; font-size: 0.88rem; margin: 0; }
    .primary-spinner { color: #3b82f6; }

    .error-box { border-color: rgba(239, 68, 68, 0.3); background: rgba(239, 68, 68, 0.05); }
    .error-icon { color: #ef4444; margin-bottom: 0.5rem; }
    .error-box h3 { font-size: 1.25rem; font-weight: 800; margin: 0 0 0.5rem; color: #f87171; }
    .err-msg { color: #cbd5e1; font-size: 0.9rem; margin-bottom: 1.5rem; }
    .retry-btn { background: #ef4444; color: white; border: none; padding: 10px 20px; border-radius: 10px; font-weight: 800; font-size: 0.85rem; display: inline-flex; align-items: center; gap: 8px; cursor: pointer; transition: 0.2s; }
    .retry-btn:hover { background: #dc2626; }

    .layout-stage { display: grid; grid-template-columns: 1fr 310px; gap: 1.25rem; }

    .map-panel { background: rgba(15, 23, 42, 0.8); border: 1px solid rgba(255,255,255,0.08); border-radius: 1.5rem; padding: 1.25rem; display: flex; flex-direction: column; box-shadow: 0 15px 35px rgba(0,0,0,0.3); }

    .map-toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.85rem; font-size: 0.75rem; font-weight: 700; color: #94a3b8; }
    .legend { display: flex; gap: 1rem; }
    .leg-sec { display: flex; align-items: center; gap: 6px; font-size: 0.75rem; font-weight: 800; }
    .dot { width: 8px; height: 8px; border-radius: 50%; }
    .dot.a { background: #f59e0b; }
    .dot.b { background: #14b8a6; }
    .dot.c { background: #8b5cf6; }

    .status-legend { display: flex; gap: 1rem; align-items: center; }
    .pulse-badge { display: flex; align-items: center; gap: 6px; background: rgba(16, 185, 129, 0.15); color: #10b981; border: 1px solid rgba(16, 185, 129, 0.3); padding: 3px 10px; border-radius: 20px; font-size: 0.68rem; font-weight: 900; }
    .pulse-dot { width: 6px; height: 6px; background: #10b981; border-radius: 50%; animation: pulse 2s infinite; }
    .time-label { color: #64748b; font-weight: 700; font-size: 0.72rem; }

    .level-tag { display: flex; align-items: center; gap: 4px; font-size: 0.7rem; }
    .lvl { width: 8px; height: 8px; border-radius: 50%; }
    .lvl.low { background: #10b981; }
    .lvl.medium { background: #f59e0b; }
    .lvl.high { background: #ef4444; }

    .parking-map { position: relative; width: 100%; height: 580px; background: linear-gradient(135deg, #0f172a, #1e293b); border-radius: 1.25rem; border: 1px solid rgba(255,255,255,0.08); overflow: hidden; box-shadow: inset 0 0 40px rgba(0,0,0,0.5); }
    .map-bg { position: absolute; inset: 0; background-image: linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px); background-size: 32px 32px; opacity: 0.4; pointer-events: none; }

    .section-zone { position: absolute; border: 2px dashed rgba(255,255,255,0.15); border-radius: 1rem; pointer-events: none; transition: 0.3s; }
    .section-zone.highlight { border-style: solid; background: rgba(255,255,255,0.02); }

    .section-c { left: 3.5%; top: 3.5%; width: 63.5%; height: 40.0%; border-color: rgba(139, 92, 246, 0.4); background: rgba(139, 92, 246, 0.03); }
    .section-b { left: 3.5%; top: 45.5%; width: 63.5%; height: 50.5%; border-color: rgba(20, 184, 166, 0.4); background: rgba(20, 184, 166, 0.03); }
    .section-a { left: 69.5%; top: 38.0%; width: 28.0%; height: 58.0%; border-color: rgba(245, 158, 11, 0.4); background: rgba(245, 158, 11, 0.03); }

    .section-name { position: absolute; left: 10px; top: 8px; padding: 3px 10px; border-radius: 20px; background: rgba(30, 41, 59, 0.9); border: 1px solid rgba(255,255,255,0.1); color: #cbd5e1; font-size: 0.68rem; font-weight: 900; letter-spacing: 0.05em; z-index: 10; }

    .road { position: absolute; font-size: 0.7rem; font-weight: 800; color: #475569; letter-spacing: 0.1em; text-transform: uppercase; pointer-events: none; font-style: italic; }
    .road-c { left: 10%; top: 41%; }
    .road-b { left: 10%; top: 92%; }
    .road-a { right: 4%; top: 92%; }

    .entry-exit-arrows { position: absolute; left: 69.5%; top: 30%; display: flex; gap: 8px; padding: 4px 8px; background: rgba(30, 41, 59, 0.9); border-radius: 8px; border: 1px solid rgba(255,255,255,0.1); z-index: 15; pointer-events: none; }
    .arrow-group { display: flex; flex-direction: column; align-items: center; font-size: 0.6rem; font-weight: 900; }
    .arrow-group.in { color: #10b981; }
    .arrow-group.out { color: #ef4444; }
    .arrow-in { transform: rotate(180deg); }

    .parking-row { position: absolute; z-index: 5; border: 1px solid rgba(255,255,255,0.1); padding: 0; cursor: pointer; overflow: hidden; border-radius: 6px; background: #1e293b; transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1); }
    .parking-row:hover { transform: scale(1.04); z-index: 20; border-color: #3b82f6; box-shadow: 0 8px 20px rgba(0,0,0,0.4); }
    .parking-row.selected { outline: 3px solid #3b82f6; outline-offset: 2px; z-index: 25; }

    .parking-row[data-section='A'] { border-left: 4px solid #f59e0b; }
    .parking-row[data-section='B'] { border-left: 4px solid #14b8a6; }
    .parking-row[data-section='C'] { border-top: 4px solid #8b5cf6; }

    .row-fill { position: absolute; left: 0; bottom: 0; z-index: 1; transition: all 0.4s ease-out; }
    .horizontal .row-fill { top: 0; height: 100%; }
    .vertical .row-fill { width: 100%; }

    .row-label { position: absolute; z-index: 4; left: 50%; top: 50%; transform: translate(-50%, -50%); color: white; font-size: 0.72rem; font-weight: 900; text-shadow: 0 1px 3px rgba(0,0,0,0.8); pointer-events: none; white-space: nowrap; }
    .vertical .row-label { transform: translate(-50%, -50%) rotate(90deg); }

    .row-pct-pill { position: absolute; z-index: 4; right: 2px; bottom: 2px; font-size: 0.55rem; font-weight: 900; background: rgba(15, 23, 42, 0.8); padding: 1px 3px; border-radius: 4px; pointer-events: none; }
    .vertical .row-pct-pill { display: none; }

    .detail-panel { background: rgba(15, 23, 42, 0.8); border: 1px solid rgba(255,255,255,0.08); border-radius: 1.5rem; padding: 1.5rem; display: flex; flex-direction: column; box-shadow: 0 15px 35px rgba(0,0,0,0.3); }

    .detail-header { background: #1e293b; border-radius: 1.25rem; padding: 1.25rem; margin-bottom: 1.25rem; border: 1px solid rgba(255,255,255,0.08); }
    .detail-header[data-section='A'] { border-left: 5px solid #f59e0b; }
    .detail-header[data-section='B'] { border-left: 5px solid #14b8a6; }
    .detail-header[data-section='C'] { border-left: 5px solid #8b5cf6; }
    .detail-header span { font-size: 0.68rem; font-weight: 900; color: #94a3b8; letter-spacing: 0.05em; }
    .detail-header h2 { margin: 4px 0 0; font-size: 1.5rem; font-weight: 900; color: white; }

    .occupancy-ring { --percent: 0%; width: 140px; height: 140px; margin: 0 auto 1.5rem; border-radius: 50%; display: grid; place-items: center; background: conic-gradient(#3b82f6 var(--percent), rgba(255,255,255,0.08) 0); padding: 10px; }
    .ring-inner { width: 100%; height: 100%; background: #0f172a; border-radius: 50%; display: flex; flex-direction: column; align-items: center; justify-content: center; border: 1px solid rgba(255,255,255,0.05); }
    .ring-inner strong { font-size: 1.4rem; font-weight: 900; line-height: 1; }
    .status-chip { font-size: 0.65rem; font-weight: 900; padding: 2px 8px; border-radius: 10px; margin-top: 4px; text-transform: uppercase; }

    .detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; margin-bottom: 1.5rem; }
    .grid-bit { background: #1e293b; border: 1px solid rgba(255,255,255,0.05); padding: 10px; border-radius: 12px; }
    .g-lbl { display: block; font-size: 0.62rem; color: #64748b; font-weight: 800; text-transform: uppercase; }
    .g-val { font-size: 1.1rem; font-weight: 900; margin-top: 2px; display: block; }
    .g-val.free { color: #10b981; }
    .g-val.busy { color: #ef4444; }

    .spot-matrix { background: #1e293b; border-radius: 1rem; padding: 1rem; border: 1px solid rgba(255,255,255,0.05); }
    .matrix-lbl { display: block; font-size: 0.68rem; font-weight: 800; color: #94a3b8; margin-bottom: 8px; }
    .matrix-grid { display: grid; grid-template-columns: repeat(10, 1fr); gap: 5px; }
    .spot-dot { width: 100%; aspect-ratio: 1; background: rgba(16, 185, 129, 0.3); border-radius: 4px; border: 1px solid #10b981; transition: 0.2s; }
    .spot-dot.taken { background: rgba(239, 68, 68, 0.3); border-color: #ef4444; }

    .empty-detail { text-align: center; padding: 5rem 1rem; color: #64748b; }
    .empty-icon { color: #475569; margin-bottom: 1rem; }
    .empty-detail h3 { color: #cbd5e1; font-weight: 800; margin: 0 0 0.5rem; }
    .empty-detail p { font-size: 0.82rem; margin: 0; }

    .spinning { animation: rotate 1s linear infinite; }
    @keyframes rotate { to { transform: rotate(360deg); } }
    @keyframes pulse { 0% { opacity: 1; transform: scale(1); } 50% { opacity: 0.4; transform: scale(1.25); } 100% { opacity: 1; transform: scale(1); } }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
    .animate-fade-in { animation: fadeIn 0.4s ease-out; }
    @keyframes animateUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
    .animate-up { animation: animateUp 0.3s ease-out; }
  `]
})
export class ViewParkingSpots implements OnInit, OnDestroy {
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
    // Section A (Right vertical rows A to F, perfectly centered inside Section A box left: 69.5%, width: 28.0%, top: 38%, height: 58%)
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
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.mapRows = JSON.parse(JSON.stringify(this.baseRows));
    this.applyFilter();
    this.fetchOccupancy(false);

    // Auto poll every 60s
    this.sub = this.occupancyService.getPollOccupancy(60000).subscribe({
      next: (res) => {
        this.processOccupancyData(res);
      },
      error: (err) => {
        console.error('[ViewParkingSpots] Poll error:', err);
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
        console.error('[ViewParkingSpots] Fetch error:', err);
        this.errorMessage = 'Unable to connect to live parking occupancy server at http://localhost:5070.';
        this.loading = false;
        this.refreshing = false;
        this.cdr.detectChanges();
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
    const count = Math.min(row.total, 40);
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

  getRowTooltip(row: MapRow): string {
    return `Row ${row.id} (${row.section}) • ${row.occupied}/${row.total} occupied (${row.available} free) • ${row.occupancyPercentage.toFixed(1)}%`;
  }

  goBack() {
    this.router.navigate(['/']);
  }
}
