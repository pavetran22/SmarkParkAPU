import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { Subscription } from 'rxjs';
import { 
  AnalyticsService, 
  ForecastData, 
  SectionsResponse, 
  SectionOccupancy, 
  ComparisonData, 
  HourlyTrafficData, 
  TrendsData 
} from '../../services/analytics.service';

@Component({
  selector: 'app-analytics',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  template: `
    <div class="analytics-shell animate-fade-in">
      <!-- Top Sticky Navigation Bar -->
      <header class="app-header">
        <div class="header-wrap">
          <div class="brand-left">
            <button (click)="goBack()" class="back-btn" title="Back to Dashboard">
              <lucide-icon name="arrow-left" [size]="20"></lucide-icon>
            </button>
            <div class="title-group">
              <div class="badge-row">
                <span class="live-pill"><span class="pulse-dot"></span> LIVE AI ML ENGINE</span>
                <span class="port-badge">PORT 5060</span>
              </div>
              <h1>Parking Analytics & AI Forecast</h1>
            </div>
          </div>

          <div class="header-actions">
            <div class="last-updated" *ngIf="forecast">
              <lucide-icon name="clock" [size]="14"></lucide-icon>
              <span>Updated: {{ lastUpdatedTime }}</span>
            </div>
            <button (click)="refreshData()" class="refresh-btn" [class.spinning]="loading" title="Refresh Analytics">
              <lucide-icon name="refresh-cw" [size]="18"></lucide-icon>
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </header>

      <!-- Main Content Container -->
      <main class="page-content">
        
        <!-- Offline Warning with Retry Button -->
        <div *ngIf="hasError" class="error-banner animate-up">
          <div class="error-icon">
            <lucide-icon name="alert-triangle" [size]="22"></lucide-icon>
          </div>
          <div class="error-text">
            <strong>Unable to connect to live Analytics Server (http://localhost:5060)</strong>
            <p>Showing offline simulated analytics. Ensure the analytics engine is running.</p>
          </div>
          <button (click)="refreshData()" class="retry-btn">
            <lucide-icon name="refresh-cw" [size]="16"></lucide-icon>
            <span>Retry Connection</span>
          </button>
        </div>

        <!-- 1. Tomorrow's Parking Forecast Card -->
        <section class="section-block">
          <div class="card forecast-card animate-up" *ngIf="!loading || forecast">
            <div class="forecast-header">
              <div class="forecast-title-wrap">
                <div class="ai-chip">
                  <lucide-icon name="sparkles" [size]="16"></lucide-icon>
                  <span>AI Occupancy Forecast</span>
                </div>
                <h2>{{ forecast?.forecast_date || "Tomorrow's ML Prediction" }}</h2>
              </div>
              
              <div class="demand-badge" [ngClass]="forecast?.demand_level?.toLowerCase() || 'medium'">
                <span class="demand-indicator"></span>
                <span>{{ forecast?.demand_level || 'MEDIUM' }} DEMAND</span>
              </div>
            </div>

            <div class="advisory-banner">
              <lucide-icon name="info" [size]="20" class="advisory-icon"></lucide-icon>
              <p>{{ forecast?.advisory_message || 'Analyzing recent entry trends...' }}</p>
            </div>

            <div class="forecast-metrics-grid">
              <div class="f-metric-card entry">
                <div class="m-top">
                  <span class="m-label">PREDICTED ENTRIES</span>
                  <lucide-icon name="trending-up" [size]="18" class="text-teal"></lucide-icon>
                </div>
                <div class="m-value text-teal">{{ forecast?.predicted_entries || '---' }}</div>
                <span class="m-sub">Vehicles expected tomorrow</span>
              </div>

              <div class="f-metric-card exit">
                <div class="m-top">
                  <span class="m-label">PREDICTED EXITS</span>
                  <lucide-icon name="arrow-down-circle" [size]="18" class="text-amber"></lucide-icon>
                </div>
                <div class="m-value text-amber">{{ forecast?.predicted_exits || '---' }}</div>
                <span class="m-sub">Vehicles departing</span>
              </div>

              <div class="f-metric-card net">
                <div class="m-top">
                  <span class="m-label">ESTIMATED NET FLOW</span>
                  <lucide-icon name="activity" [size]="18" class="text-purple"></lucide-icon>
                </div>
                <div class="m-value text-purple">+{{ forecast?.predicted_net_flow || '0' }}</div>
                <span class="m-sub">Accumulated peak bays</span>
              </div>

              <div class="f-metric-card accuracy">
                <div class="m-top">
                  <span class="m-label">MODEL ACCURACY</span>
                  <lucide-icon name="shield-check" [size]="18" class="text-emerald"></lucide-icon>
                </div>
                <div class="accuracy-metrics">
                  <div class="acc-row">
                    <span>Entry R²</span>
                    <strong>{{ forecast?.model_accuracy?.entry_r2 || '0.884' }}</strong>
                  </div>
                  <div class="acc-row">
                    <span>Exit R²</span>
                    <strong>{{ forecast?.model_accuracy?.exit_r2 || '0.852' }}</strong>
                  </div>
                </div>
                <span class="m-sub">{{ forecast?.model_accuracy?.model_family || 'GradientBoosting' }}</span>
              </div>
            </div>
          </div>

          <!-- Skeleton Loader for Forecast -->
          <div *ngIf="loading && !forecast" class="card skeleton-card">
            <div class="skeleton-shimmer h-8 w-48 mb-4"></div>
            <div class="skeleton-shimmer h-16 w-full mb-4"></div>
            <div class="grid grid-cols-4 gap-4">
              <div class="skeleton-shimmer h-24"></div>
              <div class="skeleton-shimmer h-24"></div>
              <div class="skeleton-shimmer h-24"></div>
              <div class="skeleton-shimmer h-24"></div>
            </div>
          </div>
        </section>

        <!-- 2 & 3: Live Occupancy by Section (Donut) & Today vs Tomorrow (Bar Chart) -->
        <div class="grid-2-col">
          
          <!-- 2. Live Occupancy by Section -->
          <section class="card section-card animate-up">
            <div class="card-head">
              <div>
                <h3>Live Occupancy by Section</h3>
                <p class="card-subtitle">Tap a section slice to inspect capacity details</p>
              </div>
              <div class="capacity-chip" *ngIf="sectionsData">
                {{ sectionsData.total_occupied }} / {{ sectionsData.total_spots }} Parked
              </div>
            </div>

            <div class="donut-chart-container">
              <div class="svg-donut-wrap">
                <svg viewBox="0 0 200 200" class="donut-svg">
                  <!-- Section A Arc -->
                  <circle
                    cx="100" cy="100" r="70"
                    fill="transparent"
                    stroke="#3b82f6"
                    stroke-width="26"
                    [attr.stroke-dasharray]="getDonutDash(0)"
                    [attr.stroke-dashoffset]="getDonutOffset(0)"
                    (click)="selectSection(0)"
                    [class.active-slice]="selectedSectionIndex === 0"
                    class="donut-segment"
                  />
                  <!-- Section B Arc -->
                  <circle
                    cx="100" cy="100" r="70"
                    fill="transparent"
                    stroke="#10b981"
                    stroke-width="26"
                    [attr.stroke-dasharray]="getDonutDash(1)"
                    [attr.stroke-dashoffset]="getDonutOffset(1)"
                    (click)="selectSection(1)"
                    [class.active-slice]="selectedSectionIndex === 1"
                    class="donut-segment"
                  />
                  <!-- Section C Arc -->
                  <circle
                    cx="100" cy="100" r="70"
                    fill="transparent"
                    stroke="#8b5cf6"
                    stroke-width="26"
                    [attr.stroke-dasharray]="getDonutDash(2)"
                    [attr.stroke-dashoffset]="getDonutOffset(2)"
                    (click)="selectSection(2)"
                    [class.active-slice]="selectedSectionIndex === 2"
                    class="donut-segment"
                  />
                </svg>

                <div class="donut-center-info" (click)="selectedSectionIndex = null">
                  <span class="donut-center-val">{{ getSelectedOccupancyRate() }}%</span>
                  <span class="donut-center-lbl">{{ getSelectedSectionLabel() }}</span>
                </div>
              </div>

              <!-- Section Legend & Interactive Details -->
              <div class="section-legend-list">
                <div 
                  *ngFor="let sec of sectionsData?.sections; let i = index" 
                  class="legend-item" 
                  [class.selected]="selectedSectionIndex === i"
                  (click)="selectSection(i)"
                >
                  <div class="legend-color-bar" [style.background]="sec.color"></div>
                  <div class="legend-info">
                    <div class="legend-title-row">
                      <span class="sec-name">{{ sec.name }}</span>
                      <strong class="sec-rate">{{ sec.occupancy_rate }}%</strong>
                    </div>
                    <div class="sec-subtext">
                      <span>{{ sec.occupied }} / {{ sec.capacity }} Bays</span>
                      <span class="avail-tag">{{ sec.available }} Free</span>
                    </div>
                    <div class="oku-row" *ngIf="selectedSectionIndex === i">
                      <span>♿ OKU Bays: <strong>{{ sec.oku_occupied }} / {{ sec.oku_total }}</strong> In Use</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <!-- 3. Today vs Tomorrow Forecast (Bar Chart) -->
          <section class="card forecast-bar-card animate-up">
            <div class="card-head">
              <div>
                <h3>Today vs Tomorrow Traffic</h3>
                <p class="card-subtitle">Projected Volume vs Machine Learning Forecast</p>
              </div>
              <div class="bar-legend">
                <span class="legend-dot today"></span><span>Today</span>
                <span class="legend-dot tomorrow"></span><span>Tomorrow</span>
              </div>
            </div>

            <div class="bar-chart-body" *ngIf="comparison">
              <!-- Entries Group -->
              <div class="bar-group-card">
                <div class="group-title">
                  <lucide-icon name="trending-up" [size]="16" class="text-teal"></lucide-icon>
                  <span>Vehicle Entries</span>
                </div>
                <div class="bars-pair">
                  <!-- Today Bar -->
                  <div class="bar-wrapper" (mouseenter)="setBarTooltip('Today Entries', comparison.today.entries)" (mouseleave)="activeTooltip = null">
                    <div class="bar-fill today-in" [style.height.%]="getBarHeight(comparison.today.entries)">
                      <span class="bar-val">{{ comparison.today.entries }}</span>
                    </div>
                    <span class="bar-sublabel">Today</span>
                  </div>
                  <!-- Tomorrow Bar -->
                  <div class="bar-wrapper" (mouseenter)="setBarTooltip('Tomorrow ML Entries', comparison.tomorrow.entries)" (mouseleave)="activeTooltip = null">
                    <div class="bar-fill tomorrow-in" [style.height.%]="getBarHeight(comparison.tomorrow.entries)">
                      <span class="bar-val">{{ comparison.tomorrow.entries }}</span>
                    </div>
                    <span class="bar-sublabel">Tomorrow</span>
                  </div>
                </div>
              </div>

              <!-- Exits Group -->
              <div class="bar-group-card">
                <div class="group-title">
                  <lucide-icon name="arrow-down-circle" [size]="16" class="text-amber"></lucide-icon>
                  <span>Vehicle Exits</span>
                </div>
                <div class="bars-pair">
                  <!-- Today Bar -->
                  <div class="bar-wrapper" (mouseenter)="setBarTooltip('Today Exits', comparison.today.exits)" (mouseleave)="activeTooltip = null">
                    <div class="bar-fill today-out" [style.height.%]="getBarHeight(comparison.today.exits)">
                      <span class="bar-val">{{ comparison.today.exits }}</span>
                    </div>
                    <span class="bar-sublabel">Today</span>
                  </div>
                  <!-- Tomorrow Bar -->
                  <div class="bar-wrapper" (mouseenter)="setBarTooltip('Tomorrow ML Exits', comparison.tomorrow.exits)" (mouseleave)="activeTooltip = null">
                    <div class="bar-fill tomorrow-out" [style.height.%]="getBarHeight(comparison.tomorrow.exits)">
                      <span class="bar-val">{{ comparison.tomorrow.exits }}</span>
                    </div>
                    <span class="bar-sublabel">Tomorrow</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Tooltip Toast -->
            <div class="bar-tooltip" *ngIf="activeTooltip">
              <strong>{{ activeTooltip.label }}:</strong> {{ activeTooltip.val }} vehicles
            </div>
          </section>

        </div>

        <!-- 4. Hourly Traffic Line Chart (Interactive Multi-Series) -->
        <section class="card line-chart-card animate-up">
          <div class="card-head">
            <div>
              <h3>24-Hour Traffic Flow (Live vs Research Baseline)</h3>
              <p class="card-subtitle">Toggle series and hover points to inspect hourly traffic volume</p>
            </div>
            
            <!-- Series Toggle Pills -->
            <div class="series-toggles">
              <button 
                class="toggle-pill teal-solid" 
                [class.disabled]="!seriesVisible.liveEntries"
                (click)="seriesVisible.liveEntries = !seriesVisible.liveEntries"
              >
                <span class="toggle-line solid-teal"></span>
                <span>Live Entries</span>
              </button>

              <button 
                class="toggle-pill amber-solid" 
                [class.disabled]="!seriesVisible.liveExits"
                (click)="seriesVisible.liveExits = !seriesVisible.liveExits"
              >
                <span class="toggle-line solid-amber"></span>
                <span>Live Exits</span>
              </button>

              <button 
                class="toggle-pill teal-dashed" 
                [class.disabled]="!seriesVisible.avgEntries"
                (click)="seriesVisible.avgEntries = !seriesVisible.avgEntries"
              >
                <span class="toggle-line dashed-teal"></span>
                <span>Avg Entries (Baseline)</span>
              </button>

              <button 
                class="toggle-pill amber-dashed" 
                [class.disabled]="!seriesVisible.avgExits"
                (click)="seriesVisible.avgExits = !seriesVisible.avgExits"
              >
                <span class="toggle-line dashed-amber"></span>
                <span>Avg Exits (Baseline)</span>
              </button>
            </div>
          </div>

          <!-- SVG Interactive Line Graph -->
          <div class="line-svg-container" *ngIf="hourlyTraffic">
            <svg viewBox="0 0 800 260" class="line-svg" preserveAspectRatio="none">
              <defs>
                <linearGradient id="liveEntriesGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stop-color="#06b6d4" stop-opacity="0.25"/>
                  <stop offset="100%" stop-color="#06b6d4" stop-opacity="0.0"/>
                </linearGradient>
              </defs>

              <!-- Horizontal Grid Lines -->
              <line x1="40" y1="30" x2="780" y2="30" stroke="#334155" stroke-dasharray="3 3"/>
              <line x1="40" y1="85" x2="780" y2="85" stroke="#334155" stroke-dasharray="3 3"/>
              <line x1="40" y1="140" x2="780" y2="140" stroke="#334155" stroke-dasharray="3 3"/>
              <line x1="40" y1="195" x2="780" y2="195" stroke="#334155" stroke-dasharray="3 3"/>

              <!-- Y-Axis Labels -->
              <text x="10" y="35" class="svg-axis-label">250</text>
              <text x="10" y="90" class="svg-axis-label">180</text>
              <text x="10" y="145" class="svg-axis-label">100</text>
              <text x="10" y="200" class="svg-axis-label">20</text>

              <!-- Research Avg Entries (Dashed Teal) -->
              <path
                *ngIf="seriesVisible.avgEntries"
                [attr.d]="getLinePath(hourlyTraffic.research_avg_entries)"
                fill="none"
                stroke="#06b6d4"
                stroke-width="2"
                stroke-dasharray="5 5"
                opacity="0.75"
              />

              <!-- Research Avg Exits (Dashed Amber) -->
              <path
                *ngIf="seriesVisible.avgExits"
                [attr.d]="getLinePath(hourlyTraffic.research_avg_exits)"
                fill="none"
                stroke="#f59e0b"
                stroke-width="2"
                stroke-dasharray="5 5"
                opacity="0.75"
              />

              <!-- Live Entries Path (Solid Teal) -->
              <path
                *ngIf="seriesVisible.liveEntries"
                [attr.d]="getLinePath(hourlyTraffic.live_entries)"
                fill="none"
                stroke="#06b6d4"
                stroke-width="3.5"
                class="glow-teal"
              />

              <!-- Live Exits Path (Solid Amber) -->
              <path
                *ngIf="seriesVisible.liveExits"
                [attr.d]="getLinePath(hourlyTraffic.live_exits)"
                fill="none"
                stroke="#f59e0b"
                stroke-width="3.5"
                class="glow-amber"
              />

              <!-- Interactive Data Points -->
              <ng-container *ngFor="let h of hourlyTraffic.hours; let i = index">
                <!-- Live Entry Dot -->
                <circle
                  *ngIf="seriesVisible.liveEntries && hourlyTraffic.live_entries[i] !== null"
                  [attr.cx]="getXCoord(i)"
                  [attr.cy]="getYCoord(hourlyTraffic.live_entries[i]!)"
                  r="5"
                  fill="#06b6d4"
                  stroke="#0f172a"
                  stroke-width="2"
                  class="interactive-dot"
                  (mouseenter)="setLineTooltip(h, 'Live Entry', hourlyTraffic.live_entries[i])"
                  (mouseleave)="hoveredLinePoint = null"
                />

                <!-- Live Exit Dot -->
                <circle
                  *ngIf="seriesVisible.liveExits && hourlyTraffic.live_exits[i] !== null"
                  [attr.cx]="getXCoord(i)"
                  [attr.cy]="getYCoord(hourlyTraffic.live_exits[i]!)"
                  r="5"
                  fill="#f59e0b"
                  stroke="#0f172a"
                  stroke-width="2"
                  class="interactive-dot"
                  (mouseenter)="setLineTooltip(h, 'Live Exit', hourlyTraffic.live_exits[i])"
                  (mouseleave)="hoveredLinePoint = null"
                />
              </ng-container>

              <!-- X-Axis Labels (Every 2 hours) -->
              <ng-container *ngFor="let h of hourlyTraffic.hours; let i = index">
                <text 
                  *ngIf="i % 2 === 0" 
                  [attr.x]="getXCoord(i)" 
                  y="235" 
                  text-anchor="middle" 
                  class="svg-axis-label"
                >
                  {{ h }}
                </text>
              </ng-container>
            </svg>

            <!-- Line Chart Hover Tooltip Pill -->
            <div class="line-point-tooltip" *ngIf="hoveredLinePoint">
              <span class="t-hour">{{ hoveredLinePoint.hour }}</span>
              <span class="t-type">{{ hoveredLinePoint.type }}:</span>
              <strong>{{ hoveredLinePoint.val }} cars</strong>
            </div>
          </div>
        </section>

        <!-- 5. Weekly / Monthly Trends Toggle Section -->
        <section class="card trends-card animate-up">
          <div class="card-head">
            <div>
              <h3>Historical Trend & Peak Occupancy Analysis</h3>
              <p class="card-subtitle">Switch timeframe to analyze cyclical parking demand patterns</p>
            </div>

            <!-- Week / Month Switcher -->
            <div class="period-switcher">
              <button 
                class="period-btn" 
                [class.active]="selectedPeriod === 'week'"
                (click)="switchPeriod('week')"
              >
                <span>This Week</span>
              </button>
              <button 
                class="period-btn" 
                [class.active]="selectedPeriod === 'month'"
                (click)="switchPeriod('month')"
              >
                <span>This Month</span>
              </button>
            </div>
          </div>

          <!-- Trend Bar Graph with Peak Occupancy Line -->
          <div class="trends-container" *ngIf="trendsData">
            <div class="trends-scroll-wrap">
              <div class="trend-col" *ngFor="let label of trendsData.labels; let i = index">
                <div class="trend-bars-stack">
                  <!-- Occupancy Peak Pill -->
                  <span class="peak-pill">{{ trendsData.occupancy_peak_pct[i] }}%</span>

                  <!-- Entry & Exit bars -->
                  <div class="bar-pair-trend">
                    <div 
                      class="t-bar entry-bar" 
                      [style.height.px]="(trendsData.entries[i] / 1600) * 120"
                      title="Entries: {{ trendsData.entries[i] }}"
                    ></div>
                    <div 
                      class="t-bar exit-bar" 
                      [style.height.px]="(trendsData.exits[i] / 1600) * 120"
                      title="Exits: {{ trendsData.exits[i] }}"
                    ></div>
                  </div>
                </div>
                <span class="trend-lbl">{{ label }}</span>
              </div>
            </div>

            <div class="trends-legend">
              <div class="t-legend-item"><span class="t-dot entry"></span><span>Daily Entries</span></div>
              <div class="t-legend-item"><span class="t-dot exit"></span><span>Daily Exits</span></div>
              <div class="t-legend-item"><span class="t-badge-dot"></span><span>Peak Occupancy Rate (%)</span></div>
            </div>
          </div>
        </section>

      </main>
    </div>
  `,
  styles: [`
    .analytics-shell {
      min-height: 100vh;
      background: #090d16;
      color: #f1f5f9;
      font-family: 'Inter', system-ui, -apple-system, sans-serif;
      padding-bottom: 4rem;
    }

    .app-header {
      background: rgba(15, 23, 42, 0.85);
      backdrop-filter: blur(12px);
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      position: sticky;
      top: 0;
      z-index: 100;
      padding: 1.25rem 2rem;
    }

    .header-wrap {
      max-width: 1200px;
      margin: 0 auto;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .brand-left {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .back-btn {
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid rgba(255, 255, 255, 0.1);
      color: #94a3b8;
      width: 40px;
      height: 40px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: 0.2s;
    }
    .back-btn:hover {
      background: rgba(255, 255, 255, 0.12);
      color: white;
      transform: translateX(-2px);
    }

    .title-group h1 {
      margin: 0.25rem 0 0;
      font-size: 1.35rem;
      font-weight: 800;
      color: #f8fafc;
      letter-spacing: -0.02em;
    }

    .badge-row {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .live-pill {
      font-size: 0.65rem;
      font-weight: 800;
      color: #06b6d4;
      background: rgba(6, 182, 212, 0.12);
      border: 1px solid rgba(6, 182, 212, 0.3);
      padding: 2px 8px;
      border-radius: 6px;
      display: flex;
      align-items: center;
      gap: 5px;
      letter-spacing: 0.5px;
    }

    .pulse-dot {
      width: 6px;
      height: 6px;
      background: #06b6d4;
      border-radius: 50%;
      animation: pulse 1.8s infinite;
    }
    @keyframes pulse {
      0% { transform: scale(0.9); opacity: 1; }
      50% { transform: scale(1.4); opacity: 0.4; }
      100% { transform: scale(0.9); opacity: 1; }
    }

    .port-badge {
      font-size: 0.65rem;
      font-weight: 800;
      color: #94a3b8;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      padding: 2px 6px;
      border-radius: 6px;
    }

    .header-actions {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .last-updated {
      font-size: 0.8rem;
      color: #64748b;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .refresh-btn {
      display: flex;
      align-items: center;
      gap: 8px;
      background: linear-gradient(135deg, #1e293b, #0f172a);
      border: 1px solid rgba(255, 255, 255, 0.12);
      color: #f1f5f9;
      padding: 8px 16px;
      border-radius: 12px;
      font-weight: 700;
      font-size: 0.85rem;
      cursor: pointer;
      transition: 0.2s;
    }
    .refresh-btn:hover {
      background: #334155;
      transform: translateY(-1px);
    }
    .refresh-btn.spinning lucide-icon {
      animation: spin 1s linear infinite;
    }
    @keyframes spin { 100% { transform: rotate(360deg); } }

    .page-content {
      max-width: 1200px;
      margin: 0 auto;
      padding: 2rem 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 2rem;
    }

    /* Cards Common */
    .card {
      background: rgba(15, 23, 42, 0.75);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 20px;
      padding: 1.75rem;
      box-shadow: 0 10px 30px -10px rgba(0, 0, 0, 0.5);
    }

    .card-head {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 1.5rem;
      flex-wrap: wrap;
      gap: 1rem;
    }
    .card-head h3 {
      font-size: 1.2rem;
      font-weight: 800;
      margin: 0;
      color: #f8fafc;
    }
    .card-subtitle {
      font-size: 0.85rem;
      color: #94a3b8;
      margin: 4px 0 0;
    }

    /* Error Banner */
    .error-banner {
      background: rgba(239, 68, 68, 0.12);
      border: 1px solid rgba(239, 68, 68, 0.3);
      padding: 1rem 1.5rem;
      border-radius: 16px;
      display: flex;
      align-items: center;
      gap: 1rem;
    }
    .error-icon { color: #ef4444; }
    .error-text { flex: 1; }
    .error-text strong { display: block; color: #fca5a5; font-size: 0.95rem; }
    .error-text p { margin: 2px 0 0; font-size: 0.8rem; color: #f87171; }
    .retry-btn {
      display: flex;
      align-items: center;
      gap: 6px;
      background: #ef4444;
      color: white;
      border: none;
      padding: 8px 14px;
      border-radius: 10px;
      font-size: 0.8rem;
      font-weight: 700;
      cursor: pointer;
    }

    /* 1. Forecast Card */
    .forecast-card {
      background: linear-gradient(135deg, rgba(15, 23, 42, 0.9) 0%, rgba(30, 41, 59, 0.6) 100%);
      border: 1px solid rgba(6, 182, 212, 0.25);
    }
    .forecast-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.25rem;
      flex-wrap: wrap;
      gap: 1rem;
    }
    .ai-chip {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 0.75rem;
      font-weight: 800;
      color: #38bdf8;
      background: rgba(56, 189, 248, 0.12);
      border: 1px solid rgba(56, 189, 248, 0.3);
      padding: 4px 10px;
      border-radius: 8px;
      margin-bottom: 0.5rem;
    }
    .forecast-title-wrap h2 {
      margin: 0;
      font-size: 1.5rem;
      font-weight: 900;
      color: #ffffff;
    }
    .demand-badge {
      padding: 8px 16px;
      border-radius: 12px;
      font-weight: 800;
      font-size: 0.85rem;
      display: flex;
      align-items: center;
      gap: 8px;
      letter-spacing: 0.5px;
    }
    .demand-badge.low { background: rgba(16, 185, 129, 0.15); border: 1px solid #10b981; color: #10b981; }
    .demand-badge.medium { background: rgba(245, 158, 11, 0.15); border: 1px solid #f59e0b; color: #f59e0b; }
    .demand-badge.high { background: rgba(239, 68, 68, 0.15); border: 1px solid #ef4444; color: #ef4444; }
    .demand-indicator { width: 8px; height: 8px; border-radius: 50%; background: currentColor; }

    .advisory-banner {
      background: rgba(255, 255, 255, 0.04);
      border-left: 4px solid #06b6d4;
      padding: 1rem 1.25rem;
      border-radius: 10px;
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 1.75rem;
    }
    .advisory-icon { color: #06b6d4; flex-shrink: 0; }
    .advisory-banner p { margin: 0; font-size: 0.95rem; color: #cbd5e1; font-weight: 500; }

    .forecast-metrics-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 1.25rem;
    }
    .f-metric-card {
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 16px;
      padding: 1.25rem;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .m-top { display: flex; justify-content: space-between; align-items: center; }
    .m-label { font-size: 0.7rem; font-weight: 800; color: #94a3b8; letter-spacing: 0.5px; }
    .m-value { font-size: 2rem; font-weight: 900; line-height: 1.1; margin: 4px 0; }
    .m-sub { font-size: 0.75rem; color: #64748b; font-weight: 500; }

    .text-teal { color: #06b6d4; }
    .text-amber { color: #f59e0b; }
    .text-purple { color: #a855f7; }
    .text-emerald { color: #10b981; }

    .accuracy-metrics {
      display: flex;
      flex-direction: column;
      gap: 4px;
      margin: 4px 0;
    }
    .acc-row {
      display: flex;
      justify-content: space-between;
      font-size: 0.85rem;
      color: #94a3b8;
    }
    .acc-row strong { color: #10b981; font-weight: 800; }

    /* 2 & 3 Grid */
    .grid-2-col {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 2rem;
    }

    /* 2. Donut Section */
    .capacity-chip {
      font-size: 0.8rem;
      font-weight: 800;
      background: rgba(255, 255, 255, 0.06);
      padding: 6px 12px;
      border-radius: 8px;
      color: #cbd5e1;
    }
    .donut-chart-container {
      display: flex;
      align-items: center;
      gap: 2rem;
    }
    .svg-donut-wrap {
      position: relative;
      width: 180px;
      height: 180px;
      flex-shrink: 0;
    }
    .donut-svg {
      width: 100%;
      height: 100%;
      transform: rotate(-90deg);
    }
    .donut-segment {
      cursor: pointer;
      transition: stroke-width 0.2s, opacity 0.2s;
    }
    .donut-segment:hover, .donut-segment.active-slice {
      stroke-width: 32;
      opacity: 0.9;
    }
    .donut-center-info {
      position: absolute;
      inset: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      cursor: pointer;
    }
    .donut-center-val { font-size: 1.6rem; font-weight: 900; color: #ffffff; }
    .donut-center-lbl { font-size: 0.75rem; color: #94a3b8; font-weight: 700; }

    .section-legend-list {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }
    .legend-item {
      display: flex;
      align-items: center;
      gap: 12px;
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid rgba(255, 255, 255, 0.05);
      padding: 10px 14px;
      border-radius: 12px;
      cursor: pointer;
      transition: 0.2s;
    }
    .legend-item:hover, .legend-item.selected {
      background: rgba(255, 255, 255, 0.08);
      border-color: rgba(255, 255, 255, 0.15);
      transform: translateX(4px);
    }
    .legend-color-bar { width: 6px; height: 36px; border-radius: 4px; }
    .legend-info { flex: 1; }
    .legend-title-row { display: flex; justify-content: space-between; font-size: 0.9rem; font-weight: 700; color: #f1f5f9; }
    .sec-subtext { display: flex; justify-content: space-between; font-size: 0.75rem; color: #94a3b8; margin-top: 2px; }
    .avail-tag { color: #10b981; font-weight: 700; }
    .oku-row { font-size: 0.75rem; color: #38bdf8; margin-top: 4px; padding-top: 4px; border-top: 1px dashed rgba(255,255,255,0.1); }

    /* 3. Bar Chart Card */
    .bar-legend {
      display: flex;
      align-items: center;
      gap: 12px;
      font-size: 0.8rem;
      color: #94a3b8;
    }
    .legend-dot { width: 10px; height: 10px; border-radius: 3px; }
    .legend-dot.today { background: #3b82f6; }
    .legend-dot.tomorrow { background: #06b6d4; }

    .bar-chart-body {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1.5rem;
      margin-top: 1rem;
    }
    .bar-group-card {
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid rgba(255, 255, 255, 0.05);
      border-radius: 16px;
      padding: 1.25rem;
    }
    .group-title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 0.85rem;
      font-weight: 800;
      color: #cbd5e1;
      margin-bottom: 1.25rem;
    }
    .bars-pair {
      height: 140px;
      display: flex;
      align-items: flex-end;
      justify-content: space-around;
      gap: 1rem;
      border-bottom: 2px solid #334155;
      padding-bottom: 6px;
    }
    .bar-wrapper {
      flex: 1;
      height: 100%;
      display: flex;
      flex-direction: column;
      justify-content: flex-end;
      align-items: center;
      cursor: pointer;
    }
    .bar-fill {
      width: 100%;
      border-radius: 6px 6px 0 0;
      position: relative;
      display: flex;
      align-items: flex-start;
      justify-content: center;
      padding-top: 4px;
      transition: height 0.5s ease-out, filter 0.2s;
    }
    .bar-fill:hover { filter: brightness(1.25); }
    .bar-val { font-size: 0.75rem; font-weight: 900; color: #0f172a; }
    .bar-sublabel { font-size: 0.7rem; color: #94a3b8; margin-top: 6px; font-weight: 600; }

    .today-in { background: linear-gradient(180deg, #60a5fa, #2563eb); }
    .tomorrow-in { background: linear-gradient(180deg, #22d3ee, #0891b2); }
    .today-out { background: linear-gradient(180deg, #fbbf24, #d97706); }
    .tomorrow-out { background: linear-gradient(180deg, #fb923c, #ea580c); }

    .bar-tooltip {
      margin-top: 1rem;
      background: #1e293b;
      padding: 6px 14px;
      border-radius: 8px;
      font-size: 0.8rem;
      color: #f1f5f9;
      text-align: center;
      animation: fadeIn 0.2s;
    }

    /* 4. Line Chart */
    .series-toggles {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    .toggle-pill {
      display: flex;
      align-items: center;
      gap: 6px;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      color: #cbd5e1;
      padding: 6px 12px;
      border-radius: 8px;
      font-size: 0.75rem;
      font-weight: 700;
      cursor: pointer;
      transition: 0.2s;
    }
    .toggle-pill.disabled {
      opacity: 0.35;
      text-decoration: line-through;
    }
    .toggle-line { width: 14px; height: 3px; border-radius: 2px; }
    .solid-teal { background: #06b6d4; }
    .solid-amber { background: #f59e0b; }
    .dashed-teal { background: repeating-linear-gradient(90deg, #06b6d4, #06b6d4 3px, transparent 3px, transparent 6px); }
    .dashed-amber { background: repeating-linear-gradient(90deg, #f59e0b, #f59e0b 3px, transparent 3px, transparent 6px); }

    .line-svg-container {
      position: relative;
      width: 100%;
      height: 260px;
      margin-top: 1rem;
    }
    .line-svg {
      width: 100%;
      height: 100%;
    }
    .svg-axis-label {
      fill: #64748b;
      font-size: 11px;
      font-weight: 600;
      font-family: inherit;
    }
    .glow-teal { filter: drop-shadow(0 0 6px rgba(6, 182, 212, 0.6)); }
    .glow-amber { filter: drop-shadow(0 0 6px rgba(245, 158, 11, 0.6)); }
    .interactive-dot { cursor: pointer; transition: r 0.2s; }
    .interactive-dot:hover { r: 8; }

    .line-point-tooltip {
      position: absolute;
      top: 10px;
      right: 20px;
      background: rgba(15, 23, 42, 0.95);
      border: 1px solid #06b6d4;
      padding: 6px 14px;
      border-radius: 8px;
      font-size: 0.8rem;
      display: flex;
      gap: 8px;
      align-items: center;
    }
    .t-hour { color: #94a3b8; font-weight: 700; }
    .t-type { color: #38bdf8; }

    /* 5. Weekly/Monthly Trends */
    .period-switcher {
      display: flex;
      background: rgba(255, 255, 255, 0.05);
      border-radius: 10px;
      padding: 3px;
    }
    .period-btn {
      background: transparent;
      border: none;
      color: #94a3b8;
      padding: 6px 16px;
      border-radius: 8px;
      font-weight: 700;
      font-size: 0.8rem;
      cursor: pointer;
      transition: 0.2s;
    }
    .period-btn.active {
      background: #06b6d4;
      color: #0f172a;
      box-shadow: 0 4px 10px -2px rgba(6, 182, 212, 0.4);
    }

    .trends-container { margin-top: 1.5rem; }
    .trends-scroll-wrap {
      display: flex;
      gap: 1.25rem;
      overflow-x: auto;
      padding-bottom: 1rem;
    }
    .trend-col {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      min-width: 54px;
    }
    .trend-bars-stack {
      height: 160px;
      display: flex;
      flex-direction: column;
      justify-content: flex-end;
      align-items: center;
      gap: 6px;
    }
    .peak-pill {
      font-size: 0.65rem;
      font-weight: 800;
      color: #38bdf8;
      background: rgba(56, 189, 248, 0.15);
      padding: 2px 5px;
      border-radius: 4px;
    }
    .bar-pair-trend {
      display: flex;
      align-items: flex-end;
      gap: 4px;
      height: 120px;
      border-bottom: 2px solid #334155;
    }
    .t-bar {
      width: 14px;
      border-radius: 4px 4px 0 0;
      transition: height 0.4s;
    }
    .entry-bar { background: #06b6d4; }
    .exit-bar { background: #f59e0b; }
    .trend-lbl { font-size: 0.75rem; color: #94a3b8; font-weight: 700; }

    .trends-legend {
      display: flex;
      justify-content: center;
      gap: 2rem;
      margin-top: 1.5rem;
      font-size: 0.8rem;
      color: #94a3b8;
    }
    .t-legend-item { display: flex; align-items: center; gap: 6px; }
    .t-dot { width: 12px; height: 12px; border-radius: 3px; }
    .t-dot.entry { background: #06b6d4; }
    .t-dot.exit { background: #f59e0b; }
    .t-badge-dot { width: 12px; height: 12px; border-radius: 3px; background: rgba(56, 189, 248, 0.3); border: 1px solid #38bdf8; }

    /* Skeleton Loading */
    .skeleton-shimmer {
      background: linear-gradient(90deg, rgba(255,255,255,0.03) 25%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.03) 75%);
      background-size: 200% 100%;
      animation: shimmer 1.5s infinite;
      border-radius: 8px;
    }
    @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

    .animate-up { animation: animateUp 0.4s ease-out; }
    @keyframes animateUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }

    @media (max-width: 900px) {
      .forecast-metrics-grid { grid-template-columns: 1fr 1fr; }
      .grid-2-col { grid-template-columns: 1fr; }
      .donut-chart-container { flex-direction: column; }
    }
  `]
})
export class Analytics implements OnInit, OnDestroy {
  loading = true;
  hasError = false;
  lastUpdatedTime = '';

