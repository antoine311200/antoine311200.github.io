import React from 'react';

import Workspace from '../components/Workspace';
import { usePapers } from '../context';

/** The whole archive, flat and searchable — no day grouping, every filter available. */
export default function Library({ preset }) {
    const { counts } = usePapers();

    const presets = {
        all: {
            title: 'Library',
            subtitle: `${counts.total} papers · ${counts.starred} starred · ${counts.read} read`,
            filters: { sort: 'seen', hideArchived: false },
        },
        queue: {
            title: 'Reading queue',
            subtitle: `${counts.queued} queued · work through them top down`,
            filters: { statuses: ['queued', 'reading'], sort: 'relevance' },
        },
        starred: {
            title: 'Starred',
            subtitle: `${counts.starred} papers you flagged as worth keeping`,
            filters: { starredOnly: true, sort: 'seen', hideArchived: false },
        },
        following: {
            title: 'From authors you follow',
            subtitle: `${counts.followed} papers by the ${counts.following} researchers you follow`,
            filters: { followedOnly: true, sort: 'newest', hideArchived: false },
        },
    };

    const p = presets[preset] || presets.all;

    return (
        <Workspace
            key={preset}
            title={p.title}
            subtitle={p.subtitle}
            initialFilters={p.filters}
        />
    );
}
