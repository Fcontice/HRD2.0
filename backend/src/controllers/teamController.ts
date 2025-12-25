/**
 * Team Controller
 * Handles all team-related API requests
 */

import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import {
  ValidationError,
  NotFoundError,
  AuthenticationError,
  AuthorizationError,
} from '../utils/errors.js';
import { createTeamSchema, updateTeamSchema } from '../types/validation.js';

const prisma = new PrismaClient();

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
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

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
    const players = await prisma.player.findMany({
      where: {
        id: { in: playerIds },
        seasonYear,
        isEligible: true,
      },
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

    // Create team and team players in a transaction
    const team = await prisma.$transaction(async (tx) => {
      // Create team
      const newTeam = await tx.team.create({
        data: {
          userId,
          name,
          seasonYear,
          totalHrs2024: totalHrs,
          paymentStatus: 'draft',
          entryStatus: 'draft',
        },
      });

      // Create team-player associations
      const teamPlayers = playerIds.map((playerId, index) => ({
        teamId: newTeam.id,
        playerId,
        position: index + 1,
      }));

      await tx.teamPlayer.createMany({
        data: teamPlayers,
      });

      // Return team with players
      return tx.team.findUnique({
        where: { id: newTeam.id },
        include: {
          teamPlayers: {
            include: {
              player: true,
            },
            orderBy: {
              position: 'asc',
            },
          },
        },
      });
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

    const team = await prisma.team.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            avatarUrl: true,
          },
        },
        teamPlayers: {
          include: {
            player: true,
          },
          orderBy: {
            position: 'asc',
          },
        },
      },
    });

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

    const teams = await prisma.team.findMany({
      where,
      include: {
        teamPlayers: {
          include: {
            player: true,
          },
          orderBy: {
            position: 'asc',
          },
        },
      },
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
    const validation = teamUpdateSchema.safeParse(req.body);
    if (!validation.success) {
      throw new ValidationError(validation.error.errors[0].message);
    }

    const { name, playerIds } = validation.data;

    // Fetch team
    const team = await prisma.team.findUnique({
      where: { id },
      include: {
        teamPlayers: {
          include: {
            player: true,
          },
        },
      },
    });

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
      const players = await prisma.player.findMany({
        where: {
          id: { in: playerIds },
          seasonYear: team.seasonYear,
          isEligible: true,
        },
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
    }

    // Update team in transaction
    const updatedTeam = await prisma.$transaction(async (tx) => {
      // Update team
      const team = await tx.team.update({
        where: { id },
        data: updatedData,
      });

      // If updating players, delete old and create new
      if (playerIds) {
        await tx.teamPlayer.deleteMany({
          where: { teamId: id },
        });

        const teamPlayers = playerIds.map((playerId, index) => ({
          teamId: id,
          playerId,
          position: index + 1,
        }));

        await tx.teamPlayer.createMany({
          data: teamPlayers,
        });
      }

      // Return updated team with players
      return tx.team.findUnique({
        where: { id },
        include: {
          teamPlayers: {
            include: {
              player: true,
            },
            orderBy: {
              position: 'asc',
            },
          },
        },
      });
    });

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
    const team = await prisma.team.findUnique({
      where: { id },
    });

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
    await prisma.team.update({
      where: { id },
      data: {
        deletedAt: new Date(),
      },
    });

    res.json({
      success: true,
      message: 'Team deleted successfully',
    });
  } catch (error) {
    next(error);
  }
}
