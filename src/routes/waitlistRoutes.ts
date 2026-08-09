import { Router } from 'express';
import { joinWaitlist, claimWaitlistOffer } from '../controllers/waitlistController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.post('/', authenticateToken, joinWaitlist);
router.post('/:id/claim', authenticateToken, claimWaitlistOffer);

export default router;
