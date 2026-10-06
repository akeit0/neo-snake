"use strict";
// Optional screen sections are registered only by the development entry point.
const settingsSections = [];
function settingsStatus(message, error = false) {
  const el = $("#settingsStatus");
  el.textContent = message;
  el.classList.toggle("error", error);
}
function permanentBackup() {
  try {
    const v = JSON.parse(
      localStorage.getItem("snake-overdrive-upgrade-backup-v1"),
    );
    if (v)
      for (const key of ["echo", "cutter"])
        if (!Object.hasOwn(v, key)) v[key] = 0;
    return v &&
      permanentUpgrades.every(
        (u) => Number.isInteger(v[u.id]) && v[u.id] >= 0 && v[u.id] <= u.max,
      )
      ? v
      : null;
  } catch {
    return null;
  }
}
function resetPermanent() {
  if (permanentUpgrades.every((u) => meta[u.id] === 0)) return false;
  const previous = Object.fromEntries(
    permanentUpgrades.map((u) => [u.id, meta[u.id]]),
  );
  localStorage.setItem(
    "snake-overdrive-upgrade-backup-v1",
    JSON.stringify(previous),
  );
  for (const u of permanentUpgrades) meta[u.id] = 0;
  persist();
  hud();
  refreshResultUpgradePrompt();
  return previous;
}
function restorePermanent() {
  const previous = permanentBackup();
  if (!previous) return false;
  for (const u of permanentUpgrades) meta[u.id] = previous[u.id];
  persist();
  hud();
  refreshResultUpgradePrompt();
  localStorage.removeItem("snake-overdrive-upgrade-backup-v1");
  return true;
}
function refreshPermanentLevels() {
  $("#permanentLevels").textContent = permanentUpgrades
    .map((u) => u.name + " LV." + meta[u.id] + " / " + u.max)
    .join(" · ");
}
function audioSettingsContent() {
  return (
    '<section class="settings-section"><h3>音量</h3>' +
    [
      ["bgmVolume", "BGM"],
      ["sfxVolume", "SFX"],
    ]
      .map(
        ([key, label]) =>
          '<label class="volume-control" for="' +
          key +
          '"><span>' +
          label +
          "</span>" +
          '<input id="' +
          key +
          '" type="range" min="0" max="100" step="1" value="' +
          Math.round(meta[key] * 100) +
          '">' +
          '<output id="' +
          key +
          'Value" for="' +
          key +
          '">' +
          Math.round(meta[key] * 100) +
          "%</output></label>",
      )
      .join("") +
    "<p>音量はすぐに反映・保存されます。再生のON/OFFは盤面上部の「音」で切り替えます。</p>" +
    '<label class="tempo-toggle"><input id="bgmSync" type="checkbox" ' +
    (meta.bgmSync ? "checked" : "") +
    "> BGMを移動テンポに同期</label>" +
    '<p class="music-tempo"><output id="musicTempoValue">' +
    musicTempo().toFixed(1) +
    " BPM</output></p>" +
    "<p>ONでは移動2回で1拍。Waveで移動が速くなるとBGMも速くなります。OFFでは128 BPM。音の高さは変わりません。</p></section>"
  );
}
function openSettings() {
  showModal(
    '<span class="mini-label">SETTINGS</span><h2>設定</h2>' +
      audioSettingsContent() +
      '<section class="settings-section"><h3>表示</h3><label><input type="checkbox" id="echoEnabled" ' +
      (meta.echoEnabled ? "checked" : "") +
      '> ラップ・エコーを表示</label><p>購入済みのランでは、反対側の端にあるものの色をワープ入口に表示します。ON/OFFは即時反映し、保存します。</p></section><section class="settings-section"><h3>永久強化</h3><p id="permanentLevels">' +
      permanentUpgrades
        .map((u) => u.name + " LV." + meta[u.id] + " / " + u.max)
        .join(" · ") +
      '</p><p>購入済みのレベルだけを0に戻します。チップ・最高得点は保持し、返金はありません。現在のランへの影響はありません。</p><div class="settings-actions"><button id="resetPermanent" ' +
      (permanentUpgrades.every((u) => meta[u.id] === 0) ? "disabled" : "") +
      '>永久強化をリセット</button><button id="undoPermanent" ' +
      (permanentBackup() ? "" : "disabled") +
      ">直前のリセットを戻す</button></div></section>" +
      settingsSections.map((section) => section.content()).join("") +
      '<p id="settingsStatus" role="status" aria-live="polite"></p>',
  );
  $("#modal").classList.add("settings-modal");
  for (const key of Object.keys(DEFAULT_AUDIO_LEVELS)) {
    $("#" + key).oninput = (event) => {
      setAudioVolume(key, Number(event.target.value) / 100);
      $("#" + key + "Value").textContent = Math.round(meta[key] * 100) + "%";
    };
  }
  $("#bgmSync").onchange = (event) => {
    setMusicSync(event.target.checked);
    $("#musicTempoValue").textContent = musicTempo().toFixed(1) + " BPM";
  };
  $("#echoEnabled").onchange = (e) => {
    meta.echoEnabled = e.target.checked;
    persist();
    settingsStatus(
      "ラップ・エコーの表示を" +
        (meta.echoEnabled ? "ON" : "OFF") +
        "にしました。",
    );
  };
  const guarded = (action) => () => {
    try {
      action();
    } catch (e) {
      settingsStatus(e.message, true);
    }
  };
  $("#resetPermanent").onclick = guarded(() => {
    if (!resetPermanent()) return;
    refreshPermanentLevels();
    $("#resetPermanent").disabled = true;
    $("#undoPermanent").disabled = false;
    settingsStatus("永久強化をリセットしました。次のランから適用します。");
  });
  $("#undoPermanent").onclick = guarded(() => {
    if (restorePermanent()) {
      refreshPermanentLevels();
      $("#undoPermanent").disabled = true;
      $("#resetPermanent").disabled = permanentUpgrades.every(
        (u) => meta[u.id] === 0,
      );
      settingsStatus("永久強化を元に戻しました。");
    }
  });
  for (const section of settingsSections) section.bind(guarded);
}
$("#settings").onclick = openSettings;
