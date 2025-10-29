import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"
import { addDays } from "date-fns"

const prisma = new PrismaClient()

async function main() {
  // Clear existing data
  await prisma.auditLog.deleteMany()
  await prisma.ticket.deleteMany()
  await prisma.announcement.deleteMany()
  await prisma.coachFeedback.deleteMany()
  await prisma.membershipLedger.deleteMany()
  await prisma.membership.deleteMany()
  await prisma.reservation.deleteMany()
  await prisma.coachTimeOff.deleteMany()
  await prisma.coachAvailRule.deleteMany()
  await prisma.lesson.deleteMany()
  await prisma.coachBranch.deleteMany()
  await prisma.coach.deleteMany()
  await prisma.branch.deleteMany()
  await prisma.userProfile.deleteMany()
  await prisma.user.deleteMany()

  // Create admin user
  const adminPassword = await bcrypt.hash("admin123", 10)
  const admin = await prisma.user.create({
    data: {
      username: "admin",
      passwordHash: adminPassword,
      role: "ADMIN",
      profile: {
        create: {
          name: "관리자",
          gender: "UNKNOWN",
          phone: "010-1234-5678",
        },
      },
    },
  })

  // Create branches
  const branches = await Promise.all([
    prisma.branch.create({
      data: {
        name: "강남점",
        address: "서울시 강남구 테헤란로 123",
        description: "최신 시설과 전문 코치진이 있는 강남 플래그십 센터",
        thumbnailUrl: "/images/branch-gangnam.jpg",
      },
    }),
    prisma.branch.create({
      data: {
        name: "판교점",
        address: "경기도 성남시 분당구 판교역로 234",
        description: "IT 직장인을 위한 판교 테크노밸리 센터",
        thumbnailUrl: "/images/branch-pangyo.jpg",
      },
    }),
    prisma.branch.create({
      data: {
        name: "송파점",
        address: "서울시 송파구 올림픽로 345",
        description: "가족 친화적인 송파 패밀리 센터",
        thumbnailUrl: "/images/branch-songpa.jpg",
      },
    }),
  ])

  // Create coaches
  const coaches = await Promise.all([
    prisma.coach.create({
      data: {
        name: "김태희",
        phone: "010-2222-3333",
        bio: "10년 경력의 피트니스 전문 트레이너",
        careerText: "- 체육학 학사\n- NSCA-CPT 자격증\n- 재활트레이닝 전문가",
        birthdate: new Date("1985-03-15"),
        gender: "FEMALE",
        profileUrl: "/images/coach-kim.jpg",
      },
    }),
    prisma.coach.create({
      data: {
        name: "이민호",
        phone: "010-3333-4444",
        bio: "요가와 필라테스 전문 강사",
        careerText: "- 요가 지도자 자격증 1급\n- 필라테스 국제 자격증\n- 5년 지도 경력",
        birthdate: new Date("1990-07-22"),
        gender: "MALE",
        profileUrl: "/images/coach-lee.jpg",
      },
    }),
    prisma.coach.create({
      data: {
        name: "박서준",
        phone: "010-4444-5555",
        bio: "수영 국가대표 출신 코치",
        careerText: "- 전 국가대표 수영선수\n- 아시안게임 금메달리스트\n- 수영 지도자 자격증 1급",
        birthdate: new Date("1988-11-10"),
        gender: "MALE",
        profileUrl: "/images/coach-park.jpg",
      },
    }),
    prisma.coach.create({
      data: {
        name: "최수영",
        phone: "010-5555-6666",
        bio: "테니스 전문 코치",
        careerText: "- ITF 레벨 2 코치\n- 주니어 선수 육성 전문\n- 8년 지도 경력",
        birthdate: new Date("1987-05-05"),
        gender: "FEMALE",
        profileUrl: "/images/coach-choi.jpg",
      },
    }),
    prisma.coach.create({
      data: {
        name: "정우성",
        phone: "010-6666-7777",
        bio: "골프 티칭 프로",
        careerText: "- KPGA 티칭 프로\n- 스윙 분석 전문가\n- 12년 지도 경력",
        birthdate: new Date("1982-09-18"),
        gender: "MALE",
        profileUrl: "/images/coach-jung.jpg",
      },
    }),
  ])

  // Assign coaches to branches
  await Promise.all([
    // 김태희 - 강남점, 송파점
    prisma.coachBranch.create({
      data: { coachId: coaches[0].id, branchId: branches[0].id },
    }),
    prisma.coachBranch.create({
      data: { coachId: coaches[0].id, branchId: branches[2].id },
    }),
    // 이민호 - 모든 지점
    prisma.coachBranch.create({
      data: { coachId: coaches[1].id, branchId: branches[0].id },
    }),
    prisma.coachBranch.create({
      data: { coachId: coaches[1].id, branchId: branches[1].id },
    }),
    prisma.coachBranch.create({
      data: { coachId: coaches[1].id, branchId: branches[2].id },
    }),
    // 박서준 - 강남점
    prisma.coachBranch.create({
      data: { coachId: coaches[2].id, branchId: branches[0].id },
    }),
    // 최수영 - 판교점, 송파점
    prisma.coachBranch.create({
      data: { coachId: coaches[3].id, branchId: branches[1].id },
    }),
    prisma.coachBranch.create({
      data: { coachId: coaches[3].id, branchId: branches[2].id },
    }),
    // 정우성 - 판교점
    prisma.coachBranch.create({
      data: { coachId: coaches[4].id, branchId: branches[1].id },
    }),
  ])

  // Create availability rules (weekday 09:00-22:00 for all coaches)
  for (const coach of coaches) {
    for (let weekday = 1; weekday <= 5; weekday++) {
      // Monday to Friday
      await prisma.coachAvailRule.create({
        data: {
          coachId: coach.id,
          weekday,
          startTime: new Date("1970-01-01T09:00:00"),
          endTime: new Date("1970-01-01T22:00:00"),
        },
      })
    }
    // Weekend with shorter hours
    for (let weekday = 0; weekday <= 6; weekday += 6) {
      // Sunday and Saturday
      await prisma.coachAvailRule.create({
        data: {
          coachId: coach.id,
          weekday,
          startTime: new Date("1970-01-01T10:00:00"),
          endTime: new Date("1970-01-01T18:00:00"),
        },
      })
    }
  }

  // Create lessons
  await Promise.all([
    // 김태희의 레슨
    prisma.lesson.create({
      data: {
        category: "FITNESS",
        name: "체형교정 PT",
        description: "잘못된 자세와 체형을 교정하는 맞춤형 퍼스널 트레이닝",
        coachId: coaches[0].id,
        branchId: branches[0].id,
        thumbnailUrl: "/images/lesson-fitness-1.jpg",
      },
    }),
    prisma.lesson.create({
      data: {
        category: "FITNESS",
        name: "다이어트 PT",
        description: "체계적인 운동과 식단 관리로 건강한 다이어트",
        coachId: coaches[0].id,
        branchId: branches[2].id,
        thumbnailUrl: "/images/lesson-fitness-2.jpg",
      },
    }),

    // 이민호의 레슨
    prisma.lesson.create({
      data: {
        category: "YOGA",
        name: "아쉬탕가 요가",
        description: "역동적이고 강한 움직임의 파워 요가",
        coachId: coaches[1].id,
        branchId: branches[0].id,
        thumbnailUrl: "/images/lesson-yoga-1.jpg",
      },
    }),
    prisma.lesson.create({
      data: {
        category: "PILATES",
        name: "기구 필라테스",
        description: "리포머, 캐딜락을 활용한 전문 필라테스",
        coachId: coaches[1].id,
        branchId: branches[1].id,
        thumbnailUrl: "/images/lesson-pilates-1.jpg",
      },
    }),

    // 박서준의 레슨
    prisma.lesson.create({
      data: {
        category: "SWIMMING",
        name: "성인 수영 입문",
        description: "수영을 처음 시작하는 성인을 위한 기초 레슨",
        coachId: coaches[2].id,
        branchId: branches[0].id,
        thumbnailUrl: "/images/lesson-swim-1.jpg",
      },
    }),
    prisma.lesson.create({
      data: {
        category: "SWIMMING",
        name: "자유형 마스터",
        description: "자유형 자세 교정과 속도 향상을 위한 전문 레슨",
        coachId: coaches[2].id,
        branchId: branches[0].id,
        thumbnailUrl: "/images/lesson-swim-2.jpg",
      },
    }),

    // 최수영의 레슨
    prisma.lesson.create({
      data: {
        category: "TENNIS",
        name: "테니스 입문반",
        description: "테니스 기초 자세와 규칙을 배우는 입문 과정",
        coachId: coaches[3].id,
        branchId: branches[1].id,
        thumbnailUrl: "/images/lesson-tennis-1.jpg",
      },
    }),
    prisma.lesson.create({
      data: {
        category: "TENNIS",
        name: "테니스 게임반",
        description: "실전 게임을 통한 전략과 기술 향상",
        coachId: coaches[3].id,
        branchId: branches[2].id,
        thumbnailUrl: "/images/lesson-tennis-2.jpg",
      },
    }),

    // 정우성의 레슨
    prisma.lesson.create({
      data: {
        category: "GOLF",
        name: "골프 입문 레슨",
        description: "골프 기초 자세와 스윙의 기본기를 다지는 입문 과정",
        coachId: coaches[4].id,
        branchId: branches[1].id,
        thumbnailUrl: "/images/lesson-golf-1.jpg",
      },
    }),
    prisma.lesson.create({
      data: {
        category: "GOLF",
        name: "숏게임 마스터",
        description: "어프로치와 퍼팅 집중 레슨",
        coachId: coaches[4].id,
        branchId: branches[1].id,
        thumbnailUrl: "/images/lesson-golf-2.jpg",
      },
    }),
  ])

  // Create test users
  const userPassword = await bcrypt.hash("user123", 10)
  const users = await Promise.all([
    prisma.user.create({
      data: {
        username: "user1",
        passwordHash: userPassword,
        role: "USER",
        profile: {
          create: {
            name: "김철수",
            gender: "MALE",
            birthdate: new Date("1990-01-15"),
            phone: "010-1111-2222",
          },
        },
      },
    }),
    prisma.user.create({
      data: {
        username: "user2",
        passwordHash: userPassword,
        role: "USER",
        profile: {
          create: {
            name: "이영희",
            gender: "FEMALE",
            birthdate: new Date("1992-05-20"),
            phone: "010-2222-3333",
          },
        },
      },
    }),
    prisma.user.create({
      data: {
        username: "user3",
        passwordHash: userPassword,
        role: "USER",
        profile: {
          create: {
            name: "박민수",
            gender: "MALE",
            birthdate: new Date("1988-11-30"),
            phone: "010-3333-4444",
          },
        },
      },
    }),
  ])

  // Create memberships for test users
  const memberships = await Promise.all([
    // user1 - 김태희 코치 회원권
    prisma.membership.create({
      data: {
        userId: users[0].id,
        coachId: coaches[0].id,
        remainingMinutes: 600, // 10시간
        expiresAt: addDays(new Date(), 30),
        active: true,
      },
    }),
    // user1 - 이민호 코치 회원권
    prisma.membership.create({
      data: {
        userId: users[0].id,
        coachId: coaches[1].id,
        remainingMinutes: 300, // 5시간
        expiresAt: addDays(new Date(), 30),
        active: true,
      },
    }),
    // user2 - 박서준 코치 회원권
    prisma.membership.create({
      data: {
        userId: users[1].id,
        coachId: coaches[2].id,
        remainingMinutes: 480, // 8시간
        expiresAt: addDays(new Date(), 60),
        active: true,
      },
    }),
    // user3 - 정우성 코치 회원권
    prisma.membership.create({
      data: {
        userId: users[2].id,
        coachId: coaches[4].id,
        remainingMinutes: 720, // 12시간
        expiresAt: addDays(new Date(), 90),
        active: true,
      },
    }),
  ])

  // Create initial ledger entries for memberships
  for (const membership of memberships) {
    await prisma.membershipLedger.create({
      data: {
        membershipId: membership.id,
        deltaMinutes: membership.remainingMinutes,
        reason: "ALLOCATE",
        createdByUserId: admin.id,
      },
    })
  }

  // Create announcements
  await Promise.all([
    prisma.announcement.create({
      data: {
        title: "신규 오픈 이벤트",
        body: "신규 회원 가입 시 첫 달 30% 할인 혜택을 드립니다!",
        publishedAt: new Date(),
      },
    }),
    prisma.announcement.create({
      data: {
        title: "여름 특별 프로그램",
        body: "여름을 맞이하여 특별 다이어트 프로그램을 운영합니다.",
        publishedAt: new Date(),
      },
    }),
  ])

  console.log("Seed data created successfully!")
  console.log("\nTest accounts:")
  console.log("Admin - username: admin, password: admin123")
  console.log("User1 - username: user1, password: user123")
  console.log("User2 - username: user2, password: user123")
  console.log("User3 - username: user3, password: user123")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })