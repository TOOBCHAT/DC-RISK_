import { useState, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import type { AgentLogEntry, RiskReport } from '../types';

export type AnalysisStatus = 'idle' | 'loading' | 'streaming' | 'success' | 'error';

interface UseAnalysisReturn {
  status: AnalysisStatus;
  error: string | null;
  agentLogs: AgentLogEntry[];
  report: RiskReport | null;
  analyzeToken: (address: string) => Promise<void>;
  loadFromHistory: (reportData: RiskReport, logs: AgentLogEntry[]) => void;
  reset: () => void;
}

function isValidSolanaAddress(address: string): boolean {
  if (typeof address !== 'string') return false;
  if (address.length < 32 || address.length > 44) return false;
  const BASE58_CHARS = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  for (let i = 0; i < address.length; i++) {
    if (!BASE58_CHARS.includes(address[i])) return false;
  }
  return true;
}

/**
 * Process a chunk of SSE text and extract all complete JSON payloads.
 * Handles both formats:
 *   - "event: X\ndata: {...}\n\n"
 *   - "data: {...}\n\n"
 * Also handles sse-starlette ping comments ": ping ..."
 */
function extractSSEPayloads(text: string): Array<Record<string, unknown>> {
  const payloads: Array<Record<string, unknown>> = [];
  // Match every line that starts with "data:" or "data: "
  const dataLineRegex = /^data:\s*(.+)$/gm;
  let match;
  while ((match = dataLineRegex.exec(text)) !== null) {
    try {
      const parsed = JSON.parse(match[1]);
      payloads.push(parsed);
    } catch {
      // skip non-JSON data lines
    }
  }
  return payloads;
}

export function useAnalysis(): UseAnalysisReturn {
  const [status, setStatus] = useState<AnalysisStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [agentLogs, setAgentLogs] = useState<AgentLogEntry[]>([]);
  const [report, setReport] = useState<RiskReport | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const analyzeToken = useCallback(async (address: string) => {
    const trimmed = address.trim();

    if (!isValidSolanaAddress(trimmed)) {
      setStatus('error');
      setError('Please enter a valid Solana token address (32-44 base58 characters)');
      return;
    }

    setStatus('loading');
    setError(null);
    setAgentLogs([]);
    setReport(null);

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setStatus('error');
        setError('Please sign in to analyze tokens');
        return;
      }

      const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:8000';

      const response = await fetch(`${apiBase}/api/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ token_address: trimmed }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({ detail: 'Analysis failed' }));
        throw new Error(errData.detail || `Server error: ${response.status}`);
      }

      setStatus('streaming');
      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response stream');

      const decoder = new TextDecoder();
      let allText = '';
      let gotComplete = false;

      // Read the entire SSE stream, processing payloads as they arrive
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        allText += chunk;

        // Process any new payloads in this chunk
        const payloads = extractSSEPayloads(chunk);
        for (const parsed of payloads) {
          if (parsed.type === 'agent_update') {
            const logEntry: AgentLogEntry = {
              agent: (parsed.node as string) || (parsed.agent as string) || 'unknown',
              status: 'complete',
              message: (parsed.message as string) || 'Step completed',
              timestamp: (parsed.timestamp as string) || new Date().toISOString(),
            };
            setAgentLogs((prev) => [...prev, logEntry]);
          } else if (parsed.type === 'complete') {
            gotComplete = true;
            if (parsed.data) {
              setReport(parsed.data as RiskReport);
              setStatus('success');
            } else {
              setStatus('error');
              setError('Analysis completed but no report was generated.');
            }
          } else if (parsed.type === 'error') {
            throw new Error((parsed.message as string) || 'Analysis failed');
          }
        }
      }

      // After stream ends, do one final check on the full accumulated text
      // in case the last chunk wasn't processed (no trailing newline)
      if (!gotComplete) {
        const finalPayloads = extractSSEPayloads(allText);
        for (const parsed of finalPayloads) {
          if (parsed.type === 'complete' && !gotComplete) {
            gotComplete = true;
            if (parsed.data) {
              setReport(parsed.data as RiskReport);
              setStatus('success');
            } else {
              setStatus('error');
              setError('Analysis completed but no report was generated.');
            }
          }
        }
      }

      if (!gotComplete) {
        setStatus('error');
        setError('The analysis stream ended unexpectedly. Please try again.');
      }
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      console.error('[DC-RISK] Analysis error:', err);
      setStatus('error');
      setError(err.message || 'Failed to analyze token. Please try again.');
    }
  }, []);

  const loadFromHistory = useCallback((reportData: RiskReport, logs: AgentLogEntry[]) => {
    setReport(reportData);
    setAgentLogs(logs);
    setStatus('success');
    setError(null);
  }, []);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setStatus('idle');
    setError(null);
    setAgentLogs([]);
    setReport(null);
  }, []);

  return {
    status,
    error,
    agentLogs,
    report,
    analyzeToken,
    loadFromHistory,
    reset,
  };
}
