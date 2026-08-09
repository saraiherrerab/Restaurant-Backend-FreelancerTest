import { Router } from 'express';
import {
  checkAvailabilityEndpoint,
  createReservation,
  getMyBookings,
  cancelReservation,
} from '../controllers/reservationController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.get('/availability', checkAvailabilityEndpoint);
router.post('/', authenticateToken, createReservation);
router.get('/my-bookings', authenticateToken, getMyBookings);
router.patch('/:id/cancel', authenticateToken, cancelReservation);

export default router;
