import nodemailer, { Transporter } from 'nodemailer';

interface ReservationEmailParams {
  to: string;
  guestName: string;
  date: string;          // YYYY-MM-DD
  startTime: string;     // HH:mm
  endTime?: string;      // HH:mm
  guestCount: number;
  tableNumber?: number | null;
  status: 'CONFIRMED' | 'PENDING_APPROVAL' | 'WAITLIST';
  notes?: string;
}

interface StatusUpdateEmailParams {
  to: string;
  guestName: string;
  date: string;
  startTime: string;
  guestCount: number;
  newStatus: string;
  tableNumber?: number | null;
}

let transporter: Transporter | null = null;
let etherealAccount: nodemailer.TestAccount | null = null;

/**
 * Initializes and returns the Nodemailer Transporter.
 * If SMTP credentials are configured in .env, uses them.
 * Otherwise, creates an Ethereal test account lazily for zero-config testing.
 */
const getTransporter = async (): Promise<Transporter> => {
  if (transporter) {
    return transporter;
  }

  if (process.env.NODE_ENV === 'test') {
    transporter = nodemailer.createTransport({ jsonTransport: true });
    return transporter;
  }

  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;

  if (SMTP_HOST && SMTP_USER && SMTP_PASS) {
    transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: Number(SMTP_PORT) || 587,
      secure: Number(SMTP_PORT) === 465,
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
      },
      tls: {
        rejectUnauthorized: false
      },
      family: 4
    } as any);
    console.log('✉️ Email Service initialized with production SMTP credentials');
    return transporter;
  }

  // Fallback: Ethereal Test Account for Dev / Demo Mode
  try {
    etherealAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: etherealAccount.user,
        pass: etherealAccount.pass,
      },
    });
    console.log(`✉️ Email Service initialized with Ethereal Test Account (${etherealAccount.user})`);
    return transporter;
  } catch (err) {
    console.error('Failed to create Ethereal test account for Nodemailer:', err);
    // Silent fallback transport to prevent app crash
    transporter = nodemailer.createTransport({ jsonTransport: true });
    return transporter;
  }
};

/**
 * Formats YYYY-MM-DD date string safely without UTC offset shift.
 */
