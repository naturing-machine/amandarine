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

/*
  N7e : global application service
  OnDaRun : the class of the runner game
  ODR : application instance of OnDaRun
*/

import { N7e } from '../../n7e.js';
import { OnDaRun } from '../../ondarun.js';
import { User } from '../user.js';

var FPS = N7e.FPS;

import { Space, Tangerine, Cactus, SmallCactus, LargeCactus, Velota, Rotata, DuckType, Liver, Rubber } from './entity.js';
// TODO Sequencer should also manage gameMode
// ie. state setting should pass control to Sequencer so it may initialize then
// game, adjusting speed, pushing the game forward while ODR is measuring the results
export class Sequencer {
  constructor( canvas ){
    this.canvas = canvas;
    this.canvasCtx = this.canvas.getContext('2d');
    this.resetEntities();
    this.totalRecall = null;
    this.dejavus = null;

    Tangerine.dropRate = 10;
    this.tangerineTimer = 0;
    this.tangerineTimerGap = 5000;

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

  get shouldDropTangerines(){
    return User.inst.uidRef && this.tangerineTimer >= this.tangerineTimerGap && Tangerine.shouldDrop;
  }

  reset(){
    this.resetEntities();

    this.dejavus = null;
    if( ODR.config.GAME_MODE_REPLAY ){
      this.totalRecall = [ ODR.gameMode ];
    } else {
      this.totalRecall = null;
    }

    this.tangerineTimer = 0;
  }

  resetEntities() {
    if( this.entities ){
      this.entities.forEach( entity => entity.removed = true );
    }

    let t = ODR.config.CLEAR_TIME/1000;
    let v = ODR.config.SPEED * FPS;
    let a = ODR.config.ACCELERATION * FPS * 1000;

    let clearZone = new Space( OnDaRun.DefaultWidth + t * v + 0.5*a * t**2 );

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

    //Drop tangerine
    this.tangerineTimer += deltaTime;

    if( 1 == entityExistence ) {
      lastEntity = this.forwardEntities( deltaTime, currentSpeed, decrement );
    } else if( entityExistence > 0 ) {
      let alphaRestore = this.canvasCtx.globalAlpha;
      this.canvasCtx.globalAlpha = entityExistence;
      lastEntity = this.forwardEntities( deltaTime, currentSpeed, decrement );
      this.canvasCtx.globalAlpha = alphaRestore;
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
        Sequencer.situation.SituationC,
        Sequencer.situation.SituationD ][ N7e.randomInt( 0, 3 )];
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
      if( this.shouldDropTangerines && !N7e.randomInt( 0, Tangerine.dropRate )){
        Tangerine.shouldDrop = false;
        this.tangerineTimer = 0;
        let tangerine = new Tangerine( this.canvasCtx, DuckType.elevationList[ N7e.randomInt( 1, 4 )]);
        let minGap = Math.round( 50*currentSpeed + 72 );
        let space = new Space( N7e.randomInt( minGap, Math.round( minGap * 1.5 )));
        space.ctx = this.canvasCtx;
        tangerine.minX = space.minX + space.width/2 - 25;
        this.addEntity( space, tangerine );
        return;
      }

      let situation = lastEntity ? this.getSituation( currentSpeed ) : 0;

      if( ODR.config.GAME_MODE_REPLAY && !this.dejavus ){
        this.__situationMarker = situation.name;
      }

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
            this.addEntity( lastEntity.muster( 250+ i * 550 , currentSpeed, cactus ));
          }

          this.addEntity( cactus.muster( 0, currentSpeed, new Space( 100*currentSpeed )));
        } break;

        case Sequencer.situation.SituationD: {
          this.addEntity( lastEntity.muster( 0, currentSpeed, new Space( 180*currentSpeed )));

          this.addEntity( lastEntity.muster( 1500, currentSpeed,
            new Rubber( this.canvasCtx, currentSpeed * Rubber.speedFactor *( 0.9 + 0.1*Math.random()), DuckType.elevationList[ 1 ])));
          this.addEntity( lastEntity.muster( 1600, currentSpeed,
            new Liver( this.canvasCtx, currentSpeed * Liver.speedFactor, DuckType.elevationList[ 2 ])));
          this.addEntity( lastEntity.muster( 1700, currentSpeed,
            new Rubber( this.canvasCtx, currentSpeed * Rubber.speedFactor *( 0.9 + 0.1*Math.random()), DuckType.elevationList[ 4 ])));

          this.addEntity( lastEntity.muster( 2000, currentSpeed, Cactus.getRandomObstacle( this.canvasCtx, currentSpeed )));
          this.addEntity( lastEntity.muster( 2100, currentSpeed, Cactus.getRandomObstacle( this.canvasCtx, currentSpeed )));

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
    if( this.__situationMarker ){
      entry.marker = this.__situationMarker;
    }

    switch( entity.constructor.name ){
      case 'SmallCactus':
      case 'LargeCactus':
        entry.size = entity.size;
      case 'Liver':
      case 'Rubber':
        if( !entry.size ){
          entry.elevation = OnDaRun.DefaultHeight - entity.minY;
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
  <path class="SituationD" d="M 1,0.9 0.25,0.95 1,1 Z" />
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
