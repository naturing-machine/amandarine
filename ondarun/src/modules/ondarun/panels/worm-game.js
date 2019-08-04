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

import { N7e } from '../../../n7e.js';
import { OnDaRun } from '../../../ondarun.js';

import { Sound } from '../../sound.js';

import { Text } from '../text.js';

import { Panel } from './panel.js';

export class WormGame extends Panel {

  dropTangerine(){
    let putPoint = N7e.randomInt( 0, this.freeSpace- this.length- 1);
    for( let y = 0; y < this.height; y++ )
    for( let x = 0; x < this.width; x++ ){
      if( null === this.map[ y *this.width+ x ]){
        if( putPoint == 0 ){
          this.map[ y *this.width+ x ] = "T";
          this.tangerineX = x;
          this.tangerineY = y;
          return;
        }
        putPoint--;
      }
    }
    this.exit();
  }

  constructor( canvas, previousPanel ){
    super( canvas, previousPanel );
    // Map
    this.width = 21;
    this.height = 21;
    // minX, miny => 0, 0
    let mapSource =
`
_#_#_#_#_#_#_#0#0#0#_O0#0#0#_#_#_#_#_#_#_#
_#_#_#_#_#0#0#1_1_1_1_1_1_1_0#0#_#_#_#_#_#
_#_#_#_#0#1_1_1_1_1_1_1_1_2_2_2_0#_#_#_#_#
_#_#_#0#1_1_1_1_1_1_1_2_2_2_3_3_2_0#_#_#_#
_#_#0#1_1_1_1_1_1_1_1_2_2_3_3_3_3_2_0#_#_#
_#0#1_1_1_1_1_1_1_1_2_2_2_3_3_3_3_3_2_0#_#
_#0#1_1_1_1_1_1_1_1_2_2_2_2_3_3_3_3_2_0#_#
0#1_1_1_1_1_1_1_1_1_2_2_2_2_2_3_3_2_2_1_0#
0#1_1_1_1_1_1_1_1_1_1_2_2_2_2_2_2_2_1_1_0#
0#1_1_1_1_1_1_1_1_1_1_2_2_2_2_2_2_2_1_1_0#
0#1_1_1_1_1_1_1_1_1_1_1_1_2_2_2_1_1_1_1_0#
0#1_1_1_1_1_1_1_1_1_1_1_1_1_1_1_1_1_1_1_0#
0#1_1_1_1_1_1_1_1_1_1_1_1_1_1_1_1_1_1_1_0#
0#1_1_1_1_1_1_1_1_1_1_1_1_1_1_1_1_1_1_1_0#
_#0#1_1_1_1_1_1_1_1_1_1_1_1_1_1_1_1_1_0#_#
_#0#1_1_1_1_1_1_1_1_1_1_1_1_1_1_1_1_1_0#_#
_#_#0#1_1_1_1_1_1_1_1_1_1_1_1_1_1_1_0#_#_#
_#_#_#0#1_1_1_1_1_1_1_1_1_1_1_1_1_0#_#_#_#
_#_#_#_#0#1_1_1_1_1_1_1_1_1_1_1_0#_#_#_#_#
_#_#_#_#_#0#0#1_1_1_1_1_1_1_0#0#_#_#_#_#_#
_#_#_#_#_#_#_#0#0#0#0#0#0#0#_#_#_#_#_#_#_#
`.split('\n').join('').split('');
    let mapColors = new Map([['0', '#2a595f'],['1', '#8f3900'], ['2', '#8f4c00'], ['3', '#af7500'], ['_', null ]]);
    let mapBlocks = new Map([['_', null ],['#', '#'],['O','O']]);

    this.freeSpace = 0;
    this.map = Array( this.width * this.height );
    this.mapStyles = Array( this.width * this.height );
    for( let y = 0; y < this.height; y++ )
    for( let x = 0; x < this.width; x++ ){
      let d = y *this.width+ x;
      this.mapStyles[ d ] = mapColors.get( mapSource.shift());
      this.map[ d ] = mapBlocks.get( mapSource.shift());
      if( this.map[ d ] === null ){
        this.freeSpace++;
      } else if( this.map[ d ] === 'O'){
        this.curX = x;
        this.curY = y;
        this.map[ d ] = null; // Should be a way-out symbol.
      }
    }

    this.buttonQueue = [];
    // Tangerine

    // Worm
    this.toX = this.curX;
    this.toY = this.curY+ 1;

    this.dir = WormGame.direction[ 2 ];
    let tl = {
      dir: this.dir,
      positions: [],
    };
    for( let i = 1; i < 3; i++ ){
      tl.positions.push({ x: this.curX, y: this.curY- i });
    }
    this.turningLines = [ tl ];
    this.length = 1;
    this.dropTangerine();

    //this.dirText = new Text().setString('2');
    this.displayRot = this.targetRot = -Math.PI;
    this.stepping = 0;
    this.stepLength = 200;
    this.stepPause = /* 0.5* */this.stepLength;
    this.spinTimer = this.maxSpinTimer = 0.8*this.stepLength;
  }

