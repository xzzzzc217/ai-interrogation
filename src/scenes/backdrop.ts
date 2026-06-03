import Phaser from 'phaser';

/** Build a reusable radial-gradient texture (spotlight / vignette). */
function makeRadial(
  scene: Phaser.Scene,
  key: string,
  inner: string,
  outer: string,
  size = 512,
): void {
  if (scene.textures.exists(key)) return;
  const tex = scene.textures.createCanvas(key, size, size);
  if (!tex) return;
  const ctx = tex.getContext();
  const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, inner);
  grad.addColorStop(1, outer);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  tex.refresh();
}

export interface BackdropOptions {
  /** show the warm overhead spotlight (interrogation feel). default true */
  spotlight?: boolean;
  spotY?: number; // 0..1 vertical position of the spotlight center
}

/**
 * The noir stage every scene sits on: a dark vertical gradient, a warm
 * spotlight glow, and an edge vignette. Redraws itself on resize so it always
 * fills the viewport (the game runs in Phaser.Scale.RESIZE).
 */
export class Backdrop {
  private g: Phaser.GameObjects.Graphics;
  private spot: Phaser.GameObjects.Image;
  private vignette: Phaser.GameObjects.Image;
  private spotY: number;

  constructor(private scene: Phaser.Scene, opts: BackdropOptions = {}) {
    this.spotY = opts.spotY ?? 0.3;
    makeRadial(scene, 'glow', 'rgba(232,176,75,0.55)', 'rgba(232,176,75,0)');
    makeRadial(scene, 'vignette', 'rgba(0,0,0,0)', 'rgba(0,0,0,0.9)');

    this.g = scene.add.graphics().setDepth(-30);
    this.spot = scene.add
      .image(0, 0, 'glow')
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(-20)
      .setAlpha(opts.spotlight === false ? 0 : 0.55);
    this.vignette = scene.add.image(0, 0, 'vignette').setDepth(-10);

    this.layout();
    scene.scale.on(Phaser.Scale.Events.RESIZE, this.layout, this);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      scene.scale.off(Phaser.Scale.Events.RESIZE, this.layout, this);
    });

    // a slow breathing pulse on the spotlight for a touch of life
    if (opts.spotlight !== false) {
      scene.tweens.add({
        targets: this.spot,
        alpha: { from: 0.42, to: 0.6 },
        duration: 3800,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.inOut',
      });
    }
  }

  private layout(): void {
    const w = this.scene.scale.width;
    const h = this.scene.scale.height;
    const big = Math.max(w, h);
    this.g.clear();
    this.g.fillGradientStyle(0x111a2b, 0x111a2b, 0x05070c, 0x05070c, 1);
    this.g.fillRect(0, 0, w, h);
    this.spot.setPosition(w / 2, h * this.spotY).setDisplaySize(big * 1.5, big * 1.5);
    this.vignette.setPosition(w / 2, h / 2).setDisplaySize(w * 1.6, h * 1.6);
  }
}
