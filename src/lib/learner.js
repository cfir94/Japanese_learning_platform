import { currentUser } from './auth.js';

function key() { return `kotoba-learner:${currentUser()?.id || 'guest'}`; }
export function learner() {
  try { return localStorage.getItem(key()) === 'masami' ? 'masami' : 'kfir'; }
  catch { return 'kfir'; }
}
export function selectLearner(value, notify = true) {
  if (!['kfir', 'masami'].includes(value)) return;
  try { localStorage.setItem(key(), value); } catch { /* The current view still changes. */ }
  if (notify) dispatchEvent(new CustomEvent('kotoba-learner', { detail: value }));
}
