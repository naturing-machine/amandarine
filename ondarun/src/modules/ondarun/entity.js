/*+;+;+;+;+;+;+;+;+;+;+;+;+;+;+;+;+;+;+;+;+;+;+;+;+;+;+;+;'''+,
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

import { Sound } from '../sound.js';
import { User } from '../user.js';
import { CollisionBox } from '../collision-box.js';

import { Text } from './text.js';
import { A8e } from './amandarine.js';

var FPS = N7e.FPS;

/***
 * Entity
 * TODO These should be made with Mixins.

 Class map
 =========

 Entity
 +-Space
 +-Tangerine
 +-Obstacle
   +-MultiWidth
   | +-SmallCactus
   | +-LargeCactus
   +-DynamicObstacle
     +-DuckType
     | +-Liver
     | +-Rubber
     +-BicycleType
       +-Velota
       +-Rotata
 */

class Entity {

  constructor( ctx, speed, elevation, minX = OnDaRun.DefaultWidth ){
    this.canvasCtx = ctx;
    this.speed = speed;
    this.minX = minX;
    this.yOrigin = this.minY = OnDaRun.DefaultHeight - elevation;
    this.removed = false;
  }

  get width(){
    return this.constructor.width;
  }

  get height(){
    return this.constructor.height;
  }

  get maxX(){
    return this.minX + this.width;
  }
  set maxX(newMaxX){
    this.minX = maxX - this.width;
  }

  get maxY(){
    return this.minY + this.height;
  }
  set maxY(newMaxY) {
    this.minY = maxY - this.height;
  }

  get speedFactor(){
    return this.constructor.speedFactor || 0;
  }

  get removed(){
    return !this._exists;
  }
  set removed( remove ){
    if( this._exists && remove ) {
      this.constructor.replicaCount--;
    } else if( !this.exists && !remove ) {
      this.constructor.replicaCount++;
    }
    this._exists = !remove;
  }

  collide(){
    return null;
  }

  forward( deltaTime, currentSpeed ){
    if( this.removed ) return;

    this.minX += (this.speed - currentSpeed) * FPS / 1000 * deltaTime;

    if( this.maxX < 0 ) {
      this.removed = true;
    } else if ( this.canvasCtx && this.minX < 600 ) {
      /*{
        this.canvasCtx.save();
        this.canvasCtx.strokeStyle = "orange";
        this.canvasCtx.strokeRect( this.minX, this.minY, this.width, this.height );
        this.canvasCtx.translate(Math.round(this.minX), ~~this.minY);
        this.collisionBoxes.forEach(box => {
            this.canvasCtx.strokeStyle = "cyan";
            this.canvasCtx.strokeRect(...Object.values(box));
        });
        this.canvasCtx.restore();
      }*/

      this.canvasCtx.drawImage(
        this.constructor.sprite,
        this.spriteX, this.spriteY, this.width, this.height,
        Math.floor( this.minX ), Math.floor( this.minY ),  this.width, this.height );
    }
  }

  get sprite(){
    return this.constructor.sprite;
  }

/**
 * Class Entity
 * Set the locaton for the follower so it will arrive the position of
 * Amandarine by the given interval after the leader has reached the position.
 *
 * (a) [.A......<L...] For example, given a situation
 * (b) [.A...<L...<F.] Now call L.muster(T,F) to set F's position.
 * (c) [.A<L....<F...] L arrives, starts counting T from this moment.
 * (d) [.A<F=====T...] After the given T interval has passed from (c).
 *
 * This allows adjusting the durations until she meets the next one after another.
 *
 * @param {number} interval - custom information.
 * @param {number} currentSpeed - custom information.
 * @param {Object} follower - custom information.
 * @return {Object} - handy for the follower.
 */
  muster( interval, currentSpeed, follower, ...newParameters ){
    if( typeof follower === 'function'){
      follower = new follower(...newParameters );
    }

    //Don't think it needs to consider the acceleration.
    //May also consider by the length of the interval.

    //duration is the time taken for this to travel to A8e.
    let duration = 1000/FPS * ( this.maxX - 25 )
      /( currentSpeed - ( this.speedFactor*currentSpeed ));

    follower.minX = 25
      + ( duration + interval )
        *( currentSpeed - ( follower.speedFactor * currentSpeed ))
        *FPS/1000;

    return follower;
  }

}

