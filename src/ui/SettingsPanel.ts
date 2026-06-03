import { h, openModal } from './dom';
import { loadConfig, saveConfig, PROVIDER_PRESETS, type PlayerConfig } from '../config/Settings';

/**
 * Settings modal: choose offline vs live, and (for live) enter an
 * OpenAI-compatible base URL / key / model. The key is written only to
 * localStorage via saveConfig — it never touches the repo or any server other
 * than the endpoint the player picks.
 */
export function openSettings(onSaved?: () => void): void {
  const cfg: PlayerConfig = loadConfig();

  const baseUrl = h('input', {
    type: 'text',
    value: cfg.baseUrl,
    placeholder: 'https://api.openai.com/v1',
  });
  const apiKey = h('input', {
    type: 'password',
    value: cfg.apiKey,
    placeholder: 'sk-…（只保存在你的浏览器本地）',
    autocomplete: 'off',
  });
  const model = h('input', { type: 'text', value: cfg.model, placeholder: 'gpt-4o-mini' });

  const presets = h(
    'div',
    { class: 'row', style: { marginTop: '2px' } },
    PROVIDER_PRESETS.map((p) =>
      h(
        'button',
        {
          class: 'tag clickable',
          onclick: () => {
            baseUrl.value = p.baseUrl;
            model.value = p.model;
          },
        },
        [p.label],
      ),
    ),
  );

  const liveFields = h('div', {}, [
    h('div', { class: 'notice warn' }, [
      '自带 Key（BYOK）：游戏在你的浏览器里直接调用该接口，Key 只存本地、不上传任何服务器。建议用便宜的小模型（如 gpt-4o-mini / deepseek-chat）。',
    ]),
    h('div', { class: 'field', style: { marginTop: '12px' } }, [
      h('label', {}, ['快捷预设']),
      presets,
    ]),
    h('div', { class: 'field' }, [
      h('label', {}, ['Base URL']),
      baseUrl,
      h('div', { class: 'help' }, ['任意 OpenAI 兼容接口，结尾通常是 /v1']),
    ]),
    h('div', { class: 'field' }, [h('label', {}, ['API Key']), apiKey]),
    h('div', { class: 'field' }, [
      h('label', {}, ['模型名']),
      model,
      h('div', { class: 'help' }, ['例如 gpt-4o-mini、deepseek-chat、moonshot-v1-8k']),
    ]),
  ]);

  const modeOffline = h('button', { class: 'btn small' }, ['🧩 离线试玩']);
  const modeLive = h('button', { class: 'btn small' }, ['⚡ 实时 AI']);
  const paintMode = () => {
    modeOffline.className = 'btn small' + (cfg.mode === 'offline' ? ' primary' : '');
    modeLive.className = 'btn small' + (cfg.mode === 'live' ? ' primary' : '');
    liveFields.style.display = cfg.mode === 'live' ? 'block' : 'none';
  };
  modeOffline.onclick = () => {
    cfg.mode = 'offline';
    paintMode();
  };
  modeLive.onclick = () => {
    cfg.mode = 'live';
    paintMode();
  };

  const save = h('button', { class: 'btn primary block', style: { marginTop: '8px' } }, [
    '保存设置',
  ]);

  const modal = h('div', { class: 'card modal' }, [
    h('p', { class: 'eyebrow' }, ['SETTINGS']),
    h('h2', { class: 'heading' }, ['对局设置']),
    h('p', { class: 'sub', style: { marginBottom: '14px' } }, [
      '离线试玩用内置剧本，无需任何 Key 即可完整破案；实时 AI 让嫌疑人由真实大模型驱动，对话更自由、更耐玩。',
    ]),
    h('div', { class: 'row', style: { marginBottom: '14px' } }, [
      h('span', { class: 'muted', style: { fontSize: '13px', marginRight: '4px' } }, ['模式']),
      modeOffline,
      modeLive,
    ]),
    liveFields,
    save,
  ]);

  const close = openModal(modal);
  save.onclick = () => {
    cfg.baseUrl = baseUrl.value.trim();
    cfg.apiKey = apiKey.value.trim();
    cfg.model = model.value.trim();
    saveConfig(cfg);
    close();
    onSaved?.();
  };
  paintMode();
}
