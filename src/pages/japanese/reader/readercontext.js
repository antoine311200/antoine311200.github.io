import React, { createContext, useContext, useReducer } from 'react';

const initialState = {
    fileContent: "",
    setFileContent: () => { },

    savedWords: [],
    setSavedWords: () => { },
};

export const ReaderContext = createContext(initialState);
