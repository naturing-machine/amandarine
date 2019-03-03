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

var N7e = {};

function shapeSpeedDuration(speed, duration) {
  let minPress = ODR.config.MIN_ACTION_PRESS + ODR.config.MIN_ACTION_PRESS_FACTOR*speed;
  return duration * (ODR.config.MAX_ACTION_PRESS - minPress)/ODR.config.MAX_ACTION_PRESS + minPress;
}

function getRandomNum(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getTimeStamp() {
  return IS_IOS ? new Date().getTime() : performance.now();
}

function vibrate(duration) {
  if (IS_MOBILE && window.navigator.vibrate) {
    window.navigator.vibrate(duration);
  }
}

function createAdjustedCollisionBox(box, adjustment) {
  return new CollisionBox(
    box.x + adjustment.x,
    box.y + adjustment.y,
    box.width,
    box.height);
};

function checkForCollision(obstacle, amandarine, opt_canvasCtx) {
  var obstacleBoxXPos = OnDaRun.defaultDimensions.WIDTH + obstacle.xPos;

  // Adjustments are made to the bounding box as there is a 1 pixel white
  // border around Amandarine and obstacles.
  var amandarineBox = new CollisionBox(
    amandarine.xPos + 1,
    amandarine.yPos + 1,
    amandarine.config.WIDTH - 2,
    amandarine.config.HEIGHT - 2);

  var obstacleBox = new CollisionBox(
    obstacle.xPos + 1,
    obstacle.yPos + 1,
    obstacle.typeConfig.width * obstacle.size - 2,
    obstacle.typeConfig.height - 2);

  // Debug outer box
  if (opt_canvasCtx) {
    drawCollisionBoxes(opt_canvasCtx, amandarineBox, obstacleBox);
  }

  // Simple outer bounds check.
  if (amandarineBox.intersects(obstacleBox)) {
    var collisionBoxes = obstacle.collisionBoxes;
    var amandarineCollisionBoxes = amandarine.getCollisionBoxes();

    // Detailed axis aligned box check.
    for (var t = 0; t < amandarineCollisionBoxes.length; t++) {
      for (var i = 0; i < collisionBoxes.length; i++) {
        // Adjust the box to actual positions.
        var adjAmdrBox =
          createAdjustedCollisionBox(amandarineCollisionBoxes[t], amandarineBox);
        var adjObstacleBox =
          createAdjustedCollisionBox(collisionBoxes[i], obstacleBox);
        var crashed = adjAmdrBox.intersects(adjObstacleBox);

        // Draw boxes for debug.
        if (opt_canvasCtx) {
          drawCollisionBoxes(opt_canvasCtx, adjAmdrBox, adjObstacleBox);
        }

        if (crashed) {
          return [adjAmdrBox, adjObstacleBox];
        }
      }
    }
  }
  return false;
};

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
}

class User {
  constructor(opt_providerName) {
    let redirect = true;
    switch(opt_providerName) {
      case "google": {
        firebase.auth().setPersistence(firebase.auth.Auth.Persistence.LOCAL).then(
          function() {
            var provider = new firebase.auth.GoogleAuthProvider();
            if (redirect) {
              return firebase.auth().signInWithRedirect(provider);
            } else {
              return firebase.auth().signInWithPopup(provider);
            }
          })
          .catch(function(error) {
            var errorCode = error.code;
            var errorMessage = error.message;
            console.log("Error", error);
          }
        );

      } break;

     default:
       break;
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

    this.canvasCtx.drawImage(this.typeConfig.sprite || ODR.spriteScene,
      sourceX, this.spritePos.y,
      sourceWidth * this.size, sourceHeight,
      Math.floor(this.xPos), this.yPos,
      this.typeConfig.width * this.size, this.typeConfig.height);
  }

  enact(deltaTime, speed) {
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
    for(let i = 0, point; point = this.points[i]; i++) {
      let ratio = (this.life - point.life) / this.life;
      let x = this.xPos + point.x + 40 + point.w * ratio;
      let y = this.yPos + point.y + OnDaRun.defaultDimensions.HEIGHT-25 + point.h * ratio;
      this.canvasCtx.drawImage(ODR.spriteScene,
        776 + 22 * Math.floor(8 * ratio), 2,
        22, 22,
        Math.ceil(x), Math.ceil(y),
        22, 22);
    }
  }

  enact(aging) {
    this.points = this.points.filter( point => {
      point.life -= aging;
      return point.life > 0;
    });
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
      Cloud.config.MIN_SKY_LEVEL) + Math.floor(50 * (1 - this.opacity));
    this.draw();
  }

