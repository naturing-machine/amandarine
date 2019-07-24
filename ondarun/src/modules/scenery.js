/*+;+;+;+;+;+;+;+;+;+;+;+;+;+;+;+;+;+;+;+;+;+;+;+;+;+;+;+;'''+,
:+:+:+:+:NATH|\+:NATH\:+:EN|\NATHERINE|\NATHERINE|\+:+:+: O G :
;.;.;';'NA/HE| |;AT|ER\';NA| AT|  _NE/  AT| _______|;.;'   R   '
 . . . NA/ ER| | TH| IN\ AT| \___|NE/  /THERINE|\. . .    O A
. . . NATHERINE|\HE| |EN\TH| |. .NE/  / HE| _____|. . .  O   N
;';';'\____IN|  _ER| |;ATHE| |;'NE/  /;'EHERINENA|\';';.  V G  .
:+:+:+:+:+:\___|:\___|:\_____|:+\___/+:+\__________|:+:+:  E  +
':+;+;+;+;+;+;+;+;+;+;+;+;+;+;+;+;+;+;+;+;+;+;+;+;+;+;+;+;,,,*/

// Copyright (c) 2019 ORANGE GROOVE Sororité. All rights reserved.
// Use of this source code is governed by a BSD-style license that can
// be found in the LICENSE file AND if possible, in the Public Domain.

import { N7e } from '../n7e.js';
import { OnDaRun } from '../ondarun.js';

import { User } from './user.js';

var FPS = N7e.FPS;

class Cloud {
  constructor( canvas, type, minX, minY ) {
    this.canvas = canvas;
    this.canvasCtx = this.canvas.getContext('2d');
    this.type = type;
    this.spriteX = Cloud.spriteXList[ N7e.randomInt( 0, 1 )];
    this.spriteY = Cloud.spriteYList[ type ];
    this.minX = minX;
    this.minY = minY;
    this.removed = false;
    this.speedModifier = 0.7 + 0.3*Math.random();
  }

  get maxX(){
    return this.minX + Cloud.width;
  }

  get maxY(){
    return this.minY + Cloud.heightList[ this.type ];
  }

  draw(){
      this.canvasCtx.drawImage( ODR.spriteScene,
        this.spriteX, this.spriteY,
        Cloud.width, Cloud.heightList[ this.type ],
        Math.ceil( this.minX ), this.minY,
        Cloud.width, Cloud.heightList[ this.type ]);
  }

  forward( deltaTime, currentSpeed ) {
    if( !this.removed ){

      this.minX -= currentSpeed * this.speedModifier * FPS/1000 * deltaTime;
      this.draw();

      // Mark as removeable if no longer in the canvas.
      if( this.minX + Cloud.width < 0 ){
        this.removed = true;
      }
    }
  }

  static get randomCloudGap(){
    return N7e.randomInt( Cloud.config.MIN_CLOUD_GAP, Cloud.config.MAX_CLOUD_GAP );
  }

  static get randomCloudHeight(){
    return N7e.randomInt( Cloud.config.MAX_SKY_LEVEL, Cloud.config.MIN_SKY_LEVEL );
  }

  static get randomCloudType(){
    this.cycleType = (this.cycleType + N7e.randomInt(1,3))%6;
    return this.cycleType;
    //return N7e.randomInt( 0, OnDaRun.spriteDefinition.CLOUD.y.length - 1 );
  }

}

Cloud.cycleType = 0;
Cloud.spriteXList = [ 176, 176 + 60 ];
Cloud.spriteYList = [ 1, 20, 46, 61, 76, 95 ];
Cloud.heightList = [ 18, 24, 12, 14, 18, 9];
Cloud.width = 60;

Cloud.config = {
  HEIGHTS: [18,24,12,14,18,9],
  MAX_CLOUD_GAP: 400,
  MAX_SKY_LEVEL: 30,
  MIN_CLOUD_GAP: 50,
  MIN_SKY_LEVEL: OnDaRun.DefaultHeight - 79,
  WIDTH: 60,
};


// Generate mountains.

