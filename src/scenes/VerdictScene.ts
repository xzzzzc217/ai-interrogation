import Phaser from 'phaser';
import { Backdrop } from './backdrop';
import { h, mountPanel } from '../ui/dom';
import { GameState, type Verdict } from '../game/GameState';
import { yachtCase } from '../data/cases/yacht';

export class VerdictScene extends Phaser.Scene {
  private verdict?: Verdict;

  constructor() {
    super('Verdict');
  }

  init(data: { verdict?: Verdict }): void {
    this.verdict = data?.verdict;
  }

  create(): void {
    const v = this.verdict;
    if (!v) {
      this.scene.start('MainMenu');
      return;
    }
    const c = GameState.case;
    const won = v.outcome === 'convicted';
    new Backdrop(this, { spotlight: won, spotY: 0.24 });

    if (won) this.confetti();
    else this.cameras.main.flash(420, 120, 18, 22);

    const culprit = GameState.suspect(c.culpritId);
    const accused = GameState.suspect(v.accusedId);

    let badge: string;
    let sub: string;
    if (v.outcome === 'convicted') {
      badge = '结案 · 真凶落网';
      sub = `你用 ${v.brokenCount} 条铁证，把 ${culprit.name} 的谎言逐一钉死，真相大白。`;
    } else if (v.outcome === 'insufficient') {
      badge = '证据不足 · 真凶脱罪';
      sub = `你指认的 ${culprit.name} 的确是真凶——但你只击破了 ${v.brokenCount} 条谎言，不足以定罪 ${v.required} 条铁证的门槛，他最终逍遥法外。`;
    } else {
      badge = '误判 · 冤枉好人';
      sub = `你指认了 ${accused.name}，但真凶另有其人。一个无辜的人差点替罪。`;
    }

    // recap each authored lie and whether the player broke it
    const recap = h(
      'div',
      { class: 'recap' },
      c.lieBreaks.map((lb) => {
        const broke = GameState.brokenLies.has(lb.lieId);
        return h('div', { class: 'line' }, [
          h('span', { class: 'mk', style: { color: broke ? 'var(--green)' : 'var(--red)' } }, [
            broke ? '✔' : '✘',
          ]),
          h('span', { style: { color: broke ? 'var(--text)' : 'var(--muted)' } }, [
            broke ? lb.reveal : '这条谎言你没有戳穿。',
          ]),
        ]);
      }),
    );

    const replay = h('button', { class: 'btn primary' }, ['🔁 重玩本案']);
    replay.onclick = () => {
      GameState.startCase(yachtCase);
      this.scene.start('Briefing');
    };
    const menu = h('button', { class: 'btn ghost' }, ['返回主菜单']);
    menu.onclick = () => this.scene.start('MainMenu');

    const panel = h('div', { class: 'scene-panel' }, [
      h('div', { class: 'stack', style: { alignItems: 'center', textAlign: 'center' } }, [
        h('p', { class: 'eyebrow' }, ['VERDICT']),
        h('h1', { class: `verdict-badge ${won ? 'win' : 'lose'}` }, [badge]),
        h('p', { class: 'lead', style: { maxWidth: '560px' } }, [sub]),
        h('div', { class: 'card', style: { width: '100%', textAlign: 'left' } }, [
          h('h2', { class: 'heading' }, ['真凶']),
          h('p', { class: 'lead', style: { marginBottom: '6px' } }, [
            `${culprit.name}　·　${culprit.role}`,
          ]),
          h('p', { class: 'sub', style: { whiteSpace: 'pre-wrap', marginBottom: '14px' } }, [
            c.solution,
          ]),
          h('hr', { class: 'divider' }),
          h('h2', { class: 'heading', style: { marginTop: '10px' } }, ['你的证据链']),
          recap,
        ]),
        h('div', { class: 'row center', style: { marginTop: '6px' } }, [replay, menu]),
      ]),
    ]);
    mountPanel(this, panel);
  }

  private confetti(): void {
    const colors = [0xe8b04b, 0x46b780, 0x4c8dff, 0xe5484d, 0xffffff];
    const w = this.scale.width;
    const hgt = this.scale.height;
    for (let i = 0; i < 90; i++) {
      const x = Phaser.Math.Between(0, w);
      const r = this.add
        .rectangle(
          x,
          -20,
          Phaser.Math.Between(5, 10),
          Phaser.Math.Between(8, 14),
          Phaser.Utils.Array.GetRandom(colors),
        )
        .setDepth(5)
        .setAngle(Phaser.Math.Between(0, 360));
      this.tweens.add({
        targets: r,
        y: hgt + 40,
        x: x + Phaser.Math.Between(-90, 90),
        angle: r.angle + Phaser.Math.Between(180, 540),
        duration: Phaser.Math.Between(2400, 4400),
        delay: Phaser.Math.Between(0, 1200),
        ease: 'Quad.easeIn',
        onComplete: () => r.destroy(),
      });
      this.tweens.add({
        targets: r,
        alpha: 0,
        duration: 700,
        delay: Phaser.Math.Between(2400, 3800),
      });
    }
  }
}
