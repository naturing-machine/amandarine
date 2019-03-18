/* .............................................. B_Y */
/* .... ####| . BBBB\ . BB| SSSSSSSS| DDDDDDDD| . O|G */
/* ... ##/##| . BB|BB\  BB| SS| . SS/ DD| ....... R|R */
/* .. ##/ ##| . BB| BB\ BB| ..  SS/ . DDDDDDD| .. A|O */
/* . #########| BB|  BB\BB| .. SS| .. DD| ....... N|O */
/* ...... ##| . BB| . BBBB| .. SS| .. DDDDDDDD| . G|V */
/* .............................................. E|E */

// Copyright (c) 2019 ORANGE GROOVE Sororité. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file AND if possible, in the Public Domain.

/*
  N7e : global application service
  OnDaRun : the class of the runner game
  ODR : application instance of OnDaRun
*/

import { LitElement, html, css } from 'lit-element';

var DEFAULT_WIDTH = 600;
var FPS = 60;
var IS_IOS = /iPad|iPhone|iPod/.test(window.navigator.platform);
var IS_MOBILE = /Android/.test(window.navigator.userAgent) || IS_IOS;
var IS_TOUCH_ENABLED = 'ontouchstart' in window;

var N7e = {
  userSigning: true,
};

function shapeSpeedDuration(speed, duration) {
  let minPress = ODR.config.MIN_ACTION_PRESS + ODR.config.MIN_ACTION_PRESS_FACTOR*speed;
  return duration * (ODR.config.MAX_ACTION_PRESS - minPress)/ODR.config.MAX_ACTION_PRESS + minPress;
}

function getRandomNum(min, max) {
  return ~~(Math.random() * (max - min + 1)) + min;
}

function getTimeStamp() {
  return IS_IOS ? new Date().getTime() : performance.now();
}

function vibrate(duration) {
  if (IS_MOBILE && window.navigator.vibrate) {
    window.navigator.vibrate(duration);
  }
}

class CollisionBox {
  constructor(x, y, w, h) {
    this.x = x;
    this.y = y;
    this.width = w;
    this.height = h;
  }

  flop(width) {
    this.x = width - this.x - this.width;
  }

  flip(height) {
    this.y = height - this.y - this.height;
  }

  maxX() {
    return this.x + this.width;
  }

  maxY() {
    return this.y + this.height;
  }

  center() {
    return {
      x: this.x + this.width/2,
      y: this.y + this.height/2
    };
  }

  intersects(aBox) {
    return ( this.maxX() <= aBox.x || aBox.maxX() <= this.x ||
        this.maxY() <= aBox.y || aBox.maxY() <= this.y)
      ? false
      : true;
  }

  intersection(aBox) {

    let ret = new CollisionBox(0, 0, 0, 0);

    ret.x = aBox.x <= this.x
      ? this.x
      : aBox.x;

    ret.y = aBox.y <= this.y
      ? this.y
      : aBox.y;

    ret.width = aBox.x + aBox.width >= this.x + this.width
      ? this.x + this.width - ret.x
      : aBox.x + aBox.width - ret.x;

    ret.height = aBox.y + aBox.height >= this.y + this.height
      ? this.y + this.height - ret.y
      : aBox.y + aBox.height - ret.y;

    return ret;
  }

  isEmpty() {
    return this.width > 0 && this.height > 0 ? false : true;
  }

  union(aBox) {
    if (this.isEmpty()) {
      if (aBox.isEmpty()) return new CollisionBox(0,0,0,0);
      return aBox;
    }
    if (aBox.isEmpty()) return this;

    let xx = Math.min( this.x, aBox.x );
    let yy = Math.min( this.y, aBox.y );

    return new CollisionBox( xx, yy,
      Math.max( this.maxX(), aBox.maxX() ) - xx,
      Math.max( this.maxY(), aBox.maxY() ) - yy
    );
  }
}

class User {
  constructor(opt_providerName) {
    let redirect = true;
    let provider;
    if (opt_providerName) {
      firebase.auth().setPersistence(firebase.auth.Auth.Persistence.LOCAL).then(() => {
        switch(opt_providerName) {
          case "google":
            provider = new firebase.auth.GoogleAuthProvider();
            break;
          case "facebook":
            provider = new firebase.auth.FacebookAuthProvider();
            break;
          case "twitter":
            provider = new firebase.auth.TwitterAuthProvider();
            break;
        }

        return redirect
          ? firebase.auth().signInWithRedirect(provider)
          : firebase.auth().signInWithPopup(provider);

      }).catch(function(error) {
        var errorCode = error.code;
        var errorMessage = error.message;
        console.log("Error", error);
      });
    }
  }
}

class Obstacle {
  constructor(
      canvasCtx,
      type,
      spriteImgPos,
      dimensions,
      gapCoefficient,speed,
      opt_xOffset) {

    this.canvasCtx = canvasCtx;
    this.spritePos = spriteImgPos;
    this.typeConfig = type;
    this.gapCoefficient = gapCoefficient;
    this.size = getRandomNum(1, Obstacle.MAX_OBSTACLE_LENGTH);
    this.dimensions = dimensions;
    this.remove = false;
    this.xPos = dimensions.WIDTH + (opt_xOffset || 0);
    this.yPos = 0;
    this.width = 0;
    this.collisionBoxes = [];
    this.gap = 0;

    // For animated obstacles.
    this.currentFrame = 0;
    this.timer = 0;

    this.init(speed);
  }

  init(speed) {
    this.cloneCollisionBoxes();

    // Only allow sizing if we're at the right speed.
    if (this.size > 1 && this.typeConfig.multipleSpeed > speed) {
      this.size = 1;
    }

    this.width = this.typeConfig.width * this.size;

    // Check if obstacle can be positioned at various heights.
    if (Array.isArray(this.typeConfig.yPos)) {
      var yPosConfig = this.typeConfig.yPos;
      this.yPos = yPosConfig[getRandomNum(0, yPosConfig.length - 1)];
    } else {
      this.yPos = this.typeConfig.yPos;
    }

    this.draw();

    // Make collision box adjustments,
    // Central box is adjusted to the size as one box.
    //      ____        ______        ________
    //    _|   |-|    _|     |-|    _|       |-|
    //   | |<->| |   | |<--->| |   | |<----->| |
    //   | | 1 | |   | |  2  | |   | |   3   | |
    //   |_|___|_|   |_|_____|_|   |_|_______|_|
    //
    if (this.size > 1) {
      this.collisionBoxes[1].width = this.width - this.collisionBoxes[0].width -
      this.collisionBoxes[2].width;
      this.collisionBoxes[2].x = this.width - this.collisionBoxes[2].width;
    }

    // For obstacles that go at a different speed from the horizon.
    if (this.typeConfig.speedFactor) {
      this.speedFactor = this.typeConfig.speedFactor;
    }

    this.gap = this.getGap(this.gapCoefficient, speed);
  }

  draw() {
    var sourceWidth = this.typeConfig.width;
    var sourceHeight = this.typeConfig.height;

    // X position in sprite.
    var sourceX = (sourceWidth * this.size) * (0.5 * (this.size - 1))
      + this.spritePos.x;

    // Animation frames.
    if (this.currentFrame > 0) {
      sourceX += this.typeConfig.frames[this.currentFrame];
    }

      // shadow test
      /*
      this.canvasCtx.save(); {
        this.canvasCtx.translate(Math.floor(this.xPos), this.yPos);
        let b = new CollisionBox(0,0,0,0);
        this.collisionBoxes.forEach(bb => b = b.union(bb) );
        this.canvasCtx.translate(0, b.maxY());
        this.canvasCtx.scale(1,-0.15);
        this.canvasCtx.translate(0, -b.maxY());
        this.canvasCtx.filter = 'brightness(0)';
        let distFactor = Math.max(0,1-Math.abs(this.yPos - 150)/200);
        this.canvasCtx.globalAlpha = 1 * distFactor;
        this.canvasCtx.globalAlpha = 0.3 ;
        distFactor = distFactor - 1;
        this.canvasCtx.drawImage(this.typeConfig.sprite || ODR.spriteScene,
          sourceX, this.spritePos.y,
          sourceWidth * this.size, sourceHeight,
          5 * (this.xPos-300)/250 + distFactor * (300 - this.xPos) / 3.5,distFactor * 20,
          this.typeConfig.width * this.size, this.typeConfig.height);
      } this.canvasCtx.restore();
      */

    this.canvasCtx.drawImage(this.typeConfig.sprite || ODR.spriteScene,
      sourceX, this.spritePos.y,
      sourceWidth * this.size, sourceHeight,
      ~~this.xPos, ~~this.yPos,
      this.typeConfig.width * this.size, this.typeConfig.height);
  }

  repaint(deltaTime, speed) {
    if (!this.remove) {
      /*
      if (this.typeConfig.speedOffset) {
        speed += this.speedOffset;
      }
      */
      if (this.speedFactor) {
        speed += this.speedFactor * speed;
      }
      this.xPos -= speed * FPS / 1000 * deltaTime;

      // Update frame
      if (this.typeConfig.frames) {
        this.timer += deltaTime;
        if (this.timer >= this.typeConfig.frameRate) {
          this.currentFrame =
            this.currentFrame == this.typeConfig.frames.length - 1
              ? 0
              : this.currentFrame + 1;
          this.timer = 0;
        }
      }
      this.draw();

      if (!this.isVisible()) {
        this.remove = true;
      }
    }
  }

  getGap(gapCoefficient, speed) {
    var minGap = Math.round(this.width * speed +
      this.typeConfig.minGap * gapCoefficient);
      var maxGap = Math.round(minGap * Obstacle.MAX_GAP_COEFFICIENT);
      return getRandomNum(minGap, maxGap);
  }

  isVisible() {
    return this.xPos + this.width > 0;
  }

  cloneCollisionBoxes() {
    var collisionBoxes = this.typeConfig.collisionBoxes;

    for (var i = collisionBoxes.length - 1; i >= 0; i--) {
      this.collisionBoxes[i] = new CollisionBox(collisionBoxes[i].x,
        collisionBoxes[i].y, collisionBoxes[i].width,
        collisionBoxes[i].height);
    }
  }

}

class Particles {
  constructor(canvas, x, y, life) {
    this.life = life; // Used for calculating sprite offset.
    this.canvas = canvas;
    this.canvasCtx = this.canvas.getContext('2d');
    this.xPos = x;
    this.yPos = y;
    this.points = [];
    //this.init();
    this.tag = 0;
  }

  draw() {
  }

  repaint(aging) {
    this.points = this.points.filter( point => {
      point.life -= aging;
      return point.life > 0;
    });

    for(let i = 0, point; point = this.points[i]; i++) {
      let ratio = (this.life - point.life) / this.life;
      let x = this.xPos + point.x + 40 + point.w * ratio;
      let y = this.yPos + point.y + OnDaRun.defaultDimensions.HEIGHT-25 + point.h * ratio;
      this.canvasCtx.drawImage(ODR.spriteScene,
        776 + 22 * ~~(8 * ratio), 2,
        22, 22,
        Math.ceil(x), Math.ceil(y),
        22, 22);
    }
  }

  addPoint(x, y, w, h) {
    this.points.push({tag:this.tag++, x:x, y:y, w:w, h:h, life:this.life});
  }

  reset() {
    this.points = [];
  }
}

class Cloud {
  constructor(canvas, spritePos, containerWidth, type) {
    this.canvas = canvas;
    this.canvasCtx = this.canvas.getContext('2d');
    this.type = type;
    this.spritePos = {
      x: spritePos.x,
      y: spritePos.y[type],
    };
    this.containerWidth = containerWidth;
    this.xPos = containerWidth;
    this.yPos = 0;
    this.remove = false;
    this.cloudGap = getRandomNum(Cloud.config.MIN_CLOUD_GAP,
      Cloud.config.MAX_CLOUD_GAP);

    this.init();
  }

  init() {
    this.opacity = getRandomNum(1,4) / 5;
    this.yPos = getRandomNum(Cloud.config.MAX_SKY_LEVEL,
      Cloud.config.MIN_SKY_LEVEL) + ~~(50 * (1 - this.opacity));
    this.draw();
  }

  draw() {
    this.canvasCtx.save(); {

      if (ODR.config.GRAPHICS_CLOUDS_TYPE == 'DEPTH') {
        this.canvasCtx.globalAlpha = this.opacity;
      }
      this.canvasCtx.globalCompositeOperation = 'luminosity';
      var sourceWidth = Cloud.config.WIDTH;
      var sourceHeight = Cloud.config.HEIGHTS[this.type];

      this.canvasCtx.drawImage(ODR.spriteScene, this.spritePos.x,
        this.spritePos.y,
        sourceWidth, sourceHeight,
        Math.ceil(this.xPos), this.yPos,
        Cloud.config.WIDTH, Cloud.config.HEIGHTS[this.type]);

    } this.canvasCtx.restore();
  }

  repaint(speed) {
    if (!this.remove) {
      this.xPos -= speed + speed * this.opacity;
      this.draw();

      // Mark as removeable if no longer in the canvas.
      if (!this.isVisible()) {
        this.remove = true;
      }
    }
  }

  isVisible() {
    return this.xPos + Cloud.config.WIDTH > 0;
  }

}

class Mountain {
  constructor(canvas, containerWidth,depth) {
    this.canvas = canvas;
    this.canvasCtx = this.canvas.getContext('2d');
    this.xPos = containerWidth;
    this.yPos = HorizonLine.dimensions.YPOS + 6;
    this.remove = false;
    this.depth = depth;
    this.mountainGap = getRandomNum(200, 500);

    this.init();
  }

  init() {
    this.height = getRandomNum(OnDaRun.defaultDimensions.HEIGHT/8, OnDaRun.defaultDimensions.HEIGHT/2);
    if (this.depth == 0) this.height * 0.7;

    this.width = ~~(this.height * (2 + Math.random() * 3));
    if (this.width > 200) this.width = 200;

    this.draw();
  }

  draw() {
    this.canvasCtx.save(); {
      let gr = ODR.skyGradientCurrentValues;
      let rgb0x1 = ((1 << 24) + (gr[0] << 16) + (gr[1] << 8) + gr[2]).toString(16).slice(1);
      let rgb0x2 = ((1 << 24) + (gr[3] << 16) + (gr[4] << 8) + gr[5]).toString(16).slice(1);

      this.canvasCtx.fillStyle = '#' + (this.depth == 0 ? rgb0x2 : rgb0x1);
      this.canvasCtx.beginPath();
      this.canvasCtx.moveTo(this.xPos, this.yPos);
      this.canvasCtx.bezierCurveTo(
        this.xPos + this.width/2, this.yPos-this.height,
        this.xPos + this.width/2, this.yPos-this.height,
      this.xPos + this.width, this.yPos);
      this.canvasCtx.closePath();

        this.canvasCtx.filter = 'brightness(90%) hue-rotate(-25deg)';
      if (ODR.config.GRAPHICS_MOUNTAINS_TYPE == 'NORMAL') {
      }

      this.canvasCtx.fill();

      // cache shadow TODO make shadow reusable
      if (ODR.config.GRAPHICS_MOUNTAINS_TYPE != 'PLAIN') {
        if (!this.mntCanvas) {
          this.mntCanvas = document.createElement('canvas');
          this.mntCanvas.width = this.width;
          this.mntCanvas.height = this.height;
          this.mntCtx = this.mntCanvas.getContext('2d');
          this.mntCtx.fillStyle = '#452249';

          this.mntCtx.beginPath();
          this.mntCtx.moveTo(0, this.height);
          this.mntCtx.bezierCurveTo(
            this.width/2, 0,
            this.width/2, 0,
          this.width, this.height);
          this.mntCtx.closePath();
          this.mntCtx.clip();

          let w = this.width * 0.8;
          let x = 0, y = this.height;
          x-=w/30;y+=this.height/10;

          this.mntCtx.beginPath();
          this.mntCtx.globalAlpha = 0.7;
          this.mntCtx.filter = 'blur(10px)';
          this.mntCtx.moveTo(x, y);
          this.mntCtx.bezierCurveTo(
            x + w/2, y - this.height,
            x + this.width/2, y-this.height,
            x + w, y);
          this.mntCtx.closePath();
          this.mntCtx.fill();
        }

        this.canvasCtx.globalCompositeOperation = 'overlay';
        this.canvasCtx.drawImage(
          this.mntCanvas,0,0,this.width,this.height,
          this.xPos,this.yPos - this.height,this.width,this.height);
      } else {
        this.mntCanvas = null;
      }

    } this.canvasCtx.restore();
  }

  repaint(speed) {
    if (!this.remove) {
      this.xPos -= speed;
      this.draw();

      // Mark as removeable if no longer in the canvas.
      if (!this.isVisible()) {
        this.remove = true;
      }
    }
  }

  isVisible() {
    return this.xPos + this.width > 0;
  }
}

class NightMode {
  constructor(canvas, spritePos, containerWidth) {
    this.spritePos = spritePos;
    this.canvas = canvas;
    this.canvasCtx = canvas.getContext('2d');
    this.xPos = containerWidth - 50;
    this.yPos = 50;
//      this.nextPhase = NightMode.phases.length - 1;
    this.nextPhase = getRandomNum(0,6);
    this.currentPhase = this.nextPhase;
    this.opacity = 0;
    this.containerWidth = containerWidth;
    this.stars = [];
    this.placeStars();
  }

  repaint(activated, delta) {
    // Moon phase.
    if (activated && 0 == this.opacity) {
      this.currentPhase = this.nextPhase;
      this.nextPhase--;

      if (-1 == this.nextPhase) {
        this.nextPhase = 15;
      }
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
      this.xPos = this.adjustXPos(this.xPos, NightMode.config.MOON_SPEED);

      // Update stars.
      if (ODR.config.GRAPHICS_STARS_TYPE != 'NONE') {
        for (var i = 0, star; star = this.stars[i]; i++) {
          star.x = this.adjustXPos(star.x, NightMode.config.STAR_SPEED);
        }
      }
      this.draw();
    } else {
      this.placeStars();
    }
  }

  adjustXPos(currentPos, speed) {
    if (currentPos < -NightMode.config.WIDTH) {
      currentPos = this.containerWidth;
    } else {
      currentPos -= speed;
    }
    return currentPos;
  }

  draw() {
    var starSize = NightMode.config.STAR_SIZE;
    var starSourceX = OnDaRun.spriteDefinition.STAR.x;

    this.canvasCtx.save();

    this.canvasCtx.globalAlpha = this.opacity;

    let mx = Infinity, my = Infinity;

    if (ODR.config.GRAPHICS_MOON == 'SHINE') {
      let yShift = 7 - this.currentPhase;
      yShift *= yShift;
      let fw = 2 * (NightMode.config.WIDTH + NightMode.config.MOON_BLUR);
      let fh = NightMode.config.HEIGHT + NightMode.config.MOON_BLUR * 2;
      mx = Math.ceil(this.xPos/OnDaRun.defaultDimensions.WIDTH * (OnDaRun.defaultDimensions.WIDTH+fw*2) - fw - NightMode.config.MOON_BLUR);
      my = yShift + this.yPos - NightMode.config.MOON_BLUR;

      this.canvasCtx.drawImage(this.moonCanvas,
        this.currentPhase * fw, 0,
        fw, fh,
        mx, my,
        fw, fh);
        mx += fw/2;
        my += fh/2;
    } else if (ODR.config.GRAPHICS_MOON == 'NORMAL') {
      mx = Math.ceil(this.xPos);
      my = this.yPos;
      var moonSourceWidth = this.currentPhase%7 == 3
        ? NightMode.config.WIDTH * 2
        : NightMode.config.WIDTH;
      var moonSourceHeight = NightMode.config.HEIGHT;
      var moonSourceX = this.spritePos.x + NightMode.phases[this.currentPhase%7];
      var moonOutputWidth = moonSourceWidth;

      this.canvasCtx.drawImage(ODR.spriteScene, moonSourceX,
        this.spritePos.y, moonSourceWidth, moonSourceHeight,
        mx, my,
        moonOutputWidth, NightMode.config.HEIGHT);
      mx += moonOutputWidth/2;
      my += NightMode.config.HEIGHT/2;
    }

    this.canvasCtx.globalAlpha = 1;
    // Stars.

    if (ODR.config.GRAPHICS_STARS_TYPE != 'NONE') {
      for (var i = 0, star; star = this.stars[i]; i++) {

        if (ODR.config.GRAPHICS_STARS_TYPE != 'NORMAL') {
          let twinkle = ((star.x + 2*star.y)%10)/5;
          twinkle = 0.2
            + 0.8 * (twinkle > 1.0
              ? 2 - twinkle
              : twinkle);
          let alpha = this.opacity * star.opacity * twinkle;
          let dt = Math.abs(star.x - mx) + Math.abs(star.y - my) - 50;
            if (dt < 0) dt = 0; else if (dt > 50) dt = 50;

          this.canvasCtx.globalAlpha = alpha * dt/50;
        }

        this.canvasCtx.drawImage(ODR.spriteScene,
          starSourceX, star.sourceY, starSize, starSize,
          Math.ceil(star.x), star.y,
          NightMode.config.STAR_SIZE, NightMode.config.STAR_SIZE);
      }
    }

    this.canvasCtx.restore();
  }

