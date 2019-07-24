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

class ConsoleButton {
  constructor( id, x, y, w, h ){
    this.id = id;
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
    this.sprite = new Image();
    this.sprite.src = 'assets/console/'+id+'.png';

    this.pressure = 0;
    this.dir = -1;
    this.frame = -1;

    this.canvas = ODR.shadowRoot.getElementById(id);
    this.canvas.width = w;
    this.canvas.height = h;
    //this.canvasCtx = this.canvas.getContext('2d',{alpha:false});
    this.canvasCtx = this.canvas.getContext('2d');

    if( N7e.isMobile ){
      this.canvas.addEventListener(OnDaRun.events.TOUCHSTART, this);
      this.canvas.addEventListener(OnDaRun.events.TOUCHEND, this);
    }
    /*
    this.canvas.addEventListener(OnDaRun.events.TOUCHCANCEL, this);
    this.canvas.addEventListener(OnDaRun.events.TOUCHMOVE, this);
    */
    this.canvas.addEventListener(OnDaRun.events.MOUSEDOWN, this);
    this.canvas.addEventListener(OnDaRun.events.MOUSEUP, this);
    this.canvas.addEventListener(OnDaRun.events.MOUSEOUT, this);

  }

  forward( deltaTime ) {
    if (this.frame == -1) {
      this.canvas.style.visibility = 'visible';
    }

    this.timer += deltaTime;

//    if( this.dir ){
      this.pressure += deltaTime * this.dir;
      if (this.pressure < 0) {
        this.pressure = 0;
//        this.dir = 0;
      } else if (this.pressure > 100) {
        this.pressure = 100
//       this.dir = 0;
      }
//    }

    let frame = Math.round( this.pressure /25 );
    if (frame != this.frame) {
      this.frame = frame;
      this.canvasCtx.drawImage( this.sprite,
        this.frame * this.w, 0, this.w, this.h,
        0, 0, this.w, this.h);
    }
  }

  draw() {
    console.trace();
  }

  handleEvent( e ){
    e.preventDefault();

    switch( e.type ){
      case OnDaRun.events.KEYDOWN:
      // Filter repeating button and also prevent them from default.

        if( e.repeat ){
          break;
        }

      case OnDaRun.events.MOUSEDOWN:
      case OnDaRun.events.TOUCHSTART: {
        if( this.dir != 1 ){
          this.timer = 0;
          this.dir = 1;
          this.handlePressed( e );
        }
        //this.pressure = 1;
      } break;
      /*
      case OnDaRun.events.TOUCHCANCEL:
      break;
      case OnDaRun.events.TOUCHMOVE:
      break;
      */
      case OnDaRun.events.KEYUP:
      case OnDaRun.events.TOUCHEND:
      case OnDaRun.events.MOUSEOUT:
      case OnDaRun.events.MOUSEUP:{
        if( this.dir != -1 ){
          this.timer = 0;
          this.dir = -1;
          this.handleReleased( e );
        }
      } break;
      default:
        console.log('event', this,e);
    }

  }

  handlePressed( e ){
    let consoleEvent = new CustomEvent( OnDaRun.events.CONSOLEDOWN, {
      bubbles: true,
      composed: true,
      detail: {
        time: ODR.time,
        consoleButton: this,
      },
    });
    this.canvas.dispatchEvent( consoleEvent );
  }

  handleReleased( e ){
    let consoleEvent = new CustomEvent( OnDaRun.events.CONSOLEUP, {
      bubbles: true,
      composed: true,
      detail: {
        time: ODR.time,
        consoleButton: this,
        timeOut: false,
      },
    });
    this.canvas.dispatchEvent( consoleEvent );
  }

}

export class ConsoleLeftButton extends ConsoleButton {
  constructor( x, y, w, h ){ super('console-left', x, y, w, h );}
}

export class ConsoleRightButton extends ConsoleButton {
  constructor( x, y, w, h ){ super('console-right', x, y, w, h );}
}

class ConsoleSystemButton extends ConsoleButton {
  constructor( id, x, y, w, h ){
    super( id, x, y, w, h );
    this.pressedTimeOutDuration = 1500;
    this.pressedTimeOut = 0;
  }

  handlePressed( e ){
    if( this.pressedTimeOut ){
      console.log('Reenter?');
      return;
    }

    this.pressedTimeOut = setTimeout(() => {

      let consoleEvent = new CustomEvent( OnDaRun.events.CONSOLEUP, {
        bubbles: true,
        composed: true,
        detail: {
          time: ODR.time,
          consoleButton: this,
          timeOut: true,
        },
      });
      this.canvas.dispatchEvent( consoleEvent );

      this.pressedTimeOut = 0;

    }, this.pressedTimeOutDuration );

    super.handlePressed( e );
  }

  handleReleased( e ){
    if( this.pressedTimeOut ){
      clearTimeout( this.pressedTimeOut );
      this.pressedTimeOut = 0;
      super.handleReleased( e );
    }
    //Discard the event if pressedTimeOut is 0.
  }
}

export class ConsoleAButton extends ConsoleSystemButton {
  constructor( x, y, w, h ){ super('console-a', x, y, w, h );}
}

export class ConsoleBButton extends ConsoleSystemButton {
  constructor(x, y, w, h) { super('console-b', x, y, w, h); }
}

export class ConsoleCButton extends ConsoleSystemButton {
  constructor(x, y, w, h) { super('console-c', x, y, w, h); }
}

export class ConsoleDButton extends ConsoleSystemButton {
  constructor( x, y, w, h ){ super('console-d', x, y, w, h );}
}

export class ConsoleResetButton extends ConsoleButton {
  constructor(x, y, w, h) { super('console-reset', x, y, w, h); }
}

export class ConsoleN7EButton extends ConsoleButton {
  constructor(x, y, w, h) { super('console-n7e', x, y, w, h); }
}
