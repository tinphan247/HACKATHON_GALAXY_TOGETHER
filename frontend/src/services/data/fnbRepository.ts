import type { FnBProduct } from '../../types/booking';
import { MOCK_FNB_PRODUCTS } from './dataset';

export const fnbRepository = {
  /**
   * Get all active F&B products/combos
   */
  async getFnBProducts(): Promise<FnBProduct[]> {
    return MOCK_FNB_PRODUCTS;
  },

  /**
   * Get product by ID
   */
  async getProductById(productId: string): Promise<FnBProduct | null> {
    const product = MOCK_FNB_PRODUCTS.find((p) => p.id === productId);
    return product || null;
  },
};
