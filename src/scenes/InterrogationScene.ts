import Phaser from 'phaser';
import { Backdrop } from './backdrop';
import { h, mountPanel, openModal, toast } from '../ui/dom';
import { openSettings } from '../ui/SettingsPanel';
import { GameState } from '../game/GameState';
import type { Evidence } from '../data/types';

/**
 * The heart of the game. Phaser renders the animated suspect portrait and the
 * cinematic "objection" juice; a DOM HUD carries the chat, the evidence
 * presenter and the suspect tabs. Conversation comes from the live LLM (or the
 * offline script); whether a lie actually breaks is decided by authored data in
 * GameState, never by the model.
 */
export class InterrogationScene extends Phaser.Scene {
  private portrait?: Phaser.GameObjects.Container;
  private portraitInner?: Phaser.GameObjects.Container;

  private layer!: HTMLElement;
  private chatLog!: HTMLElement;
  private textarea!: HTMLTextAreaElement;
  private sendBtn!: HTMLButtonElement;
  private presentBtn!: HTMLButtonElement;
  private pips!: HTMLElement;
  private tabs!: HTMLElement;
  private whoName!: HTMLElement;
  private whoRole!: HTMLElement;

  private busy = false;

  constructor() {
    super('Interrogation');
  }

  create(): void {
    // Pick up any settings changes the player made before entering.
    GameState.refreshService();

    new Backdrop(this, { spotlight: true, spotY: 0.3 });
    this.buildPortrait();

    this.scale.on(Phaser.Scale.Events.RESIZE, this.layoutPortrait, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off(Phaser.Scale.Events.RESIZE, this.layoutPortrait, this);
    });

