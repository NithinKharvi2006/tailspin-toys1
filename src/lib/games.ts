/**
 * Data-access helpers for retrieving and filtering games from the local database.
 *
 * These helpers intentionally accept an injectable database client so the same
 * logic can be exercised against the in-memory SQLite database used in tests.
 */

import { eq, asc, and, inArray } from 'drizzle-orm';
import type { Database } from './db';
import { games, categories, publishers } from '../../db/schema';
import type { Game } from '../types/game';

const gameSelection = {
    id: games.id,
    title: games.title,
    description: games.description,
    starRating: games.starRating,
    categoryId: categories.id,
    categoryName: categories.name,
    publisherId: publishers.id,
    publisherName: publishers.name,
};

type GameSelectionRow = {
    id: number;
    title: string;
    description: string;
    starRating: number | null;
    categoryId: number | null;
    categoryName: string | null;
    publisherId: number | null;
    publisherName: string | null;
};

function mapGame(row: GameSelectionRow): Game {
    return {
        id: row.id,
        title: row.title,
        description: row.description,
        starRating: row.starRating,
        category:
            row.categoryId !== null && row.categoryName !== null
                ? { id: row.categoryId, name: row.categoryName }
                : null,
        publisher:
            row.publisherId !== null && row.publisherName !== null
                ? { id: row.publisherId, name: row.publisherName }
                : null,
    };
}

function baseGamesQuery(db: Database) {
    return db
        .select(gameSelection)
        .from(games)
        .leftJoin(categories, eq(games.categoryId, categories.id))
        .leftJoin(publishers, eq(games.publisherId, publishers.id));
}

/**
 * Filtered games ordered by title.
 *
 * @param db - Database client used to query the games table.
 * @param filters - Optional category and publisher constraints applied together.
 * @returns Games matching the provided filters, ordered alphabetically by title.
 */
export async function getGamesByFilters(
    db: Database,
    filters: {
        categoryIds?: number[];
        publisherId?: number | null;
    } = {},
): Promise<Game[]> {
    const categoryIds = filters.categoryIds ?? [];
    const publisherId = filters.publisherId ?? null;

    const predicates = [];

    if (categoryIds.length > 0) {
        predicates.push(inArray(games.categoryId, categoryIds));
    }

    if (publisherId !== null) {
        predicates.push(eq(games.publisherId, publisherId));
    }

    const query = predicates.length > 0 ? baseGamesQuery(db).where(and(...predicates)) : baseGamesQuery(db);
    const rows = await query.orderBy(asc(games.title));
    return rows.map(mapGame);
}

/** All games ordered by title. */
export async function getAllGames(db: Database): Promise<Game[]> {
    return getGamesByFilters(db);
}

/** All game ids ordered by title. */
export async function getAllGameIds(db: Database): Promise<number[]> {
    const rows = await db.select({ id: games.id }).from(games).orderBy(asc(games.title));
    return rows.map((row) => row.id);
}

/** A single game by id, or null when it does not exist. */
export async function getGameById(db: Database, id: number): Promise<Game | null> {
    const row = await baseGamesQuery(db).where(eq(games.id, id)).get();
    return row ? mapGame(row) : null;
}
