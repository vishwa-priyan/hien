import { DemandForecast } from '../types';
import { StorageService } from './storage';
import { ApiClient } from './apiClient';

export class ForecastService {
  static async getForecasts(filters?: {
    hubId?: string;
    sku?: string;
  }): Promise<DemandForecast[]> {
    try {
      const params: Record<string, string> = {};
      if (filters?.hubId && filters.hubId !== 'all') params.hubId = filters.hubId;
      if (filters?.sku && filters.sku !== 'all') params.sku = filters.sku;

      const forecasts = await ApiClient.get<DemandForecast[]>('/forecasts', params);
      StorageService.updateState(prev => ({ ...prev, forecasts }));
      return forecasts;
    } catch {
      let forecasts = StorageService.getState().forecasts;
      if (filters?.hubId && filters.hubId !== 'all') {
        forecasts = forecasts.filter(f => f.hubId === filters.hubId);
      }
      if (filters?.sku && filters.sku !== 'all') {
        forecasts = forecasts.filter(f => f.sku === filters.sku);
      }
      return forecasts;
    }
  }

  static async getForecastForProductAndHub(sku: string, hubId: string): Promise<DemandForecast | null> {
    try {
      return await ApiClient.get<DemandForecast>(`/forecasts/${sku}/${hubId}`);
    } catch {
      const forecasts = StorageService.getState().forecasts;
      return forecasts.find(f => f.sku === sku && f.hubId === hubId) || null;
    }
  }

  static async runForecast(sku: string, hubId: string): Promise<DemandForecast> {
    try {
      const updated = await ApiClient.post<DemandForecast>('/forecasts/run', { sku, hubId });
      StorageService.updateState(prev => ({
        ...prev,
        forecasts: prev.forecasts.map(f => (f.sku === sku && f.hubId === hubId ? updated : f)),
      }));
      return updated;
    } catch {
      const forecast = await this.getForecastForProductAndHub(sku, hubId);
      return forecast!;
    }
  }
}
