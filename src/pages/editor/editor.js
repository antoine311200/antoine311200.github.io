import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';

const initialText = `

# 热情追梦的旅程

### 中文：

我是一名普通的学生，但是我对人工智能有着强烈的兴趣。

每天早上，我都会花一点儿时间阅读相关的文章，或者看相关的视频。

虽然学习中文和编程都很难，但是我相信，只要努力，就一定能进步。

去年，我参加过一个 AI 比赛，并且把自己的项目介绍给评委。

那次经历让我明白，是…的结构可以用来强调当时的情景：

\`我是去年参加比赛的。\`

现在，我对未来有很多规划。我打算明年去北京学习、更深入地了解机器学习和大数据。

我也想和其他同学讨论各种问题，对于不同的观点，我会认真倾听，并且提出自己的看法。

每天学习结束后，我都会写一个小总结，不仅练习写作，还能把今天学到的知识复习一遍。

不管多忙，我都坚持这样做。
  
未来虽遥远，但我对自己的梦想充满信心。
`;

const fontOptions = [
  'Arial',
  'Georgia',
  'Times New Roman',
  'Courier New',
  'Verdana',
  'Lucida Console',
  'monospace',
  'serif',
  'KaiTi'
];

export default function MarkdownEditor() {
  const [text, setText] = useState(initialText);
  const [font, setFont] = useState('KaiTi');
  const [fontSize, setFontSize] = useState(24);

  return (
    <div style={{ padding: '2rem' }}>
      {/* Font selector */}
      <div className="control-panel">
        <label className="font-selector">
          <span className="label-text">Font:</span>
          <select
            value={font}
            onChange={(e) => setFont(e.target.value)}
            className="dropdown"
          >
            {fontOptions.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </label>

        <label className="font-size-selector">
          <span className="label-text">Font size: {fontSize}px</span>
          <input
            type="range"
            min="12"
            max="48"
            step="1"
            value={fontSize}
            onChange={(e) => setFontSize(parseInt(e.target.value))}
            className="slider"
          />
        </label>
      </div>


      <div style={{ display: 'flex', gap: '2rem' }}>
        <textarea
          style={{
            width: '35%',
            height: '80vh',
            fontSize: '1rem',
            padding: '1rem',
            fontFamily: 'monospace',
          }}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />

        {/* Markdown Preview */}
        <div
          style={{
            width: '65%',
            height: '80vh',
            overflowY: 'scroll',
            borderLeft: '1px solid #ccc',
            padding: '1rem',
            backgroundColor: '#fafafa',
            fontFamily: font,
            fontSize: `${fontSize}px`,
          }}
        >
          <ReactMarkdown className='markdown'>{text}</ReactMarkdown>
        </div>
      </div>
    </div>
  );
}