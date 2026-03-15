import React, { useState } from 'react';

export default function Callout({ type = 'note', title = '', children, collapsible = false }) {
    const [open, setOpen] = useState(!collapsible);
    const iconMap = {
        definition: '📘',
        property: '🔖',
        theorem: '📗',
        example: '📙',
        intuition: '💡',
        note: '📝',
        warning: '⚠️',
        tip: '👉',
    };
    const icon = iconMap[type] || '🛈';

    return (
        <div
            style={{
                borderLeft: '3px solid rgba(100,100,255,0.6)',
                background: 'rgba(240, 246, 255, 0.6)',
                padding: '12px',
                borderRadius: 8,
                margin: '12px 0',
            }}
        >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ fontSize: 20 }}>{icon}</div>
                <div style={{ fontWeight: 600, flex: 1 }}>{title}</div>
                {collapsible ? (
                    <button
                        onClick={() => setOpen((s) => !s)}
                        aria-expanded={open}
                        style={{
                            border: 'none',
                            background: 'transparent',
                            cursor: 'pointer',
                            fontSize: 18,
                            padding: 4,
                        }}
                    >
                        {open ? '−' : '+'}
                    </button>
                ) : null}
            </div>

            {open ? <div style={{ marginTop: 8 }}>{children}</div> : null}
        </div>
    );
}