export class Space extends Entity {
  constructor( width ) {
    super( null, 0, 0 );
    this.width = width;
  }

  get width() {
    return this._width;
  }

  set width( newWidth ) {
    this._width = newWidth;
  }

  /* Fer debugging */
  forward( deltaTime, currentSpeed ) {
    this.minX -= currentSpeed * FPS / 1000 * deltaTime;
    if( this.maxX < 0 ) {
      this.removed = true;
    } else if( this.debugCtx ) {
      this.debugCtx.strokeStyle = "orange";
      this.debugCtx.strokeRect( this.minX, 10, this.width, 180 );
    }
  }

} /** Space **/

export class Tangerine extends Entity {
  constructor( ctx, elevation ) {
    super( ctx, 0, elevation );
    this.spriteX = 0;
    this.spriteY = 20;
    this.collected = false;
    this.timer = 0;
  }

  collide( collision ) {
    if( !this.collected ) {
      Sound.inst.effects.SOUND_POP.play( ODR.config.SOUND_SYSTEM_VOLUME/10 );
      Sound.inst.effects.SOUND_SCORE.play( ODR.config.SOUND_SYSTEM_VOLUME/20 );
      this.collected = true;
      this.timer = 0;
      this.collectedY = this.minY;
      ODR.runSession.collected.tangerines++;
      Tangerine.increaseTangerine( 1 )
      .then( dayCount => ODR.scoreboard.minTangerines = dayCount );
    }
    return null;
  }

  static increaseTangerine( number ){
    let user = User.inst;
    if( user.odrRef ){
      let d = new Date();
      let today = `${d.getFullYear()}/${d.getMonth()}/${d.getDate()}`;
      //console.log('test before', user.data.odr.items.tangerines.dayCount);

      return new Promise( resolve => {

        user.odrRef.child('items/tangerines').transaction( function( tangerines ){

          if( !tangerines ){
            tangerines = { dayCount: number, date: today };
          } else if( tangerines.date != today ){
            tangerines.date = today;
            tangerines.dayCount = number;
          } else {
            tangerines.dayCount += number;
          }

          return tangerines;
        }, ( error, committed, snapshot ) => {
        //console.log('test in then', user.data.odr.items.tangerines.dayCount);
          if( committed ){
            let tangerines = snapshot.val();
            user.addTangerines( number );
            if( tangerines.dayCount < Tangerine.allDayMax ){
              Tangerine.shouldDrop = true;
            }
            resolve( tangerines.dayCount );
          } else resolve( 0 );
        });

      });
    }
  }

  forward( deltaTime, currentSpeed ) {
    this.timer += deltaTime;
    if( this.collected ) {
      if( this.timer > 400 ) {
        this.removed = true;
        return;
      }

      let x = this.timer/400;
      let y = -200 * x * x + 200 * x;
      this.minY = this.collectedY - y;
      //super.forward( 0, 0 );

      let alphaRestore = this.canvasCtx.globalAlpha;
      if( this.timer > 200 ) {
        this.canvasCtx.globalAlpha = 1 - ((this.timer - 200) / 200);
      }
      this.spriteX = 20 * ~~(this.timer / 100);
      super.forward( deltaTime, currentSpeed/10 );
      this.canvasCtx.globalAlpha = alphaRestore;
    } else {
      this.minY = this.yOrigin + Math.abs(Math.sin((2000+this.timer)/4000)) * 25;
      this.spriteX = 20 * ~~(this.timer /50 %6);
      super.forward( deltaTime, currentSpeed );
    }
  }

  static get width() { return 20; }
  static get height() { return 20; }

  get collisionBoxes() {
    return this.constructor.collisionBoxes;
  }

}
  Tangerine.shouldDrop = false;
  Tangerine.allDayMax = 0;

  Tangerine.collisionBoxes = [ new CollisionBox( -5, -5, 24, 24 )];
  Tangerine.collisionBoxes.UNION = Tangerine.collisionBoxes[ 0 ];

class Obstacle extends Entity {