export class Mountain {
/**
 * Mountain +generateMountainImages
 * - Generate base mountains by scaling them vertically and cache the results.
 */
  static generateMountainImages( futureOptions ){
    this.mntsCanvas = document.createElement('canvas');
    this.mntsCanvas.width = 1200;
    this.mntsCanvas.height = 100 + 75 + 50;
    let mntsCtx = this.mntsCanvas.getContext('2d');

    // First generation.
    let ofs = 0;
    [100, 75, 50].forEach( height =>{

      for( let ty = 0; ty < height; ty++ ){
        let y = ~~( 100 * ty / height );
        mntsCtx.drawImage( ODR.spriteScene, 1200, y, 1200, 1,
          0, ofs + ty,
          1200, 1);
      }

      ofs+= height;

    });

  }

  constructor( canvas, minX ) {
    this.canvas = canvas;
    this.canvasCtx = this.canvas.getContext('2d');
    this.minX = minX;
    this.removed = false;

    let type = N7e.randomInt( 0, 2 );
    this.spriteMinX = 200 * this.constructor.cycleType;
    this.constructor.cycleType = (this.constructor.cycleType + N7e.randomInt(1,3))%6;
    switch( type ){
      case 0:
        this.height = N7e.randomInt( 75, 100 );
        this.spriteMinY = 0;
        break;
      case 1:
        this.height = N7e.randomInt( 50, 75 );
        this.spriteMinY = 100;
        break;
      case 2:
        this.height = N7e.randomInt( 25, 50 );
        this.spriteMinY = 175;
        break;
    }

    this.width = ~~(this.height * (2 + Math.random() * 3));

  }

  get maxX(){
    return this.minX + this.width;
  }

  forward( deltaTime, speed ) {
    if( !this.removed ){
      this.minX -= speed;

      this.canvasCtx.drawImage( this.constructor.mntsCanvas, this.spriteMinX, this.spriteMinY, 200, this.height,
        this.minX, 180 - this.height,
        200, this.height);

      // Mark as removeable if no longer in the canvas.
      if( this.minX + this.width < 0 ) {
        this.removed = true;
      }
    }
  }
}

Mountain.cycleType = 0;

class TREX extends Cloud {
  constructor( canvas, minX ){
    super( canvas, 0, minX, 155 );
    this.speedModifier = 10;
    this.spriteX = 0;
    this.spriteY = 0;
  }

  draw(){
    let a8ey = ODR.amandarine.minY;
    if( a8ey != 150 ){
      this.canvasCtx.drawImage(ODR.spriteScene, 0, 22, 20, 22,
        ~~this.minX, 158 + ( a8ey - 150 )/3,
        20, 22);
    } else {
      this.canvasCtx.drawImage(ODR.spriteScene, 0, 22, 20, 22,
        ~~this.minX, 158 - 3*Math.abs(Math.sin(this.minX/10)),
        20, 22);
    }
  }

  get maxX(){
    return this.minX + 20;
  }

  get maxY(){
    return this.minY + 22;
  }
}

class NightMode {
  constructor( canvas ){
    this.canvas = canvas;
    this.canvasCtx = canvas.getContext('2d');
    this.minX = OnDaRun.DefaultWidth - 200;
    this.minY = 50;
//      this.nextPhase = NightMode.phases.length - 1;
    this.nextPhase = N7e.randomInt(0,6);
    this.currentPhase = this.nextPhase;
    this.opacity = 0;
    this.stars = [];
    this.placeStars();
  }

  forward( activated, delta, lightness ) {
    // Moon phase.
    if( activated && 0 == this.opacity ){
      this.currentPhase = this.nextPhase;
      this.nextPhase--;

      if (-1 == this.nextPhase) {
        this.nextPhase = 15;
      }
      this.placeStars();
    }

    // Fade in / out.

    this.opacity +=
      ( activated
      ? NightMode.config.FADE_SPEED
      :-NightMode.config.FADE_SPEED );

    if (this.opacity < 0) this.opacity = 0;
    else if (this.opacity > 1) this.opacity = 1;

    // Set moon positioning.
    if (this.opacity) {
      this.minX = this.adjustXPos(this.minX, NightMode.config.MOON_SPEED);

      // Update stars.
      if (ODR.config.GRAPHICS_STARS_TYPE != 'NONE') {
        for (var i = 0, star; star = this.stars[i]; i++) {
          star.minX = this.adjustXPos(star.minX, NightMode.config.STAR_SPEED);
        }
      }
      this.draw( 255 - lightness );
    }
  }

  adjustXPos(currentPos, speed) {
    if (currentPos < -NightMode.config.WIDTH) {
      currentPos = OnDaRun.DefaultWidth;
    } else {
      currentPos -= speed;
    }
    return currentPos;
  }

