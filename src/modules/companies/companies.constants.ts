export const COMPANY_INCLUDE_BASE = {
  city: true,
  category: true,
  members: {
    where: { leftAt: null },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
        },
      },
      master: {
        select: {
          id: true,
          slug: true,
          rating: true,
          totalReviews: true,
        },
      },
    },
    orderBy: {
      joinedAt: 'asc' as const,
    },
  },
} as const;

export const COMPANY_INCLUDE_PROVIDER = {
  ...COMPANY_INCLUDE_BASE,
  logoFile: {
    select: { id: true, path: true, filename: true },
  },
  coverFile: {
    select: { id: true, path: true, filename: true },
  },
  services: {
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' as const },
  },
  photos: {
    include: {
      file: {
        select: { id: true, path: true, filename: true, mimetype: true },
      },
    },
    orderBy: { order: 'asc' as const },
  },
} as const;

export const COMPANY_PUBLIC_INCLUDE = {
  city: true,
  category: true,
  logoFile: {
    select: { id: true, path: true },
  },
  coverFile: {
    select: { id: true, path: true },
  },
  services: {
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' as const },
  },
  photos: {
    include: {
      file: {
        select: { id: true, path: true, filename: true },
      },
    },
    orderBy: { order: 'asc' as const },
    take: 20,
  },
  members: {
    where: {
      status: 'ACTIVE' as const,
      leftAt: null,
    },
    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
        },
      },
      master: {
        select: {
          id: true,
          slug: true,
          rating: true,
          totalReviews: true,
        },
      },
    },
    orderBy: { joinedAt: 'asc' as const },
  },
} as const;
