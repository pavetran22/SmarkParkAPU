import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FindMyCarPage } from './find-my-car.page';

describe('FindMyCarPage', () => {
  let component: FindMyCarPage;
  let fixture: ComponentFixture<FindMyCarPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(FindMyCarPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