  draw( darkness = 255 ){
    let alphaRestore = this.canvasCtx.globalAlpha;
    this.canvasCtx.globalAlpha = this.opacity;// * (( 255 + darkness )>>>1)/255;

    let mx = Infinity, my = Infinity;

    if( ODR.config.GRAPHICS_MOON == 'SHINE' ){
      let yShift = 7 - this.currentPhase;
      yShift *= yShift;
      let fw = 2 * (NightMode.config.WIDTH + NightMode.config.MOON_BLUR);
      let fh = NightMode.config.HEIGHT + NightMode.config.MOON_BLUR * 2;
      mx = Math.ceil( this.minX / OnDaRun.DefaultWidth *( OnDaRun.DefaultWidth + 2*fw ) -fw -NightMode.config.MOON_BLUR );
      my = yShift + this.minY - NightMode.config.MOON_BLUR;

      this.canvasCtx.globalAlpha = this.opacity * darkness/255
      this.canvasCtx.drawImage( this.moonCanvas,
        this.currentPhase * fw, 0, fw, fh,
        mx, my, fw, fh);

      if( this.canvasCtx.globalAlpha != 1 ){
        this.canvasCtx.globalAlpha = 0.2 * this.opacity * (255 - darkness)/255
        // Fill the dull Moon.
        this.canvasCtx.drawImage( this.moonCanvas,
          this.currentPhase * fw, fh, fw, fh,
          mx, my, fw, fh);
      }

      mx += fw/2;
      my += fh/2;

    } else if (ODR.config.GRAPHICS_MOON == 'NORMAL') {
      mx = Math.ceil(this.minX);
      my = this.minY;
      var moonSourceWidth = this.currentPhase%7 == 3
        ? NightMode.config.WIDTH * 2
        : NightMode.config.WIDTH;
      var moonSourceHeight = NightMode.config.HEIGHT;
      var moonSourceX = NightMode.spriteX + NightMode.phases[this.currentPhase%7];
      var moonOutputWidth = moonSourceWidth;

      this.canvasCtx.drawImage(ODR.spriteScene, moonSourceX,
        NightMode.spriteY, moonSourceWidth, moonSourceHeight,
        mx, my,
        moonOutputWidth, NightMode.config.HEIGHT);
      mx += moonOutputWidth/2;
      my += NightMode.config.HEIGHT/2;
    }

    this.canvasCtx.globalAlpha = 1;
    // Stars.

    let opacity = this.opacity * darkness/255;

    if (ODR.config.GRAPHICS_STARS_TYPE != 'NONE') {
      for (var i = 0, star; star = this.stars[i]; i++) {

        if (ODR.config.GRAPHICS_STARS_TYPE != 'NORMAL') {
          let twinkle = ((star.minX + 2*star.minY)%10)/5;
          twinkle = 0.2
            + 0.8 * (twinkle > 1.0
              ? 2 - twinkle
              : twinkle);
          let alpha = opacity * star.opacity * twinkle;
          let moonDist = Math.abs(star.minX - mx) + Math.abs(star.minY - my) - 50;
            if (moonDist < 0) moonDist = 0; else if (moonDist > 50) moonDist = 50;

          this.canvasCtx.globalAlpha = alpha * moonDist/50;
        }

        this.canvasCtx.drawImage(ODR.spriteScene,
          NightMode.spriteStarX, star.sourceY,
          NightMode.spriteStarSize, NightMode.spriteStarSize,
          Math.ceil(star.minX), star.minY,
          NightMode.spriteStarSize, NightMode.spriteStarSize);
      }
    }

    this.canvasCtx.globalAlpha = alphaRestore;
  }

