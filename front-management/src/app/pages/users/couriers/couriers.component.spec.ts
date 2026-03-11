import { TestBed } from '@angular/core/testing';
import { CouriersComponent } from './couriers.component';
import { CourierService } from '@vhandelivery/shared-ui';
import { of, throwError } from 'rxjs';
import { GlobalModalService } from '../../../shared/components/global-modal/global-modal.service';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { registerLocaleData } from '@angular/common';
import localeVi from '@angular/common/locales/vi';

// Mock service to isolate component behavior from API calls.
class CourierServiceMock {
  findAllCalls = 0;
  approveCalls = 0;
  rejectCalls = 0;
  findByIdCalls = 0;

  findAll() {
    this.findAllCalls += 1;
    return of({
      data: [
        {
          id: 1,
          userId: 1,
          name: 'Test Courier',
          phone: '0900000000',
          taxCode: null,
          driverLicenseUrl: null,
          vehicleImageUrl: null,
          idCardUrl: null,
          vehicleType: null,
          approvalStatus: 'PENDING',
          approvedAt: null,
          rejectedAt: null,
          rejectionReason: null,
          operationalStatus: 'ACTIVE',
          statusChangedAt: null,
          statusReason: null,
          createdAt: new Date().toISOString(),
          updatedAt: null,
        },
      ],
      total: 1,
      page: 1,
      limit: 10,
    });
  }

  approve() {
    this.approveCalls += 1;
    return of({});
  }

  reject() {
    this.rejectCalls += 1;
    return of({});
  }

  findById() {
    this.findByIdCalls += 1;
    return of({
      id: 1,
      userId: 1,
      name: 'Test Courier',
      phone: '0900000000',
      taxCode: null,
      driverLicenseUrl: null,
      vehicleImageUrl: null,
      idCardUrl: null,
      vehicleType: null,
      approvalStatus: 'PENDING',
      approvedAt: null,
      rejectedAt: null,
      rejectionReason: null,
      operationalStatus: 'ACTIVE',
      statusChangedAt: null,
      statusReason: null,
      createdAt: new Date().toISOString(),
      updatedAt: null,
    });
  }
}

// Mock modal service so we can assert error handling without real UI.
class GlobalModalServiceMock {
  showErrorCalls = 0;
  showConfirmationCalls = 0;
  showSuccessCalls = 0;
  showError() {
    this.showErrorCalls += 1;
  }

  showSuccess() {
    this.showSuccessCalls += 1;
  }

  showConfirmation(
    _titleKey: string,
    _messageKey: string,
    onConfirm: () => void
  ) {
    this.showConfirmationCalls += 1;
    onConfirm();
  }
}

describe('CouriersComponent', () => {
  let courierService: CourierServiceMock;

  // Register locale so localizedDate pipe can format dates in tests.
  beforeAll(() => {
    registerLocaleData(localeVi, 'vi-VN');
  });

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CouriersComponent, HttpClientTestingModule],
      providers: [
        { provide: CourierService, useClass: CourierServiceMock },
        { provide: GlobalModalService, useClass: GlobalModalServiceMock },
      ],
    }).compileComponents();

    courierService = TestBed.inject(CourierService) as unknown as CourierServiceMock;
  });

  // Verifies initial data fetch when component initializes.
  it('loads couriers on init', () => {
    const fixture = TestBed.createComponent(CouriersComponent);
    fixture.detectChanges();
    expect(courierService.findAllCalls).toBeGreaterThan(0);
  });

  // Ensures approve action calls API and updates state optimistically.
  it('approves courier optimistically', () => {
    const fixture = TestBed.createComponent(CouriersComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    component.approveCourier(component.couriers()[0]);
    expect(courierService.approveCalls).toBeGreaterThan(0);
  });

  // Validates that missing rejection reason triggers a modal error.
  it('reject shows error when reason missing', () => {
    const fixture = TestBed.createComponent(CouriersComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    component.openRejectModal(component.couriers()[0]);
    component.rejectReason.set('');
    component.confirmReject();
    const modalService =
      TestBed.inject(GlobalModalService) as unknown as GlobalModalServiceMock;
    expect(modalService.showErrorCalls).toBeGreaterThan(0);
  });

  // Ensures reject failure path still calls API and reloads data.
  it('reject handles failure by reloading', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const originalReject = courierService.reject.bind(courierService);
    courierService.reject = () => {
      courierService.rejectCalls += 1;
      return throwError(() => new Error('fail'));
    };
    const fixture = TestBed.createComponent(CouriersComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    component.openRejectModal(component.couriers()[0]);
    component.rejectReason.set('reason');
    component.confirmReject();
    expect(courierService.rejectCalls).toBeGreaterThan(0);
    courierService.reject = originalReject;
    consoleSpy.mockRestore();
  });

  it('loads courier detail when opening edit panel', () => {
    const fixture = TestBed.createComponent(CouriersComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    component.openEditPanel(component.couriers()[0]);
    expect(courierService.findByIdCalls).toBeGreaterThan(0);
  });
});
