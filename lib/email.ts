import nodemailer from 'nodemailer';

interface MinimalTaskInfo {
  id: string;
  name: string;
  description?: string | null;
  dueDate?: Date | null;
}

export async function sendTaskAssignedEmail(userEmail: string, task: MinimalTaskInfo) {
  // Verificamos si están configuradas las variables de entorno
  if (!process.env.EMAIL_HOST || !process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn('⚠️ Omisión de envío de correo: faltan credenciales SMTP en el entorno (.env).');
    return false;
  }

  try {
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: Number(process.env.EMAIL_PORT) || 587,
      secure: Number(process.env.EMAIL_PORT) === 465, // true para puerto 465, false para otros
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const appUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const taskUrl = `${appUrl}/dashboard`; // Te lleva al Kanban board donde radica la tarea (podríamos poner el ID a futuro)

    // Formatear la fecha
    let dateLine = '';
    if (task.dueDate) {
       const dateOptions: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long', day: 'numeric' };
       const formattedDate = new Date(task.dueDate).toLocaleDateString('es-ES', dateOptions);
       dateLine = `<p style="margin: 0 0 10px 0; color: #4B5563;"><strong>Fecha límite:</strong> ${formattedDate}</p>`;
    }

    const htmlContent = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-w-2xl mx-auto p-4; max-width: 600px; margin: 0 auto; background-color: #f9fafb; padding: 40px 20px; border-radius: 8px;">
        <div style="background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
          
          <div style="background-color: #4f46e5; padding: 24px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">¡Nueva Tarea Asignada!</h1>
          </div>
          
          <div style="padding: 32px 24px;">
            <p style="color: #374151; font-size: 16px; line-height: 24px; margin-top: 0;">
              Hola, se te ha asignado una nueva labor en el sistema Kanban de Río Santiago.
            </p>
            
            <div style="background-color: #f3f4f6; border-left: 4px solid #4f46e5; padding: 16px; margin: 24px 0; border-radius: 0 8px 8px 0;">
              <h2 style="margin: 0 0 8px 0; color: #111827; font-size: 18px;">${task.name}</h2>
              ${task.description ? `<p style="margin: 0 0 12px 0; color: #4b5563; font-size: 14px; line-height: 20px;">${task.description}</p>` : ''}
              ${dateLine}
            </div>
            
            <div style="text-align: center; margin-top: 32px;">
              <a href="${taskUrl}" style="display: inline-block; background-color: #4f46e5; color: white; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 600; font-size: 16px;">
                Ver en el Tablero
              </a>
            </div>
          </div>
          
          <div style="background-color: #f9fafb; border-top: 1px solid #e5e7eb; padding: 16px 24px; text-align: center;">
            <p style="color: #6b7280; font-size: 12px; margin: 0;">
              Este es un correo automático generado por el Sistema Kanban Río Santiago.<br>
              Por favor, no respondas a este mensaje.
            </p>
          </div>
        </div>
      </div>
    `;

    const mailOptions = {
      from: `"Kanban Río Santiago" <${process.env.EMAIL_USER}>`,
      to: userEmail,
      subject: `Nueva Tarea Asignada: ${task.name}`,
      html: htmlContent,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`✉️ Correo de asignación enviado a ${userEmail} [ID: ${info.messageId}]`);
    return true;
  } catch (error) {
    console.error('❌ Error al enviar correo de notificación:', error);
    return false;
  }
}
