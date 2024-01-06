import React, { createContext, useContext, useReducer } from 'react';

const initialState = {
    fileContent: "",
    setFileContent: () => { },

    savedWords: [],
    setSavedWords: () => { },

    scrollPosition: 0,
    setScrollPosition: () => { },
};

export const ReaderContext = createContext(initialState);