  generateMoonCache() {
    let frameWidth = 2 * NightMode.config.WIDTH + 2 * NightMode.config.MOON_BLUR;
    let frameHeight = NightMode.config.HEIGHT + 2 * NightMode.config.MOON_BLUR;
    this.moonCanvas = document.createElement('canvas');
    this.moonCanvas.width = 16 * frameWidth;
    this.moonCanvas.height = frameHeight
    let ctx = this.moonCanvas.getContext('2d');
    ctx.filter = 'sepia(1)';

    for (let i = 0; i < 15; i++) {
      if (i >= 4 && i < 11 ) {
        ctx.drawImage(ODR.spriteScene,
          this.spritePos.x + 3 * NightMode.config.WIDTH, this.spritePos.y,
          NightMode.config.WIDTH * 2, NightMode.config.HEIGHT,
          i * frameWidth + NightMode.config.MOON_BLUR, NightMode.config.MOON_BLUR,
          NightMode.config.WIDTH * 2, NightMode.config.HEIGHT);
      }

      if (i < 4) {
        ctx.drawImage(ODR.spriteScene,
          this.spritePos.x + i * NightMode.config.WIDTH, this.spritePos.y,
          NightMode.config.WIDTH, NightMode.config.HEIGHT,
          NightMode.config.MOON_BLUR + i * frameWidth, NightMode.config.MOON_BLUR,
          NightMode.config.WIDTH, NightMode.config.HEIGHT);
      } else if ( i < 7 ) {
        ctx.save();
        ctx.globalCompositeOperation = 'destination-out';
        ctx.drawImage(ODR.spriteScene,
          this.spritePos.x + (i+1) * NightMode.config.WIDTH, this.spritePos.y,
          NightMode.config.WIDTH, NightMode.config.HEIGHT,
          NightMode.config.MOON_BLUR + i * frameWidth + NightMode.config.WIDTH, NightMode.config.MOON_BLUR,
          NightMode.config.WIDTH, NightMode.config.HEIGHT);
        ctx.restore();
      } else if (i < 11) {
        ctx.save();
        ctx.globalCompositeOperation = 'destination-out';
        ctx.drawImage(ODR.spriteScene,
          this.spritePos.x + (i-8) * NightMode.config.WIDTH, this.spritePos.y,
          NightMode.config.WIDTH, NightMode.config.HEIGHT,
          NightMode.config.MOON_BLUR + i * frameWidth, NightMode.config.MOON_BLUR,
          NightMode.config.WIDTH, NightMode.config.HEIGHT);
        ctx.restore();
      } else {
        ctx.drawImage(ODR.spriteScene,
          this.spritePos.x + (i-7) * NightMode.config.WIDTH, this.spritePos.y,
          NightMode.config.WIDTH, NightMode.config.HEIGHT,
          NightMode.config.MOON_BLUR + i * frameWidth + NightMode.config.WIDTH, NightMode.config.MOON_BLUR,
          NightMode.config.WIDTH, NightMode.config.HEIGHT);
      }
    }

    ctx.globalAlpha = 1.0;
    ctx.filter = 'sepia(1) blur('+NightMode.config.MOON_BLUR/8+'px)';
    ctx.drawImage(this.moonCanvas,0,0);

    ctx.filter = 'sepia(1) blur('+NightMode.config.MOON_BLUR/2+'px)';
    ctx.drawImage(this.moonCanvas,0,0);

    ctx.globalAlpha = 1;
    ctx.filter = 'sepia(1) blur(2px)';
    ctx.drawImage(this.moonCanvas,0,0);

  }

  placeStars() {
    var segmentSize = Math.round(this.containerWidth /
      NightMode.config.NUM_STARS);

    for (var i = 0; i < NightMode.config.NUM_STARS; i++) {
      this.stars[i] = {
        x: getRandomNum(segmentSize * i, segmentSize * (i + 1)),
        y: getRandomNum(0, NightMode.config.STAR_MAX_Y),
        opacity: 0.5 + 0.5 * Math.random(),
        sourceY: OnDaRun.spriteDefinition.STAR.y + NightMode.config.STAR_SIZE * (i%4),
        //hue: Math.floor(Math.random() * 360),
      };

      if (this.stars[i].y > NightMode.config.STAR_MAX_Y / 2) {
        this.stars[i].opacity *= 2 - this.stars[i].y/(0.5 * NightMode.config.STAR_MAX_Y);
      }
    }
  }

  reset() {
    //this.nextPhase = 0;
    this.repaint(false);
  }
}

class HorizonLine {
  constructor(canvas, spritePos) {
    this.spritePos = spritePos;
    this.canvas = canvas;
    this.canvasCtx = canvas.getContext('2d');
    this.sourceDimensions = {};
    this.dimensions = HorizonLine.dimensions;
    this.sourceXPos = [this.spritePos.x, this.spritePos.x +
      this.dimensions.WIDTH];
    this.xPos = 0;//[];
    this.yPos = 0;
    this.bumpThreshold = 0.5;
    this.grMode = -1;

    this.setSourceDimensions();
    this.draw();
  }

  setSourceDimensions() {
    for (var dimension in HorizonLine.dimensions) {
      if (dimension != 'YPOS') {
        this.sourceDimensions[dimension] =
        HorizonLine.dimensions[dimension] * 2;
      }

      this.dimensions[dimension] = HorizonLine.dimensions[dimension];
    }

    this.xPos = 0;//[0, HorizonLine.dimensions.WIDTH];
    this.yPos = HorizonLine.dimensions.YPOS;
  }

  getRandomType() {
      return Math.random() > this.bumpThreshold ? this.dimensions.WIDTH : 0;
  }

  generateGroundCache() {
    if (!this.groundCanvas) {
      this.groundCanvas = document.createElement('canvas');
      this.groundCanvas.width = OnDaRun.defaultDimensions.WIDTH;
      this.groundCanvas.height = 25 * ODR.config.GROUND_WIDTH;
    }
    let ctx = this.groundCanvas.getContext('2d');

    ctx.clearRect(0, 0, OnDaRun.defaultDimensions.WIDTH, this.groundCanvas.height);
    this.grMode = ODR.config.GRAPHICS_GROUND_TYPE;

    ctx.save();
    ctx.translate(0,25 - OnDaRun.defaultDimensions.HEIGHT);
    for (let i = 0; i < ODR.config.GROUND_WIDTH; i++) {

      if (ODR.config.GRAPHICS_GROUND_TYPE == 'STRIPES')
        this.drawGround(ctx, i, 'STRIPES',227,191,139);
      else {
        this.drawGround(ctx, i, 'STRIPES',137,150,90);
        this.drawGround(ctx, i, 'GRASS',32,128,0);
      }

      ctx.translate(0,25);
    }
    ctx.restore();
  }

  drawGround(canvasCtx, spinner, mode, r,g,b) {
    canvasCtx.save();
    canvasCtx.lineWidth = 5;
    canvasCtx.lineCap = 'butt';
    for ( let
      scale = 1.02, //Perspective
      step = 2,
      pwStep = Math.pow(scale, step),
      y = this.yPos + 12,
      i = -8,
      alphaStep = 0.15 * step / (OnDaRun.defaultDimensions.HEIGHT - y),
      pw = Math.pow(scale,i);

          y + i < OnDaRun.defaultDimensions.HEIGHT + this.canvasCtx.lineWidth;

              i += step, pw *= pwStep ) {

      let width = HorizonLine.dimensions.WIDTH / pw;

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
            this.grassMapOffset.push(getRandomNum(0,4));
            let gr = false;

            sum = ODR.config.GROUND_WIDTH/2;
            do {
              n = gr ? getRandomNum(3,5) : getRandomNum(0,1);
              gr = !gr;
              if (sum < n) {
                n = sum;
              }
              sum -= n;
              l.push(n);
            } while (sum > 0);

            sum = ODR.config.GROUND_WIDTH/2;
            do {
              n = gr ? getRandomNum(2,8) : getRandomNum(1,2);
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
          canvasCtx.lineDashOffset = -spinner + s + ~~(i*i/8) - width/2;
          canvasCtx.stroke();
        }
      }

      canvasCtx.restore();
    }
    canvasCtx.restore();
  }

  draw() {

    this.canvasCtx.drawImage(ODR.spriteScene, ~~-this.xPos,
      104,
      600, 46,
      0, 170,
      600, 46);

    if (ODR.config.GRAPHICS_GROUND_TYPE == 'DIRT') return;

    if (ODR.config.GRAPHICS_GROUND_TYPE != this.grMode) {
      this.generateGroundCache();
    }

    this.canvasCtx.drawImage(this.groundCanvas,
        0, 3 * (~~this.xPos+1800) % ODR.config.GROUND_WIDTH * 25 + 2,
        OnDaRun.defaultDimensions.WIDTH, 22,
        0, OnDaRun.defaultDimensions.HEIGHT - 22,
        OnDaRun.defaultDimensions.WIDTH, 22);

  }

  repaint(deltaTime, speed) {
    var increment = speed * FPS / 1000 * deltaTime;
    if (ODR.config.GRAPHICS_GROUND_TYPE != 'DIRT') increment /= 3;

    this.xPos -= increment;
    if (-this.xPos > 1800) {
      this.xPos += 1800;
    }

    this.draw();
  }

  reset() {
    //this.xPos[1] = HorizonLine.dimensions.WIDTH;
  }
}

class Horizon {
  constructor(canvas, spritePos, dimensions, gapCoefficient) {
    this.canvas = canvas;
    this.canvasCtx = this.canvas.getContext('2d');
    this.config = Horizon.config;
    this.dimensions = dimensions;
    this.gapCoefficient = gapCoefficient;
    this.obstacles = [];
    this.obstacleHistory = [];
    this.horizonOffsets = [0, 0];
    this.cloudFrequency = this.config.CLOUD_FREQUENCY;
    this.spritePos = spritePos;
    this.nightMode = null;

    // Cloud
    this.clouds = [];
    this.cloudSpeed = this.config.BG_CLOUD_SPEED;

    this.mountains = [];
    this.oldMountains = [];
    this.mountainSpeed = 6;

    // Horizon
    this.horizonLine = null;
    this.init();
  }

  init() {
    this.addCloud();
    this.horizonLine = new HorizonLine(this.canvas, this.spritePos.HORIZON);
    this.nightMode = new NightMode(this.canvas, this.spritePos.MOON,
      this.dimensions.WIDTH);
    this.addMountains();
    this.addMountains();
    this.oldMountains = this.mountains;
    this.mountains = [];
  }

  repaint(deltaTime, currentSpeed, repaintObstacles, showNightMode, alpha) {
    this.runningTime += deltaTime;
    this.nightMode.repaint(showNightMode,deltaTime);
    this.repaintClouds(deltaTime, currentSpeed, true);
    this.repaintMountains(deltaTime, currentSpeed);
    this.repaintClouds(deltaTime, currentSpeed);
    this.horizonLine.repaint(deltaTime, currentSpeed);

    if (repaintObstacles) {
      if (alpha == 1) {
        this.repaintObstacles(deltaTime, currentSpeed);
      } else {
        this.canvasCtx.save();
        this.canvasCtx.globalAlpha = alpha;
        this.repaintObstacles(deltaTime, currentSpeed);
        this.canvasCtx.restore();
      }
    }
  }

  repaintClouds(deltaTime, speed, background) {
    var cloudSpeed = this.cloudSpeed / 1000 * deltaTime * speed;
    var numClouds = this.clouds.length;

    if (numClouds) {
      for (var i = numClouds - 1; i >= 0; i--) {
        if (background && this.clouds[i].opacity < 0.5) {
          this.clouds[i].repaint(cloudSpeed);
        } else if (!background && this.clouds[i].opacity >= 0.5) {
          this.clouds[i].repaint(cloudSpeed);
        }
      }

      var lastCloud = this.clouds[numClouds - 1];

      // Check for adding a new cloud.
      if (!background && numClouds < this.config.MAX_CLOUDS &&
          (this.dimensions.WIDTH - lastCloud.xPos) > lastCloud.cloudGap &&
          ODR.config.GRAPHICS_CLOUDS/10 * this.cloudFrequency > Math.random()) {
        this.addCloud();
      }

      // Remove expired clouds.
      if(!background) {
        this.clouds = this.clouds.filter(obj => {
          return !obj.remove;
        });
      }
    } else {
      this.addCloud();
    }
  }

  repaintMountains(deltaTime, speed) {
    var mountainSpeed = this.mountainSpeed / 1000 * deltaTime * speed;
    var numMountains = this.mountains.length;

    if (numMountains) {
      for (let j = 0; j < 2; j++) {
        for (let i = numMountains - 1; i >= 0; i--) {
          if (this.mountains[i].depth == j) {
            this.mountains[i].repaint(mountainSpeed * (j ? 1.1 : 1));
          }
        }
      }

      var lastMountain = this.mountains[numMountains - 1];

      if (numMountains < 10 &&
          (this.dimensions.WIDTH - lastMountain.xPos) > lastMountain.mountainGap &&
          this.mountainFrequency > Math.random()) {
        this.addMountains();
      }

      this.mountains = this.mountains.filter(obj => {
        if (obj.remove) {
          this.oldMountains.push(obj);
          obj.remove = false;
          return false;
        }
        return true;
      });
    } else {
      this.addMountains();
    }
  }

  repaintObstacles(deltaTime, currentSpeed) {
    // Obstacles, move to Horizon layer.
    for (let i = 0; i < this.obstacles.length; i++) {
      var obstacle = this.obstacles[i];
      obstacle.repaint(deltaTime, currentSpeed);
    }
    // TODO better sort;

    this.obstacles = this.obstacles.filter(obstacle => !obstacle.remove);

    let i = this.obstacles.length;
    TEST_GAP: if (i) {
      let obs = this.obstacles[0];
      let maxGapDist = 0;
      do { i--;
        obs = this.obstacles[i];
        let dist = obs.xPos + obs.width + obs.gap;
        if (dist <= obs.gap) continue;
        if (dist > this.dimensions.WIDTH) break TEST_GAP;
        if (dist > maxGapDist) {
          maxGapDist = dist;
        }
      } while (i);

      if (maxGapDist) {
        this.addObstacle(currentSpeed);
      }
    } else {
      this.addObstacle(currentSpeed);
    }

    /* //Old tester
    if (this.obstacles.length) {
      var lastObstacle = this.obstacles[this.obstacles.length - 1];

      if (lastObstacle
          && !lastObstacle.followingObstacleCreated
          && lastObstacle.isVisible()
          && (lastObstacle.xPos + lastObstacle.width + lastObstacle.gap) <
                this.dimensions.WIDTH) {
        this.addObstacle(currentSpeed);
        lastObstacle.followingObstacleCreated = true;
      }
    } else {
      // Create new obstacles.
      this.addObstacle(currentSpeed);
    }
    */
  }

  removeFirstObstacle() {
    this.obstacles.shift();
  }

  addObstacle(currentSpeed) {
    if (!ODR.shouldAddObstacle) {
      return;
    }

    var obstacleTypeIndex = getRandomNum(0, Obstacle.types.length - 1);
    var obstacleType = Obstacle.types[obstacleTypeIndex];

    // Check for multiples of the same type of obstacle.
    // Also check obstacle is available at current speed.
    if (this.duplicateObstacleCheck(obstacleType.type)
      || currentSpeed < obstacleType.minSpeed) {
      this.addObstacle(currentSpeed);
    } else {
      var obstacleSpritePos = this.spritePos[obstacleType.type];

      if (obstacleType.type == 'VELOTA') {
        ODR.playSound(ODR.soundFx.SOUND_BICYCLE,0.5,false,0,1);
      }

      if (obstacleType.type == 'LIVER' || obstacleType.type == 'RUBBER') {

        if (!getRandomNum(0,5)) {

          // Sweepers
          for (let i = -2; i <= 2; i+=getRandomNum(1,2)) {
            let duck = new Obstacle(this.canvasCtx, obstacleType,
            obstacleSpritePos, this.dimensions,
            this.gapCoefficient, currentSpeed, obstacleType.width)

            duck.currentFrame = getRandomNum(0, 5);
            duck.yPos = OnDaRun.defaultDimensions.HEIGHT - ((i+5) * 25);

            duck.xPos += i*2
            if (obstacleType.type == 'LIVER') {
              duck.xPos += 30 * Math.abs(i);
            } else {
              duck.xPos += 70 + 30 * -Math.abs(i);
            }
            duck.xPos += getRandomNum(-10,10);
            duck.yPos += getRandomNum(-2,2);
            duck.speedFactor *= (0.8 + Math.random() * 0.2);

            this.obstacles.push(duck);

          }
        } else {
          let duck = new Obstacle(this.canvasCtx, obstacleType,
          obstacleSpritePos, this.dimensions,
          this.gapCoefficient, currentSpeed, obstacleType.width)
          this.obstacles.push(duck);
        }

      } else
      this.obstacles.push(new Obstacle(this.canvasCtx, obstacleType,
        obstacleSpritePos, this.dimensions,
        this.gapCoefficient, currentSpeed, obstacleType.width));

      this.obstacleHistory.unshift(obstacleType.type);

      if (this.obstacleHistory.length > 1) {
        this.obstacleHistory.splice(ODR.config.MAX_OBSTACLE_DUPLICATION);
      }
    }
  }

  duplicateObstacleCheck(nextObstacleType) {
    var duplicateCount = 0;

    for (var i = 0; i < this.obstacleHistory.length; i++) {
      duplicateCount = this.obstacleHistory[i] == nextObstacleType ?
        duplicateCount + 1 : 0;
    }
    return duplicateCount >= ODR.config.MAX_OBSTACLE_DUPLICATION;
  }

  reset() {
    this.obstacles = [];
    this.horizonLine.reset();
    this.nightMode.reset();
  }

  resize(width, height) {
    this.canvas.width = width;
    this.canvas.height = height;
  }

  addCloud() {
    if (ODR.config.GRAPHICS_CLOUDS == 0) {
      return
    }

    let type = getRandomNum(0,this.spritePos.CLOUD.y.length - 1);
    let len = this.clouds.length;
    if (len >= 2) {
      if (this.clouds[len-1].type == this.clouds[len-2].type && this.clouds[len-2].type == type) {
        type++;
        type %= this.spritePos.CLOUD.y.length;
      }
    }

    this.clouds.push(new Cloud(this.canvas, this.spritePos.CLOUD,
      this.dimensions.WIDTH, type));
  }

  addMountain(distance, level) {
    let mountain;
    //TODO elevate mounains randomly to reduce cache size.
    if (this.oldMountains.length > 10) {
      mountain = this.oldMountains.splice(getRandomNum(0,10),1)[0];
      mountain.xPos = distance;
      mountain.remove = false;
      mountain.depth = level;
    } else {
      mountain = new Mountain(this.canvas, distance, level);
    }

    this.mountains.push(mountain);

    let adjusted;
    let mountains = this.mountains;
    do {
      adjusted = false;
      let untested = [];

      mountains.forEach(mnt => {
        if (mountain.xPos > mnt.xPos && mountain.xPos + mountain.width < mnt.xPos + mnt.width) {
          mountain.xPos +=  mnt.width - mountain.width/2 + getRandomNum(0,100);
          adjusted = true;
        } else {
          untested.push(mnt);
        }
      });
      mountains = untested;
    } while (adjusted);
  }

