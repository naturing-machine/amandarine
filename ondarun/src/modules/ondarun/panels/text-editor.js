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

export class TextEditor extends Panel {
  constructor( canvas, value, callback, previousPanel ){
    super( canvas, previousPanel );
    this.xOffset = 0;
    this.yOffset = 0;
    this.bottomText = new Text().set`press both ${'slide'}+${'jump'} to select`;

    this.offsetH = 0;
    this.offsetV = 0;

    this.__valueText = new Text();
    this.value = value;
    this.curX = 4;
    this.curY = 2;
    this.verticalMode = false;

    this.callback = callback;
    this.pattern = Text.$
`${'natA'}${'cake'}'!l?"${'heart'}${'natB'}
,qkwhmv${'football'}${'trophy'}
dnat eoir
yjgfsujx${'sun'}
()%pcbz${'redcross'}${'noentry'}
01234+-${'tangerine'}${'false'}
56789*/.${'true'}`

    this.textPattern = new Text().setString( this.pattern );
    this.supportedChars = [...this.pattern.split('\n').join('')];
    this.guidePattern = new Text().setString("cancel\ndelete\nok");

    let glyphsForIndex = [ 0, 0, 1, 1, 0, 1 ]
      .map( gi => Text.glyphMap.get( Text.c[['slide','jump'][gi]].codePointAt( 0 )));

    function gd( x, y, text, ctx, gidx, cidx ){
      let glyph = glyphsForIndex[ cidx ];
      let math = Math.abs(Math.sin( ODR.time/200 ));

      let alphaRestore = ctx.globalAlpha;
        ctx.globalAlpha = 1 - 0.3*math;
        ctx.drawImage( ODR.spriteGUI,
          glyph, 0, 14, 16,
          ~~x, ~~(y + 2 - 3*math), 14, 16 );
      ctx.globalAlpha = alphaRestore;
    }

    // Guiding text on the right side.
    this.guideText = new Text().set
`${gd}+${'jump'} Up

${gd} Left ${gd} Right

${'slide'}+${gd} Down

${gd}+${gd} Choose`;

  }

  get value(){
    return this.codes.join('');
  }

  set value( newValue ){
    this.codes = [...newValue ];
    this.__valueText.setString( this.value );
  }

  updateCodeText(){
    this.__valueText.setString( this.value );
  }

  handleEvent( e ){
    if( e.ctrlKey ) return false;

    e.preventDefault();
    switch( e.type ){
      case OnDaRun.events.KEYDOWN:
        return ( e.key == 'Delete'
          || e.key == 'Enter'
          || this.supportedChars.indexOf( e.key.toLowerCase()) != -1 );
      case OnDaRun.events.KEYUP:
        if( e.key == 'Delete' ){
          Sound.inst.effects.SOUND_POP.play( 0.5 * ODR.config.SOUND_SYSTEM_VOLUME/10 );
          this.codes = this.codes.slice( 0, this.codes.length- 1 );
          this.updateCodeText();
          return true;
        } else if (e.key == 'Enter') {
          Sound.inst.effects.SOUND_BLIP.play( ODR.config.SOUND_SYSTEM_VOLUME/10 );
          this.curX = 8;
          this.curY = 6;
          this.enterAtCursor();
          return true;
        } else if( this.supportedChars.indexOf(e.key.toLowerCase()) != -1) {
          if( this.codes.length >= 25 ){
            this.codes = this.codes.slice( 0, 25 );
            Sound.inst.effects.SOUND_ERROR.play( ODR.config.SOUND_SYSTEM_VOLUME/10 );
          } else {
            this.codes.push( e.key.toLowerCase());
            Sound.inst.effects.SOUND_SCORE.play( ODR.config.SOUND_SYSTEM_VOLUME/10 );
          }
          this.updateCodeText();
          return true;
        }
        return false;
        break;
    }

    // Handle console button events.

    if( !super.handleEvent( e )){
      return false;
    }

    let button = e.detail.consoleButton;

    if( this.verticalMode && this.dualReleased ){
      this.verticalMode = false;
    } else if( this.dualReleased ){
      this.enterAtCursor();
    } else if( this.dualPressed && !this.halfDualPressed
      || this.halfDualReleased && !this.verticalMode ){

    } else switch( e.type ){
      case OnDaRun.events.CONSOLEDOWN: {
        if( this.halfDualPressed ){
          this.verticalMode = true;
        }
        switch( button ){
          case ODR.consoleButtons.CONSOLE_LEFT:{
          } break;
          case ODR.consoleButtons.CONSOLE_RIGHT:{
          } break;
        }
      } break;
      case OnDaRun.events.CONSOLEUP: {
        switch( button ){
          case ODR.consoleButtons.CONSOLE_LEFT:{
            if( this.verticalMode )
              this.offsetV++;
            else
              this.offsetH--;
          } break;
          case ODR.consoleButtons.CONSOLE_RIGHT:{
            if( this.verticalMode )
              this.offsetV--;
            else
              this.offsetH++;
          } break;
        }

        if( this.offsetV || this.offsetH ){
          if( !this.muted ){
            Sound.inst.effects.SOUND_BLIP.play( ODR.config.SOUND_SYSTEM_VOLUME/10 );
          }

          if( this.offsetH != 0 ){
            this.curX += this.offsetH;
            this.offsetV -= Math.floor( this.curX/9 );
            this.curX = N7e.mod( this.curX, 9 );
            this.offsetH = 0;
          }

          if( this.offsetV != 0 ){
            this.curY = N7e.mod( this.curY- this.offsetV, 7 );
            this.offsetV = 0;
          }

        }

      } break;
    }

    return true;
  }

