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

export class NoPanel {
  constructor(){ this.passthrough = true; }
  forward(){ return this; }
  exit(){}
  handleEvent( e ){ return false; }
}

export class Panel {
  constructor( canvas, previousPanel = null, associatedButton = null ) {
    this.canvas = canvas;
    this.canvasCtx  = canvas.getContext('2d');
    this.passthrough = false;
    this.associatedButton = associatedButton;

    this.resetTimer();

    this.previousPanel = previousPanel;
    this.nextPanel = undefined;
  }

  resetTimer(){
    this.timer = 0;
    this.buttonDownTime = { l: -2, r : -4 }; // Make them not intersecting or
    this.buttonUpTime = { l: -1, r : -3 };   // that will mark dualReleased flag.
  }


  forward( deltaTime ){
    if( undefined !== this.nextPanel ){
      let nextPanel = this.nextPanel;
      this.nextPanel = undefined;
      return nextPanel;
    }

    this.repaint( deltaTime );
    this.timer += deltaTime;

    return this;
  }

  repaint( deltaTime ){
  }

  exit( panel = this.previousPanel ){
    return this.nextPanel = panel;
  }

/**
 * Panel event handler.
 * Manage Left & Right console buttons.
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
            this.buttonDownTime.l = Math.max( this.timer, this.buttonUpTime.l+ 1 );
            //this.buttonUpTime.l = 0;
          } break;

          case ODR.consoleButtons.CONSOLE_RIGHT:{
            this.buttonDownTime.r = Math.max( this.timer, this.buttonUpTime.r+ 1 );
            //this.buttonUpTime.r = 0;
          } break;

          default:
            return false;
        }
      }
      break;

      case OnDaRun.events.CONSOLEUP: {
        let button = e.detail.consoleButton;
        switch( button ){
          case ODR.consoleButtons.CONSOLE_LEFT:{
            this.buttonUpTime.l = Math.max( this.timer, this.buttonDownTime.l+ 1 );
          } break;

          case ODR.consoleButtons.CONSOLE_RIGHT:{
            this.buttonUpTime.r = Math.max( this.timer, this.buttonDownTime.r+ 1 );
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

  get leftPressed(){
    return this.buttonDownTime.l > this.buttonUpTime.l;
  }

  get rightPressed(){
    return this.buttonDownTime.r > this.buttonUpTime.r;
  }
  
  get noPressed(){
    return !this.leftPressed && !this.rightPressed;
  }

  get singlePressed(){
    return this.leftPressed ^ this.rightPressed;
  }

  get dualPressed(){
    return this.leftPressed && this.rightPressed;
  }

  /*
  L  d---d===u
  R    d========>
  */
  get leftDualReleased(){
    return !( this.leftPressed || !this.rightPressed
      || this.buttonUpTime.l < this.buttonDownTime.r );
  }

  /*
  L    d========>
  R  d---d===u
  */
  get rightDualReleased(){
    return !( !this.leftPressed || this.rightPressed
      || this.buttonUpTime.r < this.buttonDownTime.l );
  }

  get halfDualReleased(){
    return ( this.leftDualReleased ^ this.rightDualReleased )? true : false;
  }

  /*
  L    d===========>
  R  d---d===u  d==>
  */
  get rightDualPressed(){
    return !( !this.leftPressed || !this.rightPressed
      || this.buttonUpTime.r < this.buttonDownTime.l );
  }

  /*
  L  d---d===u  d==>
  R    d===========>
  */
  get leftDualPressed(){
    return !( !this.leftPressed || !this.rightPressed
      || this.buttonUpTime.l < this.buttonDownTime.r );
  }

  get halfDualPressed(){
    return (this.leftDualPressed ^ this.rightDualPressed) ? true : false;
  }

  /*
  L/R ============o
  R/L =======o
  */
  get dualReleased(){
    return !( this.leftPressed || this.rightPressed
      || this.buttonUpTime.l < this.buttonDownTime.r
      || this.buttonDownTime.l > this.buttonUpTime.r );
  }
}
