import { sendReservationConfirmationEmail } from './src/services/emailService';
import dotenv from 'dotenv';

// Configurar variables de entorno antes de importar modulos que dependan de ellas
dotenv.config();

async function runTest() {
  console.log('Iniciando prueba de envío de correo a Luis Carlos...');
  try {
    await sendReservationConfirmationEmail({
      to: 'luiscarlossomoza@gmail.com',
      guestName: 'Luis Carlos',
      date: '2026-08-15',
      startTime: '20:00',
      guestCount: 2,
      status: 'CONFIRMED',
      notes: '',
      tableNumber: 5
    });
    console.log('¡Prueba finalizada sin errores! Revisa la bandeja de entrada o la consola arriba para confirmar.');
  } catch (err) {
    console.error('Ocurrió un error en la prueba:', err);
  }
}

runTest();