    this.buildHud();
    this.seedGreeting();
    this.renderChat();
    this.updatePips();
  }

  // ————————————————————————————————————————— Phaser portrait
  private buildPortrait(): void {
    if (this.portraitInner) this.tweens.killTweensOf(this.portraitInner);
    this.portrait?.destroy();

    const s = GameState.current;
    const color = Phaser.Display.Color.HexStringToColor(s.color).color;
    const outer = this.add.container(0, 0).setDepth(0);
    const inner = this.add.container(0, 0);

    const halo = this.add
      .image(0, 0, 'glow')
      .setBlendMode(Phaser.BlendModes.ADD)
      .setTint(color)
      .setDisplaySize(320, 320)
      .setAlpha(0.5);
    const ring = this.add.circle(0, 0, 70).setStrokeStyle(2, 0xffffff, 0.18);
    const disc = this.add.circle(0, 0, 64, color);
    const initial = this.add
      .text(0, 2, s.initial, {
        fontFamily: 'Georgia, "Songti SC", "SimSun", serif',
        fontSize: '58px',
        color: '#0c0f16',
      })
      .setOrigin(0.5);

    inner.add([halo, ring, disc, initial]);
    outer.add(inner);
    this.portrait = outer;
    this.portraitInner = inner;
    this.layoutPortrait();

    this.tweens.add({
      targets: inner,
      y: { from: -4, to: 6 },
      duration: 2600,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut',
    });
  }

  private layoutPortrait(): void {
    if (!this.portrait) return;
    const w = this.scale.width;
    const hgt = this.scale.height;
    const sc = Phaser.Math.Clamp(Math.min(w, hgt) / 720, 0.66, 1.25);
    this.portrait.setPosition(w / 2, hgt * 0.29).setScale(sc);
  }

  /** Visual tell when a lie is broken: shake + red flash + jitter. */
  private fluster(): void {
    this.cameras.main.shake(260, 0.009);
    if (!this.portrait) return;
    const flash = this.add
      .circle(this.portrait.x, this.portrait.y, 80 * this.portrait.scaleX, 0xe5484d)
      .setDepth(2)
      .setAlpha(0);
    this.tweens.add({
      targets: flash,
      alpha: 0.45,
      duration: 90,
      yoyo: true,
      onComplete: () => flash.destroy(),
    });
    if (this.portraitInner) {
      this.tweens.add({
        targets: this.portraitInner,
        x: { from: -6, to: 6 },
        duration: 50,
        yoyo: true,
        repeat: 3,
        onComplete: () => {
          if (this.portraitInner) this.portraitInner.x = 0;
        },
      });
    }
  }

  // ————————————————————————————————————————— DOM HUD
  private buildHud(): void {
    this.whoName = h('span', { class: 'nm' }, [GameState.current.name]);
    this.whoRole = h('span', { class: 'rl' }, [GameState.current.role]);
    this.pips = h('div', { class: 'pips' });

    const cluesBtn = h('button', { class: 'btn ghost small' }, ['🗂 线索']);
    cluesBtn.onclick = () => this.openClues();
    const setBtn = h('button', { class: 'btn ghost small' }, ['⚙']);
    setBtn.onclick = () => openSettings(() => GameState.refreshService());

    const hudTop = h('div', { class: 'hud-top' }, [
      h('div', { class: 'who' }, [this.whoName, this.whoRole]),
      h('div', { class: 'row' }, [this.pips, cluesBtn, setBtn]),
    ]);

    this.tabs = h('div', { class: 'tabs' });
    this.renderTabs();

    this.chatLog = h('div', { class: 'chat-log' });

    this.textarea = h('textarea', {
      rows: '1',
      placeholder: '审问他… （Enter 发送 / Shift+Enter 换行）',
    }) as HTMLTextAreaElement;
    this.textarea.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        void this.onSend();
      }
    });
    this.sendBtn = h('button', { class: 'btn primary send' }, ['发送']) as HTMLButtonElement;
    this.sendBtn.onclick = () => void this.onSend();

    this.presentBtn = h('button', { class: 'btn small' }, [
      '🗂 出示证据',
    ]) as HTMLButtonElement;
    this.presentBtn.onclick = () => this.openEvidence();

    const accuseBtn = h('button', { class: 'btn danger small' }, ['⚖ 去指认']);
    accuseBtn.onclick = () => this.goAccuse();

    const composer = h('div', { class: 'composer' }, [this.textarea, this.sendBtn]);
    const tools = h('div', { class: 'composer-tools' }, [
      this.presentBtn,
      h('span', { class: 'hint' }, [GameState.service.isLive ? '⚡ 实时 AI' : '🧩 离线试玩']),
      accuseBtn,
    ]);
    const dock = h('div', { class: 'chat-dock' }, [this.chatLog, composer, tools]);

    this.layer = h('div', { class: 'scene-layer' }, [hudTop, this.tabs, dock]);
    mountPanel(this, this.layer);
  }

  private renderTabs(): void {
    this.tabs.innerHTML = '';
    for (const s of GameState.suspects) {
      const tab = h(
        'button',
        { class: 'tab' + (s.id === GameState.currentSuspectId ? ' active' : '') },
        [h('span', { class: 'swatch', style: { background: s.color } }), s.name],
      );
      tab.onclick = () => this.switchSuspect(s.id);
      this.tabs.appendChild(tab);
    }
  }

  private updateWho(): void {
    this.whoName.textContent = GameState.current.name;
    this.whoRole.textContent = GameState.current.role;
  }

  private updatePips(): void {
    const req = GameState.case.requiredBreaks;
    const got = GameState.brokenCount;
    this.pips.innerHTML = '';
    for (let i = 0; i < req; i++) {
      this.pips.appendChild(h('span', { class: 'pip' + (i < got ? ' on' : '') }));
    }
    const enough = got >= req;
    this.pips.appendChild(
      h('span', { class: 'lbl', style: enough ? { color: 'var(--green)' } : {} }, [
        enough ? `证据充分 · 击破 ${got} 条` : `击破谎言 ${got}/${req}`,
      ]),
    );
  }

  // ————————————————————————————————————————— conversation
  private seedGreeting(): void {
    const id = GameState.currentSuspectId;
    if (GameState.history(id).length === 0) {
      GameState.pushAssistant(GameState.current.offline.greeting, id);
    }
  }

  private renderChat(): void {
    this.chatLog.innerHTML = '';
    for (const m of GameState.history()) {
      this.appendMsg(m.role === 'user' ? 'user' : 'suspect', m.content, false);
    }
    this.scrollChat();
  }

  private appendMsg(type: 'user' | 'suspect' | 'system' | 'break', text: string, scroll = true): void {
    this.chatLog.appendChild(h('div', { class: `msg ${type}` }, [text]));
    if (scroll) this.scrollChat();
  }

  private appendTyping(): HTMLElement {
    const t = h('div', { class: 'typing' }, [
      h('i', {}),
      h('i', {}),
      h('i', {}),
    ]);
    this.chatLog.appendChild(t);
    this.scrollChat();
    return t;
  }

  private scrollChat(): void {
    requestAnimationFrame(() => {
      this.chatLog.scrollTop = this.chatLog.scrollHeight;
    });
  }

  private setBusy(b: boolean): void {
    this.busy = b;
    this.textarea.disabled = b;
    this.sendBtn.disabled = b;
    this.presentBtn.disabled = b;
  }

  private async onSend(): Promise<void> {
    const text = this.textarea.value.trim();
    if (!text || this.busy) return;
    this.textarea.value = '';
    this.appendMsg('user', text);

    const suspect = GameState.current;
    const history = GameState.history(); // excludes this turn
    this.setBusy(true);
    const typing = this.appendTyping();
    try {
      const reply = await GameState.service.ask(suspect, history, text);
      typing.remove();
      GameState.pushUser(text);
      GameState.pushAssistant(reply);
      GameState.turns++;
      this.appendMsg('suspect', reply);
    } catch (e) {
      typing.remove();
      this.appendMsg('system', `（连接模型失败）${(e as Error).message}`);
    } finally {
      this.setBusy(false);
      this.textarea.focus();
    }
  }

  private openEvidence(): void {
    if (this.busy) return;
    let close = () => {};
    const items = GameState.case.evidence.map((ev) => {
      const used = GameState.case.lieBreaks.some(
        (b) =>
          b.suspectId === GameState.currentSuspectId &&
          b.evidenceId === ev.id &&
          GameState.brokenLies.has(b.lieId),
      );
      const item = h('div', { class: 'evidence-item' + (used ? ' used' : '') }, [
        h('div', { class: 'ico' }, [ev.icon]),
        h('div', { class: 'meta' }, [
          h('div', { class: 'nm' }, [ev.name]),
          h('div', { class: 'dt' }, [ev.detail]),
        ]),
      ]);
      item.onclick = () => {
        close();
        void this.presentEvidence(ev);
      };
      return item;
    });

    const modal = h('div', { class: 'card modal' }, [
      h('p', { class: 'eyebrow' }, ['PRESENT EVIDENCE']),
      h('h2', { class: 'heading' }, [`向 ${GameState.current.name} 出示证据`]),
      h('p', { class: 'sub', style: { marginBottom: '12px' } }, [
        '把对的证据甩到对的人脸上，才能击破谎言。',
      ]),
      h('div', { class: 'evidence-grid' }, items),
    ]);
    close = openModal(modal);
  }

  private async presentEvidence(ev: Evidence): Promise<void> {
    if (this.busy) return;
    const suspect = GameState.current;
    this.appendMsg('system', `你出示了证据：${ev.icon} ${ev.name}`);
    const result = GameState.resolvePresent(suspect.id, ev);

    this.setBusy(true);
    const typing = this.appendTyping();
    try {
      const reply = await GameState.service.reactToEvidence(suspect, GameState.history(), ev);
      typing.remove();
      GameState.pushUser(`（出示证据：${ev.name}）`);
      GameState.pushAssistant(reply);
      this.appendMsg('suspect', reply);

      if (result.broke) {
        this.appendMsg('break', `🔨 击破谎言！${result.reveal}`);
        this.fluster();
        this.updatePips();
        toast('击破一条关键谎言！');
      } else if (result.alreadyBroken) {
        toast('这条谎言之前已被击破。');
      }
    } catch (e) {
      typing.remove();
      this.appendMsg('system', `（连接模型失败）${(e as Error).message}`);
    } finally {
      this.setBusy(false);
    }
  }

  private switchSuspect(id: string): void {
    if (this.busy || id === GameState.currentSuspectId) return;
    GameState.currentSuspectId = id;
    this.updateWho();
    this.renderTabs();
    this.buildPortrait();
    this.seedGreeting();
    this.renderChat();
  }

  private openClues(): void {
    const clues = h(
      'div',
      { class: 'stack' },
      GameState.case.clues.map((cl) =>
        h('div', { class: 'clue' }, [
          h('div', { class: 'dot' }),
          h('div', {}, [
            h('div', { class: 'name' }, [cl.name]),
            h('div', { class: 'detail' }, [cl.detail]),
          ]),
        ]),
      ),
    );
    openModal(
      h('div', { class: 'card modal' }, [
        h('p', { class: 'eyebrow' }, ['CASE FILE']),
        h('h2', { class: 'heading' }, ['现场线索']),
        clues,
      ]),
    );
  }

  private goAccuse(): void {
    if (this.busy) return;
    this.scene.start('Accusation');
  }
}
