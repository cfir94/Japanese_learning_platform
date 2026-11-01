import { quickAuth, friendlyError } from '../lib/auth.js';
import { bi, jp } from '../lib/ui.js';
import { openingPair } from '../lib/photos.js';
import { learner } from '../lib/learner.js';

export function render(root, { onDone }) {
  const en = learner() === 'masami';
  root.innerHTML = `
    <section class="login card">
      ${openingPair()}
      <p class="eyebrow">ことば — ${en ? 'English together' : 'הדרך ליפנית'}</p>
      <h1 class="title">${bi('login', { stack: true })}</h1>
      <p class="lead">${en ? `Use your name and email to save your own learning record. <span lang="ja">${jp('名前とメールアドレスで、自分の学習記録を保存できます。')}</span>` : 'אותה כניסה כמו באתר מורי הדרך: שם ומייל, בלי סיסמה. המעקב נשמר בחשבון ומסונכרן בין מכשירים.'}</p>
      <form id="login-form">
        <label class="field"><span>${bi('name')}</span><input name="name" autocomplete="name" required></label>
        <label class="field"><span>${bi('email')}</span><input name="email" type="email" autocomplete="email" dir="ltr" required></label>
        <p class="error" id="login-error" hidden></p>
        <div class="actions"><button class="btn primary" type="submit">${bi('login')}</button></div>
      </form>
    </section>`;
  const form = root.querySelector('#login-form');
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const button = form.querySelector('button');
    const error = root.querySelector('#login-error');
    button.disabled = true;
    error.hidden = true;
    try {
      await quickAuth(form.email.value, form.name.value.trim());
      onDone();
    } catch (e) {
      if (en) error.innerHTML = `Could not sign in. Please check your email and connection. <span lang="ja">${jp('ログインできません。メールアドレスと接続を確認してください。')}</span>`;
      else error.textContent = friendlyError(e);
      error.hidden = false;
      button.disabled = false;
    }
  });
}

