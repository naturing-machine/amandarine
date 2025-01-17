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

import { N7e } from '../../n7e.js';
import { OnDaRun } from '../../ondarun.js';
import { Sound } from '../sound.js';

import { CollisionBox } from '../collision-box.js';

import { Particles } from './particles.js';

var FPS = N7e.FPS;

export class A8e {
  constructor( canvas ){
    this.canvas = canvas;
    this.canvasCtx = canvas.getContext('2d');

    this.minX = 0;
    this.minY = 0;
    this.width = 40;
    this.height = 40;

    // Position when on the ground.
    this.groundMinY = 0;

    this.currentFrame = 0;
    this.currentAnimFrames = [];
    this.animStartTime = 0;
    this.msPerFrame = 1000 / FPS;
    A8e.config = A8e.config;
    // Current status.
    //this.status = A8e.status.WAITING;

    this.dust = new Particles(canvas, this.minX, this.minY, A8e.config.DUST_DURATION);

    this.init();
  }

  get maxX() {
    return this.minX + this.width;
  }

  get maxY() {
    return this.minY + this.height;
  }

  init() {
    this.groundMinY = OnDaRun.DefaultHeight - A8e.config.HEIGHT -
      ODR.config.BOTTOM_PAD;
    this.minY = this.groundMinY;
    this.minJumpHeight = this.groundMinY - A8e.config.MIN_JUMP_HEIGHT;

    // For collision testings
    this.hitTestA = new CollisionBox();
    this.hitTestB = new CollisionBox();
  }

  get collisionBoxes() {
//    switch (this.status) {
    switch ( ODR.activeAction.type ){
      case A8e.status.SLIDING:
        return A8e.collisionBoxes.SLIDING
      case A8e.status.RUNNING:
        return A8e.collisionBoxes.RUNNING;
      case A8e.status.JUMPING:
        return A8e.collisionBoxes.JUMPING;
      default:
        return [];
    }
  }

  hitTest( entity ){
    let retA = this.hitTestA;
    let retB = this.hitTestB;

    // TODO maintain a union box per collision set.
    retA.minX = this.minX;
    retA.minY = this.minY;
    retA.width = this.width;
    retA.height = this.height;

    retB.minX = entity.minX;
    retB.minY = entity.minY;
    retB.width = entity.width;
    retB.height = entity.height;

    // Simple outer bounds check.
    if( retA.intersects( retB )){
      let boxesA = this.collisionBoxes;
      let boxesB = entity.collisionBoxes;

      // Detailed axis aligned box check.
      for (var j = 0; j < boxesA.length; j++) {
        retA.minX = boxesA[j].minX + this.minX;
        retA.minY = boxesA[j].minY + this.minY;
        retA.width = boxesA[j].width;
        retA.height = boxesA[j].height;

        for (var i = 0; i < boxesB.length; i++) {
          retB.minX = boxesB[i].minX + entity.minX;
          retB.minY = boxesB[i].minY + entity.minY;
          retB.width = boxesB[i].width;
          retB.height = boxesB[i].height;
          // Adjust the box to actual positions.

          if (retA.intersects(retB)) {
            return {
              A: boxesA.map( b => {
                let ret = b.copy
                ret.minX += this.minX;
                ret.minY += this.minY;
                return ret;
              }),
              B: boxesB.map( b => {
                let ret = b.copy
                ret.minX += entity.minX;
                ret.minY += entity.minY;
                return ret;
              }),
              C: retA.intersection(retB),
            };
          }
        }
      }
    }
    return false;
  }

  _adjustXToStart( targetX, factor, increment ){
    if( this.minX < targetX ){
      this.minX += factor * increment;
      if( this.minX > targetX ){
        this.minX = targetX ;
      }
    } else if( this.minX > targetX ){
      this.minX -= factor * increment;
      if( this.minX < targetX ){
        this.minX = targetX ;
      }
    }
  }

