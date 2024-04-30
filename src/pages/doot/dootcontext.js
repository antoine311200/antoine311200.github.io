import React, { createContext, useContext, useReducer } from 'react';

const initialState = {
    isConnected: false,
    setIsConnected: () => { },
};

export const DootContext = createContext(initialState);
