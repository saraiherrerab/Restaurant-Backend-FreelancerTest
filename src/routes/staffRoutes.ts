import { Router } from 'express';
import {
  getDailyBoard,
  updateReservationStatus,
  approveLargeGroupReservation,
  unblockUser,
  getStaffMembers,
  createStaffMember,
  updateStaffMember,
  deleteStaffMember,
} from '../controllers/staffController';
import { authenticateToken, requireRole } from '../middleware/auth';

const router = Router();

// Require Staff or Admin role
router.use(authenticateToken, requireRole(['STAFF', 'ADMIN']));

router.get('/board', getDailyBoard);
router.patch('/reservations/:id/status', updateReservationStatus);
router.post('/reservations/:id/approve', approveLargeGroupReservation);
router.patch('/users/:userId/unblock', unblockUser);

// Staff Members Management CRUD
router.get('/members', getStaffMembers);
router.post('/members', createStaffMember);
router.put('/members/:id', updateStaffMember);
router.delete('/members/:id', deleteStaffMember);

export default router;

