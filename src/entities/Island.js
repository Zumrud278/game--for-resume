import Phaser from 'phaser';
import { COLORS, FONT_FAMILY } from '../utils/constants.js';

export class Island {
  constructor(scene, config) {
    this.scene = scene;
    this.config = config;
    this.x = config.x;
    this.y = config.y;
    this.dataKey = config.dataKey;
    this.visited = false;
    
    // Create the island image
    this.image = scene.add.image(config.x, config.y, config.key);
    this.image.setScale(config.scale);
    this.image.setDepth(2);
    
    // Create invisible static platform body at the top surface of the island
    // The top surface is roughly the top 25% of the island image
    const imgW = this.image.displayWidth;
    const imgH = this.image.displayHeight;
    
    // Platform collider — a thin rect at the top of the island
    this.platform = scene.add.zone(config.x, config.y - imgH * 0.35, imgW * 0.85, 20);
    scene.physics.add.existing(this.platform, true); // true = static
    
    // Section icon (if this island has one)
    this.iconSprite = null;
    if (config.iconKey) {
      this.iconSprite = scene.add.image(config.x, config.y - imgH * 0.5 - 30, config.iconKey);
      this.iconSprite.setScale(0.6);
      this.iconSprite.setDepth(3);
      
      // Gentle floating animation on the icon
      scene.tweens.add({
        targets: this.iconSprite,
        y: this.iconSprite.y - 8,
        duration: 1500,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }
    
    // Label text below the icon
    if (config.label && config.label !== 'Start') {
      this.label = scene.add.text(config.x, config.y - imgH * 0.5 - 65, config.label, {
        fontFamily: FONT_FAMILY,
        fontSize: '14px',
        color: '#ffffff',
        stroke: '#2D1B4E',
        strokeThickness: 3,
        align: 'center',
      });
      this.label.setOrigin(0.5);
      this.label.setDepth(4);
    }
  }
  
  // Create trigger zone for speech bubble activation
  getTriggerBounds() {
    const imgW = this.image.displayWidth;
    return new Phaser.Geom.Rectangle(
      this.x - imgW * 0.5,
      this.y - this.image.displayHeight,
      imgW,
      this.image.displayHeight
    );
  }
  
  markVisited() {
    this.visited = true;
    if (this.iconSprite) {
      // Brief scale pop effect
      this.scene.tweens.add({
        targets: this.iconSprite,
        scale: 0.75,
        duration: 200,
        yoyo: true,
        ease: 'Back.easeOut',
      });
    }
  }
  
  showIcon() {
    if (this.iconSprite) {
      this.scene.tweens.add({
        targets: this.iconSprite,
        scale: { from: 0, to: 0.6 },
        duration: 500,
        ease: 'Back.easeOut',
      });
    }
  }
}
