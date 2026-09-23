import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  console.log('==> Starting Enterprise School Management System Database Seeding...');

  // 1. Organization
  const org = await prisma.organization.upsert({
    where: { code: 'BHA' },
    update: {},
    create: {
      name: 'Beacon Horizon Academy',
      code: 'BHA',
      domain: 'school.edu',
      currency: 'USD',
      timezone: 'UTC',
      status: 'ACTIVE',
    },
  });
  console.log(`[+] Organization: ${org.name} (${org.id})`);

  // 2. Main Campus
  const campus = await prisma.campus.upsert({
    where: {
      organizationId_code: {
        organizationId: org.id,
        code: 'DOWNTOWN',
      },
    },
    update: {},
    create: {
      organizationId: org.id,
      name: 'Downtown Main Campus',
      code: 'DOWNTOWN',
      address: '100 Academy Boulevard',
      city: 'Metropolis',
      country: 'United States',
      isMainCampus: true,
      status: 'ACTIVE',
    },
  });
  console.log(`[+] Campus: ${campus.name} (${campus.id})`);

  // 3. Academic Year
  const academicYear = await prisma.academicYear.upsert({
    where: { id: 'ay-2026-2027' },
    update: {},
    create: {
      id: 'ay-2026-2027',
      organizationId: org.id,
      campusId: campus.id,
      name: '2026-2027',
      startDate: new Date('2026-09-01'),
      endDate: new Date('2027-06-30'),
      isCurrent: true,
      status: 'ACTIVE',
    },
  });
  console.log(`[+] Academic Year: ${academicYear.name} (${academicYear.id})`);

  // 4. Department
  const department = await prisma.department.upsert({
    where: {
      campusId_code: {
        campusId: campus.id,
        code: 'ACAD',
      },
    },
    update: {},
    create: {
      organizationId: org.id,
      campusId: campus.id,
      name: 'Academic Faculty & Instruction',
      code: 'ACAD',
      status: 'ACTIVE',
    },
  });

  // 5. System Roles
  const rolesToSeed = [
    { name: 'Super Administrator', code: 'SUPER_ADMIN', isSystem: true },
    { name: 'School Owner', code: 'SCHOOL_OWNER', isSystem: true },
    { name: 'Principal', code: 'PRINCIPAL', isSystem: true },
    { name: 'Vice Principal', code: 'VICE_PRINCIPAL', isSystem: true },
    { name: 'Teacher', code: 'TEACHER', isSystem: true },
    { name: 'Class Teacher', code: 'CLASS_TEACHER', isSystem: true },
    { name: 'Accountant', code: 'ACCOUNTANT', isSystem: true },
    { name: 'HR Officer', code: 'HR_OFFICER', isSystem: true },
    { name: 'Student', code: 'STUDENT', isSystem: true },
    { name: 'Parent', code: 'PARENT', isSystem: true },
    { name: 'Academic Coordinator', code: 'ACADEMIC_COORDINATOR', isSystem: true },
  ];

  const roleMap = new Map<string, string>();
  for (const r of rolesToSeed) {
    const role = await prisma.role.upsert({
      where: {
        organizationId_code: {
          organizationId: org.id,
          code: r.code,
        },
      },
      update: {},
      create: {
        organizationId: org.id,
        name: r.name,
        code: r.code,
        isSystem: r.isSystem,
        status: 'ACTIVE',
      },
    });
    roleMap.set(r.code, role.id);
  }
  console.log(`[+] Seeded ${rolesToSeed.length} system roles`);

  // 6. Foundational Permissions
  const permissionsToSeed = [
    { code: 'users:read', module: 'users', action: 'read', description: 'View user accounts' },
    { code: 'users:create', module: 'users', action: 'create', description: 'Create user accounts' },
    { code: 'users:update', module: 'users', action: 'update', description: 'Modify user accounts' },
    { code: 'users:delete', module: 'users', action: 'delete', description: 'Deactivate user accounts' },

    { code: 'roles:read', module: 'roles', action: 'read', description: 'View roles catalog' },
    { code: 'roles:manage', module: 'roles', action: 'manage', description: 'Manage roles and assignments' },

    { code: 'campuses:read', module: 'campuses', action: 'read', description: 'View campuses' },
    { code: 'campuses:manage', module: 'campuses', action: 'manage', description: 'Configure campuses' },

    { code: 'students:read', module: 'students', action: 'read', description: 'View student profiles' },
    { code: 'students:create', module: 'students', action: 'create', description: 'Admit new students' },
    { code: 'students:update', module: 'students', action: 'update', description: 'Update student profiles' },
    { code: 'students:delete', module: 'students', action: 'delete', description: 'Archive students' },

    { code: 'guardians:read', module: 'guardians', action: 'read', description: 'View guardian details' },
    { code: 'guardians:create', module: 'guardians', action: 'create', description: 'Register guardians' },
    { code: 'guardians:update', module: 'guardians', action: 'update', description: 'Update guardian details' },

    { code: 'teachers:read', module: 'teachers', action: 'read', description: 'View teachers directory' },
    { code: 'teachers:create', module: 'teachers', action: 'create', description: 'Register teachers' },
    { code: 'teachers:update', module: 'teachers', action: 'update', description: 'Update teacher details' },

    { code: 'employees:read', module: 'employees', action: 'read', description: 'View staff directory' },
    { code: 'employees:create', module: 'employees', action: 'create', description: 'Register employees' },
    { code: 'employees:update', module: 'employees', action: 'update', description: 'Update employee details' },

    { code: 'academics:read', module: 'academics', action: 'read', description: 'View academic structures' },
    { code: 'academics:manage', module: 'academics', action: 'manage', description: 'Configure classes and subjects' },

    { code: 'attendance:read', module: 'attendance', action: 'read', description: 'View attendance records' },
    { code: 'attendance:mark', module: 'attendance', action: 'mark', description: 'Mark daily attendance' },
    { code: 'attendance:manage', module: 'attendance', action: 'manage', description: 'Modify and audit attendance' },

    { code: 'examinations:read', module: 'examinations', action: 'read', description: 'View exam schedules' },
    { code: 'examinations:manage', module: 'examinations', action: 'manage', description: 'Schedule examinations' },
    { code: 'examinations:grade', module: 'examinations', action: 'grade', description: 'Enter examination marks' },

    { code: 'fees:read', module: 'fees', action: 'read', description: 'View fee structures and invoices' },
    { code: 'fees:create', module: 'fees', action: 'create', description: 'Create invoices and fee rules' },
    { code: 'fees:collect', module: 'fees', action: 'collect', description: 'Process payment transactions' },

    { code: 'payroll:read', module: 'payroll', action: 'read', description: 'View payroll' },
    { code: 'payroll:manage', module: 'payroll', action: 'manage', description: 'Calculate and approve payroll' },

    { code: 'notifications:read', module: 'notifications', action: 'read', description: 'View notifications' },
    { code: 'notifications:send', module: 'notifications', action: 'send', description: 'Broadcast notifications' },

    { code: 'reports:read', module: 'reports', action: 'read', description: 'View analytical reports' },
    { code: 'reports:create', module: 'reports', action: 'create', description: 'Request bulk report exports' },

    { code: 'settings:read', module: 'settings', action: 'read', description: 'View institution settings' },
    { code: 'settings:manage', module: 'settings', action: 'manage', description: 'Modify system settings' },

    { code: 'audit:read', module: 'audit', action: 'read', description: 'Inspect audit trail logs' },
  ];

  for (const p of permissionsToSeed) {
    const perm = await prisma.permission.upsert({
      where: { code: p.code },
      update: {},
      create: {
        code: p.code,
        module: p.module,
        action: p.action,
        description: p.description,
      },
    });

    // Map to Super Admin
    const superAdminRoleId = roleMap.get('SUPER_ADMIN');
    if (superAdminRoleId) {
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: superAdminRoleId,
            permissionId: perm.id,
          },
        },
        update: {},
        create: {
          roleId: superAdminRoleId,
          permissionId: perm.id,
        },
      });
    }

    // Map Teacher permissions
    const teacherRoleId = roleMap.get('TEACHER');
    if (
      teacherRoleId &&
      [
        'students:read',
        'academics:read',
        'attendance:read',
        'attendance:mark',
        'examinations:read',
        'examinations:grade',
        'notifications:read',
      ].includes(p.code)
    ) {
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: teacherRoleId,
            permissionId: perm.id,
          },
        },
        update: {},
        create: {
          roleId: teacherRoleId,
          permissionId: perm.id,
        },
      });
    }

    // Map Accountant permissions
    const accountantRoleId = roleMap.get('ACCOUNTANT');
    if (
      accountantRoleId &&
      ['students:read', 'fees:read', 'fees:create', 'fees:collect', 'reports:read'].includes(p.code)
    ) {
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: accountantRoleId,
            permissionId: perm.id,
          },
        },
        update: {},
        create: {
          roleId: accountantRoleId,
          permissionId: perm.id,
        },
      });
    }
  }
  console.log(`[+] Seeded and mapped ${permissionsToSeed.length} permissions`);

  // 7. Seed Users
  const defaultPasswordHash = await argon2.hash('SchoolDev@2026!');

  // Admin User
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@school.edu' },
    update: {},
    create: {
      organizationId: org.id,
      campusId: campus.id,
      email: 'admin@school.edu',
      passwordHash: defaultPasswordHash,
      firstName: 'Alexander',
      lastName: 'Admin',
      phone: '+1-555-0100',
      gender: 'MALE',
      isEmailVerified: true,
      status: 'ACTIVE',
      userRoles: {
        create: {
          roleId: roleMap.get('SUPER_ADMIN')!,
        },
      },
    },
  });
  console.log(`[+] Seeded Super Admin: admin@school.edu`);

  // Teacher User
  const teacherUser = await prisma.user.upsert({
    where: { email: 'teacher@school.edu' },
    update: {},
    create: {
      organizationId: org.id,
      campusId: campus.id,
      email: 'teacher@school.edu',
      passwordHash: defaultPasswordHash,
      firstName: 'Robert',
      lastName: 'Langdon',
      phone: '+1-555-0102',
      gender: 'MALE',
      isEmailVerified: true,
      status: 'ACTIVE',
      userRoles: {
        create: {
          roleId: roleMap.get('TEACHER')!,
        },
      },
      teacherProfile: {
        create: {
          employeeCode: 'TCH-001',
          specialization: 'Mathematics & Analytical Sciences',
          qualification: 'M.Sc. Mathematics, B.Ed.',
          joiningDate: new Date('2024-08-15'),
          status: 'ACTIVE',
        },
      },
    },
    include: {
      teacherProfile: true,
    },
  });
  console.log(`[+] Seeded Teacher: teacher@school.edu (TCH-001)`);

  // Student User
  const studentUser = await prisma.user.upsert({
    where: { email: 'student@school.edu' },
    update: {},
    create: {
      organizationId: org.id,
      campusId: campus.id,
      email: 'student@school.edu',
      passwordHash: defaultPasswordHash,
      firstName: 'Lucas',
      lastName: 'Scott',
      phone: '+1-555-0103',
      gender: 'MALE',
      isEmailVerified: true,
      status: 'ACTIVE',
      userRoles: {
        create: {
          roleId: roleMap.get('STUDENT')!,
        },
      },
      studentProfile: {
        create: {
          admissionNumber: 'ADM-2026-001',
          admissionDate: new Date('2026-09-01'),
          dateOfBirth: new Date('2010-05-14'),
          bloodGroup: 'O+',
          emergencyContact: '+1-555-0199',
          status: 'ACTIVE',
        },
      },
    },
    include: {
      studentProfile: true,
    },
  });
  console.log(`[+] Seeded Student: student@school.edu (ADM-2026-001)`);

  // Guardian User
  const guardianUser = await prisma.user.upsert({
    where: { email: 'parent@school.edu' },
    update: {},
    create: {
      organizationId: org.id,
      campusId: campus.id,
      email: 'parent@school.edu',
      passwordHash: defaultPasswordHash,
      firstName: 'Nathan',
      lastName: 'Scott',
      phone: '+1-555-0199',
      gender: 'MALE',
      isEmailVerified: true,
      status: 'ACTIVE',
      userRoles: {
        create: {
          roleId: roleMap.get('PARENT')!,
        },
      },
      guardianProfile: {
        create: {
          relationship: 'Father',
          occupation: 'Civil Engineer',
          address: '42 Pine Crest Avenue, Metropolis',
          status: 'ACTIVE',
        },
      },
    },
    include: {
      guardianProfile: true,
    },
  });

  // Link Student and Guardian
  if (studentUser.studentProfile && guardianUser.guardianProfile) {
    await prisma.studentGuardian.upsert({
      where: {
        studentId_guardianId: {
          studentId: studentUser.studentProfile.id,
          guardianId: guardianUser.guardianProfile.id,
        },
      },
      update: {},
      create: {
        studentId: studentUser.studentProfile.id,
        guardianId: guardianUser.guardianProfile.id,
        isPrimary: true,
      },
    });
  }

  // Accountant User
  await prisma.user.upsert({
    where: { email: 'accountant@school.edu' },
    update: {},
    create: {
      organizationId: org.id,
      campusId: campus.id,
      email: 'accountant@school.edu',
      passwordHash: defaultPasswordHash,
      firstName: 'Franklin',
      lastName: 'Bean',
      phone: '+1-555-0105',
      gender: 'MALE',
      isEmailVerified: true,
      status: 'ACTIVE',
      userRoles: {
        create: {
          roleId: roleMap.get('ACCOUNTANT')!,
        },
      },
    },
  });
  console.log(`[+] Seeded Accountant: accountant@school.edu`);

  // 8. Academic Classes & Sections
  const classGrade10 = await prisma.class.upsert({
    where: {
      campusId_code: {
        campusId: campus.id,
        code: 'G10',
      },
    },
    update: {},
    create: {
      campusId: campus.id,
      name: 'Grade 10',
      code: 'G10',
      orderIndex: 10,
      status: 'ACTIVE',
    },
  });

  const sectionA = await prisma.section.upsert({
    where: {
      classId_name: {
        classId: classGrade10.id,
        name: 'Section A',
      },
    },
    update: {},
    create: {
      classId: classGrade10.id,
      name: 'Section A',
      capacity: 35,
      classTeacherId: teacherUser.teacherProfile?.id,
      status: 'ACTIVE',
    },
  });
  console.log(`[+] Seeded Class: ${classGrade10.name} - ${sectionA.name}`);

  // 9. Subjects
  const mathSubject = await prisma.subject.upsert({
    where: { code: 'MATH10' },
    update: {},
    create: {
      name: 'Mathematics',
      code: 'MATH10',
      creditHours: 4.0,
      isElective: false,
      status: 'ACTIVE',
    },
  });

  const englishSubject = await prisma.subject.upsert({
    where: { code: 'ENG10' },
    update: {},
    create: {
      name: 'English Literature & Composition',
      code: 'ENG10',
      creditHours: 3.5,
      isElective: false,
      status: 'ACTIVE',
    },
  });

  // Assign Subject Teacher
  if (teacherUser.teacherProfile) {
    await prisma.subjectTeacher.upsert({
      where: {
        subjectId_teacherId_sectionId: {
          subjectId: mathSubject.id,
          teacherId: teacherUser.teacherProfile.id,
          sectionId: sectionA.id,
        },
      },
      update: {},
      create: {
        subjectId: mathSubject.id,
        teacherId: teacherUser.teacherProfile.id,
        sectionId: sectionA.id,
      },
    });
  }

  // 10. Student Enrollment
  if (studentUser.studentProfile) {
    await prisma.enrollment.upsert({
      where: {
        academicYearId_studentId: {
          academicYearId: academicYear.id,
          studentId: studentUser.studentProfile.id,
        },
      },
      update: {},
      create: {
        academicYearId: academicYear.id,
        studentId: studentUser.studentProfile.id,
        sectionId: sectionA.id,
        rollNumber: '101',
        status: 'ACTIVE',
      },
    });
  }

  // 11. Fee Structure & Invoice
  const feeStructure = await prisma.feeStructure.create({
    data: {
      campusId: campus.id,
      name: 'Grade 10 Standard Tuition Fee',
      amount: 1200.0,
      frequency: 'MONTHLY',
      status: 'ACTIVE',
    },
  });

  if (studentUser.studentProfile) {
    await prisma.feeInvoice.upsert({
      where: { invoiceNumber: 'INV-2026-0001' },
      update: {},
      create: {
        academicYearId: academicYear.id,
        studentId: studentUser.studentProfile.id,
        feeStructureId: feeStructure.id,
        invoiceNumber: 'INV-2026-0001',
        amount: 1200.0,
        paidAmount: 0.0,
        dueDate: new Date('2026-10-10'),
        status: 'PENDING',
      },
    });
  }

  // 12. Exam Schedule
  const exam = await prisma.examSchedule.create({
    data: {
      academicYearId: academicYear.id,
      subjectId: mathSubject.id,
      name: 'Mid-Term Examination 2026',
      examDate: new Date('2026-11-15'),
      startTime: '09:00 AM',
      endTime: '12:00 PM',
      maxMarks: 100.0,
      passingMarks: 40.0,
    },
  });

  // 13. System Settings
  const settingsToSeed = [
    { key: 'school_name', value: 'Beacon Horizon Academy' },
    { key: 'school_email', value: 'contact@school.edu' },
    { key: 'school_phone', value: '+1-555-0100' },
    { key: 'academic_term', value: 'Fall Term' },
  ];

  for (const s of settingsToSeed) {
    await prisma.systemSetting.upsert({
      where: {
        organizationId_key: {
          organizationId: org.id,
          key: s.key,
        },
      },
      update: { value: s.value },
      create: {
        organizationId: org.id,
        key: s.key,
        value: s.value,
      },
    });
  }

  // 14. Sample Notification
  await prisma.notification.create({
    data: {
      organizationId: org.id,
      userId: adminUser.id,
      title: 'Welcome to Phase 2 Foundation',
      message: 'The School Management System basic structure and core modules are active.',
      type: 'INFO',
      isRead: false,
    },
  });

  console.log('==> Database Seeding Completed Successfully.');
  console.log('Default Development Credentials:');
  console.log('  Admin User:     admin@school.edu / SchoolDev@2026!');
  console.log('  Teacher User:   teacher@school.edu / SchoolDev@2026!');
  console.log('  Student User:   student@school.edu / SchoolDev@2026!');
  console.log('  Parent User:    parent@school.edu / SchoolDev@2026!');
  console.log('  Accountant:     accountant@school.edu / SchoolDev@2026!');
}

main()
  .catch((e) => {
    console.error('Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
