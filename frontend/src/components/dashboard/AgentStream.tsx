import React from 'react';
import type { AgentLogEntry } from '../../types';

interface AgentStreamProps {
  logs: AgentLogEntry[];
  isStreaming: boolean;
}

const AGENT_ICONS: Record<string, string> = {
  data_fetcher: '🔍',
  security_analyzer: '🛡️',
  holder_analyzer: '👥',
  sentiment_analyzer: '📊',
  risk_synthesizer: '⚡',
};

const AGENT_LABELS: Record<string, string> = {
  data_fetcher: 'Data Fetcher',
  security_analyzer: 'Security Analyzer',
  holder_analyzer: 'Holder Analyzer',
  sentiment_analyzer: 'Sentiment Analyzer',
  risk_synthesizer: 'Risk Synthesizer',
};

export const AgentStream: React.FC<AgentStreamProps> = ({ logs, isStreaming }) => {
  if (logs.length === 0 && !isStreaming) return null;

  return (
    <div className="agent-stream">
      <div className="agent-stream__header">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="4 17 10 11 4 5" />
          <line x1="12" y1="19" x2="20" y2="19" />
        </svg>
        <span>Agent Activity</span>
        {isStreaming && <span className="agent-stream__live">LIVE</span>}
      </div>
      <div className="agent-stream__log">
        {logs.map((log, idx) => (
          <div key={idx} className={`agent-stream__entry agent-stream__entry--${log.status}`}>
            <span className="agent-stream__icon">
              {AGENT_ICONS[log.agent] || '🤖'}
            </span>
            <span className="agent-stream__agent">
              {AGENT_LABELS[log.agent] || log.agent}
            </span>
            <span className="agent-stream__message">{log.message}</span>
            <span className="agent-stream__status">
              {log.status === 'running' && '⏳'}
              {log.status === 'complete' && '✓'}
              {log.status === 'error' && '✗'}
            </span>
          </div>
        ))}
        {isStreaming && (
          <div className="agent-stream__entry agent-stream__entry--running">
            <span className="agent-stream__icon">⏳</span>
            <span className="agent-stream__message agent-stream__message--pulse">
              Processing...
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
