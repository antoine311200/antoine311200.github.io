import React, { useMemo } from 'react';

import { usePapers } from '../context';
import Workspace from '../components/Workspace';
import { Button, Empty, Sparkline } from '../components/ui';

/**
 * The daily view: everything grouped by the day it entered your library, newest
 * first. Because grouping keys off `firstSeen` and ingestion never rewrites it,
 * yesterday's list stays exactly as you left it.
 */
export default function Digest({ onGo }) {
    const { paperList, counts, fetchTopics, fetchState, topics, history } = usePapers();

    const spark = useMemo(() => {
        const days = [];
        for (let i = 29; i >= 0; i -= 1) {
            const day = new Date(Date.now() - i * 864e5).toISOString().slice(0, 10);
            const h = history.find((x) => x.date === day);
            days.push(h ? h.kept : 0);
        }
        return days;
    }, [history]);

    const neverFetched = topics.every((t) => !t.lastFetch);

    const empty = !paperList.length ? (
        <Empty
            icon="◈"
            title={topics.length ? 'Your radar is empty' : 'Set up your first topic'}
            action={topics.length
                ? <Button variant="primary" size="lg" onClick={() => fetchTopics()} disabled={fetchState.running}>
                    Fetch {topics.filter((t) => t.enabled).length} topics
                </Button>
                : <Button variant="primary" size="lg" onClick={() => onGo('topics')}>Create a topic</Button>}
        >
            {topics.length
                ? 'Run a fetch to pull the newest arXiv submissions for your topics. Everything you see is stored locally, so tomorrow only the genuinely new work appears.'
                : 'A topic is a saved query — keywords, arXiv categories and authors — that runs every time you fetch. Start with two or three narrow ones.'}
        </Empty>
    ) : null;

    return (
        <Workspace
            title="Daily digest"
            subtitle={
                counts.today
                    ? `${counts.today} new today · ${counts.yesterday} yesterday · ${counts.unread} unread overall`
                    : neverFetched
                        ? 'Nothing fetched yet'
                        : `Nothing new today · ${counts.unread} unread in the backlog`
            }
            grouped
            initialFilters={{ sort: 'relevance', days: 30 }}
            emptyState={empty}
            headerExtra={
                <div className="hidden items-center gap-3 xl:flex">
                    <div className="w-32" title="New papers per day, last 30 days">
                        <Sparkline data={spark} height={22} />
                    </div>
                </div>
            }
        />
    );
}
