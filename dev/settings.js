"use strict";
const BALANCE_GROUPS = {
  difficulty: "ウェーブ・難易度",
  combat: "スネーク・射撃・回収",
  bomb: "爆弾",
  cutter: "テール・カッター",
  rewards: "得点・永久強化価格",
};
function balanceForm() {
  const values = {};
  for (const [key] of BALANCE_FIELDS) {
    const raw = $("#balance-" + key).value.trim();
    if (raw === "") throw Error("空欄の数値があります。");
    values[key] = Number(raw);
  }
  return validateBalance(values);
}
function fillBalanceForm(values) {
  for (const [key] of BALANCE_FIELDS)
    $("#balance-" + key).value = String(values[key]);
}
function setDebugChips(value) {
  if (!Number.isInteger(value) || value < 0 || value > 1000000)
    throw Error("所持チップは0〜1,000,000の整数で指定してください。");
  meta.chips = value;
  persist();
  hud();
  refreshResultUpgradePrompt();
}
function startDebugWave(n, values) {
  if (!Number.isInteger(n) || n < 1 || n > 10000)
    throw Error("開始ウェーブは1〜10,000の整数で指定してください。");
  saveBalance(values);
  $("#modal").close();
  start();
  wave = n;
  setupWave();
  hud();
}
settingsSections.push({
  content() {
    return (
      '<details class="settings-section" open><summary>数値設定・デバッグ</summary><p>敵や障害物の増加、移動間隔、攻撃、得点と価格を調整できます。移動・射撃の間隔は秒単位で、小さいほど速くなります。</p>' +
      Object.entries(BALANCE_GROUPS)
        .map(
          ([group, label]) =>
            '<details class="balance-group"><summary>' +
            label +
            '</summary><div class="balance-fields">' +
            BALANCE_FIELDS.filter((f) => f[1] === group)
              .map(
                ([key, , name, , min, max, step]) =>
                  '<label for="balance-' +
                  key +
                  '">' +
                  name +
                  '<input type="number" id="balance-' +
                  key +
                  '" value="' +
                  balance[key] +
                  '" min="' +
                  min +
                  '" max="' +
                  max +
                  '" step="' +
                  step +
                  '" required></label>',
              )
              .join("") +
            "</div></details>",
        )
        .join("") +
      '<div class="settings-actions"><button id="saveBalance">数値を保存</button><button id="defaultBalance">標準値を入力</button><button id="exportBalance">JSONを書き出す</button><label class="file-button">JSONを読み込む<input type="file" id="importBalance" accept=".json,application/json"></label></div><p>JSONの読み込みと標準値の入力は編集欄だけを変更します。「数値を保存」で確定してください。書き出しは編集欄の値を出力します。</p><div class="debug-controls"><label>開始ウェーブ<input id="debugWave" type="number" min="1" max="10000" step="1" value="' +
      wave +
      '"></label><button id="debugStart">編集値でテストラン開始</button><label>所持チップ<input id="debugChips" type="number" min="0" max="1000000" step="1" value="' +
      meta.chips +
      '"></label><button id="debugSetChips">所持チップを設定</button></div><p>テストラン開始は現在のランを置き換えます。所持チップの設定は即時保存します。</p></details>'
    );
  },
  bind(guarded) {
    $("#saveBalance").onclick = guarded(() => {
      saveBalance(balanceForm());
      settingsStatus("保存しました。次のランから数値を適用します。");
    });
    $("#defaultBalance").onclick = () => {
      fillBalanceForm(DEFAULT_BALANCE);
      settingsStatus("標準値を入力しました。保存すると確定します。");
    };
    $("#debugSetChips").onclick = guarded(() => {
      const raw = $("#debugChips").value.trim();
      if (!raw) throw Error("所持チップを入力してください。");
      setDebugChips(Number(raw));
      settingsStatus("所持チップを設定しました。");
    });
    $("#debugStart").onclick = guarded(() =>
      startDebugWave(Number($("#debugWave").value), balanceForm()),
    );
    $("#exportBalance").onclick = guarded(() => {
      const data = balanceJSON(balanceForm()),
        url = URL.createObjectURL(
          new Blob([data], { type: "application/json" }),
        ),
        a = document.createElement("a");
      a.href = url;
      a.download = "neo-snake-balance.json";
      document.body.append(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      settingsStatus("編集欄の数値をJSONに書き出しました。");
    });
    $("#importBalance").onchange = async (e) => {
      const file = e.target.files[0],
        status = $("#settingsStatus");
      if (!file) return;
      try {
        if (file.size > 100000) throw Error("JSONは100KB以下にしてください。");
        const values = parseBalanceJSON(await file.text());
        if (
          !$("#modal").open ||
          document.querySelector("#settingsStatus") !== status
        )
          return;
        fillBalanceForm(values);
        settingsStatus("JSONを読み込みました。保存すると確定します。");
      } catch (error) {
        if (document.querySelector("#settingsStatus") === status)
          settingsStatus(error.message, true);
      } finally {
        e.target.value = "";
      }
    };
  },
});

$("#debugEffects").onclick = () => {
  window.location.href = "effects.html";
};
