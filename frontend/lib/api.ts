import { openUpgradeModal } from './upgrade-modal';

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
    let res: Response;
    try {
        res = await fetch(`${API_URL}${endpoint}`, { ...options, credentials, headers });
    } catch {
        // fetch only rejects on network-level failures (offline, DNS, CORS,
        // connection refused) — never on a 4xx/5xx.
        throw new Error('Impossible de joindre le serveur. Vérifiez votre connexion et réessayez.');
    }

    // Parse defensively: an error response (or a 504/timeout) may return HTML or
    // an empty body, in which case res.json() would throw over the real error.
    const text = await res.text();
    let data: any = null;
    if (text) {
        try { data = JSON.parse(text); } catch { /* non-JSON body */ }
    }

    if (!res.ok) {
        const backendMsg = data && typeof data.message === 'string' ? data.message : null;
        // Plan-restriction errors get the friendly upgrade modal instead of a
        // bare toast (the toast wrapper suppresses the duplicate for the same msg).
        const code = data && typeof data.code === 'string' ? data.code : null;
        if (code === 'plan_limit' || code === 'ai_limit') {
            openUpgradeModal({ message: backendMsg ?? undefined, reason: code });
        }
        throw new Error(backendMsg || httpFallbackMessage(res.status));
    }

    return data;
}

// Human, French fallbacks when the server didn't send a usable message (e.g.
// gateway timeouts, proxy errors). Prefer the backend's own message when present.
function httpFallbackMessage(status: number): string {
    if (status === 401) return 'Session expirée. Veuillez vous reconnecter.';
    if (status === 403) return "Vous n'avez pas les droits pour effectuer cette action.";
    if (status === 404) return 'Ressource introuvable.';
    if (status === 409) return 'Cette ressource existe déjà.';
    if (status === 413) return 'Le fichier est trop volumineux.';
    if (status === 429) return 'Trop de requêtes. Veuillez patienter un instant.';
    if (status >= 500) return 'Le serveur est momentanément indisponible. Veuillez réessayer.';
    return 'Une erreur est survenue. Veuillez réessayer.';
}

// ------- AUTH ---------
export const auth = {
    register: (body: {tenantName: string; email: string; password: string; firstName: string; lastName: string; phone: string; addressLine: string; postalCode: string; city: string; country: string;}) =>
        request('/auth/register', { method: 'POST' , body: JSON.stringify(body)}),

    login: (body: { email: string; password: string}) =>
        request('/auth/login', { method: 'POST', body: JSON.stringify(body) }),

    logout: () => request('/auth/logout', { method: 'POST' }),

    getMe: () => request('/auth/me'),

    updateProfile: (body: { firstName: string; lastName: string; }) =>
        request('/auth/profile', { method: 'PUT', body: JSON.stringify(body) }),

    // Marks the first-run onboarding tour as seen (idempotent). Fire-and-forget.
    markFirstLogged: () =>
        request('/auth/first-log', { method: 'PUT' }),

    invite: (body: { email: string; role: string }) =>
        request('/auth/invite', { method: 'POST', body: JSON.stringify(body)}),

    acceptInvite: (body: { token: string; password: string; firstName: string; lastName: string}) =>
        request('/auth/accept-invite', { method: 'POST', body: JSON.stringify(body) }),

    forgotPassword: (body: { email: string }) =>
        request('/auth/forgot-password', { method: 'POST', body: JSON.stringify(body) }),

    resetPassword: (body: { token: string; password: string }) =>
        request('/auth/reset-password', { method: 'POST', body: JSON.stringify(body) }),

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
    exchangeSession: (token: string) =>
        request('/s/exchange', { method: 'POST', body: JSON.stringify({ token }) }),
};

// ------- INTEGRATIONS (tenant self-service API keys, dashboard-only) ---------
// All routes are behind the dashboard session cookie + admin role. The tenant is
// taken from the JWT server-side — these never send a tenant/client_secret.
export interface IntegrationKey {
    id: string;
    client_id: string;
    scopes: string;
    created_at: string;
    label: string;
    allowed_return_urls: string[];
}

export const integrations = {
    listKeys: (): Promise<{ clients: IntegrationKey[] }> =>
        request('/integrations/api-keys'),

    createKey: (label?: string): Promise<{ client_id: string; client_secret: string }> =>
        request('/integrations/api-keys', { method: 'POST', body: JSON.stringify({ label: label ?? '' }) }),

    revokeKey: (id: string): Promise<{ success: boolean }> =>
        request(`/integrations/api-keys/${id}`, { method: 'DELETE' }),

    setReturnUrls: (clientId: string, urls: string[]): Promise<{ client_id: string; allowed_return_urls: string[] }> =>
        request('/integrations/return-urls', { method: 'PUT', body: JSON.stringify({ client_id: clientId, urls }) }),
};