  forecast: ForecastData | null = null;
  sectionsData: SectionsResponse | null = null;
  comparison: ComparisonData | null = null;
  hourlyTraffic: HourlyTrafficData | null = null;
  trendsData: TrendsData | null = null;

  selectedSectionIndex: number | null = 0;
  selectedPeriod: 'week' | 'month' = 'week';

  activeTooltip: { label: string; val: number } | null = null;
  hoveredLinePoint: { hour: string; type: string; val: number | null } | null = null;

  seriesVisible = {
    liveEntries: true,
    liveExits: true,
    avgEntries: true,
    avgExits: true
  };

  private sub = new Subscription();

  constructor(
    private analyticsService: AnalyticsService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.refreshData();

    // Auto-refresh every 60 seconds
    this.sub.add(
      this.analyticsService.getPollingStream().subscribe(tick => {
        if (tick > 0) {
          this.refreshData(false);
        }
      })
    );
  }

  ngOnDestroy() {
    this.sub.unsubscribe();
  }

  refreshData(showSpinner = true) {
    if (showSpinner) this.loading = true;
    this.hasError = false;

    this.sub.add(
      this.analyticsService.getForecast().subscribe({
        next: (res) => {
          this.forecast = res;
          this.lastUpdatedTime = res.updated_at || new Date().toLocaleTimeString();
          this.loading = false;
          this.cdr.detectChanges();
        },
        error: () => {
          this.hasError = true;
          this.loading = false;
          this.cdr.detectChanges();
        }
      })
    );

    this.sub.add(
      this.analyticsService.getSections().subscribe(res => {
        this.sectionsData = res;
        this.cdr.detectChanges();
      })
    );

    this.sub.add(
      this.analyticsService.getComparison().subscribe(res => {
        this.comparison = res;
        this.cdr.detectChanges();
      })
    );

    this.sub.add(
      this.analyticsService.getHourlyTraffic().subscribe(res => {
        this.hourlyTraffic = res;
        this.cdr.detectChanges();
      })
    );

    this.loadTrends(this.selectedPeriod);
  }