  /*
  static getRandomObstacleSubtype( currentSpeed, history ) {
    let filtered = this.subtypes.filter(
      type => type.minSpeed <= currentSpeed
      && type.replicaCount < ODR.config.MAX_OBSTACLE_DUPLICATION
    );

    return filtered[ N7e.randomInt( 0, filtered.length - 1 )];
  }
  */

  /*
  static get subtypes() {
    this._subtypes = this._subtypes || [];
    return this._subtypes;
  }
  */

  static registerType() {
    //this.replicaCount = 0;
    /*
    let classes = this.subtypes;
    Obstacle.subtypes.push( this );
    */

    /* Remap sprite positions/collision boxes to match the animation sequence */
    if( this.animation ) {
      this.spriteXList =
        this.animation.map( frameIndex => this.spriteXList[frameIndex]);
      this.collisionFrames =
        this.animation.map( frameIndex => this.collisionFrames[frameIndex]);
    }
  }

  collide( collision ) {
    return {
      type: A8e.status.CEASING,
      timer: 0,
      priority: 3,
      crash: collision,
      obstacle: this
    };
  }
}

/* TODO Mixin */

/* GroupObstacle : a proxy for grouping a few obstacles together */
/* NYI
class GroupObstacle extends Entity {
  constructor(obstacleSet) {
    this.members = obstacleSet;
  }

}
*/

class MultiWidth extends Obstacle {
  constructor( ctx, speed, elevation, size ) {
    super( ctx, speed, elevation );
    this.size = size;
    this.spriteX = this.constructor.spriteXList[size-1];
    this.spriteY = this.constructor.spriteYOffset;
  }

  get collisionBoxes(){
    return this.constructor.collisionBoxesForSize(this.size);
  }

  get width(){
    return this.constructor.width * this.size;
  }

  static registerType(){
    super.registerType();
    this.cachedCollisionBoxesForSize = [];
  }

  static collisionBoxesForSize( size ){
    if( this.cachedCollisionBoxesForSize[ size ]){
      return this.cachedCollisionBoxesForSize[size]
    }

    let boxes = this.collisionBoxes;

    boxes[ 1 ].width
      = this.width * size
        - boxes[ 0 ].width
        - boxes[ 2 ].width;
    boxes[ 2 ].minX = this.width * size
      - boxes[ 2 ].width;

    this.cachedCollisionBoxesForSize[ size ] = boxes;
    return boxes;
  }

  collide( collision ) {
    Sound.inst.effects.SOUND_HIT.play( ODR.config.SOUND_EFFECTS_VOLUME/10 );
    return super.collide( collision );
  }
}
MultiWidth.MAX_OBSTACLE_LENGTH = 4;

export class Cactus extends MultiWidth {
  static getRandomObstacle( ctx, currentSpeed ){
    switch( this ){
      case SmallCactus:
      case LargeCactus:
        return new this( ctx, N7e.randomInt( 1,
          currentSpeed < 6.5
          ? 2
          : currentSpeed < 7.5
            ? 3
            : MultiWidth.MAX_OBSTACLE_LENGTH ));
      case Cactus:
      default:
        return [ SmallCactus, LargeCactus ][ N7e.randomInt( 0, 1 )].getRandomObstacle( ctx, currentSpeed );
    }
  }
}

export class SmallCactus extends Cactus {
  constructor( ctx, size ) {
    super( ctx, 0, 45, size );

    Object.assign(this, {
      multipleSpeed: 4,
      minGap: 120,
      minSpeed: 0,
    });
  }

  static get collisionBoxes() {
    return [
      new CollisionBox(0, 10, 5, 14),
      new CollisionBox(5, 1, 7, 34),
      new CollisionBox(12, 6, 5, 14),
    ];
  }

}
SmallCactus.spriteXList = [ 0, 17, 51, 102 ].map( x => x + 296 );
SmallCactus.spriteYOffset = 0;
SmallCactus.width = 17;
SmallCactus.height = 35;

export class LargeCactus extends Cactus {
  constructor( ctx, size ) {
    super( ctx, 0, 60, size );

    Object.assign( this, {
      multipleSpeed: 7,
      minGap: 120,
      minSpeed: 0,
    });
  }

