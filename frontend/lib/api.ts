// Dev: env var unset → uses localhost. Prod: Docker build arg sets the real URL.
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

// ─── Embed-mode Bearer auth ────────────────────────────────────────────────
// When the app is loaded inside an <iframe> via /embed, the host (Tool X)
// passes an M2M JWT in the URL fragment. The embed page calls setEmbedToken()
// once at boot. From then on every API call switches to Bearer auth and
// stops sending cookies (the iframe is cross-origin and has no session
// cookie of its own).
//
// We mirror the token + the host origin into sessionStorage so they survive
// client-side navigation inside the iframe (e.g. /embed → /embed/contract-editor).
let embedToken: string | null = null;
const TOKEN_KEY  = 'winaity_embed_token';
const ORIGIN_KEY = 'winaity_embed_return_origin';

export function setEmbedToken(token: string | null): void {
    embedToken = token;
    if (typeof window === 'undefined') return;
    try {
        if (token) sessionStorage.setItem(TOKEN_KEY, token);
        else sessionStorage.removeItem(TOKEN_KEY);
    } catch { /* sessionStorage may be unavailable */ }
}

export function setEmbedReturnOrigin(origin: string | null): void {
    if (typeof window === 'undefined') return;
    try {
        if (origin) sessionStorage.setItem(ORIGIN_KEY, origin);
        else sessionStorage.removeItem(ORIGIN_KEY);
    } catch { /* ignore */ }
}

export function getEmbedReturnOrigin(): string | null {
    if (typeof window === 'undefined') return null;
    try { return sessionStorage.getItem(ORIGIN_KEY); } catch { return null; }
}

function activeEmbedToken(): string | null {
    if (embedToken) return embedToken;
    if (typeof window === 'undefined') return null;
    try {
        const v = sessionStorage.getItem(TOKEN_KEY);
        if (v) embedToken = v;
        return v;
    } catch { return null; }
}

export function getEmbedToken(): string | null { return activeEmbedToken(); }

/** True whenever an embed M2M token is active. Reactive code should poll
 *  this rather than caching the result — the token gets set right after the
 *  /embed page mounts. */
export function isEmbedMode(): boolean { return activeEmbedToken() != null; }

/** Decode a JWT payload without verifying its signature. Safe to use only for
 *  reading claims the server has already validated on the request that gave
 *  us this token. Returns null on malformed input. */
export function decodeJwtPayload(token: string): Record<string, unknown> | null {
    try {
        const part = token.split('.')[1];
        if (!part) return null;
        const padded = part + '='.repeat((4 - (part.length % 4)) % 4);
        const json = atob(padded.replace(/-/g, '+').replace(/_/g, '/'));
        return JSON.parse(json) as Record<string, unknown>;
    } catch { return null; }
}

async function request(endpoint: string, options: RequestInit = {}){
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(options.headers as Record<string, string> | undefined),
    };
    let credentials: RequestCredentials = 'include';
    const t = activeEmbedToken();
    if (t) {
        headers.Authorization = `Bearer ${t}`;
        credentials = 'omit';
    }
    const res = await fetch(`${API_URL}${endpoint}`,{
     ...options,
     credentials,
     headers,
});

const data = await res.json();

if(!res.ok) {
    throw new Error(data.message || 'Something went wrong');
}

return data;
}

// ------- AUTH ---------
export const auth = {
    register: (body: {tenantName: string; email: string; password: string; firstName: string; lastName: string;}) =>
        request('/auth/register', { method: 'POST' , body: JSON.stringify(body)}),

    login: (body: { email: string; password: string}) =>
        request('/auth/login', { method: 'POST', body: JSON.stringify(body) }),

    logout: () => request('/auth/logout', { method: 'POST' }),

    getMe: () => request('/auth/me'),

    updateProfile: (body: { firstName: string; lastName: string; }) =>
        request('/auth/profile', { method: 'PUT', body: JSON.stringify(body) }),

    invite: (body: { email: string; role: string }) =>
        request('/auth/invite', { method: 'POST', body: JSON.stringify(body)}),

    acceptInvite: (body: { token: string; password: string; firstName: string; lastName: string}) =>
        request('/auth/accept-invite', { method: 'POST', body: JSON.stringify(body) }),

    listMembers:() =>
        request('/auth/members'),
};

// ------- DEVELOPERS (public integration endpoints) ---------
const RETURN_URL_KEY = 'winaity_builder_return_url';

