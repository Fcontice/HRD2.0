/**
 * Payment Routes
 */

import { Router } from 'express';
import { createCheckout, handleWebhook } from '../controllers/paymentController.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { checkoutRateLimiter, webhookRateLimiter } from '../middleware/paymentRateLimits.js';

const router = Router();

/**
 * POST /api/payments/checkout
 * Create a checkout session for team payment
 * Requires authentication and rate limiting (10 req/15min per user)
 */
router.post('/checkout', checkoutRateLimiter, requireAuth, asyncHandler(createCheckout));

/**
 * POST /api/payments/webhook
 * Stripe webhook endpoint
 * No authentication required (verified by signature)
 * Raw body required for signature verification (configured in server.ts)
 * Rate limited to 100 req/min (skipped for valid Stripe signatures)
 */
router.post('/webhook', webhookRateLimiter, asyncHandler(handleWebhook));

export default router;
