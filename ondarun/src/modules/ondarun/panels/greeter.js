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

import { Panel } from './panel.js';

export class Greeter extends Panel {
  constructor( canvas, notifier ){
    super( canvas );
    this.timer = 0;
    this.passthrough = true;
    this.willStart = false;
    this.willStartTimer = 200;

    this.notifier = notifier;
    this.introScriptTimer = 2000;
    let natB = Text.$` ${'natB'}`;
    this.introScript = this.introScript || [
      20000, `Hi${User.inst.nickname ? '_'+User.inst.nickname.split(' ').join('_') : ''}!\nPress_${Text.c.slide}/${Text.c.jump}_to_start!`+ natB,
      20000, User.inst.nickname ? "Just play already!"+ natB : `What's your name? You can login by pressing the ${Text.c.trophy} button. ${Text.c.natB}`,
      20000, "OMG OMG OMG OMG OMG OMG OMG OMG OMG OMG OMG OMG OMG OMG OMG!! "+Text.c.natA+Text.c.heart+Text.c.cake,
      20000, "Didn't know you love the song that much!"+ natB,
      20000, "Allow yourself to be a beginner.\nNo one starts at the top."+Text.c.heart+ natB,
      20000, "You have no idea of the amount of\nHAPPINESS you brought into my life."+ natB,
      20000, 'I didnt say "I_love_you"\nto hear it back.\nI said it to make sure you knew.'+ natB,
      20000, 'Never give up on something you really want '+Text.c.heart+ natB,
      20000, Text.$`You are my sunshine ${'sun'}${'heart'} ${'natB'}`,
      20000, 'My love for you is a journey;\nStarting at forever,\nand ending at never.'+Text.c.heart+ natB,
      20000, 'Glory in life is not in never failing,\nbut rising each time we fail.'+Text.c.heart+ natB,
      20000, Text.$`Love this project?\nMake a donation to\nThe Thai Redcross Society ${'redcross'}! ${'natB'}`,
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
      && !this.rightPressed
      && !this.leftPressed ){

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
    if( N7e.isMobile ) return;
    let yMap = [0,2,3,2,0];
    this.canvasCtx.drawImage(ODR.spriteGUI, 0, 96, 105, 54,
      Math.round(ODR.amandarine.minX + 20),
      Math.round(ODR.amandarine.minY + yMap[( this.timer>>>7 )%5 ] - 50 ), 105, 54 );
  }

  forwardGreeting( deltaTime ){

    this.drawTutorial();

    // Only intro if notifier is free.
    if( this.notifier.timer <= 0){
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

        this.notifier.notify( text, dur );
        this.introScriptTimer = wait;
      }
    }

    if( !this.__reloadIntroMusic ){
      this.__reloadIntroMusic = true;
      Sound.inst.loadMusic('offline-intro-music', ODR.config.PLAY_MUSIC );
    }
  }

}
