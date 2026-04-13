const bcrypt = require('bcryptjs');

async function createUsers() {
  try {
    // Importar Prisma dinámicamente
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();

    console.log('🌱 Creando usuarios...');

    // Crear usuarios
    const adminPassword = await bcrypt.hash('admin123', 12);
    const testPassword = await bcrypt.hash('johndoe123', 12);

    const admin = await prisma.user.upsert({
      where: { email: 'admin@ceti.mx' },
      update: {},
      create: {
        name: 'Administrador CETI',
        email: 'admin@ceti.mx',
        password: adminPassword,
        role: 'ADMIN',
      },
    });

    const testUser = await prisma.user.upsert({
      where: { email: 'john@doe.com' },
      update: {},
      create: {
        name: 'John Doe',
        email: 'john@doe.com',
        password: testPassword,
        role: 'ADMIN',
      },
    });

    console.log('✅ Usuarios creados exitosamente:');
    console.log('👤 Admin: admin@ceti.mx / admin123');
    console.log('👤 Test User: john@doe.com / johndoe123');

    await prisma.$disconnect();
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

createUsers();
