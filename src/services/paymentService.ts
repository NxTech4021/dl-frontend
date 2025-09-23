import { getBackendBaseURL } from '../config/network';

const BASE_URL = getBackendBaseURL();

export interface CreatePaymentRequest {
  seasonId: string;
  leagueId: string;
  amount: number;
  billDesc: string;
  userId: string; // Temporary for testing
}

export interface CreatePaymentResponse {
  success: boolean;
  paymentUrl: string;
  orderId: string;
  amount: number;
  error?: string;
}

export interface PaymentStatusResponse {
  success: boolean;
  payment: {
    id: string;
    orderId: string;
    amount: number;
    status: string;
    paidAt?: string;
    createdAt: string;
    registrations: any[];
  };
  error?: string;
}

class PaymentService {
  private async getHeaders() {
    return {
      'Content-Type': 'application/json',
      // TODO: Add proper authentication headers when auth is implemented
      // 'Authorization': `Bearer ${token}`,
    };
  }

  async createPayment(request: CreatePaymentRequest): Promise<CreatePaymentResponse> {
    try {
      console.log('🔗 Creating payment request to:', `${BASE_URL}/api/payment/create`);
      console.log('📋 Payment data:', request);

      const headers = await this.getHeaders();

      const response = await fetch(`${BASE_URL}/api/payment/create`, {
        method: 'POST',
        headers,
        body: JSON.stringify(request)
      });

      console.log('📡 Payment response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Payment creation error:', errorText);
        throw new Error(`Payment creation failed: ${response.status} ${errorText}`);
      }

      const data = await response.json();
      console.log('✅ Payment creation success:', data);
      return data;
    } catch (error) {
      console.error('❌ Payment service error:', error);
      throw error;
    }
  }

  async getPaymentStatus(orderId: string, userId: string): Promise<PaymentStatusResponse> {
    try {
      const headers = await this.getHeaders();

      const response = await fetch(`${BASE_URL}/api/payment/status/${orderId}?userId=${userId}`, {
        headers
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to get payment status: ${response.status} ${errorText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error getting payment status:', error);
      throw error;
    }
  }

  async getUserPayments(userId: string): Promise<{ success: boolean; payments: any[] }> {
    try {
      const headers = await this.getHeaders();

      const response = await fetch(`${BASE_URL}/api/payment/user?userId=${userId}`, {
        headers
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to get user payments: ${response.status} ${errorText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error getting user payments:', error);
      throw error;
    }
  }
}

export const paymentService = new PaymentService();