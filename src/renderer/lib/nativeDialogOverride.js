const OVERLAY_ID = '__native_dialog_override__';
const TOAST_CONTAINER_ID = '__toast_container__';

function getOrCreateToastContainer() {
  let container = document.getElementById(TOAST_CONTAINER_ID);
  if (!container) {
    container = document.createElement('div');
    container.id = TOAST_CONTAINER_ID;
    container.style.cssText = 'position:fixed;top:16px;right:16px;z-index:2147483647;display:flex;flex-direction:column;gap:8px;pointer-events:none;';
    document.body.appendChild(container);
  }
  return container;
}

function showToast(message, type = 'info') {
  const container = getOrCreateToastContainer();
  const toast = document.createElement('div');
  const bgColor = type === 'error' ? '#dc2626' : type === 'success' ? '#16a34a' : '#2563eb';
  toast.style.cssText = `pointer-events:auto;max-width:380px;padding:12px 16px;border-radius:12px;background:${bgColor};color:#fff;font-size:14px;font-family:system-ui,-apple-system,sans-serif;box-shadow:0 4px 24px rgba(0,0,0,0.3);opacity:0;transform:translateX(20px);transition:opacity 0.2s,transform 0.2s;`;
  toast.textContent = message;
  container.appendChild(toast);
  requestAnimationFrame(() => {
    toast.style.opacity = '1';
    toast.style.transform = 'translateX(0)';
  });
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(20px)';
    setTimeout(() => toast.remove(), 200);
  }, 4000);
}

function getThemeColors() {
  const style = getComputedStyle(document.documentElement);
  return {
    bg: style.getPropertyValue('--bg-card').trim() || '#1e1e1e',
    border: style.getPropertyValue('--border-on-light').trim() || '#333',
    text: style.getPropertyValue('--text-on-light').trim() || '#f5f5f5',
    muted: style.getPropertyValue('--text-muted').trim() || '#999',
    btnBg: style.getPropertyValue('--color-a').trim() || '#262424',
    btnText: '#f5f5f5',
    dangerBg: '#dc2626',
  };
}

function showDialog(title, message, type = 'alert', inputDefault = '') {
  return new Promise((resolve) => {
    const colors = getThemeColors();

    const overlay = document.createElement('div');
    overlay.id = OVERLAY_ID;
    overlay.style.cssText = 'position:fixed;inset:0;z-index:2147483646;background:rgba(0,0,0,0.55);display:flex;align-items:center;justify-content:center;padding:16px;';

    const dialog = document.createElement('div');
    dialog.style.cssText = `background:${colors.bg};border:1px solid ${colors.border};border-radius:16px;padding:24px;max-width:420px;width:100%;box-shadow:0 8px 48px rgba(0,0,0,0.4);font-family:system-ui,-apple-system,sans-serif;`;

    const titleEl = document.createElement('h3');
    titleEl.style.cssText = `margin:0 0 12px;font-size:18px;font-weight:800;color:${colors.text};`;
    titleEl.textContent = title;
    dialog.appendChild(titleEl);

    const msgEl = document.createElement('p');
    msgEl.style.cssText = `margin:0 0 16px;font-size:14px;color:${colors.muted};white-space:pre-wrap;word-break:break-word;`;
    msgEl.textContent = message;
    dialog.appendChild(msgEl);

    let inputEl = null;
    if (type === 'prompt') {
      inputEl = document.createElement('input');
      inputEl.type = 'text';
      inputEl.value = inputDefault || '';
      inputEl.style.cssText = `width:100%;padding:10px 12px;border-radius:8px;border:1px solid ${colors.border};background:${colors.bg};color:${colors.text};font-size:14px;margin-bottom:16px;outline:none;box-sizing:border-box;`;
      dialog.appendChild(inputEl);
    }

    const btnRow = document.createElement('div');
    btnRow.style.cssText = 'display:flex;gap:8px;justify-content:flex-end;';

    const cleanup = () => {
      overlay.remove();
    };

    if (type === 'confirm' || type === 'prompt') {
      const cancelBtn = document.createElement('button');
      cancelBtn.textContent = 'Cancel';
      cancelBtn.style.cssText = `padding:8px 16px;border-radius:8px;border:1px solid ${colors.border};background:transparent;color:${colors.text};font-size:14px;font-weight:600;cursor:pointer;`;
      cancelBtn.onmouseenter = () => { cancelBtn.style.opacity = '0.8'; };
      cancelBtn.onmouseleave = () => { cancelBtn.style.opacity = '1'; };
      cancelBtn.onclick = () => {
        cleanup();
        resolve(type === 'prompt' ? null : false);
      };
      btnRow.appendChild(cancelBtn);
    }

    const confirmBtn = document.createElement('button');
    confirmBtn.textContent = type === 'confirm' ? 'OK' : type === 'prompt' ? 'Submit' : 'OK';
    confirmBtn.style.cssText = `padding:8px 16px;border-radius:8px;border:none;background:${colors.btnBg};color:${colors.btnText};font-size:14px;font-weight:600;cursor:pointer;`;
    confirmBtn.onmouseenter = () => { confirmBtn.style.opacity = '0.85'; };
    confirmBtn.onmouseleave = () => { confirmBtn.style.opacity = '1'; };
    confirmBtn.onclick = () => {
      const val = type === 'prompt' ? (inputEl?.value ?? null) : type === 'confirm' ? true : undefined;
      cleanup();
      resolve(val);
    };
    btnRow.appendChild(confirmBtn);

    dialog.appendChild(btnRow);
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);

    overlay.onclick = (e) => {
      if (e.target === overlay) {
        if (type === 'confirm' || type === 'prompt') {
          cleanup();
          resolve(type === 'prompt' ? null : false);
        } else {
          cleanup();
          resolve(undefined);
        }
      }
    };

    const handleEsc = (e) => {
      if (e.key === 'Escape') {
        document.removeEventListener('keydown', handleEsc);
        cleanup();
        resolve(type === 'prompt' ? null : type === 'confirm' ? false : undefined);
      }
    };
    document.addEventListener('keydown', handleEsc);

    const focusTarget = type === 'prompt' ? inputEl : confirmBtn;
    requestAnimationFrame(() => {
      if (focusTarget && typeof focusTarget.focus === 'function') {
        focusTarget.focus();
      }
    });
  });
}

export function installNativeDialogOverrides() {
  window.alert = function alertOverride(message) {
    const msg = String(message ?? '');
    console.warn('[native-dialog-override] window.alert intercepted:', msg);
    showToast(msg, 'info');
  };

  window.confirm = function confirmOverride(message) {
    const msg = String(message ?? '');
    console.warn('[native-dialog-override] window.confirm intercepted:', msg);
    showDialog('Confirm', msg, 'confirm').then((result) => {
      window.__lastConfirmResult = result;
    });
    showToast(msg, 'info');
    return true;
  };

  window.prompt = function promptOverride(message, defaultText) {
    const msg = String(message ?? '');
    console.warn('[native-dialog-override] window.prompt intercepted:', msg);
    showDialog('Input', msg, 'prompt', defaultText).then((result) => {
      window.__lastPromptResult = result;
    });
    showToast(msg, 'info');
    return '';
  };
}