  forwardAction( action, deltaTime, speed ){
    console.assert(action && action.priority != -1, action);

    if( action.activate && action.activate( action, this )){
      return;
    }

    if (!action.frames) {
      Object.assign(action, A8e.animFrames[action.type]);
      action.currentFrame = 0;
    }

    switch( action.type ){
      case A8e.status.WAITING:
        if( action.heldStart ){
          if (action.timer - action.heldStart > 450) action.heldStart = action.timer - 450;
          action.currentFrame = 72 + ~~((action.timer - action.heldStart)/150);
        }

        break;
      case A8e.status.RUNNING: {
        if (action.speed != speed) {
          let sp = action.speed - speed;
          let increment = sp * FPS / 1000 * deltaTime;
          this.minX += increment;
        } else {
          this._adjustXToStart( A8e.config.START_X_POS, 0.2, speed * (FPS / 1000) * deltaTime );
          /*
          this.__stepping = this.__stepping || 0;
          this.__stepping += deltaTime;
          if( this.__stepping > 200 ){
            ODR.soundEffects.SOUND_DROP.play(
              0.1
              * ODR.config.SOUND_EFFECTS_VOLUME/10 );
            this.__stepping -= 200;
          }
          */
        }
      } break;
      case A8e.status.JUMPING: {
        if( !action[ A8e.__SymbolPlaySoundJumping ]){
          action[ A8e.__SymbolPlaySoundJumping ] = true;
          ODR.soundEffects.SOUND_JUMP.play( 0.7*ODR.config.SOUND_EFFECTS_VOLUME/10 );
          ODR.soundEffects.SOUND_DROP.play(
            action.pressDuration/ODR.config.MAX_ACTION_PRESS
            * ODR.config.SOUND_EFFECTS_VOLUME/10 );
        }

        let timer = action.halfTime - action.timer;

        this._adjustXToStart( A8e.config.START_X_POS, 0.2, speed * (FPS / 1000) * deltaTime );
        this.minY = this.groundMinY
          + ( A8e.config.GRAVITY_FACTOR * timer * timer
              - action.top * A8e.config.SCALE_FACTOR );

        if( timer - 30 < -action.halfTime && !action[ A8e.__SymbolPlaySoundDrop ] ){
          ODR.soundEffects.SOUND_DROP.play(
            action.pressDuration/ODR.config.MAX_ACTION_PRESS
            * ODR.config.SOUND_EFFECTS_VOLUME/10 );
          action[ A8e.__SymbolPlaySoundDrop ] = true;
        }

        if (timer < -action.halfTime) {
          action.priority = -1;
          this.minY = this.groundMinY;
          if (ODR.config.GRAPHICS_DUST != 'NONE') {
            this.dust.minX = this.minX - 24;
            this.dust.addPoint(0, 0, -40, -10 * Math.random());
          }
        }
      } break;
      case A8e.status.SLIDING: {
        var increment = speed * FPS / 1000 * deltaTime;

        if( action.distance == 0 && increment > 0 ){
          ODR.soundEffects.SOUND_SLIDE.play( ODR.config.SOUND_EFFECTS_VOLUME/10 );
        }

        action.distance += increment;

        let it = action.fullTime - action.timer/1000;
          if (it < 0) it = 0;
        let distance = action.fullDistance - 1/2 * it**2 * action.friction - action.distance;

        this.minX = action.minX + distance;
        //Sliding animation

        if (ODR.config.GRAPHICS_DUST != 'NONE'
            && this.dust.points.length < action.timer / 30) {
          this.dust.minX = this.minX - 24;
          let dsp = (action.speed ? action.speed : speed) / 6;
          this.dust.addPoint(-10, 0, dsp * -90, dsp * -15 * Math.random());
          this.dust.addPoint(5, 0, dsp * -75, dsp * -15 * Math.random());
        }

        if (action.timer >= action.fullTime * 1000) {
          action.priority = -1;

          // Make sure for no fallback after sliding.
          if (this.minX < A8e.config.START_X_POS) {
            this.minX = A8e.config.START_X_POS;
          }
        }
      } break;
      case A8e.status.CEASING: {
        if( action.crash ){
          if( ODR.config.GRAPHICS_DISPLAY_INFO == 'YES') {
            this.canvasCtx.save();
            this.canvasCtx.strokeStyle = "orange";
            action.crash.A.forEach( b => this.canvasCtx.strokeRect(...Object.values(b)));
            this.canvasCtx.strokeStyle = "lime";
            action.crash.B.forEach( b => this.canvasCtx.strokeRect(...Object.values(b)));
            this.canvasCtx.fillStyle = this.canvasCtx.strokeStyle = "red";
            this.canvasCtx.fillRect(...Object.values(action.crash.C.copy.grow(1)));
            this.canvasCtx.restore();
          }

          let timer = action.halfTime - action.timer;

          action.currentFrame = action.dir == 1 ? 2 : 0;
          if (action.timer > 25) action.currentFrame++;

          this.minY = action.crashedMinY
            + ( A8e.config.GRAVITY_FACTOR/2 * timer * timer
                - action.top * A8e.config.SCALE_FACTOR );
          this.minX += deltaTime/10 * action.dir;

          // Drag the scene slower on crashing.
          ODR.currentSpeed = Math.max(0, action.lagging * (3000-action.timer)/3000);
        }
      } break;
      default:;
    }

    this.canvasCtx.drawImage(action.sprite,
      action.frames[action.currentFrame], 0, 40, 40,
      ~~this.minX, ~~this.minY,
      A8e.config.WIDTH, A8e.config.HEIGHT);

      /*{
        this.canvasCtx.save();
        this.canvasCtx.translate(Math.round(this.minX), ~~this.minY);
        this.collisionBoxes.forEach(box => {
            this.canvasCtx.strokeStyle = "cyan";
            this.canvasCtx.strokeRect(...Object.values(box));
        });
        this.canvasCtx.restore();
      }*/

      /* TODO shadow
    this.canvasCtx.save();

    for( let i = 0,
        dy = (this.groundMinY-this.minY)/10;
            i < 13 && dy >= 0;
                i++ ) {

      let f = Math.pow(1.02, dy + i);
      let y = ~~(187+dy+i);
      if (y >= 200) break;
      if (y < 187) continue;

      this.canvasCtx.globalAlpha = (13 - i)/40;
      this.canvasCtx.drawImage(action.shadow,
        action.frames[action.currentFrame], i, 40, 1,
        ~~(300 - f*(300 - this.minY)), y,
        40, 1);
    }

    this.canvasCtx.restore();
    */

    if (ODR.config.GRAPHICS_DUST != 'NONE') {
      this.dust.forward(deltaTime);
    }

    action.currentFrame = ~~(action.timer / action.msPerFrame) % action.frames.length;
  }