  enterAtCursor(){
    if( this.curX == 8 && this.curY == 6 ){
      // OK
      this.callback( this.value );
    } else if( this.curX == 8 && this.curY == 5 ){
      // Delete
      Sound.inst.effects.SOUND_POP.play( 0.5 * ODR.config.SOUND_SYSTEM_VOLUME/10 );
      this.codes = this.codes.slice( 0, this.codes.length- 1 );
      this.updateCodeText();
    } else if( this.curX == 8 && this.curY == 4 ){
      // Cancel
      this.exit();
    } else {
      let newChar = this.supportedChars[ this.curY * 9 + this.curX ]
      this.codes.push( newChar);

      if( " abcdefghijklmnopqrstuvwxyz".includes( newChar )){
        this.curX = 4;
        this.curY = 2;
      }

      if( this.codes.length > 25 ){
        this.codes = this.codes.slice( 0, 25 ).join('');
        Sound.inst.effects.SOUND_ERROR.play( ODR.config.SOUND_SYSTEM_VOLUME/10 );
      } else {
        Sound.inst.effects.SOUND_SCORE.play( ODR.config.SOUND_SYSTEM_VOLUME/10 );
      }
      this.updateCodeText();
    }
  }

  repaint( deltaTime ){
    this.canvasCtx.drawImage( ...ODR.consoleImageArguments );

    this.canvasCtx.fillStyle = "#444";
    if( this.verticalMode ){
      this.canvasCtx.fillRect( this.xOffset+ 25*this.curX,
        this.yOffset+ 27, 23, 25*7- 2  );
    } else {
      this.canvasCtx.fillRect( this.xOffset,
        this.yOffset+ 27+ 25*this.curY, 25*9- 2, 23 );
    }

    this.canvasCtx.fillStyle = "#a60";
    this.canvasCtx.fillRect( this.xOffset+ 25*this.curX,
      this.yOffset+ 2+ ( 1+ this.curY )*25, 23, 23 );
    this.textPattern.draw( this.canvasCtx, 5+ this.xOffset, 7+ 25+ this.yOffset, -1, 25, 25 );

    this.guidePattern.draw( this.canvasCtx, 230+ this.xOffset, 207-25*3, -1, 14, 25 );
    this.guideText.draw( this.canvasCtx, 590, 30, 1, 14, 22 );

    this.canvasCtx.fillStyle = "#333";
    this.canvasCtx.fillRect(
      this.xOffset, this.yOffset+ 1,
      14*25 + 10, 23 );

    this.canvasCtx.fillStyle = this.timer%1000 > 500 ? "#333":"#fff8";
    if( this.codes.length < 25 ){
      this.canvasCtx.fillRect(
        14*this.codes.length+ 5, this.yOffset+ 1,
        14, 23 );
    }

    this.__valueText.draw(
      this.canvasCtx,
      this.xOffset + 5,
      this.yOffset + 7);

    return this;
  }

}
