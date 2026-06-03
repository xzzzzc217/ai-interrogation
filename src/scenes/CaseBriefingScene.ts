import Phaser from 'phaser';
import { Backdrop } from './backdrop';
import { h, mountPanel } from '../ui/dom';
import { GameState } from '../game/GameState';
import type { Suspect } from '../data/types';

export class CaseBriefingScene extends Phaser.Scene {
  constructor() {
    super('Briefing');
  }

  create(): void {
    new Backdrop(this, { spotY: 0.16 });
    const c = GameState.case;

    const clues = h(
      'div',
      { class: 'stack' },
      c.clues.map((cl) =>
        h('div', { class: 'clue' }, [
          h('div', { class: 'dot' }),
          h('div', {}, [
            h('div', { class: 'name' }, [cl.name]),
            h('div', { class: 'detail' }, [cl.detail]),
          ]),
        ]),
      ),
    );

    const evidence = h(
      'div',
      { class: 'evidence-grid' },
      c.evidence.map((e) =>
        h('div', { class: 'evidence-item', style: { cursor: 'default' } }, [
          h('div', { class: 'ico' }, [e.icon]),
          h('div', { class: 'meta' }, [
            h('div', { class: 'nm' }, [e.name]),
            h('div', { class: 'dt' }, [e.detail]),
          ]),
        ]),
      ),
    );

    const roster = h(
      'div',
      { class: 'roster' },
      c.suspects.map((s) => suspectCard(s)),
    );

    const back = h('button', { class: 'btn ghost small' }, ['← 返回']);
    back.onclick = () => this.scene.start('MainMenu');

    const startBtn = h('button', { class: 'btn primary block', style: { marginTop: '6px' } }, [
      '进入审讯室  →',
    ]);
    startBtn.onclick = () => this.scene.start('Interrogation');

    const panel = h('div', { class: 'scene-panel top' }, [
      h('div', { class: 'stack' }, [
        h('div', { class: 'row spread' }, [h('p', { class: 'eyebrow' }, ['CASE FILE · 01']), back]),
        h('h1', { class: 'title', style: { fontSize: 'clamp(26px,5vw,42px)' } }, [c.title]),
        h('p', { class: 'lead' }, [c.synopsis]),
        h('div', { class: 'card' }, [
          h('h2', { class: 'heading' }, ['案情简报']),
          h('p', { class: 'sub', style: { whiteSpace: 'pre-wrap' } }, [c.briefing]),
        ]),
        h('h2', { class: 'heading' }, ['🔎 现场线索']),
        clues,
        h('h2', { class: 'heading' }, ['🗂 你的证物 · 审讯中可出示']),
        evidence,
        h('h2', { class: 'heading' }, ['🕵 嫌疑人']),
        roster,
        startBtn,
      ]),
    ]);
    mountPanel(this, panel);
  }
}

function suspectCard(s: Suspect): HTMLElement {
  return h('div', { class: 'suspect-card', style: { cursor: 'default' } }, [
    h('div', { class: 'avatar', style: { background: s.color } }, [s.initial]),
    h('div', { class: 'name' }, [s.name]),
    h('div', { class: 'role' }, [s.role]),
    h(
      'div',
      {
        style: {
          marginTop: '8px',
          fontSize: '12.5px',
          color: 'var(--faint)',
          lineHeight: '1.5',
        },
      },
      [s.publicInfo],
    ),
  ]);
}
