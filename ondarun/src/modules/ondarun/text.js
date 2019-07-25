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

import { OnDaRun } from '../../ondarun.js';

export class Text {
  constructor( maxLength = Text.defaultMaxLength, softLength = Text.defaultSoftLength ){
    this.maxLength = maxLength;
    this.softLength = Math.min( maxLength, softLength );
    this.lineLengths = [];
  }

  // Handy for wrapping anytihng into an object type.
  // If do not want the template to substitute the string, convert it to object first.
  // eg. Text.$`template will subtitutes ${'natA'} with the code and uses ${Text._('natA')} as is.`
  static _( string ){
    return {
      toString: () => string.toString(),
    }
  }

  static $( strings, ...keys ){
    let callbacks = [];
    let index = 0;
    let string = "";
    let ref = keys[ 0 ];

    if( typeof ref === 'object'
        && ref !== null
        && strings[0].length === 0
        && !strings[0].toString ){
      index++;
      callbacks = ref.callbacks || callbacks;
      ref.callbacks = callbacks;
      string = ref.string || string;
      ref.string = string;
      this.softLength = ref.softLength || this.softLength;
      this.maxLength = ref.maxLength || this.maxLength;
    }

    while( index < strings.length ){
      string+= strings[ index ];
      let key = keys.shift();
      if( key ){
        let ch = Text.subMap.get( key );
        if( ch ){
          string+= String.fromCodePoint( ch );
        } else if( typeof key === 'function'){
          string+= String.fromCodePoint( 0xe000 );
          callbacks.push( key );
        } else {
          // if not want the string to be substituted as a symbol,
          // use anythingButString.toString() to specify the value.
          string+= key;
        }
      }
      index++;
    }

    return string;
  }

  setString( str, callbacks, maxLength, softLength ){
    return this.typeset( str, callbacks, maxLength, softLength  );
  }

  set( strings, ...keys ){
    let callbacks = [];
    let index = 0;
    let string = "";
    let ref = keys[ 0 ];

    if( typeof ref === 'object'
        && ref !== null
        && strings[0].length === 0
        && !strings[0].toString ){
      index++;
      callbacks = ref.callbacks || callbacks;
      ref.callbacks = callbacks;
      string = ref.string || string;
      ref.string = string;
      this.softLength = ref.softLength || this.softLength;
      this.maxLength = ref.maxLength || this.maxLength;
      // Never test this part.
    }

    while( index < strings.length ){
      string+= strings[ index ];
      let key = keys.shift();
      if( key ){
        let ch = Text.subMap.get( key );
        if( ch ){
          string+= String.fromCodePoint( ch );
        } else if( typeof key === 'function'){
          string+= String.fromCodePoint( 0xe000 );
          callbacks.push( key );
        } else {
          // if not want the string to be substituted as a symbol,
          // use anythingButString.toString() to specify the value.
          string+= key;
        }
      }
      index++;
    }

    return this.typeset( string, callbacks );
  }

  get numberOfLines(){
    return this.lineLengths.length;
  }

  typeset( string, callbacks, maxLength = this.maxLength, softLength = this.softLength ){
    softLength = Math.min( maxLength, softLength );
    this.glyphs = [];
    this.lineLengths = [];
    string = string || "";

    let lineNo = 0;

    let parts = string.split('\n');
    parts.forEach(( part, index ) => {
      let cur = 0;
      let breaker = false;

      if( part ) part.split(' ').forEach( word => {
        let wordCodes = [...word].map( w => w.codePointAt( 0 ));
        let wl = wordCodes.length;
        if( cur != 0 && cur + wl > maxLength ){
          this.lineLengths[ lineNo ] = this.glyphs.length;
          lineNo++;
          cur = 0;
          breaker = false;
        }

        if( wl ){

          //Fill leading spaces
          //this.glyphs.push(...Array( space ).fill( 0 ));
          //Fill converted glyphs from word
          if( breaker ){
            this.glyphs.push(0);
            cur++;
          }

          for( let i = 0, code; code = wordCodes[ i ]; i++ ){
            if( code == 0xe000 ){
              let ref = ( callbacks || []).shift();
              this.glyphs.push( ref || Text.glyphDrawerPlacebo );
            } else {
              this.glyphs.push( Text.glyphMap.get( code ));
            }
          }
          cur+= wl;

          if( cur > softLength ){
            cur = maxLength
          }
          breaker = true;
        } else {
          if( breaker ){
            this.glyphs.push(0);
            cur++;
          }
          //this.glyphs.push(0);
          breaker = true;
        }

      });

      this.lineLengths[ lineNo ] = this.glyphs.length;
      lineNo++;
    });

    return this;
  }


