import './styles.css';
import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { MainMenuScene } from './scenes/MainMenuScene';
import { CaseBriefingScene } from './scenes/CaseBriefingScene';
import { InterrogationScene } from './scenes/InterrogationScene';
import { AccusationScene } from './scenes/AccusationScene';
import { VerdictScene } from './scenes/VerdictScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game-root',
  backgroundColor: '#05070c',
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: window.innerWidth,
    height: window.innerHeight,
  },
  render: { antialias: true, powerPreference: 'high-performance' },
  scene: [
    BootScene,
    MainMenuScene,
    CaseBriefingScene,
    InterrogationScene,
    AccusationScene,
    VerdictScene,
  ],
};

// eslint-disable-next-line no-new
new Phaser.Game(config);