  generateMoonCache(){
    let frameWidth = 2 * NightMode.config.WIDTH + 2 * NightMode.config.MOON_BLUR;
    let frameHeight = NightMode.config.HEIGHT + 2 * NightMode.config.MOON_BLUR;
    this.moonCanvas = document.createElement('canvas');
    this.moonCanvas.width = 16*frameWidth;
    this.moonCanvas.height = 2*frameHeight;
    let ctx = this.moonCanvas.getContext('2d');
    ctx.filter = 'sepia(1)';

    for( let i = 0; i < 15; i++ ){
      if (i >= 4 && i < 11 ) {
        ctx.drawImage(ODR.spriteScene,
          NightMode.spriteX + 3 * NightMode.config.WIDTH, NightMode.spriteY,
          NightMode.config.WIDTH * 2, NightMode.config.HEIGHT,
          i * frameWidth + NightMode.config.MOON_BLUR, NightMode.config.MOON_BLUR,
          NightMode.config.WIDTH * 2, NightMode.config.HEIGHT);
      }

      if (i < 4) {
        ctx.drawImage(ODR.spriteScene,
          NightMode.spriteX + i * NightMode.config.WIDTH, NightMode.spriteY,
          NightMode.config.WIDTH, NightMode.config.HEIGHT,
          NightMode.config.MOON_BLUR + i * frameWidth, NightMode.config.MOON_BLUR,
          NightMode.config.WIDTH, NightMode.config.HEIGHT);
      } else if ( i < 7 ) {
        ctx.save();
        ctx.globalCompositeOperation = 'destination-out';
        ctx.drawImage(ODR.spriteScene,
          NightMode.spriteX + (i+1) * NightMode.config.WIDTH, NightMode.spriteY,
          NightMode.config.WIDTH, NightMode.config.HEIGHT,
          NightMode.config.MOON_BLUR + i * frameWidth + NightMode.config.WIDTH, NightMode.config.MOON_BLUR,
          NightMode.config.WIDTH, NightMode.config.HEIGHT);
        ctx.restore();
      } else if (i < 11) {
        ctx.save();
        ctx.globalCompositeOperation = 'destination-out';
        ctx.drawImage(ODR.spriteScene,
          NightMode.spriteX + (i-8) * NightMode.config.WIDTH, NightMode.spriteY,
          NightMode.config.WIDTH, NightMode.config.HEIGHT,
          NightMode.config.MOON_BLUR + i * frameWidth, NightMode.config.MOON_BLUR,
          NightMode.config.WIDTH, NightMode.config.HEIGHT);
        ctx.restore();
      } else {
        ctx.drawImage(ODR.spriteScene,
          NightMode.spriteX + (i-7) * NightMode.config.WIDTH, NightMode.spriteY,
          NightMode.config.WIDTH, NightMode.config.HEIGHT,
          NightMode.config.MOON_BLUR + i * frameWidth + NightMode.config.WIDTH, NightMode.config.MOON_BLUR,
          NightMode.config.WIDTH, NightMode.config.HEIGHT);
      }
    }

    ctx.globalAlpha = 1.0;
    ctx.filter = 'grayscale(100%)';
    ctx.drawImage( this.moonCanvas, 0, frameHeight );

    ctx.filter = `sepia(1) blur(${~~(NightMode.config.MOON_BLUR/8)}px)`;
    ctx.drawImage( this.moonCanvas, 0, 0, 16*frameWidth, frameHeight,
      0, 0, 16*frameWidth, frameHeight );

    ctx.filter = `sepia(1) blur(${~~(NightMode.config.MOON_BLUR/3)}px)`;
    ctx.drawImage( this.moonCanvas, 0, 0, 16*frameWidth, frameHeight,
      0, 0, 16*frameWidth, frameHeight );

    ctx.globalAlpha = 1;
    ctx.filter = 'sepia(1) blur(2px)';
    ctx.drawImage( this.moonCanvas, 0, 0, 16*frameWidth, frameHeight,
      0, 0, 16*frameWidth, frameHeight );

  }

  placeStars() {
    var segmentSize = Math.round( OnDaRun.DefaultWidth/NightMode.config.NUM_STARS);

    for (var i = 0; i < NightMode.config.NUM_STARS; i++) {
      this.stars[i] = {
        minX: N7e.randomInt(segmentSize * i, segmentSize * (i + 1)),
        minY: N7e.randomInt(0, NightMode.config.STAR_MAX_Y),
        opacity: 0.5 + 0.5 * Math.random(),
        sourceY: NightMode.spriteStarY + NightMode.spriteStarSize * (i%4),
        //hue: Math.floor(Math.random() * 360),
      };

      if (this.stars[i].minY > NightMode.config.STAR_MAX_Y / 2) {
        this.stars[i].opacity *= 2 - this.stars[i].minY/(0.5 * NightMode.config.STAR_MAX_Y);
      }
    }
  }

  reset() {
    //this.nextPhase = 0;
    this.forward(false);
  }
}

NightMode.spriteX = 954;
NightMode.spriteY = 0;
NightMode.spriteStarX = 1114;
NightMode.spriteStarY = 0;
NightMode.spriteStarSize = 10;

