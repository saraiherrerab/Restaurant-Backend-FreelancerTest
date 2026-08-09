import { Router } from 'express';
import {
  getDailyBoard,
  updateReservationStatus,
  approveLargeGroupReservation,
  unblockUser,
} from '../controllers/staffController';
import { authenticateToken, requireRole } from '../middleware/auth';

const router = Router();

// Require Staff or Admin role
router.use(authenticateToken, requireRole(['STAFF', 'ADMIN']));

router.get('/board', getDailyBoard);
router.patch('/reservations/:id/status', updateReservationStatus);
router.post('/reservations/:id/approve', approveLargeGroupReservation);
router.patch('/users/:userId/unblock', unblockUser);

export default router;
