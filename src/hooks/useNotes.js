import { useReducer, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { STORAGE_KEY } from '../utils/constants';

function loadNotes() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveNotes(notes) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
}

function notesReducer(state, action) {
  let newState;
  switch (action.type) {
    case 'ADD_NOTE': {
      const note = {
        id: uuidv4(),
        dateKey: action.payload.dateKey || null,
        rangeStart: action.payload.rangeStart || null,
        rangeEnd: action.payload.rangeEnd || null,
        title: action.payload.title || '',
        body: action.payload.body || '',
        color: action.payload.color || 'sky',
        url: action.payload.url || null,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      newState = [...state, note];
      break;
    }
    case 'UPDATE_NOTE': {
      newState = state.map(n =>
        n.id === action.payload.id
          ? { ...n, ...action.payload, updatedAt: Date.now() }
          : n
      );
      break;
    }
    case 'DELETE_NOTE': {
      newState = state.filter(n => n.id !== action.payload.id);
      break;
    }
    case 'RESTORE_NOTE': {
      // Restore the exact original note object
      newState = [...state, action.payload.note];
      break;
    }
    default:
      return state;
  }
  saveNotes(newState);
  return newState;
}

export function useNotes() {
  const [notes, dispatch] = useReducer(notesReducer, [], loadNotes);

  const addNote = useCallback((noteData) => {
    dispatch({ type: 'ADD_NOTE', payload: noteData });
  }, []);

  const updateNote = useCallback((noteData) => {
    dispatch({ type: 'UPDATE_NOTE', payload: noteData });
  }, []);

  const deleteNote = useCallback((id) => {
    const note = notes.find(n => n.id === id);
    dispatch({ type: 'DELETE_NOTE', payload: { id } });
    return note; // return for undo
  }, [notes]);

  const restoreNote = useCallback((note) => {
    if (note) {
      dispatch({ type: 'RESTORE_NOTE', payload: { note } });
    }
  }, []);

  const getNotesForDate = useCallback((dateKey) => {
    return notes.filter(n => {
      if (n.dateKey === dateKey) return true;
      if (n.rangeStart && n.rangeEnd) {
        return dateKey >= n.rangeStart && dateKey <= n.rangeEnd;
      }
      return false;
    });
  }, [notes]);

  const getNotesForRange = useCallback((startKey, endKey) => {
    const s = startKey <= endKey ? startKey : endKey;
    const e = startKey <= endKey ? endKey : startKey;
    return notes.filter(n => {
      // Range notes that exactly match
      if (n.rangeStart === s && n.rangeEnd === e) return true;
      // Also include single-date notes within the range
      if (n.dateKey && n.dateKey >= s && n.dateKey <= e) return true;
      // Also include range notes that overlap
      if (n.rangeStart && n.rangeEnd) {
        return !(n.rangeEnd < s || n.rangeStart > e);
      }
      return false;
    });
  }, [notes]);

  const hasNotesOnDate = useCallback((dateKey) => {
    return notes.some(n => {
      if (n.dateKey === dateKey) return true;
      if (n.rangeStart && n.rangeEnd) {
        return dateKey >= n.rangeStart && dateKey <= n.rangeEnd;
      }
      return false;
    });
  }, [notes]);

  const getNoteDots = useCallback((dateKey) => {
    const dateNotes = notes.filter(n => {
      if (n.dateKey === dateKey) return true;
      if (n.rangeStart && n.rangeEnd) {
        return dateKey >= n.rangeStart && dateKey <= n.rangeEnd;
      }
      return false;
    });
    return dateNotes.slice(0, 2).map(n => n.color);
  }, [notes]);

  return {
    notes,
    addNote,
    updateNote,
    deleteNote,
    restoreNote,
    getNotesForDate,
    getNotesForRange,
    hasNotesOnDate,
    getNoteDots,
  };
}
