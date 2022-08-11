export const TIMELINES = {
  home: {
    route: 'friends',
    anonRoute: 'public-timeline',
    icon: 'home',
    label: 'nav.home_timeline',
    criteria: ['!private']
  },
  public: {
    route: 'public-timeline',
    anon: true,
    icon: 'users',
    label: 'nav.public_tl',
    criteria: ['!private']
  },
  twkn: {
    route: 'public-external-timeline',
    anon: true,
    icon: 'globe',
    label: 'nav.twkn',
    criteria: ['!private', 'federating']
  },
  bookmarks: {
    route: 'bookmarks',
    icon: 'bookmark',
    label: 'nav.bookmarks'
  },
  dms: {
    route: 'dms',
    icon: 'envelope',
    label: 'nav.dms'
  }
}

export const ROOT_ITEMS = {
  interactions: {
    route: 'interactions',
    icon: 'bell',
    label: 'nav.interactions'
  },
  chats: {
    route: 'chats',
    icon: 'comments',
    label: 'nav.chats',
    badgeGetter: 'unreadChatCount',
    criteria: ['chats']
  },
  friendRequests: {
    route: 'friend-requests',
    icon: 'user-plus',
    label: 'nav.friend_requests',
    criteria: ['lockedUser'],
    badgeGetter: 'followRequestCount'
  },
  about: {
    route: 'about',
    anon: true,
    icon: 'info-circle',
    label: 'nav.about'
  }
}
