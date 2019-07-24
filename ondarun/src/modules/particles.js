/*+;+;+;+;+;+;+;+;+;+;+;+;+;+;+;+;+;+;+;+;+;+;+;+;+;+;+;+;'''+,
:+:+:+:+:NATH|\+:NATH\:+:EN|\NATHERINE|\NATHERINE|\+:+:+: O G :
;.;.;';'NA/HE| |;AT|ER\';NA| AT|  _NE/  AT| _______|;.;'   R   '
 . . . NA/ ER| | TH| IN\ AT| \___|NE/  /THERINE|\. . .    O A
. . . NATHERINE|\HE| |EN\TH| |. .NE/  / HE| _____|. . .  O   N
;';';'\____IN|  _ER| |;ATHE| |;'NE/  /;'EHERINENA|\';';.  V G  .
:+:+:+:+:+:\___|:\___|:\_____|:+\___/+:+\__________|:+:+:  E  +
':+;+;+;+;+;+;+;+;+;+;+;+;+;+;+;+;+;+;+;+;+;+;+;+;+;+;+;+;,,,*/

// Copyright (c) 2019 ORANGE GROOVE Sororité. All rights reserved.
// Use of this source code is governed by a BSD-style license that can
// be found in the LICENSE file AND if possible, in the Public Domain.

import { N7e } from '../n7e.js';
import { OnDaRun } from '../ondarun.js';

export class Particles {
  constructor(canvas, x, y, life) {
    this.life = life; // Used for calculating sprite offset.
    this.canvas = canvas;
    this.canvasCtx = this.canvas.getContext('2d');
    this.minX = x;
    this.minY = y;
    this.points = [];
    //this.init();
    this.tag = 0;
  }

  draw() {
  }

  forward(aging) {
    this.points = this.points.filter( point => {
      point.life -= aging;
      return point.life > 0;
    });

    for(let i = 0, point; point = this.points[i]; i++) {
      let ratio = (this.life - point.life) / this.life;
      let x = this.minX + point.minX + 40 + point.width * ratio;
      let y = this.minY + point.minY + OnDaRun.DefaultHeight-25 + point.height * ratio;
      this.canvasCtx.drawImage(ODR.spriteScene,
        0 + 22 * ~~(8 * ratio), 0,
        22, 22,
        Math.ceil(x), Math.ceil(y),
        22, 22);
    }
  }

  addPoint(x, y, w, h) {
    this.points.push({tag:this.tag++, minX:x, minY:y, width:w, height:h, life:this.life});
  }

  reset() {
    this.points = [];
  }
}
