/*+;+;+;+;+;+;+;+;+;+;+;+;+;+;+;+;+ki+;+;+;+;+;+;+;+;+;+;+;'''+,
:+:+:+:+:NATH|\+:NATH\:+:EN|\NATHERINE|\NATHERINE|\+:+:+: O G :
;.;.;';'NA/HE| |;AT|ER\';NA| AT|  _NE/  AT| _______|;.;'   R   '
 . . . NA/ ER| | TH| IN\ AT| \___|NE/  /THERINE|\. . .    O A
. . . NATHERINE|\HE| |EN\TH| |. .NE/  / HE| _____|. . .  O   N
;';';'\____IN|  _ER| |;ATHE| |;'NE/  /;'EHERINENA|\';';.  V G  .
:+:+:+:+:+:\___|:\___|:\_____|:+\___/+:+\__________|:+:+:  E  +
':+;+;+;+;+;+;+;+;+;+;+;+;+;+;+;+;+;+;+;+;+;+;+;+;+;+;+;+;,,,*/

// Copyright (c) 2019 ORANGE GROOVE Sororité. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file AND if possible, in the Public Domain.

import { N7e } from '../../n7e.js';
import { OnDaRun } from '../../ondarun.js';

import { A8e } from './amandarine.js';

var FPS = N7e.FPS;

//FIXME if runTime exist, action 'now' time should be converted to runTime
class Action {
  constructor( type ) {
    this._begin = 0;
    this._end = 0;
    this._priority = 0;
    //this._speed = undefined;
    this._index = 0;

    this._type = type;
    Object.assign( this, A8e.animFrames[type] );
    this._queueTimer = 0;
  }

  get queueTimer(){
    return this._queueTimer;
  }
  forward( deltaTime ){
    this._queueTimer += deltaTime;
  }

  get type() {
    return this._type;
  }

