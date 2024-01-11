import React, { createContext, useContext, useReducer } from 'react';

const initialState = {
    fileContent: "",
    setFileContent: () => { },

    savedWords: [],
    setSavedWords: () => { },

    scrollPosition: 0,
    setScrollPosition: () => { },

    isFileMenuOpen: false,
    setIsFileMenuOpen: () => { },
};

export const ReaderContext = createContext(initialState);