  addMountains() {
    this.addMountain(this.dimensions.WIDTH + getRandomNum(0,1000), 0);
    this.addMountain(this.dimensions.WIDTH + getRandomNum(100,900), 0);
    this.addMountain(this.dimensions.WIDTH + getRandomNum(200,800), 0);
    this.addMountain(this.dimensions.WIDTH + getRandomNum(100,900), 1);
    this.addMountain(this.dimensions.WIDTH + getRandomNum(200,800), 1);
    this.addMountain(this.dimensions.WIDTH + getRandomNum(300,700), 1);
  }
}

Horizon.config = {
  BG_CLOUD_SPEED: 7,
  BUMPY_THRESHOLD: .3,
  CLOUD_FREQUENCY: .5,
  HORIZON_HEIGHT: 16,
  MAX_CLOUDS: 8
};

class A8e {
  constructor (canvas, spritePos) {
    this.canvas = canvas;
    this.canvasCtx = canvas.getContext('2d');
    this.spritePos = spritePos;
    this.xPos = 0;
    this.yPos = 0;
    // Position when on the ground.
    this.groundYPos = 0;

    this.currentFrame = 0;
    this.currentAnimFrames = [];
    this.animStartTime = 0;
    this.timer = 0;
    this.msPerFrame = 1000 / FPS;
    this.config = A8e.config;
    this.config.GRAVITY_FACTOR = 0.0000005 * A8e.config.GRAVITY * ODR.config.SCALE_FACTOR;
    // Current status.
    //this.status = A8e.status.WAITING;

    this.slidingGuideIntensity = 0;
    this.jumpingGuideIntensity = 0;
    this.dust = new Particles(canvas, this.xPos, this.yPos, A8e.config.DUST_DURATION);

    this.init();
  }

  init() {
    this.groundYPos = OnDaRun.defaultDimensions.HEIGHT - this.config.HEIGHT -
      ODR.config.BOTTOM_PAD;
    this.yPos = this.groundYPos;
    this.minJumpHeight = this.groundYPos - this.config.MIN_JUMP_HEIGHT;

    /*
    this.currentAnimFrames = A8e.animFrames.WAITING.frames;
    this.currentSprite = A8e.animFrames.WAITING.sprite;
    this.currentFrame = 0;

    this.draw(0, 0);
    */
  }

  getCollisionBoxes() {
//    switch (this.status) {
    switch (ODR.activeAction.type) {
      case A8e.status.SLIDING:
        return A8e.collisionBoxes.SLIDING

      case A8e.status.RUNNING:
      default:
        return A8e.collisionBoxes.RUNNING;
    }
  }

  testCollision(obstacle) {
    var obstacleBoxXPos = OnDaRun.defaultDimensions.WIDTH + obstacle.xPos;

    // Adjustments are made to the bounding box as there is a 1 pixel white
    // border around Amandarine and obstacles.
    var amandarineBox = new CollisionBox(
      this.xPos + 1,
      this.yPos + 1,
      this.config.WIDTH - 2,
      this.config.HEIGHT - 2);

    var obstacleBox = new CollisionBox(
      obstacle.xPos + 1,
      obstacle.yPos + 1,
      obstacle.typeConfig.width * obstacle.size - 2,
      obstacle.typeConfig.height - 2);

    // Simple outer bounds check.
    if (amandarineBox.intersects(obstacleBox)) {
      var collisionBoxes = obstacle.collisionBoxes;
      var amandarineCollisionBoxes = this.getCollisionBoxes();

      // Detailed axis aligned box check.

      let retA = new CollisionBox();
      let retB = new CollisionBox();

      for (var t = 0; t < amandarineCollisionBoxes.length; t++) {
        retA.x = amandarineCollisionBoxes[t].x + amandarineBox.x;
        retA.y = amandarineCollisionBoxes[t].y + amandarineBox.y;
        retA.width = amandarineCollisionBoxes[t].width;
        retA.height = amandarineCollisionBoxes[t].height;

        for (var i = 0; i < collisionBoxes.length; i++) {
          retB.x = collisionBoxes[i].x + obstacleBox.x;
          retB.y = collisionBoxes[i].y + obstacleBox.y;
          retB.width = collisionBoxes[i].width;
          retB.height = collisionBoxes[i].height;
          // Adjust the box to actual positions.

          if (retA.intersects(retB)) {
            return [retA, retB];
          }
        }
      }
    }
    return false;
  }

  draw(x, y) {
    console.trace();
    var sourceX = x * 2;
    var sourceY = y * 2;

    // Adjustments for sprite sheet position.
    sourceX += this.spritePos.x;
    sourceY += this.spritePos.y;

    if (this.currentSprite) {

      // shadow test
      /*
      this.canvasCtx.save(); {
        this.canvasCtx.translate(Math.floor(this.xPos), 150);
        let b = new CollisionBox(0,0,0,0);
        A8e.collisionBoxes.SLIDING.forEach(bb => b = b.union(bb) );
        this.canvasCtx.translate(0, b.maxY());
        this.canvasCtx.scale(1,-0.15);
        this.canvasCtx.translate(0, -b.maxY());
        this.canvasCtx.filter = 'brightness(0)';
        let distFactor = Math.max(0,1-Math.abs(this.yPos - 150)/200);
        this.canvasCtx.globalAlpha = 0.2 * distFactor;
        //this.canvasCtx.globalAlpha = 0.3 ;
        distFactor = distFactor - 1;
        this.canvasCtx.drawImage(this.currentSprite, sourceX, sourceY, 40, 40,
          5 * (this.xPos-300)/250 + distFactor * (300 - this.xPos) / 3.5,
          distFactor * 20,
          this.config.WIDTH, this.config.HEIGHT);
      } this.canvasCtx.restore();
      */


      this.canvasCtx.drawImage(this.currentSprite, sourceX, sourceY, 40, 40,
        ~~this.xPos, ~~this.yPos,
        this.config.WIDTH, this.config.HEIGHT);

      if (ODR.config.GRAPHICS_DUST != 'NONE') this.dust.draw();

    }
  }

  enactAction(action, deltaTime, speed) {
    console.assert(action && action.priority != -1, action);

    let adjustXToStart = () => {
      if (this.xPos < this.config.START_X_POS) {
        this.xPos += 0.2 * speed * (FPS / 1000) * deltaTime;
        if (this.xPos > this.config.START_X_POS) {
          this.xPos = this.config.START_X_POS;
        }
      } else if (this.xPos > this.config.START_X_POS) {
        this.xPos -= 0.2 * speed * (FPS / 1000) * deltaTime;
        if (this.xPos < this.config.START_X_POS) {
          this.xPos = this.config.START_X_POS;
        }
      }
    }

    if (action.hasOwnProperty('setXPos')) {
      this.xPos = action.setXPos;
      delete action.setXPos;
    }


    if (!action.frames) {
      Object.assign(action, A8e.animFrames[action.type]);
      action.currentFrame = 0;
    }

    switch (action.type) {
      case A8e.status.WAITING:
        if (action.heldStart) {
          if (action.timer - action.heldStart > 450) action.heldStart = action.timer - 450;
          action.currentFrame = 72 + ~~((action.timer - action.heldStart)/150);
        } else {
          //let xMap = [2,1,-2,-3,-2,1], yMap = [1,0,-2,-2,-2,0];
          let yMap = [0,2,3,2,0];
          this.canvasCtx.drawImage(ODR.spriteGUI, 0, 96, 105, 54,
            Math.round(this.xPos + 20),
            Math.round(this.yPos + yMap[(action.timer>>7)%5] - 50), 105, 54);
        }
        break;
      case A8e.status.RUNNING: {

        if (action.speed != speed) {
          let sp = action.speed - speed;
          //if (speed) console.log('here')
          let increment = sp * FPS / 1000 * deltaTime;
          this.xPos += increment;
        } else {
          adjustXToStart(speed);
        }

      } break;
      case A8e.status.JUMPING: {
        if (action.timer == 0) {
          ODR.playSound(ODR.soundFx.SOUND_JUMP,0.4);
          ODR.playSound(ODR.soundFx.SOUND_DROP,0.4 * action.pressDuration/ODR.config.MAX_ACTION_PRESS);
        }

        let timer = action.halfTime - action.timer;

        adjustXToStart();
        this.yPos = this.groundYPos
          + ( this.config.GRAVITY_FACTOR * timer * timer
              - action.top * ODR.config.SCALE_FACTOR );

        if (timer < -action.halfTime) {
          ODR.playSound(ODR.soundFx.SOUND_DROP,0.6 * action.pressDuration/ODR.config.MAX_ACTION_PRESS);
          action.priority = -1;
          this.yPos = this.groundYPos;
          if (ODR.config.GRAPHICS_DUST != 'NONE') {
            this.dust.xPos = this.xPos - 24;
            this.dust.addPoint(0, 0, -40, -10 * Math.random());
          }
        }
      } break;
      case A8e.status.SLIDING: {
        var increment = speed * FPS / 1000 * deltaTime;

        if (action.distance == 0 && increment > 0) {
          ODR.playSound(ODR.soundFx.SOUND_SLIDE,0.6);
        }

        action.distance += increment;

        let it = action.fullTime - action.timer/1000;
          if (it < 0) it = 0;
        let distance = action.fullDistance - 1/2 * it * it * action.friction - action.distance;

        this.xPos = action.xPos + distance;
        //Sliding animation

        if (ODR.config.GRAPHICS_DUST != 'NONE'
            && this.dust.points.length < action.timer / 30) {
          this.dust.xPos = this.xPos - 24;
          let dsp = (action.speed ? action.speed : speed) / 6;
          this.dust.addPoint(-10, 0, dsp * -90, dsp * -15 * Math.random());
          this.dust.addPoint(5, 0, dsp * -75, dsp * -15 * Math.random());
        }

        if (action.timer >= action.fullTime * 1000) {
          action.priority = -1;

          // Make sure for no fallback after sliding.
          if (this.xPos < this.config.START_X_POS) {
            this.xPos = this.config.START_X_POS;
          }
        }
      } break;
      case A8e.status.CRASHED: {
        if (ODR.config.GRAPHICS_DISPLAY_INFO == 'YES') {
          this.canvasCtx.save();
          this.canvasCtx.strokeStyle = "orange";
          this.canvasCtx.strokeRect(action.boxes[0].x,action.boxes[0].y,action.boxes[0].width,action.boxes[0].height);
          this.canvasCtx.strokeStyle = "lime";
          this.canvasCtx.strokeRect(action.boxes[1].x,action.boxes[1].y,action.boxes[1].width,action.boxes[1].height);
          this.canvasCtx.fillStyle = this.canvasCtx.strokeStyle = "red";
          this.canvasCtx.fillRect(...Object.values(action.boxes[0].intersection(action.boxes[1])));
          this.canvasCtx.strokeRect(...Object.values(action.boxes[0].intersection(action.boxes[1])));
          this.canvasCtx.restore();
        }

        let timer = action.halfTime - action.timer;

        action.currentFrame = action.dir == 1 ? 1 : 0;
        this.yPos = action.yCrashed
          + ( this.config.GRAVITY_FACTOR/4 * timer * timer
              - action.top * ODR.config.SCALE_FACTOR );
        this.xPos += deltaTime/10 * action.dir;

        // Drag the scene slower on crashing.
        ODR.setSpeed(Math.max(0, action.lagging * (3000-action.timer)/3000));
      } break;
      default:;
    }

    this.canvasCtx.drawImage(action.sprite,
      action.frames[action.currentFrame], 0, 40, 40,
      ~~this.xPos, ~~this.yPos,
      this.config.WIDTH, this.config.HEIGHT);

    if (ODR.config.GRAPHICS_DUST != 'NONE') {
      this.dust.repaint(deltaTime);
    }

    action.timer += deltaTime;
    action.currentFrame = ~~(action.timer / action.msPerFrame) % action.frames.length;

    if (!action || action.priority == -1) return false;

    return true;
  }

  drawJumpingGuide(action, now, speed) {
    if (action.start) return;
    /* Draw jumping guide */

    action.willEnd(now,speed);

    this.canvasCtx.save(); {
      this.canvasCtx.beginPath();
      this.canvasCtx.strokeStyle = "white";

      let baseX = this.xPos + 12;
      let baseY = this.groundYPos + 35;
      let shiftLeft = 0;
      let fadeOut = 1;
      let DRAW_STEP = 50;
      var increment = speed * 0.001 * FPS * DRAW_STEP;

      if (action.priority == 2) {
        let last = now - action.end;
        shiftLeft = increment * last / DRAW_STEP;
        fadeOut = (action.halfTime - last) / action.halfTime;
          if (fadeOut < 0) fadeOut = 0;
      }

      let unit = action.halfTime * 2 / DRAW_STEP;
      let gravityFactor = 0.0000005 * A8e.config.GRAVITY;
      this.canvasCtx.moveTo(
        baseX + unit*increment - shiftLeft,
        baseY - (action.top - (gravityFactor * action.halfTime * action.halfTime)) * ODR.config.SCALE_FACTOR
      );

      for (let timer = action.halfTime; timer > - action.halfTime - DRAW_STEP; timer-= DRAW_STEP, unit--) {
        let drawY = baseY - (action.top - (gravityFactor * timer * timer)) * ODR.config.SCALE_FACTOR;
        let drawX = baseX + unit*increment - shiftLeft;

        if (drawX < this.xPos + 20 && drawY > baseY - 60 ) {
          break;
        }

        this.canvasCtx.lineTo(drawX, drawY);
      }

      now = (now/10)%40;
      let alpha = fadeOut * (action.halfTime-150)/200;
        if (alpha > 1) alpha = 1;

      this.canvasCtx.lineCap = 'round';
      this.canvasCtx.setLineDash([0,20]);
      this.canvasCtx.globalAlpha = this.jumpingGuideIntensity * alpha;
      this.canvasCtx.lineWidth = alpha*5;
      this.canvasCtx.lineDashOffset = now;
      this.canvasCtx.stroke();
    } this.canvasCtx.restore();

  }

  drawSlidingGuide(action, now, speed) {
    if (action.start) return;

    let baseX = this.xPos;
    let alpha;

    action.willEnd(now,speed);
    if (action.priority != 0) {
      baseX = this.config.START_X_POS - action.distance;
      alpha = (action.fullDistance - action.distance)/action.fullDistance;
      alpha *= alpha;
    } else {
      alpha = action.pressDuration/ODR.config.MAX_ACTION_PRESS;
    }

    let frame = ~~(now / A8e.animFrames.SLIDING.msPerFrame) % 3;

    this.canvasCtx.save();

    for (let i = 0, len = ODR.config.GRAPHICS_SLIDE_STEPS, s = 0, sd = Math.abs(now/100%4 - 2);
        i < len; i++, s+=sd) {
      this.canvasCtx.globalAlpha = this.slidingGuideIntensity * alpha/(1<<i);
      this.canvasCtx.drawImage(A8e.animFrames.SLIDING.sprite,
        A8e.animFrames.SLIDING.frames[(frame+i)%3], 40, 40, 40,
        ~~(baseX + action.fullDistance - i * 30 *alpha) - s*s, this.groundYPos,
        this.config.WIDTH, this.config.HEIGHT);
    }

    this.canvasCtx.restore();
  }

  reset() {
    this.yPos = this.groundYPos;
    this.xPos = -40;// this.config.START_X_POS;
    this.dust.reset();

    let endTime = getTimeStamp();
    let startingSlide = new SlideAction(endTime - ODR.config.MAX_ACTION_PRESS, 7.2);
    startingSlide.priority = 1;
    startingSlide.start = ODR.playCount;
    startingSlide.end = endTime;
      startingSlide.maxPressDuration = 1500;

    ODR.queueAction(startingSlide);
//    ODR.queueAction(ODR.defaultAction);
  }
}

A8e.config = {
  DUST_DURATION: 600,
  GRAVITY: 9.8,
  FRICTION: 9.8,
  HEIGHT: 40,
  INTRO_DURATION: 400,
  MAX_JUMP_HEIGHT: 30,
  MIN_JUMP_HEIGHT: 30,
  SPRITE_WIDTH: 262,
  START_X_POS: 25,
  WIDTH: 40,
};

A8e.collisionBoxes = {
  SLIDING: [
    new CollisionBox(11, 12, 15, 12),
    new CollisionBox(11, 25, 17, 12),
    new CollisionBox(28, 32, 5, 5)
  ],
  RUNNING: [
    new CollisionBox(15, 4, 15, 19),
    new CollisionBox(12, 16, 16, 19)
  ]
};

A8e.status = {
  CRASHED: 'CRASHED',
  SLIDING: 'SLIDING',
  JUMPING: 'JUMPING',
  RUNNING: 'RUNNING',
  WAITING: 'WAITING'
};

A8e.animFrames = {
  WAITING: {
    frames: [
    0, 40, 160, 160, 80, 120, 160, 160,
    0, 40, 160, 160, 80, 120, 160, 160,
    0, 40, 160, 160, 80, 120, 160, 160,
    200, 240, 360, 360, 280, 320, 360, 360,
    0, 40, 160, 160, 80, 120, 160, 160,
    0, 40, 160, 160, 80, 120, 160, 160,
    200, 240, 360, 360, 280, 320, 360, 360,
    0, 40, 160, 160, 80, 120, 160, 160,
    0, 40, 160, 160, 80, 120, 160, 160,
    400, 440, 480, 520, 520, 520, 520, 520, 520, 480, 440],
    msPerFrame: 1000 / 8
  },
  WALKING: {
    frames: [0, 40, 80, 120, 160, 200],
    msPerFrame: 1000 / 6
  },
  RUNNING: {
    frames: [0, 40, 80, 120, 120, 160, 200, 240, 280, 280],
    msPerFrame: 1000 / 28
  },
  CRASHED: {
    frames: [0,40],
    msPerFrame: Infinity
  },
  JUMPING: {
    frames: [0,40,80,120,120],
    msPerFrame: 1000 / 4,
    //extended: true // this will need a duration to be defined.
  },
  SLIDING: {
    frames: [0, 40, 80, 40],
    msPerFrame: 1000 / 12
  }
};

class Text {
  constructor(maxLength,alignment,text) {
    this.alignment = alignment;
    this.maxLength = maxLength;
    this.glyphs = [];
    this.minLength = 0;
    if (text) {
      this.setText(text);
    }
  }

  setText(messageStr) {
    messageStr = messageStr.split('##').join(String.fromCharCode(0xe000));
    messageStr = messageStr.split('#natA').join(String.fromCharCode(0xe001));
    messageStr = messageStr.split('#natB').join(String.fromCharCode(0xe002));
    messageStr = messageStr.split('#slide').join(String.fromCharCode(0xe003));
    messageStr = messageStr.split('#jump').join(String.fromCharCode(0xe004));
    messageStr = messageStr.split('#google').join(String.fromCharCode(0xe00a));
    messageStr = messageStr.split('#facebook').join(String.fromCharCode(0xe00b));
    messageStr = messageStr.split('#twitter').join(String.fromCharCode(0xe00c));
    messageStr = messageStr.split('#redcross').join(String.fromCharCode(0xe00d));
    messageStr = messageStr.split('#tangerine').join(String.fromCharCode(0xe00e));
    messageStr = messageStr.split('#a').join(String.fromCharCode(0xe00f));
    messageStr = messageStr.split('#trophy').join(String.fromCharCode(0xe010));
    messageStr = messageStr.split('#<3').join(String.fromCharCode(0xe011));

    if (!messageStr.length) return this;

 //TODO multi-widths,multi-offsets
    let lineLength = this.maxLength || 20;
    let wordList = messageStr.toString().split(' ');
    let newList = [wordList[0]];
    this.minLength = Math.max(wordList[0].length,this.minLength);

    for (let i = 1, cur = wordList[0].length ; i < wordList.length ; i++) {
      let words = wordList[i].split('\n');

      words.forEach((w,index) => {
        if (cur == 0) {
          /* 0st word */
        } else if (cur + 1 + w.length > lineLength) {
          cur = 0;
          newList.push('\n');
        } else if (index) {
          newList.push('\n');
          cur = 0;
        } else {
          newList.push(' ');
          cur++;
        }
        newList.push(w);
        cur += w.length;
        this.minLength = Math.max(cur,this.minLength);
      });

    }
    messageStr = newList.join('');

    this.glyphs = [...messageStr.toUpperCase()].map(ch => {
      let code = ch.charCodeAt(0);
      if (code >= 65 && code <= 90) {
        return 140 + (code - 65) * 14;
      }
      if (code >= 48 && code <= 57) {
        return (code - 48) * 14;
      }

      switch(code) {
        case 0xe000: return 784;
        case 0xe001: return 630;
        case 0xe002: return 770;
        case 0xe003: return 812;
        case 0xe004: return 826;
        case 0xe00a: return 882;
        case 0xe00b: return 896;
        case 0xe00c: return 938;
        case 0xe00d: return 798;
        case 0xe00e: return 854;
        case 0xe00f: return 644;
        case 0xe010: return 868;
        case 0xe011: return 616;
      }

      switch (ch) {
        case '.': return 504;
        case '?': return 518;
        case '!': return 532;
        case '▻': return 546;
        case '/': return 560;
        case '-': return 574;
        case '_':
        case ' ': return 588;
        case '♬': return 602;
        case '◅': return 658;
        case '"': return 672;
        case "'": return 686;
        case "☼": return 700;
        case ',': return 714;
        case ';': return 720;
        case ':': return 742;
        case '⚽': return 756;
        case '+': return 840;
        case '[': return 910;
        case ']': return 924;
        case '%': return 952;
        default: return -code;
      }
    });

    return this;
  }

