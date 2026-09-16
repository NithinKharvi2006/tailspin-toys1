import { describe, it, expect, beforeEach } from 'vitest';
import { createTestDatabase } from '../../db/test-helpers';
import { categories, publishers, games } from '../../db/schema';
import type { Database } from './db';
import {
    getAllGames,
    getAllGameIds,
    getGameById,
    getGamesByFilters,
} from './games';

async function seedGames(db: Database, count: number): Promise<void> {
    const [category] = await db
        .insert(categories)
        .values({ name: 'Strategy', description: 'cat' })
        .returning({ id: categories.id });
    const [publisher] = await db
        .insert(publishers)
        .values({ name: 'Pub One', description: 'pub' })
        .returning({ id: publishers.id });

    // Insert titles in reverse-alphabetical order to prove ordering is applied.
    for (let i = count; i >= 1; i--) {
        await db.insert(games).values({
            title: `Game ${String(i).padStart(2, '0')}`,
            description: `Description ${i}`,
            starRating: 4.2,
            categoryId: category.id,
            publisherId: publisher.id,
        });
    }
}

async function seedFilteredGames(db: Database): Promise<{ strategyId: number; puzzleId: number; pubOneId: number; pubTwoId: number }> {
    const [strategy] = await db
        .insert(categories)
        .values({ name: 'Strategy', description: 'strategy category' })
        .returning({ id: categories.id });
    const [puzzle] = await db
        .insert(categories)
        .values({ name: 'Puzzle', description: 'puzzle category' })
        .returning({ id: categories.id });
    const [pubOne] = await db
        .insert(publishers)
        .values({ name: 'Pub One', description: 'first publisher' })
        .returning({ id: publishers.id });
    const [pubTwo] = await db
        .insert(publishers)
        .values({ name: 'Pub Two', description: 'second publisher' })
        .returning({ id: publishers.id });

    await db.insert(games).values([
        {
            title: 'Alpha Strategy',
            description: 'A strategy game from Pub One',
            starRating: 4.8,
            categoryId: strategy.id,
            publisherId: pubOne.id,
        },
        {
            title: 'Bravo Puzzle',
            description: 'A puzzle game from Pub One',
            starRating: 4.5,
            categoryId: puzzle.id,
            publisherId: pubOne.id,
        },
        {
            title: 'Charlie Strategy',
            description: 'A strategy game from Pub Two',
            starRating: 4.2,
            categoryId: strategy.id,
            publisherId: pubTwo.id,
        },
        {
            title: 'Delta Puzzle',
            description: 'A puzzle game from Pub Two',
            starRating: 3.9,
            categoryId: puzzle.id,
            publisherId: pubTwo.id,
        },
    ]);

    return {
        strategyId: strategy.id,
        puzzleId: puzzle.id,
        pubOneId: pubOne.id,
        pubTwoId: pubTwo.id,
    };
}

describe('games data-access helpers', () => {
    let db: Database;

    beforeEach(async () => {
        db = await createTestDatabase();
    });

    it('returns all games ordered by title', async () => {
        await seedGames(db, 3);
        const all = await getAllGames(db);
        expect(all.map((g) => g.title)).toEqual(['Game 01', 'Game 02', 'Game 03']);
        expect(all[0].category).toEqual({ id: expect.any(Number), name: 'Strategy' });
        expect(all[0].publisher).toEqual({ id: expect.any(Number), name: 'Pub One' });
    });

    it('returns all game ids ordered by title', async () => {
        await seedGames(db, 3);
        const ids = await getAllGameIds(db);
        const all = await getAllGames(db);
        expect(ids).toEqual(all.map((g) => g.id));
    });

    it('fetches a single game by id', async () => {
        await seedGames(db, 2);
        const ids = await getAllGameIds(db);
        const game = await getGameById(db, ids[0]);
        expect(game?.title).toBe('Game 01');
    });

    it('returns null for a non-existent game', async () => {
        await seedGames(db, 2);
        expect(await getGameById(db, 99999)).toBeNull();
    });

    it('filters games by category', async () => {
        const { strategyId } = await seedFilteredGames(db);
        const gamesByCategory = await getGamesByFilters(db, { categoryIds: [strategyId] });

        expect(gamesByCategory.map((game) => game.title)).toEqual(['Alpha Strategy', 'Charlie Strategy']);
        expect(gamesByCategory.every((game) => game.category?.id === strategyId)).toBe(true);
    });

    it('filters games by publisher and category together', async () => {
        const { strategyId, puzzleId, pubOneId } = await seedFilteredGames(db);
        const gamesByCategoryAndPublisher = await getGamesByFilters(db, {
            categoryIds: [strategyId, puzzleId],
            publisherId: pubOneId,
        });

        expect(gamesByCategoryAndPublisher.map((game) => game.title)).toEqual(['Alpha Strategy', 'Bravo Puzzle']);
        expect(gamesByCategoryAndPublisher.every((game) => game.publisher?.id === pubOneId)).toBe(true);
    });

    it('returns no games when no filters match', async () => {
        const { pubTwoId } = await seedFilteredGames(db);
        const filteredGames = await getGamesByFilters(db, {
            categoryIds: [999],
            publisherId: pubTwoId,
        });

        expect(filteredGames).toEqual([]);
    });
});
