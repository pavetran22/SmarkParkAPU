import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MyVehiclesPage } from './my-vehicles.page';

describe('MyVehiclesPage', () => {
  let component: MyVehiclesPage;
  let fixture: ComponentFixture<MyVehiclesPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(MyVehiclesPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
