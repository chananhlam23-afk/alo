const BASE = "/api/v1";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("access_token");
}

function setTokens(access: string, refresh: string) {
  localStorage.setItem("access_token", access);
  localStorage.setItem("refresh_token", refresh);
}

function clearTokens() {
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
}

async function refreshAccessToken(): Promise<string | null> {
  const refresh = localStorage.getItem("refresh_token");
  if (!refresh) return null;

  const res = await fetch(`${BASE}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken: refresh }),
  });

  if (!res.ok) { clearTokens(); return null; }

  const { data } = await res.json();
  setTokens(data.accessToken, data.refreshToken);
  return data.accessToken;
}

export async function apiFetch<T = unknown>(
  path: string,
  options: RequestInit = {},
): Promise<{ data: T } & { success: true }> {
  let token = getToken();

  const doFetch = async (t: string | null) =>
    fetch(`${BASE}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(t ? { Authorization: `Bearer ${t}` } : {}),
        ...(options.headers ?? {}),
      },
    });

  let res = await doFetch(token);

  if (res.status === 401 && token) {
    token = await refreshAccessToken();
    if (token) res = await doFetch(token);
  }

  let json: Record<string, unknown>;
  try {
    json = await res.json();
  } catch {
    throw new Error(`Lỗi server (${res.status}). Vui lòng thử lại.`);
  }
  if (!json.success) throw new Error((json.error as { message?: string })?.message ?? "Lỗi API");
  return json as { data: T; success: true };
}

/**
 * Upload một ảnh KYC dạng multipart/form-data tới /driver/kyc/upload.
 * apiFetch ép Content-Type: application/json nên không dùng được cho FormData —
 * hàm này gọi fetch trực tiếp với Bearer token và tự refresh khi gặp 401.
 * Trả về { path } (lưu vào hồ sơ) và { url } (signed URL để xem trước).
 */
export async function uploadKycImage(file: File, type: string): Promise<{ path: string; url: string | null }> {
  const send = (t: string | null) => {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("type", type);
    return fetch(`${BASE}/driver/kyc/upload`, {
      method: "POST",
      headers: { ...(t ? { Authorization: `Bearer ${t}` } : {}) },
      body: fd,
    });
  };

  let token = getToken();
  let res = await send(token);
  if (res.status === 401 && token) {
    token = await refreshAccessToken();
    if (token) res = await send(token);
  }

  let json: Record<string, unknown>;
  try {
    json = await res.json();
  } catch {
    throw new Error(`Tải ảnh thất bại (${res.status}). Vui lòng thử lại.`);
  }
  if (!json.success) throw new Error((json.error as { message?: string })?.message ?? "Tải ảnh thất bại");
  return json.data as { path: string; url: string | null };
}

/**
 * Upload một ảnh chung (banner/blog/sự kiện/avatar) dạng multipart tới
 * /storage/image. Trả về { url } (URL công khai) để lưu vào form.
 * Giống uploadKycImage: gọi fetch trực tiếp (FormData) + tự refresh khi 401.
 */
export async function uploadImage(file: File): Promise<{ url: string }> {
  const send = (t: string | null) => {
    const fd = new FormData();
    fd.append("file", file);
    return fetch(`${BASE}/storage/image`, {
      method: "POST",
      headers: { ...(t ? { Authorization: `Bearer ${t}` } : {}) },
      body: fd,
    });
  };

  let token = getToken();
  let res = await send(token);
  if (res.status === 401 && token) {
    token = await refreshAccessToken();
    if (token) res = await send(token);
  }

  let json: Record<string, unknown>;
  try {
    json = await res.json();
  } catch {
    throw new Error(`Tải ảnh thất bại (${res.status}). Vui lòng thử lại.`);
  }
  if (!json.success) throw new Error((json.error as { message?: string })?.message ?? "Tải ảnh thất bại");
  return json.data as { url: string };
}

export const api = {
  get: <T = unknown>(path: string) => apiFetch<T>(path, { method: "GET" }),
  uploadKycImage,
  uploadImage,
  post: <T = unknown>(path: string, body: unknown) =>
    apiFetch<T>(path, { method: "POST", body: JSON.stringify(body) }),
  patch: <T = unknown>(path: string, body: unknown) =>
    apiFetch<T>(path, { method: "PATCH", body: JSON.stringify(body) }),
  put: <T = unknown>(path: string, body: unknown) =>
    apiFetch<T>(path, { method: "PUT", body: JSON.stringify(body) }),
  del: <T = unknown>(path: string) => apiFetch<T>(path, { method: "DELETE" }),
  setTokens,
  clearTokens,
};