 /**
  * Text
  * Map for substitute symbol codes.
  * Better replace this with template string.
  * `something ${natB}`
  */
  static generateSymbolMap(){

    // #substitutions
    this.glyphMap = new Map([
       // this will be the special glyph that can invoke a callback
       // during the rendering time, default will be printing #
      [ 0xe000, 0 ],
      [ 0xe001, 630 ],
      [ 0xe002, 770 ],
      [ 0xe003, 812 ],
      [ 0xe004, 826 ],
      [ 0xe00a, 882 ],
      [ 0xe00b, 896 ],
      [ 0xe00c, 938 ],
      [ 0xe010, 868 ],
      [ 0xe014, 966 ],
      [ 0xe016, 994 ],
      [ 0xe017, 1008 ],
      [ 0xe018, 1022 ],
      [ 0xe019, 1036 ],
      [ 0xe020, 1050 ],
    ]);

    // Alphanumerics
    [[ 154, 97, 122 ], [ 154, 65, 90 ], [ 14, 48, 57 ]].forEach(([ a, b, c ]) => {
      for( let code = b; code <= c; code++ ){
        this.glyphMap.set( code, a + ( code - b ) * 14 );
      }
    });

    // Unicode Symbols
    [['.', 518 ],
     ['?', 532 ],
     ['!', 546 ],
     ['/', 574 ],
     ['-', 588 ],
     ['_', 0 ],
     [' ', 0 ],
     ['♬', 602 ],
     ['*', 616 ],
     ['"', 672 ],
     ["'", 686 ],
     ["", 700 ],
     [',', 714 ],
     [';', 728 ],
     [':', 742 ],
     ['#', 784 ],
     ['+', 840 ],
     ['🍊', 854 ],
     ['(', 910 ],
     ['[', 910 ],
     [')', 924 ],
     [']', 924 ],
     ['%', 952 ]].forEach(([c, glyph]) => this.glyphMap.set( c.codePointAt(0), glyph ));

    let code = ( str ) => str[0].codePointAt( 0 );
    this.subMap = new Map([
      [ 'natA', 0xe001 ],
      [ 'natB', 0xe002 ],
      [ 'slide', 0xe003 ],
      [ 'jump', 0xe004 ],
      [ 'google', 0xe00a ],
      [ 'facebook', 0xe00b ],
      [ 'twitter', 0xe00c ],
      [ 'trophy', 0xe010 ],
      [ 'bell', 0xe014 ],
      [ 'gameA', 0xe016 ],
      [ 'gameB', 0xe017 ],
      [ 'gameS', 0xe018 ],
      [ 'gameR', 0xe019 ],
      [ 'speed', 0xe020 ],
      [ 'note', code`♬`],
      [ 'tangerine', code`🍊` ],
      [ 'a', code`α` ],
      [ 'right', code`▷` ],
      [ 'left', code`◁` ],
      [ 'redcross', code`✚` ],
      [ 'true', code`✓` ],
      [ 'false', code`✗` ],
      [ 'heart', code`❤`],
      [ 'sun', code`☼`],
      [ 'football', code`⚽`],
      [ 'noentry', code`⛔`],
      [ 'cake', code`🍰`],
    ]);

    this.c = new Proxy( this, {
      get: ( obj, prop ) => {
        return String.fromCodePoint( this.subMap.get( prop )) || '';
      },
    });

    this.glyphMap.set( this.subMap.get('note'), 602 );
    this.glyphMap.set( this.subMap.get('a'), 560 );
    this.glyphMap.set( this.subMap.get('left'), 658 );
    this.glyphMap.set( this.subMap.get('right'), 644 );
    this.glyphMap.set( this.subMap.get('true'), 1064 );
    this.glyphMap.set( this.subMap.get('false'), 1078 );
    this.glyphMap.set( this.subMap.get('redcross'), 798 );
    this.glyphMap.set( this.subMap.get('heart'), 1092 );
    this.glyphMap.set( this.subMap.get('cake'), 1106 );
    this.glyphMap.set( this.subMap.get('sun'), 700 );
    this.glyphMap.set( this.subMap.get('football'), 756 );
    this.glyphMap.set( this.subMap.get('noentry'), 980 );

  }

  draw( canvasCtx, offsetX, offsetY, alignment = -1, charW = 14, lineH = 20, image = ODR.spriteGUI ){
    let callbackIndex = 0;
    for( let line = 0, y = offsetY; line < this.lineLengths.length; line++, y+=lineH ){
      if( y < -lineH || y > OnDaRun.DefaultHeight ) continue;

      let nextLineIndex = this.lineLengths[ line ];
      let glyphIndex = this.lineLengths[ line - 1 ] || 0;
      let x = offsetX;
      if( alignment == 1 ){
          x = offsetX- ( nextLineIndex - glyphIndex )*charW;
      } else if( alignment == 0 ){
          x = offsetX- ( nextLineIndex - glyphIndex )*charW/2;
      }

      while( glyphIndex < nextLineIndex ){
        if( canvasCtx){
          let g = this.glyphs[ glyphIndex ];
          if( g ){ // Don't draw a space.
            if( typeof g === 'function'){
              g( ~~x, ~~y, this, canvasCtx, glyphIndex, callbackIndex );
              callbackIndex++;
            } else {
              canvasCtx.drawImage( image,
                g, 0, 14, 16,
                ~~x, ~~y, 14, 16 );
              }
          }
        }

        x+= charW;
        glyphIndex++;
      }
    }
  }

  drawString( messageStr, canvasCtx, offsetX, offsetY, alignment, glyphW, glyphH, image, maxLength) {
    this.setString( messageStr, maxLength );
    this.draw( canvasCtx, offsetX, offsetY, alignment,glyphW, glyphH, image );
  }

  static glyphDrawerPlacebo( x, y, text, ctx, gidx, cidx ){
  }
}
Text.defaultMaxLength = 500;
Text.defaultSoftLength = Text.defaultMaxLength;
Text.generateSymbolMap();