  draw() {
    this.canvasCtx.save(); {

      if (ODR.config.GRAPHICS_MODE != 1) {
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

  enact(speed) {
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

    this.width = Math.floor(this.height * (2 + Math.random() * 3));
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

      if (ODR.config.GRAPHICS_MODE == 1) {
        this.canvasCtx.filter = 'brightness(90%) hue-rotate(-25deg)';
      }

      this.canvasCtx.fill();

      // cache shadow TODO make shadow reusable
      if (ODR.config.GRAPHICS_MODE != 1) {
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
      } this.canvasCtx.restore();
    }
  }

  enact(speed) {
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
    this.showStars = false;
    this.generateMoonCache();
    this.placeStars();
  }

  enact(activated, delta) {
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
      if (ODR.config.GRAPHICS_MODE != 1 && this.showStars) {
        for (var i = 0, star; star = this.stars[i]; i++) {
          star.x = this.adjustXPos(star.x, NightMode.config.STAR_SPEED);
        }
      }
      this.draw();
    } else {
      this.placeStars();
    }
    this.showStars = true;
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

    let mx,my;

    if (ODR.config.GRAPHICS_MODE != 1 && this.moonCanvas) {
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
    } else {
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
    if (ODR.config.GRAPHICS_MODE != 1 && this.showStars) {
      for (var i = 0, star; star = this.stars[i]; i++) {
        let twinkle = ((star.x + 2*star.y)%10)/5;
        twinkle = 0.2
          + 0.8 * (twinkle > 1.0
            ? 2 - twinkle
            : twinkle);
        let alpha = this.opacity * star.opacity * twinkle;
        let dt = Math.abs(star.x - mx) + Math.abs(star.y - my) - 50;
          if (dt < 0) dt = 0; else if (dt > 50) dt = 50;

        this.canvasCtx.globalAlpha = alpha * dt/50;
        //this.canvasCtx.filter = 'hue-rotate('+this.stars[i].hue+'deg)';
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
    this.enact(false);
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
    this.xPos = [];
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

    this.xPos = [0, HorizonLine.dimensions.WIDTH];
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
    this.grMode = ODR.config.GRAPHICS_MODE;

    ctx.save();
    ctx.translate(0,25 - OnDaRun.defaultDimensions.HEIGHT);
    for (let i = 0; i < ODR.config.GROUND_WIDTH; i++) {
        this.drawGround(ctx, i);
        ctx.translate(0,25);
    }
    ctx.restore();
  }

  drawGround(canvasCtx, spinner) {
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
      pw = Math.pow(scale,i),
      width = HorizonLine.dimensions.WIDTH;

          y + i < OnDaRun.defaultDimensions.HEIGHT + this.canvasCtx.lineWidth;

              i += step, pw *= pwStep ) {

      let width = HorizonLine.dimensions.WIDTH / pw;

      canvasCtx.save();
      canvasCtx.scale(pw, 1);
//            this.canvasCtx.transform(pw,0,0,1,0,0);

      // Draw grasses
      if (ODR.config.GRAPHICS_MODE == 4) {
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

        canvasCtx.strokeStyle = "rgba(32,128,0,"+(alphaStep * (i+8))+")";
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

      } else { // Draw stripes

//            canvasCtx.setLineDash([45,55,35,65]);
            /* TODO DIRT
        if (!this.stripes) {
          this.stripes = [];
          for (let j = 0; j < 10; j++) {
            let str = [10,10,10,10,10,10,10,10,10,10];
            for (let i = 0; i < 500; i++) {
              let a = getRandomNum(0,9);
              let b = getRandomNum(0,9);
              let v = getRandomNum(-5,5);
              if (str[a] - v > 0 && str[b] + v > 0) {
                str[a] -= v;
                str[b] += v;
              }
            }
            this.stripes.push(str);
          }
        }
            */

        canvasCtx.setLineDash([25,25]);
        //canvasCtx.setLineDash(this.stripes[(i+8)%10]);
        canvasCtx.lineWidth = step;
        canvasCtx.strokeStyle = "rgba(200,200,0,"+(alphaStep/2 * (i+8))+")";

        for (let s = 0; s <= 16; s+=2) {
          canvasCtx.beginPath();
          canvasCtx.moveTo(0, y + i);
          canvasCtx.lineTo(width, y + i);
          canvasCtx.lineDashOffset = -spinner + s + Math.floor(i*i/8) - width/2;
          canvasCtx.stroke();
        }
      }

      canvasCtx.restore();
    }
    canvasCtx.restore();
  }

  draw() {
    this.canvasCtx.drawImage(ODR.spriteScene, this.sourceXPos[0],
      this.spritePos.y,
      this.sourceDimensions.WIDTH, this.sourceDimensions.HEIGHT,
      this.xPos[0], this.yPos,
      this.dimensions.WIDTH, this.dimensions.HEIGHT);

    this.canvasCtx.drawImage(ODR.spriteScene, this.sourceXPos[1],
      this.spritePos.y,
      this.sourceDimensions.WIDTH, this.sourceDimensions.HEIGHT,
      this.xPos[1], this.yPos,
      this.dimensions.WIDTH, this.dimensions.HEIGHT);

    if (ODR.config.GRAPHICS_MODE == 1) return;

    if (ODR.config.GRAPHICS_MODE != this.grMode) {
      this.generateGroundCache();
    }

    if (ODR.config.GRAPHICS_MODE == 0) {
      this.canvasCtx.save();
      this.canvasCtx.globalCompositeOperation = 'multiply';
    }
      this.canvasCtx.drawImage(this.groundCanvas,
          0, (Math.floor(this.xPos[0] + 600) % ODR.config.GROUND_WIDTH) * 25 + 2,
          OnDaRun.defaultDimensions.WIDTH, 22,
          0, OnDaRun.defaultDimensions.HEIGHT - 22,
          OnDaRun.defaultDimensions.WIDTH, 22);

    if (ODR.config.GRAPHICS_MODE == 0) {
      this.canvasCtx.restore();
    }
  }

  adjustXPos(pos, increment) {
    var line1 = pos;
    var line2 = pos == 0 ? 1 : 0;

    this.xPos[line1] -= increment;
    this.xPos[line2] = this.xPos[line1] + this.dimensions.WIDTH;

    if (this.xPos[line1] <= -this.dimensions.WIDTH) {
      this.xPos[line1] += this.dimensions.WIDTH * 2;
      this.xPos[line2] = this.xPos[line1] - this.dimensions.WIDTH;
      this.sourceXPos[line1] = this.getRandomType() + this.spritePos.x;
    }
  }

  enact(deltaTime, speed) {
    var increment = speed * FPS / 1000 * deltaTime;

    if (this.xPos[0] <= 0) {
      this.adjustXPos(0, increment);
    } else {
      this.adjustXPos(1, increment);
    }
    this.draw();
  }

  reset() {
    this.xPos[0] = 0;
    this.xPos[1] = HorizonLine.dimensions.WIDTH;
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

  enact(deltaTime, currentSpeed, enactObstacles, showNightMode, alpha) {
    this.runningTime += deltaTime;
    this.nightMode.enact(showNightMode,deltaTime);
    this.enactClouds(deltaTime, currentSpeed, true);
    this.enactMountains(deltaTime, currentSpeed);
    this.enactClouds(deltaTime, currentSpeed);
    this.horizonLine.enact(deltaTime, currentSpeed);

    if (enactObstacles) {
      if (alpha == 1) {
        this.enactObstacles(deltaTime, currentSpeed);
      } else {
        this.canvasCtx.save();
        this.canvasCtx.globalAlpha = alpha;
        this.enactObstacles(deltaTime, currentSpeed);
        this.canvasCtx.restore();
      }
    }
  }

  enactClouds(deltaTime, speed, background) {
    var cloudSpeed = this.cloudSpeed / 1000 * deltaTime * speed;
    var numClouds = this.clouds.length;

    if (numClouds) {
      for (var i = numClouds - 1; i >= 0; i--) {
        if (background && this.clouds[i].opacity < 0.5) {
          this.clouds[i].enact(cloudSpeed);
        } else if (!background && this.clouds[i].opacity >= 0.5) {
          this.clouds[i].enact(cloudSpeed);
        }
      }

      var lastCloud = this.clouds[numClouds - 1];

      // Check for adding a new cloud.
      if (!background && numClouds < this.config.MAX_CLOUDS &&
          (this.dimensions.WIDTH - lastCloud.xPos) > lastCloud.cloudGap &&
          this.cloudFrequency > Math.random()) {
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

  enactMountains(deltaTime, speed) {
    var mountainSpeed = this.mountainSpeed / 1000 * deltaTime * speed;
    var numMountains = this.mountains.length;

    if (numMountains) {
      for (let j = 0; j < 2; j++) {
        for (let i = numMountains - 1; i >= 0; i--) {
          if (this.mountains[i].depth == j) {
            this.mountains[i].enact(mountainSpeed * (j ? 1.1 : 1));
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

  enactObstacles(deltaTime, currentSpeed) {
    // Obstacles, move to Horizon layer.
    for (let i = 0; i < this.obstacles.length; i++) {
      var obstacle = this.obstacles[i];
      obstacle.enact(deltaTime, currentSpeed);
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

class Amandarine {
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
    this.config = Amandarine.config;
    this.config.GRAVITY_FACTOR = 0.0000005 * Amandarine.config.GRAVITY * ODR.config.SCALE_FACTOR;
    // Current status.
    //this.status = Amandarine.status.WAITING;

    this.slidingGuideIntensity = 0;
    this.jumpingGuideIntensity = 0;
    this.dust = new Particles(canvas, this.xPos, this.yPos, Amandarine.config.DUST_DURATION);

    this.init();
  }

  init() {
    this.groundYPos = OnDaRun.defaultDimensions.HEIGHT - this.config.HEIGHT -
      ODR.config.BOTTOM_PAD;
    this.yPos = this.groundYPos;
    this.minJumpHeight = this.groundYPos - this.config.MIN_JUMP_HEIGHT;

    this.currentAnimFrames = Amandarine.animFrames.WAITING.frames;
    this.currentSprite = Amandarine.animFrames.WAITING.sprite;
    this.currentFrame = 0;

    this.draw(0, 0);
  }

  getCollisionBoxes() {
    switch (this.status) {
      case Amandarine.status.SLIDING:
        return Amandarine.collisionBoxes.SLIDING

      case Amandarine.status.RUNNING:
      default:
        return Amandarine.collisionBoxes.RUNNING;
    }
  }

  enact(deltaTime, speed, opt_action) {
    this.timer = (this.timer || 0) +  deltaTime;

    // Update the status.
    if (opt_action) {
      this.status = opt_action.type;
      this.currentFrame = 0;

      this.msPerFrame = opt_action.msPerFrame
        ? opt_action.msPerFrame
        : Amandarine.animFrames[opt_action.type].msPerFrame;

      this.currentAnimFrames = Amandarine.animFrames[opt_action.type].frames;

      this.currentSprite = Amandarine.animFrames[opt_action.type].sprite;
      if (opt_action.type == Amandarine.status.CRASHED && opt_action.dir == 1) {
        this.currentFrame = 1;
      }
    }

    // Game intro animation, Amandarine moves in from the left.
    /*
    if (this.playingIntro && this.xPos < this.config.START_X_POS) {
      this.xPos += (this.config.START_X_POS / this.config.INTRO_DURATION) * deltaTime;
    }
    */

    /* Don't draw crash state to observe the effective collision boxes */
    if (!ODR.config.SHOW_COLLISION || (opt_action && opt_action.type != Amandarine.status.CRASHED)) {
      this.draw(this.currentAnimFrames[this.currentFrame], 0);
    }

    // Update the frame position.
    if (this.timer >= this.msPerFrame) {
      this.currentFrame = this.currentFrame ==
        this.currentAnimFrames.length - 1 ? 0 : this.currentFrame + 1;
      this.timer = 0;
    }

    if (ODR.config.GRAPHICS_MODE != 1) this.dust.enact(deltaTime);
  }

  draw(x, y) {
    var sourceX = x * 2;
    var sourceY = y * 2;

    // Adjustments for sprite sheet position.
    sourceX += this.spritePos.x;
    sourceY += this.spritePos.y;

    if (this.currentSprite) {
      this.canvasCtx.drawImage(this.currentSprite, sourceX, sourceY, 40, 40,
        Math.floor(this.xPos), Math.floor(this.yPos),
        this.config.WIDTH, this.config.HEIGHT);

        this.dust.draw();
    }
  }

/*** Priority Definitions ***
  0: Either...
    a) Collecting active parameters (eg. weighting Jump & Slide)
    b) Suspended. Waiting to be updated into a background task.
  1: Either...
    a) Will be active once an active task has ended.
    b) Timeless background task. (eg. Wait, Run. Will never be active
      but will eventually be pushed back to 0).
  2: Active, will not be interrupted during game play. (eg. Jump, Slide)
  3: Interrupting. (eg. Crash, Pause)
 -1: Zombie, a released task.
 ***/

  // This method aim to filter the gathering actions to only be one of its kind.
  newAction(actionQueue, type) {
    for (let i = 0, action; action = actionQueue[i]; i++){
      if (action.type == type && action.priority == 0) {
        return action;
      }
    }

    return type == Amandarine.status.JUMPING
      || type == Amandarine.status.SLIDING
        ? {type: type, priority: 0, control: true}
        : {type: type, priority: 0};
  }

  handleActionQueue(now, deltaTime, speed) {

    // Sort & filter main action queue.
    ODR.actions.sort((a,b) => a.priority == b.priority
      ? a.index - b.index
      : b.priority - a.priority);
    ODR.actions = ODR.actions.filter( action => action.priority != -1 );

    let newAction;
    let newSpeed = speed;

    let gsi = this.slidingGuideIntensity;
    let gji = this.jumpingGuideIntensity;
    this.slidingGuideIntensity = 0;
    this.jumpingGuideIntensity = 0;

    HANDLE_ACTION_QUEUE: {
      for (let i = 0, action; action = ODR.actions[i]; i++) {
        switch(action.priority) {
          case 0: { /* priority : Preparing actions */

            switch(action.type) {
              case Amandarine.status.JUMPING:
                this.jumpingGuideIntensity = Math.min(1,gji+deltaTime/200);
                this.drawJumpingGuide(action, now, speed);
                continue;
              case Amandarine.status.SLIDING:
                this.slidingGuideIntensity = Math.min(1,gsi+deltaTime/200);
                this.drawSlidingGuide(action, now, speed);
                continue;
              case Amandarine.status.RUNNING:
                if (action.hasOwnProperty('xPos')) {
                  this.xPos = action.xPos;
                }

                action.timer = 0;
                action.priority = 1;
                this.enactAction(action, deltaTime, speed);
                newAction = action;

                break;
              case Amandarine.status.WAITING:
                this.introScriptTimer = 200;
                this.introScript = [
                  20000,"On Da Run!\nAmandarine\n\nVERSION BETA 0.95",
                  20000,"Hi...",
                  20000,"Just play already!",
                  20000,"Didn't know you love the song that much!",
                  20000,"Man U will win ⚽\nYou know.",
                  20000,'I didnt say "I_love_you" to hear it back. I said it to make sure you knew.♥',
                  20000,'Never give up on something you really want ♥',
                  20000,'You are my sunshine ☼♥',
                  20000,'My love for you is a journey;\nStarting at forever,\nand ending at never.♥',
                  20000,'Glory in life is not in never failing,but rising each time we fail.♥',
                  20000,'Love this project?\nDonate_Thai_Redcross_➕!\nSee the bottom right for details.',
                ];

                action.timer = 0;
                action.priority = 1;
                this.enactAction(action, deltaTime, speed);
                newAction = action;
              default:;
            }

            break HANDLE_ACTION_QUEUE;
          }

          case 1:  /* priority : Initialise action */
            switch(action.type) {
              case Amandarine.status.JUMPING:
                if (ODR.crashed) {
                  if (getTimeStamp() - ODR.crashedTime >= ODR.config.GAMEOVER_CLEAR_TIME) {
                    if (ODR.raqId) {
                      cancelAnimationFrame(ODR.raqId);
                      ODR.raqId = 0;
                    }
                    ODR.restart();
                  }
                  break HANDLE_ACTION_QUEUE;
                } else {
                  action.maxPressDuration = shapeSpeedDuration(speed, action.pressDuration);
                  // It seems more ergonomically natural to simply add the minimum than to clip the value.
                  action.top = action.maxPressDuration / 1000;
                  action.halfTime = Math.sqrt(2000 * action.maxPressDuration / Amandarine.config.GRAVITY);
                  action.msPerFrame = action.halfTime * 2 / 4;

                  if (action.end + action.halfTime * 2 < now) {
                    action.priority = -1;
                    continue;
                  }

                  ODR.playSound(ODR.soundFx.SOUND_JUMP,0.4);
                  ODR.playSound(ODR.soundFx.SOUND_DROP,0.4 * action.pressDuration/ODR.config.MAX_ACTION_PRESS);
                  action.timer = 0;

                  if (ODR.config.GRAPHICS_MODE != 1) {
                    this.dust.xPos = this.xPos - 24;
                    this.dust.addPoint(0, 0, -40, -10 * Math.random());
                  }

                  newAction = action;

                  if (action.start) {
                    ODR.setSkyGradient(ODR.config.SKY.DAY,3000);
                  }
                } break;
              case Amandarine.status.SLIDING:
                {
                  let sp = action.speed || speed + 0.2;

                  if (!action.maxPressDuration) {
                    action.maxPressDuration = ODR.config.SLIDE_FACTOR * shapeSpeedDuration(sp, action.pressDuration);
                  }
                  // Sliding act pretty much like jumping, just going one way forward.
                  //action.pressDuration += ODR.config.MIN_ACTION_PRESS_FACTOR;

                  action.fullDistance = sp * 0.001 * FPS * action.maxPressDuration;
                  action.fullTime = action.fullDistance / (sp * FPS);

                  if (action.end + action.fullTime * 1000 < now) {
                    action.priority = -1;
                    continue;
                  }

                  ODR.playSound(ODR.soundFx.SOUND_SLIDE,0.6);

                  action.timer = 0;
                  action.distance = 0;
                  action.friction = 2 * action.fullDistance / (action.fullTime * action.fullTime);
                  action.xPos = this.xPos;

                  newAction = action;
                  newSpeed = sp;
                } break;

              // These background-type actions (priority 1 without specific
              // duration) below will 'continue' through the action queue
              // to proceed with the active preparing action (priority 0).
              case Amandarine.status.RUNNING:
                if (action.speed) {
                  let sp = speed + action.speed;
                  let increment = sp * FPS / 1000 * deltaTime;
                  this.xPos += increment;
                }

                if (action.hasOwnProperty('duration') && action.duration > 0) {
                  action.duration -= deltaTime;
                  if (action.duration < 0) {
                    action.priority = -1;
                  } else {
                    this.enactAction(action, deltaTime, speed);
                  }
                  break HANDLE_ACTION_QUEUE;
                }

                this.enactAction(action, deltaTime, speed);
                continue;

              case Amandarine.status.WAITING:

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

                  ODR.terminal.setMessages(text + ' ☺', dur);
                  this.introScriptTimer = wait;
                }

                let xMap = [2,1,-2,-3,-2,1], yMap = [1,0,-2,-2,-2,0];
                ODR.canvasCtx.drawImage(ODR.spriteGUI, 0, 96, 105, 54,
                  Math.round(this.xPos + xMap[this.currentFrame] + 20),
                  Math.round(this.yPos + yMap[this.currentFrame] - 47), 105, 54);

                this.enactAction(action, deltaTime, speed);
                continue;
              default:
                break HANDLE_ACTION_QUEUE;
            }
            action.priority = 2;
            // All 1s will progress into 2s
          case 2: /* priority */
            this.enactAction(action, deltaTime, speed);

            if (action.priority == -1) {

              // At the end of the first action, the actual game begins.
              if (action.start) {
                ODR.musics.stop(); // FIXME shouldn't need, better try to prevent music from starting after key down.
                ODR.loadMusic('offline-play-music', ODR.config.PLAY_MUSIC);
                ODR.playIntro();
                ODR.setSpeed(ODR.config.SPEED);
                ODR.defaultAction.type = Amandarine.status.RUNNING;
              }

              // To get default action updated.
              ODR.defaultAction.priority = 0;
            }

            break HANDLE_ACTION_QUEUE;
          case 3: /* priority */
            switch(action.type) {
              case Amandarine.status.PAUSED:
                //NYI
                break HANDLE_ACTION_QUEUE;
              case Amandarine.status.CRASHED: {
                if (!action.enacted) {
                  ODR.musics.stop();
                  ODR.playSound(ODR.soundFx.SOUND_OGGG,0.3);
                  ODR.setSkyGradient(ODR.config.SKY.SUNSET,3000);

                  let crashPoint = action.boxes[0].intersection(action.boxes[1]).center();
                  if (crashPoint.x > action.boxes[0].center().x) {
                    action.dir = -1;
                  } else {
                    action.dir = 1;
                  }

                  action.duration = 200;
                  action.top = action.duration / 1000;
                  action.halfTime = Math.sqrt(2000 * action.duration / Amandarine.config.GRAVITY);
                  action.timer = 0;
                  action.yCrashed = this.yPos;
                  action.lagging = speed;
                  action.enacted = true;
                  this.enactAction(action, deltaTime, speed);
                  newAction = action;
                } else {
                  this.enactAction(action, deltaTime, speed);
                }

                if (action.priority == -1) {
                  ODR.actions.length = 0;
                }
              } break HANDLE_ACTION_QUEUE;
              default:;
            }

          default: /*priority*/
            this.enactAction(action, deltaTime, speed);
            break HANDLE_ACTION_QUEUE;
        }
      }
    }

    this.enact(deltaTime, speed, newAction);
  }

  enactAction(action, deltaTime, speed) {
    console.assert(action && action.priority != -1, action) ;

    let adjustX = () => {
      if (this.xPos < this.config.START_X_POS) {
        this.xPos += 0.1 * speed * (FPS / 1000) * deltaTime;
        if (this.xPos > this.config.START_X_POS) {
          this.xPos = this.config.START_X_POS;
        }
      } else if (this.xPos > this.config.START_X_POS) {
        this.xPos -= 0.1 * speed * (FPS / 1000) * deltaTime;
        if (this.xPos < this.config.START_X_POS) {
          this.xPos = this.config.START_X_POS;
        }
      }
    };

    action.timer += deltaTime;
    switch (action.type) {
      case Amandarine.status.WAITING:
        break;
      case Amandarine.status.RUNNING: {
        adjustX();
      } break;
      case Amandarine.status.JUMPING: {
        let timer = action.halfTime - action.timer;

        adjustX();
        this.yPos = this.groundYPos
          + ( this.config.GRAVITY_FACTOR * timer * timer
              - action.top * ODR.config.SCALE_FACTOR );

        if (timer < -action.halfTime) {
          ODR.playSound(ODR.soundFx.SOUND_DROP,0.6 * action.pressDuration/ODR.config.MAX_ACTION_PRESS);
          action.priority = -1;
          this.yPos = this.groundYPos;
          if (ODR.config.GRAPHICS_MODE != 1) {
            this.dust.xPos = this.xPos - 24;
            this.dust.addPoint(0, 0, -40, -10 * Math.random());
          }
        }
      } break;
      case Amandarine.status.SLIDING: {
        var increment = speed * FPS / 1000 * deltaTime;

        action.distance += increment;

        let it = action.fullTime - action.timer/1000;
          if (it < 0) it = 0;
        let distance = action.fullDistance - 1/2 * it * it * action.friction - action.distance;

        this.xPos = action.xPos + distance;
        //Sliding animation

        if (ODR.config.GRAPHICS_MODE != 1
            && this.status == Amandarine.status.SLIDING
            & this.dust.points.length < action.timer / 30) {
          this.dust.xPos = this.xPos - 24;
          let dsp = (action.speed ? action.speed : speed) / 6;
          this.dust.addPoint(-10, 0, dsp * -90, dsp * -15 * Math.random());
          this.dust.addPoint(5, 0, dsp * -75, dsp * -15 * Math.random());
        }

        if (action.timer >= action.fullTime * 1000) {
          action.priority = -1;
//                this.xPos = this.config.START_X_POS;
        }
      } break;
      case Amandarine.status.CRASHED: {
        let timer = action.halfTime - action.timer;

        this.yPos = action.yCrashed
          + ( this.config.GRAVITY_FACTOR/4 * timer * timer
              - action.top * ODR.config.SCALE_FACTOR );
        this.xPos += deltaTime/10 * action.dir;

        // Drag the scene slower on crashing.
        ODR.setSpeed(Math.max(0, action.lagging * (3000-action.timer)/3000));

        if (action.timer > 3000) {
          action.priority = -1;
          ODR.loadMusic('offline-intro-music', ODR.config.PLAY_MUSIC, ODR.config.NATHERINE_LYRICS);
          ODR.stop();
        }
      } break;
      default:;
    }

    if (!action || action.priority == -1) return false;

    return true;
  }

  drawJumpingGuide(action, now, speed) {
    /* Draw jumping guide */

    let pressDuration = action.maxPressDuration;

    if (!pressDuration) {
      // priority 0
      pressDuration = now - action.begin;
      if (pressDuration > ODR.config.MAX_ACTION_PRESS) {
        pressDuration = ODR.config.MAX_ACTION_PRESS;
      }

      pressDuration = shapeSpeedDuration(speed, pressDuration);
    }

    let fallDuration = Math.sqrt(2000 * pressDuration / Amandarine.config.GRAVITY);

    let jumpTop = pressDuration / 1000;

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
        fadeOut = (fallDuration - last) / fallDuration;
          if (fadeOut < 0) fadeOut = 0;
      }

      let unit = fallDuration * 2 / DRAW_STEP;
      let gravityFactor = 0.0000005 * Amandarine.config.GRAVITY;
      this.canvasCtx.moveTo(
        baseX + unit*increment - shiftLeft,
        baseY - (jumpTop - (gravityFactor * fallDuration * fallDuration)) * ODR.config.SCALE_FACTOR
      );

      for (let timer = fallDuration; timer > - fallDuration - DRAW_STEP; timer-= DRAW_STEP, unit--) {
        let drawY = baseY - (jumpTop - (gravityFactor * timer * timer)) * ODR.config.SCALE_FACTOR;
        let drawX = baseX + unit*increment - shiftLeft;

        if (drawX < this.xPos + 20 && drawY > baseY - 60 ) {
          break;
        }

        this.canvasCtx.lineTo(drawX, drawY);
      }

      now = (now/10)%40;
      let alpha = fadeOut * (fallDuration-150)/200;
        if (alpha > 1) alpha = 1;

      this.canvasCtx.lineCap = 'round';
      this.canvasCtx.setLineDash([0,20]);
      this.canvasCtx.globalAlpha = this.guideJumpIntensity * alpha;
      this.canvasCtx.lineWidth = alpha*5;
      this.canvasCtx.lineDashOffset = now;
      this.canvasCtx.stroke();
    } this.canvasCtx.restore();
  }

  drawSlidingGuide(action, now, speed) {

    let slideDuration;
    let alpha;
    let baseX = this.xPos;

    if (action.maxPressDuration) {
      slideDuration = action.maxPressDuration;
      baseX = ODR.config.START_X_POS - action.distance;
      alpha = (action.fullDistance - action.distance)/action.fullDistance;
      alpha *= alpha;
    } else {
      // priority 0
      slideDuration = now - action.begin;
      if (slideDuration > ODR.config.MAX_ACTION_PRESS) {
        slideDuration = ODR.config.MAX_ACTION_PRESS;
      }
      alpha = slideDuration/ODR.config.MAX_ACTION_PRESS;
      slideDuration = ODR.config.SLIDE_FACTOR * shapeSpeedDuration(speed, slideDuration);
    }

    let distance = speed * 0.001 * FPS * slideDuration;
    let frame = Math.floor(now / Amandarine.animFrames.SLIDING.msPerFrame) % 3;

    this.canvasCtx.save();

    for (let i = 0, len = ODR.config.GRAPHICS_MODE == 1 ? 1 : 4, div = 1, s = 0, sd = Math.abs((now/100)%4 - 2);
        i < len; i++, div*= 2, s+=sd) {
      this.canvasCtx.globalAlpha = this.slidingGuideIntensity * alpha/div;
      this.canvasCtx.drawImage(Amandarine.animFrames.SLIDING.sprite,
        Amandarine.animFrames.SLIDING.frames[(frame+i)%3]*2, 40, 40, 40,
        Math.floor(baseX + distance - i * 30 *alpha) - s*s, this.groundYPos,
        this.config.WIDTH, this.config.HEIGHT);
    }

    /*
    this.canvasCtx.globalAlpha = this.slidingGuideIntensity * alpha;
    this.canvasCtx.drawImage(Amandarine.animFrames.SLIDING.sprite,
        Amandarine.animFrames.SLIDING.frames[frame%3]*2, 40, 40, 40,
        Math.floor(baseX + distance) , this.groundYPos,
        this.config.WIDTH, this.config.HEIGHT);
        */

    this.canvasCtx.restore();
  }

  reset() {
    this.yPos = this.groundYPos;
    this.xPos = -40;// this.config.START_X_POS;
    this.dust.reset();

    ODR.queueAction({
      begin: getTimeStamp(),
      type: Amandarine.status.SLIDING,
      pressDuration: ODR.config.MAX_ACTION_PRESS,
      priority: 1,
      start: true,
      speed: 7.2,
      maxPressDuration: 1500,
    });
    ODR.queueAction(ODR.defaultAction);
  }
}

Amandarine.config = {
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

Amandarine.collisionBoxes = {
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

Amandarine.status = {
  CRASHED: 'CRASHED',
  SLIDING: 'SLIDING',
  JUMPING: 'JUMPING',
  RUNNING: 'RUNNING',
  WAITING: 'WAITING'
};

Amandarine.animFrames = {
  WAITING: {
    frames: [0, 20, 40, 60, 80, 100],
    msPerFrame: 1000 / 6
  },
  RUNNING: {
    frames: [0, 20, 40, 60, 40, 20, 0, 80],
    msPerFrame: 1000 / 24
  },
  CRASHED: {
    frames: [0,20],
    msPerFrame: Infinity
  },
  JUMPING: {
    frames: [0,20,40,60,60],
    msPerFrame: 1000 / 4,
    //extended: true // this will need a duration to be defined.
  },
  SLIDING: {
    frames: [0, 20, 40, 20],
    msPerFrame: 1000 / 12
  }
};

class Text {
  constructor(width) {
    this.width = width;
    this.glyphs = [];
  }

  setText(messageStr) {
    if (!messageStr.length) return;
 //TODO multi-widths,multi-offsets
    let lineWidth = this.width || 20;
    let wordList = messageStr.toString().split(' ');
    let newList = [wordList[0]];

    for (let i = 1, cur = wordList[0].length + 1 ; i < wordList.length ; i++) {
      let word = wordList[i];
      let words = word.split('\n');

      words.forEach((w,index) => {
        if (cur + w.length > lineWidth) {
          cur = 0;
          newList.push('\n');
        } else if (index){
          newList.push('\n');
          cur = 0;
        } else {
          newList.push(' ');
          cur++;
        }
        newList.push(w);
        cur += w.length;
      });

    }

    messageStr = newList.join('');

    this.glyphs = messageStr.toUpperCase().split('').map(ch => {
      let code = ch.charCodeAt(0);
      if (code >= 65 && code <= 90) {
        return 140 + (code - 65) * 14;
      }
      if (code >= 48 && code <= 57) {
        return (code - 48) * 14;
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
        case '♥': return 616;
        case '`': return 630;//face
        case 'Α': return 644;
        case '◅': return 658;
        case '"': return 672;
        case "'": return 686;
        case "☼": return 700;
        case ',': return 714;
        case ';': return 720;
        case ':': return 742;
        case '⚽': return 756;
        case '☺': return 770;
        case '#': return 784;
        case '➕': return 798;
        case '⮡': return 812;
        case '⮧': return 826;
        case '+': return 840;
        default: return -code;
      }
    });
  }

  draw(canvasCtx, offsetX, offsetY, glyphW, glyphH, image) {
    glyphW = glyphW || 14;
    glyphH = glyphH || 20;
    image = image || ODR.spriteGUI;
    for (let i = 0, cur = 0, l = 0; i < this.glyphs.length; i++) {
      let x = this.glyphs[i];
      if (x == -10) {
        cur = 0;
        l++;
        continue;
      }
      canvasCtx.drawImage(image,
        x, 0, 14, 14,
        offsetX + cur * glyphW,
        offsetY + glyphH * l,
          14, 14);
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

  enact(deltaTime) {
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

  enact(deltaTime, distance) {
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

    this.highScore = ['17', '18', ''].concat(highScoreStr.split(''));
  }

  reset() {
    this.enact(0);
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

class Menu {
  constructor(canvas, menu) {
    this.canvas = canvas;
    this.canvasCtx  = canvas.getContext('2d');
    this.menu = menu;
    this.actions = [];
    this.displayEntry = this.menu.currentEntry = this.menu.currentEntry  || 0;
    this.menu.buttons = [null,null];
  }

  queueAction(action) {
    if (action.priority == 0) {
      if (action.type == Amandarine.status.JUMPING) {
        this.menu.buttons[1] = action;
      } else if (action.type == Amandarine.status.SLIDING) {
        this.menu.buttons[0] = action;
      }
    }
  }

  enact(deltaTime) {
    if (Menu.playSound) {
      Menu.playSound = null;
    }
    let countHold = 0;
    for (let i = 0; i < 2; i++) {
      let action = this.menu.buttons[i];
      if (action && action.priority == 0) {
        countHold ++;
      } else if (action && action.priority == 1) {
        ODR.playSound(ODR.soundFx.SOUND_BLIP, 0.3);
        switch (action.type) {
          case Amandarine.status.JUMPING:
            this.menu.currentEntry++;
            if (this.menu.currentEntry >= this.menu.entries.length)
              this.menu.currentEntry = 0;
          break;
          case Amandarine.status.SLIDING:
            this.menu.currentEntry--;
            if (this.menu.currentEntry < 0)
              this.menu.currentEntry = this.menu.entries.length - 1;
          break;
        }
        action.priority = -1;
        this.menu.buttons[i] = null;
      }
    }

    if (countHold == 2) {
      this.menu.buttons = [null,null];
      let entry = this.menu.entries[this.menu.currentEntry];
      if (entry.disabled) {
        ODR.playSound(ODR.soundFx.SOUND_HIT, 0.8);
      } else {
        ODR.playSound(ODR.soundFx.SOUND_SCORE, 0.3);
        return this.menu.enter(this.menu.currentEntry, entry);
      }
    }

    this.canvasCtx.fillStyle = "#0008";
    this.canvasCtx.fillRect(0,0,this.canvas.width,this.canvas.height);

    if (this.displayEntry < this.menu.currentEntry) {
      this.displayEntry += 0.1 * (FPS / 500) * deltaTime;
      if (this.displayEntry > this.menu.currentEntry) {
        this.displayEntry = this.menu.currentEntry;
      }
    } else if (this.displayEntry > this.menu.currentEntry) {
      this.displayEntry -= 0.1 * (FPS / 500) * deltaTime;
      if (this.displayEntry < this.menu.currentEntry) {
        this.displayEntry = this.menu.currentEntry;
      }
    }

    this.canvasCtx.save();
    for (let i = 0; i < this.menu.entries.length; i++) {
      let entry = this.menu.entries[i];
      let dir = '▻ ';
      if (entry.title) {
        if (entry.exit) dir = '◅ ';
        entry = entry.title;
      }
      let xxx = Math.abs(this.displayEntry - i);
      this.canvasCtx.globalAlpha = Math.max(0.1,(4 - xxx)/4);
      new Text(600/14).drawText(
        (i == this.menu.currentEntry ? dir:'  ') + entry,
        this.canvasCtx,
        20 + 7 * Math.round((2 * xxx * xxx)/7),
        90 + 7 * Math.round((i-this.displayEntry)*3));
    }
    this.canvasCtx.restore();

    new Text(600/14).drawText(this.menu.title,this.canvasCtx,300-(this.menu.title.length*7),10);
    let pressmsg = 'press both ⮡+⮧ to select';
    new Text(600/14).drawText(pressmsg,this.canvasCtx,300-(pressmsg.length*7),180);

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
  TEXT_Y: 14,
  TEXT_WIDTH: 86,
  TEXT_HEIGHT: 26,
  RESTART_WIDTH: 38,
  RESTART_HEIGHT: 28
};

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
    }

    canvas {
      position: absolute;
      z-index: 2;
    }

    #console-screen {
      left: 100px;
      top: 237px;
      width: 600px;
      height: 200px;
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
    firebase.auth().onAuthStateChanged(function(user) {
      if (user) {
        console.log(user);
        N7e.user = new User();
        /*
        var displayName = user.displayName;
        var email = user.email;
        var emailVerified = user.emailVerified;
        var photoURL = user.photoURL;
        var isAnonymous = user.isAnonymous;
        var uid = user.uid;
        var providerData = user.providerData;
        */
      } else {
        console.log('no user');
      }
    });


    //ODR = this;
    window['ODR'] = this;

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

    this.consoleButtons = {
      CONSOLE_LEFT: { x: 104, y: 495, w: 100, h: 100, id:'console-left',
        handleEvent: function (e) {
          e.preventDefault();
          switch(e.type) {
            case OnDaRun.events.MOUSEDOWN:
            case OnDaRun.events.TOUCHSTART: {
              this.dir = 1;

              //if (!ODR.playing) break; FIXME sliding shadow while waiting.

              let action = ODR.amandarine.newAction(ODR.actions, Amandarine.status.SLIDING);
              action.begin = action.begin || ODR.time;

              if (action && !action.index) {
                ODR.activeActions[Amandarine.status.SLIDING] = action;
                ODR.queueAction(action);
              }
            } break;

            case OnDaRun.events.MOUSEUP:
            case OnDaRun.events.TOUCHEND: {
              this.dir = -1;

              let action = ODR.activeActions[Amandarine.status.SLIDING];
              if (action && action.priority == 0) {
                action.end = ODR.time;
                action.pressDuration = action.end - action.begin;
                if (action.pressDuration > ODR.config.MAX_ACTION_PRESS) action.pressDuration = ODR.config.MAX_ACTION_PRESS;
                action.priority = 1;
              }

            } break;
          }
        },
      },
      CONSOLE_RIGHT: { x: 596, y: 495, w: 100, h: 100, id:'console-right',
        handleEvent: function (e) {
          e.preventDefault();
          switch(e.type) {
            case OnDaRun.events.MOUSEDOWN:
            case OnDaRun.events.TOUCHSTART: {
              this.dir = 1;

              let action = ODR.amandarine.newAction(ODR.actions, Amandarine.status.JUMPING);
              action.begin = action.begin || ODR.time;

              if (!ODR.playing) {
                action.start = true;
              }

              if (action && !action.index) {
                ODR.activeActions[Amandarine.status.JUMPING] = action;
                ODR.queueAction(action);
              }

            } break;
            case OnDaRun.events.MOUSEUP:
            case OnDaRun.events.TOUCHEND: {
              this.dir = -1;

              let action = ODR.activeActions[Amandarine.status.JUMPING]
              if (!action) break;

              if (action.priority == 0) {
                action.end = ODR.time;
                action.pressDuration = action.end - action.begin;
                if (action.pressDuration > ODR.config.MAX_ACTION_PRESS) action.pressDuration = ODR.config.MAX_ACTION_PRESS;
                action.priority = 1;
              }

            } break;
          }
        },
      },
      CONSOLE_A: { x: 233, y: 495, w: 66, h: 50, id:'console-a',
        handleEvent: function (e) {
          e.preventDefault();
          switch(e.type) {
            case OnDaRun.events.MOUSEDOWN:
            case OnDaRun.events.TOUCHSTART:
              this.dir = 1;
              break;
            case OnDaRun.events.MOUSEUP:
            case OnDaRun.events.TOUCHEND:
              this.dir = -1;
              ODR.setMusicMode(-1);
              break;
          }
        },
      },
      CONSOLE_B: { x: 233, y: 545, w: 66, h: 50, id: 'console-b',
        handleEvent: function (e) {
          e.preventDefault();
          switch(e.type) {
            case OnDaRun.events.MOUSEDOWN:
            case OnDaRun.events.TOUCHSTART:
              this.dir = 1;
              break;
            case OnDaRun.events.MOUSEUP:
            case OnDaRun.events.TOUCHEND:
              this.dir = -1;
              ODR.setGraphicsMode(-1);
              break;
          }
        },
      },
      CONSOLE_C: { x: 501, y: 495, w: 66, h: 50, id:'console-c',
        handleEvent: function (e) {
          e.preventDefault();
          ODR.terminal.setMessages("COMING SOON", 2000);
          switch(e.type) {
            case OnDaRun.events.MOUSEDOWN:
            case OnDaRun.events.TOUCHSTART:
              this.dir = 1;
              break;
            case OnDaRun.events.MOUSEUP:
            case OnDaRun.events.TOUCHEND:
              this.dir = -1;
              break;
          }
        },
      },
      CONSOLE_D: { x: 501, y: 545, w: 66, h: 50, id:'console-d',
        handleEvent: function (e) {
          e.preventDefault();
          switch(e.type) {
            case OnDaRun.events.MOUSEDOWN:
            case OnDaRun.events.TOUCHSTART:
              this.dir = 1;
              break;
            case OnDaRun.events.MOUSEUP:
            case OnDaRun.events.TOUCHEND:
              this.dir = -1;

              if (!ODR.menu) {
                ODR.musics.stop();
                let mainMenu = ODR.menu = N7e.user
                  ? new Menu(ODR.canvas, {
                    title: 'do you want to sign out?',
                    entries: [
                      'yes',
                      {title:'no',exit:true}
                    ],
                    currentEntry: 1,
                    enter: (confirm,confirmation) => {
                      if (confirmation.exit) {
                        return null;
                      } else {
                        firebase.auth().signOut();
                        N7e.user = null;
                      }
                    },
                  })
                  : new Menu(ODR.canvas, {
                  title: 'Link profile',
                  entries: [
                    {title:'facebook : disabled',disabled:true},
                    {title:'twitter : disabled',disabled:true},
                    'google',
                    {title:'exit',exit:true}
                  ],
                  enter: (entryIndex,choice) => {

                    if (choice.exit) return null;
                    return new Menu(ODR.canvas, {
                      title: 'do you want to link ' + choice + '?',
                      entries: [
                        'yes',
                        {title:'no',exit:true}
                      ],
                      currentEntry: 1,
                      enter: (confirm,confirmation) => {
                        if (confirmation.exit) {
                          return mainMenu;
                        } else {
                          N7e.user = new User(choice);
                        }
                      },
                    });

                  },
                });
              } else {
                ODR.menu = null;
              }

              break;
          }
        },
      },
      CONSOLE_N7E: { x: 357, y: 628, w: 18, h: 18, id:'console-n7e',
        handleEvent: function (e) {
          e.preventDefault();
          switch(e.type) {
            case OnDaRun.events.MOUSEDOWN:
            case OnDaRun.events.TOUCHSTART:
              this.dir = 1;
              break;
            case OnDaRun.events.MOUSEUP:
            case OnDaRun.events.TOUCHEND:
              this.dir = -1;
              ODR.amandarine.introScriptTimer = 20000;
              if (!this.urlList || this.urlList.length == 0) {
                this.urlList = [
                  {name:'IG', url:'https://www.instagram.com/natherine.bnk48official'},
                  {name:'FACEBOOK', url:'https://www.facebook.com/bnk48official.natherine'},
                ]
              }
              let item = this.urlList.splice(getRandomNum(0,this.urlList.length-1),1)[0];
              window.open(item.url, '_blank');
              break;
          }
        },
      },
      CONSOLE_RESET: { x: 424, y: 628, w: 18, h: 18, id:'console-reset',
        handleEvent: function (e) {
          e.preventDefault();
          switch(e.type) {
            case OnDaRun.events.MOUSEDOWN:
            case OnDaRun.events.TOUCHSTART:
              this.dir = 1;
              break;
            case OnDaRun.events.MOUSEUP:
            case OnDaRun.events.TOUCHEND:
              this.dir = -1;
              ODR.musics.stop();
              ODR.config = JSON.parse(JSON.stringify(OnDaRun.Configurations));
              break;
          }
        },
      },
    };

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
    this.activeActions = {};

    this.activated = false;
    this.playing = false;
    this.crashed = false;
    this.paused = false;
    this.inverted = false;
    this.invertTimer = 0;

    this.playCount = 0;
    this.soundFx = {};

    this.audioContext = null;
    this.musics = null;

    this.images = {};

  }

  firstUpdated(changedProperties) {

    /* Load and set console image */
    let consoleImage = new Image();
    consoleImage.src = 'assets/console/console.png';
    this.style.backgroundImage = 'url('+consoleImage.src+')';

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

    Amandarine.animFrames.RUNNING.sprite = addSprite('nat/running');
    Amandarine.animFrames.SLIDING.sprite = addSprite('nat/sliding');
    Amandarine.animFrames.JUMPING.sprite = addSprite('nat/jumping');
    Amandarine.animFrames.WAITING.sprite = addSprite('nat/idle');
    Amandarine.animFrames.CRASHED.sprite = addSprite('nat/crash');

    for (let key in this.consoleButtons) {
      let btt = this.consoleButtons[key];
      btt.sprite = addSprite('console/'+btt.id);
    }

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
    this.loadMusic('offline-intro-music', this.config.PLAY_MUSIC);
    this.loadMusic('offline-play-music', false);
    this.setSpeed();

    for (let key in this.consoleButtons) {
      let btt = this.consoleButtons[key];
      btt.pressure = 0;
      btt.dir = 0;
      btt.frame = -1;
      btt.canvas = this.shadowRoot.getElementById(btt.id);
      btt.canvas.width = btt.w;
      btt.canvas.height = btt.h;
      btt.canvasCtx = btt.canvas.getContext('2d',{alpha:false});
      btt.canvasCtx.drawImage(btt.sprite,0,0);

      btt.canvas.addEventListener(OnDaRun.events.TOUCHSTART, btt);
      btt.canvas.addEventListener(OnDaRun.events.TOUCHEND, btt);
      btt.canvas.addEventListener(OnDaRun.events.MOUSEDOWN, btt);
      btt.canvas.addEventListener(OnDaRun.events.MOUSEUP, btt);
    }

    this.canvas = this.shadowRoot.getElementById('console-screen');
    this.canvas.width = this.dimensions.WIDTH;
    this.canvas.height = this.dimensions.HEIGHT;
    this.canvasCtx = this.canvas.getContext('2d');

    this.skyCanvas = document.createElement('canvas');
    this.skyCanvas.width = this.dimensions.WIDTH;
    this.skyCanvas.height = this.dimensions.HEIGHT;
    this.skyCanvasCtx = this.skyCanvas.getContext('2d');//,{alpha:false}

    this.setSkyGradient(this.config.SKY.START, 1);
    this.horizon = new Horizon(this.canvas, this.spriteDef, this.dimensions,
      this.config.GAP_COEFFICIENT);

    this.amandarine = new Amandarine(this.canvas, this.spriteDef.NATHERINE);

    this.distanceMeter = new DistanceMeter(this.canvas,
      this.spriteDef.TEXT_SPRITE, this.dimensions.WIDTH);
    this.achievements = [
      200, 'KEEP RUNNING!☺',
      400, 'GOOD JOB!☺',
      800, 'JUST DONT DIE!☺',
    ];

    this.terminal = new Terminal(this.canvas, this.spriteDef.TEXT_SPRITE);

    this.startListening();
    this.enact();

    this.actionIndex = 0;
    this.defaultAction = {
      type: Amandarine.status.WAITING,
      priority: 0,
    };
    this.queueAction({
      type: Amandarine.status.RUNNING,
      priority: 0,
      speed: 1,
      xPos: -80,
      duration: 1400,
      story: true,
    });
    this.queueAction(this.defaultAction);

    this.canvasCtx = this.canvas.getContext('2d');

    this.clearCanvas();
    this.horizon.enact(0, this.currentSpeed, true);
    this.amandarine.enact(this.currentSpeed, 0);
    this.style.opacity = 1;
  }

  setSpeed(opt_speed) {
    this.currentSpeed = opt_speed || this.currentSpeed;
  }

  /***/
  setMusicMode(mode) {
    //FIXME Amandarine should check for the last activity.
    this.amandarine.introScriptTimer = 20000;
    if (this.config.PLAY_MUSIC) {
      this.musics.stop();
      this.config.PLAY_MUSIC = false;
      this.terminal.setMessages('♬ OFF', 2000);
    } else {
      this.config.PLAY_MUSIC = true;
      if (this.playing) {
        this.loadMusic('offline-play-music', this.config.PLAY_MUSIC);
      } else {
        this.loadMusic('offline-intro-music', this.config.PLAY_MUSIC);
      }
      this.terminal.setMessages('♬ ON', 2000);
    }
  }

  setGraphicsMode(mode) {
    this.amandarine.introScriptTimer = 20000;

    if (mode == -1) {
      mode = (this.config.GRAPHICS_MODE+1)%5;
    }

    if (ODR.menu) {
      ODR.menu = null;
    }

    this.config.GRAPHICS_MODE = mode;
    this.canvasCtx.restore();
    this.canvasCtx.save();
    this.canvas.style.opacity = 1.0;
    let delay = 5000;
    switch (mode) {
      case 0: // Normal
        this.terminal.setMessages('STRIPES', delay);
        break;
      case 1: // Low
        this.terminal.setMessages('ROCK-BOTTOM', delay);
        this.amandarine.dust.reset();
        break;
      case 2: // Daylight
        this.terminal.setMessages('DAYLIGHT', delay);
        this.canvas.style.opacity = 0.5;
        break;
      case 3:
        let mainMenu = ODR.menu = new Menu(ODR.canvas, {
          title: 'graphics settings',
          entries: [
            'not yet implemented',
            'not yet implemented',
            'not yet implemented',
            'not yet implemented',
            'not yet implemented',
            'not yet implemented',
            'not yet implemented!!',
            {title:'exit',exit:true}
          ],
          enter: (entryIndex,choice) => {
            return null;
          },
        });
        break;
      case 4: // Naturing
        this.terminal.setMessages('NΑTURING', delay);
        break;
      /*
        this.terminal.setMessages('GRAYSCALE', delay);
        this.canvasCtx.filter = 'grayscale(1)';
        */
      default:
      /*
        this.terminal.setMessages('SHADE ▻ '+(this.config.GRAPHICS_MODE - 3), delay);
        this.canvasCtx.filter = 'sepia(1) hue-rotate('+Math.floor((this.config.GRAPHICS_MODE - 4) * 72)+'deg)';
        */
        break;
    }

    this.setSkyGradient(this.skyGradientCurrentValues,1);
    this.clearCanvas();
    this.horizon.horizonLine.draw();
    this.amandarine.enact(0, this.currentSpeed);
  }

  loadMusic(name, autoplay, lyrics) {
    if (!IS_IOS) {
      if (!this.musics) {
        this.musics = {
          songs: {},
          stop: function() {
            this.currentSong = null;
            for (let name in this.songs) {
              if (this.songs[name].audio) {
                this.songs[name].autoplay = false;
                this.songs[name].audio.fade();
                this.songs[name].audio = null;
              }
            }
          },
        };
      }

      let song = this.musics.songs[name];
      if (!song) {
        song = this.musics.songs[name] = {}
      }

      if (autoplay) {
        for (let name in this.musics.songs) {
          this.musics.songs[name].autoplay = false;
        }
      }

      song.autoplay = autoplay;

      if (song.data) {

        if (!song.audio && song.autoplay) {
          this.musics.stop();

          song.audio = this.playSound(song.data, 0.3);
          song.startTime = this.audioContext.currentTime;
          if (lyrics)
            song.lyrics = lyrics.slice(0);
          this.currentSong = song;
        }

      } else if (!song.hasOwnProperty('progress')) {
        song.progress = 0;
        var resourceTemplate = document.getElementById(this.config.RESOURCE_TEMPLATE_ID).content;
        let request = new XMLHttpRequest();
        request.open('GET', resourceTemplate.getElementById(name).src, true);
        request.responseType = 'arraybuffer';
        request.onload = () => {
          song.progress = 1;
          if (!this.audioContext) {
            this.audioContext = new AudioContext();
          }
          this.audioContext.decodeAudioData(request.response, audioData => {
            song.data = audioData;
            this.loadMusic(name, song.autoplay);
          });
        }
        request.onprogress = (e) => {
          song.progress = e.loaded/e.total;
        }
        request.send();
      }
    }
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
        fade: function() {

          if (this._gain.gain.value > 0) {
            this._gain.gain.value -= 0.02;
            if (this._gain.gain.value < 0) {
              this.node.stop();
              return;
            }
            setTimeout(() => { this.fade(); }, 50);
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

  clearCanvas() {
    this.canvasCtx.drawImage(this.skyCanvas, 0, 0);
  }

  setSkyGradient(newValues, duration) {

      /* Create a gradient if the transition was interrupted */
    if (this.skyGradientTimer < this.skyGradientDuration) {
      this.skyGradientToValues = this.skyGradientCurrentValues;
    }

    this.skyGradientFromValues = this.skyGradientToValues;
    this.skyGradientToValues = newValues;

    this.skyGradientTimer = 0;
    this.skyGradientDuration = duration;
    this.lastDrawnSkyTimer = 0;
    this.drawCounter = 0;

  }

  enactSkyGradient(deltaTime) {
    if (0 == this.skyGradientDuration) {
      return;
    }

    this.skyGradientTimer += deltaTime;
    if (this.skyGradientTimer >= this.skyGradientDuration) {
      this.skyGradientTimer = this.skyGradientDuration;
    }

    let ratio = this.skyGradientTimer/this.skyGradientDuration;
    for(let i = 0; i < 6; i++) {
      this.skyGradientCurrentValues[i] = Math.floor(this.skyGradientFromValues[i]
        + ratio * (this.skyGradientToValues[i] - this.skyGradientFromValues[i]));
    }

    if (ratio == 1 || this.skyGradientTimer - this.lastDrawnSkyTimer > 50) { /* Updating sky at ~ 20fps */
      this.lastDrawnSkyTimer = this.skyGradientTimer;
      let gr = this.skyGradientCurrentValues;
      let rgb0x1 = ((1 << 24) + (gr[0] << 16) + (gr[1] << 8) + gr[2]).toString(16).slice(1);

      if (this.config.GRAPHICS_MODE == 1) {
        this.skyCanvasCtx.fillStyle = '#' + rgb0x1;
      } else {
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

  enact() {
    // Filter ended action(s).
    this.enactPending = false;

    /*
    if (this.playing)
      this.amandarine.assignAction({
        type: Amandarine.status.RUNNING,
        priority: 0,
      }, this.currentSpeed);
      */

    var now = getTimeStamp();
    var deltaTime = now - (this.time || now);
    this.time = now;

    for( let key in this.consoleButtons ) {
      let btt = this.consoleButtons[key];

      if (btt.dir) {
        btt.pressure += deltaTime * btt.dir;
        if (btt.pressure < 0) {
          btt.pressure = 0;
          btt.dir = 0;
        } else if (btt.pressure > 100) {
          btt.pressure = 100;
          btt.dir = 0;
        }
      }

      let frame = Math.floor(4 * btt.pressure / 100);
      if (frame != btt.frame) {
        btt.frame = frame;
        btt.canvasCtx.drawImage(btt.sprite,btt.w*frame,0,btt.w,btt.h,0,0,btt.w,btt.h);
      }
    }

    if (this.menu) {
      this.enactSkyGradient(deltaTime);
      this.clearCanvas();
      this.menu = this.menu.enact(deltaTime);
      this.scheduleNextEnact();
      return;
    }


    this.enactSkyGradient(deltaTime);
    this.clearCanvas();

    if (this.playing) {
      this.runningTime += deltaTime;
      var hasObstacles = this.runningTime > this.config.CLEAR_TIME;

      if (this.crashed && this.gameOverPanel) {
        this.gameOverPanel.draw(deltaTime);

        let alpha = this.actions[0] ? (3000-this.actions[0].timer)/3000 : 0;
          if (alpha < 0) alpha = 0;
        this.horizon.enact(deltaTime, this.currentSpeed, hasObstacles, this.inverted, alpha);

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
        this.horizon.enact(deltaTime, this.currentSpeed, hasObstacles, this.inverted, 1);
      }

      // Check for collisions.
      let obstacle;

      if (hasObstacles) {
        for (let i = 0; obstacle = this.horizon.obstacles[i]; i++) {
          obstacle.crash = checkForCollision(obstacle, this.amandarine, ODR.config.SHOW_COLLISION && this.canvasCtx);
          if (obstacle.crash) {
            break;
          }
        }
      }

      if (!obstacle) {
        if (!this.crashed) {
          this.distanceRan += this.currentSpeed * deltaTime / this.msPerFrame;
        }

        if (this.currentSpeed < this.config.MAX_SPEED) {
          this.currentSpeed += this.config.ACCELERATION;
        }
      } else if (!this.crashed) {

        this.queueAction({
          type: Amandarine.status.CRASHED,
          priority: 3,
          boxes: obstacle.crash,
        }, this.currentSpeed);

        this.gameOver(obstacle);
      }

      let playAchievementSound = this.distanceMeter.enact(deltaTime,
        Math.ceil(this.distanceRan));

      if (playAchievementSound) {
        this.playSound(this.soundFx.SOUND_SCORE,0.2);

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
      this.horizon.enact(0, 6, true);
    } else {
        this.horizon.enact(0, 0, false, this.inverted, 1);
        if (this.gameOverPanel) {
          this.gameOverPanel.draw();
        }
        this.distanceMeter.enact(0, Math.ceil(this.distanceRan))
    }

    let a = this.actions[0];
    this.amandarine.handleActionQueue(now, deltaTime, this.currentSpeed);
    this.terminal.enact(deltaTime);

    if (this.playLyrics && this.currentSong && this.currentSong.lyrics && this.currentSong.lyrics.length) {
      let time = this.audioContext.currentTime - this.currentSong.startTime;
      if (time * 1000 >= this.currentSong.lyrics[0]) {
        this.currentSong.lyrics.shift();
        this.terminal.setMessages('\n\n\n\n\n\n\n\n\n\n    ' + this.currentSong.lyrics.shift(), 5000, 200);
      }
    }

    this.scheduleNextEnact();
  }

  handleEvent(e) {
    return (function (evtType, events) {
      switch (evtType) {
        case events.KEYDOWN:
        case events.TOUCHSTART:
        case events.MOUSEDOWN:
          this.onKeyDown(e);
          break;
        case events.KEYUP:
        case events.TOUCHEND:
        case events.MOUSEUP:
          this.onKeyUp(e);
        break;
      }
    }.bind(this))(e.type, OnDaRun.events);
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

    if (e.keyCode == '77') {
      this.consoleButtons.CONSOLE_A.dir = 1;
    } else if (e.keyCode == '71') {
      this.consoleButtons.CONSOLE_B.dir = 1;
    }

    let inputType = null;
    if (e.code == 'ShiftRight' || OnDaRun.keycodes.JUMP[e.keyCode]) {
      inputType = Amandarine.status.JUMPING;
    } else if (e.code == 'ShiftLeft' || OnDaRun.keycodes.SLIDE[e.keyCode]) {
      inputType = Amandarine.status.SLIDING;
    } else if (e.type == OnDaRun.events.MOUSEDOWN) {
      inputType = e.button == 0 ? Amandarine.status.SLIDING : Amandarine.status.JUMPING;
    }

    switch(inputType) {
      case Amandarine.status.JUMPING:
        this.consoleButtons.CONSOLE_RIGHT.dir = 1;
        break;
      case Amandarine.status.SLIDING:
        this.consoleButtons.CONSOLE_LEFT.dir = 1;
        break;
      default:;
    }

    /*if (0 == this.actions.length || !this.actions[0].story)*/ {

      let action;
      if (inputType == Amandarine.status.JUMPING) {

        action = this.amandarine.newAction(this.actions, Amandarine.status.JUMPING);
        action.begin = action.begin || this.time;

        if (!this.playing) {
          action.start = true;
        }

      } else if (inputType == Amandarine.status.SLIDING) {
        e.preventDefault(); //Test if this is needed.

        action = this.amandarine.newAction(this.actions, Amandarine.status.SLIDING);
        action.begin = action.begin || this.time;
      }

      if (action && !action.index) {
        this.activeActions[inputType] = action;
        this.queueAction(action);
      }
    }
  }

  onKeyUp(e) {
    var keyCode = String(e.keyCode);

    if (keyCode == '67') {
      /* Debug collisions */
      this.config.SHOW_COLLISION = !this.config.SHOW_COLLISION;
      return;
    } else if (keyCode == '77') {
      /* Music toggle */
      this.consoleButtons.CONSOLE_A.dir = -1;
      this.setMusicMode(-1);
      return;
    } else if (keyCode == '71' || (keyCode <= 57 && keyCode >= 48)) {
      /* Graphics Mode switches */
      this.consoleButtons.CONSOLE_B.dir = -1;
      if (keyCode <= 53 && keyCode >= 49) {
        this.setGraphicsMode(keyCode - 49);
      } else {
        this.setGraphicsMode(-1);
      }
      return;
    }

    let inputType;
    if (e.code == 'ShiftRight' || OnDaRun.keycodes.JUMP[keyCode]) {
      inputType = Amandarine.status.JUMPING;
    } else if (e.code == 'ShiftLeft' || OnDaRun.keycodes.SLIDE[keyCode]) {
      inputType = Amandarine.status.SLIDING;
    } else if (e.type == OnDaRun.events.MOUSEUP) {
      inputType = e.button == 0 ? Amandarine.status.JUMPING : Amandarine.status.SLIDING;
    }

    /* Set console animation status */
    switch(inputType) {
      case Amandarine.status.JUMPING:
        this.consoleButtons.CONSOLE_RIGHT.dir = -1;
        break;
      case Amandarine.status.SLIDING:
        this.consoleButtons.CONSOLE_LEFT.dir = -1;
        break;
      default:
        return;
    }

    let action = this.activeActions[inputType];
    if (action) {
      this.activeActions[inputType] = null;
    }

    if (action && inputType == Amandarine.status.JUMPING) {

      if (action.priority == 0) {
        action.end = this.time;
        action.pressDuration = action.end - action.begin;
        if (action.pressDuration > this.config.MAX_ACTION_PRESS) action.pressDuration = this.config.MAX_ACTION_PRESS;
        action.priority = 1;
      }

    } else if (action && inputType == Amandarine.status.SLIDING) {

      if (action.priority == 0) {
        action.end = this.time;
        action.pressDuration = action.end - action.begin;
        if (action.pressDuration > this.config.MAX_ACTION_PRESS) action.pressDuration = this.config.MAX_ACTION_PRESS;
        action.priority = 1;
      }

    } else if (this.paused && inputType == Amandarine.status.JUMPING) {
      // Reset the jump state
      this.amandarine.reset();
      this.play();
    }
  }

  queueAction(action) {
    if (this.menu && action.control) {
      this.menu.queueAction(action);
      return;
    }

    if (action.start) {
      this.musics.stop();
    }

    this.actionIndex++;
    action.index = this.actionIndex;
    this.actions.push(action);
  }

  isLeftClickOnCanvas(e) {
    return e.button != null && e.button < 2 &&
      e.type == OnDaRun.events.MOUSEUP && e.target == this.canvas;
  }

  scheduleNextEnact() {
    if (!this.enactPending) {
      this.enactPending = true;
      this.raqId = requestAnimationFrame(this.enact.bind(this));
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
      this.clearCanvas();
      this.horizon.enact(0, 0, true);
    }

    //this.stop();
    this.crashed = true;
    this.distanceMeter.acheivement = false;

    this.amandarine.enact(100, this.currentSpeed, this.actions[0]);

    if (!this.gameOverPanel) {
      this.gameOverPanel = new GameOverPanel(this.canvas,
        this.spriteDef.TEXT_SPRITE, this.spriteDef.RESTART,
        this.dimensions);
    }

    this.gameOverPanel.draw();

    // Update the high score.
    if (this.distanceRan > this.highestScore) {
      this.highestScore = Math.ceil(this.distanceRan);
      this.distanceMeter.setHighScore(this.highestScore);
      let d = this.distanceMeter.getActualDistance(this.highestScore);

      if (d < 600) {
        this.achievements = [
          200, 'KEEP RUNNING!☺',
          400, 'GOOD JOB!☺',
          800, 'JUST DONT DIE!☺',
        ];
      } else {
        this.terminal.setMessages('A NEW HIGH ' + d + '! ☺',5000);
        if (d > 1000) this.playLyrics = true;

        d = d/2 - d/2%100;
        this.achievements = [
          d, 'KEEP RUNNING!☺',
          d*2, 'GOOD JOB!☺',
          d*3, 'JUST DONT DIE!☺',
          d*4, '...☺',
        ];
      }
    }

    // Reset the time clock.
    this.time = getTimeStamp();
    this.crashedTime = this.time;
  }

  setNeedsEnact(deltaTime) {
    if (this.time + deltaTime > this.stoppingTime) {
      this.stoppingTime = this.time + deltaTime;
    }
  }

  stop() {
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
    this.paused = true;
    cancelAnimationFrame(this.raqId);
    this.raqId = 0;
    this.isStopping = false;
  }

  play() {
    if (!this.crashed) {
      this.playing = true;
      this.paused = false;
      this.time = getTimeStamp();
      //this.enact();
      this.terminal.setMessages("go go go!!",2000);
    }
  }

  restart() {
    if (!this.raqId) {
      this.actions = [];
      this.playCount++;
      this.playLyrics = false;

      switch(this.playCount) {
        case 10:
          this.terminal.setMessages('NATHERINE ♥ YOU.☺',10000);
          break;
        case 20:
          this.terminal.setMessages('NATHERINE STILL ♥ You.☺',10000);
          break;
        case 30:
          this.terminal.setMessages('NATHERINE WILL ALWAYS ♥ You.☺',10000);
          break;
        default:
        if (this.playCount % 10 == 0) {
          this.terminal.setMessages('Love the game?\nPlease_Make_a_Donation\nTO_Thai_Redcross_➕',8000);
        } else {
          this.terminal.setMessages('▻▻▻',1000);
        }
      }

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
      this.enact();
      this.gameOverPanel.timer = 0;
      this.musics.stop();
      this.isStopping = false;
      this.stoppingTime = 0;
    }
  }

  onVisibilityChange(e) {
    if (document.hidden || document.webkitHidden || e.type == 'blur' || document.visibilityState != 'visible') {
      this.stop();
    } else if (!this.crashed) {
      this.amandarine.reset();
      this.play();
    }
  }

  invert(reset) {
    if (reset) {
      document.body.classList.toggle(OnDaRun.classes.INVERTED, false);
      this.invertTimer = 0;
      this.inverted = false;
    } else {
      this.inverted = document.body.classList.toggle(OnDaRun.classes.INVERTED, this.invertTrigger);
    }

    this.setSkyGradient(this.inverted ? ODR.config.SKY.NIGHT : ODR.config.SKY.DAY, 3000);
  }
}

OnDaRun.defaultDimensions = {
  WIDTH: DEFAULT_WIDTH,
  HEIGHT: 200
};

OnDaRun.Configurations = {
  ACCELERATION: 0.00025,
  BG_CLOUD_SPEED: 0.2,
  BOTTOM_PAD: 10,
  CLEAR_TIME: 3000,
  CLOUD_FREQUENCY: 0.5,
  CRASH_WIDTH: 32,
  CRASH_HEIGHT: 32,
  GAMEOVER_CLEAR_TIME: 750,
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
  GRAPHICS_MODE: 4,
  SKY: {
    DAY: [Math.floor(221*0.8), Math.floor(238*0.8), Math.floor(255*0.9), 238, 238, 255],
    //NIGHT: [68,136,170,102,153,187],
    NIGHT: [68,136,170,84,183,187],
    START: [251,149,93,251,112,93],
    SUNSET: [69,67,125,255,164,119],
  },
  NATHERINE_LYRICS: [
    700   ,"          ♬ Natherine ♬",
    3300  ,"      she is all they claim",
    6000  ,"      With her eyes of night",
    7800  ,"   and lips as bright as flame",
    11400 ,"            Natherine",
    13600 ,"        when she dances by",
    16600 ,"Senoritas stare and caballeros sigh",
    22000 ,"          And I've seen",
    24600 ,"       toasts to Natherine",
    27300 ,"       Raised in every bar",
    29200 ,"       across the Argentine",
    32700 ," Yes, she has them all on the run,",
    35600 ,"And their hearts belong to just one",
    38400 ,"      Their hearts belong to",
    40000 ,"          ♬ Natherine ♬",
  ],
};

OnDaRun.classes = {
  CANVAS: 'runner-canvas',
  CRASHED: 'crashed',
  INVERTED: 'inverted',
  SNACKBAR: 'snackbar',
  SNACKBAR_SHOW: 'snackbar-show',
  TOUCH_CONTROLLER: 'controller',
  CONSOLE_LEFT: 'runner-left-button',
  CONSOLE_RIGHT: 'runner-right-button',
  CONSOLE_MUSIC: 'runner-music-button',
  CONSOLE_GRAPHICS: 'runner-graphics-button',
  CONSOLE_RESTART: 'runner-restart-button',
  CONSOLE_TROPHY: 'runner-trophy-button',
  CONSOLE_N7E: 'runner-n7e-button',
  CONSOLE_RESET: 'runner-reset-button',
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
