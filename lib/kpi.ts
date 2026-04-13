
import { prisma } from './db';
import { KPIData, ProgramKPI, UserKPI } from './types';

export async function calculateProgramKPIs(programId?: string): Promise<ProgramKPI[]> {
  const programs = await prisma.program.findMany({
    where: programId ? { id: programId } : {},
    include: {
      tasks: {
        include: {
          files: true,
          comments: true,
        }
      }
    }
  });

  return programs.map((program: any) => {
    const tasks = program.tasks;
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter((t: any) => t.status === 'DONE').length;
    const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
    
    const deliverablesUploaded = tasks.reduce((sum: any, task: any) => sum + task.files.length, 0);
    
    const tasksInDelay = tasks.filter((task: any) => {
      if (!task.dueDate || task.status === 'DONE') return false;
      return new Date() > task.dueDate;
    }).length;

    const totalComments = tasks.reduce((sum: any, task: any) => sum + task.comments.length, 0);
    const participationLevel = totalTasks > 0 ? (totalComments / totalTasks) : 0;

    // Calculate average completion time for completed tasks
    const completedTasksWithDates = tasks.filter((t: any) => 
      t.status === 'DONE' && t.dueDate && t.updatedAt
    );
    
    let averageCompletionTime = 0;
    if (completedTasksWithDates.length > 0) {
      const totalDays = completedTasksWithDates.reduce((sum: any, task: any) => {
        const dueDate = new Date(task.dueDate!);
        const completedDate = new Date(task.updatedAt);
        const diffTime = completedDate.getTime() - dueDate.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return sum + diffDays;
      }, 0);
      averageCompletionTime = totalDays / completedTasksWithDates.length;
    }

    return {
      programId: program.id,
      programName: program.name,
      totalTasks,
      completedTasks,
      completionRate,
      deliverablesUploaded,
      averageCompletionTime,
      tasksInDelay,
      participationLevel,
    };
  });
}

export async function calculateUserKPIs(userId?: string): Promise<UserKPI[]> {
  const users = await prisma.user.findMany({
    where: userId ? { id: userId } : { role: 'COLABORADOR' },
    include: {
      assignedTasks: {
        include: {
          task: {
            include: {
              files: true,
              comments: {
                where: {
                  authorId: userId || undefined
                }
              }
            }
          }
        }
      }
    }
  });

  return users.map((user: any) => {
    const tasks = user.assignedTasks.map((assignee: any) => assignee.task);
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter((t: any) => t.status === 'DONE').length;
    const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
    
    const deliverablesUploaded = tasks.reduce((sum: number, task: any) => sum + task.files.length, 0);
    
    const tasksInDelay = tasks.filter((task: any) => {
      if (!task.dueDate || task.status === 'DONE') return false;
      return new Date() > task.dueDate;
    }).length;

    const totalComments = tasks.reduce((sum: number, task: any) => sum + task.comments.length, 0);
    const participationLevel = totalTasks > 0 ? totalComments / totalTasks : 0;

    // Calculate average delay for completed tasks
    const completedTasksWithDates = tasks.filter((t: any) => 
      t.status === 'DONE' && t.dueDate && t.updatedAt
    );
    
    let averageCompletionTime = 0;
    if (completedTasksWithDates.length > 0) {
      const totalDays = completedTasksWithDates.reduce((sum: number, task: any) => {
        const dueDate = new Date(task.dueDate!);
        const completedDate = new Date(task.updatedAt);
        const diffTime = completedDate.getTime() - dueDate.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return sum + diffDays;
      }, 0);
      averageCompletionTime = totalDays / completedTasksWithDates.length;
    }

    return {
      userId: user.id,
      userName: user.name || user.email,
      totalTasks,
      completedTasks,
      completionRate,
      deliverablesUploaded,
      averageCompletionTime,
      tasksInDelay,
      participationLevel,
    };
  });
}

export async function getOverallKPIs(): Promise<any> {
  const [
    totalUsers,
    activeUsers,
    totalPrograms,
    activePrograms,
    totalTasks,
    completedTasks,
    inProgressTasks,
    pendingTasks,
    overdueTasks,
    totalFiles
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { isActive: true } }),
    prisma.program.count(),
    prisma.program.count({ where: { status: 'ACTIVO' } }),
    prisma.task.count(),
    prisma.task.count({ where: { status: 'DONE' } }),
    prisma.task.count({ where: { status: 'IN_PROGRESS' } }),
    prisma.task.count({ where: { status: 'TODO' } }),
    prisma.task.count({
      where: {
        AND: [
          { status: { not: 'DONE' } },
          { dueDate: { lt: new Date() } }
        ]
      }
    }),
    prisma.file.count()
  ]);

  // Calculate on-time completion rate separately
  const completedTasksWithDue = await prisma.task.findMany({
    where: {
      AND: [
        { status: 'DONE' },
        { dueDate: { not: null } }
      ]
    },
    select: {
      dueDate: true,
      updatedAt: true,
    }
  });

  const onTimeCompletedTasks = completedTasksWithDue.filter((task: any) => 
    new Date(task.updatedAt) <= new Date(task.dueDate!)
  ).length;

  const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
  const onTimeCompletionRate = completedTasks > 0 ? (onTimeCompletedTasks / completedTasks) * 100 : 0;

  // Calculate average tasks per user (only active users)
  const averageTasksPerUser = activeUsers > 0 ? totalTasks / activeUsers : 0;

  // Calculate average tasks per program (only active programs)
  const averageTasksPerProgram = activePrograms > 0 ? totalTasks / activePrograms : 0;

  // Calculate average completion time for completed tasks
  const completedTasksWithDates = await prisma.task.findMany({
    where: {
      AND: [
        { status: 'DONE' },
        { dueDate: { not: null } }
      ]
    },
    select: {
      dueDate: true,
      updatedAt: true,
    }
  });

  let averageCompletionTime = 0;
  if (completedTasksWithDates.length > 0) {
    const totalDays = completedTasksWithDates.reduce((sum: any, task: any) => {
      const dueDate = new Date(task.dueDate!);
      const completedDate = new Date(task.updatedAt);
      const diffTime = completedDate.getTime() - dueDate.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return sum + diffDays;
    }, 0);
    averageCompletionTime = totalDays / completedTasksWithDates.length;
  }

  const totalComments = await prisma.comment.count();
  const participationLevel = totalTasks > 0 ? totalComments / totalTasks : 0;

  return {
    totalUsers,
    activeUsers,
    totalPrograms,
    activePrograms,
    totalTasks,
    completedTasks,
    inProgressTasks,
    pendingTasks,
    overdueTasks,
    completionRate,
    onTimeCompletionRate,
    averageTasksPerUser,
    averageTasksPerProgram,
    deliverablesUploaded: totalFiles,
    averageCompletionTime,
    tasksInDelay: overdueTasks,
    participationLevel,
  };
}