  reset(){
    this.minY = this.groundMinY;
    this.minX = -40;// A8e.config.START_X_POS;
    this.dust.reset();
  }
}

A8e.__SymbolPlaySoundJumping = Symbol('play sound jumping');
A8e.__SymbolPlaySoundDrop = Symbol('play sound drop');

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
  SCALE_FACTOR: 210,
};
A8e.config.GRAVITY_FACTOR = 0.0000005 * A8e.config.GRAVITY * A8e.config.SCALE_FACTOR;

A8e.collisionBoxes = {
  SLIDING: [
    new CollisionBox( 13, 12, 15, 19 ),
    new CollisionBox( 11, 25, 17, 12 ),
    new CollisionBox( 28, 32, 5, 5 )
  ],
  RUNNING: [
    new CollisionBox( 16, 6, 17, 7 ),
    new CollisionBox( 16, 16, 16, 10 ),
    new CollisionBox( 12, 23, 14, 14 ),
  ],
  JUMPING: [
    new CollisionBox( 12, 19, 15, 19 ),
    new CollisionBox( 18, 7, 15, 19 ),
  ],
};

Object.values( A8e.collisionBoxes ).forEach( boxes => {
  boxes.UNION = boxes.reduce(( a, b ) => a.union( b ), new CollisionBox());
});

A8e.status = {
  CEASING: 'CEASING',
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
  CEASING: {
    frames: [0,40,80,120],
    msPerFrame: Infinity
  },
  JUMPING: {
    frames: [0,40,80,120],
    msPerFrame: 1000 / 4,
    //extended: true // this will need a duration to be defined.
  },
  SLIDING: {
    frames: [0, 40, 80, 120, 160],
    msPerFrame: 1000 / 12
  }
};
