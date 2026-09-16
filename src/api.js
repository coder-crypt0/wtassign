async function request(url, options = {}) {
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    },
    ...options
  })

  if (response.status === 204) return null

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    const error = new Error(data.message || `Request failed with status ${response.status}`)
    error.fields = data.errors || {}
    throw error
  }
  return data
}

export const resultApi = {
  list: () => request('/api/results'),
  get: (id) => request(`/api/results/${id}`),
  create: (payload) => request('/api/results', {
    method: 'POST',
    body: JSON.stringify(payload)
  }),
  update: (id, payload) => request(`/api/results/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload)
  }),
  remove: (id) => request(`/api/results/${id}`, {
    method: 'DELETE'
  })
}
