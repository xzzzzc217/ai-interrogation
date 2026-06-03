import Phaser from 'phaser';
import { GameState } from '../game/GameState';
import { yachtCase } from '../data/cases/yacht';

/** Initializes the default case, then hands off to the menu. */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create(): void {
    GameState.startCase(yachtCase);
    this.scene.start('MainMenu');
  }
}
