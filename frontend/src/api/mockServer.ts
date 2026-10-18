import { Sale } from '../db/indexedDb';

/**
 * Mock cloud backend server for Aura POS.
 * Accepts sales after ~120ms delay, idempotent (ignores already-synced IDs),
 * and supports toggling simulated server failure for testing retries.
 */
class MockServerService {
  private processedSaleIds = new Set<string>();
  public simulateServerFailure: boolean = false;

  async syncSale(sale: Sale): Promise<{ success: boolean; message: string; duplicate?: boolean }> {
    // Simulate network delay ~120ms
    await new Promise((resolve) => setTimeout(resolve, 120));

    if (this.simulateServerFailure) {
      throw new Error('HTTP 503: Cloud Sync Endpoint Unavailable (Simulated Failure)');
    }

    // Idempotent check
    if (this.processedSaleIds.has(sale.id)) {
      return {
        success: true,
        message: `Sale ${sale.receiptNumber} already received on server (Idempotent).`,
        duplicate: true,
      };
    }

    this.processedSaleIds.add(sale.id);
    return {
      success: true,
      message: `Sale ${sale.receiptNumber} successfully synchronized with cloud backend.`,
    };
  }

  isSyncedOnServer(saleId: string): boolean {
    return this.processedSaleIds.has(saleId);
  }

  reset(): void {
    this.processedSaleIds.clear();
  }
}

export const mockServer = new MockServerService();
