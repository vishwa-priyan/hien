import { Product } from '../types';
import { StorageService } from './storage';
import { ApiClient } from './apiClient';

export class ProductService {
  static async getProducts(): Promise<Product[]> {
    try {
      const products = await ApiClient.get<Product[]>('/products');
      StorageService.updateState(prev => ({ ...prev, products }));
      return products;
    } catch {
      return StorageService.getState().products;
    }
  }

  static async getProductBySku(sku: string): Promise<Product | null> {
    try {
      return await ApiClient.get<Product>(`/products/${sku}`);
    } catch {
      const products = StorageService.getState().products;
      return products.find(p => p.sku === sku) || null;
    }
  }

  static async createProduct(productData: Product): Promise<Product> {
    try {
      const created = await ApiClient.post<Product>('/products', productData);
      StorageService.updateState(prev => ({
        ...prev,
        products: [...prev.products, created],
      }));
      return created;
    } catch {
      StorageService.updateState(prev => ({
        ...prev,
        products: [...prev.products, productData],
      }));
      return productData;
    }
  }

  static async updateProduct(sku: string, updates: Partial<Product>): Promise<Product> {
    try {
      const updated = await ApiClient.patch<Product>(`/products/${sku}`, updates);
      StorageService.updateState(prev => ({
        ...prev,
        products: prev.products.map(p => (p.sku === sku ? updated : p)),
      }));
      return updated;
    } catch {
      let updated: Product | null = null;
      StorageService.updateState(prev => {
        const existing = prev.products.find(p => p.sku === sku);
        if (!existing) return prev;
        updated = { ...existing, ...updates };
        return {
          ...prev,
          products: prev.products.map(p => (p.sku === sku ? updated! : p)),
        };
      });
      return updated!;
    }
  }
}
