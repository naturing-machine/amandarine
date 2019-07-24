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

import { N7e } from '../n7e.js';
import { OnDaRun } from '../ondarun.js';

import { Text } from '../modules/text.js';

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
    this.text = new Text( 20 );
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