  handleEvent( e ){
    if( !super.handleEvent( e )){
      return false;
    }
    let button;
    if( e.type == OnDaRun.events.CONSOLEDOWN ){
      button = e.detail.consoleButton;
      switch( button ){
        case ODR.consoleButtons.CONSOLE_LEFT:
        case ODR.consoleButtons.CONSOLE_RIGHT:{
          if( !this.end ){
            this.buttonQueue.push( button );
          } else if( this.timer - this.end > 1000){
            this.exit();
          }
        } break;
      }
    }

    return true;
  }

  turn(){
    this.turningLines.unshift({
      dir: this.dir,
      positions: [],
    });
  }

  forward( deltaTime ){
    if( this.end ){
      return super.forward( deltaTime );
    }
    this.stepping+= deltaTime;
    while( this.stepping > this.stepLength ){
      this.stepping-= this.stepLength;

      let tl = this.turningLines;
      tl[ 0 ].positions.unshift({
        x: this.curX,
        y: this.curY,
      });

      this.curX = this.toX;
      this.curY = this.toY;
      this.length++;

      let d =  this.curY *this.width+ this.curX;
      if( this.map[ d ] === 'T' ){
        this.map[ d ] = 'W';
        this.dropTangerine();
        ODR.soundEffects.SOUND_POP.play( ODR.config.SOUND_SYSTEM_VOLUME/10 );
      } else {

        // Only adjust length if the worm part is inside the map.
        let p = tl[ tl.length - 1 ].positions.pop();
        if( N7e.clamp( p.x, 0, this.width- 1 ) == p.x
          && N7e.clamp( p.y, 0, this.height- 1 ) == p.y ){

          this.map[ p.y *this.width+ p.x ] = null;
          this.length--;
        }

        if( tl[ tl.length - 1 ].positions.length == 0 ){
          tl.pop();
        }
        let positions = tl[ tl.length - 1 ].positions;
        positions[ positions.length - 1 ].last = true;

        // After shrinking, test hit.
        if( this.map[ d ] !== null ){
         ODR.soundEffects.SOUND_HIT.play( ODR.config.SOUND_SYSTEM_VOLUME/10 );
         this.end = this.timer;
        }

        this.map[ d ] = 'W';
      }

      if( this.buttonQueue.length ){

        switch( this.buttonQueue.shift()){
          case ODR.consoleButtons.CONSOLE_LEFT:
            this.dir = this.dir.acw;
            this.turn();
            break;
          case ODR.consoleButtons.CONSOLE_RIGHT:
            this.dir = this.dir.cw;
            this.turn();
            break;
        }

        this.targetRot = -this.dir.r;
        this.spinTimer = 0;

        //this.dirText.setString(`${this.dir}`);
      }
      //this.turningLines[0].push;

      this.toY += this.dir.y;
      this.toX += this.dir.x;

      //hit test here
    }
    if( this.spinTimer < this.maxSpinTimer){
      this.spinTimer+= deltaTime;
    } else {
      this.spinTimer = this.maxSpinTimer;
      this.displayRot = this.targetRot;
    }
    return super.forward( deltaTime );
  }

