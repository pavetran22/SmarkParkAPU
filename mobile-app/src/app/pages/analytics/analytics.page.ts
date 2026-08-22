import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, NavController } from '@ionic/angular';
import { Subscription } from 'rxjs';
import { 
  AnalyticsService, 
  ForecastData, 
  SectionsResponse, 
  ComparisonData, 
  HourlyTrafficData, 
  TrendsData 
} from '../../services/analytics.service';

@Component({
  selector: 'app-analytics',
  templateUrl: './analytics.page.html',
  styleUrls: ['./analytics.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule]
})
export class AnalyticsPage implements OnInit, OnDestroy {
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
    private navCtrl: NavController,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.refreshData();

    // 60s auto refresh
    this.sub.add(
      this.analyticsService.getPollingStream().subscribe(tick => {
        if (tick > 0) this.refreshData(false);
      })
    );
  }

  ngOnDestroy() {
    this.sub.unsubscribe();
  }

  handleRefresh(event: any) {
    this.refreshData(false, () => {
      event.target.complete();
    });
  }

  refreshData(showSpinner = true, callback?: () => void) {
    if (showSpinner) this.loading = true;
    this.hasError = false;

    this.sub.add(
      this.analyticsService.getForecast().subscribe({
        next: (res) => {
          this.forecast = res;
          this.lastUpdatedTime = res.updated_at || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          this.loading = false;
          if (callback) callback();
          this.cdr.detectChanges();
        },
        error: () => {
          this.hasError = true;
          this.loading = false;
          if (callback) callback();
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

  onPeriodChange(event: any) {
    this.selectedPeriod = event.detail.value;
    this.loadTrends(this.selectedPeriod);
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
    return 'Total Parked';
  }

  getDonutDash(index: number): string {
    const circumference = 2 * Math.PI * 70;
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
    return Math.min(100, Math.max(12, (val / 1600) * 100));
  }

  setBarTooltip(label: string, val: number) {
    this.activeTooltip = { label, val };
  }

  // SVG Line Chart Coordinate Helpers
  getXCoord(index: number): number {
    const padding = 35;
    const width = 310;
    return padding + (index / 23) * width;
  }

  getYCoord(val: number): number {
    const height = 130;
    const topPadding = 20;
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
    this.navCtrl.back();
  }
}