  draw(canvasCtx, offsetX, offsetY, glyphW, glyphH, image) {
    glyphW = glyphW || 14;
    glyphH = glyphH || 20;
    image = image || ODR.spriteGUI;

    switch (this.alignment) {
      default:
      case -1:
        break;
      case 0:
        offsetX += glyphW * (this.maxLength - this.minLength)/2;
        break;
      case 1:
        offsetX += glyphW * (this.maxLength - this.minLength);
        break;
    }

    for (let i = 0, cur = 0, l = 0; i < this.glyphs.length; i++) {
      let x = this.glyphs[i];
      if (x == -10) {
        cur = 0;
        l++;
        continue;
      }
      canvasCtx.drawImage(image,
        x, 0, 14, 16,
        ~~offsetX + cur * glyphW,
        offsetY + glyphH * l,
          14, 16);
      cur++;
    }
  }

  drawText(messageStr, canvasCtx, offsetX, offsetY, glyphW, glyphH, image) {
    this.setText(messageStr);
    this.draw(canvasCtx, offsetX, offsetY, glyphW, glyphH, image);
  }
}

class Terminal {
  constructor(canvas, spritePos) {
    this.canvas = canvas;
    this.canvasCtx = canvas.getContext('2d');
    this.y = 5;
    this.timer = 0;
    this.init();
    this.text = new Text(20);
  }

  init() {
    this.opacity = 0;
  }

  setMessages(messageStr, timer, opt_lineWidth) {
    this.timer = timer || 2000;
    this.text.setText(messageStr);
  }

  repaint(deltaTime) {
    if (this.timer > 0) {

      if (this.timer > 500) this.opacity += deltaTime/100;
      else this.opacity -= deltaTime/200;
        if (this.opacity > 1) this.opacity = 1;
        else if (this.opacity < 0) this.opacity = 0;

      this.opacity +=
        this.timer > 500
        ? deltaTime / 200
        : -deltaTime / 200;
          if (this.opacity < 0) this.opacity = 0;
          else if (this.opacity > 1) this.opacity = 1;

      this.canvasCtx.save();
      this.canvasCtx.globalAlpha = this.opacity;
      this.text.draw(this.canvasCtx, 14 - 20*(1 - this.opacity), 10, Math.ceil(14*this.opacity), Math.ceil(16*this.opacity));
      this.canvasCtx.restore();
      this.timer -= deltaTime;
    }
  }
}

class DistanceMeter {
  constructor(canvas, spritePos, canvasWidth) {
    this.canvas = canvas;
    this.canvasCtx = canvas.getContext('2d');
    this.image = ODR.spriteGUI;
    this.spritePos = spritePos;
    this.x = 0;
    this.y = 5;

    this.currentDistance = 0;
    this.maxScore = 0;
    this.highScore = 0;
    this.container = null;

    this.digits = [];
    this.acheivement = false;
    this.defaultString = '';
    this.flashTimer = 0;
    this.flashIterations = 0;
    this.invertTrigger = false;

    this.config = DistanceMeter.config;
    this.maxScoreUnits = this.config.MAX_DISTANCE_UNITS;
    this.init(canvasWidth);
  }

  init(width) {
    var maxDistanceStr = '';

    this.calcXPos(width);
    this.maxScore = this.maxScoreUnits;
    for (var i = 0; i < this.maxScoreUnits; i++) {
      this.draw(i, 0);
      this.defaultString += '0';
      maxDistanceStr += '9';
    }

    this.maxScore = parseInt(maxDistanceStr);
  }

  calcXPos(canvasWidth) {
    this.x = canvasWidth - (DistanceMeter.dimensions.DEST_WIDTH *
      (this.maxScoreUnits + 1));
  }

  draw(digitPos, value, opt_highScore) {
    var sourceWidth = DistanceMeter.dimensions.WIDTH;
    var sourceHeight = DistanceMeter.dimensions.HEIGHT;
    var sourceX = DistanceMeter.dimensions.WIDTH * value;
    var sourceY = 0;

    var targetX = digitPos * DistanceMeter.dimensions.DEST_WIDTH + DistanceMeter.dimensions.DEST_WIDTH/2;
    var targetY = this.y;
    var targetWidth = DistanceMeter.dimensions.WIDTH;
    var targetHeight = DistanceMeter.dimensions.HEIGHT;

    sourceX += this.spritePos.x;
    sourceY += this.spritePos.y;

    this.canvasCtx.save();
    //this.canvasCtx.globalCompositeOperation = 'difference';

    if (opt_highScore) {
      // Left of the current score.
      var highScoreX = this.x - (this.maxScoreUnits * 2) *
      DistanceMeter.dimensions.WIDTH;
      this.canvasCtx.translate(highScoreX, this.y);
    } else {
      this.canvasCtx.translate(this.x, this.y);
    }

    this.canvasCtx.drawImage(this.image, sourceX, sourceY,
      sourceWidth, sourceHeight,
      targetX, targetY,
      targetWidth, targetHeight
    );

    this.canvasCtx.restore();
  }

  getActualDistance(distance) {
    return distance ? Math.round(distance * this.config.COEFFICIENT) : 0;
  }

  repaint(deltaTime, distance) {
    var paint = true;
    var playSound = false;

    if (!this.acheivement) {
      distance = this.getActualDistance(distance);
      // Score has gone beyond the initial digit count.
      if (distance > this.maxScore && this.maxScoreUnits ==
          this.config.MAX_DISTANCE_UNITS) {
        this.maxScoreUnits++;
        this.maxScore = parseInt(this.maxScore + '9');
      } else {
        this.distance = 0;
      }

      if (distance > 0) {
        // Acheivement unlocked
        if (distance % this.config.ACHIEVEMENT_DISTANCE == 0) {
          // Flash score and play sound.
          this.acheivement = true;
          this.flashTimer = 0;
          playSound = distance;
        }

        // Create a string representation of the distance with leading 0.
        var distanceStr = (this.defaultString +
          distance).substr(-this.maxScoreUnits);

        this.digits = distanceStr.split('');
      } else {
        this.digits = this.defaultString.split('');
      }

    } else {
      // Control flashing of the score on reaching acheivement.
      if (this.flashIterations <= this.config.FLASH_ITERATIONS) {
        this.flashTimer += deltaTime;

        if (this.flashTimer < this.config.FLASH_DURATION) {
          paint = false;
        } else if (this.flashTimer >
            this.config.FLASH_DURATION * 2) {
          this.flashTimer = 0;
          this.flashIterations++;
        }
      } else {
        this.acheivement = false;
        this.flashIterations = 0;
        this.flashTimer = 0;
      }
    }

    // Draw the digits if not flashing.
    if (paint) {
      for (var i = this.digits.length - 1; i >= 0; i--) {
        this.draw(i, parseInt(this.digits[i]));
      }
    }

    this.drawHighScore();
    return playSound;
  }

  drawHighScore() {
    this.canvasCtx.save();
    this.canvasCtx.globalAlpha = .8;
    for (var i = this.highScore.length - 1; i >= 0; i--) {
      this.draw(i, parseInt(this.highScore[i], 10), true);
    }
    this.canvasCtx.restore();
  }

  setHighScore(distance) {
    distance = this.getActualDistance(distance);
    var highScoreStr = (this.defaultString +
      distance).substr(-this.maxScoreUnits);

    this.highScore = (N7e.user?['','62','']:['17', '18', '']).concat(highScoreStr.split(''));
  }

  reset() {
    this.repaint(0);
    this.acheivement = false;
  }
}

DistanceMeter.dimensions = {
  WIDTH: 14,
  HEIGHT: 14,
  DEST_WIDTH: 16
};

DistanceMeter.config = {
  MAX_DISTANCE_UNITS: 5,
  ACHIEVEMENT_DISTANCE: 100,
  COEFFICIENT: 0.025,
  FLASH_DURATION: 1000 / 4,
  FLASH_ITERATIONS: 3
};

class Panel {
  constructor() {
    this.actions = [];
    this.submenu = null;
    this.buttons = [null,null];
  }

  queueAction(action) {
    if (this.submenu) {
      this.submenu.queueAction(action);
      return;
    }

    if (action.priority == 0) {
      if (action.type == A8e.status.JUMPING) {
        this.buttons[1] = action;
      } else if (action.type == A8e.status.SLIDING) {
        this.buttons[0] = action;
      }
    }

    //TODO change double to action flag.
    if (this.buttons[0] && this.buttons[1]) {
      this.buttons = [null,null];
      this.double = true;
    } else {
      this.double = false;
    }
  }
}

class TitlePanel extends Panel {
  constructor(canvas) {
    super();
    this.canvas = canvas;
    this.canvasCtx  = canvas.getContext('2d');
    this.actions = [];
    this.timer = 0;
    this.ender = 0;
  }

  queueAction(action) {
    if (this.dataReady && !this.ender) {
      //super.queueAction(action);
      this.ender = this.timer;
    }
  }

  repaint(deltaTime) {
    ODR.horizon.repaint(deltaTime, 0, false, false, 1);
    this.timer += deltaTime;
    let factorA = Math.sin(this.timer / 400);
    let factorB = Math.sin(this.timer / 300);
    let factorC = Math.sin(this.timer / 400);
    let factorD = Math.sin(this.timer / 200);

    let runout = 0;
    if (this.ender) {
      let f = 200;
      let t = 0.8*(this.timer - this.ender);
      runout = t - f;
      runout = (f*f - runout*runout) / 1000 ;

      if (runout < -200) {
        ODR.music.load('offline-intro-music', ODR.config.PLAY_MUSIC);
        let defaultAction = new DefaultAction(1);
        defaultAction.setXPos = -100;
        ODR.queueAction(defaultAction);
        return null;
      }
    }

    /* A AMANDARINE FRONTIER */
    this.canvasCtx.drawImage(ODR.spriteGUI,
      148,15,208,85,
      300-120 + 21,
      Math.round(3) + runout * 1.1,
      208,85);
    /* BB REDHAND */
    this.canvasCtx.drawImage(ODR.spriteGUI,
      125,100,37,30,
      300-120 + 41 + Math.round(factorB),
      Math.round(80 + 6 * factorB) + runout * 1.2,
      37,30);
    /* B AMANDARINE */
    this.canvasCtx.drawImage(ODR.spriteGUI,
      368,115,162,133,
      300-120 + 37 + Math.round(factorC),
      Math.round(20 + 3 * factorB) + runout * 1.35,
      162,133);
    /* C ONDARUN */
    this.canvasCtx.drawImage(ODR.spriteGUI,
      127,175,241,75,
      300-120 + 0,
      Math.round(100) + runout * 1.38,
      241,75);
    /* D TANGERINE */
    this.canvasCtx.drawImage(ODR.spriteGUI,
      368,16,99,97,
      300-120 + 121 - Math.round(2 * factorC),
      Math.round(35 + 2 * factorD) + runout * 1.4,
      99,97);

    let total = (ODR.music.songs['offline-intro-music'].progress + ODR.music.songs['offline-play-music'].progress) * 50;
    if (total < 100) {
      new Text(600/14,0).drawText("loading audio data:"+total.toFixed(0)+"%", this.canvasCtx,0,180);
    } else {
      if (this.timer < 15000) {
        new Text(600/14,0).drawText("Amandarine Frontier:On Da Run! BETA 0.99", this.canvasCtx,0,180-Math.min(0,runout));
      } else {
        new Text(600/14,0).drawText("press #slide/#jump to continue.", this.canvasCtx,0,180-Math.min(0,runout));
      }
      this.dataReady = true;
    }

    return this;
  }
}

class Menu extends Panel {
  constructor(canvas, menu) {
    super();
    this.canvas = canvas;
    this.canvasCtx  = canvas.getContext('2d');
    this.model = menu;
    this.actions = [];
    this.displayEntry = this.model.currentEntry = this.model.currentEntry  || 0;
    this.xOffset = 0;
    this.yOffset = 0;
    this.subtitle = new Text(600/14,0).setText('press both #slide+#jump to select');
    this.text = new Text(100);
  }

  repaint(deltaTime) {
    if (Menu.playSound) {
      Menu.playSound = null;
    }

    for (let i = 0; i < 2; i++) {
      let action = this.buttons[i];
      if (action && action.priority == 1) {
        ODR.playSound(ODR.soundFx.SOUND_BLIP, 0.3);
        switch (action.type) {
          case A8e.status.JUMPING:
            this.model.currentEntry++;
            if (this.model.currentEntry >= this.model.entries.length)
              this.model.currentEntry = 0;
          break;
          case A8e.status.SLIDING:
            this.model.currentEntry--;
            if (this.model.currentEntry < 0)
              this.model.currentEntry = this.model.entries.length - 1;
          break;
        }
        action.priority = -1;
        this.buttons[i] = null;
      }
    }

    if (this.double) {
      this.double = false;
      /*
      if (this.submenu) {
        this.submenu = null;
      }
      */

      this.buttons = [null,null];
      let entry = this.model.entries[this.model.currentEntry];

      if (entry.disabled || (entry.hasOwnProperty('value') && !entry.options)) {
        ODR.playSound(ODR.soundFx.SOUND_HIT, 0.8);
      } else {
        ODR.playSound(ODR.soundFx.SOUND_SCORE, 0.3);

        if (entry.options) {

          let subEntries;
          if (entry.options.hasOwnProperty('min')) {
            subEntries = [];
            for (let i = entry.options.min; i <= entry.options.max; i+= entry.options.step) {
              subEntries.push(i);
            }
          } else {
            subEntries = entry.options.slice();
          }
          let currentEntry;
          for (currentEntry = 0; currentEntry < subEntries.length; currentEntry++) {
            if (entry.value == subEntries[currentEntry]) {
              break;
            }
          }
          subEntries.push({title:'CANCEL',exit:true});

          this.submenu = new Menu(this.canvas, {
            name: entry.title,
            currentEntry: currentEntry,
            entries: subEntries,
            enter: (select,selectedItem) => {
              if (!selectedItem.exit) {
                entry.value = selectedItem;
                ODR.config.GRAPHICS_MODE_SETTINGS[3][entry.name] = selectedItem;
                ODR.setGraphicsMode(3, false);
                if (N7e.user)
                  N7e.user.odrRef.child('settings/'+entry.name).set(selectedItem);
              }
              this.submenu = null;
            },
          });
          this.submenu.xOffset = this.xOffset + 25;
          this.submenu.yOffset = this.yOffset + 8;
          this.submenu.subtitle = null;

        } else return this.model.enter(this.model.currentEntry, entry);
      }
    }

    this.canvasCtx.fillStyle = "#000d";
    this.canvasCtx.fillRect(0,0,this.canvas.width,this.canvas.height);

    if (this.model.profilePhoto) {
      this.canvasCtx.drawImage(this.model.profilePhoto,
        0,0,this.model.profilePhoto.width,this.model.profilePhoto.height,
        490,10,100,100);
      if (this.model.highestScore) {
        let actualDistance = 'HISCORE '+ODR.distanceMeter.getActualDistance(Math.ceil(this.model.highestScore)).toString();
        this.text.setText(''+actualDistance).draw(
          this.canvasCtx,
          590 - 14 * actualDistance.length, 140);
      }
    }

    if (this.model.nickname) {
        this.text.setText(this.model.nickname).draw(
          this.canvasCtx,
          590 - 14 * this.model.nickname.length, 120);
    }

    if (this.model.provider == 'google.com') {
        this.text.setText('#google').draw(
          this.canvasCtx,
          490, 10);
    } else if (this.model.provider == 'facebook.com') {
        this.text.setText('#facebook').draw(
          this.canvasCtx,
          490, 10);
    } else if (this.model.provider == 'twitter.com') {
        this.text.setText('#twitter').draw(
          this.canvasCtx,
          490, 10);
    }

    if (this.displayEntry != this.model.currentEntry) {
      this.displayEntry += (this.model.currentEntry - this.displayEntry) * (FPS / 7000) * deltaTime;
      if (Math.abs(this.displayEntry - this.model.currentEntry) < 0.05) {
        this.displayEntry = this.model.currentEntry;
      }
    }

    this.canvasCtx.save();
    for (let i = 0; i < this.model.entries.length; i++) {
      let entry = this.model.entries[i];
      let title = entry.title ? entry.title : entry;

      let xxx = Math.abs(this.displayEntry - i);
      this.canvasCtx.globalAlpha = Math.max(0.1,(4 - xxx)/4);
      if (entry.hasOwnProperty('value')) title += '.'.repeat(32-title.length-(entry.value+'').length)+'[ '+entry.value+' ]';

      this.text.setText((i == this.model.currentEntry ? (entry.exit ? '◅ ' : ' ▻'):'  ') + title).draw(
        this.canvasCtx,
        this.xOffset + 20 + 2 * 3 * Math.round(Math.sqrt(100*xxx) / 3),
        this.yOffset + 90 + 5 * Math.round(4 * (i-this.displayEntry)));
    }
    this.canvasCtx.restore();

    if (this.submenu) {
      this.submenu.repaint(deltaTime);
    }

    if (this.submenu && this.submenu.model.name) {
      new Text(600/14,0).drawText(this.model.title, this.canvasCtx,0,10);
      new Text(600/14,0).drawText(this.submenu.model.name, this.canvasCtx,0,30);
    } else if (this.model.title){
      new Text(600/14,0).drawText(this.model.title,this.canvasCtx,0,10);
    }
    if (this.subtitle)
      this.subtitle.draw(this.canvasCtx,0,180);

    return this;
  }

}

class TextEditor {
  constructor(canvas, text, callback) {
    this.canvas = canvas;
    this.canvasCtx  = canvas.getContext('2d');
    this.actions = [];
    this.buttons = [null,null];
    this.xOffset = 0;
    this.yOffset = 0;
    this.submenu = null;
    this.subtitle = new Text(600/14,0).setText('press both #slide+#jump to select');

    this.text = text;
    this.curX = 0;
    this.curY = 0;
    this.callback = callback;
    this.pattern = "etnsh ◅aiouc.'rdlmf,\"wygpb!?vkqjxz#01234+/56789-▻";
  }

  handleEvent(e) {
    if (e.type == OnDaRun.events.KEYUP || e.type == OnDaRun.events.KEYDOWN) {
      if (e.type == OnDaRun.events.KEYUP) {
        if (e.key == 'Backspace') {
          this.text = this.text.slice(0,this.text.length-1);
          return true;
        } else if (e.key == 'Enter') {
          this.curX = 6;
          this.curY = 6;
          this.double = true;
          return true;
        } else if (this.pattern.indexOf(e.key) != -1) {
          this.text += e.key;
          return true;
        }
      }
    }
    return false;
  }

  //FIXME fix missing action bug, reproduce keep repeating double presses.
  queueAction(action) {
    if (action.priority == 0) {
      if (action.type == A8e.status.JUMPING) {
        this.buttons[1] = action;
      } else if (action.type == A8e.status.SLIDING) {
        this.buttons[0] = action;
      }
    }

    if (this.buttons[0] && this.buttons[1]) {
      this.buttons = [null,null];
      this.double = true;
    }
  }