// ------- BILLING (Stripe subscriptions, dashboard admin) ---------
export interface BillingInfo {
    plan: string;
    billing_cycle: string | null;
    subscription_status: string | null;
    card: { brand: string; last4: string } | null;
    current_period_end: number | null; // unix seconds
    cancel_at: number | null; // unix seconds
}

// Plan usage + capabilities — drives UI gating (hide/disable gated actions) and
// the current-plan marker on /pricing. Limits are null when unlimited.
export interface UsageInfo {
    plan: string;
    email_templates_created: number;
    email_templates_limit: number | null;
    ai_interactions_used: number;
    ai_interactions_limit: number | null;
    non_email_allowed: boolean;
    can_invite_users: boolean;
    can_create_api_keys: boolean;
}

export const billing = {
    // Starts a subscription. Returns EITHER a `clientSecret` (new subscription →
    // mount Stripe Embedded Checkout inside our own /checkout page) OR a `url`
    // (a plan change on an existing subscription needs no payment step, so the
    // gateway sends us straight back to the dashboard).
    createCheckout: (
        plan: string,
        billingCycle: string,
    ): Promise<{ clientSecret?: string; url?: string }> =>
        request('/billing/checkout', { method: 'POST', body: JSON.stringify({ plan, billing: billingCycle }) }),

    get: (): Promise<BillingInfo> =>
        request('/billing'),

    usage: (): Promise<UsageInfo> =>
        request('/billing/usage'),

    // Confirm + apply the plan after returning from Stripe Checkout (idempotent).
    confirm: (sessionId: string): Promise<{ applied: boolean; plan: string | null }> =>
        request('/billing/confirm', { method: 'POST', body: JSON.stringify({ session_id: sessionId }) }),

    cancel: (): Promise<{ cancel_at: number | null }> =>
        request('/billing/cancel', { method: 'POST' }),

    // Undo a scheduled cancellation and keep the current plan running.
    reactivate: (): Promise<{ current_period_end: number | null }> =>
        request('/billing/reactivate', { method: 'POST' }),
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

    renderSms: (id: string, variables: Record<string, string> = {}): Promise<{
        id: string; name: string; type: string; text: string;
        encoding: 'GSM-7' | 'UCS-2'; characters: number; segments: number; variables_used: string[];
    }> =>
        request(`/templates/${id}/render-sms`, { method: 'POST', body: JSON.stringify({ variables }) }),

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

    // Images uploaded by the caller's organisation (tenant), newest first.
    list: async (): Promise<{ url: string; fileName: string; size: number; lastModified: string }[]> => {
        return request('/media');
    },

    delete: async (fileName: string): Promise<void> => {
        await request(`/media/${fileName}`, { method: 'DELETE' });
    },
};

