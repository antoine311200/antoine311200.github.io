import React from 'react';
import ReactMarkdown from 'react-markdown';
import 'katex/dist/katex.min.css';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { InlineMath, BlockMath } from 'react-katex';

const Markdown = () => {
    const markdownWithLaTeX = `
    # Markdown with LaTeX test

    This is an inline equation: $E=mc^2$`;

    const renderers = {
        math: (props) => <BlockMath math={props.value} />,
        inlineMath: (props) => <InlineMath math={props.value} />,
    };

    return (
        <div className="p-4">
            <h1 className="text-2xl font-bold">Markdown with LaTeX</h1>
            {/* <ReactMarkdown renderers={renderers} source={markdownWithLaTeX} /> */}
            <ReactMarkdown># Hello, *world*!</ReactMarkdown>
            <ReactMarkdown
                children={`The lift coefficient ($C_L$) is a dimensionless coefficient.`}
                remarkPlugins={[remarkMath]}
                rehypePlugins={[rehypeKatex]}
            />
            <ReactMarkdown
                children={`
## Markdown with LaTeX test

This is an inline equation: $E=mc^2$`}
                remarkPlugins={[remarkMath]}
                rehypePlugins={[rehypeKatex]}
            />
        </div>
    );
};

export default Markdown;