  set type(_) {
    console.trace();
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


export class DefaultAction extends Action {
  constructor( newSpeed = 0 ) {
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
    if( this._speed != newSpeed && (this._speed || 0) <= ODR.config.SPEED ){
      if( newSpeed == 0) {
        this._type = A8e.status.WAITING;
        Object.assign( this, A8e.animFrames.WAITING );
        this.timer = 0;
      } else {
        this._type = A8e.status.RUNNING;
        this.timer = 0;
        if( newSpeed > 4 ) {
          if( this._speed == 0 ){
            for( let i = 0; i < 5; i++ ){
              ODR.amandarine.dust.addPoint( 0, 0, -100 * Math.random() - 50, -15 * Math.random());
              ODR.amandarine.dust.addPoint( 0, 0, -50 * Math.random() - 50,  15 * Math.random());
            }
          }
          Object.assign(this, A8e.animFrames.RUNNING);
          this.currentFrame = 0;
        } else {
          Object.assign(this, A8e.animFrames.WALKING);
          this.currentFrame = 0;
        }
      }
    }

    this._speed = newSpeed;
  } get speed() { return this._speed || 0; }

}

export class JumpAction extends Action {
  constructor( begin, speed ) {
    super( A8e.status.JUMPING );
    this._begin = begin;
    this._speed = speed;

    this.priority = 0;

    this.control = true;
    this.timer = 0;
  }

  //FIXME compute currentFrame here
  set currentFrame(_) {}
  get currentFrame() {
    if (this.timer < 100) { return 0; }
    if (this.timer < this.halfTime) { return 1; }
    let a8e = ODR.amandarine;
    if( a8e.groundMinY - a8e.minY < 20 ) {
      return 3;
    }
    return 2;
  }


  willEnd( endTime, speed ) {
    this._end = endTime;
    this._speed = speed;

    this.pressDuration = this._end - this._begin;
    if( this.pressDuration > ODR.config.MAX_ACTION_PRESS )
      this.pressDuration = ODR.config.MAX_ACTION_PRESS;

    let minPress = ODR.config.MIN_ACTION_PRESS + ODR.config.MIN_ACTION_PRESS_FACTOR*speed;
    this.maxPressDuration = this.pressDuration * (ODR.config.MAX_ACTION_PRESS - minPress)/ODR.config.MAX_ACTION_PRESS + minPress;

    // It seems more ergonomically natural to simply add the minimum than to clip the value.
    this.top = this.maxPressDuration / 1000;
    this.halfTime = Math.sqrt( 2000 * this.maxPressDuration / A8e.config.GRAVITY );
    this.duration = this.halfTime * 2;
    this.msPerFrame = this.duration / 3.5;
  }

  drawGuide( canvasCtx, minX, minY, now, speed ){
    if( this.start ) return; //FIXME subclass ?
    /* Draw jumping guide */

    this.willEnd( now, speed );

    canvasCtx.save();
    {
      canvasCtx.beginPath();
      canvasCtx.strokeStyle = "white";

      let baseX = minX + 12;
      let baseY = minY + 35;
      let shiftLeft = 0;
      let fadeOut = 1;
      let DRAW_STEP = 50;
      var increment = speed * 0.001 * FPS * DRAW_STEP;

      if( this.priority == 2 ){
        let last = now - this.end;
        shiftLeft = increment * last / DRAW_STEP;
        fadeOut = ( this.halfTime - last )/ this.halfTime;
          if (fadeOut < 0) fadeOut = 0;
      }

      let unit = this.halfTime * 2 / DRAW_STEP;
      let gravityFactor = 0.0000005 * A8e.config.GRAVITY;
      canvasCtx.moveTo(
        baseX + unit * increment - shiftLeft,
        baseY -( this.top -( gravityFactor * this.halfTime**2 ))* A8e.config.SCALE_FACTOR
      );

      for (let timer = this.halfTime; timer > - this.halfTime - DRAW_STEP; timer-= DRAW_STEP, unit--) {
        let drawY = baseY -( this.top -( gravityFactor * timer * timer ))* A8e.config.SCALE_FACTOR;
        let drawX = baseX + unit * increment - shiftLeft;

        if (drawX < minX +20 && drawY > baseY -60 ) {
          break;
        }

        canvasCtx.lineTo(drawX, drawY);
      }

      let offset = this.queueTimer;
      offset = ( offset/10 )%40;
      let alpha = fadeOut *( this.halfTime -150 )/200;
        if (alpha > 1) alpha = 1;

      canvasCtx.lineCap = 'round';
      canvasCtx.setLineDash([ 0, 20 ]);
      canvasCtx.globalAlpha = Math.min( 1, this.queueTimer/150 ) * alpha;
      canvasCtx.lineWidth = 5*alpha;
      canvasCtx.lineDashOffset = offset;
      canvasCtx.stroke();
    }
    canvasCtx.restore();

  }

}

export class SlideAction extends Action {
  constructor( begin, speed ) {
    super( A8e.status.SLIDING );
    this._begin = begin;
    this._speed = speed;

    this.priority = 0;

    this.control = true;
    this.timer = 0;
  }

  set currentFrame(_) {}
  get currentFrame() {
    if (this.duration - this.timer < 300) {
      return 2 + Math.round( Math.max( 0, 2- ( this.duration- this.timer )/150 ));
    }

    return (this.timer >>> 6)&1;
  }

  willEnd( endTime, speed ) {
    this._end = endTime;
    this._speed = speed;

    this.pressDuration = this._end - this._begin;
    if( this.pressDuration > ODR.config.MAX_ACTION_PRESS )
      this.pressDuration = ODR.config.MAX_ACTION_PRESS;

    let minPress = ODR.config.MIN_ACTION_PRESS + ODR.config.MIN_ACTION_PRESS_FACTOR*speed;
    this.maxPressDuration = this.pressDuration * (ODR.config.MAX_ACTION_PRESS - minPress)/ODR.config.MAX_ACTION_PRESS + minPress;

    this.msPerFrame = this.duration / 2.25;
  }

  set maxPressDuration( mPD ) {
    this._maxPressDuration = mPD;
    this.fullDistance = this._speed * 0.001 * FPS * this._maxPressDuration;
    this.fullTime = this._speed == 0 ? 0 : this.fullDistance / (this._speed * FPS);
    this.duration = this.fullTime * 1000;
    this.distance = 0;
    this.friction = this._speed == 0 ? 0 : 2 * this.fullDistance / (this.fullTime * this.fullTime);
  } get maxPressDuration() { return this._maxPressDuration; }

  drawGuide( canvasCtx, minX, minY, now, speed ){
    if( this.start )return;

    let baseX = minX;
    let alpha;

    this.willEnd(now,speed);
    if( this.priority != 0 ){
      baseX = A8e.config.START_X_POS -this.distance;
      alpha = ( this.fullDistance -this.distance )/ this.fullDistance;
      alpha*= alpha;
    } else {
      alpha = this.pressDuration/ODR.config.MAX_ACTION_PRESS;
    }

    let frame = ~~( this.queueTimer / A8e.animFrames.SLIDING.msPerFrame) % 3;

    // Draw future destination body ghosts.
    let alphaRestore = canvasCtx.globalAlpha;
    canvasCtx.globalAlpha = Math.min( 1, this.queueTimer/150 ) * alpha;
    for( let i = 0, len = ODR.config.GRAPHICS_SLIDE_STEPS, s = 0, sd = Math.abs( this.queueTimer/100 %4 -2 );
        i < len; i++, s+=sd) {
      canvasCtx.globalAlpha /= 1.5;
      canvasCtx.drawImage(A8e.animFrames.SLIDING.sprite,
        A8e.animFrames.SLIDING.frames[( frame +i )%3 ], 40, 40, 40,
        ~~( baseX +this.fullDistance - 30*i *alpha ) - s**2, minY,
        A8e.config.WIDTH, A8e.config.HEIGHT);
    }
    canvasCtx.globalAlpha = alphaRestore;
  }
}

export class CrashAction extends Action {
  constructor( obstacle, collision ){
    super( A8e.status.CEASING );
    this.currentFrame = 0;
    this.priority = 3;
    this.timer = 0;
    this.obstacle = obstacle;
    this.crash = collision;
  }
}
