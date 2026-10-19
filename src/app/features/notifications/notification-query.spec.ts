import {
  NotificationListState,
  notificationIcon,
  notificationLink,
  parseNotificationState,
  toNotificationApiQuery,
  toNotificationUrlParams,
} from './notification-query';

const base: NotificationListState = { view: 'todas', page: 0, size: 20 };

describe('parseNotificationState', () => {
  it('uses the defaults when the URL has nothing', () => {
    expect(parseNotificationState({})).toEqual(base);
  });

  it('reads every parameter (the page starts at 1 in the URL)', () => {
    expect(parseNotificationState({ vista: 'no-leidas', pagina: '3', tamano: '50' })).toEqual({
      view: 'no-leidas',
      page: 2,
      size: 50,
    });
  });

  it.each([
    ['vista', 'inventada'],
    ['pagina', 'abc'],
    ['pagina', '0'],
    ['tamano', '999'],
    ['tamano', 'abc'],
  ])('ignores %s=%s and falls back to the default', (key, value) => {
    expect(parseNotificationState({ [key]: value })).toEqual(base);
  });
});

describe('toNotificationUrlParams', () => {
  it('writes nothing for the default state, and only what is not the default otherwise', () => {
    expect(toNotificationUrlParams(base)).toEqual({});
    expect(toNotificationUrlParams({ view: 'no-leidas', page: 1, size: 10 })).toEqual({
      vista: 'no-leidas',
      pagina: '2',
      tamano: '10',
    });
  });

  it('round-trips with parseNotificationState', () => {
    const state: NotificationListState = { view: 'no-leidas', page: 4, size: 50 };
    expect(parseNotificationState(toNotificationUrlParams(state))).toEqual(state);
  });
});

describe('toNotificationApiQuery', () => {
  it('asks only for the unread ones on that tab', () => {
    expect(toNotificationApiQuery(base)).toEqual({ page: 0, size: 20, unreadOnly: false });
    expect(toNotificationApiQuery({ view: 'no-leidas', page: 2, size: 10 })).toEqual({
      page: 2,
      size: 10,
      unreadOnly: true,
    });
  });
});

describe('notificationLink', () => {
  it('goes to the ticket', () => {
    expect(notificationLink({ ticketId: 't-1', assetId: null }, true)).toEqual(['/tickets', 't-1']);
    expect(notificationLink({ ticketId: 't-1', assetId: null }, false)).toEqual([
      '/tickets',
      't-1',
    ]);
  });

  it('goes to the equipment when the person can open the inventory, and to "my equipment" when not', () => {
    expect(notificationLink({ ticketId: null, assetId: 'a-1' }, true)).toEqual(['/activos', 'a-1']);
    expect(notificationLink({ ticketId: null, assetId: 'a-1' }, false)).toEqual(['/mis-equipos']);
  });

  it('goes nowhere when there is nothing to open', () => {
    expect(notificationLink({ ticketId: null, assetId: null }, true)).toBeNull();
  });
});

describe('notificationIcon', () => {
  it.each([
    ['TICKET_CREATED', 'ticket'],
    ['TICKET_COMMENT_ADDED', 'ticket'],
    ['ASSET_ASSIGNED', 'laptop'],
    ['ASSET_RETURNED', 'laptop'],
    ['ALGO_NUEVO', 'bell'],
  ])('%s → %s', (type, icon) => {
    expect(notificationIcon(type)).toBe(icon);
  });
});
