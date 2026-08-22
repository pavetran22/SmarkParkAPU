import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ViewParkingSpotsPage } from './view-parking-spots.page';

describe('ViewParkingSpotsPage', () => {
  let component: ViewParkingSpotsPage;
  let fixture: ComponentFixture<ViewParkingSpotsPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(ViewParkingSpotsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
