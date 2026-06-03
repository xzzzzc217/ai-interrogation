import Phaser from 'phaser';
import { Backdrop } from './backdrop';
import { h, mountPanel } from '../ui/dom';
import { openSettings } from '../ui/SettingsPanel';
import { GameState } from '../game/GameState';
import { yachtCase } from '../data/cases/yacht';
import { loadConfig } from '../config/Settings';
import { REPO_URL } from '../config/links';

export class MainMenuScene extends Phaser.Scene {
  constructor() {
    super('MainMenu');
  }

  create(): void {
    new Backdrop(this, { spotlight: true, spotY: 0.27 });

    const modeLabel = () => (loadConfig().mode === 'live' ? '⚡ 实时 AI' : '🧩 离线试玩');
    const modeChip = h('span', { class: 'tag amber' }, [modeLabel()]);

    const start = h('button', { class: 'btn primary', style: { minWidth: '210px' } }, ['开始办案']);
    start.onclick = () => {
      GameState.startCase(yachtCase);
      this.scene.start('Briefing');
    };

    const settingsBtn = h('button', { class: 'btn' }, ['设置 / API Key']);
    settingsBtn.onclick = () =>
      openSettings(() => {
        modeChip.textContent = modeLabel();
      });

    const about = h(
      'a',
      { class: 'btn ghost', href: REPO_URL, target: '_blank', rel: 'noreferrer' },
      ['GitHub 源码'],
    );

    const panel = h('div', { class: 'scene-panel' }, [
      h('div', { class: 'stack', style: { alignItems: 'center', textAlign: 'center' } }, [
        h('p', { class: 'eyebrow' }, ['AN AI-NATIVE DETECTIVE GAME']),
        h('h1', { class: 'title' }, ['盘　问']),
        h('p', { class: 'sub', style: { maxWidth: '540px' } }, [
          '审讯由大模型实时驱动的嫌疑人，从对话中找出破绽，再用现场证据当面击破谎言，揪出真凶。',
        ]),
        h('div', { class: 'row center', style: { marginTop: '12px' } }, [start]),
        h('div', { class: 'row center' }, [settingsBtn, about]),
        h('div', { class: 'row center', style: { marginTop: '4px' } }, [modeChip]),
      ]),
    ]);
    mountPanel(this, panel);

    mountPanel(
      this,
      h('div', { class: 'foot' }, [
        'BYOK · 纯前端 · MIT 开源　|　',
        h('a', { href: REPO_URL, target: '_blank', rel: 'noreferrer' }, [
          'github.com/xzzzzc217/ai-interrogation',
        ]),
      ]),
    );
  }
}
