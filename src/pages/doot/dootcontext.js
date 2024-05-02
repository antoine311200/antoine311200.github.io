import React, { createContext, useContext, useReducer } from 'react';

const initialState = {
    isConnected: false,
    setIsConnected: () => { },

    doots: [],
    setDoots: () => { },

    gridDoots: [],
    setGridDoots: () => { },

    window: 'network',
    setWindow: () => { },

    currentDoot: null,
    setCurrentDoot: () => { },

    currentUser: null,
    setCurrentUser: () => { },

    searchQuery: '',
    setSearchQuery: () => { },
};

export const DootContext = createContext(initialState);