NightMode.config = {
  FADE_SPEED: 0.035,

  MOON_BLUR: 10,
  MOON_SPEED: 0.05,
  WIDTH: 20,
  HEIGHT: 40,

  NUM_STARS: 15,
  STAR_SPEED: 0.07,
  STAR_MAX_Y: OnDaRun.DefaultHeight - 50,
};

NightMode.phases = [140, 120, 100, 60, 40, 20, 0];

class HorizonLine {
  constructor( canvas ){
    this.canvas = canvas;
    this.canvasCtx = canvas.getContext('2d');
    this.minX = 0;
    this.minY = HorizonLine.dimensions.YPOS;
    this.bumpThreshold = 0.5;
    this.cachedGroundType = null;
  }

  generateGroundCache( groundType ){
    if( this.cachedGroundType == groundType )
      return;

    //console.log(`Generating ${groundType}`);

    if( !this.groundCanvas ){
      this.groundCanvas = document.createElement('canvas');
      this.groundCanvas.width = OnDaRun.DefaultWidth;
      this.groundCanvas.height = 25 * HorizonLine.dimensions.GROUND_WIDTH;
    }
    let ctx = this.groundCanvas.getContext('2d');

    ctx.clearRect(0, 0, OnDaRun.DefaultWidth, this.groundCanvas.height);
    this.cachedGroundType = groundType;

    ctx.save();
    ctx.translate(0,25 - OnDaRun.DefaultHeight);
    for (let i = 0; i < HorizonLine.dimensions.GROUND_WIDTH; i++) {

      if( groundType == 'STRIPES')
        this.drawGround(ctx, i, 'STRIPES',227,191,139);
      else {
        this.drawGround(ctx, i, 'STRIPES',137,150,90);
        this.drawGround(ctx, i, 'GRASS',32,128,0);
      }

      ctx.translate(0,25);
    }
    ctx.restore();
  }

  drawGround( canvasCtx, spinner, mode, r,g,b ){
    canvasCtx.save();
    canvasCtx.lineWidth = 5;
    canvasCtx.lineCap = 'butt';
    for ( let
      scale = 1.02, //Perspective
      step = 2,
      pwStep = Math.pow(scale, step),
      y = this.minY + 12,
      i = -8,
      alphaStep = 0.15 * step / (OnDaRun.DefaultHeight - y),
      pw = Math.pow(scale,i);

          y + i < OnDaRun.DefaultHeight + this.canvasCtx.lineWidth;

              i += step, pw *= pwStep ) {

      let width = OnDaRun.DefaultWidth / pw;

      canvasCtx.save();
      canvasCtx.scale(pw, 1);
//            this.canvasCtx.transform(pw,0,0,1,0,0);

      // Draw grasses
      if (mode == 'GRASS') {
        if (!this.grassMap) {
          this.grassMap = [];
          this.grassMapOffset = [];
          for(let g = 0; g<10; g++) {
            let l = [];
            let sum;
            let n;
            this.grassMapOffset.push(N7e.randomInt(0,4));
            let gr = false;

            sum = HorizonLine.dimensions.GROUND_WIDTH/2;
            do {
              n = gr ? N7e.randomInt(3,5) : N7e.randomInt(0,1);
              gr = !gr;
              if (sum < n) {
                n = sum;
              }
              sum -= n;
              l.push(n);
            } while (sum > 0);

            sum = HorizonLine.dimensions.GROUND_WIDTH/2;
            do {
              n = gr ? N7e.randomInt(2,8) : N7e.randomInt(1,2);
              gr = !gr;
              if (sum < n) {
                n = sum;
              }
              sum -= n;
              l.push(n);
            } while (sum > 0);

            if (l.length%2 != 0) l.push(0);

            this.grassMap.push(l);
          }
        }

        canvasCtx.strokeStyle = "rgba("+r+','+g+','+b+","+(alphaStep * (i+8))+")";
        let line;
        let grassH = 1+Math.ceil(1.2 * (i+8)/4);

        for (let r = 0; r < 5; r++,grassH *= 0.75) {
          line = (i+8+r)%10;
          canvasCtx.setLineDash(this.grassMap[line]);
          canvasCtx.lineWidth = grassH;
          canvasCtx.beginPath();
          canvasCtx.moveTo(0, y + i - grassH +3);
          canvasCtx.lineTo(width, y + i - grassH +3);
          canvasCtx.lineDashOffset = 2*(r-2) -spinner - width/2 + this.grassMapOffset[line];
          canvasCtx.stroke();
        }

      } else if (mode == 'STRIPES') { // Draw stripes

        canvasCtx.setLineDash([25,25]);
        //canvasCtx.setLineDash(this.stripes[(i+8)%10]);
        canvasCtx.lineWidth = step;
        canvasCtx.strokeStyle = "rgba("+r+','+g+','+b+","+(alphaStep/2 * (i+8))+")";

        for (let s = 0; s <= 12; s+=2) {
          canvasCtx.beginPath();
          canvasCtx.moveTo(0, y + i);
          canvasCtx.lineTo(width, y + i);
          canvasCtx.lineDashOffset = -spinner + s + ~~( i**2/8 ) - width/2;
          canvasCtx.stroke();
        }
      }

      canvasCtx.restore();
    }
    canvasCtx.restore();
  }

