import { isMobile } from '@src/util/libs/mobile';
import { compareVersions } from 'compare-versions';
import { fetchFn } from '../initMatrix';

const cons = {
  version: __ENV_APP__.VERSION,

  secretKey: {
    ACCESS_TOKEN: 'cinny_access_token',
    DEVICE_ID: 'cinny_device_id',
    USER_ID: 'cinny_user_id',
    BASE_URL: 'cinny_hs_base_url',
  },

  DEVICE_DISPLAY_NAME: `${__ENV_APP__.INFO.name} (${__ENV_APP__.ELECTRON_MODE ? 'Desktop' : isMobile() ? 'Mobile' : 'Browser'})`,
  IN_CINNY_SPACES: 'in.cinny.spaces',

  tabs: {
    HOME: 'home',
    DIRECTS: 'dm',
  },

  supportEventTypes: [
    'm.room.create',
    'm.room.message',
    'm.room.encrypted',
    'm.room.member',
    'm.room.pinned_events',
    'm.sticker',
  ],

  supportReceiptTypes: ['m.read', 'm.read.private'],

  notifs: {
    DEFAULT: 'default',
    ALL_MESSAGES: 'all_messages',
    MENTIONS_AND_KEYWORDS: 'mentions_and_keywords',
    MUTE: 'mute',
  },

  status: {
    PRE_FLIGHT: 'pre-flight',
    IN_FLIGHT: 'in-flight',
    SUCCESS: 'success',
    ERROR: 'error',
  },

  actions: {
    navigation: {
      UPDATE_EMOJI_LIST_DATA: 'UPDATE_EMOJI_LIST_DATA',
      UPDATE_EMOJI_LIST: 'UPDATE_EMOJI_LIST',
      SELECT_ROOM_MODE: 'SELECT_ROOM_MODE',
      SELECT_TAB: 'SELECT_TAB',
      SELECT_SPACE: 'SELECT_SPACE',
      SELECT_ROOM: 'SELECT_ROOM',
      OPEN_SPACE_SETTINGS: 'OPEN_SPACE_SETTINGS',
      OPEN_SPACE_MANAGE: 'OPEN_SPACE_MANAGE',
      OPEN_SPACE_ADDEXISTING: 'OPEN_SPACE_ADDEXISTING',
      TOGGLE_ROOM_SETTINGS: 'TOGGLE_ROOM_SETTINGS',
      ROOM_INFO_UPDATE: 'ROOM_INFO_UPDATED',
      OPEN_SHORTCUT_SPACES: 'OPEN_SHORTCUT_SPACES',
      OPEN_INVITE_LIST: 'OPEN_INVITE_LIST',
      OPEN_PUBLIC_ROOMS: 'OPEN_PUBLIC_ROOMS',
      OPEN_CREATE_ROOM: 'OPEN_CREATE_ROOM',
      OPEN_JOIN_ALIAS: 'OPEN_JOIN_ALIAS',
      OPEN_INVITE_USER: 'OPEN_INVITE_USER',
      OPEN_PROFILE_VIEWER: 'OPEN_PROFILE_VIEWER',
      OPEN_SETTINGS: 'OPEN_SETTINGS',
      OPEN_EMOJIBOARD: 'OPEN_EMOJIBOARD',
      OPEN_READRECEIPTS: 'OPEN_READRECEIPTS',
      OPEN_VIEWSOURCE: 'OPEN_VIEWSOURCE',
      CLICK_REPLY_TO: 'CLICK_REPLY_TO',
      OPEN_SEARCH: 'OPEN_SEARCH',
      OPEN_REUSABLE_CONTEXT_MENU: 'OPEN_REUSABLE_CONTEXT_MENU',
      OPEN_NAVIGATION: 'OPEN_NAVIGATION',
      OPEN_REUSABLE_DIALOG: 'OPEN_REUSABLE_DIALOG',
      OPEN_EMOJI_VERIFICATION: 'OPEN_EMOJI_VERIFICATION',
      PROFILE_UPDATE: 'PROFILE_UPDATE',
      CONSOLE_REMOVE_DATA: 'CONSOLE_REMOVE_DATA',
      CONSOLE_NEW_DATA: 'CONSOLE_NEW_DATA',
      CONSOLE_UPDATE: 'CONSOLE_UPDATE',
      ETHEREUM_UPDATE: 'ETHEREUM_UPDATE',
    },

    room: {
      JOIN: 'JOIN',
      LEAVE: 'LEAVE',
      CREATE: 'CREATE',
    },

    accountData: {
      CREATE_SPACE_SHORTCUT: 'CREATE_SPACE_SHORTCUT',
      DELETE_SPACE_SHORTCUT: 'DELETE_SPACE_SHORTCUT',
      MOVE_SPACE_SHORTCUTS: 'MOVE_SPACE_SHORTCUTS',
      CATEGORIZE_SPACE: 'CATEGORIZE_SPACE',
      UNCATEGORIZE_SPACE: 'UNCATEGORIZE_SPACE',
    },

    settings: {
      TOGGLE_SYSTEM_THEME: 'TOGGLE_SYSTEM_THEME',
      TOGGLE_MARKDOWN: 'TOGGLE_MARKDOWN',
      TOGGLE_PEOPLE_DRAWER: 'TOGGLE_PEOPLE_DRAWER',
      TOGGLE_MEMBERSHIP_EVENT: 'TOGGLE_MEMBERSHIP_EVENT',
      TOGGLE_NICKAVATAR_EVENT: 'TOGGLE_NICKAVATAR_EVENT',
      TOGGLE_NOTIFICATIONS: 'TOGGLE_NOTIFICATIONS',
      TOGGLE_NOTIFICATION_SOUNDS: 'TOGGLE_NOTIFICATION_SOUNDS',
    },
  },

  events: {
    navigation: {
      CONSOLE_REMOVED_DATA: 'CONSOLE_REMOVED_DATA',
      CONSOLE_NEW_DATA_CREATED: 'CONSOLE_NEW_DATA_CREATED',
      CONSOLE_UPDATED: 'CONSOLE_UPDATED',
      SELECTED_ROOM_MODE: 'SELECTED_ROOM_MODE',
      SELECTED_ROOM: 'SELECTED_ROOM',
      TAB_SELECTED: 'TAB_SELECTED',
      SPACE_SELECTED: 'SPACE_SELECTED',
      ROOM_SELECTED: 'ROOM_SELECTED',
      UPDATED_EMOJI_LIST: 'UPDATED_EMOJI_LIST',
      UPDATED_EMOJI_LIST_DATA: 'UPDATED_EMOJI_LIST_DATA',
      SPACE_SETTINGS_OPENED: 'SPACE_SETTINGS_OPENED',
      SPACE_MANAGE_OPENED: 'SPACE_MANAGE_OPENED',
      SPACE_ADDEXISTING_OPENED: 'SPACE_ADDEXISTING_OPENED',
      ROOM_SETTINGS_TOGGLED: 'ROOM_SETTINGS_TOGGLED',
      ROOM_INFO_UPDATED: 'ROOM_INFO_UPDATED',
      SHORTCUT_SPACES_OPENED: 'SHORTCUT_SPACES_OPENED',
      INVITE_LIST_OPENED: 'INVITE_LIST_OPENED',
      PUBLIC_ROOMS_OPENED: 'PUBLIC_ROOMS_OPENED',
      CREATE_ROOM_OPENED: 'CREATE_ROOM_OPENED',
      JOIN_ALIAS_OPENED: 'JOIN_ALIAS_OPENED',
      INVITE_USER_OPENED: 'INVITE_USER_OPENED',
      SETTINGS_OPENED: 'SETTINGS_OPENED',
      PROFILE_VIEWER_OPENED: 'PROFILE_VIEWER_OPENED',
      EMOJIBOARD_OPENED: 'EMOJIBOARD_OPENED',
      READRECEIPTS_OPENED: 'READRECEIPTS_OPENED',
      VIEWSOURCE_OPENED: 'VIEWSOURCE_OPENED',
      REPLY_TO_CLICKED: 'REPLY_TO_CLICKED',
      SEARCH_OPENED: 'SEARCH_OPENED',
      REUSABLE_CONTEXT_MENU_OPENED: 'REUSABLE_CONTEXT_MENU_OPENED',
      NAVIGATION_OPENED: 'NAVIGATION_OPENED',
      REUSABLE_DIALOG_OPENED: 'REUSABLE_DIALOG_OPENED',
      EMOJI_VERIFICATION_OPENED: 'EMOJI_VERIFICATION_OPENED',
      PROFILE_UPDATED: 'PROFILE_UPDATED',
      ETHEREUM_UPDATED: 'ETHEREUM_UPDATED',
    },

    roomList: {
      ROOMLIST_UPDATED: 'ROOMLIST_UPDATED',
      INVITELIST_UPDATED: 'INVITELIST_UPDATED',
      ROOM_JOINED: 'ROOM_JOINED',
      ROOM_LEAVED: 'ROOM_LEAVED',
      ROOM_CREATED: 'ROOM_CREATED',
      ROOM_PROFILE_UPDATED: 'ROOM_PROFILE_UPDATED',
    },

    accountData: {
      SPACE_SHORTCUT_UPDATED: 'SPACE_SHORTCUT_UPDATED',
      CATEGORIZE_SPACE_UPDATED: 'CATEGORIZE_SPACE_UPDATED',
    },

    notifications: {
      NOTI_CHANGED: 'NOTI_CHANGED',
      FULL_READ: 'FULL_READ',
      MUTE_TOGGLED: 'MUTE_TOGGLED',
      THREAD_NOTIFICATION: 'THREAD_NOTIFICATION',
    },

    roomTimeline: {
      READY: 'READY',
      EVENT: 'EVENT',
      PAGINATED: 'PAGINATED',
      TYPING_MEMBERS_UPDATED: 'TYPING_MEMBERS_UPDATED',
      LIVE_RECEIPT: 'LIVE_RECEIPT',
      EVENT_REDACTED: 'EVENT_REDACTED',
      AT_BOTTOM: 'AT_BOTTOM',
      SCROLL_TO_LIVE: 'SCROLL_TO_LIVE',
    },

    roomsInput: {
      MESSAGE_SENT: 'MESSAGE_SENT',
      ATTACHMENT_SET: 'ATTACHMENT_SET',
      FILE_UPLOADED: 'FILE_UPLOADED',
      UPLOAD_PROGRESS_CHANGES: 'UPLOAD_PROGRESS_CHANGES',
      FILE_UPLOAD_CANCELED: 'FILE_UPLOAD_CANCELED',
      ATTACHMENT_CANCELED: 'ATTACHMENT_CANCELED',
    },

    settings: {
      SYSTEM_THEME_TOGGLED: 'SYSTEM_THEME_TOGGLED',
      THEME_TOGGLED: 'THEME_TOGGLED',
      THEME_APPLIED: 'THEME_APPLIED',
      MARKDOWN_TOGGLED: 'MARKDOWN_TOGGLED',
      PEOPLE_DRAWER_TOGGLED: 'PEOPLE_DRAWER_TOGGLED',
      MEMBERSHIP_EVENTS_TOGGLED: 'MEMBERSHIP_EVENTS_TOGGLED',
      NICKAVATAR_EVENTS_TOGGLED: 'NICKAVATAR_EVENTS_TOGGLED',
      NOTIFICATIONS_TOGGLED: 'NOTIFICATIONS_TOGGLED',
      NOTIFICATION_SOUNDS_TOGGLED: 'NOTIFICATION_SOUNDS_TOGGLED',
    },
  },
};

Object.freeze(cons);

// https://docs.github.com/en/rest/repos/repos?apiVersion=2022-11-28#list-repository-tags
global.checkVersions = () =>
  new Promise((resolve, reject) => {
    fetchFn(`https://api.github.com/repos/pixxels-team/Pixxels-App/tags`, {
      method: 'GET',
      cache: 'no-cache',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    })
      .then((response) => {
        response
          .json()
          .then((data) => {
            if (Array.isArray(data) && data.length > 0) {
              resolve({
                data, // Data Viewer
                value: data[0], // Data selected
                result: compareVersions(data[0].name, cons.version), // Version Compare
              });
            } else {
              resolve({
                data: null,
                comparation: null,
              });
            }
          })
          .catch(reject);
      })
      .catch(reject);
  });

export default cons;
