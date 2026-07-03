import { useState, useCallback } from 'react';
import { emailRankingService } from '../services/emailRankingService';

type ActionState = 'idle' | 'loading' | 'success' | 'error';

export function useEmailActions(onStatusChange?: (id: string, status: 'replied') => void) {
  const [actionStates, setActionStates] = useState<Record<string, ActionState>>({});
  const [toasts, setToasts] = useState<{ id: string; message: string; type: 'success' | 'error' }[]>([]);

  const setActionState = useCallback((id: string, state: ActionState) => {
    setActionStates(prev => ({ ...prev, [id]: state }));
  }, []);

  const addToast = useCallback((message: string, type: 'success' | 'error') => {
    const id = Math.random().toString(36).slice(2);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500);
  }, []);

  const sendReply = useCallback(async (candidateId: string, candidateName: string) => {
    setActionState(candidateId, 'loading');
    try {
      const result = await emailRankingService.sendReply(candidateId);
      if (result.success) {
        setActionState(candidateId, 'success');
        onStatusChange?.(candidateId, 'replied');
        addToast(`Reply sent to ${candidateName} ✓`, 'success');
        setTimeout(() => setActionState(candidateId, 'idle'), 2000);
      }
    } catch {
      setActionState(candidateId, 'error');
      addToast(`Failed to send reply to ${candidateName}`, 'error');
      setTimeout(() => setActionState(candidateId, 'idle'), 2000);
    }
  }, [setActionState, onStatusChange, addToast]);

  const resendReply = useCallback(async (candidateId: string, candidateName: string) => {
    setActionState(candidateId, 'loading');
    try {
      const result = await emailRankingService.resendReply(candidateId);
      if (result.success) {
        setActionState(candidateId, 'success');
        addToast(`Reply re-sent to ${candidateName} ✓`, 'success');
        setTimeout(() => setActionState(candidateId, 'idle'), 2000);
      }
    } catch {
      setActionState(candidateId, 'error');
      addToast(`Failed to re-send reply to ${candidateName}`, 'error');
      setTimeout(() => setActionState(candidateId, 'idle'), 2000);
    }
  }, [setActionState, addToast]);

  return {
    actionStates,
    toasts,
    sendReply,
    resendReply,
    dismissToast: (id: string) => setToasts(prev => prev.filter(t => t.id !== id)),
  };
}
