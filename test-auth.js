
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function testAuth(email, password) {
  try {
    console.log(`\n🔍 Probando autenticación para: ${email}`);
    
    // Buscar usuario
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      console.log('❌ Usuario no encontrado');
      return false;
    }

    if (!user.password) {
      console.log('❌ Usuario sin contraseña');
      return false;
    }

    if (!user.isActive) {
      console.log('❌ Usuario inactivo');
      return false;
    }

    // Verificar contraseña
    const isPasswordValid = await bcrypt.compare(password, user.password);
    
    if (!isPasswordValid) {
      console.log('❌ Contraseña incorrecta');
      return false;
    }

    console.log('✅ Autenticación exitosa');
    console.log(`- ID: ${user.id}`);
    console.log(`- Nombre: ${user.name}`);
    console.log(`- Email: ${user.email}`);
    console.log(`- Rol: ${user.role}`);
    console.log(`- Activo: ${user.isActive}`);
    
    return true;
  } catch (error) {
    console.error('❌ Error en autenticación:', error);
    return false;
  }
}

async function main() {
  console.log('🔐 Probando credenciales de acceso...\n');
  
  const credenciales = [
    { email: 'admin@ceti.mx', password: 'admin123' },
    { email: 'john@doe.com', password: 'johndoe123' },
    { email: 'maria.lopez@ceti.mx', password: 'maria123' },
    { email: 'carlos.rodriguez@ceti.mx', password: 'carlos123' },
    { email: 'ana.martinez@ceti.mx', password: 'ana123' }
  ];

  let exitosos = 0;
  
  for (const cred of credenciales) {
    const resultado = await testAuth(cred.email, cred.password);
    if (resultado) exitosos++;
  }

  console.log(`\n📊 Resumen: ${exitosos}/${credenciales.length} credenciales funcionando correctamente`);
  
  if (exitosos === credenciales.length) {
    console.log('\n✅ TODAS LAS CREDENCIALES FUNCIONAN CORRECTAMENTE');
    console.log('💡 El problema de autenticación está resuelto');
  } else {
    console.log('\n❌ Algunas credenciales no funcionan');
  }
}

main()
  .catch(error => {
    console.error('❌ Error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