  repaint(deltaTime) {
    if (Menu.playSound) {
      Menu.playSound = null;
    }

    for (let i = 0; i < 2; i++) {
      let action = this.buttons[i];
      if (action && action.priority == 1) {
        ODR.playSound(ODR.soundFx.SOUND_BLIP, 0.3);
        switch (action.type) {
          case A8e.status.SLIDING:
            this.curY++;
            if (this.curY > 6) this.curY = 0;
          break;
          case A8e.status.JUMPING:
            this.curX++;
            if (this.curX > 6) this.curX = 0;
          break;
        }
        action.priority = -1;
        this.buttons[i] = null;
      }
    }

    if (this.double) {
      this.double = false;
      /*
      if (this.submenu) {
        this.submenu = null;
      }
      */
      if (this.curX == 6 && this.curY == 6) {
        return this.callback(this.text);
      } else if (this.curX == 6 && this.curY == 0) {
        this.text = this.text.slice(0,this.text.length-1);
      } else {
        let slicePos = this.curY*7+this.curX;
        this.text += this.pattern.slice(slicePos,slicePos+1);
        if (slicePos >= 35 && slicePos <= 39 || slicePos >= 42 && slicePos <= 46 ) {
          this.curX = 0;
          this.curY = 5;
        } else {
          this.curX = 0;
          this.curY = 0;
        }
      }

      if (this.text.length > 25) {
        this.text = this.text.slice(0,25);
        ODR.playSound(ODR.soundFx.SOUND_HIT, 0.8);
      } else {
        ODR.playSound(ODR.soundFx.SOUND_SCORE, 0.3);
      }
    }

    this.canvasCtx.save();
    this.canvasCtx.fillStyle = "#000d";
    this.canvasCtx.fillRect(0,0,this.canvas.width,this.canvas.height);
    this.canvasCtx.fillStyle = "#a60"
    this.canvasCtx.fillRect(this.xOffset+295-(7*25/2) + this.curX*25,this.yOffset + 2 + (1 + this.curY)*25,23,23);
    for (let u = 0; u < 7; u++) {
      new Text(600/25,0,this.pattern.slice(u*7,u*7+7)).draw(
        this.canvasCtx,
        0,
        this.yOffset + 7 + (u + 1) * 25,
        25,25);
    }

    if (this.text.length)
      this.canvasCtx.fillRect(this.xOffset+300-(this.text.length*14/2),this.yOffset+1,this.text.length*14+9,23);

    new Text(600/14,0,this.text).draw(
      this.canvasCtx,
      this.xOffset + 7,
      this.yOffset + 7);

    this.canvasCtx.restore();

    return this;
  }
}

class GameOverPanel {
  constructor(canvas, textImgPos, restartImgPos, dimensions) {
    this.canvas = canvas;
    this.canvasCtx = canvas.getContext('2d');
    this.canvasDimensions = dimensions;
    this.textImgPos = textImgPos;
    this.restartImgPos = restartImgPos;
    this.timer = 0;
    this.draw(0);
  }

  draw(deltaTime) {
    deltaTime = deltaTime ? deltaTime : 1;
    this.timer += deltaTime;
    let dist = this.timer/100;
      if (dist > 1) dist = 1;

    var dimensions = GameOverPanel.dimensions;

    var centerX = this.canvasDimensions.WIDTH / 2;

    // Game over text.
    var textSourceX = dimensions.TEXT_X;
    var textSourceY = dimensions.TEXT_Y;
    var textSourceWidth = dimensions.TEXT_WIDTH;
    var textSourceHeight = dimensions.TEXT_HEIGHT;

    var textTargetX = Math.round(centerX - (dimensions.TEXT_WIDTH / 2));
    var textTargetY = Math.round((this.canvasDimensions.HEIGHT - 25) / 3);
    var textTargetWidth = dimensions.TEXT_WIDTH;
    var textTargetHeight = dimensions.TEXT_HEIGHT;

    var restartSourceWidth = dimensions.RESTART_WIDTH;
    var restartSourceHeight = dimensions.RESTART_HEIGHT;
    var restartTargetX = centerX - (dimensions.RESTART_WIDTH / 2);
    var restartTargetY = this.canvasDimensions.HEIGHT / 2;

    textSourceX += this.textImgPos.x;
    textSourceY += this.textImgPos.y;

    // OGG
    this.canvasCtx.save();
    this.canvasCtx.globalAlpha = dist;
    this.canvasCtx.drawImage(ODR.spriteGUI,
        textSourceX, textSourceY, textSourceWidth, textSourceHeight,
        textTargetX, textTargetY + 20*(1-dist),
        textTargetWidth, textTargetHeight * dist);

    // Restart button.
    this.canvasCtx.drawImage(ODR.spriteGUI,
        0, 40,
        38, 34,
        restartTargetX + (1-dist) * dimensions.RESTART_WIDTH/2,
        restartTargetY + (1-dist) * dimensions.RESTART_HEIGHT/2,
        38 * dist, 34 * dist);
    this.canvasCtx.drawImage(ODR.spriteGUI,
        7, 74,
        23, 19,
        restartTargetX + 7, restartTargetY + 8,
        23, 19);
    this.canvasCtx.restore();
  }
}

GameOverPanel.dimensions = {
  TEXT_X: 0,
  TEXT_Y: 150,
  TEXT_WIDTH: 86,
  TEXT_HEIGHT: 26,
  RESTART_WIDTH: 38,
  RESTART_HEIGHT: 28
};

class Action {
  constructor( type ) {
    this._begin = 0;
    this._end = 0;
    this._priority = 0;
    //this._speed = undefined;
    this._index = 0;

    this._type = type;
    Object.assign( this, A8e.animFrames[type] );
  }

  get type() {
    return this._type;
  }

  set type( newType ) {
    console.log('no no');
  }

  get index() {
    return this._index;
  }

  set index(index) {
    if( !this._index ) {
      this._index = index
    } else if( this._index != Infinity ) console.error('can be written once');
  }

  set priority( newPriority ) {
    this._priority = newPriority;
  } get priority() { return this._priority;}

  set begin( beginTime ) {
    console.error('begin should be assigned only by constructor');
  } get begin() { return this._begin; }


  /* Guide drawing helper, this allows updating values for displaying guides */
  willEnd() {
    console.error('Subclass must implement.');
  }

  set end( endTime ) {
    this.willEnd( endTime, this._speed );
    this.priority = 1;
  } get end() { return this._end; }

  set speed( newSpeed ) {
    if( this._end ) {
      this.willEnd( this._end, newSpeed );
    }
  } get speed() { return this._speed || 0; }

}

class DefaultAction extends Action {
  constructor( newSpeed ) {
    super();
    this.speed = newSpeed;
    this.index = Infinity;
    this._timer = 0;
    this._priority = 3;
  }

  set timer( timer ) {
    this._timer = timer;
  } get timer() { return this._timer; }

  // This action is a default action and won't be filtered by priority.
  set priority( newPriority ) {
    this._priority = Math.max(0, newPriority);
  } get priority() { return this._priority; }

  set speed( newSpeed ) {
    if( this._speed != newSpeed && (this._speed || 0) <= ODR.config.SPEED ) {
      if( newSpeed == 0) {
        this._type = A8e.status.WAITING;
        Object.assign(this, A8e.animFrames.WAITING);
        this.timer = 0;
      } else {
        this._type = A8e.status.RUNNING;
        this.timer = 0;
        if( newSpeed > 4 ) {
          Object.assign(this, A8e.animFrames.RUNNING);
        } else {
          Object.assign(this, A8e.animFrames.WALKING);
        }
      }
    }

    this._speed = newSpeed;
  } get speed() { return this._speed || 0; }

}

class JumpAction extends Action {
  constructor( begin, speed ) {
    super( A8e.status.JUMPING );
    this._begin = begin;
    this._speed = speed;

    this.priority = 0;

    this.control = true;
    this.timer = 0;
  }

  willEnd( endTime, currentSpeed ) {
    this._end = endTime;
    this._speed = currentSpeed;

    this.pressDuration = this._end - this._begin;
    if( this.pressDuration > ODR.config.MAX_ACTION_PRESS )
      this.pressDuration = ODR.config.MAX_ACTION_PRESS;

    this.maxPressDuration = shapeSpeedDuration( this.speed, this.pressDuration );
    // It seems more ergonomically natural to simply add the minimum than to clip the value.
    this.top = this.maxPressDuration / 1000;
    this.halfTime = Math.sqrt( 2000 * this.maxPressDuration / A8e.config.GRAVITY );
    this.duration = this.halfTime * 2;
    this.msPerFrame = this.duration / 3.5;
  }

}

class SlideAction extends Action {
  constructor( begin, speed ) {
    super( A8e.status.SLIDING );
    this._begin = begin;
    this._speed = speed;

    this.priority = 0;

    this.control = true;
    this.timer = 0;
  }

  willEnd(endTime,currentSpeed) {
    this._end = endTime;
    this._speed = currentSpeed;

    this.pressDuration = this._end - this._begin;
    if( this.pressDuration > ODR.config.MAX_ACTION_PRESS )
      this.pressDuration = ODR.config.MAX_ACTION_PRESS;

    this.maxPressDuration = ODR.config.SLIDE_FACTOR * shapeSpeedDuration(this._speed, this.pressDuration);
  }

  set maxPressDuration(mPD) {
    this._maxPressDuration = mPD;
    this.fullDistance = this._speed * 0.001 * FPS * this._maxPressDuration;
    this.fullTime = this._speed == 0 ? 0 : this.fullDistance / (this._speed * FPS);
    this.duration = this.fullTime * 1000;
    this.distance = 0;
    this.friction = this._speed == 0 ? 0 : 2 * this.fullDistance / (this.fullTime * this.fullTime);
  } get maxPressDuration() { return this._maxPressDuration; }

}

class ConsoleButton {
  constructor(id, x, y, w, h) {
    this.id = id;
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
    this.sprite = new Image();
    this.sprite.src = 'assets/console/'+id+'.png';

    this.pressure = 0;
    this.dir = 0;
    this.frame = -1;

    this.canvas = ODR.shadowRoot.getElementById(id);
    this.canvas.width = w;
    this.canvas.height = h;
    this.canvasCtx = this.canvas.getContext('2d',{alpha:false});
    this.canvasCtx.drawImage(this.sprite,0,0);

    this.canvas.addEventListener(OnDaRun.events.TOUCHSTART, this);
    this.canvas.addEventListener(OnDaRun.events.TOUCHEND, this);
    this.canvas.addEventListener(OnDaRun.events.MOUSEDOWN, this);
    this.canvas.addEventListener(OnDaRun.events.MOUSEUP, this);
  }

  repaint(deltaTime) {
    this.timer += deltaTime;

    if (this.dir) {
      this.pressure += deltaTime * this.dir;
      if (this.pressure < 0) {
        this.pressure = 0;
        this.dir = 0;
      } else if (this.pressure > 100) {
        this.pressure = 100
        this.dir = 0;
      }
    }

    let frame = ~~(4 * this.pressure / 100);
    if (frame != this.frame) {
      this.frame = frame;
      this.canvasCtx.drawImage( this.sprite,
        frame * this.w, 0, this.w, this.h,
        0, 0, this.w, this.h);
    }
  }

  handleEvent(e) {
    switch(e.type) {
      case OnDaRun.events.KEYDOWN:
      case OnDaRun.events.MOUSEDOWN:
      case OnDaRun.events.TOUCHSTART: {
        e.preventDefault();
        this.timer = 0;
        this.dir = 1;
        this.handlePressed(e);
      } break;
      case OnDaRun.events.KEYUP:
      case OnDaRun.events.MOUSEUP:
      case OnDaRun.events.TOUCHEND: {
        e.preventDefault();
        this.timer = 0;
        this.dir = -1;
        this.handleReleased(e);
      } break;
      default:
        console.log(this,e);
    }
  }

  handlePressed(e) {}

  handleReleased(e) {}

}

class ConsoleLeftButton extends ConsoleButton {
  constructor(x, y, w, h) { super('console-left', x, y, w, h); }

  handlePressed(e) {
    this.action = new SlideAction(ODR.time, ODR.currentSpeed);
    ODR.queueAction(this.action);
  }

  handleReleased(e) {
    if (this.action && this.action.priority == 0) {
      this.action.willEnd(ODR.time,ODR.currentSpeed);
      this.action.priority = 1;
    }
  }
}

class ConsoleRightButton extends ConsoleButton {
  constructor(x, y, w, h) {super('console-right', x, y, w, h); }

  handlePressed(e) {
    this.action = new JumpAction(ODR.time, ODR.currentSpeed);
    ODR.queueAction(this.action);
  }

  handleReleased(e) {
    if (this.action && this.action.priority == 0) {
      this.action.willEnd(ODR.time,ODR.currentSpeed);
      this.action.priority = 1;
    }
  }
}

class ConsoleAButton extends ConsoleButton {
  constructor(x, y, w, h) { super('console-a', x, y, w, h); }

  handleReleased(e) {
    ODR.setMusicMode(-1);
  }
}

class ConsoleBButton extends ConsoleButton {
  constructor(x, y, w, h) { super('console-b', x, y, w, h); }

  handleReleased(e) {
    if (!ODR.menu) {
      ODR.setGraphicsMode(-1, true);
    } else {
      ODR.menu = null;
      ODR.terminal.setMessages('CUSTOM GRAPHICS MODE', 5000);
    }
  }
}

class ConsoleCButton extends ConsoleButton {
  constructor(x, y, w, h) { super('console-c', x, y, w, h); }
}

class ConsoleDButton extends ConsoleButton {
  constructor(x, y, w, h) { super('console-d', x, y, w, h); }

  handleReleased(e) {
    if (N7e.userSigning) {
      ODR.playSound(ODR.soundFx.SOUND_HIT, 1.0, false, 0.2);
      ODR.subtitle = new Text(600/14,0).setText("signing in..please wait");
      ODR.subtitle.signing = true;
      return;
    }

    if (!ODR.menu) {
      ODR.music.stop();
      let mainMenu = ODR.menu = N7e.user
        /* User has signed in */
        ? new Menu(ODR.canvas, {
          title: 'USER PROFILE',
          entries: [
            "SET NAME",
            "SET AVATAR : NYI",
            "SIGN OUT",
            {title:'EXIT',exit:true}
          ],
          profilePhoto: N7e.user.image,
          nickname: N7e.user.nickname,
          provider: N7e.user.auth.providerData[0].providerId,
          highestScore: ODR.highestScore,
          enter: (entryIndex,choice) => {
            if (choice.exit) return null;

            if (choice == "SET NAME")
              return new TextEditor(ODR.canvas, N7e.user.nickname?N7e.user.nickname:'', (text) => {
                N7e.user.odrRef.parent.child('nickname').set(text);
                N7e.user.nickname = text;
                ODR.terminal.setMessages('all hail '+text+'.',5000);
                mainMenu.model.nickname = text;
                return mainMenu;
              });
            else if (choice == "SIGN OUT")
              return new Menu(ODR.canvas, {
                title: 'DO YOU WANT TO SIGN OUT?',
                profilePhoto: N7e.user.image,
                nickname: N7e.user.nickname,
                provider: N7e.user.auth.providerData[0].providerId,
                highestScore: ODR.highestScore,
                entries: [
                  'YES',
                  {title:'NO',exit:true}
                ],
                currentEntry: 1,
                enter: (confirm,confirmation) => {
                  if (confirmation.exit) {
                    return null;
                  } else {
                    N7e.user.odrRef.off();
                    firebase.auth().signOut();
                    N7e.user = null;
                    ODR.highestScore = 0;
                    ODR.distanceMeter.setHighScore(0);
                  }
                },
              })
            else if (choice = "set name") {
              return null; //NYI
            }
          }
        })
        /* No active user */
        : new Menu(ODR.canvas, {
          title: 'LINK PROFILE',
          entries: [
            '#facebook FACEBOOK',
            '#twitter TWITTER',
            '#google GOOGLE',
            {title:'EXIT',exit:true}
          ],
          enter: (entryIndex,choice) => {
            if (choice.exit) return null;

            return new Menu(ODR.canvas, {
              title: 'DO YOU WANT TO LINK ' + choice + '?',
              entries: [
                'YES',
                {title:'NO',exit:true}
              ],
              currentEntry: 1,
              enter: (confirm,confirmation) => {
                if (confirmation.exit) {
                  return mainMenu;
                } else {
                  N7e.user = new User(['facebook','twitter','google'][entryIndex]);
                }
              },
            });
          },
        });
    } else {
      ODR.menu = null;
    }

  }
}

class ConsoleResetButton extends ConsoleButton {
  constructor(x, y, w, h) { super('console-reset', x, y, w, h); }

  handleReleased(e) {
    ODR.music.stop();
    ODR.config = JSON.parse(JSON.stringify(OnDaRun.Configurations));
  }
}

class ConsoleN7EButton extends ConsoleButton {
  constructor(x, y, w, h) { super('console-n7e', x, y, w, h); }
  handleReleased(e) {
    ODR.introScriptTimer = 20000;
    if (!this.urlList || this.urlList.length == 0) {
      this.urlList = [
        {name:'IG', url:'https://www.instagram.com/natherine.bnk48official'},
        {name:'FACEBOOK', url:'https://www.facebook.com/bnk48official.natherine'},
      ]
    }
    let item = this.urlList.splice(getRandomNum(0,this.urlList.length-1),1)[0];
    window.open(item.url, '_blank');
  }
}

class Music {
  constructor(canvas) {
    if( Music.singletonInstance_ )
      return Music.singletonInstance_;

    this.songs = {};
    this.currentSong = null;
    Music.singletonInstance_ = this;
  }

  stop() {
    this.currentSong = null;
    for( let name in this.songs ) {
      if (this.songs[name].audio) {
        console.log('stopping', name)
        this.songs[name].autoplay = false;
        this.songs[name].audio.fadeout();
        this.songs[name].audio = null;
      }
    }
  }

  get lyrics() {
    if (this.currentSong && this.currentSong.lyrics && this.currentSong.lyrics.length) {
      let time = ODR.audioContext.currentTime - this.currentSong.startTime;
      while (time >= this.currentSong.lyrics[2]) {
        this.currentSong.lyrics.splice(0,2);
      }
      return this.currentSong.lyrics[1];
    }
  }

  load(name, autoplay, lyrics) {
    //if (IS_IOS) return;
    let song = this.songs[name] || (this.songs[name] = {title:name, autoplay:autoplay, lyrics:lyrics});
    song.lyrics = lyrics ? lyrics.slice(0) : null;

    /*
    if( song.autoplay ) {
      console.log('This song is being already played.',song)
      return;
    }
    */

    if( song.autoplay = (song.autoplay || autoplay) ) {
      if (this.currentSong == song) return;

      for( let anotherName in this.songs ) {
        if( name == anotherName ) continue;

        this.songs[anotherName].autoplay = false;
        if( this.songs[anotherName].audio ) {
          this.songs[anotherName].audio.fadeout();
          this.songs[anotherName].audio = null;
        }
      }

      if( song.data ) {
        if( !song.audio ) {
          this.currentSong = song;
          song.audio = ODR.playSound( song.data, 0.3 );
          song.startTime = ODR.audioContext.currentTime;
          /*
          if( song.lyrics ) {
            song.playLyrics = song.lyrics.slice(0);
          }
          */
        }
      } else if( !song.hasOwnProperty( 'progress' )) {
        song.progress = 0;
        var resourceTemplate = document.getElementById(ODR.config.RESOURCE_TEMPLATE_ID).content;
        let request = new XMLHttpRequest();
        request.open('GET', resourceTemplate.getElementById(name).src, true);
        request.responseType = 'arraybuffer';
        request.onload = () => {
          song.progress = 1;
          if (!ODR.audioContext) {
            ODR.audioContext = new AudioContext();
          }
          ODR.audioContext.decodeAudioData(request.response, audioData => {
            song.data = audioData;
            this.load( song.title, song.autoplay );
          });
        }
        request.onprogress = (e) => {
          song.progress = e.loaded/e.total;
        }
        request.send();
      }
    }
  }
}

