/**
 * Data-access helpers for retrieving publishers from the local database.
 *
 * The helpers accept an injectable database client so they can be used during
 * static builds and tested against an in-memory database.
 */

import { asc } from 'drizzle-orm';
import type { Database } from './db';
import { publishers } from '../../db/schema';
import type { Publisher } from '../types/game';

/**
 * Retrieve all publishers ordered alphabetically by name.
 *
 * @param db - Database client used to query the publishers table.
 * @returns Publishers mapped to the app-facing publisher type.
 */
export async function getAllPublishers(db: Database): Promise<Publisher[]> {
    const rows = await db
        .select({
            id: publishers.id,
            name: publishers.name,
        })
        .from(publishers)
        .orderBy(asc(publishers.name));

    return rows.map((row) => ({
        id: row.id,
        name: row.name,
    }));
}
