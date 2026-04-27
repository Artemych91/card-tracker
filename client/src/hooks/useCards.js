import { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';

function sortCards(cards) {
  return [...cards].sort((a, b) => {
    const aUnpaid = (a.balance || 0) > 0 ? 0 : 1;
    const bUnpaid = (b.balance || 0) > 0 ? 0 : 1;
    if (aUnpaid !== bUnpaid) return aUnpaid - bUnpaid;
    return (a.dueDate || '').localeCompare(b.dueDate || '');
  });
}

export function useCards() {
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetch = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.cards.list();
      setCards(sortCards(data));
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
    setCards(prev => sortCards([...prev, card]));
    return card;
  }, []);

  const update = useCallback(async (id, body) => {
    const card = await api.cards.update(id, body);
    setCards(prev => sortCards(prev.map(c => c.id === id ? card : c)));
    return card;
  }, []);

  const remove = useCallback(async (id) => {
    await api.cards.delete(id);
    setCards(prev => prev.filter(c => c.id !== id));
  }, []);

  const newStatement = useCallback(async (id, balance, dueDate) => {
    const card = await api.cards.statement(id, { balance, dueDate });
    setCards(prev => sortCards(prev.map(c => c.id === id ? card : c)));
    return card;
  }, []);

  const payCard = useCallback(async (id, amount, note) => {
    const { card, transactionId } = await api.cards.pay(id, { amount, note });
    setCards(prev => sortCards(prev.map(c => c.id === id ? card : c)));
    return { card, transactionId };
  }, []);

  const undoPayment = useCallback(async (cardId, txId) => {
    const { balance } = await api.transactions.undo(cardId, txId);
    setCards(prev => sortCards(prev.map(c => c.id === cardId ? { ...c, balance } : c)));
  }, []);

  const getTransactions = useCallback((id) => api.cards.transactions(id), []);

  return { cards, loading, error, refresh: fetch, create, update, remove, newStatement, payCard, undoPayment, getTransactions };
}