  static get collisionBoxes() {
    return [
      new CollisionBox( 0, 13, 7, 20 ),
      new CollisionBox( 8, 1, 9, 47 ),
      new CollisionBox( 17, 11, 10, 21 ),
    ];
  }
}
LargeCactus.spriteXList = [ 0, 25, 75, 150 ].map( x => x + 296 );
LargeCactus.spriteYOffset = 35;
LargeCactus.width = 25;
LargeCactus.height = 50;


/* TODO define mixin */

/* DynamicObstacle is a class for movable collidable.
It expects subclass.animation for sprite & collision remapping. */

class DynamicObstacle extends Obstacle {
  constructor( ctx, speed, elevation ) {
    super( ctx, speed, elevation );
    this.currentFrame = 0;
    this.frameOffset = N7e.randomInt(0,this.constructor.animation.length - 1);
    this.timer = 0;
    this.spriteY = this.constructor.spriteYOffset;
    this.spriteX = this.constructor.spriteXList[0];
  }

  forward( deltaTime, currentSpeed ) {
    this.timer += deltaTime;
    this.currentFrame = ~~(this.frameOffset + this.timer / this.constructor.msPerFrame) % this.constructor.animation.length;
    this.spriteX = this.constructor.spriteXList[this.currentFrame];

    super.forward( deltaTime, currentSpeed );
  }

  get collisionBoxes() {
    return this.constructor.collisionFrames[this.currentFrame];
  }
}

export class DuckType extends DynamicObstacle {
  constructor( ctx, speed, elevation ) {
    super( ctx, speed, elevation );
    this.currentFrame = this.initialFrameCycle;
  }

  collide( collision ) {
    Sound.inst.effects.SOUND_QUACK.play( 0.8 * ODR.config.SOUND_EFFECTS_VOLUME/10, 0.1 );
    return super.collide( collision );
  }

  static get width() { return 46; }
  static get height() { return 38; }

  get currentFrame() {
    return this._currentFrame;
  }

  set currentFrame( newFrame ) {
    this._currentFrame = newFrame;
    this.minY = this.yOrigin + DuckType.yFrames[ newFrame ];
  }

  static getRandomObstacle( ctx, speed ) {
    return new this( ctx, speed * this.speedFactor, DuckType.elevationList[N7e.randomInt(0,5)]);
  }

  static get initialFrameCycle(){
    DuckType.wingCycle = ( DuckType.wingCycle + 3.7 )%6;
    return ~~DuckType.wingCycle;
  }
}
DuckType.elevationList = [ 50, 75, 100, 125, 150, 175 ];
DuckType.yFrames = [0, -1, 0, 1, 1, 0];
DuckType.wingCycle = 0; // 0 - 5

export class Liver extends DuckType {
  forward( deltaTime, currentSpeed ) {
    super.forward( deltaTime, currentSpeed );

    if( !this.alarmed ) {
      // Liver alarms 1.5s before hitting.
      let t = ( this.minX -25 )/( currentSpeed - this.speed )/FPS -1.5;

      // Try to scatter the noise around a bit in case of many Livers.
      Liver.lastQuack = Liver.lastQuack || 0;
      let audioTime = Sound.inst.audioContext.currentTime;
      let diff = audioTime + t - Liver.lastQuack;
      let shift = 0.3;
      if( diff < shift ){
        t = Liver.lastQuack + 0.3 - audioTime -0.2*Math.random();
      }
      Liver.lastQuack = audioTime + t;

      // Calculate the location that match the sound at time for setting the panner
      // 300 == center
      let s = this.minX - t * ( currentSpeed - this.speed )*FPS - 300;
      Sound.inst.effects.SOUND_QUACK.play( 0.3 * ODR.config.SOUND_EFFECTS_VOLUME/10, t, N7e.clamp( s, -600, 600)/600 );

      if( ODR.config.GRAPHICS_SUBTITLES == 'YES' )
        ODR.cc.append('quack', 1000, t*1000 );
      this.alarmed = true;
    }
  }
}
Liver.minSpeed = 7.2;
Liver.minGap = 150;
Liver.speedFactor = -0.35;
Liver.spriteYOffset = 0;
Liver.spriteXList = [0,46,92,138];
Liver.animation = [0,1,2,3,2,1];
Liver.msPerFrame = 1000 / 15;
Liver.collisionFrames = Array(4).fill([
  new CollisionBox( 15, 18, 16, 16 ),
  new CollisionBox( 31, 24, 12, 8 ),
  new CollisionBox( 1, 22, 13, 4 ),
]);

