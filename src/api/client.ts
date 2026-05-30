export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

// 개발: Vite 프록시(/api → localhost:8000)
// 프로덕션: VITE_API_BASE_URL=https://api.yourdomain.com (빌드 시 번들에 포함)
const BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '/api';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    credentials: 'include', // HttpOnly 쿠키 자동 전송
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    // FastAPI 422는 detail이 배열 [{msg, loc}, ...]
    const detail = body.detail;
    const message = Array.isArray(detail)
      ? detail.map((e: { msg: string }) => e.msg).join(', ')
      : (detail ?? '요청에 실패했습니다');
    throw new ApiError(res.status, message);
  }

  // 204 No Content 등 body 없는 응답 처리
  const text = await res.text();
  return (text ? JSON.parse(text) : null) as T;
}

export const api = {
  get:    <T>(path: string)                => request<T>(path),
  post:   <T>(path: string, body: unknown) => request<T>(path, { method: 'POST',   body: JSON.stringify(body) }),
  patch:  <T>(path: string, body: unknown) => request<T>(path, { method: 'PATCH',  body: JSON.stringify(body) }),
  delete: <T>(path: string)                => request<T>(path, { method: 'DELETE' }),
};
