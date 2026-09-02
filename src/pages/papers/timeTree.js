/**
 * Bucketing papers into Month › Week › Day.
 *
 * Shared by the Stream (which renders it as a reading list) and the Explorer (which
 * renders the same buckets as a read-only folder tree you can drag out of), so the
 * two can never disagree about which week a paper belongs to.
 */

export const startOfWeek = (d) => {
    const x = new Date(d);
    const day = (x.getDay() + 6) % 7;          // Monday-based
    x.setDate(x.getDate() - day);
    x.setHours(0, 0, 0, 0);
    return x;
};

export const monthLabel = (d) => d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
export const weekLabel = (d) => `Week of ${d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}`;

export function dayLabel(iso) {
    const day = String(iso).slice(0, 10);
    const today = new Date().toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
    if (day === today) return 'Today';
    if (day === yesterday) return 'Yesterday';
    return new Date(day).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });
}

/** The short form used in the Explorer's columns, where space is tight. */
export const dayShort = (iso) => {
    const day = String(iso).slice(0, 10);
    const today = new Date().toISOString().slice(0, 10);
    if (day === today) return 'Today';
    if (day === new Date(Date.now() - 864e5).toISOString().slice(0, 10)) return 'Yesterday';
    return new Date(day).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
};

/**
 * @returns months, newest first, each with weeks, each with days.
 * Keys are scoped by their parent: a week straddling a month boundary appears under
 * both months and must not share collapse state or selection with its twin.
 */
export function buildTimeTree(papers) {
    const months = new Map();

    papers.forEach((p) => {
        const iso = String(p.firstSeen || p.published || '');
        if (!iso) return;
        const d = new Date(iso);
        if (Number.isNaN(d.getTime())) return;

        const mKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const wStart = startOfWeek(d);
        const wKey = `${mKey}|${wStart.toISOString().slice(0, 10)}`;
        const dayIso = iso.slice(0, 10);
        const dKey = `${wKey}|${dayIso}`;

        if (!months.has(mKey)) months.set(mKey, { key: mKey, label: monthLabel(d), count: 0, weeks: new Map() });
        const month = months.get(mKey);
        month.count += 1;

        if (!month.weeks.has(wKey)) {
            month.weeks.set(wKey, { key: wKey, label: weekLabel(wStart), count: 0, days: new Map() });
        }
        const week = month.weeks.get(wKey);
        week.count += 1;

        if (!week.days.has(dKey)) {
            week.days.set(dKey, { key: dKey, iso: dayIso, label: dayLabel(dayIso), count: 0, papers: [] });
        }
        const day = week.days.get(dKey);
        day.count += 1;
        day.papers.push(p);
    });

    const tail = (k) => String(k).split('|').pop();
    const desc = (a, b) => tail(b.key).localeCompare(tail(a.key));

    return Array.from(months.values()).sort(desc).map((m) => ({
        ...m,
        weeks: Array.from(m.weeks.values()).sort(desc).map((w) => ({
            ...w,
            days: Array.from(w.days.values()).sort(desc),
        })),
    }));
}

/** Every paper under a Stream node, addressed by its compound key. */
export function papersUnder(tree, key) {
    if (!key) return [];
    const out = [];
    tree.forEach((m) => {
        const inMonth = key === m.key;
        m.weeks.forEach((w) => {
            const inWeek = inMonth || key === w.key;
            w.days.forEach((d) => {
                if (inWeek || key === d.key) out.push(...d.papers);
            });
        });
    });
    return out;
}
