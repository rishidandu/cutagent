/**
 * Simple undo/redo stack for scene state.
 * Stores snapshots of the scenes array. Max 30 entries.
 */

const MAX_HISTORY = 30;

export interface UndoStack<T> {
  past: T[];
  present: T;
  future: T[];
}

export function createUndoStack<T>(initial: T): UndoStack<T> {
  return { past: [], present: initial, future: [] };
}

export function pushState<T>(stack: UndoStack<T>, newState: T): UndoStack<T> {
  return {
    past: [...stack.past.slice(-(MAX_HISTORY - 1)), stack.present],
    present: newState,
    future: [], // Clear redo on new action
  };
}

export function undo<T>(stack: UndoStack<T>): UndoStack<T> {
  if (stack.past.length === 0) return stack;
  const previous = stack.past[stack.past.length - 1];
  return {
    past: stack.past.slice(0, -1),
    present: previous,
    future: [stack.present, ...stack.future],
  };
}

export function redo<T>(stack: UndoStack<T>): UndoStack<T> {
  if (stack.future.length === 0) return stack;
  const next = stack.future[0];
  return {
    past: [...stack.past, stack.present],
    present: next,
    future: stack.future.slice(1),
  };
}

export function canUndo<T>(stack: UndoStack<T>): boolean {
  return stack.past.length > 0;
}

export function canRedo<T>(stack: UndoStack<T>): boolean {
  return stack.future.length > 0;
}
