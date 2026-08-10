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

// Staff Members Management CRUD (Admin Only)
router.get('/members', requireRole(['ADMIN']), getStaffMembers);
router.post('/members', requireRole(['ADMIN']), createStaffMember);
router.put('/members/:id', requireRole(['ADMIN']), updateStaffMember);
router.delete('/members/:id', requireRole(['ADMIN']), deleteStaffMember);


export default router;

