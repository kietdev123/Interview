import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  AdminCreateCourierRequest,
  CourierApiResponse,
  CourierListResponse,
  CourierQueryParams,
  CourierRejectRequest,
  UpdateCourierRequest,
} from '../interfaces/courier.interface';

@Injectable({ providedIn: 'root' })
export class CourierService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/couriers';

  findAll(params: CourierQueryParams = {}): Observable<CourierListResponse> {
    let httpParams = new HttpParams();

    if (params.page) {
      httpParams = httpParams.set('page', params.page.toString());
    }
    if (params.limit) {
      httpParams = httpParams.set('limit', params.limit.toString());
    }
    if (params.approvalStatus) {
      httpParams = httpParams.set('approvalStatus', params.approvalStatus);
    }
    if (params.operationalStatus) {
      httpParams = httpParams.set('operationalStatus', params.operationalStatus);
    }
    if (params.search) {
      httpParams = httpParams.set('search', params.search);
    }

    return this.http.get<CourierListResponse>(this.baseUrl, {
      params: httpParams,
      withCredentials: true,
    });
  }

  findById(id: number): Observable<CourierApiResponse> {
    return this.http.get<CourierApiResponse>(`${this.baseUrl}/${id}`, {
      withCredentials: true,
    });
  }

  approve(id: number): Observable<CourierApiResponse> {
    return this.http.patch<CourierApiResponse>(
      `${this.baseUrl}/${id}/approve`,
      {},
      { withCredentials: true }
    );
  }

  reject(id: number, reason: string): Observable<CourierApiResponse> {
    const payload: CourierRejectRequest = { reason };
    return this.http.patch<CourierApiResponse>(
      `${this.baseUrl}/${id}/reject`,
      payload,
      { withCredentials: true }
    );
  }

  adminCreate(payload: AdminCreateCourierRequest): Observable<CourierApiResponse> {
    return this.http.post<CourierApiResponse>(
      `${this.baseUrl}/admin-create`,
      payload,
      { withCredentials: true }
    );
  }

  update(id: number, payload: UpdateCourierRequest): Observable<CourierApiResponse> {
    return this.http.patch<CourierApiResponse>(
      `${this.baseUrl}/${id}`,
      payload,
      { withCredentials: true }
    );
  }

  remove(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.baseUrl}/${id}`, {
      withCredentials: true,
    });
  }
}
