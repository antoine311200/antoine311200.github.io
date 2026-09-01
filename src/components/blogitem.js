import React, { useMemo, useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { InlineMath, BlockMath } from 'react-katex';
import 'katex/dist/katex.min.css';

import Template from './template';
// import Callout from './callout';

import file from '../data/articles/dummy.md';
import '../style/markdown.css';


// The React Component for the Callout
const Callout = ({ type, title, children }) => {
    // Base styles for the callout box
    const baseStyles = "my-4 p-4 border-l-4 rounded-r-md";

    // Dynamically set styles based on the callout type
    let typeStyles = "";
    switch (type) {
        case "note":
            typeStyles = "bg-blue-50 border-blue-500 text-blue-900";
            break;
        case "warning":
            typeStyles = "bg-yellow-50 border-yellow-500 text-yellow-900";
            break;
        case "danger":
            typeStyles = "bg-red-50 border-red-500 text-red-900";
            break;
        default:
            typeStyles = "bg-gray-50 border-gray-500 text-gray-900";
    }

    return (
        <div className={`${baseStyles} ${typeStyles}`}>
            {/* Conditionally render the title if it exists */}
            {title && <p className="font-semibold mt-0">{title}</p>}
            <div className="callout-content">
                {/* This renders the children. If children is a string, it's safe. */}
                {children}
            </div>
        </div>
    );
};

function replaceAlternating(text) {
    let count = 0;
    return text.replace(/\$\$/g, function () {
        return count++ % 2 === 0 ? '\n```math\n' : '\n```';
    });
}

function calloutRegex(text) {
    const calloutPattern = /^>\[!(\w+)\]-?\s*(.*)\r*\n((?:^>.*\r*\n)*)/gm;

    return text.replaceAll(calloutPattern, (match, p1, p2, p3) => {
        const type = p1.trim().toLowerCase();
        const title = p2.trim();
        const content = p3.trim().replace(/^>\s?/gm, '').replace(/\r*\n/g, '<br />');
        console.log('Matched callout:', { type, title, content });
        return `<Callout type="${type}" title="${title}">${content}</Callout>`;
    });
}


function parseMetaContent(source) {
    const lines = source.split('\n');
    const meta = {};
    let i = 0;
    for (; i < lines.length; i++) {
        const l = lines[i].trim();
        if (l === '') { i++; break; }
        const m = l.match(/^@([A-Z]+)\s+(.*)$/);
        if (m) {
            meta[m[1].toLowerCase()] = m[2].trim();
        } else {
            break;
        }
    }
    let body = lines.slice(i).join('\n');
    body = calloutRegex(body);
    console.log('After callout processing:', body);
    body = replaceAlternating(body);
    return { meta, body };
}

function slugify(text) {
    return text
        .toString()
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '') // remove accents
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-');
}

function buildTree(markdown) {
    const lines = markdown.split('\n');
    const headings = [];
    const headingRegex = /^(#{1,6})\s+(.*)$/;
    for (let i = 0; i < lines.length; i++) {
        const m = lines[i].match(headingRegex);
        if (m) {
            const level = m[1].length;
            const title = m[2].trim();
            const id = slugify(title);
            headings.push({ level, title, id });
        }
    }
    // Build nested tree using stack
    const root = [];
    const stack = [{ level: 0, children: root }];
    for (const h of headings) {
        while (stack.length && h.level <= stack[stack.length - 1].level) {
            stack.pop();
        }
        const node = { ...h, children: [] };
        stack[stack.length - 1].children.push(node);
        stack.push(node);
    }
    // console.log('Built TOC tree:', root);
    return root;
}


function CalloutRenderer({ node, children, source }) {
    // node.position is available from react-markdown's mdast node
    if (!node || !node.position || !source) {
        // fallback to plain blockquote
        return <blockquote>{children}</blockquote>;
    }

    // Extract original blockquote text from source using line numbers
    const srcLines = source.split('\n');
    const startLine = node.position.start.line - 1;
    const endLine = node.position.end.line - 1;
    const blockLines = srcLines.slice(startLine, endLine + 1);

    // Remove leading '>' and optional spaces in each line
    const innerLines = blockLines.map((ln) => ln.replace(/^\s*>\s?/, ''));

    // The first non-empty line may contain the marker e.g. [!definition] Title
    let firstNonEmptyIndex = 0;
    while (firstNonEmptyIndex < innerLines.length && innerLines[firstNonEmptyIndex].trim() === '') {
        firstNonEmptyIndex++;
    }
    if (firstNonEmptyIndex >= innerLines.length) return null;

    const firstLine = innerLines[firstNonEmptyIndex].trim();
    // pattern: [!type] or [!type]-   followed by optional title text
    const markerRe = /^\[!([^\]\-]+?)](-?)(?:\s+(.*))?$/;
    const mm = firstLine.match(markerRe);
    if (!mm) {
        // it's a normal blockquote
        return <blockquote>{children}</blockquote>;
    }

    const type = mm[1].trim().toLowerCase();
    const collapsible = mm[2] === '-';
    const title = (mm[3] || type).trim();

    // Compose the inner markdown: remove the marker line, keep the rest lines
    const contentLines = [
        ...innerLines.slice(0, firstNonEmptyIndex), // any leading blank lines
        ...innerLines.slice(firstNonEmptyIndex + 1),
    ];
    const innerMarkdown = contentLines.join('\n').trim();

    return (
        <Callout type={type} title={title} collapsible={collapsible}>
            {innerMarkdown ? (
                <ReactMarkdown
                    remarkPlugins={[remarkGfm, remarkMath]}
                    rehypePlugins={[rehypeKatex]}
                    // ensure we do not re-run the callout renderer recursively on blockquotes inside
                    components={{
                        blockquote: ({ node: n, children: c }) => <blockquote>{c}</blockquote>,
                    }}
                >
                    {innerMarkdown}
                </ReactMarkdown>
            ) : (null)}
        </Callout>
    );
}


