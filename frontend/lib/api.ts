const API_URL = 'http://localhost:3000';

async function request(endpoint: string, options: RequestInit = {}){
    const res = await fetch(`${API_URL}${endpoint}`,{
     ...options,
     credentials: 'include', // send ookies with every request
     headers: {
        'Content-Type': 'application/json',
        ...options.headers,
     },
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

//----- Templates ----
export const templates = {
    create: (body: { name: string; description?: string; type: number; subject?: string; content: string }) =>
        request('/templates', { method: 'POST', body: JSON.stringify(body) }),
    
    list:(params?: {page?: number; limit?: number; type?: string; search?: string; favoritesOnly?: boolean;}) =>{
        const query = new URLSearchParams();
        if(params?.page) query.set('page', String(params.page));
        if(params?.limit) query.set('limit', String(params.limit));
        if(params?.type) query.set('type', params.type);
        if(params?.search) query.set('search', params.search);
        if(params?.favoritesOnly) query.set('favoritesOnly', 'true');
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

    render:(id: string, variables: Record<string, string>) =>
        request(`/templates/${id}/render`, { method: 'POST', body: JSON.stringify(variables) }),

    sendTestEmail: (body: { to?: string; subject?: string; content: string }) =>
        request('/templates/test-email', { method: 'POST', body: JSON.stringify(body) }),
};

// ─── Media ───
const API_URL_RAW = 'http://localhost:3000';

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
const AI_SERVICE_URL = 'http://127.0.0.1:8001';

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
        // Fix double slashes in self-closing tags: / /> → />
        mjml = mjml.replace(/\/ \/>/g, '/>');
        // Fix missing closing on self-closing tags
        mjml = mjml.replace(/<mj-image([^>]*[^/])>/g, '<mj-image$1 />');
        mjml = mjml.replace(/<mj-divider([^>]*[^/])>/g, '<mj-divider$1 />');

        return { mjml };
    },
};