const formatDateDisplay = (dateStr: string): string => {
  try {
    const d = new Date(`${dateStr}T00:00:00.000Z`);
    return d.toLocaleDateString('es-ES', {
      timeZone: 'UTC',
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch (e) {
    return dateStr;
  }
};

/**
 * Generates dark gold themed HTML email content for reservation confirmation.
 */
const renderReservationHtml = (params: ReservationEmailParams): string => {
  const formattedDate = formatDateDisplay(params.date);
  const isPending = params.status === 'PENDING_APPROVAL';

  const statusBadgeColor = isPending ? '#f59e0b' : '#10b981';
  const statusTitle = isPending ? 'Solicitud Pendiente de Aprobación' : '¡Reserva Confirmada!';
  const statusSubtitle = isPending
    ? 'Tu solicitud para más de 8 personas ha sido enviada al restaurante. Nuestro Maître la validará a la brevedad.'
    : '¡Te esperamos en GourmetReserve! Tu mesa ha sido asegurada con éxito.';

  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #070a13; color: #f8fafc; margin: 0; padding: 20px; }
    .container { max-width: 560px; margin: 0 auto; background-color: #0e1526; border: 1px solid #1c263c; border-radius: 20px; overflow: hidden; box-shadow: 0 16px 40px rgba(0,0,0,0.6); }
    .header { background: linear-gradient(135deg, #121929 0%, #090e1a 100%); padding: 32px 24px; text-align: center; border-bottom: 1px solid #1a2336; }
    .logo-badge { background-color: #ebb13a; color: #0b101d; width: 44px; height: 44px; border-radius: 12px; display: inline-flex; align-items: center; justify-content: center; font-size: 22px; font-weight: bold; margin-bottom: 12px; }
    .title { color: #ffffff; font-size: 22px; font-weight: 800; margin: 0 0 6px 0; letter-spacing: 0.5px; }
    .subtitle { color: #8e9bb0; font-size: 13px; margin: 0; }
    .content { padding: 32px 28px; }
    .status-pill { display: inline-block; background-color: ${statusBadgeColor}20; color: ${statusBadgeColor}; border: 1px solid ${statusBadgeColor}; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; padding: 6px 14px; border-radius: 20px; margin-bottom: 18px; }
    .info-grid { background-color: #121929; border: 1px solid #1c263c; border-radius: 14px; padding: 20px; margin-bottom: 24px; }
    .info-row { display: flex; justify-content: space-between; margin-bottom: 12px; font-size: 14px; }
    .info-row:last-child { margin-bottom: 0; }
    .label { color: #8e9bb0; font-weight: 600; }
    .value { color: #ffffff; font-weight: 700; text-align: right; }
    .notes-box { background-color: rgba(235, 177, 58, 0.1); border-left: 3px solid #ebb13a; padding: 12px 16px; border-radius: 8px; color: #cbd5e1; font-size: 13px; margin-bottom: 24px; }
    .footer { background-color: #090e1a; border-top: 1px solid #1a2336; padding: 20px 24px; text-align: center; color: #64748b; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo-badge">🍴</div>
      <h1 class="title">GourmetReserve</h1>
      <p class="subtitle">Alta Gastronomía & Reservas Exclusivas</p>
    </div>
    <div class="content">
      <div class="status-pill">${statusTitle}</div>
      <p style="color: #cbd5e1; font-size: 14px; line-height: 1.5; margin-bottom: 24px;">
        Hola <strong>${params.guestName}</strong>,<br>
        ${statusSubtitle}
      </p>

      <div class="info-grid">
        <div class="info-row">
          <span class="label">📅 Fecha de Visita:</span>
          <span class="value">${formattedDate}</span>
        </div>
        <div class="info-row">
          <span class="label">⏰ Horario de Reserva:</span>
          <span class="value">${params.startTime} hs ${params.endTime ? `(${params.endTime} fin)` : ''}</span>
        </div>
        <div class="info-row">
          <span class="label">👥 Comensales:</span>
          <span class="value">${params.guestCount} personas</span>
        </div>
        ${params.tableNumber ? `
        <div class="info-row">
          <span class="label">🪑 Mesa Asignada:</span>
          <span class="value" style="color: #ebb13a;">Mesa #${params.tableNumber}</span>
        </div>` : ''}
      </div>

      ${params.notes ? `
      <div class="notes-box">
        <strong>Peticiones Especiales:</strong> ${params.notes}
      </div>` : ''}

      <p style="font-size: 12px; color: #64748b; line-height: 1.5;">
        📍 <strong>Ubicación:</strong> Av. Gourmet 123, Barrio Norte<br>
        ⚠️ <strong>Política de Cancelación:</strong> Agradecemos avisar con al menos 2 horas de anticipación en caso de imprevistos para evitar penalizaciones por No-Show.
      </p>
    </div>
    <div class="footer">
      © 2026 GourmetReserve System. Todos los derechos reservados.
    </div>
  </div>
</body>
</html>
`;
};

/**
 * Sends reservation confirmation email receipt.
 */
export const sendReservationConfirmationEmail = async (params: ReservationEmailParams) => {
  try {
    const mailTransporter = await getTransporter();
    const fromAddress = process.env.SMTP_FROM || '"GourmetReserve" <reservas@gourmetreserve.com>';

    const subject = params.status === 'PENDING_APPROVAL'
      ? '📋 Solicitud de Reserva Registrada (Pendiente) - GourmetReserve'
      : '✨ Confirmación de Reserva - GourmetReserve';

    const info = await mailTransporter.sendMail({
      from: fromAddress,
      to: params.to,
      subject,
      html: renderReservationHtml(params),
    });

    console.log(`✉️ Email de reserva enviado a ${params.to}. MessageId: ${info.messageId}`);

    // If Ethereal mail preview link is available, log it clearly for the developer/evaluator
    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) {
      console.log(`🔗 [ETHEREAL MAIL PREVIEW URL]: ${previewUrl}`);
    }
  } catch (err) {
    console.error('⚠️ Error al enviar email de confirmación de reserva:', err);
  }
};

/**
 * Sends email when reservation status is updated by staff (e.g. Approved or Cancelled).
 */
export const sendReservationStatusUpdateEmail = async (params: StatusUpdateEmailParams) => {
  try {
    const mailTransporter = await getTransporter();
    const fromAddress = process.env.SMTP_FROM || '"GourmetReserve" <reservas@gourmetreserve.com>';
    const formattedDate = formatDateDisplay(params.date);

    let subject = 'Actualización de Reserva - GourmetReserve';
    let statusText = params.newStatus;
    let statusColor = '#ebb13a';

    if (params.newStatus === 'CONFIRMED') {
      subject = '🎉 ¡Tu Reserva ha sido APROBADA! - GourmetReserve';
      statusText = 'APROBADA Y CONFIRMADA';
      statusColor = '#10b981';
    } else if (params.newStatus === 'CANCELLED') {
      subject = '❌ Reserva Cancelada - GourmetReserve';
      statusText = 'CANCELADA';
      statusColor = '#ef4444';
    }

    const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #070a13; color: #f8fafc; margin: 0; padding: 20px; }
    .container { max-width: 560px; margin: 0 auto; background-color: #0e1526; border: 1px solid #1c263c; border-radius: 20px; overflow: hidden; }
    .header { background: #121929; padding: 24px; text-align: center; border-bottom: 1px solid #1a2336; }
    .title { color: #ffffff; font-size: 20px; font-weight: 800; margin: 0; }
    .content { padding: 28px; }
    .status-badge { display: inline-block; background-color: ${statusColor}20; color: ${statusColor}; border: 1px solid ${statusColor}; font-size: 12px; font-weight: 800; padding: 6px 14px; border-radius: 20px; margin-bottom: 16px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 class="title">GourmetReserve</h1>
    </div>
    <div class="content">
      <div class="status-badge">NUEVO ESTADO: ${statusText}</div>
      <p style="color: #cbd5e1; font-size: 14px; line-height: 1.5;">
        Hola <strong>${params.guestName}</strong>,<br>
        El estado de tu reserva para el día <strong>${formattedDate}</strong> a las <strong>${params.startTime} hs</strong> (${params.guestCount} comensales) ha cambiado a <strong>${statusText}</strong>.
      </p>
      ${params.tableNumber ? `<p style="color: #ebb13a; font-weight: 700; font-size: 14px;">🪑 Mesa Asignada: #${params.tableNumber}</p>` : ''}
    </div>
  </div>
</body>
</html>
    `;

    const info = await mailTransporter.sendMail({
      from: fromAddress,
      to: params.to,
      subject,
      html,
    });

    console.log(`✉️ Email de actualización de estado enviado a ${params.to}. MessageId: ${info.messageId}`);
    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) {
      console.log(`🔗 [ETHEREAL MAIL PREVIEW URL]: ${previewUrl}`);
    }
  } catch (err) {
    console.error('⚠️ Error al enviar email de actualización de estado:', err);
  }
};
