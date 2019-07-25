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

export class Wait extends Panel {
  constructor( canvas, previousPanel = null, bottomMessage /*, progressingCallback*/ ) {
    super( canvas, previousPanel );
    //this.progressingCallback = progressingCallback;
    this.timer = 0;
    this.ticker = 0;
    this.bottomText = new Text( 0, bottomMessage );
    // Prevent Pause
    // FIXME, if needed, pause should be activated at the ending.
    // Should return a promise
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

    /*
    if( this.progressingCallback ){
      this.progressingCallback( this );
    }
    */
  }

  handleEvent( e ){
    return true;
  }
}
