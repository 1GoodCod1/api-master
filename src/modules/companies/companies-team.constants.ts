export const COMPANY_MEMBER_INCLUDE = {
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
} as const;

export const COMPANY_INVITATION_INCLUDE = {
  company: {
    select: {
      id: true,
      name: true,
      slug: true,
    },
  },
  invitedBy: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
    },
  },
} as const;
