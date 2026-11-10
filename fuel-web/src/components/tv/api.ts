/** Tiny fetch wrapper used by every TV admin screen. Responses are { data } / { error }. */
export async function api<T>(url: string, init?: RequestInit): Promise<T> {
    const response = await fetch(url, {
      cache: "no-store",
      ...init,
      headers: init?.body
        ? { "Content-Type": "application/json", ...(init.headers ?? {}) }
        : init?.headers,
    });
  
    let json: { data?: T; error?: string } | null = null;
  
    try {
      json = await response.json();
    } catch {
      /* empty body */
    }
  
    if (!response.ok) {
      throw new Error(json?.error ?? `Request failed (${response.status}).`);
    }
  
    return json?.data as T;
  }
  
  export function errorMessage(error: unknown) {
    return error instanceof Error ? error.message : "Something went wrong.";
  }