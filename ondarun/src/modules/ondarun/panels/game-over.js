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
import { User } from '../../user.js';

import { Text } from '../text.js';
import { Tangerine } from '../entity.js';
import { Message } from '../terminal.js';

import { Panel } from './panel.js';

export class GameOver extends Panel {
  constructor( canvas ){
    super( canvas );
    this.timer = 0;
    this.passthrough = true;
    this.willRestart = false;
    this.playedMusic = false;
    this.newHighTimer = 0;

    if( ODR.runSession.hiscore < ODR.score)
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
      && this.noPressed ){

      this.willRestart = true;
      ODR.gameState = 1;

    }
    return true;
  }

  repaint( deltaTime ){
    if( this.willRestart ){
      this.repaintRestarting( deltaTime );
    } else {
      let alphaRestore = this.canvasCtx.globalAlpha;
        this.repaintGameOver( deltaTime );
      this.canvasCtx.globalAlpha = alphaRestore;
    }
  }

  repaintRestarting( deltaTime ){
    //TODO transition
    this.exit( null );
  }

  repaintGameOver( deltaTime ){
    // Jumping OGG Block slices
    this.canvasCtx.globalAlpha = Math.min( 1, this.timer/100 );

    let blockTimeFactor = [ 8, 6, 4, 8, 5, 9, 7, 11 ];
    let blockSlices = [ 0, 15, 15, 15, 15, 15, 6, 6 ];
    let td = 15;
    for( let b = 0, x = 0; b < 8; x+= blockSlices[ b ], b++ ){
      let t = this.timer - blockTimeFactor[ b ]**2;
      let d = Math.max(0, 100 - t/td);
      let a = t%250 / 250;
      let y = Math.min( 50, 50- d *a+ d *a**2 );

      if( b > 0 ){
        this.canvasCtx.drawImage( ODR.spriteGUI,
            x, 159, blockSlices[ b ], 17,
            257 + x , Math.floor(y),
            blockSlices[ b ], 17);
      } else {
        this.canvasCtx.drawImage( ODR.spriteGUI,
            x, 150, 15, 9,
            257 + x , Math.floor(y) - 9,
            15, 9);
      }
    }

    if( this.timer < 1000 ) return;
    let lineY = 90;

    let newHigh = ODR.runSession.hiscore < ODR.score ? ' a new high!':'';
    if( !newHigh ) this.playMusicIfNeeded();

    this.__gameModeTitle = this.__gameModeTitle || new Text().setString( ODR.gameMode.title );
    this.__gameModeTitle.draw( this.canvasCtx, 300, lineY, 0 );

    lineY+=20;
    this.__scoreTitle = this.__scoreTitle || new Text().setString( 'SCORE:' );
    this.__scoreTitle.draw( this.canvasCtx, 300, lineY, 1);

      let showScore = Math.min( 1, ( this.timer - 1000 )/1000 );
      let showHi = Math.min( 1, ( this.timer - 1500 )/1500 );
      let t = 2000;
      let showNewHi = Math.min( 1, ( this.timer - t )/t );

      this.__score = this.__score || new Text();
      this.__score.setString(` ${
        Math.round( ODR.score *showScore )
      }${
        1 == showNewHi ? newHigh :''
      }`).draw( this.canvasCtx, 300, lineY );

    if( ODR.sequencer.dejavus ){
      return;
    }

    if( showHi == 1 ){
      let diff = ODR.gameModeScore - ODR.runSession.hiscore;

      lineY += 20;
      this.__hiScoreTitle = this.__hiScoreTitle || new Text().setString('HIGH SCORE:');
      this.__hiScoreTitle.draw( this.canvasCtx, 300, lineY, 1 );
        this.__hiScore = this.__hiScore || new Text();
        this.__hiScore.setString(` ${
          1 == showNewHi
          ? ODR.runSession.hiscore + Math.floor( diff * this.newHighTimer/1000 )
          : ODR.runSession.hiscore
        }`).draw( this.canvasCtx, 300, lineY );

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
          this.newHighTimer = Math.min( 1000 , this.newHighTimer+ deltaTime );
        }

        lineY += 20;
        let showTang = Math.min( 1, ( this.timer - t )/t );
        if( showTang == 1 && User.inst.uidRef ){
          let gotO = ODR.runSession.tangerines ? `${ODR.runSession.tangerines} ` : "";
          t+= gotO ? 500 : 0;
          let showDaily = Math.min( 1, ( this.timer - t )/t );
          let gotT = ( showDaily == 1 ? `[${Tangerine.allDayMax}:${User.inst.dailyTangerines}]` : '');
          this.__tangTitle = this.__tangTitle || new Text().set`${'tangerine'}:`;
          this.__tangTitle.draw( this.canvasCtx, 300, lineY, 1 );
            this.__tangScore = this.__tangScore || new Text();
            this.__tangScore.set` ${gotO}${gotT}`.draw( this.canvasCtx, 300, lineY );

          if( !this.playedGotO && gotO ){
            Sound.inst.effects.SOUND_POP.play( ODR.config.SOUND_SYSTEM_VOLUME/10 );
            this.playedGotO = true;
          }
        }

      }// if( showNewHi == 1 )
    }// if( showHi == 1 )


  }
}
