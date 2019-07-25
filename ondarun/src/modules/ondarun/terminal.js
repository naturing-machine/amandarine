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

import { Text } from './text.js';

/**
 * Message
 * A timed string for Terminal class.
 */
export class Message {
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

export class Terminal {
  constructor( canvas, minX, minY, alignment ){
    this.canvas = canvas;
    this.canvasCtx = canvas.getContext('2d');
    this.messages = [];
    this.timer = 0;
    //TODO make width configurable
    this.text = new Text();
    this.endTime = Infinity;
    this.minX = minX;
    this.minY = minY;
    this.alignment = alignment;
  }

/**
 * Terminal
 * Flush all loaded messages.
 */
  flush(){
    this.timer = 0;
    this.messages = [];
    this.text.set``;
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
      this.text.set``;
      this.endTime = Infinity;
    }

    this.text.draw( this.canvasCtx, this.minX, this.minY, this.alignment );
  }
}

export class Notifier {
  constructor( canvas ){
    this.canvas = canvas;
    this.canvasCtx = canvas.getContext('2d');
    this.timer = 0;
    this.text = new Text( 35, 33 );
    this.opacity = 0;
  }

  notify( messageStr, timer = 2000, lineWidth = 18 ){
    this.timer = timer;
    this.text.setString( messageStr, null, lineWidth );
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

      let alphaRestore = this.canvasCtx.globalAlpha;
        this.canvasCtx.globalAlpha = this.opacity;
        this.text.draw( this.canvasCtx,
          14 - 20*(1 - this.opacity), 10,
          Math.ceil( 14*this.opacity ), Math.ceil( 16*this.opacity ));
      this.canvasCtx.globalAlpha = alphaRestore;

      this.timer -= deltaTime;
    }
  }
}

export class Scoreboard {
  constructor( canvas ){
    this.canvas = canvas;
    this.canvasCtx = canvas.getContext('2d');
    this.glyphs = new Text().set`0123456789`.glyphs;

    this.reset();
  }

  reset(){
    this.nextScoreAchievement = 100;
    this.flashAchievementTimer = 0;
    this._score = 0;
    this.text = null;
    this.opacity = 0;
    this.existence = 0;
    this.template = `${Text.c[ODR.gameMode.icon]}00000`;
    this._minTang = null;
    this._maxTang = null;
    this.replay = false;
  }

  set replay( willReplay ){
    this._replay = willReplay;
    if( willReplay ){
      this.template = `replay ${Text.c.gameR}00000`;
      this.score = 0;
      this.replayBlink = [];
      this.replayBlink[0] = this.text;
      this.template = `${Text.c[ODR.gameMode.icon]}00000`;
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

  // maxTangerines must be set before minTangerines
  set maxTangerines( newMaxTang ){
    if( this.replay ) return;
    if( newMaxTang != this._maxTang ){
      this._maxTang = newMaxTang;
      this._minTang = 0;
      this.template = `${Text.c.tangerine}${this._maxTang}:${this._minTang} ${Text.c[ODR.gameMode.icon]||'trophy'}00000`;
    }
  }
  set minTangerines( newMinTang ){
    if( this.replay ) return;
    if( newMinTang != this._minTang ){
      this._minTang = newMinTang;
      this.template = `${Text.c.tangerine}${this._maxTang}:${this._minTang} ${Text.c[ODR.gameMode.icon]||'trophy'}00000`;
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
        newScore = this._playAchievement;
      }
    } else {
      newScore = this._playAchievement;
    }

    if( !this.text ){
      this.text = new Text().set`${this._template}`;
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
    let alphaRestore = this.canvasCtx.globalAlpha;
      this.canvasCtx.globalAlpha = this.opacity;
      this.text.draw( this.canvasCtx, this.existence ? 590 : 0, 10, 1, 10+ 8*this.opacity );
    this.canvasCtx.globalAlpha = alphaRestore;
    } else {
      this.text.draw( this.canvasCtx, 590, 10, 1, 18, 16 );
    }
  }

}

Scoreboard.achievementScore = 100;
