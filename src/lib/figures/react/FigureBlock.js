import React, { useMemo } from 'react';
import Figure from './Figure';
import { RichText } from './TexLabel';
import { parseFigureSpec } from '../core/spec';
import { getModel, listModels } from '../core/registry';
import '../figures.css';

/**
 * Renders the body of a ```figure block from a markdown article.
 *
 * Authoring mistakes surface in the page rather than in the console, and the
 * message lists the ids that *are* available — the common failure is a typo or
 * a model that was never added to models/index.js.
 */

function FigureError({ problems }) {
  const available = listModels().map(m => m.id);
  return (
    <figure className="figx">
      <div className="figx__error">
        <strong>Figure not rendered.</strong>
        <ul>
          {problems.map((p, i) => <li key={i}>{p}</li>)}
        </ul>
        {available.length > 0 && (
          <p>
            Available models: {available.map((id, i) => (
              <React.Fragment key={id}>
                {i > 0 && ', '}<code>{id}</code>
              </React.Fragment>
            ))}
          </p>
        )}
      </div>
    </figure>
  );
}

export default function FigureBlock({ source }) {
  const parsed = useMemo(() => parseFigureSpec(source), [source]);
  const { props, overrides, errors, unknown } = parsed;

  const model = props.model ? getModel(props.model) : null;

  const problems = errors.slice();
  if (props.model && !model) {
    problems.push(`No figure model registered with id "${props.model}".`);
  }

  if (!model) return <FigureError problems={problems} />;

  // Unknown keys are the author's problem, not the reader's — warn, don't shout.
  if (unknown.length && typeof console !== 'undefined') {
    console.warn(
      `[figures] figure "${props.model}": ignored unknown key(s): ${unknown.join(', ')}`
    );
  }

  const { model: _id, caption, ...rest } = props;

  return (
    <Figure
      model={model}
      overrides={overrides}
      caption={caption ? <RichText text={caption} /> : undefined}
      {...rest}
    />
  );
}
