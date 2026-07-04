import { useEffect, useRef, useCallback } from 'react';
import type { ActiveTab } from '../types';

interface BackButtonOptions {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  onExitDialog: () => void;
}

export function useBackButton({ activeTab, setActiveTab, onExitDialog }: BackButtonOptions) {
  const historyRef = useRef<ActiveTab[]>(['dashboard']);
  const stateRef = useRef({ activeTab, setActiveTab, onExitDialog });

  // Keep ref updated
  stateRef.current = { activeTab, setActiveTab, onExitDialog };

  // Track tab changes to build history
  useEffect(() => {
    const hist = historyRef.current;
    const last = hist[hist.length - 1];
    if (activeTab !== last) {
      hist.push(activeTab);
      // Cap history length
      if (hist.length > 20) hist.shift();
    }
  }, [activeTab]);

  const handleBack = useCallback(() => {
    const { activeTab: current, setActiveTab: setTab, onExitDialog: exitDialog } = stateRef.current;
    const hist = historyRef.current;

    // If on dashboard and history is just dashboard, show exit dialog
    if (current === 'dashboard' && hist.length <= 1) {
      exitDialog();
      return;
    }

    // Pop current
    if (hist.length > 1) {
      hist.pop();
      const prev = hist[hist.length - 1];
      if (prev && prev !== current) {
        setTab(prev);
        return;
      }
    }

    // If we can't go back in history, go to dashboard
    if (current !== 'dashboard') {
      setTab('dashboard');
    } else {
      exitDialog();
    }
  }, []);

  // Listen to popstate (browser back / Android back)
  useEffect(() => {
    // Push a dummy state so we can intercept back
    window.history.pushState({ app: 'simkbm', depth: 0 }, '');

    const onPopState = () => {
      handleBack();
      // Re-push to prevent actual navigation
      window.history.pushState({ app: 'simkbm', depth: 0 }, '');
    };

    window.addEventListener('popstate', onPopState);
    return () => {
      window.removeEventListener('popstate', onPopState);
    };
  }, [handleBack]);

  // Reset history when user logs out (when activeTab resets to dashboard from external)
  const resetHistory = useCallback(() => {
    historyRef.current = ['dashboard'];
  }, []);

  return { handleBack, resetHistory };
}
