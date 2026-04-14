import { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';

export function useCards() {
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetch = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.cards.list();
      setCards(data);
      setError(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const create = useCallback(async (body) => {
    const card = await api.cards.create(body);
    setCards(prev => [...prev, card].sort((a, b) => (a.dueDate || '').localeCompare(b.dueDate || '')));
    return card;
  }, []);

  const update = useCallback(async (id, body) => {
    const card = await api.cards.update(id, body);
    setCards(prev => prev.map(c => c.id === id ? card : c));
    return card;
  }, []);

  const remove = useCallback(async (id) => {
    await api.cards.delete(id);
    setCards(prev => prev.filter(c => c.id !== id));
  }, []);

  return { cards, loading, error, refresh: fetch, create, update, remove };
}
