const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

function getVoterId() {
  const storageKey = 'demojis:voter-id';
  const existing = window.localStorage.getItem(storageKey);

  if (existing) {
    return existing;
  }

  const created = window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`;
  window.localStorage.setItem(storageKey, created);
  return created;
}

async function request(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'x-voter-id': getVoterId(),
      ...(options.headers || {})
    }
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(payload.message || 'Request failed');
    error.payload = payload;
    throw error;
  }

  return payload;
}

export function fetchDemojis({ search = '', sort = 'popular' } = {}) {
  const params = new URLSearchParams({ sort });

  if (search.trim()) {
    params.set('search', search.trim());
  }

  return request(`/api/demojis?${params.toString()}`);
}

export function checkDemoji(prompt) {
  const params = new URLSearchParams({ prompt });
  return request(`/api/demojis/check?${params.toString()}`);
}

export function createDemoji(payload) {
  return request('/api/demojis', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export function previewDemoji(payload) {
  return request('/api/demojis/preview', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export function voteForDemoji(id) {
  return request(`/api/demojis/${id}/vote`, {
    method: 'PATCH'
  });
}
