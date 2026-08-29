import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

/**
 * A listbox, replacing the native `<select>`.
 *
 * The native popup is drawn by the OS, so it ignores the figure's palette
 * entirely — a white Windows menu on a dark figure. This is the usual
 * button + listbox pattern, with two details that matter here:
 *
 *  · The list is `position: fixed`, measured from the button. `.figx__frame`
 *    sets `overflow: hidden` (it clips the stage to the border radius), and a
 *    fixed element escapes that clip because no ancestor establishes a
 *    containing block for it. It also flips above the button when there is no
 *    room below, which is the common case since the controls sit at the
 *    bottom of the figure.
 *
 *  · Keyboard behaviour follows the ARIA listbox pattern: Enter/Space/↓ to
 *    open, ↑/↓/Home/End to move, Enter to choose, Escape to cancel. The native
 *    element gave that for free and it would be a regression to lose it.
 */

let uid = 0;

export default function Select({ value, options = [], onChange, label, hint }) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [pos, setPos] = useState(null);
  const [baseId] = useState(() => `figx-select-${++uid}`);

  const btnRef = useRef(null);
  const listRef = useRef(null);

  const index = Math.max(0, options.findIndex(o => o.value === value));
  const current = options[index];

  const place = useCallback(() => {
    const el = btnRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const maxHeight = Math.min(280, options.length * 30 + 8);
    const below = window.innerHeight - r.bottom;
    const flipUp = below < maxHeight + 12 && r.top > below;
    setPos({
      left: Math.round(r.left),
      width: Math.round(r.width),
      top: flipUp ? undefined : Math.round(r.bottom + 4),
      bottom: flipUp ? Math.round(window.innerHeight - r.top + 4) : undefined,
      maxHeight,
    });
  }, [options.length]);

  useLayoutEffect(() => { if (open) place(); }, [open, place]);

  useEffect(() => {
    if (!open) return undefined;

    const onDocDown = (e) => {
      if (btnRef.current && btnRef.current.contains(e.target)) return;
      if (listRef.current && listRef.current.contains(e.target)) return;
      setOpen(false);
    };
    const onScrollOrResize = () => place();

    document.addEventListener('pointerdown', onDocDown, true);
    window.addEventListener('scroll', onScrollOrResize, true);
    window.addEventListener('resize', onScrollOrResize);
    return () => {
      document.removeEventListener('pointerdown', onDocDown, true);
      window.removeEventListener('scroll', onScrollOrResize, true);
      window.removeEventListener('resize', onScrollOrResize);
    };
  }, [open, place]);

  useEffect(() => {
    if (open && listRef.current) listRef.current.focus();
  }, [open]);

  const openList = () => { setActive(index); setOpen(true); };
  const choose = (i) => {
    const opt = options[i];
    if (opt) onChange(opt.value);
    setOpen(false);
    if (btnRef.current) btnRef.current.focus();
  };

  const onButtonKey = (e) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      openList();
    }
  };

  const onListKey = (e) => {
    switch (e.key) {
      case 'ArrowDown': e.preventDefault(); setActive(a => Math.min(options.length - 1, a + 1)); break;
      case 'ArrowUp':   e.preventDefault(); setActive(a => Math.max(0, a - 1)); break;
      case 'Home':      e.preventDefault(); setActive(0); break;
      case 'End':       e.preventDefault(); setActive(options.length - 1); break;
      case 'Enter':
      case ' ':         e.preventDefault(); choose(active); break;
      case 'Escape':
      case 'Tab':
        setOpen(false);
        if (btnRef.current) btnRef.current.focus();
        break;
      default: break;
    }
  };

  return (
    <span className="figx__combo">
      <button
        ref={btnRef}
        type="button"
        className="figx__combo-btn"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={label}
        title={hint || label}
        onClick={() => (open ? setOpen(false) : openList())}
        onKeyDown={onButtonKey}
      >
        <span className="figx__combo-value">{current ? current.label : String(value)}</span>
        <svg className="figx__combo-caret" viewBox="0 0 10 6" aria-hidden="true">
          <path d="m1 1 4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.5"
            strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && pos && (
        <ul
          ref={listRef}
          role="listbox"
          tabIndex={-1}
          aria-label={label}
          aria-activedescendant={`${baseId}-${active}`}
          className="figx__combo-list"
          style={{
            left: pos.left,
            width: pos.width,
            top: pos.top,
            bottom: pos.bottom,
            maxHeight: pos.maxHeight,
          }}
          onKeyDown={onListKey}
        >
          {options.map((o, i) => (
            <li
              key={String(o.value)}
              id={`${baseId}-${i}`}
              role="option"
              aria-selected={i === index}
              className={
                'figx__combo-opt'
                + (i === active ? ' figx__combo-opt--active' : '')
                + (i === index ? ' figx__combo-opt--selected' : '')
              }
              onMouseEnter={() => setActive(i)}
              onClick={() => choose(i)}
            >
              <span className="figx__combo-tick" aria-hidden="true">{i === index ? '·' : ''}</span>
              {o.label}
            </li>
          ))}
        </ul>
      )}
    </span>
  );
}
