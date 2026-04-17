require('dotenv').config();
const nodemailer = require('nodemailer');

async function testEmail() {
  console.log('Iniciando prueba de conexión SMTP con GMail...');
  
  if (!process.env.EMAIL_HOST || !process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.error('❌ ERROR: Faltan credenciales en el archivo .env');
    process.exit(1);
  }

  console.log('Credenciales detectadas:');
  console.log(`- HOST: ${process.env.EMAIL_HOST}`);
  console.log(`- PORT: ${process.env.EMAIL_PORT}`);
  console.log(`- USER: ${process.env.EMAIL_USER}`);
  console.log(`- PASS: ${process.env.EMAIL_PASS ? '***' + process.env.EMAIL_PASS.slice(-4) : 'VACÍO'}`);

  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT) || 587,
    secure: Number(process.env.EMAIL_PORT) === 465,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  try {
    console.log('\nIntentando autenticar con Google...');
    await transporter.verify();
    console.log('✅ Autenticación exitosa. Google ha aceptado la contraseña.');
    
    console.log('\nIntentando enviar un correo de prueba a ti mismo...');
    const info = await transporter.sendMail({
      from: `"Prueba de Kanban" <${process.env.EMAIL_USER}>`,
      to: process.env.EMAIL_USER,
      subject: "Test de Conexión Nodemailer ✅",
      text: "Si recibes esto, el servidor de correos está funcionando idóneamente en tu máquina local.",
    });
    
    console.log(`✅ Correo enviado exitosamente! Revisa tu bandeja de entrada.`);
    console.log(`ID del mensaje: ${info.messageId}`);
  } catch (error) {
    console.error('\n❌ ERROR AL CONECTAR O ENVIAR:');
    console.error(error.message);
  }
}

testEmail();