export function setBuilderReturnUrl(url: string | null): void {
    if (typeof window === 'undefined') return;
    try {
        if (url) sessionStorage.setItem(RETURN_URL_KEY, url);
        else sessionStorage.removeItem(RETURN_URL_KEY);
    } catch { /* ignore */ }
}

export function getBuilderReturnUrl(): string | null {
    if (typeof window === 'undefined') return null;
    try { return sessionStorage.getItem(RETURN_URL_KEY); } catch { return null; }
}

export const developers = {
    register: (body: { name: string; email: string }) =>
        request('/developers/register', { method: 'POST', body: JSON.stringify(body) }),

    exchangeSession: (token: string) =>
        request('/s/exchange', { method: 'POST', body: JSON.stringify({ token }) }),
};

//----- Templates ----
export const templates = {
    create: (body: { name: string; description?: string; type: number; subject?: string; content: string; isPredefinedOverride?: boolean; predefinedTemplateId?: string }) =>
        request('/templates', { method: 'POST', body: JSON.stringify(body) }),
    
    list:(params?: {page?: number; limit?: number; type?: string; search?: string; favoritesOnly?: boolean; sortBy?: string; ascending?: boolean; excludePredefinedOverrides?: boolean; predefinedOverridesOnly?: boolean;}) =>{
        const query = new URLSearchParams();
        if(params?.page) query.set('page', String(params.page));
        if(params?.limit) query.set('limit', String(params.limit));
        if(params?.type) query.set('type', params.type);
        if(params?.search) query.set('search', params.search);
        if(params?.favoritesOnly) query.set('favoritesOnly', 'true');
        if(params?.sortBy) query.set('sortBy', params.sortBy);
        if(params?.ascending !== undefined) query.set('ascending', String(params.ascending));
        if(params?.excludePredefinedOverrides) query.set('excludePredefinedOverrides', 'true');
        if(params?.predefinedOverridesOnly) query.set('predefinedOverridesOnly', 'true');
        return request(`/templates?${query.toString()}`);
    },
    get:(id: string) =>
        request(`/templates/${id}`),

    update:(id: string, body: { name: string; description?: string; type: number; subject?: string; content: string }) =>
        request(`/templates/${id}`, { method: 'PUT', body: JSON.stringify(body) }),

    delete:(id: string) =>
        request(`/templates/${id}`, { method: 'DELETE' }),

    duplicate: (id: string, name: string)=>
        request(`/templates/${id}/duplicate`, { method: 'POST', body: JSON.stringify({name}) }),

    toggleFavorite: (id: string, isFavorite: boolean) =>
        request(`/templates/${id}/favorite`, { method: 'PUT', body: JSON.stringify({ isFavorite }) }),

    render: (id: string) =>
        request(`/templates/${id}/render`, { method: 'GET' }),

    sendTestEmail: (body: { to?: string; subject?: string; content: string }) =>
        request('/templates/test-email', { method: 'POST', body: JSON.stringify(body) }),
};

// ─── Tenant Custom Variables ───
export const contractVariables = {
    get: (): Promise<{ variables: Record<string, string[]>; customNames: string[] }> =>
        request('/templates/settings/custom-variables'),

    add: (variable: { category: string; name: string }): Promise<{ success: boolean }> =>
        request('/templates/settings/custom-variables', { method: 'POST', body: JSON.stringify(variable) }),

    remove: (name: string): Promise<{ success: boolean }> =>
        request(`/templates/settings/custom-variables/${encodeURIComponent(name)}`, { method: 'DELETE' }),
};

// ─── Media ───
const API_URL_RAW = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

export const media = {
    upload: async (file: File): Promise<{ url: string; fileName: string; size: number; type: string }> => {
        const formData = new FormData();
        formData.append('file', file);

        const res = await fetch(`${API_URL_RAW}/media/upload`, {
            method: 'POST',
            credentials: 'include',
            body: formData,
        });

        const text = await res.text();
        let data;
        try {
            data = JSON.parse(text);
        } catch {
            console.error('Server response:', res.status, text.substring(0, 200));
            throw new Error(`Server error: ${res.status}`);
        }
        if (!res.ok) throw new Error(data.error || 'Upload failed');
        return data;
    },

    delete: async (fileName: string): Promise<void> => {
        await request(`/media/${fileName}`, { method: 'DELETE' });
    },
};

// ─── AI Template Generation ───
const AI_SERVICE_URL = process.env.NEXT_PUBLIC_AI_SERVICE_URL ?? 'http://127.0.0.1:8001';
const IMAGE_SEARCH_URL = process.env.NEXT_PUBLIC_IMAGE_SEARCH_API ?? 'http://localhost:8002';

