export const JOB_INCLUDE_BASE = {
  photos: { include: { file: true }, orderBy: { order: 'asc' as const } },
  client: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      avatarFile: { select: { path: true } },
    },
  },
  company: {
    select: {
      id: true,
      name: true,
      slug: true,
      logoFile: { select: { path: true } },
    },
  },
  city: { select: { id: true, name: true } },
  category: {
    select: {
      id: true,
      name: true,
      slug: true,
      icon: true,
      iconKey: true,
      translations: true,
    },
  },
  _count: { select: { applications: true } },
} as const;

export const APPLICATION_INCLUDE = {
  photos: { include: { file: true }, orderBy: { order: 'asc' as const } },
  master: {
    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          avatarFile: { select: { path: true } },
        },
      },
      city: true,
      category: true,
      companyMembership: {
        where: {
          leftAt: null,
          status: 'ACTIVE',
        },
        include: {
          company: {
            select: {
              id: true,
              name: true,
              slug: true,
              logoFile: { select: { path: true } },
            },
          },
        },
      },
    },
  },
} as const;

export const TOP_VISIBLE_RANK = 5;
export const JOBS_LIST_TTL = 30;
export const JOB_BY_ID_TTL = 60;
export const LEADERBOARD_TTL = 15;
