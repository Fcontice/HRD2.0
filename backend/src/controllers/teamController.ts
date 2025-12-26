/**
 * Team Controller
 * Handles all team-related API requests
 */

import { Request, Response, NextFunction } from 'express';
import {
  ValidationError,
  NotFoundError,
  AuthenticationError,
  AuthorizationError,
} from '../utils/errors.js';
import { createTeamSchema, updateTeamSchema } from '../types/validation.js';
import { db } from '../services/db.js';

/**
 * POST /api/teams
 * Create a new team
 * Body:
 *   - name: string (max 50 chars)
 *   - seasonYear: number
 *   - playerIds: string[] (array of 8 player IDs)
 */
export async function createTeam(req: Request, res: Response, next: NextFunction) {
  try {
    // Validate request body
    const validation = createTeamSchema.safeParse(req.body);
    if (!validation.success) {
      throw new ValidationError(validation.error.errors[0].message);
    }

    const { name, seasonYear, playerIds } = validation.data;
    const userId = (req.user as any).id;

    // Check if user's email is verified
    const user = await db.user.findUnique({ id: userId });

    if (!user?.emailVerified) {
      throw new AuthorizationError('Email must be verified before creating a team');
    }

    // Validate exactly 8 players
    if (playerIds.length !== 8) {
      throw new ValidationError(`Team must have exactly 8 players. You selected ${playerIds.length}.`);
    }

    // Check for duplicate players
    const uniquePlayerIds = new Set(playerIds);
    if (uniquePlayerIds.size !== 8) {
      throw new ValidationError('Team cannot have duplicate players');
    }

    // Fetch all selected players
    const players = await db.player.findMany({
      id: { in: playerIds },
      seasonYear,
      isEligible: true,
    });

    // Validate all players exist and are eligible
    if (players.length !== 8) {
      throw new ValidationError('Some selected players are not eligible or do not exist');
    }

    // Calculate total 2025 HRs
    const totalHrs = players.reduce((sum, p) => sum + p.hrsPreviousSeason, 0);

    // Validate HR limit (≤172)
    if (totalHrs > 172) {
      throw new ValidationError(
        `Team exceeds HR limit. Total: ${totalHrs} HRs (max: 172)`
      );
    }

    // Create team with team players
    const team = await db.team.create({
      userId,
      name,
      seasonYear,
      totalHrs2024: totalHrs,
      paymentStatus: 'draft',
      entryStatus: 'draft',
      teamPlayers: {
        create: playerIds.map((playerId, index) => ({
          playerId,
          position: index + 1,
        })),
      },
    });

    res.status(201).json({
      success: true,
      data: team,
      message: 'Team created successfully. Proceed to payment to enter the contest.',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/teams/:id
 * Get a team by ID
 */
export async function getTeam(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;

    const team = await db.team.findUnique(
      { id },
      {
        user: true,
        teamPlayers: true,
      }
    );

    if (!team) {
      throw new NotFoundError('Team not found');
    }

    res.json({
      success: true,
      data: team,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/teams/my-teams
 * Get all teams for the authenticated user
 */
export async function getMyTeams(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req.user as any).id;
    const { seasonYear } = req.query;

    const where: any = {
      userId,
      deletedAt: null,
    };

    if (seasonYear) {
      where.seasonYear = parseInt(seasonYear as string);
    }

    const teams = await db.team.findMany(where, {
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.json({
      success: true,
      data: teams,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /api/teams/:id
 * Update a team (only before lock date)
 */
export async function updateTeam(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const userId = (req.user as any).id;

    // Validate request body
    const validation = updateTeamSchema.safeParse(req.body);
    if (!validation.success) {
      throw new ValidationError(validation.error.errors[0].message);
    }

    const { name, playerIds } = validation.data;

    // Fetch team
    const team = await db.team.findUnique(
      { id },
      { teamPlayers: true }
    );

    if (!team) {
      throw new NotFoundError('Team not found');
    }

    // Check ownership
    if (team.userId !== userId) {
      throw new AuthorizationError('You can only update your own teams');
    }

    // Check if team is locked
    if (team.entryStatus === 'locked') {
      throw new AuthorizationError('Cannot modify a locked team');
    }

    // If updating players, validate
    let updatedData: any = {};

    if (name) {
      updatedData.name = name;
    }

    if (playerIds) {
      // Validate exactly 8 players
      if (playerIds.length !== 8) {
        throw new ValidationError(`Team must have exactly 8 players. You selected ${playerIds.length}.`);
      }

      // Check for duplicates
      const uniquePlayerIds = new Set(playerIds);
      if (uniquePlayerIds.size !== 8) {
        throw new ValidationError('Team cannot have duplicate players');
      }

      // Fetch new players
      const players = await db.player.findMany({
        id: { in: playerIds },
        seasonYear: team.seasonYear,
        isEligible: true,
      });

      if (players.length !== 8) {
        throw new ValidationError('Some selected players are not eligible or do not exist');
      }

      // Calculate total HRs
      const totalHrs = players.reduce((sum, p) => sum + p.hrsPreviousSeason, 0);

      if (totalHrs > 172) {
        throw new ValidationError(
          `Team exceeds HR limit. Total: ${totalHrs} HRs (max: 172)`
        );
      }

      updatedData.totalHrs2024 = totalHrs;

      // Add teamPlayers update
      updatedData.teamPlayers = {
        deleteMany: {},
        create: playerIds.map((playerId, index) => ({
          playerId,
          position: index + 1,
        })),
      };
    }

    // Update team
    const updatedTeam = await db.team.update({ id }, updatedData);

    res.json({
      success: true,
      data: updatedTeam,
      message: 'Team updated successfully',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/teams/:id
 * Delete a team (only before lock date, soft delete)
 */
export async function deleteTeam(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const userId = (req.user as any).id;

    // Fetch team
    const team = await db.team.findUnique({ id });

    if (!team) {
      throw new NotFoundError('Team not found');
    }

    // Check ownership
    if (team.userId !== userId) {
      throw new AuthorizationError('You can only delete your own teams');
    }

    // Check if team is locked
    if (team.entryStatus === 'locked') {
      throw new AuthorizationError('Cannot delete a locked team');
    }

    // Soft delete team
    await db.team.delete({ id });

    res.json({
      success: true,
      message: 'Team deleted successfully',
    });
  } catch (error) {
    next(error);
  }
}
