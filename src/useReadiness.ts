import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { useIsFocused } from 'expo-router';
import { getPipelineStatus, statusLabels } from './pipeline';

export function useAppActive(): boolean {
  const focused = useIsFocused();
  const [active, setActive] = useState(AppState.currentState === 'active');
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) =>
      setActive(state === 'active'),
    );
    return () => subscription.remove();
  }, []);
  return focused && active;
}

export function useReadiness() {
  const active = useAppActive();
  const [labels, setLabels] = useState(statusLabels);
  useEffect(() => {
    if (!active) return;
    let timer: ReturnType<typeof setTimeout>;
    const refresh = () => {
      const next = statusLabels();
      setLabels((previous) =>
        previous.llmLabel === next.llmLabel && previous.classifierLabel === next.classifierLabel
          ? previous
          : next,
      );
      if (['not_loaded', 'copying_model', 'loading'].includes(getPipelineStatus().llm))
        timer = setTimeout(refresh, 1000);
    };
    refresh();
    return () => clearTimeout(timer);
  }, [active]);
  return labels;
}