export class Rubber extends DuckType {
}
Rubber.minSpeed = 7.2;
Rubber.minGap = 150;
Rubber.speedFactor = 0.35;
Rubber.spriteYOffset = DuckType.height;
Rubber.spriteXList = Liver.spriteXList.slice().reverse();
/* Copy and reverse collision data from Liver */
Rubber.collisionFrames = Liver.collisionFrames.slice().reverse().map(
  frame => frame.map( box => box.copy.flop(DuckType.width) )
);
Rubber.animation = Liver.animation;
Rubber.msPerFrame = 1000 / 15;

class BicycleType extends DynamicObstacle {
  constructor( ctx, speed ) {
    super( ctx, speed, 62 );
  }

  collide( collision ) {
    Sound.inst.effects.SOUND_CRASH.play( ODR.config.SOUND_EFFECTS_VOLUME/10 );
    Sound.inst.effects.SOUND_BICYCLE.play( ODR.config.SOUND_EFFECTS_VOLUME/10 );
    return super.collide( collision );
  }

  static get width() { return 52; }
  static get height() { return 52; }

  get currentFrame() {
    return this._currentFrame;
  }

  set currentFrame( newFrame ) {
    this.minY = BicycleType.yFrames[ newFrame ];
    this._currentFrame = newFrame;
  }

  static getRandomObstacle( ctx, speed ) {
    return new this( ctx, speed * this.speedFactor );
  }
}
BicycleType.yFrames = [0, 1, 2, 2, 2, 2, 1, 0].map( y => OnDaRun.DefaultHeight - 64 + y );

export class Velota extends BicycleType {
  forward( deltaTime, currentSpeed ) {
    super.forward( deltaTime, currentSpeed );

    if( !this.alarmed ) {

      // Velota alarm 1s before hitting.
      let t = ( this.minX -25 )/( currentSpeed - this.speed )/FPS -1.0;

      // Calculate the location that match the sound at time for setting the panner
      // 300 == center
      let s = this.minX - t * ( currentSpeed - this.speed )*FPS - 300;
      Sound.inst.effects.SOUND_BICYCLE.play( 0.3 * ODR.config.SOUND_EFFECTS_VOLUME/10, t, N7e.clamp( s, -600, 600 )/600 );

      if( ODR.config.GRAPHICS_SUBTITLES == 'YES' )
        ODR.cc.append( `ring${Text.c.bell}`, 1000, t *1000 );
      this.alarmed = true;
    }
  }
}
Velota.minSpeed = 6.5;
Velota.speedFactor = -0.25;
Velota.minGap = 100;
Velota.spriteYOffset = 0;
Velota.spriteXList = [0,52,104,156,208,260,312,364];
Velota.collisionFrames = Velota.spriteXList.map(() => [
  new CollisionBox(17, 3, 17, 20),
  new CollisionBox(4, 23, 20, 27),
  new CollisionBox(24, 30, 23, 20)
]);
Velota.animation = [0,1,2,3,4,5,6,7];
Velota.msPerFrame = 1000 / 15;

export class Rotata extends BicycleType {
}
Rotata.minGap = 100;
Rotata.minSpeed = 6.5;
Rotata.speedFactor = 0.25;
Rotata.spriteYOffset = BicycleType.height;
Rotata.spriteXList = Velota.spriteXList.slice().reverse();
/* Copy and reverse collision data from Liver */
Rotata.collisionFrames = Velota.collisionFrames.slice().reverse().map(
  frame => frame.map( box => box.copy.flop(Rotata.width) )
);
Rotata.animation = Velota.animation;
Rotata.msPerFrame = 1000 / 15;

SmallCactus.registerType();
LargeCactus.registerType();
Liver.registerType();
Rubber.registerType();
Velota.registerType();
Rotata.registerType();
