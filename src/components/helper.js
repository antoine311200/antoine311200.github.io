import React from "react";
import { InlineMath, BlockMath } from 'react-katex';
import reactStringReplace from "react-string-replace";


function Paragraph({ children, type = null }) {

    const parseSpecial = (text) => {
        // Replace \n with <br />
        const newLineRegex = /\\n/g;
        const contentWithNewLine = reactStringReplace(text, "\\n", (newLine, _) => (<br />));

        // Replace \t with <span className="tab" />
        // const tabRegex = /\\t/g;
        // const contentWithTab = reactStringReplace(contentWithNewLine, tabRegex, (tab, _) => (<span className="tab" />));

        return contentWithNewLine;
    }

    const parseMath = (text) => {
        // Replace $$...$$ with BlockMath
        const blockMathRegex = /\$\$([\s\S]*?)\$\$/g;
        const contentWithBlockMath = reactStringReplace(text, blockMathRegex, (mathContent, _) => (<BlockMath>{mathContent}</BlockMath>));

        // Replace $...$ with InlineMath
        const inlineMathRegex = /\$([^$]+)\$/g;
        const contentWithInlineMath = reactStringReplace(contentWithBlockMath, inlineMathRegex, (mathContent, _) => (<InlineMath>{mathContent}</InlineMath>));

        return contentWithInlineMath;
    };
    return (
        <span className='mt-4 sm:mt-1'>
            {type == "remark" && <span className='font-semibold mr-4'>Remark</span>}
            {parseMath(parseSpecial(children))}
            <p className="mt-4" />
        </span>
    );
}

function Remark({ children }) {
    return (
        <span className='mt-4 sm:mt-1'>
            <span className='font-semibold mr-4'>Remark</span>
            {children}
            <p className="mt-2" />
        </span>
    );
}

function Theorem({ children }) {
    return (
        <span className='mt-4 sm:mt-1 border-solid border-red-500 border-2 p-2 rounded'>
            <span className='font-semibold mr-4 text-red-600'>Theorem</span>
            {children}
            <p className="mt-2" />
        </span>
    );
}

function Image({ caption, src }) {
    return (
        <center>
            <br />
            <figure className="place-items-center">
                <img className="h-auto xl:w-2/3 rounded-lg" src={src} alt="caption" />
                {caption && <figcaption className="mt-2 text-sm text-center text-gray-500 dark:text-gray-400">{caption}</figcaption>}
            </figure>
        </center>
    )
}

export { Paragraph, Remark, Theorem, Image }