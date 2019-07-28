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

export class Pause extends Panel {
  constructor( canvas, previousPanel = null , silent = false ){
    super( canvas, previousPanel );
    this.silent = silent;
  }

  paintOnce(){
    if( !this.silent ){
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

  handleEvent( e ){
    return true;
  }

  activate( isActive ){
    console.log('▮▮ PAUSED');
    this.paintOnce();
    ODR.__gamePausedSong = Sound.inst.currentSong;
    if( ODR.__gamePausedSong ){
      ODR.__gamePausedSong.stop( 1 );
    }
  }

  exit( panel ){
    if( !this.silent ){
      ODR.canvas.style.opacity = 1 - ODR.config.GRAPHICS_DAY_LIGHT/5;
    }

    console.log('▶ PLAYING');
    let currentSong = Sound.inst.currentSong;
    if( currentSong && ODR.__gamePausedSong === currentSong ){
      currentSong.resume( 1 );
    }

    return super.exit( panel );
  }
}