class OnDaRun extends LitElement {
  static get styles() {
    return css`
    :host {
      display: block;
      position: fixed;
      top: 50%;
      left: 50%;
      margin-top: -400px;
      margin-left: -400px;
      width: 800px;
      height: 800px;
      padding: 0;
      opacity: 0;
      background-image: url(assets/console/console.png);
      pointer-events: none;
    }

    canvas {
      position: absolute;
      z-index: 2;
      pointer-events: auto;
    }

    #console-screen {
      left: 100px;
      top: 237px;
      width: 600px;
      height: 200px;
      border-radius: 4px;
    }

    #console-left {
      left: 104px;
      top: 495px;
      width: 100px;
      height: 100px;
      background-image: url(assets/console/console-left.png);
    }

    #console-right {
      left: 596px;
      top: 495px;
      width: 100px;
      height: 100px;
      background-image: url(assets/console/console-right.png);
    }

    #console-a {
      left: 233px;
      top: 495px;
      width: 66px;
      height: 50px;
      background-image: url(assets/console/console-a.png);
    }

    #console-b {
      left: 233px;
      top: 545px;
      width: 66px;
      height: 50px;
      background-image: url(assets/console/console-b.png);
    }

    #console-c {
      left: 501px;
      top: 495px;
      width: 66px;
      height: 50px;
      background-image: url(assets/console/console-c.png);
    }

    #console-d {
      left: 501px;
      top: 545px;
      width: 66px;
      height: 50px;
      background-image: url(assets/console/console-d.png);
    }

    #console-n7e {
      left: 357px;
      top: 628px;
      width: 18px;
      height: 18px;
      background-image: url(assets/console/console-n7e.png);
    }

    #console-reset {
      left: 424px;
      top: 628px;
      width: 18px;
      height: 18px;
      background-image: url(assets/console/console-reset.png);
    }

    `;
  }

  static get properties() {
    return {
      /*
      spriteScene: { type: Object },
      spriteGUI: { type: Object },
      */
    };
  }

  render() {
    return html`
      <canvas id="console-screen"></canvas>
      <canvas id="console-left"></canvas>
      <canvas id="console-right"></canvas>
      <canvas id="console-a"></canvas>
      <canvas id="console-b"></canvas>
      <canvas id="console-c"></canvas>
      <canvas id="console-d"></canvas>
      <canvas id="console-n7e"></canvas>
      <canvas id="console-reset"></canvas>
    `;
  }

  constructor() {
    super();

    //ODR = this;
    window['ODR'] = this;
    window['N7e'] = N7e;

    this.dimensions = OnDaRun.defaultDimensions;
    this.config = JSON.parse(JSON.stringify(OnDaRun.Configurations));
    this.menu = null;

    this.canvas = null;
    this.canvasCtx = null;
    this.skyCanvas = null;
    this.skyCanvasCtx = null;
    this.skyGradientFromValues = [0,0,0,0,0,0];
    this.skyGradientToValues = [0,0,0,0,0,0];
    this.skyGradientCurrentValues = [0,0,0,0,0,0];

    this.amandarine = null;
    this.distanceMeter = null;
    this.distanceRan = 0;
    this.highestScore = 0;
    this.achievements = [];
    this.time = 0;
    this.runningTime = 0;
    this.msPerFrame = 1000/FPS;
    this.currentSpeed = 0;
    this.obstacles = [];
    this.actions = [];
    this.activeAction = null;

    this.activated = false;
    this.playing = false;
    this.crashed = false;
    this.inverted = false;
    this.invertTimer = 0;

    this.shouldAddObstacle = false;
    this.shouldIncreaseSpeed = false;

    this.playCount = 0;
    this.soundFx = {};

    this.audioContext = null;
    this.music = null;

    this.images = {};

    this.consoleButtonForKeyboardCodes = {};
  }

  firstUpdated(changedProperties) {

    this.consoleButtons = {
      CONSOLE_LEFT: new ConsoleLeftButton(104, 495, 100, 100),
      CONSOLE_RIGHT: new ConsoleRightButton(596, 495, 100, 100),
      CONSOLE_A: new ConsoleAButton(233, 495, 66, 50),
      CONSOLE_B: new ConsoleBButton(233, 545, 66, 50),
      CONSOLE_C: new ConsoleCButton(501, 495, 66, 50),
      CONSOLE_D: new ConsoleDButton(501, 545, 66, 50),
      CONSOLE_N7E: new ConsoleN7EButton(357, 628, 18, 18),
      CONSOLE_RESET: new ConsoleResetButton(424, 628, 18, 18),
    };

    this.consoleButtonForKeyboardCodes['ShiftRight'] = this.consoleButtons.CONSOLE_RIGHT;
    this.consoleButtonForKeyboardCodes['ShiftLeft'] = this.consoleButtons.CONSOLE_LEFT;
    this.consoleButtonForKeyboardCodes['KeyM'] = this.consoleButtons.CONSOLE_A;
    this.consoleButtonForKeyboardCodes['Digit5'] = this.consoleButtons.CONSOLE_B;


    /* Load and set console image */
    let consoleImage = new Image();
    consoleImage.src = 'assets/console/console.png';
    this.style.backgroundImage = 'url('+consoleImage.src+')';

    /* HACK prevent initial transition */
    consoleImage.addEventListener('load', (e) => {
      this.style.transition = 'opacity 1s';
    });

    /* Listing & creating images for sprites */
    let loadingList = [];

    let addSprite = (path) => {
      let sprite = new Image();
      sprite.src = 'assets/'+path+'.png';
      loadingList.push(sprite);
      return sprite;
    };

    this.spriteGUI = addSprite('userinterface');
    this.spriteDef = OnDaRun.spriteDefinition;

    this.spriteScene = addSprite('scene');

    A8e.animFrames.WALKING.sprite = addSprite('nat/walking');
    A8e.animFrames.RUNNING.sprite = addSprite('nat/running');
    A8e.animFrames.SLIDING.sprite = addSprite('nat/sliding');
    A8e.animFrames.JUMPING.sprite = addSprite('nat/jumping');
    A8e.animFrames.WAITING.sprite = addSprite('nat/idle');
    A8e.animFrames.CRASHED.sprite = addSprite('nat/crash');

    let bicyclesSprite = addSprite('biking');
    let ducksSprite = addSprite('ducks');
    Obstacle.types.forEach(type => {
      switch (type.type) {
        case 'ROTATA':
        case 'VELOTA':
          type.sprite = bicyclesSprite;
          break;
        case 'LIVER':
        case 'RUBBER':
          type.sprite = ducksSprite;
          break;
        default:
          type.sprite = this.spriteScene;
      }
    });

    /* Make sure all sprites are ready then init() */
    let completion = 0;
    let checkReady = (sprite) => {
      completion++;
      if (completion < loadingList.length)
        return;

      this.loadSounds();
      this.music = new Music();
      this.init();
    };

    loadingList.forEach(sprite => {
      if (sprite.complete) {
        checkReady(sprite);
      } else {
        sprite.addEventListener('load', () => checkReady(sprite));
      }
    });
  }

  init() {

    this.config.PLAY_MUSIC = true;
    this.music.load('offline-intro-music', false);
    this.music.load('offline-play-music', false);
    this.setSpeed();

    this.canvas = this.shadowRoot.getElementById('console-screen');
    this.canvas.width = this.dimensions.WIDTH;
    this.canvas.height = this.dimensions.HEIGHT;
    this.canvasCtx = this.canvas.getContext('2d');

    this.skyCanvas = document.createElement('canvas');
    this.skyCanvas.width = this.dimensions.WIDTH;
    this.skyCanvas.height = this.dimensions.HEIGHT;
    this.skyCanvasCtx = this.skyCanvas.getContext('2d');//,{alpha:false}

    this.setSkyGradient(this.config.SKY.START, 0);
    this.horizon = new Horizon(this.canvas, this.spriteDef, this.dimensions,
      this.config.GAP_COEFFICIENT);

    this.menu = new TitlePanel(this.canvas);

    this.amandarine = new A8e(this.canvas, this.spriteDef.NATHERINE);

    this.distanceMeter = new DistanceMeter(this.canvas,
      this.spriteDef.TEXT_SPRITE, this.dimensions.WIDTH);
    this.achievements = [
      200, 'KEEP RUNNING!#natB',
      400, 'GOOD JOB!#natB',
      800, 'JUST DONT DIE!#natB',
    ];

    this.terminal = new Terminal(this.canvas, this.spriteDef.TEXT_SPRITE);

    this.actionIndex = 0;


    this.canvasCtx = this.canvas.getContext('2d');

    /* Set default custom mode to setting 0 */
    this.config.GRAPHICS_MODE_SETTINGS[3] = JSON.parse(JSON.stringify(OnDaRun.Configurations.GRAPHICS_MODE_SETTINGS[0]));
    this.setGraphicsMode(3, false);

    /*
    this.clearCanvas();
    this.horizon.repaint(0, this.currentSpeed, true);
    this.amandarine.repaint(this.currentSpeed, 0);
    */
    this.style.opacity = 1;

    this.startListening();
    this.shouldAddObstacle = true;
    this.shouldIncreaseSpeed = true;
    this.signIn();
    this.scheduleNextRepaint();

    this.introScriptTimer = 200;
    this.introScript = [
      20000,"Hi! Press #slide/#jump to start!",
      20000,"Just play already!",
      20000,"Didn't know you love the song that much!",
      20000,"Allow yourself to be a beginner. No one starts at the top.#<3",
      20000,"Man.City will win ⚽\nYou know.",
      20000,"You have no idea of the amount of HAPPINESS you brought into my life.",
      20000,'I didnt say "I_love_you" to hear it back. I said it to make sure you knew.#<3',
      20000,'Never give up on something you really want #<3',
      20000,'You are my sunshine ☼#<3',
      20000,'My love for you is a journey;\nStarting at forever,\nand ending at never.#<3',
      20000,'Glory in life is not in never failing,but rising each time we fail.#<3',
      20000,'Love this project?\nDonate_Thai_Redcross_#redcross!\nSee the bottom right for details.',
    ];

  }

  setSpeed(opt_speed) {
    this.currentSpeed = opt_speed === undefined ? this.currentSpeed : opt_speed;
  }

  signIn() {
    firebase.auth().onAuthStateChanged(user => {
      if (user) {
        let authUser = new User();
        authUser.auth = user;
        authUser.uid = user.uid;
        authUser.image = new Image();
        authUser.image.addEventListener('load', (e) => {
          /* set user after having image loaded */
          N7e.user = authUser;
          N7e.userSigning = false;
          if (this.subtitle && this.subtitle.signing) {
            this.subtitle = null;
          }
        });
        authUser.image.src = user.photoURL;

        authUser.odrRef = firebase.database().ref('users/'+ user.uid +'/odr');
        authUser.odrRef.parent.child('nickname').once('value', snapshot => {
          authUser.nickname = snapshot.val();

          if (!authUser.nickname) {
            let nname = ["Add", "Bat", "Cat", "Dad", "Hat", "Has", "Jaz", "Kat", "Lad", "Mat", "Mad", "Mas", "Nat", "Pat", "Rat", "Ras", "Sat", "Saz", "Sad", "Tat", "Vat", "Wad", "Yas", "Zat"];
            let hname = ["ber", "cur", "der", "eer", "fur", "ger", "her", "hur", "jer", "kur", "kir", "ler", "mer", "mur", "ner", "ser", "tur", "ver", "wer", "yer", "zur", "bar", "car", "dar", "ear", "far", "gal", "har", "hor", "jul", "kel", "ker", "lur", "mir", "mor", "nir", "sur", "tar","ter", "val", "war", "you", "zir"];
            let rname = ["been", "cine", "dine", "dean", "deen", "fine", "gene", "hine", "jene", "kine", "line", "mean", "nene", "pine", "rine", "sene", "tine", "wine", "zine"];
            authUser.nickname = nname[getRandomNum(0,nname.length-1)] + hname[getRandomNum(0,hname.length-1)] + rname[getRandomNum(0,rname.length-1)];
            authUser.odrRef.parent.child('nickname').set(authUser.nickname);
            this.terminal.setMessages('Welcome, '+authUser.nickname+'.\n[autogenerated_name]\nYou dont\'t like it, do you?\nchange in #trophy',20000);
            this.introScriptTimer = 20000;
          }

        });
        authUser.odrRef.on('value', snapshot => {
          let odr = snapshot.val();

          if (odr.score > this.highestScore) {
            this.highestScore = odr.score;
            this.distanceMeter.setHighScore(this.highestScore);
          } else if (odr.score < this.highestScore) {
            authUser.odrRef.child('score').set(this.highestScore);
          }

          Object.assign(this.config.GRAPHICS_MODE_SETTINGS[3], odr.settings);
          if (this.config.GRAPHICS_MODE == 3) {
            this.setGraphicsMode(3, false);
          }

        });
      } else {
        N7e.userSigning = false;
        if (this.subtitle && this.subtitle.signing) {
          this.subtitle = null;
        }
      }
    });
  }

  /***/
  setMusicMode(mode) {
    //FIXME A8e should check for the last activity.
    this.introScriptTimer = 20000;
    if (this.config.PLAY_MUSIC) {
      this.music.stop();
      this.config.PLAY_MUSIC = false;
      this.terminal.setMessages('♬ OFF', 2000);
    } else {
      this.config.PLAY_MUSIC = true;
      if (this.playing) {
        this.music.load('offline-play-music', this.config.PLAY_MUSIC);
      } else {
        this.music.load('offline-intro-music', this.config.PLAY_MUSIC);
      }
      this.terminal.setMessages('♬ ON', 2000);
    }
  }

  setGraphicsMode(mode, opt_showCustomMenu) {
//    this.introScriptTimer = 200;

    if (mode == -1) {
      mode = (this.config.GRAPHICS_MODE+1)%4;
    }

    Object.assign(this.config, this.config.GRAPHICS_MODE_SETTINGS[mode]);

    if (this.menu && opt_showCustomMenu) {
      if (this.menu.model && this.menu.model.title == 'graphics settings') {
        this.menu = null;
        this.terminal.setMessages('CUSTOM GRAPHICS MODE', 5000);
        return;
      }
      this.menu = null;
    }

    this.config.GRAPHICS_MODE = mode;
    this.canvasCtx.restore();
    this.canvasCtx.save();

    let delay = 5000;
    switch (mode) {
      case 0:
        this.terminal.setMessages('N#aTURING', delay);
        break;
      case 1:
        this.terminal.setMessages('STRIPES', delay);
        break;
      case 2:
        this.terminal.setMessages('ROCK-BOTTOM', delay);
        break;
      case 3:
        if (opt_showCustomMenu) {
          this.terminal.setMessages('CUSTOM GRAPHICS MODE', delay);

          this.music.stop();
          let entries = [];
          for (let key in this.config.GRAPHICS_MODE_OPTIONS) {
            let def = this.config.GRAPHICS_MODE_OPTIONS[key];
            entries.push({title:key.slice(9), name:key, options:def, value:this.config[key]});
          }
          entries.push({title:'exit', exit:true});
          let mainMenu = this.menu = new Menu(this.canvas, {
            title: 'graphics settings',
            entries: entries,
            enter: (entryIndex,choice) => {
              this.terminal.setMessages('CUSTOM GRAPHICS MODE', delay);
              return null;
            },
          });

        } break;
      default:
        break;
    }

    if (this.config.GRAPHICS_DUST != 'DUST')
      this.amandarine.dust.reset();
    this.setSkyGradient(this.skyGradientCurrentValues,0);
    /*
    this.clearCanvas();
    this.horizon.horizonLine.draw();
    this.amandarine.repaint(0, this.currentSpeed);
    */
    if (this.config.GRAPHICS_MOON == 'SHINE') {
      this.horizon.nightMode.generateMoonCache();
    } else {
      this.horizon.nightMode.moonCanvas = null;
    }
    this.canvas.style.opacity = 1 - this.config.GRAPHICS_DAY_LIGHT/5;
  }

  loadSounds() {
    if (!IS_IOS) {
      if (!this.audioContext) {
        this.audioContext = new AudioContext();
      }

      var resourceTemplate =
      document.getElementById(this.config.RESOURCE_TEMPLATE_ID).content;

      for (var sound in OnDaRun.sounds) {
        var soundSrc =
        resourceTemplate.getElementById(OnDaRun.sounds[sound]).src;
        soundSrc = soundSrc.substr(soundSrc.indexOf(',') + 1);
        let len = (soundSrc.length / 4) * 3;
        let str = atob(soundSrc);
        let arrayBuffer = new ArrayBuffer(len);
        let bytes = new Uint8Array(arrayBuffer);

        for (let i = 0; i < len; i++) {
          bytes[i] = str.charCodeAt(i);
        }

        // Async, so no guarantee of order in array.
        this.audioContext.decodeAudioData(bytes.buffer, function (index, audioData) {
          this.soundFx[index] = audioData;
        }.bind(this, sound));

      }
    }
  }

  playSound(soundBuffer, volume, loop, delay, pan) {
    if (soundBuffer) {

      delay = delay || 0;
      let duration = Math.ceil(soundBuffer.duration + delay);
      let dest = this.audioContext.destination;
      var sourceNode;

      // FIXME Better reallocate on-load via configurations.
      /*
      if (delay) {
        let newBuffer = this.audioContext.createBuffer(2, soundBuffer.sampleRate * 2 * duration, soundBuffer.sampleRate);
        newBuffer.copyToChannel(soundBuffer.getChannelData(0), 0);
        newBuffer.copyToChannel(soundBuffer.getChannelData(soundBuffer.numberOfChannels == 2? 1:0), 1);
        soundBuffer = newBuffer;
      }
      */

      sourceNode = this.audioContext.createBufferSource();
      sourceNode.buffer = soundBuffer;
      let vnode, pnode;

      if (volume) {
        vnode = this.audioContext.createGain();
        vnode.gain.value = volume;
        vnode.connect(dest);
        dest = vnode;
      }

      if (pan) {
        pnode = this.audioContext.createStereoPanner();
        pnode.pan.value = pan;
        pnode.connect(dest);
        dest = pnode;
      }

      /*
      if (delay) {
        let dnode = this.audioContext.createDelay(duration);
        dnode.delayTime.value = delay;
        dnode.connect(dest);
        dest = dnode;
      }
      */

      sourceNode.connect(dest);

      if (loop) sourceNode.loop = true;

      sourceNode.start(this.audioContext.currentTime + delay);
      return {
        node: sourceNode,
        _gain: vnode,
        _pan: pnode,
        stop: function() {
          this.node.stop();
        },
        fadeCount: 10,
        fadeout: function() {

          if (this._gain.gain.value > 0) {
            this._gain.gain.value -= 0.02;
            if (this._gain.gain.value < 0) {
              this.node.stop();
              return;
            }
            setTimeout(() => { this.fadeout(); }, 50);
          }

        },
      };
    }
  }

  playIntro() {
    if (!this.activated && !this.crashed) {
      this.playingIntro = true;
      this.amandarine.playingIntro = true;

      // CSS animation definition.

      // if (this.touchController) {
      //     this.outerContainerEl.appendChild(this.touchController);
      // }
      this.playing = true;
      this.activated = true;

    } else if (this.crashed) {
      this.restart();
    }
  }

  /*
  startGame() {
    this.runningTime = 0;
    this.playingIntro = false;
    this.amandarine.playingIntro = false;
    this.playCount++;

    // Handle tabbing off the page. Pause the current game.
    document.addEventListener(OnDaRun.events.VISIBILITY,
      this.onVisibilityChange.bind(this));

    window.addEventListener(OnDaRun.events.BLUR,
      this.onVisibilityChange.bind(this));

    window.addEventListener(OnDaRun.events.FOCUS,
      this.onVisibilityChange.bind(this));
  }
  */

  clearCanvas() {
    this.canvasCtx.drawImage(this.skyCanvas, 0, 0);
  }

  setSkyGradient(newValues, duration) {
    if (duration == 0) {
      this.skyGradientFromValues = newValues;
      this.skyGradientCurrentValues = newValues.slice();
      this.skyGradientToValues = newValues;
      this.skyGradientTimer = 1;
      this.skyGradientDuration = 1;
      this.lastDrawnSkyTimer = 0;
      this.drawCounter = 0;
      return;
    }

      /* Create a gradient if the transition was interrupted */
    if (this.skyGradientTimer < this.skyGradientDuration) {
      this.skyGradientToValues = this.skyGradientCurrentValues;
    }

    this.skyGradientFromValues = this.skyGradientToValues;
    this.skyGradientCurrentValues = this.skyGradientFromValues.slice();
    this.skyGradientToValues = newValues;

    this.skyGradientTimer = 0;
    this.skyGradientDuration = duration;
    this.lastDrawnSkyTimer = 0;
    this.drawCounter = 0;

  }