// ─── AI Template Generation ───
const AI_SERVICE_URL = process.env.NEXT_PUBLIC_AI_SERVICE_URL ?? 'http://127.0.0.1:8001';
export const ai = {
    /**
     * Streaming chat turn — tool-based block generation (Next.js /api/ai/chat).
     * The short assistant sentence arrives token-by-token via `onDelta` (visible
     * in ~1-2s); the fully assembled Template lands once in the final result.
     * `onStatus('template')` fires when the model finished calling block-tools
     * and the template is being assembled. Resolves with { message, template }.
     */
    chatStream: async (
        body: {
            messages: { role: 'user' | 'assistant'; content: string }[];
            current_template?: import('./editor-types').TemplateData | null;
            selection?: { blockId: string | null; sectionId: string | null } | null;
            // Public URL of a poster imported earlier this conversation, so a
            // follow-up like « ajoute l'image » can place the real campaign image.
            poster_url?: string | null;
            // Compact offer brief from the analysed poster (price/plans/gifts),
            // so « ajoute l'offre de l'image » has the exact data.
            campaign_context?: string | null;
        },
        handlers: {
            onDelta?: (text: string) => void;
            onStatus?: (stage: string) => void;
        } = {},
    ): Promise<{ message: string; template: import('./editor-types').TemplateData | null }> => {
        const res = await fetch(`/api/ai/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });
        if (!res.ok || !res.body) {
            throw new Error(`AI service error: ${res.status}`);
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let result: { message: string; template: import('./editor-types').TemplateData | null } = { message: '', template: null };
        let streamError = '';

        const handleEvent = (line: string) => {
            const trimmed = line.trim();
            if (!trimmed) return;
            let evt: { type?: string; text?: string; stage?: string; message?: string; template?: import('./editor-types').TemplateData; error?: string };
            try {
                evt = JSON.parse(trimmed);
            } catch {
                return;
            }
            if (evt.type === 'delta') {
                if (evt.text) handlers.onDelta?.(evt.text);
            } else if (evt.type === 'status') {
                if (evt.stage) handlers.onStatus?.(evt.stage);
            } else if (evt.type === 'done') {
                result = { message: evt.message || '', template: evt.template || null };
            } else if (evt.type === 'error') {
                streamError = evt.error || 'Erreur de génération';
            }
        };

        try {
            for (;;) {
                const { done, value } = await reader.read();
                if (done) break;
                buffer += decoder.decode(value, { stream: true });
                let nl: number;
                while ((nl = buffer.indexOf('\n')) >= 0) {
                    handleEvent(buffer.slice(0, nl));
                    buffer = buffer.slice(nl + 1);
                }
            }
            if (buffer.trim()) handleEvent(buffer);
        } catch {
            // The stream broke mid-flight (server timeout / connection drop). If a
            // final result already arrived, keep it; otherwise surface a clean
            // message instead of a raw "error at input stream".
            if (!result.template && !streamError) {
                streamError = 'La génération a été interrompue. Réessayez (ou simplifiez la demande).';
            }
        }

        if (streamError) throw new Error(streamError);
        return result;
    },

    /**
     * Image → email template (Next.js /api/ai/from-image). Sends a resized image
     * data URL plus an optional steering prompt. The campaign analysis arrives
     * once via `onReport`; `onStatus` reports stages ('reading' | 'analyzed' |
     * 'template' | 'retry'); short prose streams via `onDelta`. Resolves with the
     * assembled { message, template }.
     */
    fromImageStream: async (
        body: { image: string; prompt?: string; posterUrl?: string },
        handlers: {
            onDelta?: (text: string) => void;
            onStatus?: (stage: string) => void;
            onReport?: (report: unknown) => void;
        } = {},
    ): Promise<{ message: string; template: import('./editor-types').TemplateData | null }> => {
        const res = await fetch(`/api/ai/from-image`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });
        if (!res.ok || !res.body) {
            throw new Error(`AI image service error: ${res.status}`);
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let result: { message: string; template: import('./editor-types').TemplateData | null } = { message: '', template: null };
        let streamError = '';

        const handleEvent = (line: string) => {
            const trimmed = line.trim();
            if (!trimmed) return;
            let evt: { type?: string; text?: string; stage?: string; message?: string; template?: import('./editor-types').TemplateData; report?: unknown; error?: string };
            try {
                evt = JSON.parse(trimmed);
            } catch {
                return;
            }
            if (evt.type === 'delta') {
                if (evt.text) handlers.onDelta?.(evt.text);
            } else if (evt.type === 'status') {
                if (evt.stage) handlers.onStatus?.(evt.stage);
                if (evt.report) handlers.onReport?.(evt.report);
            } else if (evt.type === 'done') {
                result = { message: evt.message || '', template: evt.template || null };
                if (evt.report) handlers.onReport?.(evt.report);
            } else if (evt.type === 'error') {
                streamError = evt.error || "Erreur lors de l'analyse de l'image";
            }
        };

        try {
            for (;;) {
                const { done, value } = await reader.read();
                if (done) break;
                buffer += decoder.decode(value, { stream: true });
                let nl: number;
                while ((nl = buffer.indexOf('\n')) >= 0) {
                    handleEvent(buffer.slice(0, nl));
                    buffer = buffer.slice(nl + 1);
                }
            }
            if (buffer.trim()) handleEvent(buffer);
        } catch {
            // The stream broke mid-flight (server timeout / connection drop). If a
            // final result already arrived, keep it; otherwise surface a clean
            // message instead of a raw "error at input stream".
            if (!result.template && !streamError) {
                streamError = 'La génération a été interrompue. Réessayez (ou simplifiez la demande).';
            }
        }

        if (streamError) throw new Error(streamError);
        return result;
    },

    suggestPalettes: async (body: {
        email_type: string;
        vibe?: string;
    }): Promise<{ palettes: import('./ai-brief').Palette[] }> => {
        const res = await fetch(`${AI_SERVICE_URL}/suggest-palettes`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error(`Palette suggestion failed: ${res.status}`);
        return res.json();
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