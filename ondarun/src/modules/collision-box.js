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

export class CollisionBox {
  constructor( x = 0, y = 0, w = 0, h = 0 ){
    this.minX = x;
    this.minY = y;
    this.width = w;
    this.height = h;
  }

  get copy() {
    return new CollisionBox( this.minX, this.minY, this.width, this.height );
  }

  set copy( copyMe ) {
    this.minX = copyMe.minX;
    this.minY = copyMe.minY;
    this.width = copyMe.width;
    this.height = copyMe.height;
  }

  translate( x, y ){
    this.minX += x;
    this.minY += y;
  }

  grow( width, height ) {
    height = height === undefined ? width : height;
    this.minX -= width;
    this.width += width * 2;
    this.minY -= height;
    this.height += height * 2;
    return this;
  }

  flop( width ) {
    this.minX = width - this.minX - this.width;
    return this;
  }

  flip( height ) {
    this.minY = height - this.minY - this.height;
    return this;
  }

  maxX() {
    return this.minX + this.width;
  }

  maxY() {
    return this.minY + this.height;
  }

  center() {
    return new CollisionBox(
      this.minX + this.width/2,
      this.minY + this.height/2,
      0,0 );
  }

  intersects( aBox ){
    return ( this.maxX() <= aBox.minX
      || aBox.maxX() <= this.minX
      || this.maxY() <= aBox.minY
      || aBox.maxY() <= this.minY
      || this.void
      || aBox.void )
      ? false
      : true;
  }

  intersection( aBox ){
    let ret = new CollisionBox(0, 0, 0, 0);

    ret.minX = aBox.minX <= this.minX
      ? this.minX
      : aBox.minX;

    ret.minY = aBox.minY <= this.minY
      ? this.minY
      : aBox.minY;

    ret.width = aBox.minX + aBox.width >= this.minX + this.width
      ? this.minX + this.width - ret.minX
      : aBox.minX + aBox.width - ret.minX;

    ret.height = aBox.minY + aBox.height >= this.minY + this.height
      ? this.minY + this.height - ret.minY
      : aBox.minY + aBox.height - ret.minY;

    return ret;
  }

  get void(){
    return this.width > 0 && this.height > 0 ? false : true;
  }

  union( aBox ){
    if( this.void ){
      if( aBox.void ) return new CollisionBox(0,0,0,0);
      return aBox;
    }
    if( aBox.void ) return this;

    let xx = Math.min( this.minX, aBox.minX );
    let yy = Math.min( this.minY, aBox.minY );

    return new CollisionBox( xx, yy,
      Math.max( this.maxX(), aBox.maxX() ) - xx,
      Math.max( this.maxY(), aBox.maxY() ) - yy
    );
  }
}