function Table({ tree }) {
    if (!tree || tree.length === 0) return <div style={{ color: '#777' }}>No headings</div>;
    return (
        <ul style={{ listStyle: 'none', paddingLeft: 8, margin: 0 }}>
            {tree.map((node) => (
                <TableItem key={node.id} node={node} depth={0} />
            ))}
        </ul>
    );
}

function TableItem({ node, depth }) {
    return (
        <li style={{ marginBottom: 6 }}>
            <a
                href={`#${node.id}`}
                style={{
                    textDecoration: 'none',
                    color: '#0645AD',
                    fontSize: Math.max(14 - depth, 12),
                }}
            >
                {node.title}
            </a>
            {node.children && node.children.length > 0 ? (
                <ul style={{ listStyle: 'none', paddingLeft: 10, marginTop: 6 }}>
                    {node.children.map((c) => (
                        <TableItem key={c.id} node={c} depth={depth + 1} />
                    ))}
                </ul>
            ) : null}
        </li>
    );
}


export default function BlogItem({ filename }) {

    const [fileSource, setFileSource] = useState('');

    filename = 'dummy3.md'; // for testing

    console.log(`../data/articles/${filename}`);

    fetch(require(`../data/articles/${filename}`))
        .then((res) => res.text())
        .then((text) => setFileSource(text))
        .catch((err) => console.error('Error loading file:', err));


    const { meta, body } = useMemo(() => parseMetaContent(fileSource), [fileSource]);
    const toc = useMemo(() => buildTree(body), [body]);

    const processLaTeXInContent = (content) => {
        if (typeof content !== 'string') return content;

        // Handle both single-line and multi-line LaTeX expressions
        let processed = content;

        // Process multi-line LaTeX blocks first
        processed = processed.replace(/\$\$\n?(.*?)\n?\$\$/gs, (match, mathContent) => {
            return `\`\`\`math\n${mathContent.trim()}\n\`\`\``;
        });

        return processed;
    };

    const processCalloutChildren = (children) => {
        return React.Children.map(children, child => {
            if (typeof child === 'string') {
                return processLaTeXInContent(child);
            } else if (child && child.props && child.props.children) {
                return React.cloneElement(child, {
                    ...child.props,
                    children: processCalloutChildren(
                        Array.isArray(child.props.children)
                            ? child.props.children
                            : [child.props.children]
                    )
                });
            }
            return child;
        });
    };

    const components = {
        math: ({ node, inline, value }) => <div className="items-center justify-center text-red-600"><BlockMath math={value} /></div>,
        inlineMath: ({ value }) => <InlineMath math={value} />,
        blockquote: ({ node, children, ...props }) => {
            // Check for <Callout type="${type}" title="${title}">${content}</Callout> to render Callout
            if (node && node.children && node.children[0] && node.children[0].type === 'html') {
                const html = node.children[0].value;
                const calloutMatch = html.match(/^<Callout type="([^"]+)" title="([^"]*)">(.*)<\/Callout>$/s);
                if (calloutMatch) {
                    const [, type, title, content] = calloutMatch;
                    console.log('Matched callout:', { type, title, content });
                    return <Callout type={type} title={title}>{content}</Callout>;
                }
            }
        }
    };

    return (
        <Template>
            <div className='flex p-4'>
                <main className="flex-1 text-slate-100">
                    {/* <article style={{ marginBottom: 24 }} className='mb-24'>
                        <div className='flex gap-4 items-center'>
                            {meta.imagepath ? (
                                <img
                                    src={meta.imagepath}
                                    alt={meta.title || 'banner'}
                                    className='w-40 h-24 object-cover rounded-md'
                                />
                            ) : null}
                            <div>
                                <h1 className='m-0'>{meta.title || 'Untitled'}</h1>
                                <div className='text-slate-500 mt-1'>
                                    {meta.date ? <span>{meta.date} · </span> : null}
                                    {meta.tags ? <span>{meta.tags}</span> : null}
                                </div>
                                {meta.description ? <p className='mt-2'>{meta.description}</p> : null}
                            </div>
                        </div>
                    </article> */}

                    <article className='p-24 markdown'>
                        <ReactMarkdown
                            remarkPlugins={[remarkMath, remarkGfm]}
                            rehypePlugins={[rehypeKatex]}
                            components={components}
                        >
                            {body}
                        </ReactMarkdown>
                    </article>
                </main>

                {/* Right panel: TOC */}
                {/* <aside style={{ width: 280, position: 'sticky', top: 24, alignSelf: 'flex-start' }}>
                <div style={{ padding: 12, borderRadius: 8, background: 'rgba(250,250,250,0.6)' }}>
                    <h4 style={{ marginTop: 0 }}>Table of contents</h4>
                    <Table tree={toc} />
                </div>
            </aside> */}
            </div>
        </Template>
    );
}
