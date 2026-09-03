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

    editDoot: null,
    setEditDoot: () => { },

    currentUser: null,
    setCurrentUser: () => { },

    searchQuery: '',
    setSearchQuery: () => { },

    nodes: [],
    setNodes: () => { },

    edges: [
        {
            id: 0,
            label: "TEST",
            color: "#f6ad55",
            group: "none",
        }
    ],
    setEdges: () => { },
};

export const DootContext = createContext(initialState);
