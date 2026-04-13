
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('🔍 Verificando usuarios en la base de datos...');
    
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        password: true // Solo verificar si existe, no mostrar el hash
      }
    });

    if (users.length === 0) {
      console.log('❌ No hay usuarios en la base de datos');
      return;
    }

    console.log(`✅ Encontrados ${users.length} usuarios:`);
    users.forEach(user => {
      console.log(`- ${user.email} (${user.name}) - Role: ${user.role} - Active: ${user.isActive} - Password: ${user.password ? 'YES' : 'NO'}`);
    });

    // Verificar específicamente el usuario admin
    const adminUser = await prisma.user.findUnique({
      where: { email: 'admin@ceti.mx' }
    });

    if (adminUser) {
      console.log('\n🔑 Usuario admin encontrado:');
      console.log(`- Email: ${adminUser.email}`);
      console.log(`- Name: ${adminUser.name}`);
      console.log(`- Role: ${adminUser.role}`);
      console.log(`- Active: ${adminUser.isActive}`);
      console.log(`- Has Password: ${adminUser.password ? 'YES' : 'NO'}`);
    } else {
      console.log('\n❌ Usuario admin NO encontrado');
    }

  } catch (error) {
    console.error('❌ Error verificando usuarios:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
