const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

async function request(path, options = {}) {
  let response;

  try {
    response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      }
    });
  } catch {
    throw new Error(`Cannot reach the Demomojis API at ${API_URL}. Make sure the server is running and MongoDB Atlas allows your IP address.`);
  }

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