  loadTrends(period: 'week' | 'month') {
    this.sub.add(
      this.analyticsService.getTrends(period).subscribe(res => {
        this.trendsData = res;
        this.cdr.detectChanges();
      })
    );
  }

  switchPeriod(period: 'week' | 'month') {
    this.selectedPeriod = period;
    this.loadTrends(period);
  }

  selectSection(index: number) {
    this.selectedSectionIndex = this.selectedSectionIndex === index ? null : index;
    this.cdr.detectChanges();
  }

  getSelectedOccupancyRate(): number {
    if (this.selectedSectionIndex !== null && this.sectionsData?.sections[this.selectedSectionIndex]) {
      return this.sectionsData.sections[this.selectedSectionIndex].occupancy_rate;
    }
    return this.sectionsData?.overall_rate || 68.4;
  }

  getSelectedSectionLabel(): string {
    if (this.selectedSectionIndex !== null && this.sectionsData?.sections[this.selectedSectionIndex]) {
      return this.sectionsData.sections[this.selectedSectionIndex].id + ' Occupied';
    }
    return 'Total Occupied';
  }

  getDonutDash(index: number): string {
    const circumference = 2 * Math.PI * 70; // ~439.8
    const total = this.sectionsData?.total_spots || 1119;
    const sec = this.sectionsData?.sections[index];
    if (!sec) return `0 ${circumference}`;

    const sliceLength = (sec.capacity / total) * circumference;
    return `${sliceLength - 4} ${circumference - sliceLength + 4}`;
  }

