import Phaser from 'phaser';
import { Backdrop } from './backdrop';
import { h, mountPanel } from '../ui/dom';
import { GameState } from '../game/GameState';

export class AccusationScene extends Phaser.Scene {
  constructor() {
    super('Accusation');
  }

  create(): void {
    new Backdrop(this, { spotY: 0.22 });
    const c = GameState.case;
    let selected: string | null = null;

    const confirm = h('button', { class: 'btn danger block', style: { marginTop: '8px' } }, [
      '正式指认凶手',
    ]) as HTMLButtonElement;
    confirm.disabled = true;

    const cards = c.suspects.map((s) => {
      const card = h('div', { class: 'suspect-card' }, [
        h('div', { class: 'avatar', style: { background: s.color } }, [s.initial]),
        h('div', { class: 'name' }, [s.name]),
        h('div', { class: 'role' }, [s.role]),
      ]);
      card.onclick = () => {
        selected = s.id;
        for (const cc of cards) cc.classList.remove('selected');
        card.classList.add('selected');
        confirm.disabled = false;
      };
      return card;
    });

    confirm.onclick = () => {
      if (!selected) return;
      const verdict = GameState.accuse(selected);
      this.scene.start('Verdict', { verdict });
    };

    const back = h('button', { class: 'btn ghost small' }, ['← 继续审讯']);
    back.onclick = () => this.scene.start('Interrogation');

    const got = GameState.brokenCount;
    const req = c.requiredBreaks;
    const notice =
      got < req
        ? h('div', { class: 'notice warn' }, [
            `你目前只击破了 ${got} 条谎言，而定罪需要至少 ${req} 条铁证。证据不足时贸然指认，即使猜对了人，真凶也可能因证据不足而逍遥法外。`,
          ])
        : h('div', { class: 'notice' }, [
            `你已掌握 ${got} 条铁证，证据链充分——现在指认，足以定罪。`,
          ]);

    const panel = h('div', { class: 'scene-panel' }, [
      h('div', { class: 'stack', style: { alignItems: 'center', textAlign: 'center' } }, [
        h('p', { class: 'eyebrow' }, ['THE ACCUSATION']),
        h('h1', { class: 'title', style: { fontSize: 'clamp(26px,5vw,40px)' } }, ['谁是凶手？']),
        h('p', { class: 'sub', style: { maxWidth: '520px' } }, [
          '审讯结束。指认前请想清楚——你是否已经用证据，把真凶的谎言一条条钉死。',
        ]),
        notice,
        h('div', { class: 'roster', style: { width: '100%', marginTop: '4px' } }, cards),
        confirm,
        back,
      ]),
    ]);
    mountPanel(this, panel);
  }
}
