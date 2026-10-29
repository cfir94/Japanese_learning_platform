import { quickAuth, friendlyError } from '../lib/auth.js';
import { openingPair } from '../lib/photos.js';

export function render(root, { onDone }) {
  root.innerHTML = `
    <section class="login card">
      ${openingPair()}
      <p class="eyebrow">ことば — הדרך ליפנית</p>
      <h1 class="title">כניסה</h1>
      <p class="lead">אותה כניסה כמו באתר מורי הדרך: שם ומייל, בלי סיסמה. המעקב נשמר בחשבון ומסונכרן בין מכשירים.</p>
      <form id="login-form">
        <label class="field"><span>שם</span><input name="name" autocomplete="name" required></label>
        <label class="field"><span>מייל</span><input name="email" type="email" autocomplete="email" dir="ltr" required></label>
        <p class="error" id="login-error" hidden></p>
        <div class="actions"><button class="btn primary" type="submit">כניסה</button></div>
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
      error.textContent = friendlyError(e);
      error.hidden = false;
      button.disabled = false;
    }
  });
}
