import React, { createContext, useContext, useReducer, useCallback, useEffect } from 'react';

// Define types for our undo system
interface UndoAction {
  id: string;
  description: string;
  timestamp: number;
  undo: () => Promise<void> | void;
}

interface UndoState {
  actions: UndoAction[];
  notification: {
    message: string;
    visible: boolean;
    action?: UndoAction;
  } | null;
}

type UndoActionType =
  | { type: 'ADD_ACTION'; payload: UndoAction }
  | { type: 'REMOVE_ACTION'; payload: string }
  | { type: 'SHOW_NOTIFICATION'; payload: { message: string; action?: UndoAction } }
  | { type: 'HIDE_NOTIFICATION' }
  | { type: 'CLEAR_ALL' };

// Create reducer for undo state
const undoReducer = (state: UndoState, action: UndoActionType): UndoState => {
  switch (action.type) {
    case 'ADD_ACTION':
      return {
        ...state,
        actions: [action.payload, ...state.actions].slice(0, 10), // Keep only last 10 actions
      };
    case 'REMOVE_ACTION':
      return {
        ...state,
        actions: state.actions.filter((a) => a.id !== action.payload),
      };
    case 'SHOW_NOTIFICATION':
      return {
        ...state,
        notification: {
          message: action.payload.message,
          visible: true,
          action: action.payload.action,
        },
      };
    case 'HIDE_NOTIFICATION':
      return {
        ...state,
        notification: null,
      };
    case 'CLEAR_ALL':
      return {
        actions: [],
        notification: null,
      };
    default:
      return state;
  }
};

// Create context
const UndoContext = createContext<
  | {
      state: UndoState;
      dispatch: React.Dispatch<UndoActionType>;
      addUndoAction: (action: Omit<UndoAction, 'id' | 'timestamp'>) => void;
      performUndo: (actionId: string) => Promise<void>;
      showNotification: (message: string, action?: UndoAction) => void;
      hideNotification: () => void;
    }
  | undefined
>(undefined);

// Provider component
export const UndoProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(undoReducer, {
    actions: [],
    notification: null,
  });

  // Hide notification after 5 seconds
  useEffect(() => {
    if (state.notification?.visible) {
      const timer = setTimeout(() => {
        dispatch({ type: 'HIDE_NOTIFICATION' });
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [state.notification]);

  const showNotification = useCallback((message: string, action?: UndoAction) => {
    dispatch({
      type: 'SHOW_NOTIFICATION',
      payload: { message, action },
    });
  }, []);

  const hideNotification = useCallback(() => {
    dispatch({ type: 'HIDE_NOTIFICATION' });
  }, []);

  const addUndoAction = useCallback(
    (action: Omit<UndoAction, 'id' | 'timestamp'>) => {
      const undoAction: UndoAction = {
        ...action,
        id: Math.random().toString(36).substr(2, 9),
        timestamp: Date.now(),
      };
      dispatch({ type: 'ADD_ACTION', payload: undoAction });
      showNotification(`${action.description} completed.`, undoAction);
    },
    [showNotification],
  );

  const performUndo = useCallback(
    async (actionId: string) => {
      const action = state.actions.find((a) => a.id === actionId);
      if (action) {
        try {
          await action.undo();
          dispatch({ type: 'REMOVE_ACTION', payload: actionId });
          showNotification('Action undone successfully.');
        } catch (error) {
          showNotification('Failed to undo action.');
          console.error('Undo failed:', error);
        }
      }
    },
    [state.actions, showNotification],
  );

  const value = {
    state,
    dispatch,
    addUndoAction,
    performUndo,
    showNotification,
    hideNotification,
  };

  return (
    <UndoContext.Provider value={value}>
      {children}
      {state.notification?.visible && (
        <div className="fixed bottom-4 right-4 bg-slate-800 border border-slate-700 rounded-lg p-4 shadow-lg z-50 max-w-md">
          <div className="flex items-center justify-between">
            <p className="text-white text-sm">{state.notification.message}</p>
            {state.notification.action && (
              <button
                onClick={() => performUndo(state.notification!.action!.id)}
                className="ml-4 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition-colors"
              >
                Undo
              </button>
            )}
            <button
              onClick={hideNotification}
              className="ml-2 text-slate-400 hover:text-white"
              aria-label="Close notification"
            >
              ×
            </button>
          </div>
        </div>
      )}
    </UndoContext.Provider>
  );
};

// Hook to use undo functionality
export const useUndo = () => {
  const context = useContext(UndoContext);
  if (!context) {
    throw new Error('useUndo must be used within an UndoProvider');
  }
  return context;
};

export default UndoProvider;