  draw() {
    console.trace();
  }

  forward( /*deltaTime,*/ screenIncrement ){
    if( ODR.config.GRAPHICS_GROUND_TYPE != 'DIRT' ){
      screenIncrement /= 3;
    }

    this.minX += screenIncrement;
    if (-this.minX > 1800) {
      this.minX += 1800;
    }

    //Draw dirt.
    this.canvasCtx.drawImage( ODR.spriteScene,
      ~~-this.minX, 104, 600, 46,
      0, 170, 600, 46);

    if( ODR.config.GRAPHICS_GROUND_TYPE == 'DIRT') return;

    this.generateGroundCache( ODR.config.GRAPHICS_GROUND_TYPE );

    this.canvasCtx.drawImage( this.groundCanvas,
        0, 3 * (~~this.minX + 1800 ) % HorizonLine.dimensions.GROUND_WIDTH * 25 + 2,
          OnDaRun.DefaultWidth, 22,
        0, OnDaRun.DefaultHeight - 22,
          OnDaRun.DefaultWidth, 22 );
  }

  reset() {
    //this.minX[1] = HorizonLine.dimensions.WIDTH;
  }
}
HorizonLine.spritePos = { x: 2, y: 104 };
HorizonLine.dimensions = {
  WIDTH: 600,
  HEIGHT: 23,
  YPOS: OnDaRun.DefaultHeight-23,
  GROUND_WIDTH: 100,
};


export class Scenery {
  constructor( canvas ){
    this.canvas = canvas;
    this.canvasCtx = this.canvas.getContext('2d');
    this.obstacleHistory = [];
    this.horizonOffsets = [0, 0];
    this.cloudFrequency = 1.0;
    this.nightMode = null;

    this.layerCount = 5;

    this.layers = [];
    for( let i = 0; i < this.layerCount; i++ ){
      this.layers[i] = []; // At some points each layer will be a dedicated object.
    }

    // Scenery
    this.horizonLine = null;
    this.horizonLine = new HorizonLine( this.canvas );
    this.nightMode = new NightMode( this.canvas );

    for( let i = 0; i < this.cloudFrequency * 10; i++ ){
      let x = N7e.randomInt(-50, 2*OnDaRun.DefaultWidth );
      this.layers[[ 0, 2, 4 ][ N7e.randomInt( 0, 2 )]].push( new Cloud( this.canvas, Cloud.randomCloudType,
        x, Cloud.randomCloudHeight ));
    }
  }

  addTREX(){
    if( !this.__TREX_ONCE && User.inst.uidRef ){
      this.layers[ this.layerCount -1 ].push( new TREX( this.canvas, 1200));
      this.__TREX_ONCE = true;
    }
  }

/** Class Scenery
 * Recursively append mountains.
 */

  growMountain( generator, parent, layer ){
    if( generator.energy > 0 ){
      generator.energy--;

      let distance = parent
        ? parent.minX + N7e.randomInt( -parent.width, parent.width )
        : OnDaRun.DefaultWidth + N7e.randomInt( -250, 250 );

      let mountain = new Mountain( this.canvas, distance );
      let li = 1 + ( N7e.randomInt( 0, 1 )<<1 );
      this.layers[ li ].push( mountain );
      generator.mountains.push([ mountain, li ]);
      if( generator.minX > mountain.minX ){
        generator.minX = mountain.minX;
      }

      if( generator.energy ){
        this.growMountain( generator, mountain, li );
      }
    }
  }