  repaintSkyGradient(deltaTime) {
    if (0 == this.skyGradientDuration) {
      return;
    }

    this.skyGradientTimer += deltaTime;
    if (this.skyGradientTimer >= this.skyGradientDuration) {
      this.skyGradientTimer = this.skyGradientDuration;
    }

    let ratio = this.skyGradientTimer/this.skyGradientDuration;
    for(let i = 0; i < 6; i++) {
      this.skyGradientCurrentValues[i] = ~~(this.skyGradientFromValues[i]
        + ratio * (this.skyGradientToValues[i] - this.skyGradientFromValues[i]));
    }

    if (ratio == 1 || this.skyGradientTimer - this.lastDrawnSkyTimer > 50) { /* Updating sky at ~ 20fps */
      this.lastDrawnSkyTimer = this.skyGradientTimer;
      let gr = this.skyGradientCurrentValues;
      let rgb0x1 = ((1 << 24) + (gr[0] << 16) + (gr[1] << 8) + gr[2]).toString(16).slice(1);

      if (this.config.GRAPHICS_SKY_GRADIENT == 'SOLID') {
        this.skyCanvasCtx.fillStyle = '#' + rgb0x1;
      } else if (this.config.GRAPHICS_SKY_GRADIENT == 'GRADIENT') {
        let gradient = this.skyCanvasCtx.createLinearGradient(0, 0, 0, this.dimensions.HEIGHT);
        let rgb0x2 = ((1 << 24) + (gr[3] << 16) + (gr[4] << 8) + gr[5]).toString(16).slice(1);
        gradient.addColorStop(0, '#' + rgb0x1);
        gradient.addColorStop(1, '#' + rgb0x2);
        this.skyCanvasCtx.fillStyle = gradient;
      }
      this.skyCanvasCtx.fillRect(0, 0, this.dimensions.WIDTH, this.dimensions.HEIGHT);
      this.drawCounter++;
      if (ratio == 1) {
        this.skyGradientDuration = 0;
      }
    }
  }

  repaint(now) {
    this.repaintPending = false;

    var deltaTime = now - (this.time || now);
    this.time = now;

    for (let key in this.consoleButtons) {
      this.consoleButtons[key].repaint(deltaTime);
    }

    if (this.menu) {
      this.repaintSkyGradient(deltaTime);
      this.clearCanvas();
      this.menu = this.menu.repaint(deltaTime);
      this.scheduleNextRepaint();
      return;
    }

    this.repaintSkyGradient(deltaTime);
    this.clearCanvas();

    if (this.playing) {
      this.runningTime += deltaTime;
      var hasObstacles = this.runningTime > this.config.CLEAR_TIME;

      if (this.crashed && this.gameOverPanel) {
        this.gameOverPanel.draw(deltaTime);

        let alpha = this.actions[0] ? (3000-this.actions[0].timer)/3000 : 0;
          if (alpha < 0) alpha = 0;
        this.horizon.repaint(deltaTime, this.currentSpeed, hasObstacles, this.inverted, alpha);

        if (alpha > 0.95) {
          let crashPoint = this.actions[0].boxes[0].intersection(this.actions[0].boxes[1]).center();
          this.canvasCtx.drawImage(ODR.spriteGUI,
              OnDaRun.spriteDefinition.CRASH.x,
              OnDaRun.spriteDefinition.CRASH.y,
              this.config.CRASH_WIDTH, this.config.CRASH_HEIGHT,
              crashPoint.x - this.config.CRASH_WIDTH/2, crashPoint.y - this.config.CRASH_HEIGHT/2,
              this.config.CRASH_WIDTH, this.config.CRASH_HEIGHT);
        }

        this.gameOverPanel.draw();
      } else {
        this.horizon.repaint(deltaTime, this.currentSpeed, hasObstacles, this.inverted, 1);
      }

      // Check for collisions.
      let obstacle;

      if (hasObstacles) {
        for (let i = 0; obstacle = this.horizon.obstacles[i]; i++) {
          obstacle.crash = this.amandarine.testCollision(obstacle, this.amandarine);
          if (obstacle.crash) {
            break;
          }
        }
      }

      if (!obstacle) {
        if (!this.crashed) {
          this.distanceRan += this.currentSpeed * deltaTime / this.msPerFrame;
        }

        if (this.shouldIncreaseSpeed && this.currentSpeed < this.config.MAX_SPEED) {
          //this.currentSpeed += this.config.ACCELERATION;
          this.currentSpeed = this.config.SPEED + this.runningTime * this.config.ACCELERATION;
        }
      } else if (!this.crashed) {

        this.queueAction({
          type: A8e.status.CRASHED,
          timer: 0,
          priority: 3,
          boxes: obstacle.crash,
        }, this.currentSpeed);

        this.gameOver(obstacle);
      }

      let playAchievementSound = this.distanceMeter.repaint(deltaTime,
        Math.ceil(this.distanceRan));

      if (playAchievementSound) {
        if (playAchievementSound != this.lastAchievement)
          this.playSound(this.soundFx.SOUND_SCORE,0.2);
        this.lastAchievement = playAchievementSound;

        if (playAchievementSound >= this.achievements[0]) {
          this.achievements.shift();
          this.terminal.setMessages(this.achievements.shift(),6000);
        }
      }

      if (this.invertTimer > this.config.INVERT_FADE_DURATION) {
        this.invertTimer = 0;
        this.invertTrigger = false;
        this.invert();
      } else if (this.invertTimer) {
        this.invertTimer += deltaTime;
      } else {
        var actualDistance = this.distanceMeter.getActualDistance(Math.ceil(this.distanceRan));

        if (actualDistance > 0) {
          this.invertTrigger = !(actualDistance % this.config.INVERT_DISTANCE);

          if (this.invertTrigger && this.invertTimer === 0) {
            this.invertTimer += deltaTime;
            this.invert();
          }
        }
      }
    } else if (!this.crashed) {
      this.horizon.repaint(0, 6, true);
    } else {
        this.horizon.repaint(0, 0, false, this.inverted, 1);
        if (this.gameOverPanel) {
          this.gameOverPanel.draw();
        }
        this.distanceMeter.repaint(0, Math.ceil(this.distanceRan))
    }

    let a = this.actions[0];
    this.scheduleActionQueue(now, deltaTime, this.currentSpeed);
    this.terminal.repaint(deltaTime);


    if (this.playLyrics) {
      let text = this.music.lyrics;
      if (text === null) {
        this.playLyrics = false;
      } else {
        this.subtitle = new Text(600/14,0).setText(text||"");
      }
    }

    if (this.subtitle)
      this.subtitle.draw(this.canvasCtx,0,180);

    if (N7e.userSigning) {
      /* Draw starry spinner */
      this.canvasCtx.drawImage(this.spriteGUI,
        38 + ~~(now/100)%4 * 22, 73, 22, 22,
        600-25, 200-25, 22, 22);
    }

    if (this.config.GRAPHICS_DISPLAY_INFO == 'YES') {
      this.paintRound = this.paintRound || 0;
      this.paintCounter = this.paintCounter || 0;
      this.paintCounter++;
      this.paintRoundTimer = this.paintRoundTimer || 1000;
      this.paintRoundTimer -= deltaTime;
      if (this.paintRoundTimer < 0) {
        this.paintRoundTimer += 1000;
        this.paintRound = this.paintCounter;
        this.paintCounter = 0;
      }

      new Text(600/14,1).setText(
        'S:'+this.currentSpeed.toFixed(3)
      +' T:'+(this.runningTime/1000).toFixed(1)
      +' FPS:'+this.paintRound).draw(this.canvasCtx,-10,200-16);
    }

    this.scheduleNextRepaint();
  }

  handleEvent(e) {
    if (this.menu && this.menu.handleEvent && this.menu.handleEvent(e)) {
      return;
    }
    switch (e.type) {

      case OnDaRun.events.KEYDOWN:
        if (!e.repeat && this.consoleButtonForKeyboardCodes[e.code]) {
          this.consoleButtonForKeyboardCodes[e.code].handleEvent(e);
          break;
        }
      case OnDaRun.events.TOUCHSTART:
      case OnDaRun.events.MOUSEDOWN:
        this.onKeyDown(e);
        break;

      case OnDaRun.events.KEYUP:
        if (!e.repeat && this.consoleButtonForKeyboardCodes[e.code]) {
          this.consoleButtonForKeyboardCodes[e.code].handleEvent(e);
          break;
        }
      case OnDaRun.events.TOUCHEND:
      case OnDaRun.events.MOUSEUP:
        this.onKeyUp(e);
        break;
    }
  }

  startListening() {
    // Keys.
    document.addEventListener(OnDaRun.events.KEYDOWN, this);
    document.addEventListener(OnDaRun.events.KEYUP, this);

    if (!IS_MOBILE) {
      /*
      document.addEventListener(OnDaRun.events.MOUSEDOWN, this);
      document.addEventListener(OnDaRun.events.MOUSEUP, this);
      */
    }
  }

  stopListening() {
    document.removeEventListener(OnDaRun.events.KEYDOWN, this);
    document.removeEventListener(OnDaRun.events.KEYUP, this);

    if (!IS_MOBILE) {
      /*
      document.removeEventListener(OnDaRun.events.MOUSEDOWN, this);
      document.removeEventListener(OnDaRun.events.MOUSEUP, this);
      */
    }
  }

  onKeyDown(e) {
    // Reject repeating key events.
    if (e.repeat) {
      return;
    }

    // Prevent native page scrolling whilst tapping on mobile.
    if (IS_MOBILE && this.playing) {
      e.preventDefault();
    }
  }

  onKeyUp(e) {
    var keyCode = String(e.keyCode);

    if (keyCode <= 52 && keyCode >= 49) {
      /* Mapping 1,2,3,4 => 0,1,2,3 */
      this.setGraphicsMode(keyCode - 49, true);
      return;
    }
  }

  queueAction(action) {
    if (this.menu && action.control) {
      this.menu.queueAction(action);
      return;
    }

    this.actionIndex++;
    action.index = this.actionIndex;
    this.actions.push(action);
  }

  isLeftClickOnCanvas(e) {
    return e.button != null && e.button < 2 &&
      e.type == OnDaRun.events.MOUSEUP && e.target == this.canvas;
  }

  scheduleNextRepaint() {
    if (N7e.freeze) {
      console.warn('FROZEN');
      return;
    }
    if (!this.repaintPending) {
      this.repaintPending = true;
      this.raqId = requestAnimationFrame(this.repaint.bind(this));
    }
  }

  isRunning() {
    return !!this.raqId;
  }

  gameOver(obstacle) {
    switch(obstacle.typeConfig.type) {
      case "LIVER":
      case "RUBBER":
        this.playSound(this.soundFx.SOUND_QUACK, 0.2, false, 0.2);
        break;
      case  "ROTATA":
      case  "VELOTA":
        this.playSound(this.soundFx.SOUND_CRASH, 0.5);
        this.playSound(this.soundFx.SOUND_BICYCLE,0.5);
        break;
      default:
        this.playSound(this.soundFx.SOUND_HIT, 1.0, false, 0.2);
    }
    vibrate(200);

    if (!ODR.config.SHOW_COLLISION) {
      /*
      this.canvasCtx.filter = 'sepia(1)';
      this.sepia = 1.0;
      */
      /*
      this.clearCanvas();
      this.horizon.repaint(0, 0, true);
      */
    }

    //this.stop();
    this.crashed = true;
    this.distanceMeter.acheivement = false;

    //FIXME
    /*
    console.trace();
    this.amandarine.repaint(100, this.currentSpeed, this.actions[0]);
    */

    if (!this.gameOverPanel) {
      this.gameOverPanel = new GameOverPanel(this.canvas,
        this.spriteDef.TEXT_SPRITE, this.spriteDef.RESTART,
        this.dimensions);
    }

    this.gameOverPanel.draw();

    let d = this.distanceMeter.getActualDistance(this.distanceRan);

    if (d > 1000 && this.distanceRan > this.highestScore / 2) this.playLyrics = true;

    if (d < 600) {
      this.achievements = [
        200, 'KEEP RUNNING!#natB',
        400, 'GOOD JOB!#natB',
        800, 'JUST DONT DIE!#natB',
      ];
    } else {

      if (this.distanceRan > this.highestScore)
        this.terminal.setMessages('A NEW HIGH ' + d + '! #natB',5000);

      d = d/2 - d/2%100;
      this.achievements = [
        d, 'KEEP RUNNING!#natB',
        d*2, 'GOOD JOB!#natB',
        d*3, 'JUST DONT DIE!#natB',
        d*4, '...#natB',
      ];
    }

    // Update the high score.
    if (this.distanceRan > this.highestScore) {
      if (N7e.user) {
        N7e.user.odrRef.child('score').set(this.distanceRan);
      }

      this.highestScore = Math.ceil(this.distanceRan);
      this.distanceMeter.setHighScore(this.highestScore);
    }


    // Reset the time clock.
    this.time = getTimeStamp();
    this.crashedTime = this.time;
  }

    /*
  stop() {
    console.trace();
    if (this.isStopping) {
      return;
    }

    let stoppingDelta = this.stoppingTime - this.time;
    if (stoppingDelta > 0) {
      this.isStopping = true;
      setTimeout(() => {
        if (this.isStopping) {
          this.isStopping = false;
          this.stoppingTime = 0;
          this.stop();
        }
      }, stoppingDelta);
      return;
    }

    this.playing = false;
    cancelAnimationFrame(this.raqId);
    this.raqId = 0;
    this.isStopping = false;
  }
    */

  play() {
    if (!this.crashed) {
      this.playing = true;
      this.time = getTimeStamp();
      //this.repaint();
    }
  }

  restart() {
    if (!this.raqId) {
      this.subtitle = null;
      this.actions = [];
      //this.playCount++;
      this.playLyrics = false;
      this.shouldAddObstacle = true;
      this.shouldIncreaseSpeed = true;

      this.runningTime = 0;
      this.playing = true;
      this.crashed = false;
      this.distanceRan = 0;
      this.setSpeed(this.config.SPEED);
      this.time = getTimeStamp();
      this.clearCanvas();
      this.distanceMeter.reset(this.highestScore);
      this.horizon.reset();
      this.amandarine.reset();
      this.playSound(this.soundFx.SOUND_SCORE,0.2);
      this.invert(true);
      this.repaint(this.time);
      this.gameOverPanel.timer = 0;
      this.music.stop();
    }
  }

  /*
  onVisibilityChange(e) {
    if (document.hidden || document.webkitHidden || e.type == 'blur' || document.visibilityState != 'visible') {
      this.stop();
    } else if (!this.crashed) {
      this.amandarine.reset();
      this.play();
    }
  }
  */

  invert(reset) {
    if (reset) {
      if (this.config.GRAPHICS_DESKTOP_LIGHT == 'LIGHT') {
        document.body.classList.toggle(OnDaRun.classes.INVERTED, false);
      }

      this.invertTimer = 0;
      this.inverted = false;
    } else {
      this.inverted = this.config.GRAPHICS_DESKTOP_LIGHT == 'LIGHT'
        ? document.body.classList.toggle(OnDaRun.classes.INVERTED, this.invertTrigger)
        : this.invertTrigger;
    }

    this.setSkyGradient(this.inverted ? ODR.config.SKY.NIGHT : ODR.config.SKY.DAY, 3000);
  }