  getDonutOffset(index: number): number {
    const circumference = 2 * Math.PI * 70;
    const total = this.sectionsData?.total_spots || 1119;
    let priorCapacity = 0;
    for (let i = 0; i < index; i++) {
      priorCapacity += this.sectionsData?.sections[i]?.capacity || 0;
    }
    return -((priorCapacity / total) * circumference);
  }

  getBarHeight(val: number): number {
    return Math.min(100, Math.max(10, (val / 1600) * 100));
  }

  setBarTooltip(label: string, val: number) {
    this.activeTooltip = { label, val };
  }

  // SVG Line Chart Helpers
  getXCoord(index: number): number {
    const padding = 50;
    const width = 720;
    return padding + (index / 23) * width;
  }

  getYCoord(val: number): number {
    const height = 180;
    const topPadding = 25;
    const maxVal = 260;
    return topPadding + height - (Math.min(maxVal, val) / maxVal) * height;
  }

  getLinePath(points: (number | null)[]): string {
    let d = '';
    let isFirst = true;

    for (let i = 0; i < points.length; i++) {
      const val = points[i];
      if (val === null || val === undefined) continue;

      const x = this.getXCoord(i);
      const y = this.getYCoord(val);

      if (isFirst) {
        d += `M ${x} ${y}`;
        isFirst = false;
      } else {
        d += ` L ${x} ${y}`;
      }
    }
    return d;
  }

  setLineTooltip(hour: string, type: string, val: number | null) {
    this.hoveredLinePoint = { hour, type, val };
  }

  goBack() {
    this.router.navigate(['/']);
  }
}