  forward( deltaTime, currentSpeed, showNightMode ){
    //FIXME Try sorting depth on single scene array.
    /*
    this.forwardClouds(deltaTime, currentSpeed, true);
    this.forwardMountains(deltaTime, currentSpeed);
    */

    let numClouds = 0;
    let numMountains = 0;
    let maxXMountain = 0;

    //Update the atmosphere.
    ODR.sky.forward( deltaTime );

    //First draw
    this.canvasCtx.clearRect( 0, 0, OnDaRun.DefaultWidth, OnDaRun.DefaultHeight );

    for( let i = 0, layer; layer = this.layers[i]; i++ ){


      // Odd layers are for Mountains. Even for clouds.
      if(( i % 2 ) == 0 ){
        // Clouds

        this.layers[i] = layer = layer.filter( cloud => {
          if( cloud.removed ) return false;
          numClouds++;
          return true;
        });

        // Nearer layer will be constanty shifted a bit faster.
        let alphaRestore = this.canvasCtx.globalAlpha;
        let compositeRestore = this.canvasCtx.globalCompositeOperation;

          this.canvasCtx.globalAlpha = (i+1)/5;
          layer.forEach( cloud => {
            cloud.forward( deltaTime, currentSpeed/25 + 0.2 * ( i + 1 )/this.layers.length );
          });

          //atmosphere
          this.canvasCtx.globalCompositeOperation = 'source-atop';
          this.canvasCtx.globalAlpha = 0.4;
          //this.canvasCtx.fillStyle = '#' + (i == 3 ? ODR.rgb0x2 : ODR.rgb0x1);
          this.canvasCtx.fillStyle = '#' + ODR.sky.toRGB;
          this.canvasCtx.fillRect( 0, 0, OnDaRun.DefaultWidth, OnDaRun.DefaultHeight );

        this.canvasCtx.globalCompositeOperation = compositeRestore;
        this.canvasCtx.globalAlpha = alphaRestore;


      } else {
        // Mountains

        this.layers[i] = layer = layer.filter( mountain => {
          if( mountain.removed ) return false;
          numMountains++;
          maxXMountain = Math.max( maxXMountain, mountain.maxX );
          return true;
        });

        layer.forEach( mountain => {
          mountain.forward( deltaTime, currentSpeed/20 * ( i == 3 ? 1.2 : 1 ));
        });

      }

    }

    // Too few cloud, create one.
    if( numClouds < (ODR.config.GRAPHICS_CLOUDS || 0) * this.cloudFrequency ){
      //HACK FIXME
      let x = OnDaRun.DefaultWidth + N7e.randomInt(0,600);
      this.layers[[0,2,2,4,4,4][N7e.randomInt(0,5)]].push( new Cloud( this.canvas, Cloud.randomCloudType,
        x, Cloud.randomCloudHeight ));
    }

    if( numMountains < 10 && maxXMountain < OnDaRun.DefaultWidth ){
      let generator = { energy: 7, mountains: [], minX: OnDaRun.DefaultWidth };
      this.growMountain( generator );
      if( generator.minX < OnDaRun.DefaultWidth ){
        let shift = N7e.randomInt( 0, 400 ) + OnDaRun.DefaultWidth - generator.minX;
        generator.mountains.forEach( mountain => {
          mountain[0].minX += shift;
          if( mountain[1] == 3 ) mountain[0].minX *= 1.2;
        });
      }
    }

    // Fill atmosphere
    let compositeRestore = this.canvasCtx.globalCompositeOperation;
      this.canvasCtx.globalCompositeOperation = 'destination-over';

      this.nightMode.forward( showNightMode, deltaTime, ODR.sky.shade[6] );
      ODR.sky.repaint( this.canvasCtx );
    this.canvasCtx.globalCompositeOperation = compositeRestore;

    this.horizonLine.forward( -currentSpeed * FPS / 1000 * deltaTime );

  }

  reset() {
    this.horizonLine.reset();
    this.nightMode.reset();
  }

  resize(width, height) {
    this.canvas.width = width;
    this.canvas.height = height;
  }

}

Scenery.config = {
  BG_CLOUD_SPEED: 7,
  BUMPY_THRESHOLD: .3,
  CLOUD_FREQUENCY: .5,
  HORIZON_HEIGHT: 16,
  MAX_CLOUDS: 8
};

