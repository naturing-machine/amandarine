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

var VERSION = "1.19"
var DEFAULT_WIDTH = 600;
var DEFAULT_HEIGHT = 200;
var FPS = 60;
var IS_IOS = /iPad|iPhone|iPod/.test(window.navigator.platform);
var IS_MOBILE = /Android/.test(window.navigator.userAgent) || IS_IOS;
var IS_TOUCH_ENABLED = 'ontouchstart' in window;
var IS_SOUND_DISABLED = false;

export class N7e {

  static mod( n, m ){
    return ((n % m) + m) % m;
  }

  static clamp( x, lower, upper ){
    return x > upper ? upper : x < lower ? lower : x;
  }

  static randomInt( min, max ){
    return min+ (Math.random()*( max- min+ 1 ))|0;
  }

  static getTimeStamp() {
    return IS_IOS ? new Date().getTime() : performance.now();
  }

  static vibrate(duration) {
    if( IS_MOBILE && window.navigator.vibrate ){
      window.navigator.vibrate(duration);
    }
  }

};

N7e.version = VERSION;
N7e.isIOS = IS_IOS = /iPad|iPhone|iPod/.test(window.navigator.platform);
N7e.isMobile = IS_MOBILE = /Android/.test(window.navigator.userAgent) || IS_IOS;
N7e.isTouchEnabled = IS_TOUCH_ENABLED = 'ontouchstart' in window;
N7e.isSoundDisabled = IS_SOUND_DISABLED = false;
N7e.FPS = FPS;
