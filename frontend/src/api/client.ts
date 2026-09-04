import { API_BASE_URL } from '../constants/config';
import type { ApiResponse } from '../types/api';

export class ApiError extends Error {
  status: number;
  data?: unknown;

  constructor(message: string, status: number, data?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

function getFriendlyErrorMessage(status: number, originalError?: string): string {
  if (status === 409) {
    if (originalError?.includes('đủ') || originalError?.toLowerCase().includes('capacity') || originalError?.toLowerCase().includes('full')) {
      return 'Nhóm đã đủ số lượng thành viên tối đa.';
    }
    if (originalError?.includes('hết hạn') || originalError?.toLowerCase().includes('expired')) {
      return 'Mã mời nhóm đã hết hạn.';
    }
    return originalError || 'Xảy ra xung đột trong phiên đặt vé.';
  }
  if (status === 404) {
    return originalError || 'Không tìm thấy thông tin nhóm xem phim.';
  }
  if (status === 400) {
    return originalError || 'Dữ liệu yêu cầu không hợp lệ.';
  }
  if (status >= 500) {
    return 'Lỗi hệ thống máy chủ. Vui lòng thử lại sau.';
  }
  return originalError || 'Có lỗi xảy ra trong quá trình xử lý.';
}

export async function apiClient<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...(options.headers || {}),
  };

  try {
    const res = await fetch(url, {
      ...options,
      headers,
    });

    const contentType = res.headers.get('content-type');
    const isJson = contentType && contentType.includes('application/json');
    const body: ApiResponse<T> = isJson ? await res.json() : null;

    if (!res.ok) {
      const errorMsg = body?.error || body?.message || res.statusText;
      const friendlyMsg = getFriendlyErrorMessage(res.status, errorMsg);
      throw new ApiError(friendlyMsg, res.status, body);
    }

    // Backend wraps response in { success: true, data: ... }
    if (body && typeof body === 'object' && 'success' in body) {
      if (!body.success) {
        throw new ApiError(body.error || 'Yêu cầu không thành công', res.status, body);
      }
      return body.data as T;
    }

    return (body as unknown) as T;
  } catch (err: unknown) {
    if (err instanceof ApiError) {
      throw err;
    }
    // Network errors (e.g. Failed to fetch / connection refused)
    throw new ApiError(
      'Không thể kết nối máy chủ backend. Đang hoạt động ở chế độ Demo.',
      0
    );
  }
}
