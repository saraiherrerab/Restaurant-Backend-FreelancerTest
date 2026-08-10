import {
  sendReservationConfirmationEmail,
  sendReservationStatusUpdateEmail,
} from '../src/services/emailService';

describe('Nodemailer Email Service Suite (Bonus)', () => {
  it('should trigger reservation confirmation email without error', async () => {
    await expect(
      sendReservationConfirmationEmail({
        to: 'client@gourmet.com',
        guestName: 'Cliente de Prueba',
        date: '2026-08-20',
        startTime: '19:00',
        endTime: '20:30',
        guestCount: 4,
        tableNumber: 7,
        status: 'CONFIRMED',
        notes: 'Celebración de cumpleaños',
      })
    ).resolves.not.toThrow();
  });

  it('should trigger pending large group reservation email without error', async () => {
    await expect(
      sendReservationConfirmationEmail({
        to: 'client@gourmet.com',
        guestName: 'Cliente de Prueba',
        date: '2026-08-20',
        startTime: '20:00',
        guestCount: 10,
        status: 'PENDING_APPROVAL',
        notes: 'Evento empresarial',
      })
    ).resolves.not.toThrow();
  });

  it('should trigger status update email without error', async () => {
    await expect(
      sendReservationStatusUpdateEmail({
        to: 'client@gourmet.com',
        guestName: 'Cliente de Prueba',
        date: '2026-08-20',
        startTime: '19:00',
        guestCount: 4,
        newStatus: 'CONFIRMED',
        tableNumber: 7,
      })
    ).resolves.not.toThrow();
  });
});
