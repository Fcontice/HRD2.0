/**
 * Player Routes
 * API endpoints for player data
 */

import express from 'express';
import {
  getPlayers,
  getPlayerById,
  searchPlayers,
  getPlayerStats,
} from '../controllers/playerController.js';

const router = express.Router();

/**
 * Public Routes
 * All player routes are public - no authentication required
 * Users need to see players before creating teams
 */

// GET /api/players - Get all eligible players (with filters)
router.get('/', getPlayers);

// GET /api/players/search - Search players by name
router.get('/search', searchPlayers);

// GET /api/players/stats/summary - Get player pool statistics
router.get('/stats/summary', getPlayerStats);

// GET /api/players/:id - Get single player by ID
router.get('/:id', getPlayerById);

export default router;
