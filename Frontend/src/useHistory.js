import { useState, useCallback, useEffect } from 'react';

export const useHistory = (initialState) => {
  const [index, setIndex] = useState(0);
  const [history, setHistory] = useState([initialState]);

  const setState = useCallback((action, overwrite = false) => {
    const newState = typeof action === 'function' ? action(history[index]) : action;
    if (overwrite) {
      const historyCopy = [...history];
      historyCopy[index] = newState;
      setHistory(historyCopy);
    } else {
      const updated = history.slice(0, index + 1);
      setHistory([...updated, newState]);
      setIndex(updated.length);
    }
  }, [index, history]);

  const undo = useCallback(() => {
    if (index > 0) {
      setIndex(prev => prev - 1);
    }
  }, [index]);

  const redo = useCallback(() => {
    if (index < history.length - 1) {
      setIndex(prev => prev + 1);
    }
  }, [index, history.length]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const ctrlKey = isMac ? e.metaKey : e.ctrlKey;

      if (ctrlKey && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
      } else if (ctrlKey && e.key === 'y') {
        e.preventDefault();
        redo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);


  return [
    history[index],
    setState,
    undo,
    redo,
    index > 0,
    index < history.length - 1
  ];
};