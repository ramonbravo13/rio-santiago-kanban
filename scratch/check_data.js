const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkTasks() {
  try {
    const tasks = await prisma.task.findMany({
      select: {
        id: true,
        name: true,
        links: true
      }
    });

    console.log(`Checking ${tasks.length} tasks...`);
    
    for (const task of tasks) {
      if (task.links) {
        try {
          JSON.parse(task.links);
        } catch (e) {
          console.log(`Task ID ${task.id} ("${task.name}") has invalid JSON in links: ${task.links}`);
        }
      }
    }
  } catch (error) {
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

checkTasks();
