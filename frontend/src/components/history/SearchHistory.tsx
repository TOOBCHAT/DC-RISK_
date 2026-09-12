import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../auth/AuthProvider';
import type { AnalysisHistoryItem, RiskReport, AgentLogEntry } from '../../types';

interface SearchHistoryProps {
  onLoadAnalysis: (report: RiskReport, logs: AgentLogEntry[]) => void;
  isOpen: boolean;
  onToggle: () => void;
}

const RISK_COLORS: Record<string, string> = {
  low: '#22c55e',
  medium: '#eab308',
  high: '#ef4444',
  critical: '#dc2626',
};

export const SearchHistory: React.FC<SearchHistoryProps> = ({ onLoadAnalysis, isOpen, onToggle }) => {
  const { user } = useAuth();
  const [history, setHistory] = useState<AnalysisHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  // Fetch history when panel opens
  useEffect(() => {
    if (!isOpen || !user) return;

    const fetchHistory = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('analyses')
          .select('id, token_address, token_name, token_symbol, risk_score, risk_level, confidence, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(30);

        if (error) throw error;
        setHistory(data as AnalysisHistoryItem[]);
      } catch (err) {
        console.error('[DC-RISK] Failed to fetch history:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [isOpen, user]);

  const handleItemClick = async (item: AnalysisHistoryItem) => {
    setLoadingId(item.id);
    try {
      const { data, error } = await supabase
        .from('analyses')
        .select('report_data, agent_log')
        .eq('id', item.id)
        .single();

      if (error) throw error;
      if (data) {
        onLoadAnalysis(
          data.report_data as RiskReport,
          (data.agent_log || []) as AgentLogEntry[],
        );
      }
    } catch (err) {
      console.error('[DC-RISK] Failed to load analysis:', err);
    } finally {
      setLoadingId(null);
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <>
      {/* Toggle button */}
      <button className="history-toggle" onClick={onToggle} aria-label="Toggle search history">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
        <span className="history-toggle__label">History</span>
        {history.length > 0 && (
          <span className="history-toggle__count">{history.length}</span>
        )}
      </button>

      {/* Sidebar */}
      <div className={`history-sidebar ${isOpen ? 'history-sidebar--open' : ''}`}>
        <div className="history-sidebar__header">
          <h3 className="history-sidebar__title">Search History</h3>
          <button className="history-sidebar__close" onClick={onToggle} aria-label="Close history">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="history-sidebar__list">
          {loading ? (
            <div className="history-sidebar__loading">
              <div className="skeleton skeleton--text" style={{ width: '80%' }} />
              <div className="skeleton skeleton--text" style={{ width: '60%' }} />
              <div className="skeleton skeleton--text" style={{ width: '70%' }} />
            </div>
          ) : history.length === 0 ? (
            <div className="history-sidebar__empty">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.3, marginBottom: '0.5rem' }}>
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <p>No analyses yet</p>
              <p style={{ fontSize: '0.7rem' }}>Scan a token to get started</p>
            </div>
          ) : (
            <>
              {history.map((item) => (
                <div key={item.id} className="history-item-wrapper" style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <button
                    className="history-item"
                    style={{ flex: 1 }}
                    onClick={() => handleItemClick(item)}
                    disabled={loadingId === item.id}
                  >
                    <div className="history-item__top">
                      <span className="history-item__name">
                        {item.token_name || item.token_symbol || 'Unknown'}
                      </span>
                      <span
                        className="history-item__badge"
                        style={{ color: RISK_COLORS[item.risk_level] || '#71717A' }}
                      >
                        {item.risk_score}
                      </span>
                    </div>
                    <div className="history-item__bottom">
                      <span className="history-item__address">
                        {item.token_address.slice(0, 6)}...{item.token_address.slice(-4)}
                      </span>
                      <span className="history-item__date">{formatDate(item.created_at)}</span>
                    </div>
                    {loadingId === item.id && (
                      <div className="history-item__loading" />
                    )}
                  </button>
                  <button
                    className="history-item__delete"
                    style={{ padding: '0 0.5rem', background: 'transparent', border: 'none', color: '#71717a', cursor: 'pointer', borderRadius: '4px' }}
                    onClick={async (e) => {
                      e.stopPropagation();
                      if (window.confirm('Delete this history item?')) {
                        try {
                          const { deleteHistoryItem } = await import('../../lib/api');
                          await deleteHistoryItem(item.id);
                          setHistory(prev => prev.filter(h => h.id !== item.id));
                        } catch (err) {
                          console.error('Failed to delete history item', err);
                        }
                      }
                    }}
                    title="Delete item"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6"></polyline>
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                  </button>
                </div>
              ))}
              <div style={{ marginTop: '1rem', textAlign: 'center' }}>
                <button
                  className="auth-form__submit"
                  style={{ background: 'transparent', border: '1px solid #ef4444', color: '#ef4444' }}
                  onClick={async () => {
                    if (window.confirm('Are you sure you want to clear all history?')) {
                      try {
                        const { clearAllHistory } = await import('../../lib/api');
                        await clearAllHistory();
                        setHistory([]);
                      } catch (err) {
                        console.error('Failed to clear history', err);
                      }
                    }
                  }}
                >
                  Clear All History
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
};
