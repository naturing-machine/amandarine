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

var VERSION = "1.14"
var DEFAULT_WIDTH = 600;
var DEFAULT_HEIGHT = 200;
var FPS = 60;
var IS_IOS = /iPad|iPhone|iPod/.test(window.navigator.platform);
var IS_MOBILE = /Android/.test(window.navigator.userAgent) || IS_IOS;
var IS_TOUCH_ENABLED = 'ontouchstart' in window;
var IS_SOUND_DISABLED = false;

var N7e = class {
  static get userSignedIn() {
    return this.signing.photo
      && this.signing.nickname
      && this.signing.tangerines
      && this.signing.distances;
  }

  static set userSignedIn( state ) {
    this.userSigningInfo('photo', state );
    this.userSigningInfo('nickname', state );
    this.userSigningInfo('distances', state );
    this.userSigningInfo('tangerines', state );
  }

  static userSigningInfo( key, state ) {
    this.signing[key] = state;
    this.signing.progress = !this.userSignedIn;
    if( !this.signing.progress ) {
      ODR.checkShouldDropTangerines();
    }
  }

  static clamp( x, lower, upper ){
    return x > upper ? upper : x < lower ? lower : x;
  }

  static randomInt( min, max ){
    return min+ (Math.random()*( max- min+ 1 ))|0;
  }

  static getTimeStamp() {
    return IS_IOS ? new Date().getTime() : performance.now();
  }

  static vibrate(duration) {
    if( IS_MOBILE && window.navigator.vibrate ){
      window.navigator.vibrate(duration);
    }
  }

};

N7e.signing = {
  progress: false,
  photo: false,
  nickname: false,
  distances: false,
  tangerines: false,
};

N7e.user = null;

/*
class ODRConstants {}
ODRConstants.defaultDimensions = {
  WIDTH: DEFAULT_WIDTH,
  HEIGHT: 200
};
*/

class CollisionBox {
  constructor( x = 0, y = 0, w = 0, h = 0 ){
    this.minX = x;
    this.minY = y;
    this.width = w;
    this.height = h;
  }

  get copy() {
    return new CollisionBox( this.minX, this.minY, this.width, this.height );
  }

  set copy( copyMe ) {
    this.minX = copyMe.minX;
    this.minY = copyMe.minY;
    this.width = copyMe.width;
    this.height = copyMe.height;
  }

  translate( x, y ){
    this.minX += x;
    this.minY += y;
  }

  grow( width, height ) {
    height = height === undefined ? width : height;
    this.minX -= width;
    this.width += width * 2;
    this.minY -= height;
    this.height += height * 2;
    return this;
  }

  flop( width ) {
    this.minX = width - this.minX - this.width;
    return this;
  }

  flip( height ) {
    this.minY = height - this.minY - this.height;
    return this;
  }

  maxX() {
    return this.minX + this.width;
  }

  maxY() {
    return this.minY + this.height;
  }

  center() {
    return new CollisionBox(
      this.minX + this.width/2,
      this.minY + this.height/2,
      0,0 );
  }

  intersects( aBox ){
    return ( this.maxX() <= aBox.minX
      || aBox.maxX() <= this.minX
      || this.maxY() <= aBox.minY
      || aBox.maxY() <= this.minY
      || this.void
      || aBox.void )
      ? false
      : true;
  }

  intersection( aBox ){
    let ret = new CollisionBox(0, 0, 0, 0);

    ret.minX = aBox.minX <= this.minX
      ? this.minX
      : aBox.minX;

    ret.minY = aBox.minY <= this.minY
      ? this.minY
      : aBox.minY;

    ret.width = aBox.minX + aBox.width >= this.minX + this.width
      ? this.minX + this.width - ret.minX
      : aBox.minX + aBox.width - ret.minX;

    ret.height = aBox.minY + aBox.height >= this.minY + this.height
      ? this.minY + this.height - ret.minY
      : aBox.minY + aBox.height - ret.minY;

    return ret;
  }

  get void(){
    return this.width > 0 && this.height > 0 ? false : true;
  }

  union( aBox ){
    if( this.void ){
      if( aBox.void ) return new CollisionBox(0,0,0,0);
      return aBox;
    }
    if( aBox.void ) return this;

    let xx = Math.min( this.minX, aBox.minX );
    let yy = Math.min( this.minY, aBox.minY );

    return new CollisionBox( xx, yy,
      Math.max( this.maxX(), aBox.maxX() ) - xx,
      Math.max( this.maxY(), aBox.maxY() ) - yy
    );
  }
}

class User {
  constructor( providerName = null) {
    let redirect = IS_MOBILE;
    let provider;
    if( providerName ){
      N7e.userSignedIn = false;
      N7e.signing.progress = true;

      firebase.auth().setPersistence(firebase.auth.Auth.Persistence.LOCAL).then(() => {
        switch(providerName) {
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
        ODR.panel.exit();
        Sound.inst.effects.SOUND_ERROR.play( ODR.config.SOUND_SYSTEM_VOLUME/10 );
        ODR.cc.append('Error Linking; details in the console.', 5000 );
        N7e.user = null;
      });
    }
  }


}
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

  constructor( ctx, speed, elevation, minX = DEFAULT_WIDTH ){
    this.canvasCtx = ctx;
    this.speed = speed;
    this.minX = minX;
    this.yOrigin = this.minY = DEFAULT_HEIGHT - elevation;
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
        Math.round(this.minX), ~~this.minY,  this.width, this.height );
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

class Space extends Entity {
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

class Tangerine extends Entity {
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
      ODR.dailyTangerines++;
      ODR.runRecord.tangerines++;
      Tangerine.increaseTangerine( 1 );
    }
    return null;
  }

