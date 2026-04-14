const BASE = '/api';

async function req(method, path, body) {
  const res = await fetch(BASE + path, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 204) return null;
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

export const api = {
  cards: {
    list:         ()       => req('GET',    '/cards'),
    get:          (id)     => req('GET',    `/cards/${id}`),
    create:       (body)   => req('POST',   '/cards', body),
    update:       (id, b)  => req('PUT',    `/cards/${id}`, b),
    delete:       (id)     => req('DELETE', `/cards/${id}`),
    statement:    (id, b)  => req('PATCH',  `/cards/${id}/statement`, b),
    pay:          (id, b)  => req('POST',   `/cards/${id}/pay`, b),
    transactions: (id)     => req('GET',    `/cards/${id}/transactions`),
  },
  settings: {
    get:  ()     => req('GET', '/settings'),
    save: (body) => req('PUT', '/settings', body),
  },
  reminders: {
    sendNow: () => req('POST', '/reminders/send'),
  },
};