/**
 * Replace empty/placeholder mj-image src attributes with real Pexels images.
 * Uses each image's alt text as search query; falls back to prompt keywords.
 */
async function enrichImagesWithPexels(mjml: string, fallbackQuery: string): Promise<string> {
    // Match self-closing mj-image tags (after cleanup they're all self-closing)
    const imgRegex = /<mj-image([^>]*?)\/>/g;
    const altRegex = /\balt="([^"]*)"/;
    const srcRegex = /\bsrc="([^"]*)"/;

    const matches = [...mjml.matchAll(imgRegex)];
    if (!matches.length) return mjml;

    // Cache: query → url  (avoid duplicate API calls for same query)
    const cache: Record<string, string> = {};

    const fetchPexelsUrl = async (query: string): Promise<string | null> => {
        if (cache[query] !== undefined) return cache[query] || null;
        try {
            const res = await fetch(
                `${IMAGE_SEARCH_URL}/search?q=${encodeURIComponent(query)}&limit=3`,
                { signal: AbortSignal.timeout(4000) }
            );
            if (!res.ok) { cache[query] = ''; return null; }
            const images: { url: string }[] = await res.json();
            const url = images[0]?.url ?? '';
            cache[query] = url;
            return url || null;
        } catch {
            cache[query] = '';
            return null;
        }
    };

    let result = mjml;

    for (const match of matches) {
        const attrs = match[1];
        const currentSrc = srcRegex.exec(attrs)?.[1] ?? '';

        // Skip if already has a real image URL
        const isPlaceholder =
            !currentSrc ||
            currentSrc.includes('via.placeholder') ||
            currentSrc.includes('placeholder.com') ||
            currentSrc.includes('example.com') ||
            currentSrc === 'YOUR_IMAGE_URL' ||
            currentSrc.startsWith('http://placeholder');

        if (!isPlaceholder) continue;

        // Use alt text as query, fall back to the user's prompt
        const altText = altRegex.exec(attrs)?.[1]?.trim() ?? '';
        const query = altText || fallbackQuery;
        if (!query) continue;

        const url = await fetchPexelsUrl(query);
        if (!url) continue;

        // Replace the src value in-place
        const newTag = match[0].replace(srcRegex, `src="${url.replace(/&/g, '&amp;')}"`);
        result = result.replace(match[0], newTag);
    }

    return result;
}

export const ai = {
    generate: async (body: { prompt: string; tenant_id: string; user_id: string }): Promise<{ mjml: string }> => {
        const res = await fetch(`${AI_SERVICE_URL}/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });
        const text = await res.text();
        let data;
        try {
            data = JSON.parse(text);
        } catch {
            throw new Error(`AI service error: ${res.status}`);
        }
        if (data.error) throw new Error(data.error);
        if (!data.mjml) throw new Error('No MJML returned');

        // Clean MJML: extract only the <mjml>...</mjml> block, fix common issues
        let mjml = data.mjml;
        const mjmlMatch = mjml.match(/<mjml[\s\S]*<\/mjml>/i);
        if (mjmlMatch) mjml = mjmlMatch[0];
        mjml = mjml.replace(/\/ \/>/g, '/>');
        mjml = mjml.replace(/<mj-image([^>]*[^/])>/g, '<mj-image$1 />');
        mjml = mjml.replace(/<mj-divider([^>]*[^/])>/g, '<mj-divider$1 />');

        // Swap placeholder image srcs with real Pexels photos
        mjml = await enrichImagesWithPexels(mjml, body.prompt);

        return { mjml };
    },

    mapVariables: async (body: {
        template_vars: string[];
        file_columns: string[];
        sample_row?: Record<string, string>;
    }): Promise<{ mapping: Record<string, string | null> }> => {
        const res = await fetch(`${AI_SERVICE_URL}/map-variables`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error(`AI mapping failed: ${res.status}`);
        return res.json();
    },

    mapInvoiceFields: async (body: {
        targets: { path: string; label: string; type: string; hint?: string }[];
        file_columns: string[];
        already_matched?: { target: string; column: string }[];
        sample_row?: Record<string, string>;
    }): Promise<{ mapping: Record<string, string | null> }> => {
        const res = await fetch(`${AI_SERVICE_URL}/map-invoice-fields`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error(`AI invoice mapping failed: ${res.status}`);
        return res.json();
    },
};