import { useState, useRef } from 'react';
import { useCards } from './hooks/useCards';
import CardItem from './components/CardItem';
import CardForm from './components/CardForm';
import NewStatementModal from './components/NewStatementModal';
import PayModal from './components/PayModal';
import HistoryModal from './components/HistoryModal';
import PayoffModal from './components/PayoffModal';
import Reminders from './components/Reminders';
import SettingsModal from './components/SettingsModal';
import { fmt, daysUntil } from './lib/utils';

export default function App() {
  const { cards, loading, error, create, update, remove, newStatement, payCard, undoPayment } = useCards();
  const [editCard,      setEditCard]      = useState(null);   // card obj or true (add new)
  const [statementCard, setStatementCard] = useState(null);
  const [payingCard,    setPayingCard]    = useState(null);
  const [historyCard,   setHistoryCard]   = useState(null);
  const [payoffCard,    setPayoffCard]    = useState(null);
  const [showSettings,  setShowSettings]  = useState(false);
  const [toast,         setToast]         = useState('');
  const [undoState,     setUndoState]     = useState(null); // { cardId, txId }
  const undoTimer = useRef(null);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2400);
  };

  const handleSave = async (form) => {
    if (editCard === true) {
      await create(form);
      showToast('Card added');
    } else {
      await update(editCard.id, form);
      showToast('Card updated');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this card?')) return;
    await remove(id);
    showToast('Card removed');
  };

  const handleStatement = async (balance, dueDate) => {
    await newStatement(statementCard.id, balance, dueDate);
    showToast('Statement saved');
  };

  const handlePay = async (amount, note) => {
    const { card, transactionId } = await payCard(payingCard.id, amount, note);
    showToast('Payment recorded');
    if (undoTimer.current) clearTimeout(undoTimer.current);
    setUndoState({ cardId: card.id, txId: transactionId });
    undoTimer.current = setTimeout(() => setUndoState(null), 5000);
  };

  const handleUndo = async () => {
    if (!undoState) return;
    clearTimeout(undoTimer.current);
    await undoPayment(undoState.cardId, undoState.txId);
    setUndoState(null);
    showToast('Payment undone');
  };


  // Summary stats
  const totalOwed      = cards.reduce((s, c) => s + Number(c.balance || 0), 0);
  const dueWeek        = cards
    .filter(c => { const d = daysUntil(c.dueDate); return c.balance > 0 && d != null && d <= 7 && d >= 0; })
    .reduce((s, c) => s + Number(c.balance || 0), 0);
  const totalLimit     = cards.reduce((s, c) => s + Number(c.limit || 0), 0);
  const totalCurrent   = cards.reduce((s, c) => s + Number(c.currentBalance || 0), 0);
  const availCredit    = totalLimit - totalCurrent;
  const utilPct        = totalLimit > 0 ? (totalCurrent / totalLimit * 100) : 0;

  const todayStr = new Date().toLocaleDateString('en-CA', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  return (
    <>
      <div className="app">
        <header className="header">
          <div className="header-left">
            <h1>Card Tracker</h1>
            <p className="header-date">{todayStr}</p>
          </div>
          <div className="header-right">
            <button className="btn btn-ghost btn-sm" onClick={() => setShowSettings(true)}>
              Email settings
            </button>
            <button className="btn btn-accent" onClick={() => setEditCard(true)}>
              + Add card
            </button>
          </div>
        </header>

        <div className="summary">
          <div className="summary-card">
            <div className="summary-label">Total owed</div>
            <div className="summary-value">{fmt(totalOwed)}</div>
          </div>
          <div className="summary-card">
            <div className="summary-label">Due this week</div>
            <div className="summary-value">{fmt(dueWeek)}</div>
          </div>
          <div className="summary-card">
            <div className="summary-label">Total credit</div>
            <div className="summary-value">{fmt(totalLimit)}</div>
          </div>
          <div className="summary-card">
            <div className="summary-label">Available credit</div>
            <div className="summary-value">{fmt(availCredit)}</div>
          </div>
          <div className="summary-card">
            <div className="summary-label">Utilization</div>
            <div className="summary-value">{utilPct.toFixed(1)}%</div>
          </div>
        </div>

        <Reminders cards={cards} />

        <div className="section-label">Your cards</div>

        {loading && <p className="muted" style={{ padding: '2rem 0' }}>Loading…</p>}
        {error   && <p className="form-error" style={{ padding: '1rem 0' }}>Error: {error}</p>}

        {!loading && !error && (
          <div className="cards-grid">
            {cards.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">💳</div>
                <p>No cards yet. Add your first card to start tracking.</p>
              </div>
            ) : (
              cards.map(c => (
                <CardItem
                  key={c.id}
                  card={c}
                  onEdit={setEditCard}
                  onDelete={handleDelete}
                  onStatement={c => {
                    if (c.balance > 0 && !confirm(`This card has an unpaid balance of ${fmt(c.balance)}. Record a new statement anyway?`)) return;
                    setStatementCard(c);
                  }}
                  onPay={setPayingCard}
                  onHistory={setHistoryCard}
                  onPayoff={setPayoffCard}
                />
              ))
            )}
          </div>
        )}
      </div>

      {editCard && (
        <CardForm
          card={editCard === true ? null : editCard}
          onSave={handleSave}
          onClose={() => setEditCard(null)}
        />
      )}

      {statementCard && (
        <NewStatementModal
          card={statementCard}
          onSave={handleStatement}
          onClose={() => setStatementCard(null)}
        />
      )}

      {payingCard && (
        <PayModal
          card={payingCard}
          onSave={handlePay}
          onClose={() => setPayingCard(null)}
        />
      )}

      {historyCard && (
        <HistoryModal
          card={historyCard}
          onClose={() => setHistoryCard(null)}
        />
      )}

      {payoffCard && (
        <PayoffModal
          card={payoffCard}
          onClose={() => setPayoffCard(null)}
        />
      )}

      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}

      {undoState && (
        <div className="undo-bar">
          <span>Payment recorded</span>
          <button className="btn btn-ghost btn-sm" onClick={handleUndo}>Undo</button>
        </div>
      )}

      <div className={`toast ${toast ? 'show' : ''}`}>{toast}</div>
    </>
  );
}
