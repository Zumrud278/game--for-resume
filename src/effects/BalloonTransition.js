import Phaser from 'phaser';
import { BALLOON_DURATION, PLAYER_SCALE } from '../utils/constants.js';

export class BalloonTransition {
  constructor(scene) {
    this.scene = scene;
    this.isPlaying = false;
  }

  play(player, onComplete) {
    if (this.isPlaying) return;
    this.isPlaying = true;

    const startX = player.x;
    const startY = player.y;

    // Freeze player physics
    if (player.body) {
      player.body.enable = false;
      player.setVelocity(0, 0);
    }

    // Switch to float texture (girl holding balloons)
    if (player.floatAnim) {
      player.floatAnim();
    } else {
      player.setTexture('float');
      player.setScale(PLAYER_SCALE * 0.85);
    }

    // Add standalone bunch of colorful balloons above her
    const balloons = this.scene.add.image(startX, startY - 90, 'balloons');
    balloons.setScale(0.55);
    balloons.setDepth(60);
    balloons.setAlpha(0);

    // Fade and pop in balloons
    this.scene.tweens.add({
      targets: balloons,
      alpha: 1,
      scale: 0.7,
      duration: 600,
      ease: 'Back.easeOut',
    });

    // Ascent sequence
    this.scene.time.delayedCall(800, () => {
      this.scene.cameras.main.stopFollow();

      // Lift player and balloons upward
      this.scene.tweens.add({
        targets: player,
        y: startY - 950,
        duration: BALLOON_DURATION,
        ease: 'Sine.easeIn',
      });

      this.scene.tweens.add({
        targets: balloons,
        y: startY - 1040,
        duration: BALLOON_DURATION,
        ease: 'Sine.easeIn',
      });

      // Pan camera upward smoothly
      this.scene.tweens.add({
        targets: this.scene.cameras.main,
        scrollY: this.scene.cameras.main.scrollY - 700,
        duration: BALLOON_DURATION,
        ease: 'Sine.easeIn',
      });

      // Fade out to white to reach rainbow destination
      this.scene.time.delayedCall(BALLOON_DURATION - 900, () => {
        this.scene.cameras.main.fadeOut(900, 255, 255, 255);
        this.scene.cameras.main.once('camerafadeoutcomplete', () => {
          this.isPlaying = false;
          if (onComplete) onComplete();
        });
      });
    });
  }
}