  static increaseTangerine( number ) {
    if( N7e.user ){
      N7e.user.odrRef.child('items/tangerines').transaction( function( tangerines ){
        if( tangerines ){
          tangerines.dayCount += number;
        }
        return tangerines;
      });

      N7e.user.ref.child('items/tangerines').transaction( function( tangerines ){
        tangerines = tangerines || { count: 0 };
        tangerines.count += number;
        return tangerines;
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

      this.canvasCtx.save();
      if( this.timer > 200 ) {
        this.canvasCtx.globalAlpha = 1 - ((this.timer - 200) / 200);
      }
      this.spriteX = 20 * ~~(this.timer / 100);
      super.forward( deltaTime, currentSpeed/10 );
      this.canvasCtx.restore();
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

class Cactus extends MultiWidth {
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

class SmallCactus extends Cactus {
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

class LargeCactus extends Cactus {
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

class DuckType extends DynamicObstacle {
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

class Liver extends DuckType {
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

class Rubber extends DuckType {
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
BicycleType.yFrames = [0, 1, 2, 2, 2, 2, 1, 0].map( y => DEFAULT_HEIGHT - 64 + y );

class Velota extends BicycleType {
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
        ODR.cc.append('ring#bell', 1000, t *1000 );
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

class Rotata extends BicycleType {
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

class Sequencer {
  constructor( canvas ){
    this.canvas = canvas;
    this.canvasCtx = this.canvas.getContext('2d');
    this.resetEntities();
    this.totalRecall = null;
    this.dejavus = null;

    if( !Sequencer.chanceMap ){

      Sequencer.chanceMapSize = 100;
      Sequencer.chanceMap = new Uint8Array( Sequencer.chanceMapSize**2 );
      for( let y = 0; y < Sequencer.chanceMapSize; y++ ){
        for( let x = 0; x < Sequencer.chanceMapSize; x++ ){

          let idx = Sequencer.situationList.findIndex( situation =>
            this.canvasCtx.isPointInPath( situation.path, x/Sequencer.chanceMapSize, y/Sequencer.chanceMapSize )
          );

          console.assert( idx != -1, "SVG hit-testing error.");
          Sequencer.chanceMap[ y *Sequencer.chanceMapSize +x ] = idx == -1 ? Sequencer.situationList.length - 1: idx;
        }
      }

    }
  }

  reset(){
    this.resetEntities();

    this.dejavus = null;
    if( ODR.config.GAME_MODE_REPLAY ){
      this.totalRecall = [ ODR.gameMode ];
    } else {
      this.totalRecall = null;
    }
  }

  resetEntities() {
    if( this.entities ){
      this.entities.forEach( entity => entity.removed = true );
    }

    let t = ODR.config.CLEAR_TIME/1000;
    let v = ODR.config.SPEED * FPS;
    let a = ODR.config.ACCELERATION * FPS * 1000;

    let clearZone = new Space( DEFAULT_WIDTH + t * v + 0.5*a * t**2 );

    //clearZone.debugCtx = this.canvasCtx;
    clearZone.minX = 65;
    this.entities = [ clearZone ];

    DuckType.wingCycle = 0;
  }

  // Change to addEntities to allow adding a group
  addEntity( ...theArgs ) {
    theArgs.forEach( anEntity => {
      if( this.entities.length >= 30 ) {
        return;
      }

      if( ODR.config.GAME_MODE_REPLAY && !this.dejavus ){
        this.register( ODR.runTime, anEntity );
      }

      this.entities.push( anEntity );
    });
  }

  get numberOfEntities(){
    return this.entities.length;
  }

  forward( deltaTime, currentSpeed, shouldAddObstacle, entityExistence = 1 ){
    let decrement = -currentSpeed * FPS / 1000 * deltaTime;
    let lastEntity;

    if( 1 == entityExistence ) {
      lastEntity = this.forwardEntities( deltaTime, currentSpeed, decrement );
    } else if( entityExistence > 0 ) {
      this.canvasCtx.save();
      this.canvasCtx.globalAlpha = entityExistence;
      lastEntity = this.forwardEntities( deltaTime, currentSpeed, decrement );
      this.canvasCtx.restore();
    }

    if( shouldAddObstacle ){
      if( this.dejavus ){
        this.recall();
      } else {
        this.arrange( lastEntity, currentSpeed );
      }
    }
  }

  forwardEntities( deltaTime, cs, decrement ){
    // Obstacles, move to Scenery layer.
    for (let i = 0; i < this.entities.length; i++) {
      this.entities[i].forward( deltaTime, cs );
    }

    // Clean bygone obstacles & find right-most entity.
    let lastEntity = null;
    this.entities = this.entities.filter( entity => {
      if( entity.removed ) return false;
      if( !lastEntity || entity.maxX > lastEntity.maxX ) {
        lastEntity = entity;
      }
      return true;
    });

    return lastEntity;
  }

  crashTest( amandarine ){
    for( let i = 0, entity; entity = this.entities[i]; i++ ) {

      let collision = amandarine.hitTest( entity );
      if( collision ) {
        let crashAction = entity.collide( collision );
        if( crashAction ){
          return crashAction;
        }
      }

    }

    return null;
  }



  getSituation( currentSpeed ) {

    if( ODR.gameMode.key == 'GAME_S'){
      return [
        Sequencer.situation.SituationA,
        Sequencer.situation.SituationB,
        Sequencer.situation.SituationC ][ N7e.randomInt( 0, 2 )];
    }

    let x = ( currentSpeed - 6 )/7;
    let y = Math.random();
    let situation = Sequencer.situationList.find( situation => this.canvasCtx.isPointInPath( situation.path, x, y ));
    return situation ? situation : Sequencer.situation.Cactus;
  }

  arrange( lastEntity, currentSpeed ){
    // Follow the right-most entity when they appear in the scene.
    // FIXME This could be tuned to a larger number to prevent late follower.
    if( !lastEntity || lastEntity.maxX < 600 ){

      // Tangerine
      if( ODR.shouldDropTangerines && N7e.user && !N7e.randomInt(0,10)){
        ODR.shouldDropTangerines = false;
        ODR.tangerineTimer = 0;
        let tangerine = new Tangerine( this.canvasCtx, DuckType.elevationList[ N7e.randomInt( 1, 4 )]);
        let minGap = Math.round( 50*currentSpeed + 72 );
        let space = new Space( N7e.randomInt( minGap, Math.round( minGap * 1.5 )));
        space.ctx = this.canvasCtx;
        tangerine.minX = space.minX + space.width/2 - 25;
        this.addEntity( space, tangerine );
        return;
      }

      let situation = lastEntity ? this.getSituation( currentSpeed ) : 0;

      do {switch( situation ) {
        case Sequencer.situation.Velota: {

          this.addEntity(
            new Space( 50*currentSpeed ),
            lastEntity.muster( 100, currentSpeed,
              new Velota( this.canvasCtx, currentSpeed * Velota.speedFactor *( 0.8 + 0.2*Math.random()))));

        } break;
        case Sequencer.situation.Rotata: {

          this.addEntity(
            new Space( 60*currentSpeed ),
            lastEntity.muster( 700, currentSpeed,
              new Rotata( this.canvasCtx, currentSpeed * Rotata.speedFactor *( 0.8 + 0.2*Math.random()))));

        } break;
        case Sequencer.situation.Rubber: {

          this.addEntity(
            new Space( 80*currentSpeed ),
            lastEntity.muster( 1000, currentSpeed,
              Rubber.getRandomObstacle( this.canvasCtx, currentSpeed )));

        } break;
        /* Liver */
        case Sequencer.situation.Liver: {

          this.addEntity(
            new Space( 50*currentSpeed ),
            lastEntity.muster( 150, currentSpeed,
              Liver.getRandomObstacle( this.canvasCtx, currentSpeed )));

        } break;
        case Sequencer.situation.LiverSweeper: {

          this.addEntity( new Space( 100*currentSpeed ));
          for( let i = 0; i < 5; i += N7e.randomInt( 1, 2 )) {
            this.addEntity( lastEntity.muster( situation.glider[i], currentSpeed,
              new Liver( this.canvasCtx,
                currentSpeed * Liver.speedFactor *( 0.9 + 0.1*Math.random()),
                DuckType.elevationList[ i + 1 ])));
          }

        } break;
        case Sequencer.situation.RubberSweeper: {

          this.addEntity( new Space( 100*currentSpeed ));
          for( let i = 0; i < 5; i += N7e.randomInt( 1, 2 )) {
            this.addEntity( lastEntity.muster( situation.glider[i], currentSpeed,
              new Rubber( this.canvasCtx,
                currentSpeed * Rubber.speedFactor *( 0.9 + 0.1*Math.random()),
                DuckType.elevationList[ i + 1 ])));
          }

        } break;
        /* Extra */

        case Sequencer.situation.SituationA: {

          this.addEntity( lastEntity.muster( 0, currentSpeed, new Space( 300*currentSpeed )));

          this.addEntity( lastEntity.muster( 150, currentSpeed,
            Cactus.getRandomObstacle( this.canvasCtx, currentSpeed )));

          this.addEntity( lastEntity.muster( 1000, currentSpeed,
            Cactus.getRandomObstacle( this.canvasCtx, currentSpeed )));

          let velota = new Velota( this.canvasCtx, currentSpeed * Velota.speedFactor *( 0.8 + 0.2*Math.random()));
          this.addEntity( lastEntity.muster( 1500, currentSpeed, velota ));

          /* You can also let the muster new the class this way.
          let velota = lastEntity.muster( 1500, currentSpeed,
            Velota, this.canvasCtx, currentSpeed * Velota.speedFactor *( 0.8 + 0.2*Math.random()))
          this.addEntity( velota );
          */

          this.addEntity( velota.muster( 600, currentSpeed,
            Cactus.getRandomObstacle( this.canvasCtx, currentSpeed )));

          this.addEntity( velota.muster( 1500, currentSpeed,
            Cactus.getRandomObstacle( this.canvasCtx, currentSpeed )));

          this.addEntity( velota.muster( 1700, currentSpeed, Rotata.getRandomObstacle( this.canvasCtx, currentSpeed )));

        } break;

        case Sequencer.situation.SituationB: {

          this.addEntity( lastEntity.muster( 0, currentSpeed, new Space( 150*currentSpeed )));

          let cactusA = Cactus.getRandomObstacle( this.canvasCtx, currentSpeed );
          this.addEntity( lastEntity.muster( 500, currentSpeed, cactusA ));

          let liver = new Liver( this.canvasCtx, currentSpeed * Liver.speedFactor *( 0.9 + 0.1*Math.random()), DuckType.elevationList[ 1 ]);
          this.addEntity( cactusA.muster( 400, currentSpeed, liver ));

          liver = new Liver( this.canvasCtx, currentSpeed * Liver.speedFactor *(0.9 + 0.1*Math.random()),
            DuckType.elevationList[ N7e.randomInt( 0, 1 )<<1 ]);
          this.addEntity( cactusA.muster( 430, currentSpeed, liver ));

          this.addEntity( liver.muster( 0, currentSpeed,
            new Rubber( this.canvasCtx, currentSpeed * Rubber.speedFactor *( 0.9 + 0.1*Math.random()), DuckType.elevationList[ 5 ])));

          this.addEntity( cactusA.muster( 1200, currentSpeed, new SmallCactus( this.canvasCtx, 1 )));

        } break;

        case Sequencer.situation.SituationC: {
          let i,cactus;
          for( i = 0; i < 8; i++) {
            cactus = new SmallCactus( this.canvasCtx, N7e.randomInt( 1, 3 ));
            this.addEntity( lastEntity.muster( i * 550 , currentSpeed, cactus ));
          }

          this.addEntity( cactus.muster( 0, currentSpeed, new Space( 100*currentSpeed )));
        } break;

        /* Single Cactus */
        default:
        case Sequencer.situation.Cactus: {
          let cactus = Cactus.getRandomObstacle( this.canvasCtx, currentSpeed );
          let minGap = Math.round( cactus.width * currentSpeed + 72 );
          let space = new Space( N7e.randomInt( minGap, Math.round( minGap * 1.5 )));
          space.ctx = this.canvasCtx;
          cactus.minX = space.minX + space.width/2 - cactus.width/2;
          this.addEntity( space, cactus );
        } break;

      } break; } while( true );
    }
  }

  register( runTime, entity ){

    let entry = { runTime: runTime, minX: entity.minX };

    switch( entity.constructor.name ){
      case 'SmallCactus':
      case 'LargeCactus':
        entry.size = entity.size;
      case 'Liver':
      case 'Rubber':
        if( !entry.size ){
          entry.elevation = DEFAULT_HEIGHT - entity.minY;
        };
      case 'Velota':
      case 'Rotata':
        if( !entry.size ){
          entry.speed = entity.speed;
        }
        entry.className = entity.constructor.name;
        this.totalRecall.push( entry );
        break;
      default:
    }
  }

  recall(){
    while( this.dejavus.length ){
      if( this.dejavus[ 0 ].runTime > ODR.runTime ){
        return;
      } else {
        let entityCode = this.dejavus.shift();
        let entity;
        //ODR.runTime = entityCode.runTime;
        switch( entityCode.className ){
          case 'SmallCactus':
            entity = new SmallCactus( this.canvasCtx, entityCode.size );
            entity.minX = entityCode.minX;
            break;
          case 'LargeCactus':
            entity = new LargeCactus( this.canvasCtx, entityCode.size );
            entity.minX = entityCode.minX;
            break;
          case 'Velota':
            entity = new Velota( this.canvasCtx, entityCode.speed );
            entity.minX = entityCode.minX;
            break;
          case 'Rotata':
            entity = new Rotata( this.canvasCtx, entityCode.speed );
            entity.minX = entityCode.minX;
            break;
          case 'Liver':
            entity = new Liver( this.canvasCtx, entityCode.speed, entityCode.elevation );
            entity.minX = entityCode.minX;
            break;
          case 'Rubber':
            entity = new Rubber( this.canvasCtx, entityCode.speed, entityCode.elevation );
            entity.minX = entityCode.minX;
            break;
        }

        if( entity )
          this.addEntity( entity );

        continue;
      }
    }

  }
}

Sequencer.situation = {};
Sequencer.situationList = [];

{
  // NOTE: The SVG below has nothing to do with rendering. It's just a map
  // for defining chances over time of random values.
  // A miss one will be routed to a simple cactus situation.

  let densityMap = `
<svg xmlns="http://www.w3.org/2000/svg" id="SituationMap">
  <path class="Default" d="M 0,0 H 1 V 1 H 0 Z" />
  <path class="Liver" d="M 0.1,0.15 0.4,0.05 1,0 v 0.15 z" />
  <path class="Rubber" d="M 0.1,0.15 H 1 V 0.3 L 0.4,0.25 Z" />
  <path class="Rotata" d="M 0,0.5 0.15,0.4 1,0.3 v 0.2 z" />
  <path class="Velota" d="M 0,0.5 H 1 V 0.7 L 0.15,0.6 Z" />
  <path class="RubberSweeper" d="M 0.4,0.25 0.25,0.2 1,0.25 V 0.3 Z" />
  <path class="LiverSweeper" d="M 0.25,0.1 0.4,0.05 1,0 v 0.05 z" />
  <path class="SituationA" d="M 1,0.4 0.15,0.5 1,0.6 Z" />
  <path class="SituationB" d="M 1,0.1 0.25,0.15 1,0.2 Z" />
  <path class="SituationC" d="M 1,0.75 0.25,0.8 1,0.85 Z" />
</svg>
`;

  // Generate the situation list.
  // TODO Plot this by sampling into a bitmap.
  let svg = new DOMParser().parseFromString( densityMap, 'image/svg+xml');
  let paths = svg.getElementsByTagName('path');
  for( let path of paths ) {
    let entry = {
      name: path.attributes.class.value,
      path: new Path2D(path.attributes.d.value),
    };

    //Reverse the order.
    Sequencer.situationList.unshift( entry );
    Sequencer.situation[ entry.name ] = entry;
  }

}

Sequencer.situation.LiverSweeper.glider = [ 100, 50, 0, 50, 100 ];
Sequencer.situation.RubberSweeper.glider = [ 1000, 1100, 1200, 1100, 1000 ];


class Particles {
  constructor(canvas, x, y, life) {
    this.life = life; // Used for calculating sprite offset.
    this.canvas = canvas;
    this.canvasCtx = this.canvas.getContext('2d');
    this.minX = x;
    this.minY = y;
    this.points = [];
    //this.init();
    this.tag = 0;
  }

  draw() {
  }

  forward(aging) {
    this.points = this.points.filter( point => {
      point.life -= aging;
      return point.life > 0;
    });

    for(let i = 0, point; point = this.points[i]; i++) {
      let ratio = (this.life - point.life) / this.life;
      let x = this.minX + point.minX + 40 + point.width * ratio;
      let y = this.minY + point.minY + DEFAULT_HEIGHT-25 + point.height * ratio;
      this.canvasCtx.drawImage(ODR.spriteScene,
        0 + 22 * ~~(8 * ratio), 0,
        22, 22,
        Math.ceil(x), Math.ceil(y),
        22, 22);
    }
  }

  addPoint(x, y, w, h) {
    this.points.push({tag:this.tag++, minX:x, minY:y, width:w, height:h, life:this.life});
  }

  reset() {
    this.points = [];
  }
}

class Figure {
  constructor( canvasOrImage, width, height ){

  }

}

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
  MIN_SKY_LEVEL: DEFAULT_HEIGHT - 79,
  WIDTH: 60,
};


// Generate mountains.

class Mountain {
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
    this.minX = DEFAULT_WIDTH - 200;
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
      currentPos = DEFAULT_WIDTH;
    } else {
      currentPos -= speed;
    }
    return currentPos;
  }

  draw( darkness = 255 ) {
    this.canvasCtx.save();
    this.canvasCtx.globalAlpha = this.opacity;// * (( 255 + darkness )>>>1)/255;

    let mx = Infinity, my = Infinity;

    if( ODR.config.GRAPHICS_MOON == 'SHINE' ){
      let yShift = 7 - this.currentPhase;
      yShift *= yShift;
      let fw = 2 * (NightMode.config.WIDTH + NightMode.config.MOON_BLUR);
      let fh = NightMode.config.HEIGHT + NightMode.config.MOON_BLUR * 2;
      mx = Math.ceil( this.minX / DEFAULT_WIDTH *( DEFAULT_WIDTH + 2*fw ) -fw -NightMode.config.MOON_BLUR );
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

    this.canvasCtx.restore();
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
    var segmentSize = Math.round( DEFAULT_WIDTH/NightMode.config.NUM_STARS);

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
  STAR_MAX_Y: DEFAULT_HEIGHT - 50,
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
      this.groundCanvas.width = DEFAULT_WIDTH;
      this.groundCanvas.height = 25 * HorizonLine.dimensions.GROUND_WIDTH;
    }
    let ctx = this.groundCanvas.getContext('2d');

    ctx.clearRect(0, 0, DEFAULT_WIDTH, this.groundCanvas.height);
    this.cachedGroundType = groundType;

    ctx.save();
    ctx.translate(0,25 - DEFAULT_HEIGHT);
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

  drawGround(canvasCtx, spinner, mode, r,g,b) {
    canvasCtx.save();
    canvasCtx.lineWidth = 5;
    canvasCtx.lineCap = 'butt';
    for ( let
      scale = 1.02, //Perspective
      step = 2,
      pwStep = Math.pow(scale, step),
      y = this.minY + 12,
      i = -8,
      alphaStep = 0.15 * step / (DEFAULT_HEIGHT - y),
      pw = Math.pow(scale,i);

          y + i < DEFAULT_HEIGHT + this.canvasCtx.lineWidth;

              i += step, pw *= pwStep ) {

      let width = DEFAULT_WIDTH / pw;

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
          DEFAULT_WIDTH, 22,
        0, DEFAULT_HEIGHT - 22,
          DEFAULT_WIDTH, 22 );
  }

  reset() {
    //this.minX[1] = HorizonLine.dimensions.WIDTH;
  }
}
HorizonLine.spritePos = { x: 2, y: 104 };
HorizonLine.dimensions = {
  WIDTH: 600,
  HEIGHT: 23,
  YPOS: DEFAULT_HEIGHT-23,
  GROUND_WIDTH: 100,
};


class Scenery {
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
      let x = N7e.randomInt(-50, 2*DEFAULT_WIDTH );
      this.layers[[ 0, 2, 4 ][ N7e.randomInt( 0, 2 )]].push( new Cloud( this.canvas, Cloud.randomCloudType,
        x, Cloud.randomCloudHeight ));
    }
  }

  addTREX(){
    if( N7e.user && this.layers[ this.layerCount -1 ].length == 0)
      this.layers[ this.layerCount -1 ].push( new TREX( this.canvas, 1500));
  }

/** Class Scenery
 * Recursively append mountains.
 */

  growMountain( generator, parent, layer ){
    if( generator.energy > 0 ){
      generator.energy--;

      let distance = parent
        ? parent.minX + N7e.randomInt( -parent.width, parent.width )
        : DEFAULT_WIDTH + N7e.randomInt( -250, 250 );

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
    this.canvasCtx.clearRect( 0, 0, DEFAULT_WIDTH, DEFAULT_HEIGHT );

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
        this.canvasCtx.save();{

          this.canvasCtx.globalAlpha = (i+1)/5;
          layer.forEach( cloud => {
            cloud.forward( deltaTime, currentSpeed/25 + 0.2 * ( i + 1 )/this.layers.length );
          });

          //atmosphere
          this.canvasCtx.globalCompositeOperation = 'source-atop';
          this.canvasCtx.globalAlpha = 0.4;
          //this.canvasCtx.fillStyle = '#' + (i == 3 ? ODR.rgb0x2 : ODR.rgb0x1);
          this.canvasCtx.fillStyle = '#' + ODR.sky.toRGB;
          this.canvasCtx.fillRect( 0, 0, DEFAULT_WIDTH, DEFAULT_HEIGHT );

        } this.canvasCtx.restore();


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
      let x = DEFAULT_WIDTH + N7e.randomInt(0,600);
      this.layers[[0,2,2,4,4,4][N7e.randomInt(0,5)]].push( new Cloud( this.canvas, Cloud.randomCloudType,
        x, Cloud.randomCloudHeight ));
    }

    if( numMountains < 10 && maxXMountain < DEFAULT_WIDTH ){
      let generator = { energy: 7, mountains: [], minX: DEFAULT_WIDTH };
      this.growMountain( generator );
      if( generator.minX < DEFAULT_WIDTH ){
        let shift = N7e.randomInt( 0, 400 ) + DEFAULT_WIDTH - generator.minX;
        generator.mountains.forEach( mountain => {
          mountain[0].minX += shift;
          if( mountain[1] == 3 ) mountain[0].minX *= 1.2;
        });
      }
    }

    // Fill atmosphere
    this.canvasCtx.save();
    this.canvasCtx.globalCompositeOperation = 'destination-over';

    this.nightMode.forward( showNightMode, deltaTime, ODR.sky.shade[6] );
    ODR.sky.repaint( this.canvasCtx );
    this.canvasCtx.restore();

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

class A8e {
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

    this.slidingGuideIntensity = 0;
    this.jumpingGuideIntensity = 0;
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
    this.groundMinY = DEFAULT_HEIGHT - A8e.config.HEIGHT -
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

  activateAction( action, deltaTime, speed ){
    console.assert(action && action.priority != -1, action);

    let adjustXToStart = () => {
      if (this.minX < A8e.config.START_X_POS) {
        this.minX += 0.2 * speed * (FPS / 1000) * deltaTime;
        if (this.minX > A8e.config.START_X_POS) {
          this.minX = A8e.config.START_X_POS;
        }
      } else if (this.minX > A8e.config.START_X_POS) {
        this.minX -= 0.2 * speed * (FPS / 1000) * deltaTime;
        if (this.minX < A8e.config.START_X_POS) {
          this.minX = A8e.config.START_X_POS;
        }
      }
    }

    if (action.hasOwnProperty('setX')) {
      this.minX = action.setX;
      delete action.setX;
    }


    if (!action.frames) {
      Object.assign(action, A8e.animFrames[action.type]);
      action.currentFrame = 0;
    }

    if (action.type)

    switch (action.type) {
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
          adjustXToStart(speed);
        }

      } break;
      case A8e.status.JUMPING: {
        if (action.timer == 0) {
          Sound.inst.effects.SOUND_JUMP.play( ODR.config.SOUND_EFFECTS_VOLUME/10 );
          Sound.inst.effects.SOUND_DROP.play(
            action.pressDuration/ODR.config.MAX_ACTION_PRESS
            * ODR.config.SOUND_EFFECTS_VOLUME/10 );
        }

        let timer = action.halfTime - action.timer;

        adjustXToStart();
        this.minY = this.groundMinY
          + ( A8e.config.GRAVITY_FACTOR * timer * timer
              - action.top * A8e.config.SCALE_FACTOR );

        if (timer - 30 < -action.halfTime && !action.playedDrop ) {
          Sound.inst.effects.SOUND_DROP.play(
            action.pressDuration/ODR.config.MAX_ACTION_PRESS
            * ODR.config.SOUND_EFFECTS_VOLUME/10 );
          action.playedDrop = true;
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
          Sound.inst.effects.SOUND_SLIDE.play( ODR.config.SOUND_EFFECTS_VOLUME/10 );
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

    action.timer += deltaTime;
    action.currentFrame = ~~(action.timer / action.msPerFrame) % action.frames.length;

    if (!action || action.priority == -1) return false;

    return true;
  }

  drawJumpingGuide( action, now, speed ){
    if (action.start) return;
    /* Draw jumping guide */

    action.willEnd(now,speed);

    this.canvasCtx.save(); {
      this.canvasCtx.beginPath();
      this.canvasCtx.strokeStyle = "white";

      let baseX = this.minX + 12;
      let baseY = this.groundMinY + 35;
      let shiftLeft = 0;
      let fadeOut = 1;
      let DRAW_STEP = 50;
      var increment = speed * 0.001 * FPS * DRAW_STEP;

      if (action.priority == 2) {
        let last = now - action.end;
        shiftLeft = increment * last / DRAW_STEP;
        fadeOut = ( action.halfTime - last )/ action.halfTime;
          if (fadeOut < 0) fadeOut = 0;
      }

      let unit = action.halfTime * 2 / DRAW_STEP;
      let gravityFactor = 0.0000005 * A8e.config.GRAVITY;
      this.canvasCtx.moveTo(
        baseX + unit * increment - shiftLeft,
        baseY -( action.top -( gravityFactor * action.halfTime**2 ))* A8e.config.SCALE_FACTOR
      );

      for (let timer = action.halfTime; timer > - action.halfTime - DRAW_STEP; timer-= DRAW_STEP, unit--) {
        let drawY = baseY -( action.top -( gravityFactor * timer * timer ))* A8e.config.SCALE_FACTOR;
        let drawX = baseX + unit * increment - shiftLeft;

        if (drawX < this.minX +20 && drawY > baseY -60 ) {
          break;
        }

        this.canvasCtx.lineTo(drawX, drawY);
      }

      now = (now/10)%40;
      let alpha = fadeOut *( action.halfTime -150 )/200;
        if (alpha > 1) alpha = 1;

      this.canvasCtx.lineCap = 'round';
      this.canvasCtx.setLineDash([0,20]);
      this.canvasCtx.globalAlpha = this.jumpingGuideIntensity * alpha;
      this.canvasCtx.lineWidth = alpha*5;
      this.canvasCtx.lineDashOffset = now;
      this.canvasCtx.stroke();
    } this.canvasCtx.restore();

  }

  drawSlidingGuide( action, now, speed ){
    if( action.start )return;

    let baseX = this.minX;
    let alpha;

    action.willEnd(now,speed);
    if (action.priority != 0) {
      baseX = A8e.config.START_X_POS -action.distance;
      alpha = ( action.fullDistance -action.distance )/ action.fullDistance;
      alpha*= alpha;
    } else {
      alpha = action.pressDuration/ODR.config.MAX_ACTION_PRESS;
    }

    let frame = ~~(now / A8e.animFrames.SLIDING.msPerFrame) % 3;

    this.canvasCtx.save();

    // Draw future destination body ghosts.
    for( let i = 0, len = ODR.config.GRAPHICS_SLIDE_STEPS, s = 0, sd = Math.abs( now/100 %4 -2 );
        i < len; i++, s+=sd) {
      this.canvasCtx.globalAlpha = this.slidingGuideIntensity * alpha/( 1<<i );
      this.canvasCtx.drawImage(A8e.animFrames.SLIDING.sprite,
        A8e.animFrames.SLIDING.frames[( frame +i )%3 ], 40, 40, 40,
        ~~( baseX +action.fullDistance - 30*i *alpha ) - s**2, this.groundMinY,
        A8e.config.WIDTH, A8e.config.HEIGHT);
    }

    this.canvasCtx.restore();
  }

  reset(){
    this.minY = this.groundMinY;
    this.minX = -40;// A8e.config.START_X_POS;
    this.dust.reset();

    /*
    let endTime = getTimeStamp();
    let startingSlide = new SlideAction(endTime - ODR.config.MAX_ACTION_PRESS, 7.2);
    startingSlide.priority = 1;
    //FIXME playCount is used for deciding if it should draw guides or not at start.
    startingSlide.start = ODR.crashed ? true : false;
    startingSlide.end = endTime;
      startingSlide.maxPressDuration = 1500;

    ODR.queueAction(startingSlide);
    */
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

class Scoreboard {
  constructor( canvas ){
    this.canvas = canvas;
    this.canvasCtx = canvas.getContext('2d');
    this.glyphs = new Text( 1,'0123456789').glyphs;

    this.reset();
  }

  reset(){
    this.nextScoreAchievement = 100;
    this.flashAchievementTimer = 0;
    this._score = 0;
    this.text = null;
    this.opacity = 0;
    this.existence = 0;
    this.template = `${ODR.gameMode.icon||''}00000`;
    this._minTang = null;
    this._maxTang = null;
    this.replay = false;
  }

  set replay( willReplay ){
    this._replay = willReplay;
    if( willReplay ){
      this.template = `replay #gameR00000`;
      this.score = 0;
      this.replayBlink = [];
      this.replayBlink[0] = this.text;
      this.template = `${ODR.gameMode.icon||''}00000`;
      this.score = 0;
      this.replayBlink[1] = this.text;
      this.replayTimer = 0;
    } else {
      this.replayBlink = null;
      this.replayTimer = 0;
    }
  }
  get replay(){
    return this._replay;
  }

  set maxTangerines( newMaxTang ){
    if( this.replay ) return;
    if( newMaxTang != this._maxTang ){
      this._maxTang = newMaxTang;
      this.template = `#tangerine${this._minTang}/${this._maxTang} ${ODR.gameMode.icon||'#trophy'}00000`;
    }
  }
  set minTangerines( newMinTang ){
    if( this.replay ) return;
    if( newMinTang != this._minTang ){
      this._minTang = newMinTang;
      this.template = `#tangerine${this._minTang}/${this._maxTang} ${ODR.gameMode.icon||'#trophy'}00000`;
    }
  }

  set template( newTemplate ){
    this._template = newTemplate;
    this.text = null;
    this.score = this._score;
  }

  set score( newScore ){
    this._score = newScore;

    if( this.flashAchievementTimer == 0 ){
      newScore = newScore || 0;

      this._playAchievement = 0;
      while( newScore > this.nextScoreAchievement ){
        if( !this._playAchievement ){
          Sound.inst.effects.SOUND_SCORE.play( 0.2 * ODR.config.SOUND_SYSTEM_VOLUME/10, 0, 0.8 );
          this.flashAchievementTimer = 2300;
        }
        this._playAchievement = this.nextScoreAchievement;
        this.nextScoreAchievement += Scoreboard.achievementScore;
      }

      if( this._playAchievement != 0 ){
        if( this._playAchievement >= ODR.achievements[ 0 ]){
          ODR.achievements.shift();
          ODR.notifier.notify( ODR.achievements.shift(), 6000 );
        }

        newScore = this._playAchievement;
      }
    } else {
      newScore = this._playAchievement;
    }

    if( !this.text ){
      this.text = new Text( 1, this._template );
    }

    for( let i = this.text.glyphs.length - 1, j = 0; j < 5; i--, j++ ){
      this.text.glyphs[ i ] = this.glyphs[ newScore % 10 ];
      newScore = Math.floor( newScore /10 );
    }

  }

  forward( deltaTime ){
    if( !this.text ) return;

    if( this.flashAchievementTimer ){
      if( this.flashAchievementTimer % 800 > 300 ){
        let flashingScore = this._playAchievement;
        for( let i = this.text.glyphs.length - 1, j = 0; j < 5; i--, j++ ){
          this.text.glyphs[ i ] = this.glyphs[ flashingScore % 10 ];
          flashingScore = Math.floor( flashingScore /10 );
        }
      } else {
        for( let i = this.text.glyphs.length - 1, j = 0; j < 5; i--, j++ ){
          this.text.glyphs[ i ] = 0;
        }
      }

      this.flashAchievementTimer = Math.max( 0, this.flashAchievementTimer -deltaTime );
      // Set back to the actual score.
      if( this.flashAchievementTimer == 0 ){
        this.score = this._score;
      }
    }

    if( this.existence != this.opacity ){

      this.opacity += deltaTime/300 * Math.sign( this.existence - this.opacity );
      this.opacity = N7e.clamp( this.opacity, 0, 1 );

    }

    if( this.replay ){
      this.replayTimer += deltaTime;
      this.text = this.replayBlink[ this.replayTimer%1000 < 500 ? 0 : 1 ];
    }

    if( this.opacity != 1 ){
      this.canvasCtx.save();
      this.canvasCtx.globalAlpha = this.opacity;
      this.text.draw( this.canvasCtx, this.existence ? 590 : 0, 10, 10+ 8*this.opacity );
      this.canvasCtx.restore();
    } else {
      this.text.draw( this.canvasCtx, 590, 10, 18, 16 );
    }
  }

}

Scoreboard.achievementScore = 100;

class Text {
  constructor( alignment = -1, string, maxLength, softLength ){
    this.glyphs = [];
    this._alignment = alignment;
    //this.minLength = 0;
    this.lineLengths = [];
    this.alignment = alignment;
    if( string ){
      this.setString( string, maxLength, softLength );
    }
  }

 /**
  * Text
  * Map for substitute symbol codes.
  * Better replace this with template string.
  * `something ${natB}`
  */
  static generateSymbolMap(){

    // #substitutions
    this.glyphMap = new Map([
       // this will be the special glyph that can invoke a callback
       // during the rendering time, default will be printing #
      [ 0xe000, 784 ],
      [ 0xe001, 630 ],
      [ 0xe002, 770 ],
      [ 0xe003, 812 ],
      [ 0xe004, 826 ],
      [ 0xe00a, 882 ],
      [ 0xe00b, 896 ],
      [ 0xe00c, 938 ],
      [ 0xe00d, 798 ],
      [ 0xe00e, 854 ],
      [ 0xe00f, 560 ],
      [ 0xe010, 868 ],
      [ 0xe011, 616 ],
      [ 0xe012, 602 ],
      [ 0xe013, 756 ],
      [ 0xe014, 966 ],
      [ 0xe015, 980 ],
      [ 0xe016, 994 ],
      [ 0xe017, 1008 ],
      [ 0xe018, 1022 ],
      [ 0xe019, 1036 ],
      [ 0xe020, 1050 ],
      [ 0xe021, 644 ],
      [ 0xe022, 658 ],
      [ 0xe023, 1064 ],
      [ 0xe024, 1078 ],
    ]);

    // Alphanumerics
    [[ 154, 97, 122 ], [ 154, 65, 90 ], [ 14, 48, 57 ]].forEach(([ a, b, c ]) => {
      for( let code = b; code <= c; code++ ){
        this.glyphMap.set( code, a + ( code - b ) * 14 );
      }
    });

    // Unicode Symbols
    [['.', 518 ],
     ['?', 532 ],
     ['!', 546 ],
     ['/', 574 ],
     ['-', 588 ],
     ['_', 0 ],
     [' ', 0 ],
     ['♬', 602 ],
     ['"', 672 ],
     ["'", 686 ],
     ["☼", 700 ],
     [',', 714 ],
     [';', 728 ],
     [':', 742 ],
     ['⚽', 756 ],
     ['+', 840 ],
     ['(', 910 ],
     ['[', 910 ],
     [')', 924 ],
     [']', 924 ],
     ['%', 952 ]].forEach(([c, glyph]) => this.glyphMap.set( c.charCodeAt(0), glyph ));

    this.symbolMap = [];
    [ [ '##', 0xe000 ],
      [ '#natA', 0xe001 ],
      [ '#natB', 0xe002 ],
      [ '#slide', 0xe003 ],
      [ '#jump', 0xe004 ],
      [ '#google', 0xe00a ],
      [ '#facebook', 0xe00b ],
      [ '#twitter', 0xe00c ],
      [ '#redcross', 0xe00d ],
      [ '#tangerine', 0xe00e ],
      [ '#a', 0xe00f ],
      [ '#trophy', 0xe010 ],
      [ '#<3', 0xe011 ],
      [ '#note', 0xe012 ],
      [ '#football', 0xe013 ],
      [ '#bell', 0xe014 ],
      [ '#noentry', 0xe015 ],
      [ '#gameA', 0xe016 ],
      [ '#gameB', 0xe017 ],
      [ '#gameS', 0xe018 ],
      [ '#gameR', 0xe019 ],
      [ '#speed', 0xe020 ],
      [ '#right', 0xe021 ],
      [ '#left', 0xe022 ],
      [ '#true', 0xe023 ],
      [ '#false', 0xe024 ],
    ].forEach( sym =>
      this.symbolMap.push({
        char: String.fromCharCode( sym[ 1 ]),
        regex: new RegExp( sym[ 0 ], 'g' ),
      })
    );
  }

  static substituteString( messageStr ){
    if( !messageStr ){
      return messageStr;
    }

    for( let i = 0; i < this.symbolMap.length; i++ ){
      if( messageStr.includes('#')){
        let symbol = Text.symbolMap[ i ];
        messageStr = messageStr.replace( symbol.regex, symbol.char );
      } else break;
    }
    return messageStr;
  }

  setString( messageStr, maxLength, softLength ){
    return this.setSubstitutedString( Text.substituteString( messageStr ), maxLength, softLength );
  }

  setSubstitutedString( messageStr, maxLength = 10000, softLength = maxLength ){

    if( !messageStr ){
      this.glyphs = [];
      this.lineLengths.splice( 0 );
      //this.minLength = 0;
      return this;
    }

    this.glyphs = [];
    this.lineLengths = [];
    let lineNo = 0;
    //this.minLength = 0;

    let parts = messageStr.split('\n');
    parts.forEach(( part, index ) => {

      let cur = 0;
      let breaker = false;
      part.split(' ').forEach( word => {
        if( cur != 0 && cur + word.length > maxLength ){
          this.lineLengths[ lineNo ] = this.glyphs.length;
          //this.minLength = Math.max( this.minLength, this.glyphs.length );
          lineNo++;
          cur = 0;
          breaker = false;
        }

        if( word.length ){

          //Fill leading spaces
          //this.glyphs.push(...Array( space ).fill( 0 ));
          //Fill converted glyphs from word
          if( breaker ){
            this.glyphs.push(0);
            cur++;
          }

          for( let i = 0, code; code = word.charCodeAt( i ); i++ ){
            this.glyphs.push(Text.glyphMap.get( code ));
          }
          cur+= word.length;

          if( cur > softLength ){
            this.lineLengths[ lineNo ] = this.glyphs.length;
            lineNo++;
            cur = 0;
            breaker = false;
            //this.minLength = Math.max( this.minLength, this.glyphs.length );
          } else breaker = true;
        } else {
          if( breaker ){
            this.glyphs.push(0);
            cur++;
          }
          this.glyphs.push(0);
          breaker = false;
          cur++;
        }

      });

      this.lineLengths[ lineNo ] = this.glyphs.length;
      //this.minLength = Math.max( this.minLength, this.glyphs.length );
      lineNo++;
    });

    return this;
  }

  draw( canvasCtx, offsetX, offsetY, charW = 14, lineH = 20, image = ODR.spriteGUI ){
    let lastIndex = 0;
    for( let line = 0, y = offsetY; line < this.lineLengths.length; line++, y+=lineH ){
      let nextLineIndex = this.lineLengths[ line ];
      let glyphIndex = this.lineLengths[ line - 1 ] || 0;
      let x = offsetX;
      if( this.alignment == 1 ){
          x = offsetX- ( nextLineIndex - glyphIndex )*charW;
      } else if( this.alignment == 0 ){
          x = offsetX- ( nextLineIndex - glyphIndex )*charW/2;
      }

      while( glyphIndex < nextLineIndex ){
        if( canvasCtx){
          let g = this.glyphs[ glyphIndex ];
          if( g ){ // Don't draw a space.
            canvasCtx.drawImage( image,
              g, 0, 14, 16,
              ~~x, ~~y, 14, 16 );
          }
        }

        x+= charW;
        glyphIndex++;
      }
    }
  }

  drawString( messageStr, canvasCtx, offsetX, offsetY, glyphW, glyphH, image, maxLength) {
    this.setString( messageStr, maxLength );
    this.draw( canvasCtx, offsetX, offsetY, glyphW, glyphH, image );
  }
}
Text.generateSymbolMap();

/**
 * Message
 * A timed string for Terminal class.
 */
class Message {
/**
 * TODO
 * - Use priority. When 2 or more messages are overlapped, a lower one will be discarded.
 * - Multi-layers so we can push & pop back to the previous state, cancelling all in the current state.
 */

/**
 * @param {string} string - string to be displayed.
 * @param {number} time - relative time to the time message got appended.
 * @param {number} duration - time for display.
 * @param {Object} customInfo - custom information.
 */
  constructor( string, duration, time = 0, customInfo ){
    this.string = string;
    this.time = time;
    this.duration = duration;
    //this.duration = duration;
    this.cancelled = false;
    this.info = customInfo;
  }

  cancel(){
    this.cancelled = true;
  }
}

class Terminal {
  constructor( canvas, minX, minY ){
    this.canvas = canvas;
    this.canvasCtx = canvas.getContext('2d');
    this.messages = [];
    this.timer = 0;
    //TODO make width configurable
    this.text = new Text( 0 );
    this.endTime = Infinity;
    this.minX = minX;
    this.minY = minY;
  }

/**
 * Terminal
 * Flush all loaded messages.
 */
  flush(){
    this.timer = 0;
    this.messages = [];
    this.text.setString('');
    this.endTime = Infinity;
  }

/**
 * Terminal
 * apppend Message in sorted order.
 * @param {Message} message - message object.
 */
 //TODO Please test sorting.
  appendMessage( message ){
    message.startTime = message.startTime || ( this.timer + message.time );
    message.endTime = message.startTime + message.duration;

    let i = this.messages.length;
    while( i > 0 ){
      i--;
      let m = this.messages[ i ];
      //TODO
      if( message.startTime >= m.startTime ){
        if( message.startTime == m.startTime ){
          if( message.endTime == m.endTime ){
            if( message.string != m.string ){
              this.messages.splice( i, 1, message );
            }
            return;
          }
        }
        i++;
        break;
      }
    }
    this.messages.splice( i, 0, message );
  }

/**
 * Terminal
 * @param {string} string - string to be displayed.
 */
  append( string, duration = Infinity, time = 0 ){
    this.appendMessage( new Message( string, duration, time ));
  }

/**
 * Terminal
 * @param {number} deltaTime - time diff from last call.
 */

  forward( deltaTime ){
    this.timer += deltaTime;

    while( this.messages.length && this.messages[ 0 ].startTime < this.timer ){
      let msg = this.messages.shift();

      if( msg.cancelled ) continue;

      if( msg.endTime > this.timer ){
        this.endTime = msg.endTime;
        this.text.setString( msg.string );
      }
    }

    if( this.endTime < this.timer ){
      this.text.setString('');
      this.endTime = Infinity;
    }

    this.text.draw( this.canvasCtx, this.minX, this.minY );
  }
}

class Notifier {
  constructor( canvas ){
    this.canvas = canvas;
    this.canvasCtx = canvas.getContext('2d');
    this.timer = 0;
    this.text = new Text( -1 );
    this.opacity = 0;
  }

  notify( messageStr, timer, opt_lineWidth ){
    this.timer = timer || 2000;
    this.text.setString( messageStr, 20 );
  }

  forward( deltaTime ) {
    if (this.timer > 0) {

      if (this.timer > 500) this.opacity += deltaTime /100;
      else this.opacity -= deltaTime/200;
        if (this.opacity > 1) this.opacity = 1;
        else if (this.opacity < 0) this.opacity = 0;

      this.opacity +=
        this.timer > 500
        ? deltaTime /200
        : -deltaTime /200;
          if (this.opacity < 0) this.opacity = 0;
          else if (this.opacity > 1) this.opacity = 1;

      this.canvasCtx.save();
      this.canvasCtx.globalAlpha = this.opacity;
      this.text.draw( this.canvasCtx,
        14 - 20*(1 - this.opacity), 10,
        Math.ceil( 14*this.opacity ), Math.ceil( 16*this.opacity ));
      this.canvasCtx.restore();
      this.timer -= deltaTime;
    }
  }
}

class NoPanel {
  constructor(){ this.passthrough = true; }
  forward(){ return this; }
  exit(){}
  handleEvent( e ){ return false; }
}

class Panel {
  constructor( canvas, previousPanel = null, associatedButton = null ) {
    this.canvas = canvas;
    this.canvasCtx  = canvas.getContext('2d');
    this.submenu = null;
    this.passthrough = false;
    this.associatedButton = associatedButton;
    this.buttonTime = [ 0, 0 ];
    this.willEnter = false; //Indicate double-pressed.
    this.offset = 0;
    this.timer = 0;
    this.previousPanel = previousPanel;
    this.nextPanel = undefined;
  }

  forward( deltaTime ){
    if( undefined !== this.nextPanel ){
      return this.nextPanel;
    }

    let nextPanel = this.repaint( deltaTime );
    this.timer += deltaTime;

    return nextPanel;
  }

  repaint( deltaTime ){
    return this;
  }

  exit( panel ){
    this.nextPanel = panel || this.previousPanel;
  }

/**
 * Panel event handler.
 * Manage Left & Right console buttons.
 * @param {Event} e - an event.
 * @return {boolean} - true if the event was handled and shouldn't be handled again.
 */
  handleEvent( e ){

    // Only handle known event types, default to passing the event back to the parent.
    switch( e.type ){
      case OnDaRun.events.CONSOLEDOWN: {
        let button = e.detail.consoleButton;
        switch( button ){
          case ODR.consoleButtons.CONSOLE_LEFT:{
            this.willEnter = this.buttonTime[ 1 ] ? true : false;
            this.buttonTime[ 0 ] = this.timer;
          } break;

          case ODR.consoleButtons.CONSOLE_RIGHT:{
            this.willEnter = this.buttonTime[ 0 ] ? true : false;
            this.buttonTime[ 1 ] = this.timer;
          } break;

          default:
            return false;
        }
      } break;

      case OnDaRun.events.CONSOLEUP: {
        let button = e.detail.consoleButton;
        switch( button ){
          case ODR.consoleButtons.CONSOLE_LEFT:{
            if( this.buttonTime[ 0 ]){
              this.buttonTime[ 0 ] = 0;
              if( !this.willEnter )
                this.offset--;
            }
          } break;

          case ODR.consoleButtons.CONSOLE_RIGHT:{
            if( this.buttonTime[ 1 ]){
              this.buttonTime[ 1 ] = 0;
              if( !this.willEnter )
                this.offset++;
            }
          } break;

          default:
            return false;
        }

      } break;

      default:
        return false;
    }

    return true;
  }
}

class TitlePanel extends Panel {
  constructor( canvas ) {
    super( canvas );
    this.timer = 0;
    this.endTime = 0;

    this.waitingForAudioContext = true;

    //Set this true enforce the Donation page to always appear.
    this.waitingForButtonUp = true;
    //this.waitingForButtonUp = Sound.inst.audioContext.state === "suspended" ? true : false;

    // buttonBlockStopTime wlll automatically be set to the timer by a successful
    // user authentication and that will fade the donation messages out.
    this.buttonBlockStopTime = 15000;

    this.blackoutOpacity = 1;
    Sound.inst.contextReady().then( actx => {
      this.waitingForAudioContext = false;
      this.imagesLoadedTime -= this.timer;
      this.timer = 0;
    });

    // These 2 used for fast-forwarding the story while holdig both control buttons simultaneously.
    this.storyStartOffset = 18000;
    this.fastForwarding = false;

    // The Redcross Donation Message.
    this.donationText = new Text( 0 ).setString(
`#redcross

Please support this project
by making a donation to
the thai redcross society


#left to donate #slide                #jump to sprint #right
`);

    // Main Amandarine story
    this.story = [
      new Text( -1,
`Friends, allow me to tell you a story, A tale of a young maiden named Amandarine, who was born in a small village called Mandarina.

In the unfortunate beginning, Amandarine was unhealthy from birth. Her family had been trying all kinds of treatments, but her condition didn't improve. She had to endure suffering from the cruel birth defect throughout her childhood. The doctor had warned that her condition would be life-threatening by anytime.

But despite her illness, the baby had still been growing and growing up, until the day of her 18th birthday...`, 39, 37 ),

      new Text( -1,
`That morning, Amandarine was having her custard bread. She then heard the sound of someone playing the ukulele while singing a song she had never heard before. She looked out the window and saw a man, a street performer, maybe; who was walking pass by until suddenly stumbled upon the rock and fell abjectly.

She hurried out to see him and found him cringing, rubbing his little toe. He was still groaning faintly in pain as he looked back at her. Or he didn't look at her actually, he looked at the half-eaten loaf of bread she took with her...`, 39, 37 ),

      new Text( -1,
`Warm sunlight was teasing the cold breeze that was blowing gently. The birds chirping in the morning reminded her that this man must definitely be hungry. She, therefore, gave him the remaining bread. He smiled with gratitude and started eating the bread happily.

Once finished, that was very soon after, he looked at Amandarine and said that telling from her facial skin and eye reflections, he could notice many signs of her dreadful health in which she nodded affirmatively.

...In fact, he continued, he was a doctor from China called Lu Ji. Then he asked for her wrist so he could make a further diagnosis.

After learning the pulses for a few breathes, Lu Ji told her that her disease, though very serious, had a cure.

That got all of her attention and she started listening to him intensely. He didn't say any more word but picked up a dried orange from his ragged bag; a dried tangerine would be more precise.`, 39, 37 ),

      new Text( -1,
`Saying that he must have fled his hometown, for he had stolen this very tangerine from a noble. The dried brownish fruit was called "The 8th Heaven Supremacy"; it could cure her illness, he explained and asked her to accept it.

He said that she should boil it in ginger juice to create one adequate medicine for living longer but for her to be fully recovered its seeds must be planted in eight continents and she should have kept eating each kind of them afterwards until cured.

Amandarine cried with tears of joy as she was thanking him. Lu Ji smiled, stood up and brushed the dust off his legs repeatedly. He didn't even say goodbye when he started playing the ukulele, singing this song, walking away.`, 39, 37 ),

      new Text( -1,
`♬ Natherine ♬
she is all they claim
With her eyes of night
and lips as bright as flame

Natherine
when she dances by
Senoritas stare
and caballeros sigh

And I've seen
toasts to Natherine
Raised in every bar
across the Argentine

Yes, she has them all on da run
And their hearts belong to just one
Their hearts belong to
♬ Natherine ♬`, 39 ),

      new Text( 0,
`Credits

-Music-

The song "Natherine" based on
an old song "Tangerine"
written by Victor Schertzinger
and lyrics by Johnny Mercer.

The arrangement was adapted from
Guy Bergeron's MIDI file
without permission.


-Computer Graphics-

#tangerine
Orange Groove Sororite

Which doesn't exist.


-Software Developments-

N#aturing M#achine

Which also doesn't exist.


-Special Thanks-

#natA
#<3 Dusita Kitisarakulchai #<3
..as the inspiration..

and some of her particular
supporters / fanpages
for buzzing about it.

You can also support this project
by making a donation to
The Thai Redcross Society #redcross

`),
    ];

    this.storyPhotos = [];
    this.imagesLoadedTime = Infinity;

    this.msPerLine = 2150;

    let clock = 3000;

    this.photoTiming = [
    //  beginTime, endTime, will be calculated from number of lines.
    //  |    beginX,beginY, beginSize,
    //  |    |           endX,endY, endSize
      [ 0,0, 30,33, 1,   215,411, 1.5 ],
      [ 0,0, 27,355, 1,  73,151, 1.2 ],
      [ 0,0, 29,26, 1,   26,358, 1.2 ],
      [ 0,0, 23,350, 1,  27,24, 1 ],
      [ 0,0, 62,244, 1,  12,160, 0.5 ],
      [ 0,0, 100,237, 1, 100,237, 1.0 ],
    ];
    for( let i = 0; i < this.story.length; i++) {
      this.photoTiming[i][0] = clock;
      clock += 20000 + this.story[i].lineLengths.length * this.msPerLine;
      this.photoTiming[i][1] = clock;
    }
    this.storyEndTime = this.photoTiming[ this.story.length- 1][ 1 ];

    Sound.inst.loadEffect('amandarine-frontier').then( audio => {
      this.titleAmandarineFrontierAudio = audio;
    });

  }

  loadImages(a,...theArgs){
    // Don't load last image.
    let imageLoadedCounter = this.story.length - 1;
    for( let i = 0; i < this.story.length - 1; i++  ) {
      this.storyPhotos[i] = new Image();
      this.storyPhotos[i].addEventListener('load', (e) => {
        imageLoadedCounter--;
        if( imageLoadedCounter == 0 ){
          this.imagesLoadedTime = this.timer;
        }
      });
      this.storyPhotos[i].src = `assets/story/amandarine-story-${i+1}.jpg`;
    }
  }

  stopWaitingForButtonUp(){
    this.imagesLoadedTime -= this.timer;
    this.timer = 0;
    this.waitingForButtonUp = false;
  }

  handleEvent( e ){
    super.handleEvent( e );

    switch( e.type ){
      case OnDaRun.events.CONSOLEDOWN:{
        return true;
      }
      case OnDaRun.events.CONSOLEUP:
        // Make sure all control buttons are released.
        if( this.waitingForButtonUp ){
          if( !this.__donateOnce && e.detail.consoleButton.id === 'console-left'){
            this.__donateOnce = true;
            window.open( "https://www.redcross.or.th/donate/", '_blank');
            //FIXME should just force PAUSE
            //FIXME impelmenet pause() toggler
            this.titleAmandarineFrontierAudio = null;
          }
          this.stopWaitingForButtonUp();
        } else if( !this.waitingForAudioContext
            && 0 == this.buttonTime[ 0 ]
            && 0 == this.buttonTime[ 1 ]
            && this.imagesLoadedTime < this.timer
            && !this.endTime ){

          if( this.fastForwarding ){
            this.fastForwarding = false;
            return true;
          }

          this.endTime = this.timer;

          ODR.sky.setShade( Sky.config.DAY, 3000 );
        }
        return true;
      default:
        return false;
    }
  }

/**
 * TitlePanel repaint.
 * @param {number} deltaTime - duration since last call.
 * @return {Panel} - a subsitute or null.
 */
  repaint( deltaTime ) {

    //====== The Thai Redcross Society Advertisement ======//
    if( this.waitingForAudioContext || this.waitingForButtonUp ){
      this.canvasCtx.drawImage( ...ODR.consoleImageArguments );
      if( !this.waitingForAudioContext && this.timer > this.buttonBlockStopTime ){
        let opacity = 1 - Math.min( 2000, this.timer- this.buttonBlockStopTime )/2000;
        this.canvasCtx.save();
        this.canvasCtx.globalAlpha = opacity;
        this.donationText.draw( this.canvasCtx, 300, 30 );
        this.canvasCtx.restore();
        if( this.timer > this.buttonBlockStopTime + 2500 ) this.stopWaitingForButtonUp();
      } else {
        this.donationText.draw(this.canvasCtx, 300, 30);
      }

      return this;
    }

    //====== Logo Display ======//
    let endingTimer = 0;
    let endingOffset = 0;
    let endingOpacity = 1;

    if( this.endTime && Sound.inst.effectsLoadingProgress == 1 ){
      endingTimer = this.timer - this.endTime;

      if ( endingTimer > 863) { // -endingOffset > ~200
        return ODR.start();
      }
      endingOffset = ( 40000- ( 0.8*endingTimer - 200 )**2 )/1000 ;
      endingOpacity = 1 - Math.min( endingTimer, 400 )/400;
    }

    let dataDownloaded = IS_SOUND_DISABLED ? 100 : Sound.inst.musicLoadingProgress * 100;

    if( this.timer <= 800 ){
      this.blackoutOpacity = 1 - Math.min(1, this.timer / 800);
    } else {
      this.blackoutOpacity = 0;
      if( this.titleAmandarineFrontierAudio && !this.waitingForButtonUp ){
        this.titleAmandarineFrontierAudio.play( ODR.config.SOUND_SYSTEM_VOLUME/10 );
        /*
        for( let i = 0, j = 1.5 ; i <= 1 ; i+=0.5,j+=0.1){
          Sound.inst.effects.SOUND_SCORE.play( ( 1 - i )*ODR.config.SOUND_SYSTEM_VOLUME/10, j, -i );
          Sound.inst.effects.SOUND_SCORE.play( ( 1 - i )*ODR.config.SOUND_SYSTEM_VOLUME/10, j, i );
        }
        */
        this.titleAmandarineFrontierAudio = null;
      }
    }

    let storyTimer = 0;
    let fadingDuration = 2000;

    //Fast-forward the story
    if( this.buttonTime[ 0 ] && this.buttonTime[ 1 ] ){
      this.fastForwarding = true;
      this.storyStartOffset -= 300;
    }

    // Find the opaqueness of the dark screen to fake no display.
    if( this.timer - this.imagesLoadedTime > this.storyStartOffset ){
      storyTimer = this.timer - this.imagesLoadedTime - this.storyStartOffset;
      this.blackoutOpacity = N7e.clamp( storyTimer/2000, 0, 1 )
        * N7e.clamp(( this.storyEndTime+ 2000- storyTimer )/2000, 0, 1)
        * endingOpacity;
    }

    if( this.blackoutOpacity != 1 ){
      let factorA = Math.sin( this.timer/400 );
      let factorB = Math.sin( this.timer/300 );
      let factorC = Math.sin( this.timer/200 );

      ODR.sky.forward( deltaTime, this.canvasCtx );

      /* A AMANDARINE FRONTIER */
      this.canvasCtx.drawImage(ODR.spriteGUI,
        148,15,208,85,
        300-120 + 21,
        ~~(3 + endingOffset * 1.1),
        208,85);
      /* BB REDHAND */
      this.canvasCtx.drawImage(ODR.spriteGUI,
        125,100,37,30,
        300-120 + 41 + Math.round(factorB),
        ~~(80 + 6 * factorB + endingOffset * 1.2),
        37,30);
      /* B AMANDARINE */
      this.canvasCtx.drawImage(ODR.spriteGUI,
        368,115,162,133,
        300-120 + 37 + Math.round(factorA),
        ~~(20 + 3 * factorB + endingOffset * 1.35),
        162,133);
      /* C ONDARUN */
      this.canvasCtx.drawImage(ODR.spriteGUI,
        127,175,241,75,
        300-120 + 0,
        Math.round(100 + endingOffset * 1.38),
        241,75);
      /* D TANGERINE */
      this.canvasCtx.drawImage(ODR.spriteGUI,
        368,16,99,97,
        300-120 + 121 - Math.round(2 * factorA),
        ~~(30 + 2 * factorC + endingOffset * 1.4),
        99,97);
    }

    if( dataDownloaded >= 100 ){
      if( this.timer < 15000 ){
        new Text( 0 ).drawString(`Amandarine Frontier: On Da Run [Ver.${VERSION}]`,
          this.canvasCtx, 300, 180 -Math.min( 0, endingOffset ));
      } else {
        new Text( 0 ).drawString("press a button to continue.",
          this.canvasCtx, 300, 180 -Math.min( 0, endingOffset ));
      }
    }

    //====== Story Scene ======//

    // Dark out the logo scene.
    if( this.blackoutOpacity !==0 ){
      this.canvasCtx.save();
      this.canvasCtx.globalAlpha = this.blackoutOpacity;
      this.canvasCtx.drawImage( ...ODR.consoleImageArguments );
      this.canvasCtx.restore();
    }

    if( dataDownloaded < 100 ){
      if( !this.__dataDownloadedText ){
        this.__dataDownloadedText = new Text( 0 );
      }
      this.__dataDownloadedText.drawString(`loading: ${dataDownloaded|0}%`, this.canvasCtx, 300, 180 );
    } else {

      // Prepare images for the story
      if( !this.storyPhotos.length ){
        this.loadImages();
      }

      // Begin the story mode.

      if( this.timer - this.imagesLoadedTime > this.storyStartOffset ){
        this.canvasCtx.save();

        //Providing smooth-out during story mode.
        this.canvasCtx.globalAlpha = N7e.clamp( storyTimer/2000, 0, 1 )
          * N7e.clamp(( this.storyEndTime+ 2000- storyTimer )/2000, 0, 1)
          * endingOpacity;

        this.photoTiming.forEach(([ beginTime, endTime, beginX, beginY, beginSize, endX, endY, endSize ], index ) => {
          if( storyTimer > beginTime && storyTimer < endTime ){

            if( index == 4 ){
              Sound.inst.loadMusic('offline-intro-music', true );
            }

            beginTime = storyTimer - beginTime;
            endTime = endTime - storyTimer;

            let ratio = beginTime / (beginTime + endTime);
            let offsetX = beginX + (endX - beginX) * ratio;
            let offsetY = beginY + (endY - beginY) * ratio;
            let size = beginSize + (endSize - beginSize) * ratio;

            this.canvasCtx.save(); {

              if( this.storyPhotos[ index ]){
                this.canvasCtx.scale( size, size );
                this.canvasCtx.translate( -offsetX, -offsetY );
                this.canvasCtx.globalAlpha = 0.70 * endingOpacity
                  * N7e.clamp( beginTime/fadingDuration, 0, 1 )
                  * N7e.clamp( endTime/fadingDuration, 0, 1 );
                this.canvasCtx.drawImage(this.storyPhotos[ index ], 0, 0);
              }

            } this.canvasCtx.restore();

            this.canvasCtx.globalAlpha = endingOpacity
                * N7e.clamp( beginTime/fadingDuration, 0, 1 )
                * N7e.clamp( endTime/fadingDuration, 0, 1 );

            //20 is the default glyph height.
            let y = ~~( 200- 20*beginTime /this.msPerLine );
            if( index == this.story.length- 1 ){
              let g = this.timer%400 > 200 ? 616 : 0;
              // They are hard-coded but it's planned to allow
              // a special glyph that will invoke a callback.
              // See 0xe000 784
              this.story[index].glyphs[342] = g;
              this.story[index].glyphs[367] = g;
              this.story[ index ].draw( this.canvasCtx, 300, y);
            } else {
              this.story[ index ].draw( this.canvasCtx, 25, y);
            }
          }
        });

        this.canvasCtx.restore();
        if( this.fastForwarding && this.timer%600 > 300 && this.storyEndTime > storyTimer ){

          if( !this.__fastForwardingText ){
            this.__fastForwardingText = new Text( 1, "#right#right" );
          }
          this.__fastForwardingText.draw( this.canvasCtx, 600, 185, 10 );
        }
      }
    }
    return this;
  }
}

class Pause extends Panel {
  constructor( canvas, previousPanel = null , silent = false ){
    super( canvas, previousPanel );
    this.screenOpacity = ODR.canvas.style.opacity;
    this.isPaused = false;
    this.silent = silent;
  }

  repaint(){
    if( !this.isPaused ){
      console.log('PAUSED');
      this.isPaused = true;

      if( !this.silent ){
        this.screenOpacity = ODR.canvas.style.opacity;
        ODR.canvas.style.opacity /= 2;

        this.canvasCtx.save();
        for( let i = 4; i >= 0; i -= 4 ){
          this.canvasCtx.fillStyle = i ? "#0003" : "#fffd";
          this.canvasCtx.filter =  i ? `blur(4px)` : 'blur(0px)';
          this.canvasCtx.fillRect( 270+i, 70+i, 20, 60 );
          this.canvasCtx.fillRect( 310+i, 70+i, 20, 60 );
        }
        this.canvasCtx.restore();

      }
    }

    return this;
  }

  handleEvent( e ){
    return true;
  }

  exit( panel ){
    if( !this.silent && this.isPaused){
      ODR.canvas.style.opacity = this.screenOpacity;
      console.log('UNPAUSED');
    }

    this.isPaused = false;
    super.exit( panel );
  }
}

class Wait extends Panel {
  constructor( canvas, previousPanel = null, bottomMessage, progressingCallback ) {
    super( canvas, previousPanel );
    this.progressingCallback = progressingCallback;
    this.timer = 0;
    this.ticker = 0;
    this.bottomText = new Text( 0, bottomMessage );
    this.isWaiting = true;
  }

  repaint( deltaTime ){

    if( this.timer == 0 ){
      this.canvasCtx.drawImage( ...ODR.consoleImageArguments );
      this.bottomText.draw( this.canvasCtx, 300, 180 );
      this.canvasCtx.drawImage( ODR.spriteGUI,
        38 + ~~(this.timer/100)%4 * 22, 73, 22, 22,
        300 -11, 100 -11, 22, 22 );
    } else if( this.timer > this.ticker ){
      this.canvasCtx.drawImage( ODR.consoleImage,
        100 +300 -11, 237 +100 -11, 22, 22,
        300 -11, 100 -11, 22, 22 );
      this.canvasCtx.drawImage( ODR.spriteGUI,
        38 + ~~(this.timer/100)%4 * 22, 73, 22, 22,
        300 -11, 100 -11, 22, 22 );
        this.ticker+= 200;
    }

    if( this.progressingCallback ){
      return this.progressingCallback( this );
    }
    return this;
  }

  handleEvent( e ){
    return true;
  }
}

class Menu extends Panel {
  constructor( canvas, model, associatedButton, previousPanel, muted = false ){
    super( canvas, previousPanel, associatedButton );
    this.model = model;
    this.displayEntry = this.model.currentIndex = this.model.currentIndex  || 0;
    this.xOffset = 0;
    this.yOffset = 0;
    this.bottomText = new Text( 0,'press both #slide+#jump to select');
    this.text = new Text();
    this.scoreText = new Text( 1 );
    this.timer = 0;
    this.muted = muted;
  }

  /*
  handleEvent( e ){
    if( this.submenu && this.submenu.handleEvent ){
      return this.submenu.handleEvent( e );
    }

    // Only handle known event types, default to passing the event back to the parent.
    return super.handleEvent( e );
  }
  */

  repaint( deltaTime ){
    this.canvasCtx.drawImage( ...ODR.consoleImageArguments );

    if( this.offset ){

      if( !this.muted )
        Sound.inst.effects.SOUND_BLIP.play( ODR.config.SOUND_SYSTEM_VOLUME/10 );

      let newIdx = this.model.currentIndex + this.offset;
      let length = this.model.entries.length;

      this.model.currentIndex = newIdx - length * Math.floor( newIdx / length );
      this.offset = 0;
    }

    /*
    this.canvasCtx.fillStyle = "#000d";
    this.canvasCtx.fillRect(0,0,this.canvas.width,this.canvas.height);
    */

    // An entry was chosen. Waiting until both buttons are released.
    if( this.willEnter && 0 == this.buttonTime[ 0 ] && 0 == this.buttonTime[ 1 ]){
      this.willEnter = false;

      let entry = this.model.entries[ this.model.currentIndex ];

      if( entry.disabled || ( entry.hasOwnProperty('value') && !entry.options )){
        Sound.inst.effects.SOUND_ERROR.play( ODR.config.SOUND_SYSTEM_VOLUME/10 );
      } else {
        Sound.inst.effects.SOUND_SCORE.play( ODR.config.SOUND_SYSTEM_VOLUME/10 );

        // The choosen entry has "options". Create a submenu.
        if (entry.options) {
          this.model.enter(this.model.currentIndex, entry);

          let subEntries;
          if( entry.options.hasOwnProperty('min')){
            subEntries = [];
            for (let i = entry.options.min; i <= entry.options.max; i+= entry.options.step) {
              subEntries.push(i);
            }
          } else {
            subEntries = entry.options.slice();
          }
          let currentIndex;
          for (currentIndex = 0; currentIndex < subEntries.length; currentIndex++) {
            if (entry.value == subEntries[currentIndex]) {
              break;
            }
          }
          subEntries.push({ title:'CANCEL', exit:true });

          let submenu = new Menu( this.canvas, {
            name: entry.name,
            title: `${this.model.title}\n${entry.title}`,
            _currentIndex: currentIndex,
            select: this.model.select,
            get currentIndex() {
              return this._currentIndex;
            },
            set currentIndex( newIndex ) {
              if( this.select ) {
                this.select( entry, newIndex, this );
              }
              this._currentIndex = newIndex;
            },
            entries: subEntries,
            enter: ( select, selectedItem ) => {
              if( !selectedItem.exit ){
                entry.value = selectedItem;
                this.model.enter( select, entry );
                /*
                ODR.config.GRAPHICS_MODE_SETTINGS[3][entry.name] = selectedItem;
                ODR.setGraphicsMode(3);
                if (N7e.user)
                  N7e.user.odrRef.child('settings/'+entry.name).set(selectedItem);
                  */
              }
              //hackish, to turn sample music off on leaving the submenu.
              if( this.associatedButton == ODR.consoleButtons.CONSOLE_A ){
                Sound.inst.currentSong = null;
              }
              submenu.exit();
              return submenu;
              //this.submenu = null;
            },
          }, this.associatedButton, this, entry.muted  );
          return submenu;

          /*
          this.submenu.xOffset = this.xOffset + 25;
          this.submenu.yOffset = this.yOffset + 8;
          this.submenu.bottomText = null;
          */

        } else return this.model.enter( this.model.currentIndex, entry );
      }
    }

    // Dislay User Profile on the right side of the menu.
    // FIXME subclass this
    if( this.model.profile ){
      if( N7e.user.image ){
        this.canvasCtx.drawImage( N7e.user.image,
          0, 0, N7e.user.image.width, N7e.user.image.height,
          510, 10,  80, 80 );
      }

      let scoreString = "";

      let tt = ODR.gameModeTotalScore;
      if( tt ){
        scoreString+= `#gameA+#gameB+#gameS ${tt.toString()} #trophy\n`;
      }

      if( ODR.maxSpeed ){
        scoreString+= `${(40*ODR.maxSpeed.value/ODR.config.MAX_SPEED).toFixed(2)} mi/h #speed\n`;
      }

      if( ODR.totalTangerines ){
        let maxPerDay = Math.max( 1, ~~(tt/100));
        scoreString += ODR.totalTangerines + `[${ODR.dailyTangerines}/${maxPerDay}]` + ' #tangerine\n';
      }

      this.scoreText.setString( scoreString ).draw( this.canvasCtx, 590, 100);


      /*
      if( N7e.user.nickname ) {
        this.text.setString( N7e.user.nickname + {
            ['google.com']:' #google',
            ['facebook.com']:' #facebook',
            ['twitter.com']:' #twitter',
          }[this.model.provider]).draw(
          this.canvasCtx,
          562 - 14 * N7e.user.nickname.length, 100);
      }
      */

    }

    if (this.displayEntry != this.model.currentIndex) {
      this.displayEntry += (this.model.currentIndex - this.displayEntry) * (FPS / 7000) * deltaTime;
      if (Math.abs(this.displayEntry - this.model.currentIndex) < 0.05) {
        this.displayEntry = this.model.currentIndex;
      }
    }

    this.canvasCtx.save();
    for (let i = 0; i < this.model.entries.length; i++) {
      let entry = this.model.entries[i];
      let title = entry.title ? entry.title : entry;

      let xxx = Math.abs(this.displayEntry - i);
      this.canvasCtx.globalAlpha = (entry.disabled ? 0.5 : 1)*Math.max(0.1,(4 - xxx)/4);
      if (entry.hasOwnProperty('value')) title += '.'.repeat(32-title.length-(entry.value+'').length)+'[ '+entry.value+' ]';

      this.text.setString((i == this.model.currentIndex ? (entry.exit ? '#left ' : ' #right'):'  ') +title +(entry.disabled ? ' #noentry' : '')).draw(
        this.canvasCtx,
        this.xOffset + 20 + 2 * 3 * Math.round( Math.sqrt( 100*xxx )/3 ),
        this.yOffset + 90 + 5 * Math.round( 4 * ( i - this.displayEntry )));
    }
    this.canvasCtx.restore();

    /*
    if (this.submenu) {
      this.canvasCtx.save();
      this.canvasCtx.globalAlpha = 0.9;
      this.canvasCtx.drawImage( ...ODR.consoleImageArguments );
      this.canvasCtx.restore();
      this.submenu.forward(deltaTime, depth + 1 );
    }
    */

    if( this.model.title ){
      new Text( 0 ).drawString( this.model.title, this.canvasCtx, 300, 10);
    }

    if( this.bottomText ){
      this.bottomText.draw( this.canvasCtx, 300, 180 );
    }

    return this;
  }

}

class TextEditor extends Panel {
  constructor( canvas, value, callback, previousPanel ){
    super( canvas, previousPanel );
    this.xOffset = 0;
    this.yOffset = 0;
    this.submenu = null;
    this.bottomText = new Text( 0,'press both #slide+#jump to select');

    this.value = value;
    this.curX = 0;
    this.curY = 0;
    this.callback = callback;
    this.pattern = "etnsh ◅aiouc.'rdlmf,\"wygpb!?vkqjxz#01234+/56789-▻";
    this.pattern2 = `etnsh#natA#natB#football
aiouc.'#bell
rdlmf,"#<3
wygpb!?#redcross
vkqjxz #trophy#noentry
01234+/#left#false
56789-%#right#true`;

    this.supporteChars = Text.substituteString( this.pattern2 ).split('\n').join('').split('');

  }

  handleEvent( e ){
    if( e.ctrlKey ) return false;

    e.preventDefault();
    switch( e.type ){
      case OnDaRun.events.KEYDOWN:
        return ( e.key == 'Delete'
          || e.key == 'Enter'
          || this.pattern.indexOf( e.key ) != -1 );
      case OnDaRun.events.KEYUP:
        if( e.key == 'Delete' ){
          Sound.inst.effects.SOUND_POP.play( 0.5 * ODR.config.SOUND_SYSTEM_VOLUME/10 );
          this.value = this.value.slice( 0, this.value.length- 1 );
          return true;
        } else if (e.key == 'Enter') {
          Sound.inst.effects.SOUND_BLIP.play( ODR.config.SOUND_SYSTEM_VOLUME/10 );
          this.curX = 7;
          this.curY = 6;
          this.double = true;
          return true;
        } else if (this.pattern.indexOf(e.key) != -1) {
          if( this.value.length >= 25 ){
            this.value = this.value.slice( 0, 25 );
            Sound.inst.effects.SOUND_ERROR.play( ODR.config.SOUND_SYSTEM_VOLUME/10 );
          } else {
            this.value += e.key;
            Sound.inst.effects.SOUND_SCORE.play( ODR.config.SOUND_SYSTEM_VOLUME/10 );
          }
          return true;
        }
        return false;
        break;
    }

    return super.handleEvent( e );
  }

  repaint( deltaTime ) {
    this.timer += deltaTime;

    if( this.offset && !this.muted )
      Sound.inst.effects.SOUND_BLIP.play( ODR.config.SOUND_SYSTEM_VOLUME/10 );
    if( this.offset > 0 ){
      this.curX = (this.curX + this.offset)%8;
      this.offset = 0;
    } else if ( this.offset < 0 ){
      this.curY = (this.curY - this.offset)%7;
      this.offset = 0;
    }

    if( this.willEnter && 0 == this.buttonTime[ 0 ] && 0 == this.buttonTime[ 1 ]){
      this.willEnter = false;
      /*
      if (this.submenu) {
        this.submenu = null;
      }
      */
      if( this.curX == 7 && this.curY == 6 ){
        Sound.inst.effects.SOUND_SCORE.play( ODR.config.SOUND_SYSTEM_VOLUME/10 );
        return this.callback( this.value );
      } else if( this.curX == 7 && this.curY == 5 ){
        Sound.inst.effects.SOUND_POP.play( 0.5 * ODR.config.SOUND_SYSTEM_VOLUME/10 );
        this.value = this.value.slice( 0, this.value.length - 1 );
      } else {
        let slicePos = this.curY*8+this.curX;
        let newChar = this.supporteChars[ this.curY * 8 + this.curX ]
        this.value += newChar;
        if( "0123456789".includes( newChar )){
          this.curX = 0;
          this.curY = 5;
        } else if( "abcdefghijklmnopqrstuvwxyz".includes( newChar )){
          this.curX = 0;
          this.curY = 0;
        }

        if( this.value.length > 25 ){
          this.value = this.value.slice( 0, 25 );
          Sound.inst.effects.SOUND_ERROR.play( ODR.config.SOUND_SYSTEM_VOLUME/10 );
        } else {
          Sound.inst.effects.SOUND_SCORE.play( ODR.config.SOUND_SYSTEM_VOLUME/10 );
        }
      }

    }

    this.canvasCtx.save();
    /*
    this.canvasCtx.fillStyle = "#000d";
    this.canvasCtx.fillRect(0,0,this.canvas.width,this.canvas.height);
    */
    this.canvasCtx.drawImage( ...ODR.consoleImageArguments );

    this.canvasCtx.fillStyle = "#a60";
    this.canvasCtx.fillRect( this.xOffset+ 25*this.curX,
      this.yOffset+ 2+ ( 1+ this.curY )*25, 23, 23 );
      /*
    for( let u = 0; u < 7; u++ ){
      new Text( -1, this.pattern.slice( u*7, u*7+7 )).draw(
        this.canvasCtx,
        5, this.yOffset+ 7+ 25*( u + 1 ),
        25, 25 );
    }
    */
    new Text( -1, this.pattern2 ).draw( this.canvasCtx, 5, this.yOffset+ 7+ 25, 25, 25 );

    if( this.value.length )
      this.canvasCtx.fillRect(
        this.xOffset, this.yOffset+ 1,
        14*25 + 10, 23 );
    this.canvasCtx.fillStyle = "#840";
    if( this.value.length )
      this.canvasCtx.fillRect(
        this.xOffset, this.yOffset+ 1,
        14*this.value.length+ 10, 23 );

    new Text( -1, this.value ).draw(
      this.canvasCtx,
      this.xOffset + 5,
      this.yOffset + 7);

      /*
    new Text( 1, "up to 25 chars.\n...delete_____________________\n\nyou can use keyboard on pc.\nand touch screen on mobile.\nactually, I lied. Oh c'mon.\nit's fun!\n...enter______________________"  ).draw(
      this.canvasCtx,
      this.xOffset + 600 - 5,
      this.yOffset + 7, 14, 25);
      */

    this.canvasCtx.restore();

    return this;
  }
}

class GameOver extends Panel {
  constructor( canvas ){
    super( canvas );
    this.timer = 0;
    this.passthrough = true;
    this.willRestart = false;
    this.playedMusic = false;

    if( ODR.runRecord.hiscore < ODR.score)
      this.clearTime = ODR.config.GAMEOVER_CLEAR_TIME + 4000;
    else this.clearTime = ODR.config.GAMEOVER_CLEAR_TIME;
  }

  playMusicIfNeeded( d = 0 ){
    if( !this.playedMusic ){
      this.playedMusic = true;

      // Load lyrics, FIXME if needed.
      let lyrics = [];
      for( let i = 0, l = ODR.config.NATHERINE_LYRICS; i < l.length; i+= 2 ){
        let string = l[ i + 1 ];
        let duration = (l[ i + 2 ] || 5)*1000;
        lyrics.push( new Message( string, 10000, 0, l[ i ]));
      }

      Sound.inst.loadMusic('offline-intro-music', ODR.config.PLAY_MUSIC, d, lyrics );
    }
  }

  handleEvent( e ){
    if( this.willRestart || !super.handleEvent( e )){
      return false;
    }

    if( e.type == OnDaRun.events.CONSOLEUP
      && this.timer > this.clearTime
      && 0 == this.buttonTime[ 0 ]
      && 0 == this.buttonTime[ 1 ]){

      this.willRestart = true;
      ODR.gameState = 1;

    }
    return true;
  }

  forward( deltaTime ){
    this.timer += deltaTime;

    if( this.willRestart ){
      return this.forwardRestarting( deltaTime );
    } else {
      this.forwardGameOver( deltaTime );
      return this;
    }
  }

  forwardRestarting( deltaTime ){
    //TODO transition
    return null;
  }

  forwardGameOver( deltaTime ){
    deltaTime = deltaTime ? deltaTime : 1;
    let dist = this.timer/100;
      if (dist > 1) dist = 1;

    // OGG
    this.canvasCtx.save();
    this.canvasCtx.globalAlpha = dist;


    let bt = [6,4,8,5,9,7,11];
    let bw = [15,15,15,15,15,6,6];
    for( let b = 0, x = 0; b < 7; x+=bw[b], b++ ){
      let t = this.timer - bt[b]**2;
      let d = Math.max(0, 100 - t/10);
      let a = t%300 / 300;
      let y = Math.min( 50, 50- d *a+ d *a**2 );

      this.canvasCtx.drawImage(ODR.spriteGUI,
          x, 159, bw[b], 17,
          257 + x , Math.floor(y),
          bw[b], 17);

      if( !b ){
        t = this.timer - 8**2;
        d = Math.max(0, 100 - t/10);
        a = t%300 / 300;
        y = Math.min( 50, 50- d *a+ d *a**2 );

        this.canvasCtx.drawImage(ODR.spriteGUI,
            x, 150, 15, 9,
            257 + x , Math.floor(y) - 9,
            15, 9);
      }

    }

    let d = Math.max( 0, 100 - this.timer/10);
    let lineY = 90;
    if( d == 0 ){
      let newHigh = ODR.runRecord.hiscore < ODR.score ? ' a new high!':'';
      if( !newHigh ) this.playMusicIfNeeded();

      new Text( 0 ).drawString( ODR.gameMode.title, this.canvasCtx, 300, lineY );

      lineY+=20;
      new Text( 1 ).drawString('SCORE:',this.canvasCtx, 300, lineY );
      //FIXME leading space won't appear,
      let showScore = Math.min( 1, ( this.timer - 1000 )/1000 );
      let showHi = Math.min( 1, ( this.timer - 1500 )/1500 );
      let t = 2000;
      let showNewHi = Math.min( 1, ( this.timer - t )/t );

      new Text().drawString(' ' + Math.round( ODR.score*showScore )
        + (showNewHi == 1 ? newHigh :'' )
        , this.canvasCtx, 300, lineY );

      if( ODR.sequencer.dejavus ) return;


      if( showHi == 1 ){
        let diff = ODR.gameModeScore - ODR.runRecord.hiscore;

        lineY += 20;
        new Text( 1 ).drawString('HIGH SCORE:',this.canvasCtx, 300, lineY );
        new Text().drawString(' ' + ( showNewHi == 1 ? ODR.runRecord.hiscore + ~~(diff * (this.newHighTimer || 0)/1000) : ODR.runRecord.hiscore ), this.canvasCtx, 300, lineY );

        if( showNewHi == 1 ){
          if( newHigh ){
            t += 1000;
            if( !this.playedHiscore ){
              this.playedHiscore = true;
              /*
              if( IS_IOS ){
                Sound.inst.effects.SOUND_SCORE.play( ODR.config.SOUND_SYSTEM_VOLUME/10 );
              } else
              */
              for( let i = 0, j = 0 ; i <= 1 ; i+=0.1,j+=0.1){
                Sound.inst.effects.SOUND_SCORE.play( 0.5 * ( 1 - i )*ODR.config.SOUND_SYSTEM_VOLUME/10, j, -i );
                Sound.inst.effects.SOUND_SCORE.play( 0.5 * ( 1 - i )*ODR.config.SOUND_SYSTEM_VOLUME/10, j, i );
              }

              this.playMusicIfNeeded( 1 );
            }
            this.newHighTimer = Math.min( 1000 , ( this.newHighTimer || 0 ) + deltaTime );
          }

          lineY += 20;
          let showTang = Math.min( 1, ( this.timer - t )/t );
          if( showTang == 1 && N7e.user ){
            let gotO = ODR.runRecord.tangerines ? `${ODR.runRecord.tangerines} ` : "";
            t+= gotO ? 500 : 0;
            let showDaily = Math.min( 1, ( this.timer - t )/t );
            let gotT = ( showDaily == 1 ? `[${ODR.dailyTangerines}/${Math.floor( ODR.gameModeTotalScore/100)}]` : '');
            new Text( 1 ).drawString('#tangerine:',this.canvasCtx, 300, lineY );
            new Text().drawString(` ${gotO}${gotT}`, this.canvasCtx, 300, lineY );

            if( !this.playedGotO && gotO ){
              Sound.inst.effects.SOUND_POP.play( ODR.config.SOUND_SYSTEM_VOLUME/10 );
              this.playedGotO = true;
            }
          }

        }

      }
    }

    // Restart button.
        /*
    this.canvasCtx.drawImage(ODR.spriteGUI,
        0, 40,
        38, 34,
        281 + (1-dist) * 38/2,
        100 + (1-dist) * 28/2,
        38 * dist, 34 * dist);
    this.canvasCtx.drawImage(ODR.spriteGUI,
        7, 74,
        23, 19,
        281 + 7, 100 + 8,
        23, 19);
        */
    this.canvasCtx.restore();

  }
}

class Greeter extends Panel {
  constructor( canvas, notifier ){
    super( canvas );
    this.timer = 0;
    this.passthrough = true;
    this.willStart = false;
    this.willStartTimer = 200;

    this.notifier = notifier;
    this.introScriptTimer = 2000;
    this.introScript = this.introScript || [
      20000, `Hi${(N7e.user||{}).nickname ? '_'+N7e.user.nickname.split(' ').join('_') : ''}!\nPress_#slide/#jump_to_start!`,
      20000, (N7e.user||{}).nickname ? "Just play already!" : "What's your name? You can login by pressing #trophy button.",
      20000, "Didn't know you love the song that much!",
      20000, "Allow yourself to be a beginner. No one starts at the top.#<3",
      20000, "Man.City will win ⚽\nYou know.",
      20000, "You have no idea of the amount of HAPPINESS you brought into my life.",
      20000, 'I didnt say "I_love_you" to hear it back. I said it to make sure you knew.#<3',
      20000, 'Never give up on something you really want #<3',
      20000, 'You are my sunshine ☼#<3',
      20000, 'My love for you is a journey;\nStarting at forever,\nand ending at never.#<3',
      20000, 'Glory in life is not in never failing,but rising each time we fail.#<3',
      20000, 'Love this project?\nDonate_Thai_Redcross_#redcross!\nSee the bottom right for details.',
    ];
  }

  handleEvent( e ){
    if( this.willStart || !super.handleEvent( e )){
      return false;
    }

    if( e.type == OnDaRun.events.CONSOLEDOWN ){
      if( !this.GoGoGo && ODR.activeAction && 0 == ODR.activeAction.speed ){
        this.GoGoGo = true;
        ODR.activeAction.heldStart = ODR.activeAction.timer;
      }
      return true;
    }

    if( e.type == OnDaRun.events.CONSOLEUP
      && ODR.activeAction
      && 0 == ODR.activeAction.speed
      && 0 == this.buttonTime[ 0 ]
      && 0 == this.buttonTime[ 1 ]){

      this.willStart = true;
      ODR.gameState = 1;
    }
    return true;
  }

  forward( deltaTime ){
    this.timer += deltaTime;

    if( this.willStart ){
      return this.forwardStarting( deltaTime );
    } else {
      this.forwardGreeting( deltaTime );
      return this;
    }
  }

  forwardStarting( deltaTime ){
    this.willStartTimer -= deltaTime;
    //TODO transition
    if( this.willStartTimer < 0 ){
      return null;
    }

    this.canvasCtx.save();
    this.canvasCtx.globalAlpha = this.willStartTimer / 200;
    this.canvasCtx.translate( this.willStartTimer/5 - 40, 0 )
    this.drawTutorial();
    this.canvasCtx.restore();

    return this;
  }

  drawTutorial(){
    if( IS_MOBILE ) return;
    let yMap = [0,2,3,2,0];
    this.canvasCtx.drawImage(ODR.spriteGUI, 0, 96, 105, 54,
      Math.round(ODR.amandarine.minX + 20),
      Math.round(ODR.amandarine.minY + yMap[( this.timer>>>7 )%5 ] - 50 ), 105, 54 );
  }

  forwardGreeting( deltaTime ){

    this.drawTutorial();

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

      this.notifier.notify( text + ' #natB', dur );
      this.introScriptTimer = wait;
    }
  }
}

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

  set type(_) {
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

  set currentFrame(_) {}
  get currentFrame() {
    if (this.duration - this.timer < 300) {
      return 2 + Math.round(Math.max( 0, 2 - (this.duration - this.timer)/150 ));
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

}

class ConsoleButton {
  constructor( id, x, y, w, h ){
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
    //this.canvasCtx = this.canvas.getContext('2d',{alpha:false});
    this.canvasCtx = this.canvas.getContext('2d');

    this.canvas.addEventListener(OnDaRun.events.TOUCHSTART, this);
    this.canvas.addEventListener(OnDaRun.events.TOUCHEND, this);
    this.canvas.addEventListener(OnDaRun.events.MOUSEDOWN, this);
    this.canvas.addEventListener(OnDaRun.events.MOUSEUP, this);
    this.canvas.addEventListener(OnDaRun.events.MOUSEOUT, this);

  }

  forward( deltaTime ) {
    if (this.frame == -1) {
      this.canvas.style.visibility = 'visible';
    }

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
        this.frame * this.w, 0, this.w, this.h,
        0, 0, this.w, this.h);
    }
  }

  draw() {
    console.trace();
  }

  handleEvent( e ){

    switch( e.type ){
      case OnDaRun.events.KEYDOWN:
      case OnDaRun.events.MOUSEDOWN:
      case OnDaRun.events.TOUCHSTART: {
        e.preventDefault();
        this.timer = 0;
        this.dir = 1;
        this.pressure = 1;
        this.handlePressed(e);
      } break;
      case OnDaRun.events.TOUCHCANCEL:
      break;
      case OnDaRun.events.TOUCHMOVE:
      break;
      case OnDaRun.events.TOUCHEND:
      case OnDaRun.events.MOUSEOUT:
      case OnDaRun.events.KEYUP:
      case OnDaRun.events.MOUSEUP:{
        if( 0 == this.pressure ) break;
        e.preventDefault();
        this.timer = 0;
        this.dir = -1;
        this.handleReleased(e);
      } break;
      default:
        console.log('event', this,e);
    }

  }

  handlePressed( e ){
    let consoleEvent = new CustomEvent( OnDaRun.events.CONSOLEDOWN, {
      bubbles: true,
      composed: true,
      detail: {
        time: ODR.time,
        consoleButton: this,
      },
    });
    this.canvas.dispatchEvent( consoleEvent );
  }

  handleReleased( e ){
    let consoleEvent = new CustomEvent( OnDaRun.events.CONSOLEUP, {
      bubbles: true,
      composed: true,
      detail: {
        time: ODR.time,
        consoleButton: this,
        timeOut: false,
      },
    });
    this.canvas.dispatchEvent( consoleEvent );
  }

}

class ConsoleLeftButton extends ConsoleButton {
  constructor( x, y, w, h ){ super('console-left', x, y, w, h );}
}

class ConsoleRightButton extends ConsoleButton {
  constructor( x, y, w, h ){ super('console-right', x, y, w, h );}
}

class ConsoleSystemButton extends ConsoleButton {
  constructor( id, x, y, w, h ){
    super( id, x, y, w, h );
    this.pressedTimeOutDuration = 1500;
    this.pressedTimeOut = 0;
  }

  handlePressed( e ){
    if( this.pressedTimeOut ){
      console.log('Reenter?');
      return;
    }

    this.pressedTimeOut = setTimeout(() => {

      let consoleEvent = new CustomEvent( OnDaRun.events.CONSOLEUP, {
        bubbles: true,
        composed: true,
        detail: {
          time: ODR.time,
          consoleButton: this,
          timeOut: true,
        },
      });
      this.canvas.dispatchEvent( consoleEvent );

      this.pressedTimeOut = 0;

    }, this.pressedTimeOutDuration );

    super.handlePressed( e );
  }

  handleReleased( e ){
    if( this.pressedTimeOut ){
      clearTimeout( this.pressedTimeOut );
      this.pressedTimeOut = 0;
      super.handleReleased( e );
    }
    //Discard the event if pressedTimeOut is 0.
  }
}

class ConsoleAButton extends ConsoleSystemButton {
  constructor( x, y, w, h ){ super('console-a', x, y, w, h );}
}

class ConsoleBButton extends ConsoleSystemButton {
  constructor(x, y, w, h) { super('console-b', x, y, w, h); }
}

class ConsoleCButton extends ConsoleSystemButton {
  constructor(x, y, w, h) { super('console-c', x, y, w, h); }
}

class ConsoleDButton extends ConsoleSystemButton {
  constructor( x, y, w, h ){ super('console-d', x, y, w, h );}
}

class ConsoleResetButton extends ConsoleButton {
  constructor(x, y, w, h) { super('console-reset', x, y, w, h); }
}

class ConsoleN7EButton extends ConsoleButton {
  constructor(x, y, w, h) { super('console-n7e', x, y, w, h); }
}

/**
 * +---------+   +-------+
 * |  Sound  |--♦| Songs |
 * +---------+   +-------+
 *      |            |
 *      ♦            ♦
 * +---------+   +-------+
 * | Effects |--♦| Audio |
 * +---------+   +-------+
 */

/**
 * Audio class act like a generator, each play() streams and returns
 * a collection of audio nodes that can be used to control the on-going audio.
 */
class Audio {
  constructor( soundBuffer, title ){
    this.soundBuffer = soundBuffer;
    this.title = title;
    this.controller = null;
  }

  play( volume, delay = 0, pan = null, loop = false ){

    let actx = Sound.inst.audioContext;
    let star
    if( !actx ){
      return;
    }


    let duration = Math.ceil( this.soundBuffer.duration + delay);
    let dest = actx.destination;
    let sourceNode = actx.createBufferSource();
    let controller = { startTime: actx.currentTime + delay, sourceNode: sourceNode };

    sourceNode.buffer = this.soundBuffer;


    // gain(dest) -> destiation
    if( volume !== undefined ){
      let gainNode = actx.createGain();
      controller.gainNode = gainNode;
      //gainNode.gain.value = volume;
      gainNode.gain.setValueAtTime( Math.max( volume, 0.000001 ), controller.startTime );
      gainNode.connect( dest );
      dest = gainNode;
    }

    // pan(dest) -> gain -> destiation
    if( pan !== null ){
      /*
      let pannerNode = actx.createStereoPanner();
      pannerNode.pan.value = pan;
      pannerNode.pan.setValueAtTime( Math.max( pan, 0.000001 ), controller.startTime );
      pannerNode.connect(dest);
      */

      let pannerNode = actx.createPanner();
      pannerNode.panningModel = 'equalpower';
      pannerNode.setPosition(pan, 0, 1 - Math.abs(pan));
      pannerNode.connect(dest);

      controller.pannerNode = pannerNode;
      dest = pannerNode;
    }

    // source -> pan -> gain -> destiation
    sourceNode.connect( dest );
    if( loop ){
      sourceNode.loop = loop;
    }
    sourceNode.start( controller.startTime );

    return controller;
  }
}

/**
 * Song wraps an Audio and used to control the progression of the stream.
 */
class Song {
  constructor( name, lyrics, autoload = true, decode = true, audioReadyCallback ){
    this.name = name;
    this.lyrics = lyrics;
    this.audio = undefined;
    this.controller = null;
    this.audioReadyCallback = audioReadyCallback;

    // a temporary blob for storing raw downloaded data if the audio context is not yet created.
    this.source = null;

    this.delayStart = 0; // For resuming calculation.
    this.startTime = Infinity;
    this.trueStartTime = 0;
    this.loadingProgress = null;
    this._volume = ODR.config.SOUND_MUSIC_VOLUME/10;

    if( autoload ){
      this.load( decode );
    }
  }

  play( delay, volume ){
    this._volume = volume;
    this.delayStart = delay;
    this.startTime = Sound.inst.audioContext.currentTime;
    if( this.audio ){
      this.controller = this.audio.play( volume, delay );
    } else if( this.source ){
      this._decodeAudioData( this.source );
      this.source = null;
    } else if( this.loadingProgress !== null ){
      console.log(this.name,'Loading');
    } else {
      console.log('FIXME');
    }
  }

  stop( fadingDuration = 0 ){
    if( this.controller ){
      let actx = Sound.inst.audioContext;
      this.controller.sourceNode.stop( actx.currentTime + fadingDuration );
      this.controller.gainNode.gain.exponentialRampToValueAtTime( 0.00001, actx.currentTime +fadingDuration );
      //this.controller.gainNode.gain.linearRampToValueAtTime(0, Sound.inst.audioContext.currentTime+3);
    }
    this.startTime = Infinity;
  }

  set volume( newVolume ){
    this._volume = newVolume;
    if( this.controller ){
      this.controller.gainNode.gain.exponentialRampToValueAtTime( Math.max( 0.00001, newVolume ), Sound.inst.audioContext.currentTime+3);
    }
  }

  //TODO
  /*
  pause(){

  }
  resume(){

  }
  */

  get playing(){
    return this.startTime != Infinity ? true : false;
  }


/** Class Song
 * Decode and play the song if startTime has been set.
 * @param {ArrayBuffer} src - loaded from XMLHttpRequest.
 */
  _decodeAudioData( src ){
    if( this.audio === undefined ){

      Sound.inst.contextReady().then( actx => {

        actx.decodeAudioData( src, buffer => {
          //console.log(this.name+': Song was successfully decoded.');
          this.audio = new Audio( buffer, this.name );
          if( this.audioReadyCallback ){
            this.audioReadyCallback( this.audio );
          }
          if( Infinity != this.startTime ){
            //auto-adjust the given delay with the loading time.
            let adjustedDelay = this.delayStart + this.startTime - Sound.inst.audioContext.currentTime;
            this.audio.play( this._volume, Math.max( 0, adjustedDelay ));
          }

          /* For testing
          if( this.name == "offline-play-music" ){
            console.log(name,'loaded 3')
            let con = this.audio.play( 1 );
            con.gainNode.gain.exponentialRampToValueAtTime( 0.00001, actx.currentTime+10 );
          }
          */
        });

      });

    }
  }

  load( decode ){
    if( this.loadingProgress != null ){
      return;
    }

    this.loadingProgress = 0;

    //console.log('Downloading the requested song...',this.name);
    // Start loading the song.
    // TODO, option to load on playing.
    let resourceTemplate = document.getElementById( ODR.config.RESOURCE_TEMPLATE_ID ).content;
    let request = new XMLHttpRequest();
    request.open('GET', resourceTemplate.getElementById( this.name ).src, true);
    request.responseType = 'arraybuffer';
    request.onload = () => {

      this.loadingProgress = 1;

      if( decode ){
        //console.log('Decoding requested data...', this.name );
        this._decodeAudioData( request.response );
      } else {
        // Without an audio context, just keep the blob for later decoding.
        this.source = request.response;
      }

    }
    request.onprogress = (e) => {
      this.loadingProgress = e.loaded/e.total;
    }
    request.send();

  }

}

class Sound {
  //Make sure not to call this before a gesture unlocking (eg. touchend)
  static get inst(){
    return this.instance || new this();
  }

  constructor( canvas ){
    if( Sound.instnce )
      return Sound.instance;
    Sound.instance = this;

    //console.log('Creating AudioContext');
    this.audioContext = new ( window.AudioContext || window.webkitAudioContext )();
    //console.log( 'AudioContext:',this.audioContext.state );

    this.musicVolume = ODR.config.SOUND_MUSIC_VOLUME/10;
    this.songs = {};
    this.currentSong = null;
    this.effectsLoadingProgress = 0;
  }

/** Class Sound
 * Wait until an event can resume the AudioContext state.
 * This must be called for the first time using the AudioContext.
 * @return {Promise} getting the AudioContext from the resolve.
 */
  contextReady(){
    return new Promise(( resolve, reject ) => {
      if( this.audioContext.state === 'suspended'){
        let resume = (e) => {

          if( this.audioContext.state === 'suspended' ){
            this.audioContext.resume().then(
              () => resolve( this.audioContext )
              , reason  => reject( reason ));
          } else {
            resolve( this.audioContext );
          }
        }

        [ OnDaRun.events.CONSOLEUP, OnDaRun.events.CONSOLEDOWN ].forEach( et => document.body.addEventListener( et, resume, { passive: true, once: true }));

      } else {
        resolve( this.audioContext );
      };
    });
  }


/** Class Sound
 * Load sound effects from the HTML.
 */
  loadSoundResources(){
    if( IS_SOUND_DISABLED ){
      this.effects = {};
      this.effectsLoadingProgress = 1;
      return;
    }

    if( !this.effects ){
      this.effects = {};

      //console.log("Decoding sound effects...");
      Sound.inst.contextReady().then( actx => {

        var resourceTemplate = document.getElementById( ODR.config.RESOURCE_TEMPLATE_ID ).content;

        let counter = 0;
        let entries = Object.entries( Sound.effectIds );
        let entriesLen = entries.length;

        entries.forEach(([ sound, id ]) => {
          var soundSrc =
            resourceTemplate.getElementById( id ).src;
          soundSrc = soundSrc.substr(soundSrc.indexOf(',') + 1);
          let len = (soundSrc.length / 4) * 3;
          let str = atob(soundSrc);
          let arrayBuffer = new ArrayBuffer(len);
          let bytes = new Uint8Array(arrayBuffer);

          for (let i = 0; i < len; i++) {
            bytes[i] = str.charCodeAt(i);
          }

          // Async, so no guarantee of order in array.
          this.audioContext.decodeAudioData( bytes.buffer , audioData => {

            this.effects[ sound ] = new Audio( audioData, sound );
            counter++;
            this.effectsLoadingProgress = counter/entriesLen;

          });

        });// entries.forEach()
      });// contextReady()

    }
  }

  updateLyricsIfNeeded( callback ){
    if( IS_SOUND_DISABLED ) return;
    if( this.currentSong
        && this.currentSong.lyrics
        && this.currentSong.lyrics.length
        && this.currentSong.controller ){
      let time = this.audioContext.currentTime- this.currentSong.controller.startTime;
      while( this.currentSong.lyrics.length && time >= this.currentSong.lyrics[0].info ){
        callback( this.currentSong.lyrics.shift());
      }
    }
  }

  set musicVolume( vol ) {
    this._musicVolume = vol;
    if( IS_SOUND_DISABLED ) return;
    if( this.currentSong ) {
      this.currentSong.volume = vol;
    }
  }

  get currentSong(){
    return this._currentSong;
  }

  set currentSong( song ){
    this.setCurrentSong( song );
  }

  setCurrentSong( song, delayStart ){
    if( this._currentSong ){
      this._currentSong.stop( 3 );
    }
    this._currentSong = song;
    if( song )
      song.play( delayStart, this._musicVolume );
  }

  get musicLoadingProgress(){
    return Object.entries( this.songs ).reduce(( acc, nameSong, index, array) => acc + nameSong[1].loadingProgress /array.length, 0);
  }

  loadMusic( name, autoplay, delayStart = 0, lyrics = null ){
    if( IS_SOUND_DISABLED ) return;
    let song = this.songs[ name ] || ( this.songs[ name ] = new Song( name, lyrics, true ));
    song.lyrics = lyrics;

    if( this.currentSong == song ) return;

    /* Turn-off the others */
    if( autoplay ){
      this.setCurrentSong( song, delayStart );
    }

  }

  loadEffect( name ){
    if( IS_SOUND_DISABLED ) return;

    return new Promise(( resolve, reject ) => {

      new Song( name, null, true, true, audio => {
        resolve( audio );
      });

    });
  }

}

Sound.effectIds = {
  BUTTON_PRESS: 'offline-sound-press',
  SOUND_HIT: 'offline-sound-hit',
  SOUND_ERROR: 'offline-sound-error',
  SOUND_SCORE: 'offline-sound-reached',
  SOUND_SLIDE: 'offline-sound-slide',
  SOUND_DROP: 'offline-sound-drop',
  SOUND_JUMP: 'offline-sound-piskup',
  SOUND_CRASH: 'offline-sound-crash',
  SOUND_OGGG: 'offline-sound-oggg',
  SOUND_GOGOGO: 'offline-sound-gogogo',
  SOUND_QUACK: 'offline-sound-quack',
  SOUND_BICYCLE: 'offline-sound-bicycle',
  SOUND_BLIP: 'offline-sound-blip',
  SOUND_POP: 'offline-sound-pop',
};


class Layer {
  constructor(){

    this.canvas = document.createElement('canvas');
    this.canvas.width = DEFAULT_WIDTH;
    this.canvas.height = DEFAULT_HEIGHT;
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

class Sky extends Layer {
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
        let gradient = this.canvasCtx.createLinearGradient( 0, 0, 0, DEFAULT_HEIGHT );
        this.toRGB = (( 1<<24 ) + ( gr[ 3 ]<<16 ) + ( gr[ 4 ]<<8 ) + gr[ 5 ]).toString( 16 ).slice( 1 );
        gradient.addColorStop( 0, '#' + this.fromRGB );
        gradient.addColorStop( 1, '#' + this.toRGB );
        this.canvasCtx.fillStyle = gradient;
      }

      this.canvasCtx.fillRect( 0, 0, DEFAULT_WIDTH, DEFAULT_HEIGHT );

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
      visibility: hidden;
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
      /*background-image: url(assets/console/console-left.png);*/
    }

    #console-right {
      left: 596px;
      top: 495px;
      width: 100px;
      height: 100px;
      /*background-image: url(assets/console/console-right.png);*/
    }

    #console-a {
      left: 233px;
      top: 495px;
      width: 66px;
      height: 50px;
      /*background-image: url(assets/console/console-a.png);*/
    }

    #console-b {
      left: 233px;
      top: 545px;
      width: 66px;
      height: 50px;
      /*background-image: url(assets/console/console-b.png);*/
    }

    #console-c {
      left: 501px;
      top: 495px;
      width: 66px;
      height: 50px;
      /*background-image: url(assets/console/console-c.png);*/
    }

    #console-d {
      left: 501px;
      top: 545px;
      width: 66px;
      height: 50px;
      /*background-image: url(assets/console/console-d.png);*/
    }

    #console-n7e {
      left: 357px;
      top: 628px;
      width: 18px;
      height: 18px;
      /*background-image: url(assets/console/console-n7e.png);*/
    }

    #console-reset {
      left: 424px;
      top: 628px;
      width: 18px;
      height: 18px;
      /*background-image: url(assets/console/console-reset.png);*/
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

  render(){
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

  constructor(){
    super();

    //FIXME just replace
    this.config = JSON.parse(JSON.stringify(OnDaRun.Configurations));

    //ODR = this;
    window['ODR'] = this;
    window['N7e'] = N7e;
    window['D4a'] = Sound.inst;
    //this.scene = null;

    this.canvas = null;
    this.canvasCtx = null;

    this.sky = null;
    this.scenery = null;
    this.sequencer = null;
    this.amandarine = null;

    this.time = 0;
    this.totalTangerines = 0;
    this.dailyTangerines = 0;
    this.maxSpeed = null;

    this.gameModeList = [];
    this.gameMode = null;

    this.achievements = [];
    this.msPerFrame = 1000/FPS;

    this.images = {};

    this.consoleButtonForKeyboardCodes = {};

    this.gameState = 0;

    this._passthroughPanel = new NoPanel();
  }

  get maxSpeed(){
    return this._maxSpeed || { value: 0, time: 0 };
  }

  set maxSpeed( newMaxSpeed ){
    if( !newMaxSpeed ){
      this._maxSpeed = { value: 0, time: 0 };
    } else if( newMaxSpeed.value > this.maxSpeed.value
      || newMaxSpeed.time > this.maxSpeed.time
         && newMaxSpeed.value == this.maxSpeed.value ){

      this._maxSpeed = newMaxSpeed;
      if( N7e.user ){
        N7e.user.odrRef.child('maxSpeed')
        .transaction(( maxSpeed = newMaxSpeed ) => {

          if( newMaxSpeed.value > maxSpeed.value ){
            maxSpeed = newMaxSpeed;
          } else if( maxSpeed.value == newMaxSpeed.value ){
            maxSpeed.time = Math.max( newMaxSpeed.time, maxSpeed.time ) || 0;
          }

          this._maxSpeed = maxSpeed;

          return maxSpeed;
        });
      }

    }
  }

  get dailyTangerines(){
    return this._dailyTangerines;
  }

  set dailyTangerines( newDaily ){
    this._dailyTangerines = newDaily;
    if( this.scoreboard )
      this.scoreboard.minTangerines = newDaily;
  }

  get gameState(){
    return this._gameState;
  }

  set gameState( newState ){
    switch( this._gameState ){
      case undefined:
        if( 0 === newState ){
          this._gameState = 0;
          this.stateResetProperties();
        }
        break;
      case 0: /* IDLE */
        if( 1 === newState ){
          this._gameState = 1;
          this.statePlay();
        } else if( 0 === newState ){
          this.stateResetProperties();
        }
        break;
      case 1: /* RUN */
        if( 2 === newState ){
          this._gameState = 2;
          this.stateCrash();
        } else if( 0 === newState ){
          this._gameState = 0;
          this.stateResetProperties();
        }
        break;
      case 2: /* CRASH */
        if( 0 === newState ){
          this._gameState = 0;
          this.stateResetProperties();
        } else if( 1 === newState ){
          this._gameState = 1;
          if( this.config.GAME_MODE_REPLAY ){
            let sequencer = ODR.sequencer;

            // Existing dejavus means the player restarted after
            // choosing to replay, so replay again.
            if( sequencer.dejavus ){
              let totalRecall = sequencer.totalRecall;
              let dejavus = totalRecall.slice();

              this.stateResetProperties();
              // TODO, passing a flag to prevent resetting sequencer
              this.stateRestart();

              sequencer.totalRecall = totalRecall;
              sequencer.dejavus = dejavus;

              //Just getting rid of the default clearZone
              //although it should be harmless.
              ODR.sequencer.entities = [];
            } else {
              this.stateResetProperties();
              this.stateRestart();
            }
          } else {
            this.stateResetProperties();
            this.stateRestart();
          }
        }
        break;
    }

    //console.log([ "IDLE", "PLAY", "CRASH" ][ newState ]);

    if( newState == 0 ){

      this._HACC = 0.5*this.config.ACCELERATION *FPS/1000;
      this._HSPD = this.config.SPEED *FPS/1000;

    } else if( newState == 1 ){
      ODR.runRecord = {
        tangerines: 0,
        hiscore: this.gameModeScore,
      };
      if( this.config.GAME_MODE_REPLAY && ODR.sequencer.dejavus ){
        ODR.scoreboard.replay = true;
      }
      ODR.scoreboard.existence = 1;
    }
  }

  stateResetProperties(){
    this.runTime = 0;
    // Setting runTime will auto-set the currentSpeed
    // so a custom speed must be set after runtime.
    this.currentSpeed = 0;
    //this.distance = 0;

    this.shouldDropTangerines = false;
    this.tangerineTimer = 0;

    this.inverted = false;
    this.invertTimer = 0;

    this.actions = [];
    this.consoleButtonActionMap = new Map();
    this.activeAction = null;
    this.playLyrics = false;
  }

  statePlay(){
    Sound.inst.loadMusic('offline-play-music', this.config.PLAY_MUSIC, 1 );
    this.sky.setShade( Sky.config.DAY, 3000 );
    //this.scenery.addTREX();
    this.scoreboard.reset();

    this.currentSpeed = this.config.SPEED;
    this.activeAction.speed = ODR.config.SPEED;
    this.activeAction.priority = 1;

    this.checkShouldDropTangerines();

    this.showGameModeInfo();

    this.notifier.notify("go go go!!", 2000 );
    Sound.inst.effects.SOUND_GOGOGO.play( 0.8 * this.config.SOUND_EFFECTS_VOLUME/10, 0, -0.2);
  }

  stateCrash(){
    this.scoreboard.existence = 0;
    if( !this.sequencer.dejavus )
      this.updateScore();

    this.panel = null;
    N7e.vibrate(200);
    Sound.inst.currentSong = null;
    Sound.inst.effects.SOUND_OGGG.play( ODR.config.SOUND_EFFECTS_VOLUME/10, 0, -0.2 );
    this.sky.setShade( Sky.config.SUNSET, 3000 );

  }

  stateRestart(){
    this.scenery.reset();
    this.sequencer.reset();
    this.scoreboard.reset();
    if( N7e.user ){
      this.scoreboard.minTangerines = this.dailyTangerines;
      this.scoreboard.maxTangerines = Math.max( 1, ~~(this.gameModeTotalScore/100));
    }

    this.sky.setShade( Sky.config.DAY,  3000 );
    //this.scenery.addTREX();
    this.invert( true );

    Sound.inst.effects.SOUND_SCORE.play( ODR.config.SOUND_EFFECTS_VOLUME/10 );
    Sound.inst.loadMusic('offline-play-music', this.config.PLAY_MUSIC, 0.5 );
    this.checkShouldDropTangerines();
    this.showGameModeInfo();

    this.amandarine.reset();

    let startingSlide = new SlideAction( this.time - ODR.config.MAX_ACTION_PRESS, 7.2);
    startingSlide.priority = 1;
    startingSlide.end = this.time;
    startingSlide.maxPressDuration = 1500;

    this.queueAction( startingSlide );
    let defaultAction = new DefaultAction( this.config.SPEED );
    defaultAction.priority = 1;
    this.queueAction( defaultAction );
  }

/** Class OnDarun
 * lithtml first update.
 * - Prepare the console graphics.
 * - Load image sprites.
 * @param {Map} changedProperties
 */
  firstUpdated( changedProperties ){

    console.log(`Amandarine Frontier : OnDaRun Version ${VERSION}
Made for Natherine BNK48 (Dusita Kitisarakulchai) with ❤❤❤❤.

░░░░░░░░░░ The goal of the project
░░░░██░░░░ is to support The
░░██████░░ Thai Red Cross Society.
░░░░██░░░░ Please help by making
░░░░░░░░░░ a donation to them.
https://www.redcross.or.th/donate/`);

    document.querySelector('title').textContent += ` ${VERSION}`;
    document.getElementById('version-banner').textContent = `Version ${VERSION}`;
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

    this.consoleButtonForKeyboardCodes['Space'] = this.consoleButtons.CONSOLE_RIGHT;

    this.consoleButtonForKeyboardCodes['NumpadEnter'] = this.consoleButtons.CONSOLE_RIGHT;
    this.consoleButtonForKeyboardCodes['ArrowRight'] = this.consoleButtons.CONSOLE_RIGHT;
    this.consoleButtonForKeyboardCodes['Backslash'] = this.consoleButtons.CONSOLE_RIGHT;
    this.consoleButtonForKeyboardCodes['Backspace'] = this.consoleButtons.CONSOLE_RIGHT;
    this.consoleButtonForKeyboardCodes['NumpadAdd'] = this.consoleButtons.CONSOLE_RIGHT;
    this.consoleButtonForKeyboardCodes['NumpadSubstract'] = this.consoleButtons.CONSOLE_RIGHT;
    //this.consoleButtonForKeyboardCodes['ShiftRight'] = this.consoleButtons.CONSOLE_RIGHT;

    this.consoleButtonForKeyboardCodes['Numpad0'] = this.consoleButtons.CONSOLE_LEFT;
    this.consoleButtonForKeyboardCodes['ArrowLeft'] = this.consoleButtons.CONSOLE_LEFT;
    this.consoleButtonForKeyboardCodes['Backquote'] = this.consoleButtons.CONSOLE_LEFT;
    this.consoleButtonForKeyboardCodes['Tab'] = this.consoleButtons.CONSOLE_LEFT;
    //this.consoleButtonForKeyboardCodes['ShiftLeft'] = this.consoleButtons.CONSOLE_LEFT;

    this.consoleButtonForKeyboardCodes['KeyM'] = this.consoleButtons.CONSOLE_A;
    this.consoleButtonForKeyboardCodes['Digit5'] = this.consoleButtons.CONSOLE_B;

    /* Load and set console image */
    this.consoleImage = new Image();
    this.consoleImage.src = 'assets/console/console.png';
    this.style.backgroundImage = 'url('+this.consoleImage.src+')';

    let getRest = (...theArgs) => {
      return theArgs;
    };

    this.consoleImageArguments = getRest( this.consoleImage, 100, 237, 600, 200, 0, 0, 600, 200 );

    /* HACK prevent initial transition */
    this.consoleImage.addEventListener('load', (e) => {
      this.style.transition = 'opacity 1s';
      this.style.opacity = 1;
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
    A8e.animFrames.CEASING.sprite = addSprite('nat/crash');

    let bicyclesSprite = addSprite('biking');
    let ducksSprite = addSprite('ducks');

    SmallCactus.sprite = this.spriteScene;
    LargeCactus.sprite = this.spriteScene;
    Liver.sprite = ducksSprite;
    Rubber.sprite = ducksSprite;
    Rotata.sprite = bicyclesSprite;
    Velota.sprite = bicyclesSprite;
    Tangerine.sprite = this.spriteGUI;

    /* Make sure all sprites are ready then init() */
    let completion = 0;
    let checkReady = (sprite) => {
      completion++;
      if (completion < loadingList.length)
        return;

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

/** Class OnDarun
 * Initialize the game parameters & game-play graphics.
 */
  init(){
    Object.values( OnDaRun.gameModes ).forEach( mode => {
      this.gameModeList.push( mode );
      mode.distance = 0;
    });
    this.gameMode = OnDaRun.gameModes[ this.config.GAME_MODE ];

    this.canvas = this.shadowRoot.getElementById('console-screen');
    this.canvas.width = DEFAULT_WIDTH;
    this.canvas.height = DEFAULT_HEIGHT;
    this.canvasCtx = this.canvas.getContext('2d');
    this.canvas.style.visibility = 'visible';

    //this.generateShadowCache();
    Mountain.generateMountainImages();

    this.config.PLAY_MUSIC = true;

    Sound.inst.loadMusic('offline-intro-music', false );
    Sound.inst.loadMusic('offline-play-music', false );
    //Sound.inst.loadMusic('amandarine-frontier', false );
    Sound.inst.loadSoundResources();

    this.sky = new Sky( this.canvas );
    this.sky.setShade( Sky.config.START, 0 );
    this.scenery = new Scenery( this.canvas );
    this.sequencer = new Sequencer( this.canvas );


    this.panel = new TitlePanel( this.canvas );

    this.amandarine = new A8e( this.canvas );

    this.scoreboard = new Scoreboard( this.canvas );

    this.achievementPhrases = [
      "Keep running!",
      "There you go!",
      "Don't give up!",
      "Keep it up!",
      "Looking good!",
      "Good Job!",
      "I'm so proud of you!",
      "Great Job!",
      "Believe in yourself!",
      "Stay Strong!",
      "Just don't die!",
      "Do the impossible!",
    ].map( p => p+ '#natB');

    let skipping;
    this.achievements = [
      200, this.achievementPhrases[ skipping = N7e.randomInt( 0, 2 )],
      400, this.achievementPhrases[ skipping += N7e.randomInt( 1, 3 )],
      800, this.achievementPhrases[ skipping += N7e.randomInt( 1, 3 )],
      1600, this.achievementPhrases[ skipping += N7e.randomInt( 1, 3 )],
    ];



    this.notifier = new Notifier( this.canvas );
    this.cc = new Terminal( this.canvas, 300, 180 ); //Closed Caption

    this.actionIndex = 0;

    /* Set default custom mode to setting 0 */
    this.config.GRAPHICS_MODE_SETTINGS[ 3 ] = JSON.parse( JSON.stringify( OnDaRun.Configurations.GRAPHICS_MODE_SETTINGS[ 0 ]));
    this.setGraphicsMode( 3, false );
    this.scenery.horizonLine.generateGroundCache( ODR.config.GRAPHICS_GROUND_TYPE );

    this.style.opacity = 1;

    this.startListening();
    this.signIn();

    setTimeout(() => this.scheduleNextRepaint(), 1000 );
  }

  /* TODO
  generateShadowCache() {
    // Generate A8e shadows.

    let width = 0;

    //Amandarine shadow
    Object.entries(A8e.animFrames).forEach(([name,act]) => {
      let base = 0;
      ('SLIDING' == name
        ? A8e.collisionBoxes.SLIDING
        : A8e.collisionBoxes.RUNNING).forEach(box => base = Math.max(base,box.maxY()));

      act.shadow = document.createElement('canvas');
      act.shadow.width = act.sprite.width;
      act.shadow.height = 40; // Use 5px offset
      let shadowCtx = act.shadow.getContext('2d');
      shadowCtx.filter = `brightness(0)`;
      for( let i = 0; i < 40; i++ ) {
        //shadowCtx.filter = `blur(8px) brightness(0) opacity(${40*(20-i)/20}%)`;
        if( base - i < 0 ) break;
        shadowCtx.drawImage( act.sprite,
          0, base-i, act.shadow.width, 1,
          0, i/3, act.shadow.width, 1 );
      }

    });

    // Entity shadows.
    XObstacle.typeList.forEach(type => {
      let base = 0;
      type.collisionBoxes.forEach(box => base = Math.max( base, box.maxY()));

      let def = OnDaRun.spriteDefinition[type.name];
      let frames = new Set( type.frames ? type.frames : [def.x]);

      type.shadow = document.createElement('canvas');
      type.shadow.width = type.width * frames.size;
      type.shadow.height = type.height;
      let shadowCtx = type.shadow.getContext('2d');

      frames.forEach(frameX => {
        let dx = frameX - def.x;
        for( let i = 0; i < type.shadow.height; i++ ) {
          if( base - i < 0 ) break;
          shadowCtx.filter = `brightness(0)`;
          shadowCtx.drawImage(type.sprite,
            def.x + dx, base - i, type.width, 1,
            dx, i/3, type.width, 1 );

        }

      });

    });

  }
  */

  get runTime(){
    return this._runTime;
  }

  set runTime( rt ){
    this._runTime = rt;
    this.currentSpeed = this.config.SPEED + rt * this.config.ACCELERATION;
    if( this.currentSpeed > this.config.MAX_SPEED )
      this.currentSpeed = this.config.MAX_SPEED;
  }

/** Class OnDarun
 * Amandarine walks into the scene.
 */
  start(){
    Sound.inst.loadMusic('offline-intro-music', this.config.PLAY_MUSIC );

    let defaultAction = new DefaultAction(1);
    defaultAction.setX = -100;
    this.queueAction(defaultAction);

    Sound.inst.effects.SOUND_SCORE.play( this.config.SOUND_SYSTEM_VOLUME/10 );

    //FIXME should wait for a Promise and call end()?
    if( N7e.signing.progress ){
      return new Wait( this.canvas, null, "signing in..please wait",
        waiter =>  N7e.signing.progress ? waiter : null );
    }

    return new Greeter( this.canvas, this.notifier );
  }

  signIn(){
    N7e.userSignedIn = false;
    N7e.signing.progress = true;

    firebase.auth().onAuthStateChanged(user => {
      if (user) {
        let authUser = new User();
        N7e.user = authUser;

        authUser.auth = user;
        authUser.uid = user.uid;
        authUser.image = new Image();
        authUser.image.addEventListener('load', (e) => {
          N7e.userSigningInfo('photo', true );
        });

        authUser.image.addEventListener('error', (e) => {
          /* Switch to default image if profile photo is 404 */
          authUser.image.src = '/images/manifest/icon-96x96.png';
        });
        authUser.image.src = user.photoURL;

        authUser.ref = firebase.database().ref('users/'+ user.uid);
        authUser.odrRef = authUser.ref.child('odr');

        authUser.ref.child('nickname').once('value', snapshot => {
          authUser.nickname = snapshot.val();

          if (!authUser.nickname) {
            let nname = ["Add", "Bat", "Cat", "Dad", "Hat", "Has", "Jaz", "Kat", "Lad", "Mat", "Mad", "Mas", "Nat", "Pat", "Rat", "Ras", "Sat", "Saz", "Sad", "Tat", "Vat", "Wad", "Yas", "Zat"];
            let hname = ["ber", "cur", "der", "eer", "fur", "ger", "her", "hur", "jer", "kur", "kir", "ler", "mer", "mur", "ner", "ser", "tur", "ver", "wer", "yer", "zur", "bar", "car", "dar", "ear", "far", "gal", "har", "hor", "jul", "kel", "ker", "lur", "mir", "mor", "nir", "sur", "tar","ter", "val", "war", "you", "zir"];
            let rname = ["been", "cine", "dine", "dean", "deen", "fine", "gene", "hine", "jene", "kine", "line", "mean", "nene", "pine", "rine", "sene", "tine", "wine", "zine"];
            authUser.nickname = nname[N7e.randomInt(0,nname.length-1)] + hname[N7e.randomInt(0,hname.length-1)] + rname[N7e.randomInt(0,rname.length-1)];
            authUser.ref.child('nickname').set( authUser.nickname );
            this.notifier.notify( `Welcome, ${authUser.nickname}.\n[autogenerated_name]\nYou dont\'t like it, do you?\nchange in #trophy`, 20000 );
          } else if( ODR.panel.waitingForButtonUp ){
            //Hack FIXME use or make a notification system
            ODR.panel.buttonBlockStopTime = ODR.panel.timer + 1500;
          }


          N7e.userSigningInfo('nickname', true );
        });

        authUser.ref.child('items/tangerines/count').on('value', snapshot => {
          this.totalTangerines = snapshot.val();
          N7e.userSigningInfo('tangerines', true );
        });

        //FIXME why on() scores ?
        authUser.odrRef.on('value', snapshot => {
          let odr = snapshot.val();
          if( odr ){
            if( odr.items ){
              if( odr.items.tangerines ){
                this.dailyTangerines = odr.items.tangerines.dayCount || 0;
              }
            }
          }
        });

        // Set database scores if the currently played ones are higher.
        authUser.odrRef.child('scores').transaction( distances => {
          this.gameModeList.forEach( mode => {
            if( mode.distance && mode.distance > (distances[ mode.key ] || 0)){
              distances = distances || {};
              distances[ mode.key ] = mode.distance;
            }
          });

          return distances;
        });

        // Updating the current scores.
        authUser.odrRef.child('scores').on('value', snapshot => {
          let distances = snapshot.val();

          if( distances ){
            this.gameModeList.forEach( mode => {
              let serverDistance = distances[ mode.key ];
              if( serverDistance > mode.distance ){
                mode.distance = serverDistance;
              }

              let a = mode.ACCELERATION * FPS/1000 * 0.5;
              let b = this.config.SPEED * FPS/1000;
              let s = distances[ mode.key ] || 0;
              let t = ( Math.sqrt( b**2 - 4*a*-s )- b )/( 2*a );

              this.maxSpeed = {
                value: Math.min( this.config.MAX_SPEED, this.config.SPEED + t * mode.ACCELERATION ),
                time: 0
              };

            });

            this.scoreboard.maxTangerines = ~~(this.gameModeTotalScore/100);
          }

          N7e.userSigningInfo('distances', true );

        });

        // load custom graphics configs.
        authUser.odrRef.once('value', snapshot => {
          let odr = snapshot.val();
          if( odr ){
            Object.assign( this.config.GRAPHICS_MODE_SETTINGS[ 3 ], odr.settings);
            if( this.config.GRAPHICS_MODE == 3 ){
              this.setGraphicsMode( 3, false );
              this.scenery.horizonLine.generateGroundCache( ODR.config.GRAPHICS_GROUND_TYPE );
            }
            if( this.config.GAME_MODE_REPLAY ){
              this.sequencer.reset();
            }

            Sound.inst.musicVolume = ODR.config.SOUND_MUSIC_VOLUME/10;
          }
        });

        ODR.scenery.addTREX();
      } else {
        N7e.user = null;
        N7e.userSignedIn = false;
        N7e.signing.progress = false;
      }
    });
  }

  /***/
  setMusicMode( mode ){
    if( this.config.PLAY_MUSIC ){
      Sound.inst.currentSong = null;
      this.config.PLAY_MUSIC = false;
      this.notifier.notify('♬ OFF', 2000 );
    } else {
      this.config.PLAY_MUSIC = true;

      if( 1 == this.gameState ){
        Sound.inst.loadMusic('offline-play-music', this.config.PLAY_MUSIC );
      } else {
        Sound.inst.loadMusic('offline-intro-music', this.config.PLAY_MUSIC );
      }
      this.notifier.notify('♬ ON', 2000 );
    }
  }

  closePanelForButton( button ){
    if( this.panel.associatedButton == button ){
      this.panel = null;
      return true;
    }
    return false;
  }

  createSoundMenu(){
    //this.config.PLAY_MUSIC = true;
    Sound.inst.currentSong = null;
    let entries = [];
    let key;

    key = 'PLAY_MUSIC_VOLUME';
    entries.push({
      title: 'PLAY MUSIC',
      name: 'PLAY_MUSIC',
      options: ['YES','NO'],
      value: this.config.PLAY_MUSIC,
    });

    key = 'SOUND_MUSIC_VOLUME';
    entries.push({
      title: key.slice(6),
      name: key,
      options: this.config.SOUND_OPTIONS[ key ],
      value: this.config[ key ],
      muted: true,
    });

    key = 'SOUND_EFFECTS_VOLUME';
    entries.push({
      title: key.slice(6),
      name: key,
      options: this.config.SOUND_OPTIONS[ key ],
      value: this.config[ key ],
      muted: true,
    });

    key = 'SOUND_SYSTEM_VOLUME';
    entries.push({
      title: key.slice(6),
      name: key,
      options: this.config.SOUND_OPTIONS[ key ],
      value: this.config[ key ],
      muted: true,
    });

    entries.push({ title:'exit', exit: true });

    let mainMenu = new Menu( this.canvas, {
      title: 'sounds',
      entries: entries,
      select: ( entry, vol, model ) => {
        if( mainMenu.model === model || vol > 10) {
          if( model.name == 'SOUND_MUSIC_VOLUME' && vol == 11) {
            Sound.inst.musicVolume = ODR.config.SOUND_MUSIC_VOLUME/10;
          } else {
            Sound.inst.effects.SOUND_BLIP.play( ODR.config.SOUND_SYSTEM_VOLUME/10 );
          }
        } else {
          if( model.name == 'SOUND_SYSTEM_VOLUME' ) {
            Sound.inst.effects.SOUND_BLIP.play( vol/10 );
          } else if( model.name == 'SOUND_EFFECTS_VOLUME' ) {
            model.sampleNames = model.sampleNames || [
              'SOUND_QUACK',
              'SOUND_OGGG',
              'SOUND_GOGOGO',
              'SOUND_BICYCLE',
              'SOUND_JUMP',
              'SOUND_SLIDE',
              'SOUND_HIT',
              'SOUND_ERROR',
              'SOUND_BLIP',
              'SOUND_POP',
            ];
            Sound.inst.effects[ model.sampleNames[ 0 ]].play( vol/10 );
            model.sampleNames.push( model.sampleNames.shift());
          } else if( model.name == 'SOUND_MUSIC_VOLUME' ) {
            Sound.inst.musicVolume = vol/10;
          }
        }
      },
      enter: ( entryIndex, entry ) => {
        if( entry.name == 'SOUND_MUSIC_VOLUME' ) {
          Sound.inst.loadMusic('offline-play-music', this.config.PLAY_MUSIC );
        }

        if( entry.value != this.config[ entry.name ] ) {
          this.config[ entry.name ] = entry.value;
          if (N7e.user) {
            N7e.user.odrRef.child('settings/' + entry.name ).set( entry.value );
          }

          if( entry.name == 'PLAY_MUSIC' ) {
            ODR.notifier.notify( `♬ ${entry.value ? "ON" : "OFF"}`, 2000 );
          }

          return null;
        }
        return null;
      },
    }, this.consoleButtons.CONSOLE_A );

    return mainMenu;
  }

  createGraphicsMenu(){
    Sound.inst.currentSong = null;
    let entries = [];
    for (let key in this.config.GRAPHICS_MODE_OPTIONS) {
      let def = this.config.GRAPHICS_MODE_OPTIONS[key];
      entries.push({title:key.slice(9), name:key, options:def, value:this.config[key]});
    }

    entries.push({title:'exit', exit:true});

    return new Menu( this.canvas, {
      title: 'graphics',
      entries: entries,
      enter: ( entryIndex, entry ) => {
        if( entry.value ) {
          this.config.GRAPHICS_MODE_SETTINGS[ 3 ][ entry.name ] = entry.value;
          if( N7e.user ){
            N7e.user.odrRef.child(`settings/${entry.name}`).set( entry.value );
          }
        }
        this.setGraphicsMode( 3 );
        return null;
      },
    }, this.consoleButtons.CONSOLE_B );
  }

  showGameModeInfo( duration = 3000, delay = 0 ){
    this.cc.append( `${this.gameMode.title}`+ (this.gameModeScore ? ` #trophy ${this.gameModeScore}` : ''), duration, delay );
  }

  setGameMode( choice ){
    /* FIXME avoid modifying config */
    this.gameMode = choice;

    this.scoreboard.score = 0;

    this.config.ACCELERATION = choice.ACCELERATION;

    this.gameState = 0;

    this.amandarine.reset();
    this.scenery.reset();
    this.sequencer.reset();

    this.invert(true);

    //FIXME dup screen forward
    Sound.inst.loadMusic('offline-intro-music', this.config.PLAY_MUSIC );

    let defaultAction = new DefaultAction(1);
    defaultAction.setX = -100;
    this.queueAction(defaultAction);
    Sound.inst.effects.SOUND_SCORE.play( this.config.SOUND_SYSTEM_VOLUME/10 );
    this.sky.setShade( Sky.config.DAY, 0 );

    this.showGameModeInfo();
  }

  createGameMenu(){

    Sound.inst.currentSong = null;
    let entries = [];

    this.gameModeList.forEach( mode => {
      entries.push({
        title: (this.gameMode === mode
          ? `${mode.title} #natB `
          : `${mode.title} `)
          + `[${Math.round(mode.distance * this.config.TO_SCORE)}]`,
        mode: mode,
      });
    });
    if( this.config.GAME_MODE_REPLAY ){
      entries.push({
        title:'REPLAY LAST GAME',
        disabled: ODR.sequencer.totalRecall.length < 2
      });
    }
    entries.push({ title:'EXIT', exit: true });

    return new Menu( this.canvas, {
      title: 'games',
      entries: entries,
      enter: ( entryIndex, choice ) => {
        if( choice.mode ){
          this.setGameMode(choice.mode);
        } else if ( !choice.exit ){
          let sequencer = ODR.sequencer;

          // For setting after callng setGameMode() as both props will be gone.
          let totalRecall = sequencer.totalRecall;
          let dejavus = totalRecall.slice();

          this.setGameMode( dejavus.shift());

          // For another replay
          sequencer.totalRecall = totalRecall;
          sequencer.dejavus = dejavus;
        }

        return null;
      }
    }, this.consoleButtons.CONSOLE_C );
  }

  createUserMenu(){
    Sound.inst.currentSong = null;
    let mainMenu =
      /* User has signed in */
      N7e.user
      ? new Menu( this.canvas, {
        title: 'USER PROFILE',
        entries: [
          "SET NAME",
          /*"SET AVATAR : NYI",*/
          "SIGN OUT",
          {title:'EXIT',exit:true}
        ],
        profile: true,
        profilePhoto: N7e.user.image,
        nickname: N7e.user.nickname,
        provider: N7e.user.auth.providerData[0].providerId,
        enter: (entryIndex,choice) => {
          if (choice.exit) return null;

          if( choice == "SET NAME"){
            return new TextEditor( this.canvas, N7e.user.nickname ? N7e.user.nickname: '', newNickname => {
              N7e.user.ref.child('nickname').set( newNickname );
              N7e.user.nickname = newNickname;
              this.notifier.notify(`all hail ${newNickname}.`, 5000 );
              mainMenu.model.title = newNickname;
              return mainMenu;
            }, mainMenu );
          } else if( choice == "SIGN OUT"){
            return new Menu( this.canvas, {
              title: 'DO YOU WANT TO SIGN OUT?',
              profile: true,
              profilePhoto: N7e.user.image,
              nickname: N7e.user.nickname,
              provider: N7e.user.auth.providerData[0].providerId,
              entries: [
                'YES',
                {title:'NO',exit:true}
              ],
              currentIndex: 1,
              enter: (confirm,confirmation) => {
                if (confirmation.exit) {
                  return null;
                } else {
                  //N7e.user.odrRef.off();
                  N7e.user.ref.child('items/tangerines/count').off();
                  N7e.user.odrRef.child('scores').off();
                  N7e.user.odrRef.off();
                  N7e.user = null;
                  firebase.auth().signOut();

                  ODR.totalTangerines = 0;
                  ODR.dailyTangerines = 0;
                  ODR.runTime = 0;

                  // Reset game score.
                  ODR.gameModeList.forEach( mode => mode.distance = 0 );
                  ODR.setGameMode( OnDaRun.gameModes.GAME_A );
                }
              },
            }, this.consoleButtons.CONSOLE_D, mainMenu );
          }
        }
      }, this.consoleButtons.CONSOLE_D )
      /* No active user */
      : new Menu( this.canvas, {
        title: 'LINK PROFILE',
        entries: [
          '#facebook FACEBOOK',
          '#twitter TWITTER',
          '#google GOOGLE',
          {title:'EXIT',exit:true}
        ],
        enter: ( entryIndex, choice ) => {
          if (choice.exit) return null;

          return new Menu( this.canvas, {
            title: 'DO YOU WANT TO LINK ' + choice + '?',
            entries: [
              'YES',
              {title:'NO',exit:true}
            ],
            currentIndex: 1,
            enter: (confirm,confirmation) => {
              if (confirmation.exit) {
                return mainMenu;
              } else {
                N7e.user = new User(['facebook','twitter','google'][entryIndex]);
                return new Wait( this.canvas, null, `signing with ${['facebook','twitter','google'][entryIndex]}..please wait`,
                  waiter => N7e.signing.progress ? waiter : null );
              }
            },
          }, this.consoleButtons.CONSOLE_D, mainMenu );
        },
      }, this.consoleButtons.CONSOLE_D );

    return mainMenu;
  }

  createResetMenu(){
    Sound.inst.currentSong = null;
    return new Menu( this.canvas, {
      title: 'WHOA...DEJA VU?',
      entries: [
        { title:'YES', disabled:this.config.GAME_MODE_REPLAY },
        { title:'NO', disabled:!this.config.GAME_MODE_REPLAY},
        { title:'CANCEL', exit:true }
      ],
      currentIndex: 1,
      enter: ( idx, confirmation ) => {
        if( !confirmation.exit ){
          this.config.GAME_MODE_REPLAY = [ true, false ][ idx ];
          this.setGameMode( this.gameMode );
          this.cc.append("REPLAY MODE ENABLED", 2000);
          this.cc.append("IN THE GAME MENU.", 2000,2000);
          if (N7e.user) {
            N7e.user.odrRef.child('settings/GAME_MODE_REPLAY').set( this.config.GAME_MODE_REPLAY );
          }
        }
        return null;
      },
    }, this.consoleButtons.CONSOLE_RESET );
  }

  setGraphicsMode( mode, notify = true){

    if (mode == -1) {
      mode = ( this.config.GRAPHICS_MODE + 1 )%4;
    }

    Object.assign(this.config, this.config.GRAPHICS_MODE_SETTINGS[mode]);
    this.config.GRAPHICS_MODE = mode;
    this.canvasCtx.restore();
    this.canvasCtx.save();

    if( notify )
    switch( mode ){
      case 0:
        this.notifier.notify('N#aTURING', 5000 );
        break;
      case 1:
        this.notifier.notify('STRIPES', 5000 );
        break;
      case 2:
        this.notifier.notify('ROCK-BOTTOM', 5000 );
        break;
      case 3:
        this.notifier.notify('CUSTOM GRAPHICS MODE', 5000 );
      default:
        break;
    }

     if (this.config.GRAPHICS_DUST != 'DUST')
      this.amandarine.dust.reset();

    if (this.config.GRAPHICS_MOON == 'SHINE') {
      this.scenery.nightMode.generateMoonCache();
    } else {
      this.scenery.nightMode.moonCanvas = null;
    }
    this.canvas.style.opacity = 1 - this.config.GRAPHICS_DAY_LIGHT/5;

    //Generate caches
    //this.scenery.forward( 0, 0, 0, false, 0);
  }

  set panel( newPanel ){
    if(! newPanel )
      if( 0 == this.gameState ) this._panel = new Greeter( this.canvas, this.notifier );
      else if( 2 == this.gameState ) this._panel = new GameOver( this.canvas );
      else this._panel = this._passthroughPanel;
    else this._panel = newPanel;
  }

  get panel(){
    return this._panel;
  }

/**
 * OnDarun main forwarding
 */
  forward( now ) {
    //this.forwardPending = false;

    var deltaTime = now - (this.time || now);
    this.time = now;

    // Update button animations.
    for( let key in this.consoleButtons ){
      this.consoleButtons[ key ].forward( deltaTime );
    }

    if( !this.panel.passthrough ){
      this.panel = this.panel.forward( deltaTime );
      this.scheduleNextRepaint();
      return;
    }

    if( 1 == this.gameState ){

      if( this.config.GAME_MODE_REPLAY ){
        let dejavus = this.sequencer.dejavus;
        if( dejavus ){

          //Sync runTime with the next entity in the replay mode.
          if( dejavus.length ){
            if( dejavus[0].runTime < this.runTime + deltaTime ){
              let extra = this.runTime + deltaTime - dejavus[0].runTime;
              deltaTime -= extra;
            }
          } else {
            if( this.sequencer.numberOfEntities == 0 ){
              let liverOffset = 300*(( 1- Liver.speedFactor )/( 1- Rubber.speedFactor )- 2);

              [ ["  ##   ##",
                 "#    #    #",
                 "#         #",
                 " #       #",
                 "   #   #",
                 "     #"],
                ["#    #",
                 "##   #",
                 "# #  #",
                 "#  # #",
                 "#   ##",
                 "#    #"]].forEach(( kind, isRubber ) => kind.reverse().forEach(( line, elev ) => {

                   line.split('').forEach(( c, x ) => {
                     if( c == '#'){
                       let duckType = [ Liver , Rubber ][ isRubber ];
                       let duck = new duckType( this.canvasCtx,
                         this.currentSpeed * duckType.speedFactor, DuckType.elevationList[ elev ]);
                       duck.minX = DEFAULT_WIDTH + 50 + 20*x;
                       if( !isRubber ){
                         duck.minX += liverOffset;
                       }
                       this.sequencer.addEntity( duck );
                     }
                   });

                 }));
            }
          }

          this.runTime += deltaTime;
          this.scoreboard.score = this.score;
        } else {
          this.runTime += deltaTime;
          //this.distance += this.currentSpeed * deltaTime / this.msPerFrame;
          this.scoreboard.score = this.score;
        }
      } else {
        this.runTime += deltaTime;
        //this.distance += this.currentSpeed * deltaTime / this.msPerFrame;
        this.scoreboard.score = this.score;
      }

      //Drop tangerine
      if( this.tangerineTimer < 5000 ){
        this.tangerineTimer += deltaTime;
        if( this.tangerineTimer >= 5000 ){
          this.checkShouldDropTangerines();
        }
      }

      this.scenery.forward( deltaTime, this.currentSpeed, this.inverted );
      this.sequencer.forward( deltaTime, this.currentSpeed, true );
      this.scoreboard.forward( deltaTime );

      // Night & Day FIXME use time instead of timer
      if (this.invertTimer > this.config.INVERT_FADE_DURATION) {
        this.invertTimer = 0;
        this.invertTrigger = false;
        this.invert();
      } else if (this.invertTimer) {
        this.invertTimer += deltaTime;
      } else {
        if( this.score > 0 ){
          this.invertTrigger = !(this.score % this.config.INVERT_DISTANCE);

          if (this.invertTrigger && this.invertTimer === 0) {
            this.invertTimer += deltaTime;
            this.invert();
          }
        }
      }

      let crashAction = this.sequencer.crashTest( this.amandarine );
      if( crashAction ){
        // The scheduler will set gameState to 2 that will call this.crash()
        this.queueAction( crashAction );
      }


      /* Auto by setting runTime
      this.currentSpeed = this.config.SPEED + this.runTime * this.config.ACCELERATION;
      if( this.currentSpeed > this.config.MAX_SPEED )
        this.currentSpeed = this.config.MAX_SPEED;
        */

    } else if( 2 == this.gameState ){
      //CEASING
      //Define existence as a timing ratio used to by the gameover animations.
      let existence = Math.max( 0,
        Math.min( 1,
          ( this.config.GAMEOVER_CLEAR_TIME - this.activeAction.timer )
            /this.config.GAMEOVER_CLEAR_TIME )
      );

      this.scenery.forward( deltaTime, this.currentSpeed, this.inverted );
      this.sequencer.forward( deltaTime, this.currentSpeed, false, existence );
      this.scoreboard.forward( deltaTime );

      if (existence > 0.9) {
        let crashPoint = this.actions[0].crash.C.center();
        this.canvasCtx.drawImage( ODR.spriteGUI,
            OnDaRun.spriteDefinition.CRASH.x,
            OnDaRun.spriteDefinition.CRASH.y,
            this.config.CRASH_WIDTH, this.config.CRASH_HEIGHT,
            crashPoint.minX - this.config.CRASH_WIDTH/2, crashPoint.minY - this.config.CRASH_HEIGHT/2,
            this.config.CRASH_WIDTH, this.config.CRASH_HEIGHT);
      }

    } else {
      // 0 == this.gameState
      this.scenery.forward( deltaTime, 0, this.inverted );
      this.sequencer.forward( deltaTime, this.currentSpeed, false );
      //this.scoreboard.existence = 0;
    }

    let a = this.actions[0];
    this.scheduleActionQueue( now, deltaTime, this.currentSpeed );
    this.notifier.forward( deltaTime );

    if( this.playLyrics ){
      Sound.inst.updateLyricsIfNeeded( m => this.cc.appendMessage( m ));
    }
    this.cc.forward( deltaTime );

    /*
    if( N7e.signing.progress ) {
      // Draw starry spinner
      this.canvasCtx.drawImage(this.spriteGUI,
        38 + ~~(now/100)%4 * 22, 73, 22, 22,
        600-25, 200-25, 22, 22);
    }
    */

    if( this.panel.passthrough ){
      this.panel = this.panel.forward( deltaTime );
    }

    if( this.config.GRAPHICS_DISPLAY_INFO == 'YES'){
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

      this.cc.append(`S:${this.currentSpeed.toFixed(3)} T:${(this.runTime/1000).toFixed(1)} FPS:${this.paintRound}`);
    }

    this.scheduleNextRepaint();
  }

/**
 * OnDarun Event handler interface
 * Menus or Panels may block the defualt behaviors by implementing
 * handleEvent(e) and return true; false will invoke the defaults.
 *
 * @param {Event} e application events.
 */
  handleEvent(e) {

    switch( e.type ){
      case OnDaRun.events.VISIBILITY:
      case OnDaRun.events.FOCUS:
      case OnDaRun.events.BLUR:
      //FIXME impelmenet pause() toggler
        if( this.panel.isWaiting ) break;
        if( !this._handleEvent_Pause
            && ( e.type == OnDaRun.events.BLUR
                || document.hiddden || document.webkitHidden
                || document.visibilityState != 'visible')){
          this.panel = new Pause ( this.canvas, this.panel );
          this._handleEvent_Pause = this.panel;
        } else if( this._handleEvent_Pause ){
          this._handleEvent_Pause.exit();
          this._handleEvent_Pause = null;
        }
        break;
      case OnDaRun.events.KEYDOWN:{
        if( !this.panel.handleEvent || !this.panel.handleEvent( e )){
          let button = this.consoleButtonForKeyboardCodes[ e.code ];
          if( button ){
            button.handleEvent( e );
          } else {
            this.onKeyDown( e );
          }
        }

      } break;

      case OnDaRun.events.KEYUP:
        if( !this.panel.handleEvent || !this.panel.handleEvent( e )){
          let button = this.consoleButtonForKeyboardCodes[ e.code ];
          if( button ){
              button.handleEvent( e );
          } else {
            this.onKeyUp( e );
          }
        }
        break;

      case OnDaRun.events.CONSOLEDOWN: {
        if( this.panel.handleEvent && this.panel.handleEvent( e )){
          return;
        }

        let button = e.detail.consoleButton;

        switch( button ){
          case this.consoleButtons.CONSOLE_LEFT:{
            let action = this.consoleButtonActionMap.get( button );
            if( !action || action.priority != 0 ){
              action = new SlideAction( this.time, this.currentSpeed );
              this.consoleButtonActionMap.set( button, action );
              this.queueAction( action );
            }
          } break;

          case this.consoleButtons.CONSOLE_RIGHT:{
            let action = this.consoleButtonActionMap.get( button );
            if( !action || action.priority != 0 ){
              action = new JumpAction( this.time, this.currentSpeed );
              this.consoleButtonActionMap.set( button, action );
              this.queueAction( action );
            }
          } break;

        }

      } break;

      case OnDaRun.events.CONSOLEUP:{
        if( this.panel.handleEvent && this.panel.handleEvent( e )){
          return;
        }

        let button = e.detail.consoleButton;

        switch( button ){
          case this.consoleButtons.CONSOLE_LEFT:
          case this.consoleButtons.CONSOLE_RIGHT:{
            let action = this.consoleButtonActionMap.get( button );
            if( action && action.priority == 0 ){
              action.willEnd( this.time, this.currentSpeed );
              action.priority = 1;
              this.consoleButtonActionMap.delete( button );
            }
          } break;

          // Sound button
          case this.consoleButtons.CONSOLE_A:
            if( !IS_SOUND_DISABLED ){
              if( e.detail.timeOut || !this.panel.passthrough ){
                if( !this.closePanelForButton( button ))
                  this.panel = this.createSoundMenu();
              } else {
                this.setMusicMode(-1 );
                this.cc.append("hold the button for settings.", 3000 );
              }
            } else {
              this.panel = null;
              this.cc.append("sounds currently disabled on ios.", 5000 );
            } break;

          // Graphics button
          case this.consoleButtons.CONSOLE_B:
            if( e.detail.timeOut || !this.panel.passthrough ){
              if( !this.closePanelForButton( button ))
                this.panel = this.createGraphicsMenu();
            } else {
              this.setGraphicsMode(-1 );
              this.cc.append("hold the button for settings.", 3000 );
            } break;

          case this.consoleButtons.CONSOLE_C:
            if( !this.closePanelForButton( button )){
              this.panel = this.createGameMenu();
            } break;

          case this.consoleButtons.CONSOLE_D:
            if( !this.closePanelForButton( button )){
              this.panel = this.createUserMenu();
            } break;

          case this.consoleButtons.CONSOLE_RESET:
            if( !this.closePanelForButton( button )){
              this.panel = this.createResetMenu();
            } break;

          case this.consoleButtons.CONSOLE_N7E:{
            if (!this.n7eUrlList || this.n7eUrlList.length == 0) {
              this.n7eUrlList = [
                { name: 'IG', url: 'https://www.instagram.com/natherine.bnk48official'},
                { name: 'FACEBOOK', url: 'https://www.facebook.com/bnk48official.natherine'},
              ];
            }
            window.open( this.n7eUrlList.splice( N7e.randomInt( 0, this.n7eUrlList.length - 1 ), 1)[ 0 ].url, '_blank');
          } break;
        }

      } break;
    }
  }

  startListening() {
    // Keys.
    this.consoleButtonActionMap = new Map();

    document.addEventListener( OnDaRun.events.KEYDOWN, this );
    document.addEventListener( OnDaRun.events.KEYUP, this );
    this.addEventListener( OnDaRun.events.CONSOLEDOWN, this );
    this.addEventListener( OnDaRun.events.CONSOLEUP, this );

    document.addEventListener(OnDaRun.events.VISIBILITY, this );
    window.addEventListener(OnDaRun.events.BLUR, this );
    window.addEventListener(OnDaRun.events.FOCUS, this );

    if (!IS_MOBILE) {
      /*
      document.addEventListener(OnDaRun.events.MOUSEDOWN, this);
      document.addEventListener(OnDaRun.events.MOUSEUP, this);
      */
    }
  }

  stopListening() {
    document.removeEventListener( OnDaRun.events.KEYDOWN, this );
    document.removeEventListener( OnDaRun.events.KEYUP, this );
    document.removeEventListener( OnDaRun.events.CONSOLEDOWN, this );
    document.removeEventListener( OnDaRun.events.CONSOLEUP, this );

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
    //if( IS_MOBILE && this.playing ){
      //e.preventDefault();
    //}
  }

  onKeyUp(e) {
    var keyCode = String(e.keyCode);

    if (keyCode <= 52 && keyCode >= 49) {
      /* Mapping 1,2,3,4 => 0,1,2,3 */
      this.setGraphicsMode(keyCode - 49);
      return;
    }

    if( e.code == 'Escape' ){
      this.panel.exit();
    }
  }

  queueAction( action ){
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
    /*
    if (!this.forwardPending) {
      this.forwardPending = true;
    }
    */
      this.raqId = requestAnimationFrame((now) => this.forward( now ));
  }

  /*
  isRunning() {
    return !!this.raqId;
  }
  */

  updateScore(){
    this.maxSpeed = { value: this.runRecord.crashSpeed, time: new Date().getTime()};

    let d = this.score;

    // Only play lyrics if reaching a half of hiscore and more than 1000.
    // FIXME Rethink for different difficulties.
    if( this.runRecord.crashSpeed > 8 && this.distance > this.gameMode.distance / 2 ){
      this.playLyrics = true;
    }

    if( this.runRecord.crashSpeed < 8 ){
      let skipping;
      this.achievements = [
        200, this.achievementPhrases[ skipping = N7e.randomInt( 0, 2 )],
        400, this.achievementPhrases[ skipping += N7e.randomInt( 1, 3 )],
        800, this.achievementPhrases[ skipping += N7e.randomInt( 1, 3 )],
        1600, this.achievementPhrases[ skipping += N7e.randomInt( 1, 3 ) ],
      ];
    } else {

      /*
      if( this.distance > this.gameMode.distance )
        this.notifier.notify( `A NEW HIGH!
${this.gameMode.title} : ${Math.round( this.gameMode.distance * this.config.TO_SCORE )} ▻ ${Math.round( this.distance * this.config.TO_SCORE )}
GOOD JOB! #natB`, 15000 );
*/

      let skipping;
      d = d/2 - d/2%100;
      this.achievements = [
        d, this.achievementPhrases[ skipping = N7e.randomInt( 0, 2 )],
        2*d, this.achievementPhrases[ skipping += N7e.randomInt( 1, 3 )],
        3*d, this.achievementPhrases[ skipping += N7e.randomInt( 1, 3 )],
        4*d, this.achievementPhrases[ skipping += N7e.randomInt( 1, 3 ) ],
      ];
    }

    // Update the high score.
    if( this.distance > this.gameMode.distance ){
      if( N7e.user ) {
        N7e.user.odrRef.child('scores').child( this.gameMode.key )
        .transaction(( distance = 0) => Math.max( this.distance, distance ));
        console.log('Scores updated.');
      }
      this.gameMode.distance = Math.ceil( this.distance );
    }
  }

  get gameModeTotalScore(){
    let sum = 0;
    this.gameModeList.forEach( mode => sum+= Math.round( mode.distance * this.config.TO_SCORE ));
    return sum;
  }

  get gameModeScore(){
    return Math.round( this.gameMode.distance * this.config.TO_SCORE );
  }

  get score(){
    return Math.round( this.distance * this.config.TO_SCORE );
  }

  get distance(){
    return (this._HSPD + this._HACC * this._runTime) * this._runTime;
  }

  checkShouldDropTangerines(){
    // Disable dropping until resolved.

    this.shouldDropTangerines = false;

    if( N7e.userSignedIn ){
      let d = new Date();
      let today = `${d.getFullYear()}/${d.getMonth()}/${d.getDate()}`;
      N7e.user.odrRef.child('items/tangerines').transaction( tangerines => {
        tangerines = tangerines || { dayCount: 0, date: today };
        if( tangerines.date != today ) {
          tangerines.date = today;
          tangerines.dayCount = 0;
        }

        return tangerines;
      }).then( complete => {
        if( complete.committed ){
          let tangerines = complete.snapshot.val();
          let maxPerDay = Math.max( 1, ~~(this.gameModeTotalScore/100));
          if( tangerines.dayCount < maxPerDay ){
            if( this.tangerineTimer >= 5000 ){
              this.shouldDropTangerines = true;
            }
          } else {
            this.shouldDropTangerines = false;
            //this.notifier.notify( `no #tangerine today! [${tangerines.dayCount}/${maxPerDay}]`, 5000 );
          }

          this.scoreboard.minTangerines = tangerines.dayCount;
          this.scoreboard.maxTangerines = maxPerDay;
        } else {
          console.error('Data was not committed???');
        }

      });
    }
  }

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

    this.sky.setShade( this.inverted ? Sky.config.NIGHT : Sky.config.DAY, 3000 );
  }


  /* Phear the Scheduler. Cuz it's a fucking mess.
     Scheduler is for conducting all actions into their priority handlers,
     before activating them in activateAction().

     *** Action Priority Definitions ***
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
  scheduleActionQueue( now, deltaTime, speed ){

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
                this.amandarine.jumpingGuideIntensity = Math.min( 1, gji + deltaTime/200 );
                this.amandarine.drawJumpingGuide(action, now, speed);
                continue;
              case A8e.status.SLIDING:
                this.amandarine.slidingGuideIntensity = Math.min( 1, gsi + deltaTime/200 );
                this.amandarine.drawSlidingGuide(action, now, speed);
                continue;
              case A8e.status.RUNNING:

                action.timer = 0;
                action.priority = 1;
                this.activeAction = action;
                //this.amandarine.activateAction(action, deltaTime, speed);

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

                    if( 2 == this.gameState ) {
                      console.trace();
                      /* crash action should have locked the scheduler */
                      console.error('Shoud never be here.')
                      break HANDLE_ACTION_QUEUE;
                    }

                if (this.config.GRAPHICS_DUST != 'NONE') {
                  this.amandarine.dust.minX = this.amandarine.minX - 24;
                  this.amandarine.dust.addPoint(0, 0, -40, -10 * Math.random());
                }

                break;
              case A8e.status.SLIDING:
                this.activeAction = action;
                action.minX = this.amandarine.minX;
                break;

              case A8e.status.WAITING:
              //Not sure but... this should turn default waiting into running I guess?

              // These background-type actions (priority 1 without specific
              // duration) below will 'continue' through the action queue
              // to proceed with the active preparing action (priority 0).
              case A8e.status.RUNNING:
                this.activeAction = action;
                action.speed = speed;
                action.msPerFrame = 1000 / (22 + speed);

                continue;

              case A8e.status.CEASING:
                // The priority-3 was demoted to 1
                //this.amandarine.activateAction(action, deltaTime, speed);
              default:
                break HANDLE_ACTION_QUEUE;
            }
            action.priority = 2;
            // All 1s will progress into 2s
          case 2: /* priority */
            this.activeAction = action;
            //this.amandarine.activateAction(action, deltaTime, speed);

            break HANDLE_ACTION_QUEUE;
          case 3: /* priority */
            this.activeAction = action;
            switch(action.type) {
              case A8e.status.RUNNING:

                /* Running into the scene
                  (A8e.config.START_X_POS + 200)*1000/FPS*/
                if( this.amandarine.minX > A8e.config.START_X_POS ) {
                  action.speed = 0;
                  this.amandarine.minX = A8e.config.START_X_POS;
                }
                // Don't proceed action while walking in.
                break HANDLE_ACTION_QUEUE;
              case A8e.status.PAUSED:
                //NYI
                break HANDLE_ACTION_QUEUE;
              case A8e.status.CEASING: {

                //Start the crash animation.
                if( 2 != this.gameState ){
                  //TOOD this.dispatchEvent(new CustomEvent('odr-crash', { bubbles: false, detail: { action: action } }));
                  this.runRecord.crashSpeed = speed;
                  this.gameState = 2;

                  if( action.crash ){
                    // Prepare crash animation.
                    let crashPoint = action.crash.C.center();
                    //TODO 4 dirs
                    if( crashPoint.minY - this.amandarine.minY < 20 ){
                      action.dir = -1;
                    } else {
                      action.dir = 1;
                    }

                    action.duration = 200;
                    action.top = action.duration / 1000;
                    action.halfTime = Math.sqrt( 2000 * action.duration / A8e.config.GRAVITY );
                    action.timer = 0;
                    action.crashedMinY = this.amandarine.minY;
                    action.lagging = speed;

                  }
                }

              } break HANDLE_ACTION_QUEUE;
              //break;
              case A8e.status.WAITING:
                /*
                if( this.amandarine.minX < A8e.config.START_X_POS ) {
                  action.speed = 1;
                }*/

                break HANDLE_ACTION_QUEUE;
              default:
              break;
            }
            break;

          default: /*priority*/
            console.error(action, action.priority);
            N7e.freeze = true;
            /*
            this.amandarine.activateAction(action, deltaTime, speed);
            break HANDLE_ACTION_QUEUE;
            */
        }
      }
    }

    if (this.activeAction)
      this.amandarine.activateAction( this.activeAction, deltaTime, speed );
    else {
      //console.log('No active action for repainting.');
      //N7e.freeze = true;
    }
    //this.amandarine.forward(deltaTime, speed, activeAction);
  }
}

OnDaRun.defaultDimensions = {
  WIDTH: DEFAULT_WIDTH,
  HEIGHT: 200
};

//TODO Implement class GameMode
OnDaRun.gameModes = {
  GAME_A: { title:'GAME A', icon:'#gameA', ACCELERATION: 0.00050/16 },
  GAME_B: { title:'GAME B', icon:'#gameB', ACCELERATION: 0.00050/4 },
  GAME_S: { title:'SITUATION HALL', icon:'#gameS', ACCELERATION: 0.00050/16 },
};
for( const key in OnDaRun.gameModes ) {
  OnDaRun.gameModes[key].key = key;
  OnDaRun.gameModes[key].distance = 0;
}

OnDaRun.Configurations = {
  ACCELERATION: OnDaRun.gameModes.GAME_A.ACCELERATION,
  BG_CLOUD_SPEED: 0.2,
  BOTTOM_PAD: 10,
  CLEAR_TIME: 3000,
  CLOUD_FREQUENCY: 0.5,
  TO_SCORE: 0.025,
  CRASH_WIDTH: 32,
  CRASH_HEIGHT: 32,
  GAME_MODE: 'GAME_A',
  GAME_MODE_REPLAY: false,
  GAMEOVER_CLEAR_TIME: 1500,
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
  SPEED: 6,
  SHOW_COLLISION: false,
  GRAPHICS_MODE: 0,
  GRAPHICS_MODE_SETTINGS: [
    { /*0*/
      GRAPHICS_GROUND_TYPE: 'GRASS',
      GRAPHICS_DESKTOP_LIGHT: 'NONE',
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
      GRAPHICS_MOUNTAINS_TYPE: 'PLAIN',
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
  GRAPHICS_SUBTITLES: 'YES',
  GRAPHICS_MODE_OPTIONS: {
    GRAPHICS_GROUND_TYPE: ['DIRT','STRIPES','GRASS'],
    GRAPHICS_DESKTOP_LIGHT: ['NONE','LIGHT'],
    GRAPHICS_CLOUDS: { min: 0, max: 10, step: 1 },
    GRAPHICS_CLOUDS_TYPE: ['NORMAL','DEPTH'],
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
    GRAPHICS_SUBTITLES: ['YES','NO'],
    GRAPHICS_DISPLAY_INFO: ['YES','NO'],
  },
  SOUND_EFFECTS_VOLUME: 5,
  SOUND_MUSIC_VOLUME: 5,
  SOUND_SYSTEM_VOLUME: 10,
  SOUND_OPTIONS: {
    SOUND_EFFECTS_VOLUME: { min: 0, max: 10, step: 1 },
    SOUND_MUSIC_VOLUME: { min: 0, max: 10, step: 1 },
    SOUND_SYSTEM_VOLUME: { min: 0, max: 10, step: 1 },
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
    35.6, "And their #<3#<3#<3 belong to just one",
    38.4, "Their #<3#<3#<3 belong to",
    40, "#natA Natherine #natB",
    45, null,
  ],

};

OnDaRun.classes = {
  INVERTED: 'inverted',
};

OnDaRun.events = {
  ANIM_END: 'webkitAnimationEnd',
  CLICK: 'click',
  KEYDOWN: 'keydown',
  KEYUP: 'keyup',
  MOUSEDOWN: 'mousedown',
  MOUSEUP: 'mouseup',
  MOUSEOUT: 'mouseout',
  RESIZE: 'resize',
  TOUCHEND: 'touchend',
  TOUCHSTART: 'touchstart',
  VISIBILITY: 'visibilitychange',
  BLUR: 'blur',
  FOCUS: 'focus',
  LOAD: 'load',
  CONSOLEDOWN: 'customconsoledown',
  CONSOLEUP: 'customconsoleup',
  NOTIFICATION: 'notification',
};

OnDaRun.spriteDefinition = {
  CRASH: { x: 37, y: 40},
  DUST: { x: 776, y: 2 },
  RESTART: { x: 0, y: 40 },
  TEXT_SPRITE: { x: 0, y: 0 },
};

OnDaRun.keycodes = {
  JUMP: { '38': 1, '32': 1, '39': 1 },  // Up, spacebar, Right
  SLIDE: { '37': 1, '40': 1 },  // Left, Down
  RESTART: { '13': 1 }  // Enter
};

customElements.define('n7e-ondarun', OnDaRun);
