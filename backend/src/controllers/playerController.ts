/**
 * Player Controller
 * Handles all player-related API requests
 */

import { Request, Response, NextFunction } from 'express';
import { NotFoundError, ValidationError } from '../utils/errors.js';
import { db } from '../services/db.js';

/**
 * GET /api/players
 * Get all eligible players with optional filters
 * Query params:
 *   - seasonYear: number (default: 2025)
 *   - minHrs: number (default: 10)
 *   - maxHrs: number (optional)
 *   - team: string (team abbreviation, optional)
 *   - search: string (search player name, optional)
 *   - sortBy: 'name' | 'hrs' | 'team' (default: 'hrs')
 *   - sortOrder: 'asc' | 'desc' (default: 'desc')
 *   - limit: number (default: 500)
 *   - offset: number (default: 0)
 */
export async function getPlayers(req: Request, res: Response, next: NextFunction) {
  try {
    const {
      seasonYear = '2025',
      minHrs = '10',
      maxHrs,
      team,
      search,
      sortBy = 'hrs',
      sortOrder = 'desc',
      limit = '500',
      offset = '0',
    } = req.query;

    // Build where clause
    const where: any = {
      seasonYear: parseInt(seasonYear as string),
      isEligible: true,
      hrsPreviousSeason: {
        gte: parseInt(minHrs as string),
      },
    };

    if (maxHrs) {
      where.hrsPreviousSeason.lte = parseInt(maxHrs as string);
    }

    if (team) {
      where.teamAbbr = (team as string).toUpperCase();
    }

    if (search) {
      where.name = {
        contains: search as string,
        mode: 'insensitive',
      };
    }

    // Build orderBy clause
    let orderBy: any = {};
    if (sortBy === 'name') {
      orderBy = { name: sortOrder };
    } else if (sortBy === 'team') {
      orderBy = { teamAbbr: sortOrder };
    } else {
      orderBy = { hrsPreviousSeason: sortOrder };
    }

    // Fetch players
    const [players, totalCount] = await Promise.all([
      db.player.findMany(where, {
        orderBy,
        take: parseInt(limit as string),
        skip: parseInt(offset as string),
      }),
      db.player.count(where),
    ]);

    res.json({
      success: true,
      data: {
        players,
        pagination: {
          total: totalCount,
          limit: parseInt(limit as string),
          offset: parseInt(offset as string),
          hasMore: parseInt(offset as string) + players.length < totalCount,
        },
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/players/:id
 * Get a single player by ID
 */
export async function getPlayerById(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;

    const player = await db.player.findUnique(
      { id },
      { teamPlayers: true }
    );

    if (!player) {
      throw new NotFoundError('Player not found');
    }

    res.json({
      success: true,
      data: player,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/players/search
 * Search players by name
 * Query params:
 *   - q: string (search query, required)
 *   - seasonYear: number (default: 2025)
 *   - limit: number (default: 20)
 */
export async function searchPlayers(req: Request, res: Response, next: NextFunction) {
  try {
    const { q, seasonYear = '2025', limit = '20' } = req.query;

    if (!q || (q as string).trim().length === 0) {
      throw new ValidationError('Search query (q) is required');
    }

    const players = await db.player.findMany(
      {
        seasonYear: parseInt(seasonYear as string),
        isEligible: true,
        name: {
          contains: q as string,
        },
      },
      {
        orderBy: {
          hrsPreviousSeason: 'desc',
        },
        take: parseInt(limit as string),
      }
    );

    res.json({
      success: true,
      data: players,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/players/stats/summary
 * Get player pool summary statistics
 * Query params:
 *   - seasonYear: number (default: 2025)
 */
export async function getPlayerStats(req: Request, res: Response, next: NextFunction) {
  try {
    const { seasonYear = '2025' } = req.query;

    const stats = await db.player.aggregate({
      where: {
        seasonYear: parseInt(seasonYear as string),
        isEligible: true,
      },
      _count: true,
      _avg: {
        hrsPreviousSeason: true,
      },
      _max: {
        hrsPreviousSeason: true,
      },
      _min: {
        hrsPreviousSeason: true,
      },
    });

    // Get team distribution
    const teamDistribution = await db.player.groupBy({
      by: ['teamAbbr'],
      where: {
        seasonYear: parseInt(seasonYear as string),
        isEligible: true,
      },
      _count: true,
      orderBy: {
        _count: {
          teamAbbr: 'desc',
        },
      },
    });

    res.json({
      success: true,
      data: {
        totalPlayers: stats._count,
        averageHRs: Math.round((stats._avg.hrsPreviousSeason || 0) * 10) / 10,
        maxHRs: stats._max.hrsPreviousSeason,
        minHRs: stats._min.hrsPreviousSeason,
        teamDistribution: teamDistribution.map((t: any) => ({
          team: t.teamAbbr,
          count: t._count,
        })),
      },
    });
  } catch (error) {
    next(error);
  }
}