class Layer {
  constructor(){

    this.canvas = document.createElement('canvas');
    this.canvas.width = OnDaRun.DefaultWidth;
    this.canvas.height = OnDaRun.DefaultHeight;
    this.canvasCtx = this.canvas.getContext('2d');
    this.needsRepaint = false;

  }

  /*
  forward( deltaTime ){
    if( this.needsRepaint ){
      this.paint();
    }
  }
  */
}

export class Sky extends Layer {
  constructor(){
    super();
                      //R G B R G B L ( L = Lightness/Less night )
    this.sourceShade = [0,0,0,0,0,0,0];
    this.targetShade = [0,0,0,0,0,0,0];
    this.shade = [0,0,0,0,0,0];
    this.fromRGB = '000000';
    this.toRGB = '000000';

    //FIXME try to 0
    this.shadingTimer = 1;
    this.shadingDuration = 1;
    this.lastRepaintTimer = 0;
  }

  setShade( newShade, duration ){
    if( duration == 0 ){
      this.sourceShade = newShade;
      this.shade = newShade.slice();
      this.targetShade = newShade;

      this.shadingTimer = 1;
      this.shadingDuration = 1;
      this.lastRepaintTimer = 0;
      return;
    }

    // Restart a shade if the transition was interrupted
    if( this.shadingTimer < this.shadingDuration ){
      this.targetShade = this.shade;
    }

    this.sourceShade = this.targetShade;
    this.shade = this.sourceShade.slice();
    this.targetShade = newShade;

    this.shadingTimer = 0;
    this.shadingDuration = duration;
    this.lastRepaintTimer = 0;

  }

  repaint( displayCtx ){

    if( this.needsRepaint ){
      let gr = this.shade;
      this.fromRGB = (( 1<<24 ) + ( gr[ 0 ]<<16 ) + ( gr[ 1 ]<<8) + gr[ 2 ]).toString( 16 ).slice( 1 );

      if( ODR.config.GRAPHICS_SKY_GRADIENT == 'SOLID'){
        this.canvasCtx.fillStyle = '#' + this.fromRGB;
      } else if( ODR.config.GRAPHICS_SKY_GRADIENT == 'GRADIENT'){
        let gradient = this.canvasCtx.createLinearGradient( 0, 0, 0, OnDaRun.DefaultHeight );
        this.toRGB = (( 1<<24 ) + ( gr[ 3 ]<<16 ) + ( gr[ 4 ]<<8 ) + gr[ 5 ]).toString( 16 ).slice( 1 );
        gradient.addColorStop( 0, '#' + this.fromRGB );
        gradient.addColorStop( 1, '#' + this.toRGB );
        this.canvasCtx.fillStyle = gradient;
      }

      this.canvasCtx.fillRect( 0, 0, OnDaRun.DefaultWidth, OnDaRun.DefaultHeight );

      this.lastRepaintTimer = this.shadingTimer;
      this.needsRepaint = false;
    }

    displayCtx.drawImage( this.canvas, 0, 0 );

  }

  forward( deltaTime, displayCtx ) {
    if( 0 != this.shadingDuration ){
      this.shadingTimer += deltaTime;

      let ratio;
      let dur = this.shadingTimer - this.shadingDuration;

      if( dur >= 0 ){
        ratio = 1;
        this.shadingTimer = this.shadingDuration;
        this.shadingDuration = 0; //This avoids recalculation in the next entry.
        this.shade = [ ...this.targetShade ];
      } else {
        ratio = this.shadingTimer/this.shadingDuration;
        for( let i = 0; i < 7; i++ ){
          this.shade[i] = ~~( this.sourceShade[ i ]
            + ratio*( this.targetShade[ i ] - this.sourceShade[ i ]));
        }
      }

      // TODO Move this to Layer abstraction so layers can define their own updating FPS.
      // Updating the sky at ~ 20fps
      if( ratio == 1 || this.shadingTimer - this.lastRepaintTimer > 50) {
        this.needsRepaint = true;
      }
    }

    if( displayCtx ){
      this.repaint( displayCtx );
    }
  }

}

Sky.config = {
  DAY: [~~(221*0.8), ~~(238*0.8), ~~(255*0.9), 238, 238, 255, 255],
  //NIGHT: [68,136,170,102,153,187],
  NIGHT: [68,136,170,84,183,187,0],
  START: [251,149,93,251,112,93,0],
  SUNSET: [69,67,125,255,164,119,255],
};
