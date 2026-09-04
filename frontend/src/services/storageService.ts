import type { CurrentUser } from '../types/session';

const KEY_SESSION_ID = 'galaxy_together_session_id';
const KEY_INVITE_CODE = 'galaxy_together_invite_code';
const KEY_CURRENT_USER = 'galaxy_together_current_user';

export const storageService = {
  getSessionId(): string | null {
    return localStorage.getItem(KEY_SESSION_ID);
  },
  setSessionId(id: string) {
    localStorage.setItem(KEY_SESSION_ID, id);
  },
  removeSessionId() {
    localStorage.removeItem(KEY_SESSION_ID);
  },

  getInviteCode(): string | null {
    return localStorage.getItem(KEY_INVITE_CODE);
  },
  setInviteCode(code: string) {
    localStorage.setItem(KEY_INVITE_CODE, code);
  },
  removeInviteCode() {
    localStorage.removeItem(KEY_INVITE_CODE);
  },

  getCurrentUser(): CurrentUser | null {
    const raw = localStorage.getItem(KEY_CURRENT_USER);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as CurrentUser;
    } catch {
      return null;
    }
  },
  setCurrentUser(user: CurrentUser) {
    localStorage.setItem(KEY_CURRENT_USER, JSON.stringify(user));
  },
  removeCurrentUser() {
    localStorage.removeItem(KEY_CURRENT_USER);
  },

  clearAll() {
    localStorage.removeItem(KEY_SESSION_ID);
    localStorage.removeItem(KEY_INVITE_CODE);
    localStorage.removeItem(KEY_CURRENT_USER);
  },
};
