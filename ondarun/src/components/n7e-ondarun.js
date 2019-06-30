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
var DEFAULT_HEIGHT = 200;
var FPS = 60;
var IS_IOS = /iPad|iPhone|iPod/.test(window.navigator.platform);
var IS_MOBILE = /Android/.test(window.navigator.userAgent) || IS_IOS;
var IS_TOUCH_ENABLED = 'ontouchstart' in window;

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
};

N7e.signing = {
  progress: false,
  photo: false,
  nickname: false,
  distances: false,
  tangerines: false,
};

N7e.user = null;

function getRandomNum( min, max ){
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

/*
class ODRConstants {}
ODRConstants.defaultDimensions = {
  WIDTH: DEFAULT_WIDTH,
  HEIGHT: 200
};
*/

class CollisionBox {
  constructor(x, y, w, h) {
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

  intersects(aBox) {
    return ( this.maxX() <= aBox.minX || aBox.maxX() <= this.minX ||
        this.maxY() <= aBox.minY || aBox.maxY() <= this.minY)
      ? false
      : true;
  }

  intersection(aBox) {

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

  isEmpty() {
    return this.width > 0 && this.height > 0 ? false : true;
  }

  union(aBox) {
    if (this.isEmpty()) {
      if (aBox.isEmpty()) return new CollisionBox(0,0,0,0);
      return aBox;
    }
    if (aBox.isEmpty()) return this;

    let xx = Math.min( this.minX, aBox.minX );
    let yy = Math.min( this.minY, aBox.minY );

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
    if( opt_providerName ){
      N7e.userSignedIn = false;
      N7e.signing.progress = true;

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
  constructor( ctx, speed, elevation ) {
    this.canvasCtx = ctx;
    this.speed = speed;
    this.minX = DEFAULT_WIDTH;
    this.yOrigin = this.minY = DEFAULT_HEIGHT - elevation;
    this.removed = false;
  }

  get width() {
    return this.constructor.width;
  }

  get height() {
    return this.constructor.height;
  }

  get maxX() {
    return this.minX + this.width;
  }
  set maxX(newMaxX) {
    this.minX = maxX - this.width;
  }

  get maxY() {
    return this.minY + this.height;
  }
  set maxY(newMaxY) {
    this.minY = maxY - this.height;
  }

  get speedFactor() {
    return this.constructor.speedFactor || 0;
  }

  get removed() {
    return !this._exists;
  }
  set removed( remove ) {
    if( this._exists && remove ) {
      this.constructor.replicaCount--;
    } else if( !this.exists && !remove ) {
      this.constructor.replicaCount++;
    }
    this._exists = !remove;
  }

  collide() {
    return false;
  }

  forward( deltaTime, currentSpeed ) {
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

  get sprite() {
    return this.constructor.sprite;
  }

  /*
    This place the interval time so once leader meet A8e, this entity will be
    interval ms away. This allow tuning the space to fit the duration-oriented actions.
    ie. since actions will neither happen nor end faster in at higher speed.

    [A][E leader]..interval..[E this]
  */
  follow( leader, interval, currentSpeed ) {
    leader = leader || { minX: 600, speedFactor: 0 };
    let leaderDistance = leader.maxX - 25; //START_X_POS(25) + cbox.maxX(33)
    let leaderSpeed = currentSpeed - (leader.speedFactor * currentSpeed);
    let duration = (1000/FPS) * leaderDistance / leaderSpeed;

    let absSpeed = currentSpeed - (this.speedFactor * currentSpeed);
    let distance = (duration + interval) * absSpeed * FPS/1000;
    this.minX = 25 + distance;

    if( this.minX < 590 ) {
      console.log('Late:', this.minX, this );
    }

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
  /*
  forward( deltaTime, currentSpeed ) {
    super.forward( deltaTime, currentSpeed );
    if( this.ctx ) {
      this.ctx.strokeStyle = "orange";
      this.ctx.strokeRect( this.minX, 10, this.width, 180 );
    }
  }
  */

}

class Tangerine extends Entity {
  constructor( ctx, elevation ) {
    super( ctx, 0, elevation );
    this.spriteX = 0;
    this.spriteY = 20;
    this.collected = false;
  }

  collide( collision ) {
    if( !this.collected ) {
      ODR.playSound( ODR.soundFx.SOUND_POP, ODR.config.SOUND_SYSTEM_VOLUME/10 );
      ODR.playSound( ODR.soundFx.SOUND_SCORE, ODR.config.SOUND_SYSTEM_VOLUME/20 );
      this.collected = true;
      this.collectedY = this.minY;
      this.collectedTimer = 0;
      Tangerine.increaseTangerine( 1 );
    }
    return false;
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
    if( this.collected ) {
      this.collectedTimer += deltaTime;
      if( this.collectedTimer > 400 ) {
        this.removed = true;
        return;
      }

      let x = this.collectedTimer/400;
      let y = -200 * x * x + 200 * x;
      this.minY = this.collectedY - y;
      //super.forward( 0, 0 );

      this.canvasCtx.save();
      if( this.collectedTimer > 200 ) {
        this.canvasCtx.globalAlpha = 1 - ((this.collectedTimer - 200) / 200);
      }
      this.spriteX = 20 * ~~(this.collectedTimer / 100);
      super.forward( deltaTime, currentSpeed/10 );
      this.canvasCtx.restore();
    } else {
      super.forward( deltaTime, currentSpeed );
    }
  }

  static get width() { return 20; }
  static get height() { return 20; }

  get collisionBoxes() {
    return this.constructor.collisionBoxes;
  }

}

Tangerine.collisionBoxes = [new CollisionBox( -5, -5, 24, 24)];

class Obstacle extends Entity {

  static getRandomObstacleSubtype( currentSpeed, history ) {
    let filtered = this.subtypes.filter(
      type => type.minSpeed <= currentSpeed
      && type.replicaCount < ODR.config.MAX_OBSTACLE_DUPLICATION
    );

    return filtered[ getRandomNum( 0, filtered.length - 1 )];
  }

  static get subtypes() {
    this._subtypes = this._subtypes || [];
    return this._subtypes;
  }

  static registerType() {
    this.replicaCount = 0;
    let classes = this.subtypes;
    Obstacle.subtypes.push( this );

    /* Remap sprite positions/collision boxes to match the animation sequence */
    if( this.animation ) {
      this.spriteXList =
        this.animation.map( frameIndex => this.spriteXList[frameIndex]);
      this.collisionFrames =
        this.animation.map( frameIndex => this.collisionFrames[frameIndex]);
    }
  }

  collide( collision ) {
    ODR.queueAction({
      type: A8e.status.CRASHED,
      timer: 0,
      priority: 3,
      boxes: collision,
      obstacle: this
    }, this.currentSpeed);

    return true;
  }
}

{ //
  Obstacle.situation = {
    Cactus: {}, // Default situation.
  };
  Obstacle.situationList = [];

  // The map of chances for randoming an obstacle at a current speed. A miss one will be routed to a cactus.
  let svgSrc = `
<svg xmlns="http://www.w3.org/2000/svg" id="SituationMap">
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

  let svg = new DOMParser().parseFromString(svgSrc, 'image/svg+xml');
  let paths = svg.getElementsByTagName('path');
  for( let path of paths) {
    let entry = {
      name: path.attributes.class.value,
      path: new Path2D(path.attributes.d.value),
    };
    Obstacle.situationList.unshift(entry);
    Obstacle.situation[entry.name] = entry;
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

  get collisionBoxes() {
    return this.constructor.collisionBoxesForSize(this.size);
  }

  get width() {
    return this.constructor.width * this.size;
  }

  static registerType() {
    super.registerType();
    this.cachedCollisionBoxesForSize = [];
  }

  static collisionBoxesForSize(size) {
    if( this.cachedCollisionBoxesForSize[size] ) {
      return this.cachedCollisionBoxesForSize[size]
    }

    let boxes = this.collisionBoxes;

    boxes[1].width
      = this.width * size
        - boxes[0].width
        - boxes[2].width;
    boxes[2].minX = this.width * size
      - boxes[2].width;

    this.cachedCollisionBoxesForSize[size] = boxes;
    return boxes;

  }

  static getRandomObstacle( ctx, speed ) {
    let max = speed < 6.5
      ? 2
      : speed < 7.5
        ? 3
        : MultiWidth.MAX_OBSTACLE_LENGTH;

    return new this( ctx, 0, getRandomNum( 1, max ));
  }

  collide( collision ) {
    super.collide( collision );
    ODR.playSound( ODR.soundFx.SOUND_HIT, ODR.config.SOUND_EFFECTS_VOLUME/10 );
    return true;
  }
}
MultiWidth.MAX_OBSTACLE_LENGTH = 4;

class SmallCactus extends MultiWidth {
  constructor( ctx, speed, size ) {
    super( ctx, speed, 45, size );

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
SmallCactus.spriteXList = [266,283,317,368];
SmallCactus.spriteYOffset = 0;
SmallCactus.width = 17;
SmallCactus.height = 35;

class LargeCactus extends MultiWidth {
  constructor( ctx, speed, size ) {
    super( ctx, speed, 60, size );

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
LargeCactus.spriteXList = [266,291,341,416];
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
    this.frameOffset = getRandomNum(0,this.constructor.animation.length - 1);
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
  }

  collide( collision ) {
    super.collide( collision );
    ODR.playSound( ODR.soundFx.SOUND_QUACK, 0.8 * ODR.config.SOUND_EFFECTS_VOLUME/10, false, 0.1 );
    return true;
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
    return new this( ctx, speed * this.speedFactor, DuckType.elevationList[getRandomNum(0,5)]);
  }
}
DuckType.elevationList = [ 50, 75, 100, 125, 150, 175 ];
DuckType.yFrames = [0, -1, 0, 1, 1, 0];

class Liver extends DuckType {
  forward( deltaTime, currentSpeed ) {
    super.forward( deltaTime, currentSpeed );

    if( this.minX < 1000 && !this.alarmed ) {
      ODR.playSound( ODR.soundFx.SOUND_QUACK, 0.1 * ODR.config.SOUND_EFFECTS_VOLUME/10, false, 0, 1 );
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
    super.collide( collision );
    ODR.playSound( ODR.soundFx.SOUND_CRASH, ODR.config.SOUND_EFFECTS_VOLUME/10 );
    ODR.playSound( ODR.soundFx.SOUND_BICYCLE, ODR.config.SOUND_EFFECTS_VOLUME/10 );
    return true;
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

    if( this.minX < 1000 && !this.alarmed ) {
      ODR.playSound( ODR.soundFx.SOUND_BICYCLE, 0.1 * ODR.config.SOUND_EFFECTS_VOLUME/10, false, 0, 1 );
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

class Cloud {
  constructor( canvas, type, minX, minY ) {
    this.canvas = canvas;
    this.canvasCtx = this.canvas.getContext('2d');
    this.type = type;
    this.spritePos = {
      x: OnDaRun.spriteDefinition.CLOUD.x,
      y: OnDaRun.spriteDefinition.CLOUD.y[type],
    };
    this.minX = minX;
    this.minY = minY;
    this.removed = false;
    this.timer = ODR.time;
  }

  get maxX(){
    return this.minX + Cloud.config.WIDTH;
  }

  get maxY(){
    return this.minY + Cloud.config.HEIGHTS[ this.type ];
  }

  draw() {

      var sourceWidth = Cloud.config.WIDTH;
      var sourceHeight = Cloud.config.HEIGHTS[ this.type ];

      this.canvasCtx.drawImage(ODR.spriteScene, this.spritePos.x,
        this.spritePos.y,
        sourceWidth, sourceHeight,
        Math.ceil(this.minX), this.minY,
        Cloud.config.WIDTH, Cloud.config.HEIGHTS[this.type]);

  }

  forward( deltaTime, currentSpeed ) {
    if( !this.removed ){

      this.minX -= currentSpeed * FPS / 1000 * deltaTime;
      this.draw();

      // Mark as removeable if no longer in the canvas.
      if( this.minX + Cloud.config.WIDTH < 0 ){
        this.removed = true;
      }
    }
  }

  static get randomCloudGap(){
    return getRandomNum( Cloud.config.MIN_CLOUD_GAP, Cloud.config.MAX_CLOUD_GAP );
  }

  static get randomCloudHeight(){
    return getRandomNum( Cloud.config.MAX_SKY_LEVEL, Cloud.config.MIN_SKY_LEVEL );
  }

  static get randomCloudType(){
    this.cycleType = (this.cycleType + getRandomNum(1,3))%6;
    return this.cycleType;
    //return getRandomNum( 0, OnDaRun.spriteDefinition.CLOUD.y.length - 1 );
  }

}
Cloud.cycleType = 0;

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

    let type = getRandomNum( 0, 2 );
    this.spriteMinX = 200 * this.constructor.cycleType;
    this.constructor.cycleType = (this.constructor.cycleType + getRandomNum(1,3))%6;
    switch( type ){
      case 0:
        this.height = getRandomNum( 75, 100 );
        this.spriteMinY = 0;
        break;
      case 1:
        this.height = getRandomNum( 50, 75 );
        this.spriteMinY = 100;
        break;
      case 2:
        this.height = getRandomNum( 25, 50 );
        this.spriteMinY = 175;
        break;
    }

    this.width = ~~(this.height * (2 + Math.random() * 3));

  }

  get maxX(){
    return this.minX + this.width;
  }

  /*
  draw() {
    this.canvasCtx.save(); {
      let gr = ODR.skyGradientCurrentValues;
      let rgb0x1 = ((1 << 24) + (gr[0] << 16) + (gr[1] << 8) + gr[2]).toString(16).slice(1);
      let rgb0x2 = ((1 << 24) + (gr[3] << 16) + (gr[4] << 8) + gr[5]).toString(16).slice(1);

      this.canvasCtx.fillStyle = '#' + (this.depth == 0 ? rgb0x2 : rgb0x1);
      this.canvasCtx.beginPath();
      this.canvasCtx.moveTo(this.minX, this.minY);
      this.canvasCtx.bezierCurveTo(
        this.minX + this.width/2, this.minY-this.height,
        this.minX + this.width/2, this.minY-this.height,
      this.minX + this.width, this.minY);
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
          this.minX,this.minY - this.height,this.width,this.height);
      } else {
        this.mntCanvas = null;
      }

    } this.canvasCtx.restore();
  }
  */

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

class NightMode {
  constructor( canvas, spritePos, containerWidth ){
    this.spritePos = spritePos;
    this.canvas = canvas;
    this.canvasCtx = canvas.getContext('2d');
    this.minX = containerWidth - 50;
    this.minY = 50;
//      this.nextPhase = NightMode.phases.length - 1;
    this.nextPhase = getRandomNum(0,6);
    this.currentPhase = this.nextPhase;
    this.opacity = 0;
    this.containerWidth = containerWidth;
    this.stars = [];
    this.placeStars();
  }

  forward(activated, delta) {
    // Moon phase.
    if (activated && 0 == this.opacity) {
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
      this.draw();
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
      mx = Math.ceil(this.minX/DEFAULT_WIDTH * (DEFAULT_WIDTH+fw*2) - fw - NightMode.config.MOON_BLUR);
      my = yShift + this.minY - NightMode.config.MOON_BLUR;

      this.canvasCtx.drawImage(this.moonCanvas,
        this.currentPhase * fw, 0,
        fw, fh,
        mx, my,
        fw, fh);
        mx += fw/2;
        my += fh/2;
    } else if (ODR.config.GRAPHICS_MOON == 'NORMAL') {
      mx = Math.ceil(this.minX);
      my = this.minY;
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
          let twinkle = ((star.minX + 2*star.minY)%10)/5;
          twinkle = 0.2
            + 0.8 * (twinkle > 1.0
              ? 2 - twinkle
              : twinkle);
          let alpha = this.opacity * star.opacity * twinkle;
          let dt = Math.abs(star.minX - mx) + Math.abs(star.minY - my) - 50;
            if (dt < 0) dt = 0; else if (dt > 50) dt = 50;

          this.canvasCtx.globalAlpha = alpha * dt/50;
        }

        this.canvasCtx.drawImage(ODR.spriteScene,
          starSourceX, star.sourceY, starSize, starSize,
          Math.ceil(star.minX), star.minY,
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
        minX: getRandomNum(segmentSize * i, segmentSize * (i + 1)),
        minY: getRandomNum(0, NightMode.config.STAR_MAX_Y),
        opacity: 0.5 + 0.5 * Math.random(),
        sourceY: OnDaRun.spriteDefinition.STAR.y + NightMode.config.STAR_SIZE * (i%4),
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

class HorizonLine {
  constructor(canvas, spritePos) {
    this.spritePos = spritePos;
    this.canvas = canvas;
    this.canvasCtx = canvas.getContext('2d');
    this.dimensions = HorizonLine.dimensions;
    this.sourceXPos = [this.spritePos.x, this.spritePos.x +
      this.dimensions.WIDTH];
    this.minX = 0;
    this.minY = HorizonLine.dimensions.YPOS;
    this.bumpThreshold = 0.5;
    this.grMode = -1;


    this.draw();
  }

  generateGroundCache() {
    if (!this.groundCanvas) {
      this.groundCanvas = document.createElement('canvas');
      this.groundCanvas.width = this.dimensions.WIDTH;
      this.groundCanvas.height = 25 * ODR.config.GROUND_WIDTH;
    }
    let ctx = this.groundCanvas.getContext('2d');

    ctx.clearRect(0, 0, this.dimensions.WIDTH, this.groundCanvas.height);
    this.grMode = ODR.config.GRAPHICS_GROUND_TYPE;

    ctx.save();
    ctx.translate(0,25 - DEFAULT_HEIGHT);
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

    this.canvasCtx.drawImage(ODR.spriteScene, ~~-this.minX,
      104,
      600, 46,
      0, 170,
      600, 46);

    if (ODR.config.GRAPHICS_GROUND_TYPE == 'DIRT') return;

    if (ODR.config.GRAPHICS_GROUND_TYPE != this.grMode) {
      this.generateGroundCache();
    }

    this.canvasCtx.drawImage(this.groundCanvas,
        0, 3 * (~~this.minX+1800) % ODR.config.GROUND_WIDTH * 25 + 2,
        DEFAULT_WIDTH, 22,
        0, DEFAULT_HEIGHT - 22,
        DEFAULT_WIDTH, 22);

  }

  forward( deltaTime, screenIncrement ){
    if (ODR.config.GRAPHICS_GROUND_TYPE != 'DIRT') screenIncrement /= 3;

    this.minX += screenIncrement;
    if (-this.minX > 1800) {
      this.minX += 1800;
    }

    this.draw();
  }

  reset() {
    //this.minX[1] = HorizonLine.dimensions.WIDTH;
  }
}

class Horizon {
  constructor( canvas, spritePos, dimensions ){
    this.canvas = canvas;
    this.canvasCtx = this.canvas.getContext('2d');
    this.config = Horizon.config;
    this.dimensions = dimensions;
    this.resetEntities();
    this.obstacleHistory = [];
    this.horizonOffsets = [0, 0];
    this.cloudFrequency = 1.0;
    this.spritePos = spritePos;
    this.nightMode = null;

    this.layerCount = 5;

    this.layers = [];
    for( let i = 0; i < this.layerCount; i++ ){
      this.layers[i] = []; // At some points each layer will be a dedicated object.
    }

    //this.treX = !getRandomNum(0,3) ? 2800 : -20;

    // Horizon
    this.horizonLine = null;
    this.init();
  }

  init() {

    this.horizonLine = new HorizonLine(this.canvas, this.spritePos.HORIZON);
    this.nightMode = new NightMode(this.canvas, this.spritePos.MOON, this.dimensions.WIDTH);

    // We will only initialize clouds.
    // Every 2-layer will be lightly tinted with an atmosphere (sky).

    for( let i = 0; i < this.cloudFrequency * 10; i++ ){
      let x = getRandomNum(-50, DEFAULT_WIDTH*2 );
      this.layers[[0,2,4][getRandomNum(0,2)]].push( new Cloud( this.canvas, Cloud.randomCloudType,
        x, Cloud.randomCloudHeight ));
    }
  }

  growMountain( generator, parent, layer ){
    if( generator.energy > 0 ){
      generator.energy--;

      let distance = parent
        ? parent.minX + getRandomNum( -parent.width, parent.width )
        : DEFAULT_WIDTH + getRandomNum( -250, 250 );

      let mountain = new Mountain( this.canvas, distance );
      let li = [ 1, 3 ][ getRandomNum( 0, 1 )];
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

  forward( deltaTime, currentSpeed, showNightMode, entityExistence) {
    //FIXME Try sorting depth on single scene array.
    /*
    this.forwardClouds(deltaTime, currentSpeed, true);
    this.forwardMountains(deltaTime, currentSpeed);
    */

    let decrement = -currentSpeed * FPS / 1000 * deltaTime;

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
      let x = DEFAULT_WIDTH + getRandomNum(0,600);
      this.layers[[0,2,2,4,4,4][getRandomNum(0,5)]].push( new Cloud( this.canvas, Cloud.randomCloudType,
        x, Cloud.randomCloudHeight ));
    }

    if( numMountains < 10 && maxXMountain < DEFAULT_WIDTH ){
      let generator = { energy: 7, mountains: [], minX: DEFAULT_WIDTH };
      this.growMountain( generator );
      if( generator.minX < DEFAULT_WIDTH ){
        let shift = getRandomNum( 0, 400 ) + DEFAULT_WIDTH - generator.minX;
        generator.mountains.forEach( mountain => {
          mountain[0].minX += shift;
          if( mountain[1] == 3 ) mountain[0].minX *= 1.2;
        });
      }
    }


    //Hack sky tint

    /*
    if (this.treX > -20) {
      this.treX += 0.6 * decrement - 3;
      this.canvasCtx.drawImage(ODR.spriteScene, 0, 22, 20, 22,
        ~~this.treX, 155 + Math.abs(((~~this.treX)>>4)%4 - 2),
        20, 22);
    }
    */

    // Fill atmosphere
    this.canvasCtx.save();
    this.canvasCtx.globalCompositeOperation = 'destination-over';
    this.nightMode.forward(showNightMode,deltaTime);
    ODR.sky.repaint( this.canvasCtx );
    this.canvasCtx.restore();


    this.horizonLine.forward( deltaTime, decrement);

    if( entityExistence == 1 ) {
      this.forwardEntities( deltaTime, currentSpeed, decrement );
    } else if( entityExistence > 0 ) {
      this.canvasCtx.save();
      this.canvasCtx.globalAlpha = entityExistence;
      this.forwardEntities( deltaTime, currentSpeed, decrement );
      this.canvasCtx.restore();
    }

  }

  resetEntities() {
    if( this.entities )
      this.entities.forEach( entity => entity.removed = true );
    this.entities = [];
  }

  addEntity( ...theArgs ) {
    theArgs.forEach( anEntity => {
      if( this.entities.length >= 25 ) {
        console.log('discard', anEntity)
        return;
      }

      this.entities.push( anEntity );
    });
  }

  getSituation( currentSpeed ) {
    //FIXME
    if( ODR.gameMode.key == 'GAME_S'){
      return [
        Obstacle.situation.SituationA,
        Obstacle.situation.SituationB,
        Obstacle.situation.SituationC][getRandomNum(0,2)];
    }

    let x = (currentSpeed - 6) / 7;
    let y = Math.random();
    let situation = Obstacle.situationList.find( situation => this.canvasCtx.isPointInPath( situation.path, x, y ));
    return situation ? situation : Obstacle.situation.Cactus;
  }

  forwardEntities( deltaTime, currentSpeed, decrement ){
    // Obstacles, move to Horizon layer.
    for (let i = 0; i < this.entities.length; i++) {
      this.entities[i].forward( deltaTime, currentSpeed );
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

    // Don't add any obstacle on suspending.
    if( currentSpeed == 0){
      return;
    }

    // Follow the right-most entity when they appear in the scene.
    if( lastEntity ) {

      /*
      for (let i = -2; i <= 2; i+=getRandomNum(1,2)) {
      }
      */

      //return;
      if( lastEntity.maxX < 600 ) {

        // Tangerine
        if( ODR.shouldDropTangerines && N7e.user && !getRandomNum(0,10)){
          ODR.shouldDropTangerines = false;
          ODR.tangerineTimer = 0;
          let tangerine = new Tangerine( this.canvasCtx, DuckType.elevationList[getRandomNum(0,4)]);
          let minGap = Math.round( 50 * currentSpeed + 72 );
          let space = new Space( getRandomNum( minGap, Math.round( minGap * 1.5 )));
          space.ctx = this.canvasCtx;
          tangerine.minX = space.minX + space.width/2 - 25;
          this.addEntity( space, tangerine );
          return;
        }
        /*
        if( this.highestScore < 100 )
        this.entities.push(lastEntity.makeFollower([SmallCactus,LargeCactus][getRandomNum(0,1)], currentSpeed, getRandomNum(500,1500)));
        else
        */
        //this.addEntity(lastEntity.makeFollower(Liver, currentSpeed, 0));
        //this.addEntity(lastEntity.makeFollower(Rubber, currentSpeed, 0));
        //this.addEntity(lastEntity.makeFollower(Rotata, currentSpeed, 1000));
        //this.addEntity(lastEntity.makeFollower(SmallCactus, currentSpeed, 1500));

        let situation = this.getSituation( currentSpeed );
        do { switch( situation ) {
          case Obstacle.situation.Velota: {
            let space = new Space( currentSpeed * 50 );
            space.ctx = this.canvasCtx;
            this.addEntity( space );

            let velota = new Velota( this.canvasCtx, currentSpeed * Velota.speedFactor * (0.8 + Math.random() * 0.2));
            velota.follow( lastEntity, 100, currentSpeed );
            this.addEntity( velota );
          } break;
          case Obstacle.situation.Rotata: {
            let space = new Space( currentSpeed * 60 );
            space.ctx = this.canvasCtx;
            this.addEntity( space );

            let rotata = new Rotata( this.canvasCtx, currentSpeed * Rotata.speedFactor * (0.8 + Math.random() * 0.2));
            rotata.follow( lastEntity, 700, currentSpeed );
            this.addEntity( rotata );
          } break;
          case Obstacle.situation.Rubber: {
            let space = new Space( currentSpeed * 80 );
            space.ctx = this.canvasCtx;
            this.addEntity( space );

            let rubber = Rubber.getRandomObstacle( this.canvasCtx, currentSpeed );
            rubber.follow( lastEntity, 1000, currentSpeed );
            this.addEntity( rubber );
          } break;
          /* Liver */
          case Obstacle.situation.Liver: {
            let space = new Space( currentSpeed * 50 );
            space.ctx = this.canvasCtx;
            this.addEntity( space );

            let liver = Liver.getRandomObstacle( this.canvasCtx, currentSpeed );
            liver.follow( lastEntity, 150, currentSpeed );
            this.addEntity( liver );
          } break;
          case Obstacle.situation.LiverSweeper: {
            let space = new Space( currentSpeed * 100);
            this.addEntity( space );
            space.ctx = this.canvasCtx;

            let ducks = [];
            let glider = [100,50,0,50,100];
            for( let i = 0; i < 5; i += getRandomNum(1,2)) {
              let duck = new Liver( this.canvasCtx, currentSpeed * Liver.speedFactor * (0.9 + Math.random() * 0.1), DuckType.elevationList[i+1]);
              duck.minX = 600;
              duck.follow( lastEntity, glider[i], currentSpeed );
              ducks.push( duck );
            }

            ducks.forEach( duck => this.addEntity( duck ));
          } break;
          case Obstacle.situation.RubberSweeper: {
            let space = new Space( currentSpeed * 100);
            this.addEntity( space );
            space.ctx = this.canvasCtx;

            let ducks = [];
            let glider = [1000,1100,1200,1100,1000];
            for( let i = 0; i < 5; i += getRandomNum(1,2)) {
              let duck = new Rubber( this.canvasCtx, currentSpeed * Rubber.speedFactor * (0.9 + Math.random() * 0.1), DuckType.elevationList[i+1]);
              duck.minX = 600;
              duck.follow( lastEntity, glider[i], currentSpeed );
              ducks.push( duck );
            }

            ducks.forEach( duck => this.addEntity( duck ));
          } break;
          /* Extra */

          case Obstacle.situation.SituationA: {
            console.log('A')
            let space = new Space( currentSpeed * 300 );
            space.follow( lastEntity, 0, currentSpeed );
            this.addEntity( space );
            space.ctx = this.canvasCtx;

            let cactus = [SmallCactus,LargeCactus][getRandomNum(0,1)].getRandomObstacle( this.canvasCtx, currentSpeed );
            cactus.follow( lastEntity, 150, currentSpeed );
            this.addEntity( cactus );

            cactus = [SmallCactus,LargeCactus][getRandomNum(0,1)].getRandomObstacle( this.canvasCtx, currentSpeed );
            cactus.follow( lastEntity, getRandomNum(1000,1000), currentSpeed );
            this.addEntity( cactus );

            let velota = new Velota( this.canvasCtx, currentSpeed * Velota.speedFactor * (0.8 + Math.random() * 0.2));
            velota.follow( lastEntity, 1500, currentSpeed );
            this.addEntity( velota );

            cactus = [SmallCactus,LargeCactus][getRandomNum(0,1)].getRandomObstacle( this.canvasCtx, currentSpeed );
            cactus.follow( velota, 600, currentSpeed );
            this.addEntity( cactus );

            cactus = [SmallCactus,LargeCactus][getRandomNum(0,1)].getRandomObstacle( this.canvasCtx, currentSpeed );
            cactus.follow( velota, getRandomNum(1500,1500), currentSpeed );
            this.addEntity( cactus );

            let rotata = Rotata.getRandomObstacle( this.canvasCtx, currentSpeed );
            rotata.follow( velota, 1700, currentSpeed );
            this.addEntity( rotata );

          } break;

          case Obstacle.situation.SituationB: {
            console.log('B')
            let space = new Space( currentSpeed * 150 );
            space.follow( lastEntity, 0, currentSpeed );
            this.addEntity( space );
            space.ctx = this.canvasCtx;

            let cactusA = [SmallCactus,LargeCactus][getRandomNum(0,1)].getRandomObstacle( this.canvasCtx, currentSpeed );
            cactusA.follow( lastEntity, 500, currentSpeed );
            this.addEntity( cactusA );

            let liver = new Liver( this.canvasCtx, currentSpeed * Liver.speedFactor * (0.9 + Math.random() * 0.1), DuckType.elevationList[1]);
            liver.follow( cactusA, 400, currentSpeed );
            this.addEntity( liver );

            if( getRandomNum( 0, 1 )) {
              liver = new Liver( this.canvasCtx, currentSpeed * Liver.speedFactor * (0.9 + Math.random() * 0.1), DuckType.elevationList[2]);
              liver.follow( cactusA, 430, currentSpeed );
              this.addEntity( liver );
            } else {
              liver = new Liver( this.canvasCtx, currentSpeed * Liver.speedFactor * (0.9 + Math.random() * 0.1), DuckType.elevationList[0]);
              liver.follow( cactusA, 430, currentSpeed );
              this.addEntity( liver );
            }

            let rubber = new Rubber( this.canvasCtx, currentSpeed * Rubber.speedFactor * (0.9 + Math.random() * 0.1), DuckType.elevationList[5]);
            rubber.follow( liver, 0, currentSpeed );
            this.addEntity( rubber );

            let cactusB = new SmallCactus( this.canvasCtx, 0, 1);
            cactusB.follow( cactusA, 1200 , currentSpeed );
            this.addEntity( cactusB );

          } break;

          case Obstacle.situation.SituationC: {
            console.log('C')
            let i,cactus;
            for( i = 0; i < 8; i++) {
              cactus = new SmallCactus( this.canvasCtx, 0, getRandomNum(1,3));
              cactus.follow( lastEntity, i * 550 , currentSpeed );
              this.addEntity( cactus );
            }

            let space = new Space( currentSpeed * 100 );
            space.follow( cactus, 0, currentSpeed );
            space.ctx = this.canvasCtx;
            this.addEntity( space );
          } break;

          case 13: {
            let cactus = [SmallCactus,LargeCactus][getRandomNum(0,1)].getRandomObstacle( this.canvasCtx, currentSpeed );
            this.addEntity( cactus );
          } break;

          /* Single Cactus */
          case Obstacle.situation.Cactus:
          default: {
            let cactus = [SmallCactus,LargeCactus][getRandomNum(0,1)].getRandomObstacle( this.canvasCtx, currentSpeed );
            let minGap = Math.round(cactus.width * currentSpeed + 72);
            let space = new Space( getRandomNum( minGap, Math.round( minGap * 1.5 )));
            space.ctx = this.canvasCtx;
            cactus.minX = space.minX + space.width/2 - cactus.width/2;
            this.addEntity( space, cactus );
          } break;

        } break; } while( true );

      }
    } else {
      /* Create an initial leader */
      let space = new Space( 1 );
      this.addEntity( space );
    }

  }

  reset() {
    this.resetEntities();
    this.horizonLine.reset();
    this.nightMode.reset();
  }

  resize(width, height) {
    this.canvas.width = width;
    this.canvas.height = height;
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

    this.minX = 0;
    this.minY = 0;
    this.width = 40;
    this.height = 40;

    // Position when on the ground.
    this.groundMinY = 0;

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
    this.groundMinY = DEFAULT_HEIGHT - this.config.HEIGHT -
      ODR.config.BOTTOM_PAD;
    this.minY = this.groundMinY;
    this.minJumpHeight = this.groundMinY - this.config.MIN_JUMP_HEIGHT;

    /*
    this.currentAnimFrames = A8e.animFrames.WAITING.frames;
    this.currentSprite = A8e.animFrames.WAITING.sprite;
    this.currentFrame = 0;

    this.draw(0, 0);
    */

    // For collision testings
    this.hitTestA = new CollisionBox();
    this.hitTestB = new CollisionBox();
  }

  get collisionBoxes() {
//    switch (this.status) {
    switch (ODR.activeAction.type) {
      case A8e.status.SLIDING:
        return A8e.collisionBoxes.SLIDING

      case A8e.status.RUNNING:
      default:
        return A8e.collisionBoxes.RUNNING;
    }
  }

  hitTest(obstacle) {
    let retA = this.hitTestA;
    let retB = this.hitTestB;

    // TODO maintain a union box per collision set.
    retA.minX = this.minX;
    retA.minY = this.minY;
    retA.width = this.width;
    retA.height = this.height;

    retB.minX = obstacle.minX;
    retB.minY = obstacle.minY;
    retB.width = obstacle.width;
    retB.height = obstacle.height;

    // Simple outer bounds check.
    if (retA.intersects(retB)) {
      let boxesA = this.collisionBoxes;
      let boxesB = obstacle.collisionBoxes;

      // Detailed axis aligned box check.
      for (var j = 0; j < boxesA.length; j++) {
        retA.minX = boxesA[j].minX + this.minX;
        retA.minY = boxesA[j].minY + this.minY;
        retA.width = boxesA[j].width;
        retA.height = boxesA[j].height;

        for (var i = 0; i < boxesB.length; i++) {
          retB.minX = boxesB[i].minX + obstacle.minX;
          retB.minY = boxesB[i].minY + obstacle.minY;
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
                ret.minX += obstacle.minX;
                ret.minY += obstacle.minY;
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

  draw(x, y) {
    console.trace();
    var sourceX = x * 2;
    var sourceY = y * 2;

    // Adjustments for sprite sheet position.
    sourceX += this.spritePos.x;
    sourceY += this.spritePos.y;

    if (this.currentSprite) {

      this.canvasCtx.drawImage(this.currentSprite,
        sourceX, sourceY, this.width, this.height,
        ~~this.minX, ~~this.minY, this.width, this.height);

      if (ODR.config.GRAPHICS_DUST != 'NONE') this.dust.draw();

    }
  }

  activateAction(action, deltaTime, speed) {
    console.assert(action && action.priority != -1, action);

    let adjustXToStart = () => {
      if (this.minX < this.config.START_X_POS) {
        this.minX += 0.2 * speed * (FPS / 1000) * deltaTime;
        if (this.minX > this.config.START_X_POS) {
          this.minX = this.config.START_X_POS;
        }
      } else if (this.minX > this.config.START_X_POS) {
        this.minX -= 0.2 * speed * (FPS / 1000) * deltaTime;
        if (this.minX < this.config.START_X_POS) {
          this.minX = this.config.START_X_POS;
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
        if (action.heldStart) {
          if (action.timer - action.heldStart > 450) action.heldStart = action.timer - 450;
          action.currentFrame = 72 + ~~((action.timer - action.heldStart)/150);
        } else if (!IS_MOBILE){
          //let xMap = [2,1,-2,-3,-2,1], yMap = [1,0,-2,-2,-2,0];
          let yMap = [0,2,3,2,0];
          this.canvasCtx.drawImage(ODR.spriteGUI, 0, 96, 105, 54,
            Math.round(this.minX + 20),
            Math.round(this.minY + yMap[(action.timer>>7)%5] - 50), 105, 54);
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
          ODR.playSound( ODR.soundFx.SOUND_JUMP, ODR.config.SOUND_EFFECTS_VOLUME/10 );
          ODR.playSound( ODR.soundFx.SOUND_DROP,
            action.pressDuration/ODR.config.MAX_ACTION_PRESS
            * ODR.config.SOUND_EFFECTS_VOLUME/10 );
        }

        let timer = action.halfTime - action.timer;

        adjustXToStart();
        this.minY = this.groundMinY
          + ( this.config.GRAVITY_FACTOR * timer * timer
              - action.top * ODR.config.SCALE_FACTOR );

        if (timer - 30 < -action.halfTime && !action.playedDrop ) {
          ODR.playSound( ODR.soundFx.SOUND_DROP,
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

        if (action.distance == 0 && increment > 0) {
          ODR.playSound( ODR.soundFx.SOUND_SLIDE, ODR.config.SOUND_EFFECTS_VOLUME/10 );
        }

        action.distance += increment;

        let it = action.fullTime - action.timer/1000;
          if (it < 0) it = 0;
        let distance = action.fullDistance - 1/2 * it * it * action.friction - action.distance;

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
          if (this.minX < this.config.START_X_POS) {
            this.minX = this.config.START_X_POS;
          }
        }
      } break;
      case A8e.status.CRASHED: {
        if (ODR.config.GRAPHICS_DISPLAY_INFO == 'YES') {
          this.canvasCtx.save();
          this.canvasCtx.strokeStyle = "orange";
          action.boxes.A.forEach( b => this.canvasCtx.strokeRect(...Object.values(b)));
          this.canvasCtx.strokeStyle = "lime";
          action.boxes.B.forEach( b => this.canvasCtx.strokeRect(...Object.values(b)));
          this.canvasCtx.fillStyle = this.canvasCtx.strokeStyle = "red";
          this.canvasCtx.fillRect(...Object.values(action.boxes.C.copy.grow(1)));
          this.canvasCtx.restore();
        }

        let timer = action.halfTime - action.timer;

        action.currentFrame = action.dir == 1 ? 2 : 0;
        if (action.timer > 25) action.currentFrame++;

        this.minY = action.crashedMinY
          + ( this.config.GRAVITY_FACTOR/2 * timer * timer
              - action.top * ODR.config.SCALE_FACTOR );
        this.minX += deltaTime/10 * action.dir;

        // Drag the scene slower on crashing.
        ODR.setSpeed(Math.max(0, action.lagging * (3000-action.timer)/3000));
      } break;
      default:;
    }

    this.canvasCtx.drawImage(action.sprite,
      action.frames[action.currentFrame], 0, 40, 40,
      ~~this.minX, ~~this.minY,
      this.config.WIDTH, this.config.HEIGHT);

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

  drawJumpingGuide(action, now, speed) {
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

        if (drawX < this.minX + 20 && drawY > baseY - 60 ) {
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

    let baseX = this.minX;
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
        ~~(baseX + action.fullDistance - i * 30 *alpha) - s*s, this.groundMinY,
        this.config.WIDTH, this.config.HEIGHT);
    }

    this.canvasCtx.restore();
  }

  reset() {
    this.minY = this.groundMinY;
    this.minX = -40;// this.config.START_X_POS;
    this.dust.reset();

    let endTime = getTimeStamp();
    let startingSlide = new SlideAction(endTime - ODR.config.MAX_ACTION_PRESS, 7.2);
    startingSlide.priority = 1;
    //FIXME playCount is used for deciding if it should draw guides or not at start.
    startingSlide.start = ODR.gameOverPanel ? true : false;
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
    new CollisionBox(13, 12, 15, 19),
    new CollisionBox(11, 25, 17, 12),
    new CollisionBox(28, 32, 5, 5)
  ],
  RUNNING: [
    new CollisionBox(18, 4, 15, 19),
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

class Text {
  static initialize(){
    this.generateSymbolMap();
  }

  constructor( maxLength = 20, alignment = -1, text ){
    this.glyphs = null;
    this.alignment = alignment;
    this.maxLength = maxLength;
    this.minLength = 0;
    this.numberOfLines = 0;
    if (text) {
      this.setText(text);
    }
  }

 /**
  * Text
  * Map for substitute symbol codes.
  */
  static generateSymbolMap(){
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
    ].forEach( sym =>
      this.symbolMap.push({
        char: String.fromCharCode( sym[ 1 ]),
        regex: new RegExp( sym[ 0 ], 'g' ),
      })
    );
  }

  //TODO Consider a rewrite to use word-breaker
  setText( messageStr ){

    if( !messageStr ){
      this.glyphs = null;
      this.numberOfLines = 0;
      this.minLength = 0;
      return this;
    }

    for( let i = 0; i < Text.symbolMap.length; i++ ){
      if( messageStr.includes('#')){
        let symbol = Text.symbolMap[ i ];
        messageStr = messageStr.replace( symbol.regex, symbol.char );
      } else break;
    }

 //TODO multi-widths,multi-offsets
    let lineLength = this.maxLength;
    let wordList = messageStr.toString().split(' ');
    let newList = [wordList[0]];
    this.minLength = Math.max(wordList[0].length,this.minLength);
    this.numberOfLines = 1;

    for (let i = 1, cur = wordList[0].length ; i < wordList.length ; i++) {
      let words = wordList[i].split('\n');

      words.forEach((w,index) => {
        if (cur == 0 && w.length) {
          /* 0st word */
          if (index) {
            newList.push('\n');
            this.numberOfLines++;
          }
        } else if (cur + 1 + w.length > lineLength) {
          cur = 0;
          newList.push('\n');
          this.numberOfLines++;
        } else if (index) {
          newList.push('\n');
          this.numberOfLines++;
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
        case ';': return 728;
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

  draw( canvasCtx, offsetX, offsetY, glyphW = 14, glyphH = 20, image = ODR.spriteGUI ) {
    if( !this.glyphs ) return;

    switch (this.alignment) {
      case 0:
      case 1:
        offsetX += glyphW*( this.maxLength - this.minLength )/2;

        for (let i = 0, cur = 0, l = 0; i <= this.glyphs.length; i++) {
          if (i != this.glyphs.length-1 && this.glyphs[i] != -10 ) {
            continue;
          }

          let len = i - cur;
          let lineStart = cur;
          let lineOffset = this.alignment
            ? this.minLength - len
            : (this.minLength - len) >> 1;
          while( cur < this.glyphs.length && cur <= i ) {
            let g = this.glyphs[cur];
            if( g == -10 ) {
              cur++;
              break;
            }
            canvasCtx.drawImage(image,
              g, 0, 14, 16,
              ~~offsetX + (cur - lineStart + lineOffset) * glyphW,
              offsetY + glyphH * l,
                14, 16);
            cur++;
          }
          l++;
        }
        break;

      case -1:
      default:
        for (let i = 0, cur = 0, l = 0; i < this.glyphs.length; i++) {
          let g = this.glyphs[i];
          if (g == -10) {
            cur = 0;
            l++;
            continue;
          }
          canvasCtx.drawImage(image,
            g, 0, 14, 16,
            ~~offsetX + cur * glyphW,
            offsetY + glyphH * l,
              14, 16);
          cur++;
        }
    }

  }

  drawText(messageStr, canvasCtx, offsetX, offsetY, glyphW, glyphH, image) {
    this.setText(messageStr);
    this.draw(canvasCtx, offsetX, offsetY, glyphW, glyphH, image);
  }
}
Text.initialize();

/**
 * TODO
 * - Use priority. When 2 or more messages are overlapped, a lower one will be discarded.
 * - Multi-layers so we can push & pop back to the previous state, cancelling all in the current state.
 */

class Message {
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
    this.text = new Text( 600/14, 0 );
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
    this.text.setText('');
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
        this.text.setText( msg.string );
      }
    }

    if( this.endTime < this.timer ){
      this.text.setText('');
      this.endTime = Infinity;
    }

    this.text.draw( this.canvasCtx, this.minX, this.minY );
  }
}

class Notifier {
  constructor( canvas ){
    this.canvas = canvas;
    this.canvasCtx = canvas.getContext('2d');
    this.minY = 5;
    this.timer = 0;
    this.init();
    this.text = new Text(20);
  }

  init() {
    this.opacity = 0;
  }

  notify( messageStr, timer, opt_lineWidth ){
    this.timer = timer || 2000;
    this.text.setText( messageStr );
  }

  forward( deltaTime ) {
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
    this.minX = 0;
    this.minY = 5;

    this.maxScore = 0;
    this.highScore = 0;
    this.container = null;

    this.digits = [];
    this.achievement = 0;
    this.defaultString = '';
    this.flashTimer = 0;
    this.flashIterations = 0;
    this.invertTrigger = false;

    this.config = DistanceMeter.config;
    this.maxScoreUnits = this.config.MAX_SCORE_UNITS;
    this.init(canvasWidth);
  }

  init(width) {
    var maxDistanceStr = '';

    this.calcXPos(width);
    this.maxScore = this.maxScoreUnits;
    this.achievement = this.config.ACHIEVEMENT_SCORE;
    for (var i = 0; i < this.maxScoreUnits; i++) {
      this.draw(i, 0);
      this.defaultString += '0';
      maxDistanceStr += '9';
    }

    this.maxScore = parseInt(maxDistanceStr);
  }

  calcXPos(canvasWidth) {
    this.minX = canvasWidth - (DistanceMeter.dimensions.DEST_WIDTH *
      (this.maxScoreUnits + 1));
  }

  draw(digitPos, value, opt_highScore) {
    var sourceWidth = DistanceMeter.dimensions.WIDTH;
    var sourceHeight = DistanceMeter.dimensions.HEIGHT;
    var sourceX = DistanceMeter.dimensions.WIDTH * value;
    var sourceY = 0;

    var targetX = digitPos * DistanceMeter.dimensions.DEST_WIDTH + DistanceMeter.dimensions.DEST_WIDTH/2;
    var targetY = this.minY;
    var targetWidth = DistanceMeter.dimensions.WIDTH;
    var targetHeight = DistanceMeter.dimensions.HEIGHT;

    sourceX += this.spritePos.x;
    sourceY += this.spritePos.y;

    this.canvasCtx.save();

    if (opt_highScore) {
      // Left of the current score.
      var highScoreX = this.minX - (this.maxScoreUnits * 2) *
      DistanceMeter.dimensions.WIDTH;
      this.canvasCtx.translate(highScoreX, this.minY);
    } else {
      this.canvasCtx.translate(this.minX, this.minY);
    }

    this.canvasCtx.drawImage(this.image, sourceX, sourceY,
      sourceWidth, sourceHeight,
      targetX, targetY,
      targetWidth, targetHeight
    );

    this.canvasCtx.restore();
  }

  forward( deltaTime, score ) {
    var paint = true;
    var playSound = false;

    //FIXME WHY MAX?
    if( score > this.maxScore && this.maxScoreUnits ==
        this.config.MAX_SCORE_UNITS ){
      this.maxScoreUnits++;
      this.maxScore = parseInt( this.maxScore + '9');
    }

    // Achievement
    if( !this.flashIterations && score > this.achievement ){
      this.flashIterations = this.config.FLASH_ITERATIONS;
      this.achievement += this.config.ACHIEVEMENT_SCORE;
      this.flashTimer = 0;
      playSound = true;
    }

    if( this.flashIterations ){
      this.flashTimer += deltaTime;
      if( this.flashTimer > this.config.FLASH_DURATION ){
        this.flashTimer-= this.config.FLASH_DURATION;
        this.flashIterations--;
      }
    } else {
      let distanceStr = ( this.defaultString + score )
      .substr(-this.maxScoreUnits );
      this.digits = distanceStr.split('');
    }


    // Draw the digits if not flashing.
    if(( this.flashIterations & 1 ) == 0 ){
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

  setHighScore( score ) {
    let highScoreStr = ( this.defaultString + score ).substr(-this.maxScoreUnits );
    this.highScore = ( N7e.user ? ['','62',''] : ['17', '18', '']).concat( highScoreStr.split(''));
  }

  reset() {
    this.forward(0);
    this.achievement = this.config.ACHIEVEMENT_SCORE;
  }
}

DistanceMeter.dimensions = {
  WIDTH: 14,
  HEIGHT: 14,
  DEST_WIDTH: 16
};

DistanceMeter.config = {
  MAX_SCORE_UNITS: 5,
  ACHIEVEMENT_SCORE: 100,
  FLASH_DURATION: 1000 / 4,
  FLASH_ITERATIONS: 3
};

class Panel {
  constructor( canvas, associatedButton = null ) {
    this.canvas = canvas;
    this.canvasCtx  = canvas.getContext('2d');
    this.submenu = null;
    this.passthrough = false;
    this.associatedButton = associatedButton;
    this.buttonUpTime = [ 0, 0 ];
    this.willEnter = false; //Indicate double-pressed.
    this.offset = 0;
    this.timer = 0;
  }

  forward( deltaTime ){
    this.timer += deltaTime;
  }

/**
 * Panel event handler.
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
            this.willEnter = this.buttonUpTime[ 1 ] ? true : false;
            this.buttonUpTime[ 0 ] = this.timer;
          } break;

          case ODR.consoleButtons.CONSOLE_RIGHT:{
            this.willEnter = this.buttonUpTime[ 0 ] ? true : false;
            this.buttonUpTime[ 1 ] = this.timer;
          } break;

          default:
            return false;
        }
      } break;

      case OnDaRun.events.CONSOLEUP: {
        let button = e.detail.consoleButton;
        switch( button ){
          case ODR.consoleButtons.CONSOLE_LEFT:{
            if( this.buttonUpTime[ 0 ]){
              this.buttonUpTime[ 0 ] = 0;
              if( !this.willEnter )
                this.offset--;
            }
          } break;

          case ODR.consoleButtons.CONSOLE_RIGHT:{
            if( this.buttonUpTime[ 1 ]){
              this.buttonUpTime[ 1 ] = 0;
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
    this.ender = 0;
    this.dataReadyTime = 0;

    this.story = [
      new Text(600/14 - 3,-1,
`Friends, allow me to tell you a story, A tale of a young maiden named Amandarine, who was born in a small village called Mandarina.

In the unfortunate beginning, Amandarine was unhealthy from birth. Her family had been trying all kinds of treatments, but her condition didn't improve. She had to endure suffering from the cruel birth defect throughout her childhood. The doctor had warned that her condition would be life-threatening by anytime.

But despite her illness, the baby had still been growing and growing up, until the day of her 18th birthday...` ),

      new Text(600/14 - 3,-1,
`That morning, Amandarine was having her custard bread. She then heard the sound of someone playing the ukulele while singing a song she had never heard before. She looked out the window and saw a man, a street performer, maybe; who was walking pass by until suddenly stumbled upon the rock and fell abjectly.

She hurried out to see him and found him cringing, rubbing his little toe. He was still groaning faintly in pain as he looked back at her. Or he didn't look at her actually, he looked at the half-eaten loaf of bread she took with her...` ),

      new Text(600/14 - 3,-1,
`Warm sunlight was teasing the cold breeze that was blowing gently. The birds chirping in the morning reminded her that this man must definitely be hungry. She, therefore, gave him the remaining bread. He smiled with gratitude and started eating the bread happily.

Once finished, that was very soon after, he looked at Amandarine and said that telling from her facial skin and eye reflections, he could notice many signs of her dreadful health in which she nodded affirmatively.

...In fact, he continued, he was a doctor from China called Lu Ji. Then he asked for her wrist so he could make a further diagnosis.

After learning the pulses for a few breathes, Lu Ji told her that her disease, though very serious, had a cure.

That got all of her attention and she started listening to him intensely. He didn't say any more word but picked up a dried orange from his ragged bag; a dried tangerine would be more precise.` ),

      new Text(600/14 - 3,-1,
`Saying that he must have fled his hometown, for he had stolen this very tangerine from a noble. The dried brownish fruit was called "The 8th Heaven Supremacy"; it could cure her illness, he explained and asked her to accept it.

He said that she should boil it in ginger juice to create one adequate medicine for living longer but for her to be fully recovered its seeds must be planted in eight continents and she should have kept eating each kind of them afterwards until cured.

Amandarine cried with tears of joy as she was thanking him. Lu Ji smiled, stood up and brushed the dust off his legs repeatedly. He didn't even say goodbye when he started playing the ukulele, singing this song, walking away.` ),

      new Text(600/14 - 3,-1,
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
♬ Natherine ♬` ),

      new Text(600/14 - 3,0,
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

Dusita Kitisarakulchai
..as the inspiration..

and some of her particular
supporters / fanpages
for buzzing about it.

You can also support this project by making donations to
the Thai Redcross Society #redcross

`
        ),
    ];

    this.imgLoadCounter = 0;
    this.storyPhotos = [];

    this.msPerLine = 2250;

    let clock = 3000;
    this.photoTiming = [
      [0,0, 30,33,1,215,411,1.5],
      [0,0, 27,355,1,73,151,1.2],
      [0,0, 29,26,1,26,358,1.2],
      [0,0, 23,350,1,27,24,1],
      [0,0, 62,244,1,12,160,0.5],
      [0,0, 100,237,1,100,237,1.0],
    ];
    for( let i = 0; i < this.story.length; i++) {
      //this.story[i] = new Text(600/14 - 3,-1).setText(this.story[i]);
      this.photoTiming[i][0] = clock;
      clock += 20000 + this.story[i].numberOfLines * this.msPerLine;
      this.photoTiming[i][1] = clock;
    }

    //console.log(Liver.collisionFrames[0]===Liver.collisionFrames[1])
  }

  loadImages() {
    for( let i = 0; i < this.story.length; i++  ) {
      this.storyPhotos[i] = new Image();

      if (i == this.story.length - 1)
        this.storyPhotos[i].src = `assets/console/console.png`;
      else this.storyPhotos[i].src = `assets/story/amandarine-story-${i+1}.jpg`;

      this.storyPhotos[i].addEventListener('load', () => {
        this.imgLoadCounter++;
        if (this.imgLoadCounter == this.story.length) {
          this.dataReadyTime = this.timer;
        }
      });
    }
  }

  handleEvent( e ){
    if( this.dataReadyTime && !this.ender ){
      this.ender = this.timer;
      ODR.sky.setShade( ODR.config.SKY.DAY, 3000 );
      ODR.loadSounds();
    }
    return true;
  }

/**
 * TitlePanel forward.
 * @param {number} deltaTime - duration since last call.
 * @return {Panel} - a subsitute or null.
 */
  forward( deltaTime ) {

    ODR.sky.forward( deltaTime, this.canvasCtx );

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

      this.canvasCtx.save();
      this.canvasCtx.translate(0,40+runout/5);
      ODR.horizon.horizonLine.draw();
      this.canvasCtx.restore();

      if (ODR.soundFx.SOUND_SCORE && runout < -200) {
        ODR.music.load('offline-intro-music', ODR.config.PLAY_MUSIC );
        let defaultAction = new DefaultAction(1);
        defaultAction.setX = -100;
        ODR.queueAction(defaultAction);
        ODR.shouldAddObstacle = true;
        ODR.checkShouldDropTangerines();
        ODR.shouldIncreaseSpeed = true;
        ODR.playSound( ODR.soundFx.SOUND_SCORE, ODR.config.SOUND_SYSTEM_VOLUME/10 );

        if( N7e.signing.progress ){
          return new WaitingPanel( this.canvas, () => N7e.signing.progress );
        }

        ODR.introScriptTimer = 20000;
        return null;
      }

    }

    /* A AMANDARINE FRONTIER */
    this.canvasCtx.drawImage(ODR.spriteGUI,
      148,15,208,85,
      300-120 + 21,
      ~~(3 + runout * 1.1),
      208,85);
    /* BB REDHAND */
    this.canvasCtx.drawImage(ODR.spriteGUI,
      125,100,37,30,
      300-120 + 41 + Math.round(factorB),
      ~~(80 + 6 * factorB + runout * 1.2),
      37,30);
    /* B AMANDARINE */
    this.canvasCtx.drawImage(ODR.spriteGUI,
      368,115,162,133,
      300-120 + 37 + Math.round(factorC),
      ~~(20 + 3 * factorB + runout * 1.35),
      162,133);
    /* C ONDARUN */
    this.canvasCtx.drawImage(ODR.spriteGUI,
      127,175,241,75,
      300-120 + 0,
      Math.round(100 + runout * 1.38),
      241,75);
    /* D TANGERINE */
    this.canvasCtx.drawImage(ODR.spriteGUI,
      368,16,99,97,
      300-120 + 121 - Math.round(2 * factorC),
      ~~(30 + 2 * factorD + runout * 1.4),
      99,97);

    let total = (ODR.music.songs['offline-intro-music'].progress + ODR.music.songs['offline-play-music'].progress) * 50;
    if (total < 100) {
      new Text(600/14,0).drawText("loading data:"+total.toFixed(0)+"%", this.canvasCtx,0,180);
    } else {
      if (this.timer < 15000) {
        new Text(600/14,0).drawText("Amandarine Frontier: On Da Run 1.0 RC5", this.canvasCtx,0,180-Math.min(0,runout));
      } else {
        if (IS_MOBILE)
          new Text(600/14,0).drawText("press #slide/#jump to continue.", this.canvasCtx,0,180-Math.min(0,runout));
        else
          new Text(600/14,0).drawText("press a button to continue.", this.canvasCtx,0,180-Math.min(0,runout));
      }

      if (!this.dataReadyTime) {
        this.dataReadyTime = this.timer;
        this.loadImages();
      }

      let storyStartOffset = 18000;
      let fadingTime = 2000;
      if (this.imgLoadCounter == this.story.length && this.timer - this.dataReadyTime > storyStartOffset) {
      this.canvasCtx.save();

        let storyTimer = this.timer - this.dataReadyTime - storyStartOffset;
        this.canvasCtx.globalAlpha = Math.max(0, Math.min(1, storyTimer/2000))
          * Math.max(0, Math.min(1, (this.photoTiming[this.story.length-1][1] + 2000 - storyTimer)/2000));
        this.canvasCtx.drawImage(ODR.consoleImage, 100, 237, 600, 200, 0, 0, 600,200);

        this.photoTiming.forEach(([beginTime,endTime,beginX,beginY,beginSize,endX,endY,endSize],index) => {
          if (storyTimer > beginTime && storyTimer < endTime) {

            beginTime = storyTimer - beginTime;
            endTime = endTime - storyTimer;

            let ratio = beginTime / (beginTime + endTime);
            let offsetX = beginX + (endX - beginX) * ratio;
            let offsetY = beginY + (endY - beginY) * ratio;
            let size = beginSize + (endSize - beginSize) * ratio;

            this.canvasCtx.save(); {

              this.canvasCtx.scale(size,size);
              this.canvasCtx.translate(-offsetX,-offsetY);
              this.canvasCtx.globalAlpha = 0.70
                * Math.max(0,Math.min(1, beginTime/fadingTime))
                * Math.max(0,Math.min(1, endTime/fadingTime));
              this.canvasCtx.drawImage(this.storyPhotos[index],0,0);

            } this.canvasCtx.restore();

            this.canvasCtx.globalAlpha =
              Math.max(0,Math.min(1, beginTime/fadingTime))
              * Math.max(0,Math.min(1, endTime/fadingTime));
            this.story[index].draw(this.canvasCtx,25,~~(200-beginTime/(this.msPerLine/20))); //20 is the default glyph height.
          }
        });

      this.canvasCtx.restore();
      }

    }

    return this;
  }
}

class WaitingPanel extends Panel {
  constructor( canvas, progressingCallback ) {
    super( canvas );
    this.progressingCallback = progressingCallback;
    this.timer = 0;
    this.bottomText = new Text(600/14,0).setText("signing in..please wait");
  }

  forward( deltaTime ) {
    this.timer += deltaTime;
    this.canvasCtx.drawImage( ODR.consoleImage, 100, 237, 600, 200, 0, 0, 600, 200 );
    this.canvasCtx.drawImage( ODR.spriteGUI,
      38 + ~~(this.timer/100)%4 * 22, 73, 22, 22,
      300-11, 100-11, 22, 22 );
    this.bottomText.draw(this.canvasCtx,0,180);
    return this.progressingCallback() ? this : null;
  }

  handleEvent( e ){
    return true;
  }
}

class Menu extends Panel {
  constructor( canvas, model, associatedButton, muted = false ) {
    super( canvas );
    this.model = model;
    this.associatedButton = associatedButton;
    this.displayEntry = this.model.currentIndex = this.model.currentIndex  || 0;
    this.xOffset = 0;
    this.yOffset = 0;
    this.bottomText = new Text(600/14,0).setText('press both #slide+#jump to select');
    this.text = new Text(100);
    this.timer = 0;
    this.muted = muted;
  }

  handleEvent( e ){
    if( this.submenu && this.submenu.handleEvent ){
      return this.submenu.handleEvent( e );
    }

    // Only handle known event types, default to passing the event back to the parent.
    return super.handleEvent( e );
  }

  forward( deltaTime, depth ) {
    this.timer += deltaTime;

    if( this.offset ){

      if( !this.muted )
        ODR.playSound( ODR.soundFx.SOUND_BLIP, ODR.config.SOUND_SYSTEM_VOLUME/10 );

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
    if( this.willEnter && 0 == this.buttonUpTime[ 0 ] && 0 == this.buttonUpTime[ 1 ]){
      this.willEnter = false;

      let entry = this.model.entries[ this.model.currentIndex ];

      if( entry.disabled || ( entry.hasOwnProperty('value') && !entry.options )){
        ODR.playSound( ODR.soundFx.SOUND_ERROR, ODR.config.SOUND_SYSTEM_VOLUME/10 );
      } else {
        ODR.playSound( ODR.soundFx.SOUND_SCORE, ODR.config.SOUND_SYSTEM_VOLUME/10 );

        // The choosen entry has "options". Create a submenu.
        if (entry.options) {
          this.model.enter(this.model.currentIndex, entry);

          let subEntries;
          if (entry.options.hasOwnProperty('min')) {
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

          this.submenu = new Menu( this.canvas, {
            name: entry.name,
            title: entry.title,
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
              if (!selectedItem.exit) {
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
              if( this.associatedButton == ODR.consoleButtons.CONSOLE_A )
                ODR.music.stop();
              this.submenu = null;
            },
          }, this.associatedButton, entry.muted  );

          this.submenu.xOffset = this.xOffset + 25;
          this.submenu.yOffset = this.yOffset + 8;
          this.submenu.bottomText = null;

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

      let tt = ODR.gameModeTotalScore;
      if( tt ){
        let totalScore = tt.toString() + ' #trophy' ;
        this.text.setText( totalScore ).draw(
          this.canvasCtx,
          590 - 14 * (totalScore.length - 6), 120);

      }

      if( ODR.totalTangerines ){
        let maxPerDay = Math.max( 1, ~~(tt/100));
        let totalTangerines = ODR.totalTangerines + `[${ODR.dailyTangerines}/${maxPerDay}]` + ' #tangerine';
        this.text.setText( totalTangerines ).draw(
          this.canvasCtx,
          590 - 14 * (totalTangerines.length - 9), 140);
      }


      if( N7e.user.nickname ) {
          this.text.setText( N7e.user.nickname + {
              ['google.com']:' #google',
              ['facebook.com']:' #facebook',
              ['twitter.com']:' #twitter',
            }[this.model.provider]).draw(
            this.canvasCtx,
            562 - 14 * N7e.user.nickname.length, 100);
      }

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
      this.canvasCtx.globalAlpha = /*(entry.disabled ? 0.5 : 1) **/ Math.max(0.1,(4 - xxx)/4);
      if (entry.hasOwnProperty('value')) title += '.'.repeat(32-title.length-(entry.value+'').length)+'[ '+entry.value+' ]';

      this.text.setText((i == this.model.currentIndex ? (entry.exit ? '◅ ' : ' ▻'):'  ') + title).draw(
        this.canvasCtx,
        this.xOffset + 20 + 2 * 3 * Math.round(Math.sqrt(100*xxx) / 3),
        this.yOffset + 90 + 5 * Math.round(4 * (i-this.displayEntry)));
    }
    this.canvasCtx.restore();

    depth = depth || 0;
    if (this.submenu) {
      this.canvasCtx.save();
      this.canvasCtx.globalAlpha = 0.9;
      this.canvasCtx.drawImage( ODR.consoleImage, 100, 237, 600, 200, 0, 0, 600, 200 );
      this.canvasCtx.restore();
      this.submenu.forward(deltaTime, depth + 1 );
    }

    if (this.model.title){
      new Text(600/14,0).drawText(this.model.title,this.canvasCtx,0,10 + depth * 20);
    }

    if( this.bottomText ){
      this.bottomText.draw(this.canvasCtx,0,180);
    }

    return this;
  }

}

class TextEditor extends Panel {
  constructor( canvas, text, callback ){
    super( canvas );
    this.xOffset = 0;
    this.yOffset = 0;
    this.submenu = null;
    this.bottomText = new Text(600/14,0).setText('press both #slide+#jump to select');

    this.text = text;
    this.curX = 0;
    this.curY = 0;
    this.callback = callback;
    this.pattern = "etnsh ◅aiouc.'rdlmf,\"wygpb!?vkqjxz#01234+/56789-▻";
  }

  handleEvent( e ){
    switch( e.type ){
      case OnDaRun.events.KEYDOWN:
        return ( e.key == 'Delete'
          || e.key == 'Enter'
          || this.pattern.indexOf( e.key ) != -1 );
      case OnDaRun.events.KEYUP:
        if( e.key == 'Delete' ){
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
        return false;
        break;
    }

    return super.handleEvent( e );
  }

  forward( deltaTime ) {
    this.timer += deltaTime;

    if( this.offset && !this.muted )
      ODR.playSound( ODR.soundFx.SOUND_BLIP, ODR.config.SOUND_SYSTEM_VOLUME/10 );
    if( this.offset > 0 ){
      this.curX = (this.curX + this.offset)%7;
      this.offset = 0;
    } else if ( this.offset < 0 ){
      this.curY = (this.curY - this.offset)%7;
      this.offset = 0;
    }

    if( this.willEnter && 0 == this.buttonUpTime[ 0 ] && 0 == this.buttonUpTime[ 1 ]){
      this.willEnter = false;
      /*
      if (this.submenu) {
        this.submenu = null;
      }
      */
      if( this.curX == 6 && this.curY == 6 ){
        ODR.playSound( ODR.soundFx.SOUND_SCORE, ODR.config.SOUND_SYSTEM_VOLUME/10 );
        return this.callback( this.text );
      } else if( this.curX == 6 && this.curY == 0 ){
        this.text = this.text.slice( 0, this.text.length - 1 );
      } else {
        let slicePos = this.curY*7+this.curX;
        this.text += this.pattern.slice( slicePos, slicePos + 1 );
        if( slicePos >= 35 && slicePos <= 39 || slicePos >= 42 && slicePos <= 46 ){
          this.curX = 0;
          this.curY = 5;
        } else {
          this.curX = 0;
          this.curY = 0;
        }
      }

      if( this.text.length > 25 ){
        this.text = this.text.slice(0,25);
        ODR.playSound( ODR.soundFx.SOUND_ERROR, ODR.config.SOUND_SYSTEM_VOLUME/10 );
      } else {
        ODR.playSound( ODR.soundFx.SOUND_SCORE, ODR.config.SOUND_SYSTEM_VOLUME/10 );
      }
    }

    this.canvasCtx.save();
    /*
    this.canvasCtx.fillStyle = "#000d";
    this.canvasCtx.fillRect(0,0,this.canvas.width,this.canvas.height);
    */
    this.canvasCtx.drawImage(ODR.consoleImage, 100, 237, 600, 200, 0, 0, 600,200);

    this.canvasCtx.fillStyle = "#a60"
    this.canvasCtx.fillRect(this.xOffset+295-(7*25/2) + this.curX*25,this.yOffset + 2 + (1 + this.curY)*25,23,23);
    for (let u = 0; u < 7; u++) {
      new Text( 600/25,0, this.pattern.slice( u*7, u*7+7 )).draw(
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

//FIXME set as menu and draw later
//menu stack allow self-push
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
    //Hack
    if( this.timer == 0 ){
      ODR.updateScore();
    }

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

    return (this.timer >> 6)&1;
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
        this.handlePressed(e);
      } break;
      case OnDaRun.events.MOUSEOUT:
      case OnDaRun.events.KEYUP:
      case OnDaRun.events.MOUSEUP:
      case OnDaRun.events.TOUCHEND: {
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

  /*
  handleReleased(e) {
    ODR.music.stop();
    ODR.config = JSON.parse(JSON.stringify(OnDaRun.Configurations));
  }
  */
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

/**
 * FIXME
 * - Make sure not to setTimeout() to load music.
 */
class Music {
  constructor( canvas ){
    if( Music.singletonInstance_ )
      return Music.singletonInstance_;

    this.songs = {};
    this.currentSong = null;
    Music.singletonInstance_ = this;
  }

  stop(){
    this.currentSong = null;
    for( let name in this.songs ) {
      if (this.songs[name].audio) {
        //console.log('stopping', name)
        this.songs[name].autoplay = false;
        this.songs[name].audio.fadeout();
        this.songs[name].audio = null;
      }
    }
  }

  /*
  get lyrics(){
    if( this.currentSong && this.currentSong.lyrics && this.currentSong.lyrics.length ){
      let time = ODR.audioContext.currentTime - this.currentSong.startTime;
      while( time >= this.currentSong.lyrics[2] ){
        this.currentSong.lyrics.splice(0,2);
      }
      return this.currentSong.lyrics[1];
    }
  }*/

  updateLyricsIfNeeded( terminal ){
    if( this.currentSong && this.currentSong.lyrics && this.currentSong.lyrics.length ){
      let time = ODR.audioContext.currentTime - this.currentSong.startTime - this.currentSong.delay/1000;
      while( this.currentSong.lyrics.length && time >= this.currentSong.lyrics[0].info ){
        terminal.appendMessage( this.currentSong.lyrics.shift());
      }
    }
  }

  set volume( vol ) {
    if( this.currentSong ) {
      this.currentSong.audio.setVolume( vol/10 );
    }
  }


  /* TODO If the audio context is created late, music should
  recall load on the existing autoplayed song. */
  load( name, autoplay, delay = 0, lyrics = null ){
    //console.log('load', name, autoplay)
    //if (IS_IOS) return;
    let song = this.songs[ name ] || ( this.songs[ name ] = { title: name, autoplay: autoplay, lyrics: lyrics});
    song.lyrics = lyrics;
    song.delay = delay;

    /*
    if( song.autoplay ) {
      console.log('This song is being already played.',song)
      return;
    }
    */

    if (this.currentSong == song) return;

    song.autoplay = song.autoplay || autoplay;

    /* Turn-off the others */
    if( song.autoplay ) {
      for( let anotherName in this.songs ) {
        if( name == anotherName ) continue;

        this.songs[anotherName].autoplay = false;
        if( this.songs[anotherName].audio ) {
          this.songs[anotherName].audio.fadeout();
          this.songs[anotherName].audio = null;
        }
      }
    }

    if( song.autoplay && song.data ) {
    /* The song has data ready, just play it. */
      if( !song.audio ) {
        this.currentSong = song;
        song.audio = ODR.playSound( song.data, ODR.config.SOUND_MUSIC_VOLUME/10, false, song.delay );
        song.startTime = ODR.audioContext.currentTime;
      }
    } else if( !song.hasOwnProperty('progress')) {
    /* The song has not started being loaded. */
      song.progress = 0;
      var resourceTemplate = document.getElementById(ODR.config.RESOURCE_TEMPLATE_ID).content;
      let request = new XMLHttpRequest();
      request.open('GET', resourceTemplate.getElementById(name).src, true);
      request.responseType = 'arraybuffer';
      request.onload = () => {
        song.progress = 1;

        /* Without an audio context, it will just keep the blob around */
        if (!ODR.audioContext) {
          song.source = request.response;
        } else {
          ODR.audioContext.decodeAudioData(request.response, audioData => {
            song.data = audioData;
            this.load( song.title, song.autoplay );
          });
        }
      }
      request.onprogress = (e) => {
        song.progress = e.loaded/e.total;
      }
      request.send();
    } else if( song.source ) {
    /* Source was loaded but not yet processed. */
      if (ODR.audioContext) {
        ODR.audioContext.decodeAudioData( song.source ).then( audioData => {
          song.source = null;
          song.data = audioData;
          this.load( song.title, song.autoplay );
        });
      }
    }
  }

}

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

    this.sourceShade = [0,0,0,0,0,0];
    this.targetShade = [0,0,0,0,0,0];
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
      let ratio;
      let dur = this.shadingTimer - this.shadingDuration;
      this.shadingTimer += deltaTime;

      if( dur >= 0 ){
        ratio = 1;
        this.shadingTimer = this.shadingDuration;
        this.shadingDuration = 0; //This avoids recalculation in the next entry.
        this.shade = [ ...this.targetShade ];
      } else {
        ratio = this.shadingTimer/this.shadingDuration;
        for( let i = 0; i < 6; i++ ){
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

    //FIXME just replace
    this.dimensions = OnDaRun.defaultDimensions;
    this.config = JSON.parse(JSON.stringify(OnDaRun.Configurations));
    //this.scene = null;
    this.menu = null;

    this.canvas = null;
    this.canvasCtx = null;
    this.sky = null;

    this.amandarine = null;
    this.distanceMeter = null;
    this.distance = 0;
    this.totalTangerines = 0;
    this.dailyTangerines = 0;

    this.gameModeList = [];
    Object.values( OnDaRun.gameModes ).forEach( mode => {
      this.gameModeList.push( mode );
      mode.distance = 0;
    });
    this.gameMode = OnDaRun.gameModes[ this.config.GAME_MODE ];

    this.achievements = [];
    this.time = 0;
    this.runTime = 0;
    this.msPerFrame = 1000/FPS;
    this.currentSpeed = 0;
    this.actions = [];
    this.activeAction = null;

    this.activated = false;
    this.playing = false;
    this.inverted = false;
    this.invertTimer = 0;

    this.shouldAddObstacle = false;
    this.shouldIncreaseSpeed = false;
    this.shouldDropTangerines = false;
    this.tangerineTimer = 0;

    this.playCount = 0;
    this.soundFx = {};

    this.audioContext = null;
    this.music = null;

    this.images = {};

    this.consoleButtonForKeyboardCodes = {};
  }

/**
 * OnDarun lithtml first update.
 * - Prepare the console graphics.
 * - Load image sprites.
 * @param {Map} changedProperties
 */
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
    A8e.animFrames.CRASHED.sprite = addSprite('nat/crash');

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

  /*
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

/**
 * OnDarun initialize the game parameters & game-play graphics.
 */
  init(){

    //this.generateShadowCache();
    Mountain.generateMountainImages();

    this.config.PLAY_MUSIC = true;
    this.music = new Music();
    this.music.load('offline-intro-music', false);
    this.music.load('offline-play-music', false);
    this.setSpeed();

    this.canvas = this.shadowRoot.getElementById('console-screen');
    this.canvas.width = DEFAULT_WIDTH;
    this.canvas.height = DEFAULT_HEIGHT;
    this.canvasCtx = this.canvas.getContext('2d');
    this.canvas.style.visibility = 'visible';

    this.sky = new Sky( this.canvas );
    this.sky.setShade( ODR.config.SKY.START, 0 );
    this.horizon = new Horizon( this.canvas, this.spriteDef, this.dimensions );

    this.menu = new TitlePanel( this.canvas );

    this.amandarine = new A8e( this.canvas, this.spriteDef.NATHERINE );

    this.distanceMeter = new DistanceMeter(this.canvas,
      this.spriteDef.TEXT_SPRITE, DEFAULT_WIDTH);
    this.achievements = [
      200, 'KEEP RUNNING!#natB',
      400, 'GOOD JOB!#natB',
      800, 'JUST DONT DIE!#natB',
    ];

    this.notifier = new Notifier( this.canvas );
    this.terminal = new Terminal( this.canvas, 0, 180 );

    this.actionIndex = 0;

    /* Set default custom mode to setting 0 */
    this.config.GRAPHICS_MODE_SETTINGS[3] = JSON.parse(JSON.stringify(OnDaRun.Configurations.GRAPHICS_MODE_SETTINGS[0]));
    this.setGraphicsMode(3);

    this.style.opacity = 1;

    this.startListening();
    this.signIn();
    this.scheduleNextRepaint();

    this.introScriptTimer = 200;
  }

  setSpeed( opt_speed ){
    this.currentSpeed = opt_speed === undefined ? this.currentSpeed : opt_speed;
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
            authUser.nickname = nname[getRandomNum(0,nname.length-1)] + hname[getRandomNum(0,hname.length-1)] + rname[getRandomNum(0,rname.length-1)];
            authUser.ref.child('nickname').set( authUser.nickname );
            this.notifier.notify( `Welcome, ${authUser.nickname}.\n[autogenerated_name]\nYou dont\'t like it, do you?\nchange in #trophy`, 20000 );
            this.introScriptTimer = 20000;
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
              console.log('Updating server hiscore:',mode.key, mode.distance);
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
                console.log(`Updating client hiscore: ${mode.key} ${serverDistance} (${serverDistance * this.config.TO_SCORE})`);
                mode.distance = serverDistance;
                if( mode === this.gameMode ){
                  this.distanceMeter.setHighScore( Math.round( serverDistance * this.config.TO_SCORE ));
                }
              }
            });
          }

          N7e.userSigningInfo('distances', true );

        });

        // load custom graphics configs.
        authUser.odrRef.once('value', snapshot => {
          let odr = snapshot.val();
          if (odr) {
            Object.assign(this.config.GRAPHICS_MODE_SETTINGS[3], odr.settings);
            if (this.config.GRAPHICS_MODE == 3) {
              this.setGraphicsMode(3);
            }
          }
        });

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
      this.music.stop();
      this.config.PLAY_MUSIC = false;
      this.notifier.notify('♬ OFF', 2000 );
    } else {
      this.config.PLAY_MUSIC = true;
      if (this.playing) {
        this.music.load('offline-play-music', this.config.PLAY_MUSIC );
      } else {
        this.music.load('offline-intro-music', this.config.PLAY_MUSIC );
      }
      this.notifier.notify('♬ ON', 2000 );
    }
  }

  closeMenuForButton( button ){
    if( this.menu && this.menu.associatedButton == button ){
      this.menu = null;
      return true;
    }
    return false;
  }

  openSoundMenu(){
    let button = this.consoleButtons.CONSOLE_A;

    //this.config.PLAY_MUSIC = true;
    this.music.stop();
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

    entries.push({title:'exit', exit:true});

    this.menu = new Menu( this.canvas, {
      title: 'sounds',
      entries: entries,
      select: ( entry, vol, model ) => {
        if( this.menu.model === model || vol > 10) {
          if( model.name == 'SOUND_MUSIC_VOLUME' && vol == 11) {
            this.music.volume = ODR.config.SOUND_MUSIC_VOLUME;
          } else {
            ODR.playSound( ODR.soundFx.SOUND_BLIP, ODR.config.SOUND_SYSTEM_VOLUME/10 );
          }
        } else {
          if( model.name == 'SOUND_SYSTEM_VOLUME' ) {
            ODR.playSound( ODR.soundFx.SOUND_BLIP, vol/10 );
          } else if( model.name == 'SOUND_EFFECTS_VOLUME' ) {
            this.sounds = this.sounds || [
              'SOUND_QUACK',
              'SOUND_OGGG',
              'SOUND_BICYCLE',
              'SOUND_JUMP',
              'SOUND_SLIDE',
              'SOUND_HIT',
              'SOUND_ERROR',
              'SOUND_BLIP',
              'SOUND_POP',
            ];
            ODR.playSound( ODR.soundFx[this.sounds[0]], vol/10 );
            this.sounds.push(this.sounds.shift());
          } else if( model.name == 'SOUND_MUSIC_VOLUME' ) {
            this.music.volume = vol;
          }
        }
      },
      enter: ( entryIndex, entry ) => {
        if( entry.name == 'SOUND_MUSIC_VOLUME' ) {
          ODR.music.load('offline-play-music', this.config.PLAY_MUSIC );
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
    }, button );
  }

  openGraphicsMenu(){
    let button = this.consoleButtons.CONSOLE_B;
    if( this.closeMenuForButton( button )) return;

    this.music.stop();
    let entries = [];
    for (let key in this.config.GRAPHICS_MODE_OPTIONS) {
      let def = this.config.GRAPHICS_MODE_OPTIONS[key];
      entries.push({title:key.slice(9), name:key, options:def, value:this.config[key]});
    }

    entries.push({title:'exit', exit:true});
    this.menu = new Menu( this.canvas, {
      title: 'graphics',
      entries: entries,
      enter: ( entryIndex, entry ) => {
        if( entry.value ) {

          this.config.GRAPHICS_MODE_SETTINGS[3][entry.name] = entry.value;
          this.setGraphicsMode(3);
          if (N7e.user) {
            N7e.user.odrRef.child('settings/'+entry.name).set(entry.value);
          }

          return null;
        }
        this.notifier.notify('CUSTOM GRAPHICS MODE', 5000 );
        this.setGraphicsMode( 3 );
        return null;
      },
    }, button );
  }

  showGameMode(){
    if( this.totalTangerines ){
      let maxPerDay = Math.max( 1, ~~( this.gameModeTotalScore/100 ));
      this.terminal.append( `${this.gameMode.title}  #tangerine:${this.dailyTangerines}/${maxPerDay}`, 3000 );
    } else this.terminal.append( this.gameMode.title, 3000 );
  }

  setGameMode( choice ){
    /* FIXME avoid modifying config */
    this.gameMode = choice;

    this.distanceMeter.setHighScore( this.gameModeScore );

    this.config.ACCELERATION = choice.ACCELERATION;
    this.time = 0;
    this.runTime = 0;
    this.currentSpeed = 0;
    this.actions = [];
    this.activeAction = null;
    this.activated = false;
    this.playing = false;
    this.inverted = false;
    this.invertTimer = 0;
    this.shouldAddObstacle = false;
    this.shouldIncreaseSpeed = false;
    this.playCount = 0;
    this.amandarine.reset();
    this.horizon.reset();

    this.playLyrics = false;
    this.runTime = 0;
    this.distance = 0;
    this.invert(true);
    if( this.gameOverPanel )
      this.gameOverPanel.timer = 0;

    //FIXME dup screen forward
    this.music.load('offline-intro-music', this.config.PLAY_MUSIC );
    let defaultAction = new DefaultAction(1);
    defaultAction.setX = -100;
    this.queueAction(defaultAction);
    this.playSound( this.soundFx.SOUND_SCORE, this.config.SOUND_SYSTEM_VOLUME/10 );
    this.sky.setShade( ODR.config.SKY.DAY, 0 );

    this.showGameMode();
  }

  openGameMenu() {
    let button = this.consoleButtons.CONSOLE_C;
    if( this.closeMenuForButton( button )) return;

    this.music.stop();
    let entries = [];

    this.gameModeList.forEach( mode => {
      entries.push({
        title: (this.gameMode === mode
          ? `${mode.title} #natB `
          : `${mode.title}`)
          + `[${Math.round(mode.distance * this.config.TO_SCORE)}]`,
        mode: mode,
      });
    });
    entries.push({ title:'EXIT', exit: true })

    let mainMenu = this.menu = new Menu( this.canvas, {
      title: 'games',
      entries: entries,
      enter: ( entryIndex, choice ) => {
        if( !choice.exit ) {
          console.log(choice.mode, 'set mode');
          this.setGameMode(choice.mode);
        }

        return null;
      }
    }, button );
  }

  openUserMenu() {
    let button = this.consoleButtons.CONSOLE_D;
    if( this.closeMenuForButton( button )) return;

    //console.assert( !N7e.signing.progress, N7e.signing );

    this.music.stop();
    let mainMenu = this.menu =
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

          if (choice == "SET NAME")
            return new TextEditor(this.canvas, N7e.user.nickname?N7e.user.nickname:'', (text) => {
              N7e.user.ref.child('nickname').set(text);
              N7e.user.nickname = text;
              this.notifier.notify('all hail '+text+'.', 5000 );
              mainMenu.model.nickname = text;
              return mainMenu;
            });
          else if (choice == "SIGN OUT")
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
                  ODR.distance = 0;

                  // Reset game score.
                  ODR.gameModeList.forEach( mode => mode.distance = 0 );
                  ODR.distanceMeter.setHighScore( 0 );
                }
              },
            }, button )
          else if( choice = "set name" ){
            return null; //NYI
          }
        }
      }, button )
      /* No active user */
      : new Menu( this.canvas, {
        title: 'LINK PROFILE',
        entries: [
          '#facebook FACEBOOK',
          '#twitter TWITTER',
          '#google GOOGLE',
          {title:'EXIT',exit:true}
        ],
        enter: (entryIndex,choice) => {
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
                return new WaitingPanel( this.canvas, () => N7e.signing.progress );
              }
            },
          }, button );
        },
      }, button );
  }

  setGraphicsMode(mode) {
//    this.introScriptTimer = 200;

    if (mode == -1) {
      mode = (this.config.GRAPHICS_MODE+1)%4;
    }

    Object.assign(this.config, this.config.GRAPHICS_MODE_SETTINGS[mode]);
    this.config.GRAPHICS_MODE = mode;
    this.canvasCtx.restore();
    this.canvasCtx.save();

    switch (mode) {
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
      this.horizon.nightMode.generateMoonCache();
    } else {
      this.horizon.nightMode.moonCanvas = null;
    }
    this.canvas.style.opacity = 1 - this.config.GRAPHICS_DAY_LIGHT/5;

    //Generate caches
    this.horizon.forward( 0, 0, 0, false, 0);
  }

  loadSounds() {
    if (!IS_IOS) {
      if (!this.audioContext) {
        this.audioContext = new AudioContext();
      }

      var resourceTemplate =
      document.getElementById(this.config.RESOURCE_TEMPLATE_ID).content;

      Object.entries(OnDaRun.sounds).forEach(([sound, id]) => {
        var soundSrc =
          resourceTemplate.getElementById(id).src;
        soundSrc = soundSrc.substr(soundSrc.indexOf(',') + 1);
        let len = (soundSrc.length / 4) * 3;
        let str = atob(soundSrc);
        let arrayBuffer = new ArrayBuffer(len);
        let bytes = new Uint8Array(arrayBuffer);

        for (let i = 0; i < len; i++) {
          bytes[i] = str.charCodeAt(i);
        }

        // Async, so no guarantee of order in array.
        this.audioContext.decodeAudioData(bytes.buffer)
          .then( audioData => this.soundFx[sound] = audioData);
      });
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

      if( volume !== undefined ) {
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

      sourceNode.start(this.audioContext.currentTime + delay/1000);
      return {
        node: sourceNode,
        _gain: vnode,
        _pan: pnode,
        stop: function() {
          this.node.stop();
        },
        setVolume: function( vol ) {
          this._gain.gain.value = vol;
        },
        fadeCount: 10,
        fadeout: function() {

          if( this._gain.gain.value > 0 ) {
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

  /*
  startGame() {
    this.runTime = 0;
    this.playCount++;

    // Handle tabbing off the page. Pause the current game.
    document.addEventListener(OnDaRun.events.VISIBILITY,
      this.onVisibilityChange.bind(this));

    window.addEventListener(OnDaRun.events.BLUR,
      this.onVisibilityChange.bind(this));

    window.addEventListener(OnDaRun.events.FOCUS,
      this.onVisibilityChange.bind(this));
  }

  onVisibilityChange(e) {
    if (document.hidden || document.webkitHidden || e.type == 'blur' || document.visibilityState != 'visible') {
      this.stop();
    } else if (!this.crashed) {
      this.amandarine.reset();
      this.play();
    }
  }
  */


/**
 * OnDarun main forwarding
 */
  forward( now ) {
    this.forwardPending = false;

    var deltaTime = now - (this.time || now);
    this.time = now;

    // Update button animations.
    for( let key in this.consoleButtons ){
      this.consoleButtons[ key ].forward( deltaTime );
    }

    /*
    if( this.scene ){
      //this.canvasCtx.drawImage(ODR.consoleImage, 100, 237, 600, 200, 0, 0, 600,200);
      this.scene = this.scene.forward(deltaTime);
      this.scheduleNextRepaint();
      if( !this.scene.passthrough )
        return;
    }
    */

    if( this.menu ){
      this.canvasCtx.drawImage(ODR.consoleImage, 100, 237, 600, 200, 0, 0, 600,200);
      this.menu = this.menu.forward(deltaTime);
      this.scheduleNextRepaint();
      if( this.menu && !this.menu.passthrough ){
        return;
      }
    }

    if( this.playing ){

      let hasObstacles = this.runTime > this.config.CLEAR_TIME ? 1 : 0;

      if( this.crashed && this.gameOverPanel ) {
        this.gameOverPanel.draw(deltaTime);

        //Define existence as a timing ratio used to by the gameover animations.
        let existence = Math.max( 0,
          this.actions[0]
          ? Math.min( 1, (this.config.GAMEOVER_CLEAR_TIME - this.actions[0].timer) / this.config.GAMEOVER_CLEAR_TIME )
          : 0
        );

        this.horizon.forward( deltaTime, this.currentSpeed, this.inverted, hasObstacles && existence );

        if (existence > 0.9) {
          let crashPoint = this.actions[0].boxes.C.center();
          this.canvasCtx.drawImage(ODR.spriteGUI,
              OnDaRun.spriteDefinition.CRASH.x,
              OnDaRun.spriteDefinition.CRASH.y,
              this.config.CRASH_WIDTH, this.config.CRASH_HEIGHT,
              crashPoint.minX - this.config.CRASH_WIDTH/2, crashPoint.minY - this.config.CRASH_HEIGHT/2,
              this.config.CRASH_WIDTH, this.config.CRASH_HEIGHT);
        }

        this.gameOverPanel.draw( deltaTime );
      } else {
        this.runTime += deltaTime;

        //Drop tangerine
        if( this.tangerineTimer < 5000 ){
          this.tangerineTimer += deltaTime;
          if( this.tangerineTimer >= 5000 ){
            this.checkShouldDropTangerines();
          }
        }

        this.horizon.forward( deltaTime, this.currentSpeed, this.inverted, hasObstacles);
      }

      // Check for collisions.

      //FIXME Why not testing in Horizon?
      if( hasObstacles && !this.crashed ) {
        for( let i = 0, entity; entity = this.horizon.entities[i]; i++ ) {

          let crashBoxes = this.amandarine.hitTest(entity, this.amandarine);

          if( crashBoxes && entity.collide( crashBoxes )) {
            // if collide() return true then gameover
            break;
          }
        }
      }

      if (!this.crashed) {
        this.distance += this.currentSpeed * deltaTime / this.msPerFrame;
      }

      if (this.shouldIncreaseSpeed ) {
        this.currentSpeed = this.config.SPEED + this.runTime * this.config.ACCELERATION;
        if( this.currentSpeed > this.config.MAX_SPEED )
          this.currentSpeed = this.config.MAX_SPEED;
      }

      // Meter & Score
      let playAchievementSound = this.distanceMeter.forward( deltaTime, this.score );

      if (playAchievementSound) {
        if (playAchievementSound != this.lastAchievement) {
          this.playSound( this.soundFx.SOUND_SCORE, 0.8 * ODR.config.SOUND_EFFECTS_VOLUME/10 );
        }
        this.lastAchievement = playAchievementSound;

        if( playAchievementSound >= this.achievements[0] ){
          this.achievements.shift();
          this.notifier.notify( this.achievements.shift(), 6000 );
        }
      }

      // Night & Day FIXME use time instead of timer
      if (this.invertTimer > this.config.INVERT_FADE_DURATION) {
        this.invertTimer = 0;
        this.invertTrigger = false;
        this.invert();
      } else if (this.invertTimer) {
        this.invertTimer += deltaTime;
      } else {
        let score = this.score;

        if( score > 0 ){
          this.invertTrigger = !(this.score % this.config.INVERT_DISTANCE);

          if (this.invertTrigger && this.invertTimer === 0) {
            this.invertTimer += deltaTime;
            this.invert();
          }
        }
      }

    } else if (!this.crashed) {
      // Initial idling
      this.horizon.forward( deltaTime, 0, this.inverted, 1);
    } else {
      // Game over suspending
        this.horizon.forward( 0, 0, this.inverted, 0);
        if (this.gameOverPanel) {
          this.gameOverPanel.draw( deltaTime );
        }
        this.distanceMeter.forward( 0, this.score );
    }

    let a = this.actions[0];
    this.scheduleActionQueue(now, deltaTime, this.currentSpeed);
    this.notifier.forward( deltaTime );


    if (this.playLyrics) {
      this.music.updateLyricsIfNeeded( this.terminal );
    }

    this.terminal.forward( deltaTime );

    if( N7e.signing.progress ) {
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
      +' T:'+(this.runTime/1000).toFixed(1)
      +' FPS:'+this.paintRound).draw(this.canvasCtx,-10,200-16);
    }

    this.scheduleNextRepaint();
  }

/**
 * OnDarun event handler interface
 * @param {Event} e application events.
 */

  handleEvent(e) {

    if( this.menu && this.menu.handleEvent && this.menu.handleEvent( e )){
      return;
    }

    switch( e.type ){
      case OnDaRun.events.KEYDOWN:{
        let button = this.consoleButtonForKeyboardCodes[ e.code ];
        if( button ){
          e.preventDefault();
          if( !e.repeat ){
            button.handleEvent( e );
          }
        } else {
          this.onKeyDown( e );
        }

      } break;

      case OnDaRun.events.KEYUP:{
        let button = this.consoleButtonForKeyboardCodes[ e.code ];
        if ( button) {
          if( !e.repeat ){
            button.handleEvent( e );
          }
        } else {
          this.onKeyUp( e );
        }
      } break;

      case OnDaRun.events.CONSOLEDOWN: {

        this.introScriptTimer = 20000;
        let button = e.detail.consoleButton;

        switch( button ){
          case this.consoleButtons.CONSOLE_LEFT:{
            let action = this.consoleButtonActionMap.get( button );
            if( !action || action.priority != 0 ){
              action = new SlideAction( this.time, this.currentSpeed);
              this.consoleButtonActionMap.set( button, action );
              this.queueAction( action );
            }
          } break;

          case this.consoleButtons.CONSOLE_RIGHT:{
            let action = this.consoleButtonActionMap.get( button );
            if( !action || action.priority != 0 ){
              action = new JumpAction( this.time, this.currentSpeed);
              this.consoleButtonActionMap.set( button, action );
              this.queueAction( action );
            }
          } break;

        }

      } break;

      case OnDaRun.events.CONSOLEUP:{

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

          // Music button
          case this.consoleButtons.CONSOLE_A:
            if( e.detail.timeOut || this.menu ){

              if( !this.closeMenuForButton( button ))
                this.openSoundMenu();

            } else if( !this.menu ){
              this.setMusicMode(-1 );
              this.terminal.append("hold the button for settings.", 3000 );
            }
          break;

          // Graphics button
          case this.consoleButtons.CONSOLE_B:
            if( e.detail.timeOut || this.menu ){

              if( !this.closeMenuForButton( button ))
                this.openGraphicsMenu();

            } else if( !this.menu ){
              this.setGraphicsMode(-1 );
              this.terminal.append("hold the button for settings.", 3000 );
            }
            break;

          case this.consoleButtons.CONSOLE_C:
            if( !this.closeMenuForButton( button ))
              this.openGameMenu();
            break;

          case this.consoleButtons.CONSOLE_D:
            if( !this.closeMenuForButton( button ))
              this.openUserMenu();
            break;

          case this.consoleButtons.CONSOLE_RESET:
            break;

          case this.consoleButtons.CONSOLE_N7E:{
            if (!this.n7eUrlList || this.n7eUrlList.length == 0) {
              this.n7eUrlList = [
                { name: 'IG', url: 'https://www.instagram.com/natherine.bnk48official'},
                { name: 'FACEBOOK', url: 'https://www.facebook.com/bnk48official.natherine'},
              ];
            }
            window.open( this.n7eUrlList.splice( getRandomNum( 0, this.urlList.length - 1 ), 1)[ 0 ].url, '_blank');
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
    if (IS_MOBILE && this.playing) {
      //e.preventDefault();
    }
  }

  onKeyUp(e) {
    var keyCode = String(e.keyCode);

    if (keyCode <= 52 && keyCode >= 49) {
      /* Mapping 1,2,3,4 => 0,1,2,3 */
      this.setGraphicsMode(keyCode - 49);
      return;
    }

    if( e.code == 'Escape' ){
      this.menu = null;
    }
  }

  queueAction(action) {
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
    if (!this.forwardPending) {
      this.forwardPending = true;
      this.raqId = requestAnimationFrame((now) => this.forward( now ));
    }
  }

/**
 * OnDarun test crashed state.
 * @returns {boolean} crash state.
 */
  get crashed() {
    if( this.activeAction && this.activeAction.type == A8e.status.CRASHED ) {
      return true;
    }
    return false;
  }

  isRunning() {
    return !!this.raqId;
  }

  gameOver(){

    this.distanceMeter.flashIterations = 0;

    //FIXME
    /*
    console.trace();
    this.amandarine.forward(100, this.currentSpeed, this.actions[0]);
    */

    if (!this.gameOverPanel) {
      this.gameOverPanel = new GameOverPanel(this.canvas,
        this.spriteDef.TEXT_SPRITE, this.spriteDef.RESTART,
        this.dimensions);
    }

    this.gameOverPanel.draw( 0 );

  }

  updateScore(){
    let d = this.score;

    // Only play lyrics if reaching a half of hiscore and more than 1000.
    // FIXME Rethink for different difficulties.
    if( d > 1000 && this.distance > this.gameMode.distance / 2 )
      this.playLyrics = true;

    if( d < 600 ){
      this.achievements = [
        200, 'KEEP RUNNING!#natB',
        400, 'GOOD JOB!#natB',
        800, 'JUST DONT DIE!#natB',
      ];
    } else {

      //FIXME should be called once
      if( this.distance > this.gameMode.distance )
        this.notifier.notify( `A NEW HIGH!
${this.gameMode.title} : ${Math.round( this.gameMode.distance * this.config.TO_SCORE )} ▻ ${Math.round( this.distance * this.config.TO_SCORE )}
GOOD JOB! #natB`, 15000 );

      d = d/2 - d/2%100;
      this.achievements = [
        d, 'KEEP RUNNING!#natB',
        d*2, 'GOOD JOB!#natB',
        d*3, 'JUST DONT DIE!#natB',
        d*4, '...#natB',
      ];
    }

    // Update the high score.
    if( this.distance > this.gameMode.distance ){
      if( N7e.user ) {
        N7e.user.odrRef.child('scores').child( this.gameMode.key )
        .transaction(( distance = 0) => Math.max( this.distance, distance ));
      }
      this.gameMode.distance = Math.ceil( this.distance );
      this.distanceMeter.setHighScore( this.score );
    }

    // RMME Looks like it was used once?
    // Reset the time clock.
    //this.time = getTimeStamp();
    //this.crashedTime = this.time;
  }


  get gameModeTotalScore(){
    let sum = 0;
    this.gameModeList.forEach( mode => sum+= Math.round( mode.distance * this.config.TO_SCORE ));
    return sum;
  }

  get gameModeScore(){
    return Math.round(this.gameMode.distance * this.config.TO_SCORE);
  }

  get score(){
    return Math.round(this.distance * this.config.TO_SCORE);
  }

  checkShouldDropTangerines() {
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
            this.notifier.notify( `no #tangerine today! [${tangerines.dayCount}/${maxPerDay}]`, 5000 );
          }
        } else {
          console.error('Data was not committed???');
        }

      });
    }
  }

  /* Don't remove / For refs.
  restart() {
    if (!this.raqId) {
      this.actions = [];
      //this.playCount++;
      this.playLyrics = false;
      this.shouldAddObstacle = true;
      this.checkShouldDropTangerines();
      this.shouldIncreaseSpeed = true;

      this.runTime = 0;
      this.playing = true;
      this.distance = 0;
      this.setSpeed(this.config.SPEED);
      this.time = getTimeStamp();
      this.distanceMeter.reset();
      this.horizon.reset();
      this.amandarine.reset();
      this.playSound( this.soundFx.SOUND_SCORE, ODR.config.SOUND_EFFECTS_VOLUME/10 );
      this.invert( true );
      this.forward( this.time );
      this.gameOverPanel.timer = 0;
      this.music.stop();
    }
  }*/

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

    this.sky.setShade( this.inverted ? ODR.config.SKY.NIGHT : ODR.config.SKY.DAY, 3000 );
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
  scheduleActionQueue( now, deltaTime, speed ) {

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
                  this.amandarine.dust.minX = this.amandarine.minX - 24;
                  this.amandarine.dust.addPoint(0, 0, -40, -10 * Math.random());
                }

                break;
              case A8e.status.SLIDING:
                this.activeAction = action;
                action.minX = this.amandarine.minX;
                break;

              // These background-type actions (priority 1 without specific
              // duration) below will 'continue' through the action queue
              // to proceed with the active preparing action (priority 0).
              case A8e.status.RUNNING:
                this.activeAction = action;
                action.speed = speed;
                action.msPerFrame = 1000 / (22 + speed);

                continue;

              case A8e.status.CRASHED:
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


            /*
            // TODO! Don't delete.
            if (action.priority == -1) {

              // At the end of the first action, the actual game begins.
              console.log(action.start,this.playCount)
              if (action.start && action.start != this.playCount) {
                this.playCount++;
                switch(this.playCount) {
                  case 1:
                    this.notifier.notify( "go go go!!",2000);
                    break;
                  case 10:
                    this.notifier.notify('NATHERINE ♥ YOU.#natB',10000);
                    break;
                  case 20:
                    OR.notifier.notify('NATHERINE STILL ♥ You.#natB',10000);
                    break;
                  case 30:
                    this.notifier.notify('NATHERINE WILL ALWAYS ♥ You.#natB',10000);
                    break;
                  default:
                  if (this.playCount % 10 == 0) {
                    this.notifier.notify('Love the game?\nPlease_Make_a_Donation\nTO_Thai_Redcross_#redcross',8000);
                  } else {
                    this.notifier.notify('▻▻',1000);
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
                if( this.amandarine.minX > this.amandarine.config.START_X_POS ) {
                  action.speed = 0;
                  this.amandarine.minX = this.amandarine.config.START_X_POS;
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
                  this.gameOver();
                  //TOOD this.dispatchEvent(new CustomEvent('odr-crash', { bubbles: false, detail: { action: action } }));
                  vibrate(200);

                  this.music.stop();
                  this.playSound( this.soundFx.SOUND_OGGG, ODR.config.SOUND_EFFECTS_VOLUME/10 );
                  this.sky.setShade( this.config.SKY.SUNSET, 3000 );
                  this.shouldAddObstacle = false;
                  this.shouldIncreaseSpeed = false;

                  let crashPoint = action.boxes.C.center();
                  //TODO 4 dirs
                  if (crashPoint.minY - this.amandarine.minY < 20) {
                    action.dir = -1;
                  } else {
                    action.dir = 1;
                  }

                  action.duration = 200;
                  action.top = action.duration / 1000;
                  action.halfTime = Math.sqrt(2000 * action.duration / A8e.config.GRAVITY);
                  action.timer = 0;
                  action.crashedMinY = this.amandarine.minY;
                  action.lagging = speed;
                }

                //this.amandarine.activateAction(action, deltaTime, speed);

                if( !action.playedEndMusic ){
                  action.playedEndMusic = true;
                  let lyrics = [];
                  for( let i = 0, l = this.config.NATHERINE_LYRICS; i < l.length; i+= 2 ){
                    let string = l[ i + 1 ];
                    let duration = (l[ i + 2 ] || 5)*1000;
                    lyrics.push( new Message( string, 10000, 0, l[ i ]));
                  }
                  this.music.load('offline-intro-music', this.config.PLAY_MUSIC, 3000, lyrics );
                }

                // Waiting for a restart
                // Clear the buttons during clear time or restart afterwards.
                queueIndex++;
                let nextAction;
                while( nextAction = actionQueue[ queueIndex ]){
                  if( nextAction.type == A8e.status.SLIDING
                      || nextAction.type == A8e.status.JUMPING) {
                    if( action.timer < this.config.GAMEOVER_CLEAR_TIME ){
                      nextAction.priority = -1;
                    } else {
                      this.music.stop();
                      this.sky.setShade( ODR.config.SKY.DAY,  3000 );
                      action.priority = -1;

                      // Let the default action take responsibility
                      this.activeAction = null;
                      //this.minY = this.groundMinY;
                      this.minX = -40;
                      this.playLyrics = false;
                      this.shouldAddObstacle = true;
                      this.checkShouldDropTangerines();
                      this.shouldIncreaseSpeed = true;
                      this.runTime = 0;
                      this.playing = true;
                      this.distance = 0;
                      this.gameOverPanel.timer = 0;
                      this.invert( true );

                      this.setSpeed( this.config.SPEED );
                      this.playSound( this.soundFx.SOUND_SCORE, ODR.config.SOUND_EFFECTS_VOLUME/10 );
                      this.distanceMeter.reset();
                      this.horizon.reset();
                      this.amandarine.reset();
                      this.music.load('offline-play-music', this.config.PLAY_MUSIC, 500 );
                      this.showGameMode();
                      break HANDLE_ACTION_QUEUE;
                    }
                  }
                  queueIndex++;
                }
              } //break HANDLE_ACTION_QUEUE;
              break;
              case A8e.status.WAITING:
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

                /* Find starters */
                for (let i = queueIndex, nextAction; nextAction = actionQueue[i]; i++) {
                  if (nextAction.type == A8e.status.SLIDING
                      || nextAction.type == A8e.status.JUMPING) {

                    if (nextAction.priority == 0 && !action.hasStoppedMusic) {
                      action.heldStart = action.timer;
                      action.hasStoppedMusic = true;
                      this.music.stop();
                    } else if (nextAction.priority == 1) {
                      this.shouldAddObstacle = true;
                      this.checkShouldDropTangerines();
                      this.shouldIncreaseSpeed = true;
                      this.setSpeed(this.config.SPEED);
                      this.playing = true;
                      this.showGameMode();
                      this.music.load('offline-play-music', this.config.PLAY_MUSIC, 500 );
                      action.speed = this.config.SPEED;
                      action.priority = 1;
                      this.sky.setShade( ODR.config.SKY.DAY, 3000 );
                      this.notifier.timer = 200;
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
            this.amandarine.activateAction(action, deltaTime, speed);
            break HANDLE_ACTION_QUEUE;
            */
        }
      }
    }

    if (this.activeAction)
      this.amandarine.activateAction(this.activeAction, deltaTime, speed);
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
  GAME_A: { title:'GAME A', ACCELERATION: 0.00050/16 },
  GAME_B: { title:'GAME B', ACCELERATION: 0.00050/4 },
  GAME_S: { title:'SITUATION HALL',  ACCELERATION: 0.00050/16 },
};
for( const key in OnDaRun.gameModes ) {
  OnDaRun.gameModes[key].key = key;
  OnDaRun.gameModes[key].distance = 0;
}

OnDaRun.Configurations = {
  ACCELERATION: 0.00050/16,
  BG_CLOUD_SPEED: 0.2,
  BOTTOM_PAD: 10,
  CLEAR_TIME: 3000,
  CLOUD_FREQUENCY: 0.5,
  TO_SCORE: 0.025,
  CRASH_WIDTH: 32,
  CRASH_HEIGHT: 32,
  GAME_MODE: 'GAME_A',
  GAMEOVER_CLEAR_TIME: 1500,
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
  SOUND_EFFECTS_VOLUME: 5,
  SOUND_MUSIC_VOLUME: 5,
  SOUND_SYSTEM_VOLUME: 10,
  SOUND_OPTIONS: {
    SOUND_EFFECTS_VOLUME: { min: 0, max: 10, step: 1 },
    SOUND_MUSIC_VOLUME: { min: 0, max: 10, step: 1 },
    SOUND_SYSTEM_VOLUME: { min: 0, max: 10, step: 1 },
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
};

OnDaRun.spriteDefinition = {
  CLOUD: { x: 176, y: [1,20,46,61,76,95] },
  CRASH: { x: 37, y: 40},
  DUST: { x: 776, y: 2 },
  HORIZON: { x: 2, y: 104 },
  MOON: { x: 954, y: 0 },
  NATHERINE: { x: 0, y: 0 },
  RESTART: { x: 0, y: 40 },
  TEXT_SPRITE: { x: 0, y: 0 },
  STAR: { x: 1114, y: 0 }
};

OnDaRun.sounds = {
  BUTTON_PRESS: 'offline-sound-press',
  SOUND_HIT: 'offline-sound-hit',
  SOUND_ERROR: 'offline-sound-error',
  SOUND_SCORE: 'offline-sound-reached',
  SOUND_SLIDE: 'offline-sound-slide',
  SOUND_DROP: 'offline-sound-drop',
  SOUND_JUMP: 'offline-sound-piskup',
  SOUND_CRASH: 'offline-sound-crash',
  SOUND_OGGG: 'offline-sound-oggg',
  SOUND_QUACK: 'offline-sound-quack',
  SOUND_BICYCLE: 'offline-sound-bicycle',
  SOUND_BLIP: 'offline-sound-blip',
  SOUND_POP: 'offline-sound-pop',
};

OnDaRun.keycodes = {
  JUMP: { '38': 1, '32': 1, '39': 1 },  // Up, spacebar, Right
  SLIDE: { '37': 1, '40': 1 },  // Left, Down
  RESTART: { '13': 1 }  // Enter
};

HorizonLine.dimensions = {
  WIDTH: 600,
  HEIGHT: 23,
  YPOS: DEFAULT_HEIGHT-23
};

Cloud.config = {
  HEIGHTS: [18,24,12,14,18,9],
  MAX_CLOUD_GAP: 400,
  MAX_SKY_LEVEL: 30,
  MIN_CLOUD_GAP: 50,
  MIN_SKY_LEVEL: DEFAULT_HEIGHT - 79,
  WIDTH: 60,
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
  STAR_MAX_Y: DEFAULT_HEIGHT - 50,
};

NightMode.phases = [140, 120, 100, 60, 40, 20, 0];

customElements.define('n7e-ondarun', OnDaRun);
