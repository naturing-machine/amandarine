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

class Action {
  constructor( type ) {
    this._end = 0;
    this.priority = 0;
    //this._speed = undefined;
    this._index = 0;

    this._type = type;
    Object.assign( this, A8e.animFrames[type] );
  }

  set priority( newPriority ) {
    this._priority = newPriority;
    this._timer = 0;
  } get priority() { return this._priority;}

  set timer(_){
    console.error('Do not set timer!');
  }
  get timer(){
    return this._timer;
  }
  forward( deltaTime ){
    this._timer += deltaTime;
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

  /* Guide drawing helper, this allows updating values for displaying guides */
  willEnd( speed, end = this._timer ) {
    this._speed = speed;
    this._end = end;
    console.error('Subclass must implement.');
  }

  set end( endTimer ) {
    this.willEnd( this._speed, endTimer );
  } get end() { return this._end; }

/**
 * speed define the current speed of Natherine absolute to the currentSpeed.
 * @memberof Action
 * @type {number}
 */
  set speed( newSpeed ) {
    if( this._end ) {
      this.willEnd( newSpeed, this._end );
    }
  } get speed() { return this._speed || 0; }

}

export class DefaultAction extends Action {
  constructor( newSpeed = 0 ) {
    super();
    this.speed = newSpeed;
    this.index = Infinity;
    this._priority = 3;
  }

/**
 * DefaultAction won't be filtered by priority.
 * @type {number}
 */
  set priority( newPriority ) {
    this._priority = Math.max( 0, newPriority );
  } get priority() { return this._priority; }

/**
 * Setting speed will defines DefaultAction's type.
 * @type {number}
 */
  set speed( newSpeed ) {
    if( this._speed != newSpeed && (this._speed || 0) <= ODR.config.SPEED ){
      if( newSpeed == 0) {
        this._type = A8e.status.WAITING;
        Object.assign( this, A8e.animFrames.WAITING );
        this._timer = 0;
      } else {
        // Moving and running share the same type but use different sprites.
        this._type = A8e.status.RUNNING;
        this._timer = 0;
        if( newSpeed > 4 ) {
          if( this._speed == 0 ){
            // FIXME
            // Taking-off dust.
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
  constructor( speed ) {
    super( A8e.status.JUMPING );
    this._speed = speed;
  }

  //FIXME compute currentFrame here
  set currentFrame(_) {}
  get currentFrame() {
    if (this._timer < 100) { return 0; }
    if (this._timer < this.halfTime) { return 1; }
    let a8e = ODR.amandarine;
    if( a8e.groundMinY - a8e.minY < 20 ) {
      return 3;
    }
    return 2;
  }


  willEnd( speed, endTime = this._timer ){
    this._end = endTime;
    this._speed = speed;

    this.pressDuration = endTime;
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

  drawGuide( canvasCtx, minX, minY, speed ){
    if( this.start ) return; //FIXME subclass ?
    /* Draw jumping guide */

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

      if( 2 == this.priority ){
        let last = this.timer;
        shiftLeft = increment * last / DRAW_STEP;
        let h = this.halfTime/4;
        fadeOut = 1 - Math.min( 1, this.timer/h );
      } else if( 0 == this.priority ){
        this.willEnd( speed );
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

      let offset = this.timer;
      offset = ( offset/10 )%40;
      let alpha = fadeOut *( this.halfTime -150 )/200;
        if (alpha > 1) alpha = 1;

      canvasCtx.lineCap = 'round';
      canvasCtx.setLineDash([ 0, 20 ]);
      canvasCtx.globalAlpha = Math.min( 1, this._timer/150 ) * alpha;
      canvasCtx.lineWidth = 5*alpha;
      canvasCtx.lineDashOffset = offset;
      canvasCtx.stroke();
    }
    canvasCtx.restore();

  }

}

export class SlideAction extends Action {
  constructor( speed ) {
    super( A8e.status.SLIDING );
    this._speed = speed;
    this._misdraw = 0;
    this._fadeIn = 1;
  }

  set currentFrame(_) {}
  get currentFrame() {
    if (this.duration - this._timer < 300) {
      return 2 + Math.round( Math.max( 0, 2- ( this.duration- this._timer )/150 ));
    }

    return (this.timer >>> 6)&1;
  }

  willEnd( speed, endTime = this._timer ){
    this._end = endTime;
    this._speed = speed;

    this.pressDuration = endTime;
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

  forward( deltaTime ){
    this._timer += deltaTime;
    this._misdraw++;
    this._fadeIn+= deltaTime/300;
  }

  drawGuide( canvasCtx, minX, minY, speed ){
    if( this.start )return;
    if( this._misdraw >= 2 ){
      this._fadeIn = 0;
    }
    this._misdraw = 0;

    let baseX = minX;
    let alpha;

    if( this.priority != 0 ){
      baseX = A8e.config.START_X_POS -this.distance;
      alpha = ( this.fullDistance -this.distance )/ this.fullDistance;
      alpha*= alpha;
    } else {
      this.willEnd( speed );
      alpha = this.pressDuration/ODR.config.MAX_ACTION_PRESS;
    }

    let frame = ~~( this._timer / A8e.animFrames.SLIDING.msPerFrame) % 3;

    // Draw future destination body ghosts.
    let alphaRestore = canvasCtx.globalAlpha; {

      canvasCtx.globalAlpha = this._fadeIn *Math.min( 1, this._timer/150 ) * alpha;
      for( let i = 0, len = ODR.config.GRAPHICS_SLIDE_STEPS, s = 0, sd = Math.abs( this._timer/100 %4 -2 );
          i < len; i++, s+=sd) {
        canvasCtx.drawImage(A8e.animFrames.SLIDING.sprite,
          A8e.animFrames.SLIDING.frames[( frame +i )%3 ], 40, 40, 40,
          ~~( baseX +this.fullDistance - 30*i *alpha ) - s**2, minY,
          A8e.config.WIDTH, A8e.config.HEIGHT);
        canvasCtx.globalAlpha /= 1.5;
      }

    } canvasCtx.globalAlpha = alphaRestore;
  }
}

export class CrashAction extends Action {
  constructor( obstacle, collision ){
    super( A8e.status.CEASING );
    this.currentFrame = 0;
    this.priority = 3;
    this.obstacle = obstacle;
    this.crash = collision;
  }
}
