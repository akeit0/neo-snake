'use strict';

// キーボード・スワイプ・ボタンの接続

function handleKeyDown(e) {
  if ($('#modal').open) return;
  const key = e.key.toLowerCase();
  if (
    [
      'arrowup',
      'arrowdown',
      'arrowleft',
      'arrowright',
      ' ',
      'w',
      'a',
      's',
      'd',
      'p',
    ].includes(key)
  )
    e.preventDefault();
  if (
    (state === 'ready' || state === 'over') &&
    (key === 'enter' || key === ' ')
  ) {
    start();
    return;
  }
  const dirs = {
    w: [0, -1],
    arrowup: [0, -1],
    s: [0, 1],
    arrowdown: [0, 1],
    a: [-1, 0],
    arrowleft: [-1, 0],
    d: [1, 0],
    arrowright: [1, 0],
  };
  if (dirs[key]) direction(...dirs[key]);
  if (key === 'p' && !e.repeat) pause();
}

function bindSwipe(surface) {
  // Safari can still synthesize double-tap zoom on the game surfaces.
  // Cancel touch release even outside active play; these surfaces have no
  // click actions, and pointer events continue to handle swipe movement.
  surface.addEventListener('touchend', (e) => {
    if (e.cancelable) e.preventDefault();
  }, { passive: false });
  let touch = null;
  surface.addEventListener('pointerdown', (e) => {
    if (
      state !== 'playing' ||
      $('#modal').open ||
      (e.pointerType === 'mouse' && e.button !== 0) ||
      touch
    )
      return;
    e.preventDefault();
    touch = { id: e.pointerId, x: e.clientX, y: e.clientY };
    surface.setPointerCapture(e.pointerId);
    surface.classList.add('swiping');
  });
  surface.addEventListener('pointermove', (e) => {
    if (!touch || touch.id !== e.pointerId) return;
    if (state !== 'playing' || $('#modal').open) {
      touch = null;
      surface.classList.remove('swiping');
      return;
    }
    e.preventDefault();
    const dx = e.clientX - touch.x,
      dy = e.clientY - touch.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) > 18) {
      Math.abs(dx) > Math.abs(dy)
        ? direction(Math.sign(dx), 0)
        : direction(0, Math.sign(dy));
      touch.x = e.clientX;
      touch.y = e.clientY;
    }
  });
  const end = (e) => {
    if (touch && touch.id === e.pointerId) {
      touch = null;
      surface.classList.remove('swiping');
    }
  };
  surface.addEventListener('pointerup', end);
  surface.addEventListener('pointercancel', end);
  surface.addEventListener('lostpointercapture', end);
}

function bindControls() {
  $('#buildToggle').onclick = () =>
    showModal(
      '<span class="mini-label">YOUR BUILD</span><h2>このランの進化</h2>' +
        sourceHTML($('#build')) +
        '<p>BEST ' +
        String(meta.best).padStart(6, '0') +
        ' / ◆ ' +
        meta.chips +
        '</p>',
    );
  $('#lab').onclick = openLab;
  $('#help').onclick = openHelp;
  $('#modal .close').onclick = () => $('#modal').close();
  $('#modal').onclick = (e) => {
    if (e.target === $('#modal')) $('#modal').close();
  };
  $('#pause').onclick = pause;
  $('#sound').onclick = () => {
    setSoundEnabled(!sound);
    $('#sound').textContent = '音 ' + (sound ? 'ON' : 'OFF');
    $('#sound').setAttribute('aria-pressed', String(sound));
    beep(500);
    syncMusic();
  };
  $('#effects').textContent = 'FX ' + (fx ? 'ON' : 'OFF');
  $('#effects').onclick = () => {
    fx = !fx;
    $('#effects').textContent = 'FX ' + (fx ? 'ON' : 'OFF');
    document.body.style.setProperty('--fx', fx ? 1 : 0);
    if (!fx) {
      particles = [];
      rings = [];
      notice = null;
      $('#toast').classList.remove('show');
    }
  };
  window.addEventListener('keydown', handleKeyDown);
  bindSwipe(canvas);
  bindSwipe($('#swipeControls'));
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && state === 'playing') pause();
    syncMusic();
  });
}