  /* Phear the Scheduler. Cuz it's a fucking mess.
     Scheduler is for conducting specific behaviors of an action to
     a particular priority before enacting the action: enactAction().

     *** Priority Definitions ***
      0: Either...
        a) Collecting active parameters (eg. weighting Jump & Slide)
        b) Suspended. Waiting to be updated into a background task.
      1: Either...
        a) Next action in the queue; will be activated once an active task has ended.
        b) Timeless background task. (eg. Wait, Run. Will never be active
          but will eventually be pushed back to 0).
      2: Active, will not be interrupted during game play. (eg. Jump, Slide)
      3: Interrupting. (eg. Crash, Pause)
     -1: Zombie, a released task.
  */
  scheduleActionQueue(now, deltaTime, speed) {

    /* activeAction points to the current active action, drawings & tests
    such as collision checkings will be done with this action.
    */
    this.activeAction = null;

    // Sort & filter main action queue.
    this.actions.sort((a,b) => a.priority == b.priority
      ? a.index - b.index
      : b.priority - a.priority);
    this.actions = this.actions.filter( action => {
      if (action.priority == -1) return false;
      if (action.priority == 1
          && action.hasOwnProperty('duration')
          && action.end + action.duration < now - 500) {
        action.priority = -1;
        return false;
      }
      return true;
    });

    let gsi = this.amandarine.slidingGuideIntensity;
    let gji = this.amandarine.jumpingGuideIntensity;
    this.amandarine.slidingGuideIntensity = 0;
    this.amandarine.jumpingGuideIntensity = 0;

    //Prevent modifications during traversing the queue.

    HANDLE_ACTION_QUEUE: {
      let actionQueue = this.actions.slice();
      for (let queueIndex = 0, action; action = actionQueue[queueIndex]; queueIndex++) {
        switch(action.priority) {
          case 0: { /* priority : Preparing actions */

            switch(action.type) {
              case A8e.status.JUMPING:
                this.amandarine.jumpingGuideIntensity = Math.min(1,gji+deltaTime/200);
                this.amandarine.drawJumpingGuide(action, now, speed);
                continue;
              case A8e.status.SLIDING:
                this.amandarine.slidingGuideIntensity = Math.min(1,gsi+deltaTime/200);
                this.amandarine.drawSlidingGuide(action, now, speed);
                continue;
              case A8e.status.RUNNING:

                action.timer = 0;
                action.priority = 1;
                this.activeAction = action;
                //this.amandarine.enactAction(action, deltaTime, speed);

                break;
              case A8e.status.WAITING:
                this.activeAction = action;
              default:;
            }

            break HANDLE_ACTION_QUEUE;
          }

          case 1:  /* priority : Initialise action */
            switch(action.type) {
              case A8e.status.JUMPING:
                this.activeAction = action;

                    if (this.crashed) {
                      console.trace();
                      /* crash action should have locked the scheduler */
                      console.error('Shoud never be here.')
                      if (getTimeStamp() - this.crashedTime >= this.config.GAMEOVER_CLEAR_TIME) {
                        this.restart();
                      }
                      break HANDLE_ACTION_QUEUE;
                    }

                if (this.config.GRAPHICS_DUST != 'NONE') {
                  this.amandarine.dust.xPos = this.amandarine.xPos - 24;
                  this.amandarine.dust.addPoint(0, 0, -40, -10 * Math.random());
                }

                break;
              case A8e.status.SLIDING:
                action.xPos = this.amandarine.xPos;
                break;

              // These background-type actions (priority 1 without specific
              // duration) below will 'continue' through the action queue
              // to proceed with the active preparing action (priority 0).
              case A8e.status.RUNNING:
                this.activeAction = action;
                action.speed = speed;



                /*
                if (action.hasOwnProperty('duration') && action.duration > 0) {
                  action.duration -= deltaTime;
                  if (action.duration < 0) {
                    action.priority = -1;
                  } else {
                    //this.amandarine.enactAction(action, deltaTime, speed);
                  }
                  break HANDLE_ACTION_QUEUE;
                }
                */

                continue;

              case A8e.status.CRASHED:
                // The priority-3 was demoted to 1
                //this.amandarine.enactAction(action, deltaTime, speed);
              default:
                break HANDLE_ACTION_QUEUE;
            }
            action.priority = 2;
            // All 1s will progress into 2s
          case 2: /* priority */
            this.activeAction = action;
            //this.amandarine.enactAction(action, deltaTime, speed);

            /*
            if (action.priority == -1) {

              // At the end of the first action, the actual game begins.
              console.log(action.start,this.playCount)
              if (action.start && action.start != this.playCount) {
                this.playCount++;
                switch(this.playCount) {
                  case 1:
                    this.terminal.setMessages("go go go!!",2000);
                    break;
                  case 10:
                    this.terminal.setMessages('NATHERINE ♥ YOU.#natB',10000);
                    break;
                  case 20:
                    OR.terminal.setMessages('NATHERINE STILL ♥ You.#natB',10000);
                    break;
                  case 30:
                    this.terminal.setMessages('NATHERINE WILL ALWAYS ♥ You.#natB',10000);
                    break;
                  default:
                  if (this.playCount % 10 == 0) {
                    this.terminal.setMessages('Love the game?\nPlease_Make_a_Donation\nTO_Thai_Redcross_#redcross',8000);
                  } else {
                    this.terminal.setMessages('▻▻',1000);
                  }
                }

                this.music.stop(); // FIXME shouldn't need, better try to prevent music from starting after key down.
                this.music.load('offline-play-music', this.config.PLAY_MUSIC);
                this.playIntro();
                this.setSpeed(this.config.SPEED);
                this.defaultAction.type = A8e.status.RUNNING;
              }

              // To get default action updated.
              this.defaultAction.priority = 0;
            }*/

            break HANDLE_ACTION_QUEUE;
          case 3: /* priority */
            this.activeAction = action;
            switch(action.type) {
              case A8e.status.RUNNING:

                /* Running into the scene
                  (A8e.config.START_X_POS + 200)*1000/FPS*/
                if( this.amandarine.xPos > this.amandarine.config.START_X_POS ) {
                  action.speed = 0;
                  this.amandarine.xPos = this.amandarine.config.START_X_POS;
                  /* Setting speed to 0 turn DefaultAction into a waiting.
                  This is not very generic; that we may allow queue.replaceAction()
                  to replace a default with another that one may assign specific
                  scripts to the replacing action class. ie. since some actions
                  conceptually don't allow -1 priority */
                }
                // Don't proceed action while walking in.
                break HANDLE_ACTION_QUEUE;
              case A8e.status.PAUSED:
                //NYI
                break HANDLE_ACTION_QUEUE;
              case A8e.status.CRASHED: {
                if (0 == action.timer) {
                  //TOOD this.dispatchEvent(new CustomEvent('odr-crash', { bubbles: false, detail: { action: action } }));
                  console.log('CRASHED');

                  this.music.stop();
                  this.playSound(this.soundFx.SOUND_OGGG,0.3);
                  this.setSkyGradient(this.config.SKY.SUNSET,3000);
                  this.shouldAddObstacle = false;
                  this.shouldIncreaseSpeed = false;

                  let crashPoint = action.boxes[0].intersection(action.boxes[1]).center();
                  if (crashPoint.x > action.boxes[0].center().x) {
                    action.dir = -1;
                  } else {
                    action.dir = 1;
                  }

                  action.duration = 200;
                  action.top = action.duration / 1000;
                  action.halfTime = Math.sqrt(2000 * action.duration / A8e.config.GRAVITY);
                  action.timer = 0;
                  action.yCrashed = this.amandarine.yPos;
                  action.lagging = speed;
                }

                //this.amandarine.enactAction(action, deltaTime, speed);

                if (action.timer > 3000 && !action.playEndMusic) {
                  action.playEndMusic = true;
                  this.music.load('offline-intro-music', this.config.PLAY_MUSIC, this.config.NATHERINE_LYRICS);
                }

                // Waiting for a restart
                // Clear the buttons during clear time or restart afterwards.
                queueIndex++;
                let nextAction;
                while (nextAction = actionQueue[queueIndex]) {
                  if (nextAction.type == A8e.status.SLIDING
                      || nextAction.type == A8e.status.JUMPING) {
                    if (action.timer < this.config.GAMEOVER_CLEAR_TIME)  {
                      nextAction.priority = -1;
                    } else {
                      this.music.stop();
                      this.setSkyGradient(ODR.config.SKY.DAY,3000);
                      action.priority = -1;

                      // Let the default action take responsibility
                      this.activeAction = null;
                      //this.yPos = this.groundYPos;
                      this.xPos = -40;
                      this.playLyrics = false;
                      this.shouldAddObstacle = true;
                      this.shouldIncreaseSpeed = true;
                      this.runningTime = 0;
                      this.playing = true;
                      this.crashed = false;
                      this.distanceRan = 0;
                      this.gameOverPanel.timer = 0;
                      this.invert(true);

                      this.setSpeed(this.config.SPEED);
                      this.playSound(this.soundFx.SOUND_SCORE,0.2);
                      this.distanceMeter.reset(this.highestScore);
                      this.horizon.reset();
                      this.amandarine.reset();
                      this.subtitle = null;
                      setTimeout(() => { this.music.load('offline-play-music', this.config.PLAY_MUSIC); }, 1500);
                      break HANDLE_ACTION_QUEUE;
                    }
                  }
                  queueIndex++;
                }
              } //break HANDLE_ACTION_QUEUE;
              break;
              case A8e.status.WAITING:
                this.introScriptTimer -= deltaTime;
                if (this.introScriptTimer < 0) {
                  let wait = this.introScript.shift();
                  let text = this.introScript.shift();
                  let dur = 6000;
                  let wc = text.split(' ').length;
                  if (wc > 5) {
                    dur = wc * 1200;
                  }

                  this.introScript.push(wait);
                  this.introScript.push(text);

                  this.terminal.setMessages(text + ' #natB', dur);
                  this.introScriptTimer = wait;
                }

                /* Find starters */
                for (let i = queueIndex, nextAction; nextAction = actionQueue[i]; i++) {
                  if (nextAction.type == A8e.status.SLIDING
                      || nextAction.type == A8e.status.JUMPING) {

                    if (nextAction.priority == 0 && !action.hasStoppedMusic) {
                      action.heldStart = action.timer;
                      action.hasStoppedMusic = true;
                      this.music.stop();
                    } else if (nextAction.priority == 1) {
                      this.subtitle = null;
                      this.shouldAddObstacle = true;
                      this.shouldIncreaseSpeed = true;
                      this.setSpeed(this.config.SPEED);
                      this.playing = true;
                      this.music.load('offline-play-music', this.config.PLAY_MUSIC);
                      action.speed = this.config.SPEED;
                      action.priority = 1;
                      this.setSkyGradient(ODR.config.SKY.DAY,3000);
                      this.terminal.timer = 200;
                      /*
                      this.queueAction({
                        type: A8e.status.RUNNING,
                        priority: 0,
                      });
                      */
                    } else if (nextAction.priority == 0) {
                    }
                  }
                }

                break HANDLE_ACTION_QUEUE;
              default:
              break;
            }
            break;

          default: /*priority*/
            console.error(action, action.priority);
            N7e.freeze = true;
            /*
            this.amandarine.enactAction(action, deltaTime, speed);
            break HANDLE_ACTION_QUEUE;
            */
        }
      }
    }

    if (this.activeAction)
      this.amandarine.enactAction(this.activeAction, deltaTime, speed);
    else {
      //console.log('No active action for repainting.');
      //N7e.freeze = true;
    }
    //this.amandarine.repaint(deltaTime, speed, activeAction);
  }


}

OnDaRun.defaultDimensions = {
  WIDTH: DEFAULT_WIDTH,
  HEIGHT: 200
};

OnDaRun.Configurations = {
  ACCELERATION: 0.00050/16,
  BG_CLOUD_SPEED: 0.2,
  BOTTOM_PAD: 10,
  CLEAR_TIME: 3000,
  CLOUD_FREQUENCY: 0.5,
  CRASH_WIDTH: 32,
  CRASH_HEIGHT: 32,
  GAMEOVER_CLEAR_TIME: 1500,
  GAP_COEFFICIENT: 0.6,
  GROUND_WIDTH: 100,
  INVERT_FADE_DURATION: 12000,
  INVERT_DISTANCE: 700,
  SKY_SHADING_DURATION: 2000,
  MAX_BLINK_COUNT: 30,
  MAX_CLOUDS: 6,
  MAX_OBSTACLE_LENGTH: 3,
  MAX_OBSTACLE_DUPLICATION: 2,
  MAX_ACTION_PRESS: 700,
  MIN_ACTION_PRESS: 200,
  MIN_ACTION_PRESS_FACTOR: 5, // For increasing minimum press when moving faster.
  MAX_SPEED: 13,
  MIN_JUMP_HEIGHT: 35,
  MOBILE_SPEED_COEFFICIENT: 1.2,
  RESOURCE_TEMPLATE_ID: 'audio-resources',
  SCALE_FACTOR: 210,
  SLIDE_FACTOR: 1,
  SPEED: 6,
  SHOW_COLLISION: false,
  GRAPHICS_MODE: 0,
  GRAPHICS_MODE_SETTINGS: [
    { /*0*/
      GRAPHICS_GROUND_TYPE: 'GRASS',
      GRAPHICS_DESKTOP_LIGHT: 'LIGHT',
      GRAPHICS_CLOUDS: 10,
      GRAPHICS_CLOUDS_TYPE: 'DEPTH',
      GRAPHICS_STARS: 10,
      GRAPHICS_STARS_TYPE: 'SHINE',
      GRAPHICS_MOUNTAINS: 10,
      GRAPHICS_MOUNTAINS_TYPE: 'NORMAL',
      GRAPHICS_MOON: 'SHINE',
      GRAPHICS_SKY_GRADIENT: 'GRADIENT',
      GRAPHICS_SKY_STEPS: 10,
      GRAPHICS_SLIDE_STEPS: 4,
      GRAPHICS_DAY_LIGHT: 0,
      GRAPHICS_DUST: 'DUST',
    },
    { /*1*/
      GRAPHICS_GROUND_TYPE: 'STRIPES',
      GRAPHICS_DESKTOP_LIGHT: 'NONE',
      GRAPHICS_CLOUDS: 8,
      GRAPHICS_CLOUDS_TYPE: 'DEPTH',
      GRAPHICS_STARS: 8,
      GRAPHICS_STARS_TYPE: 'SHINE',
      GRAPHICS_MOUNTAINS: 8,
      GRAPHICS_MOUNTAINS_TYPE: 'NORMAL',
      GRAPHICS_MOON: 'SHINE',
      GRAPHICS_SKY_GRADIENT: 'GRADIENT',
      GRAPHICS_SKY_STEPS: 10,
      GRAPHICS_SLIDE_STEPS: 4,
      GRAPHICS_DAY_LIGHT: 0,
      GRAPHICS_DUST: 'DUST',
    },
    { /*2*/
      GRAPHICS_GROUND_TYPE: 'DIRT',
      GRAPHICS_DESKTOP_LIGHT: 'NONE',
      GRAPHICS_CLOUDS: 0,
      GRAPHICS_CLOUDS_TYPE: 'NORMAL',
      GRAPHICS_STARS: 0,
      GRAPHICS_STARS_TYPE: 'NORMAL',
      GRAPHICS_MOUNTAINS: 4,
      GRAPHICS_MOUNTAINS_TYPE: 'PLAIN',
      GRAPHICS_MOON: 'NORMAL',
      GRAPHICS_SKY_GRADIENT: 'SOLID',
      GRAPHICS_SKY_STEPS: 5,
      GRAPHICS_SLIDE_STEPS: 1,
      GRAPHICS_DAY_LIGHT: 0,
      GRAPHICS_DUST: 'NONE',
    },
  ],
  GRAPHICS_DISPLAY_INFO: 'NO',
  GRAPHICS_MODE_OPTIONS: {
    GRAPHICS_GROUND_TYPE: ['DIRT','STRIPES','GRASS'],
    GRAPHICS_DESKTOP_LIGHT: ['NONE','LIGHT'],
    GRAPHICS_CLOUDS: { min: 0, max: 10, step: 1 },
    GRAPHICS_CLOUDS_TYPE: ['NORMAL','DEPTH'],
    GRAPHICS_STARS:  { min: 0, max: 10, step: 1 },
    GRAPHICS_STARS_TYPE: ['NONE','NORMAL','SHINE'],
    GRAPHICS_MOUNTAINS: { min: 0, max: 10, step: 1 },
    GRAPHICS_MOUNTAINS_TYPE: ['NONE','PLAIN','NORMAL'],
    GRAPHICS_MOON: ['NONE','NORMAL','SHINE'],
    GRAPHICS_SKY_GRADIENT: ['SINGLE','SOLID','GRADIENT'],
    GRAPHICS_SKY_STEPS: { min: 0, max: 10, step: 1 },
    GRAPHICS_SLIDE_STEPS: { min: 0, max: 6, step: 1 },
    GRAPHICS_DAY_LIGHT: { min: 0, max: 4, step: 1 },
    GRAPHICS_DUST: ['NONE','DUST'],
    GRAPHICS_DISPLAY_INFO: ['YES','NO'],
  },
  SKY: {
    DAY: [~~(221*0.8), ~~(238*0.8), ~~(255*0.9), 238, 238, 255],
    //NIGHT: [68,136,170,102,153,187],
    NIGHT: [68,136,170,84,183,187],
    START: [251,149,93,251,112,93],
    SUNSET: [69,67,125,255,164,119],
  },
  NATHERINE_LYRICS: [
    0.7, "♬ Natherine ♬",
    3.3, "she is all they claim",
    6, "With her eyes of night",
    7.8, "and lips as bright as flame",
    11.4, "Natherine",
    13.6, "when she dances by",
    16.6, "Senoritas stare and caballeros sigh",
    22.0, "And I've seen",
    24.6, "toasts to Natherine",
    27.3, "Raised in every bar",
    29.2, "across the Argentine",
    32.7, "Yes, she has them all",
    34.3, "#tangerine on da run #tangerine",
    35.6, "And their #<3hearts#<3 belong to just one",
    38.4, "Their #<3hearts#<3 belong to",
    40, "#natA Natherine #natB",
    45, null,
  ],
};

OnDaRun.classes = {
  CANVAS: 'runner-canvas',
  CRASHED: 'crashed',
  INVERTED: 'inverted',
};

OnDaRun.events = {
  ANIM_END: 'webkitAnimationEnd',
  CLICK: 'click',
  KEYDOWN: 'keydown',
  KEYUP: 'keyup',
  MOUSEDOWN: 'mousedown',
  MOUSEUP: 'mouseup',
  RESIZE: 'resize',
  TOUCHEND: 'touchend',
  TOUCHSTART: 'touchstart',
  VISIBILITY: 'visibilitychange',
  BLUR: 'blur',
  FOCUS: 'focus',
  LOAD: 'load'
};

OnDaRun.spriteDefinition = {
  VELOTA: { x: 0, y: 0 },
  ROTATA: { x: 0, y: 52 },
  CACTUS_LARGE: { x: 369, y: 0 },
  CACTUS_SMALL: { x: 266, y: 0 },
  CLOUD: { x: 166, y: [1,20,46,61,76,95] },
  CRASH: { x: 37, y: 40},
  DUST: { x: 776, y: 2 },
  HORIZON: { x: 2, y: 104 },
  MOON: { x: 954, y: 0 },
  NATHERINE: { x: 0, y: 0 },
  LIVER: { x: 0, y: 0 },
  RUBBER: { x: 0, y: 38 },
  RESTART: { x: 0, y: 40 },
  TEXT_SPRITE: { x: 0, y: 0 },
  STAR: { x: 1114, y: 0 }
};

OnDaRun.sounds = {
  BUTTON_PRESS: 'offline-sound-press',
  SOUND_HIT: 'offline-sound-hit',
  SOUND_SCORE: 'offline-sound-reached',
  SOUND_SLIDE: 'offline-sound-slide',
  SOUND_DROP: 'offline-sound-drop',
  SOUND_JUMP: 'offline-sound-piskup',
  SOUND_CRASH: 'offline-sound-crash',
  SOUND_OGGG: 'offline-sound-oggg',
  SOUND_QUACK: 'offline-sound-quack',
  SOUND_BICYCLE: 'offline-sound-bicycle',
  SOUND_BLIP: 'offline-sound-blip',
};

OnDaRun.keycodes = {
  JUMP: { '38': 1, '32': 1, '39': 1 },  // Up, spacebar, Right
  SLIDE: { '37': 1, '40': 1 },  // Left, Down
  RESTART: { '13': 1 }  // Enter
};

Obstacle.MAX_GAP_COEFFICIENT = 1.5;
Obstacle.MAX_OBSTACLE_LENGTH = 3,
Obstacle.types = [
  {
    type: 'CACTUS_SMALL',
    width: 17,
    height: 35,
    yPos: OnDaRun.defaultDimensions.HEIGHT - 45,
    multipleSpeed: 4,
    minGap: 120,
    minSpeed: 0,
    collisionBoxes: [
      new CollisionBox(0, 7, 5, 27),
      new CollisionBox(4, 0, 6, 34),
      new CollisionBox(10, 4, 7, 14)
    ]
  },
  {
    type: 'CACTUS_LARGE',
    width: 25,
    height: 50,
    yPos: OnDaRun.defaultDimensions.HEIGHT - 60,
    multipleSpeed: 7,
    minGap: 120,
    minSpeed: 0,
    collisionBoxes: [
      new CollisionBox(0, 12, 7, 38),
      new CollisionBox(8, 0, 14, 49),
      new CollisionBox(13, 10, 10, 38)
    ]
  },
  {
    type: 'LIVER',
    width: 46,
    height: 38,
    yPos: [
      OnDaRun.defaultDimensions.HEIGHT - 50,
      OnDaRun.defaultDimensions.HEIGHT - 75,
      OnDaRun.defaultDimensions.HEIGHT - 100,
      OnDaRun.defaultDimensions.HEIGHT - 125,
      OnDaRun.defaultDimensions.HEIGHT - 150,
      OnDaRun.defaultDimensions.HEIGHT - 175,
    ], // Variable height.
    multipleSpeed: 999,
    // minSpeed: 8.5,
    minSpeed: 0,
    minGap: 150,
    collisionBoxes: [
      new CollisionBox(15, 18, 16, 16),
      new CollisionBox(31, 24, 12, 8),
      new CollisionBox(1, 22, 13, 4)
    ],
    frames: [0,46,92,138,92,46],
    frameRate: 1000 / 15,
    //speedOffset: .8
    speedFactor: 0.25,
  },
  {
    type: 'RUBBER',
    width: 46,
    height: 38,
    yPos: [
      OnDaRun.defaultDimensions.HEIGHT - 50,
      OnDaRun.defaultDimensions.HEIGHT - 75,
      OnDaRun.defaultDimensions.HEIGHT - 100,
      OnDaRun.defaultDimensions.HEIGHT - 125,
      OnDaRun.defaultDimensions.HEIGHT - 150,
      OnDaRun.defaultDimensions.HEIGHT - 175,
    ], // Variable height.
    multipleSpeed: 999,
    // minSpeed: 8.5,
    minSpeed: 0,
    minGap: 150,
    reversed: true,
    collisionBoxes: [
      new CollisionBox(15, 18, 16, 16),
      new CollisionBox(31, 24, 12, 8),
      new CollisionBox(1, 22, 13, 4)
    ],
    frames: [0,46,92,138,92,46],
    frameRate: 1000 / 15,
    speedFactor: -0.25,
  },
  {
    type: 'VELOTA',
    width: 52,
    height: 52,
    yPos: OnDaRun.defaultDimensions.HEIGHT - 62,
    multipleSpeed: 999,
    minSpeed: 0,
    minGap: 100,
    collisionBoxes: [

      new CollisionBox(17, 3, 17, 20),
      new CollisionBox(4, 23, 20, 27),
      new CollisionBox(24, 30, 23, 20)
    ],
    frames: [0,52,104,156,208,260,312,364],
    frameRate: 1000 / 15,
    speedFactor: 0.35,
  },
  {
    type: 'ROTATA',
    width: 52,
    height: 52,
    yPos: OnDaRun.defaultDimensions.HEIGHT - 62,
    multipleSpeed: 999,
    minSpeed: 0,
    minGap: 100,
    reversed: true,
    collisionBoxes: [
      new CollisionBox(17, 3, 17, 20),
      new CollisionBox(4, 23, 20, 27),
      new CollisionBox(24, 30, 23, 20)
    ],
    frames: [0,52,104,156,208,260,312,364],
    frameRate: 1000 / 15,
    speedFactor: -0.35,
  }
];

Obstacle.types.forEach(type => {
  if (type.reversed) {
    type.collisionBoxes.forEach(box => box.flop(type.width));
    type.frames.reverse();
  }
});

HorizonLine.dimensions = {
  WIDTH: 600,
  HEIGHT: 23,
  YPOS: OnDaRun.defaultDimensions.HEIGHT-23
};

Cloud.config = {
  HEIGHTS: [18,24,12,14,18,9],
  MAX_CLOUD_GAP: 400,
  MAX_SKY_LEVEL: 30,
  MIN_CLOUD_GAP: 50,
  MIN_SKY_LEVEL: OnDaRun.defaultDimensions.HEIGHT - 79,
  WIDTH: 92
};

NightMode.config = {
  FADE_SPEED: 0.035,

  MOON_BLUR: 10,
  MOON_SPEED: 0.1,
  WIDTH: 20,
  HEIGHT: 40,

  NUM_STARS: 15,
  STAR_SIZE: 10,
  STAR_SPEED: 0.07,
  STAR_MAX_Y: OnDaRun.defaultDimensions.HEIGHT - 50,
};

NightMode.phases = [140, 120, 100, 60, 40, 20, 0];

customElements.define('n7e-ondarun', OnDaRun);
