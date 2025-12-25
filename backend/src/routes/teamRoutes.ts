/**
 * Team Routes
 * API endpoints for team management
 */

import express from 'express';
import {
  createTeam,
  getTeam,
  getMyTeams,
  updateTeam,
  deleteTeam,
} from '../controllers/teamController.js';
import { requireAuth, requireEmailVerified } from '../middleware/auth.js';

const router = express.Router();

/**
 * Protected Routes
 * All team routes require authentication
 */

// POST /api/teams - Create a new team
router.post('/', requireAuth, requireEmailVerified, createTeam);

// GET /api/teams/my-teams - Get current user's teams
router.get('/my-teams', requireAuth, getMyTeams);

// GET /api/teams/:id - Get team by ID (public)
router.get('/:id', getTeam);

// PATCH /api/teams/:id - Update team (before lock only)
router.patch('/:id', requireAuth, updateTeam);

// DELETE /api/teams/:id - Delete team (before lock only, soft delete)
router.delete('/:id', requireAuth, deleteTeam);

export default router;
