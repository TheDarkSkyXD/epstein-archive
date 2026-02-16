import React, { createContext } from 'react';

export interface UndoAction {
  id: string;
  description: string;
  timestamp: number;
  undo: () => Promise<void> | void;
}

export interface UndoState {
  actions: UndoAction[];
  notification: {
    message: string;
    visible: boolean;
    action?: UndoAction;
  } | null;
}

export type UndoActionType =
  | { type: 'ADD_ACTION'; payload: UndoAction }
  | { type: 'REMOVE_ACTION'; payload: string }
  | { type: 'SHOW_NOTIFICATION'; payload: { message: string; action?: UndoAction } }
  | { type: 'HIDE_NOTIFICATION' }
  | { type: 'CLEAR_ALL' };

export interface UndoContextValue {
  state: UndoState;
  dispatch: React.Dispatch<UndoActionType>;
  addUndoAction: (action: Omit<UndoAction, 'id' | 'timestamp'>) => void;
  performUndo: (actionId: string) => Promise<void>;
  showNotification: (message: string, action?: UndoAction) => void;
  hideNotification: () => void;
}

export const UndoContext = createContext<UndoContextValue | undefined>(undefined);