  repaint( deltaTime ){
    if( this.end ){
      return;
    }

    let rot = this.displayRot;
    let rs = this.spinTimer / this.maxSpinTimer
      *( N7e.mod( this.targetRot- this.displayRot+ Math.PI, 2*Math.PI )- Math.PI );

    let ctx = this.canvasCtx;
    ctx.drawImage( ...ODR.consoleImageArguments );
    //this.dirText.draw( ctx, 0, 0 );

    ctx.save(); {

      ctx.translate( 300, 120 );

      ctx.scale( 15, 15 );
      ctx.lineWidth = 1/5;

      ctx.save(); {
        ctx.rotate( rot+rs );

        let s = Math.max( this.stepping - this.stepLength+ this.stepPause, 0 ) /this.stepPause;
        let sx = s*( this.toX- this.curX );
        let sy = s*( this.toY- this.curY );
        ctx.translate( -sx, -sy );

        ctx.save();
          ctx.translate( -this.curX- 0.5, -this.curY- 0.5 );
          for( let x = 0; x < this.width; x++ )
          for( let y = 0; y < this.height; y++ ){
            // let d =  this.curY *this.width+ this.curX;
            // let entity = this.map[ d ];
            let s = this.mapStyles[ y * this.width + x ];
            if( s ){
              ctx.fillStyle = s;
              ctx.fillRect( x, y, 1, 1 );
            }
          }

          //Tangerine
          ctx.save();
            ctx.fillStyle = '#f28500';
            ctx.translate( this.tangerineX+ 0.5, this.tangerineY+ 0.5 );
						let tscale = 0.8+ 0.2*Math.abs(Math.sin( this.timer/100 ));
						ctx.scale( tscale, tscale );
            ctx.rotate( -rot-rs );
            ctx.beginPath();
            ctx.arc( 0, 0, 0.65, -Math.PI/2, Math.PI );
            ctx.fill();
            ctx.fillStyle = '#fa0';
            ctx.beginPath();
            ctx.arc( 0.2, -0.2, 0.3, 0, 2*Math.PI );
            ctx.fill();
            // Leaf
            ctx.fillStyle = '#060';
            ctx.beginPath();
            ctx.arc( -0.65, -0.65, 0.65, 0, Math.PI/2 );
            ctx.arc( 0, 0, 0.65, Math.PI, -Math.PI/2 );
            ctx.fill();
          ctx.restore();

        ctx.restore();


        // Body
        ctx.fillStyle = '#0f0';
        let lastSpot = { x: s *this.dir.x , y: s *this.dir.y };
        let l = 0;
        this.turningLines.forEach( point => {
          let dir = point.dir;
  //        ctx.fillStyle = `hsl(${(dir.r *180/Math.PI)|0}, 100%, 50%)`;
          point.positions.forEach(( pos, index ) => {
            ctx.beginPath();
            let r = pos.last ? 0.4 : 0.5;
            r+= Math.sin( l + this.timer/200 )/20;
            if( pos.last && this.toX === this.tangerineX && this.toY === this.tangerineY ){
              ctx.arc( pos.x- this.curX, pos.y- this.curY, r, 0, 2*Math.PI );
              ctx.closePath();
              ctx.arc( pos.x- this.curX+ s *dir.x/2, pos.y- this.curY+ s *dir.y/2, r, 0, 2*Math.PI );
              ctx.closePath();
            }
            let px = pos.x- this.curX+ s *dir.x;
            let py = pos.y- this.curY+ s *dir.y;
            ctx.arc( px, py, r, 0, 2*Math.PI );
            ctx.closePath();
            ctx.arc(( px + lastSpot.x )/2, ( py + lastSpot.y )/2, r+0.05, 0, 2*Math.PI );
            ctx.closePath();
            lastSpot.x = px;
            lastSpot.y = py;
            ctx.fill();
            l++;
          });
        });

      } ctx.restore();


      // Head
      ctx.fillStyle = "#0f0";
      ctx.beginPath();
      ctx.arc(0, 0, 0.4, 0, 2 * Math.PI);
      ctx.fill();
          // Eyes
          ctx.fillStyle = "#fff";
          ctx.beginPath();
          ctx.arc(-0.3, -0.2, 0.2, 0, 2 * Math.PI);
          ctx.arc( 0.3, -0.2, 0.2, 0, 2 * Math.PI);
          ctx.fill();
          ctx.fillStyle = "#000";
          ctx.beginPath();
          ctx.arc(-0.3, -0.3, 0.1, 0, 2 * Math.PI);
          ctx.arc( 0.3, -0.3, 0.1, 0, 2 * Math.PI);
          ctx.fill();
    } ctx.restore();
  }

}

WormGame.direction = {
  0: { x: 0, y: -1, i:0, r: 0 },
  1: { x: 1, y: 0, i:1, r: Math.PI/2 },
  2: { x: 0, y: 1, i:2, r: Math.PI },
  3: { x: -1, y: 0, i:3, r: Math.PI*3/2 },
}

for( let i = 0; i < 4; i++ ){
  WormGame.direction[ i ].acw = WormGame.direction[ N7e.mod( i- 1, 4 )];
  WormGame.direction[ i ].cw = WormGame.direction[ N7e.mod( i+ 1, 4 )];
}
