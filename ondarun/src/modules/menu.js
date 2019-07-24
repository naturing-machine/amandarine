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

import { Text } from '../modules/text.js';
import { Sound } from '../modules/sound.js';

import { Panel } from './panel.js';
import { Tangerine } from './entity.js';

var FPS = N7e.FPS;

export class Menu extends Panel {
  constructor( canvas, model, associatedButton, previousPanel, muted = false ){
    super( canvas, previousPanel, associatedButton );
    this.model = model;
    this.currentCursor = this.model.currentIndex = this.model.currentIndex  || 0;
    this.xOffset = 0;
    this.yOffset = 0;
    this.bottomText = new Text().set`press both ${'slide'}+${'jump'} to select`;
    this.text = new Text();
    this.scoreText = new Text();
    this.timer = 0;
    this.muted = muted;
    this.menuTextList = [];

    // For button scrolling.
    this.offset = 0;
  }

  handleEvent( e ){
    // Only handle known event types, default to passing the event back to the parent.
    if( !super.handleEvent( e )){
      return false;
    }

    let button = e.detail.consoleButton;

    if( this.__waitBothReleased ){
      if( this.dualReleased ){
        this.__waitBothReleased = false;
        this.enterCurrentModelEntry();
      }
      return true;
    }
    if( this.dualPressed ){
      this.__waitBothReleased = true;
      return true;
    }

    switch( e.type ){
      case OnDaRun.events.CONSOLEDOWN: {
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
            this.offset--;
          } break;
          case ODR.consoleButtons.CONSOLE_RIGHT:{
            this.offset++;
          } break;
        }

        if( this.offset ){

          if( !this.muted )
            Sound.inst.effects.SOUND_BLIP.play( ODR.config.SOUND_SYSTEM_VOLUME/10 );

          let newIdx = this.model.currentIndex + this.offset;
          let length = this.model.entries.length;

          this.model.currentIndex = newIdx - length * Math.floor( newIdx / length );
          this.offset = 0;
        }

      } break;
    }

    return true;
  }

  repaint( deltaTime ){
    this.canvasCtx.drawImage( ...ODR.consoleImageArguments );

    /*
    this.canvasCtx.fillStyle = "#000d";
    this.canvasCtx.fillRect(0,0,this.canvas.width,this.canvas.height);
    */

    // Dislay XUser Profile on the right side of the menu.
    // FIXME subclass this
    let model = this.model;
    let user = model.user;
    if( user ){
      if( !model.profileImage && !model.__loadingProfileImage ){
        model.__loadingProfileImage = true;
        user.getProfilePhoto().then( image => {
          if( image ){
            model.profileImage = image;
            model.__loadingProfileImage = false;
          }
        });
      } else if( model.profileImage ){
        this.canvasCtx.drawImage( model.profileImage,
          0, 0, model.profileImage.width, model.profileImage.height,
          510, 10,  80, 80 );
      } else if( model.__loadingProfileImage ){
        this.canvasCtx.drawImage( ODR.spriteGUI,
          38+ ~~(this.timer/100)%4 * 22, 73, 22, 22,
          510+ 40- 11, 10+ 40- 11, 22, 22 );
          this.ticker+= 200;
      }

      let scoreString = "";

      let tt = ODR.gameModeTotalScore;
      if( tt ){
        scoreString+= Text.$`${'gameA'}+${'gameB'}+${'gameS'} ${tt.toString()} ${'trophy'}\n`;
      }

      if( user.maxSpeed ){
        scoreString+= `${(40*user.maxSpeed.value/ODR.config.MAX_SPEED).toFixed(2)} mi/h ${Text.c.speed}\n`;
      }

      if( user.totalTangerines ){
        scoreString += `${Tangerine.allDayMax}:${user.dailyTangerines}+${user.totalTangerines- user.dailyTangerines} ${Text.c.tangerine}\n`;
      }

      this.scoreText.setString( scoreString ).draw( this.canvasCtx, 590, 100, 1 );

    }

    if( this.currentCursor != model.currentIndex ){
      this.currentCursor+= ( model.currentIndex- this.currentCursor )*( FPS/7000 ) *deltaTime;
      if( Math.abs( this.currentCursor- model.currentIndex ) < 0.05 ){
        this.currentCursor = model.currentIndex;
      }
    }

    function drawSpringDots( x, y, text, canvasCtx ) {
      let data = text.callbackData;
      let dotNo = (32- data.titleLen - data.valueLen)*1.5;
      let dist = ( x - data.titleMaxX )/dotNo;
      for( let di = 0; di < dotNo; di++ ){
        canvasCtx.drawImage( ODR.spriteGUI,
          518, 0, 14, 16, //Text.glyphMap.get('.'.charCodeAt(0)) == 518
          ~~(data.titleMaxX + di*dist + 10), ~~y, 14, 16 );
      }
    }


    let alphaRestore = this.canvasCtx.globalAlpha;
    for( let i = 0; i < model.entries.length; i++ ){
      let entry = model.entries[ i ];
      let title = entry.title ? entry.title : entry;

      let xxx = Math.abs( this.currentCursor - i );
      this.canvasCtx.globalAlpha = (entry.disabled ? 0.5 : 1)*Math.max(0.1,(4 - xxx)/4);

      this.menuTextList[i] = this.menuTextList[i] || { text: new Text(), valueText: entry.hasOwnProperty('value') ? new Text() : null };

      let newEntryString = '  '+ title+( entry.disabled ? ' '+ Text.c.noentry : '');
      if( newEntryString != this.menuTextList[i].string ){
        this.menuTextList[i].string = newEntryString;
        this.menuTextList[i].text.setString( newEntryString );
      }

      let x = this.xOffset + 20 + 2 * 3 * Math.round( Math.sqrt( 100*xxx )/3 );
      let y = this.yOffset + 90 + 5 * Math.round( 4 * ( i - this.currentCursor ));

      this.menuTextList[ i ].text.draw( this.canvasCtx, x, y );

      if( entry.hasOwnProperty('value')){

        newEntryString = '[ '+ entry.value+ ' ]';
        if( newEntryString != this.menuTextList[i].valueString ){
          this.menuTextList[i].valueString = newEntryString;
          // The function (x,y) below got invoked by the text rendering.
          // set() here anchor it into the glyph stream.
          // The function adds elasticity to the dots (....).
          this.menuTextList[i].valueText.set`${drawSpringDots}${Text._(newEntryString)}`;
        }

        // Set up data needed by the callback.
        this.menuTextList[i].valueText.callbackData = {
          titleMaxX: x+ ( title.length + 2 )*14,
          titleLen: title.length,
          valueLen: entry.value.toString().length + 4,
        };
        this.menuTextList[i].valueText.draw( this.canvasCtx, 590, y, 1 );
      }
      if( i == model.currentIndex ){
        let indicator = entry.exit ? Text.c.left+ ' ' : ' '+ Text.c.right;
        this.text.setString( indicator ).draw( this.canvasCtx, x, y );
      }

    }
    this.canvasCtx.globalAlpha = alphaRestore;

    if( model.title ){
      new Text().setString( model.title ).draw( this.canvasCtx, 300, 10, 0 );
    }

    if( this.bottomText ){
      this.bottomText.draw( this.canvasCtx, 300, 180, 0 );
    }
  }

  enterCurrentModelEntry(){
    let model = this.model;
    let entry = model.entries[ model.currentIndex ];

    if( entry.disabled || ( entry.hasOwnProperty('value') && !entry.options )){
      Sound.inst.effects.SOUND_ERROR.play( ODR.config.SOUND_SYSTEM_VOLUME/10 );
    } else {
      Sound.inst.effects.SOUND_SCORE.play( ODR.config.SOUND_SYSTEM_VOLUME/10 );

      if( entry.exit ){
        this.exit();
      } else if( entry.options ){
        // The choosen entry has "options". Create a submenu.

        // First enter to prepare additional effects.
        // Main callback may detect the third argument
        // to distinguish the call from value setting calls.
        model.enter( model.currentIndex, entry, true );

        let optionMenuEntries;
        if( entry.options.hasOwnProperty('min')){
          optionMenuEntries = [];
          for (let i = entry.options.min; i <= entry.options.max; i+= entry.options.step) {
            optionMenuEntries.push(i);
          }
        } else {
          optionMenuEntries = entry.options.slice();
        }
        let currentIndex;
        for (currentIndex = 0; currentIndex < optionMenuEntries.length; currentIndex++) {
          if (entry.value == optionMenuEntries[currentIndex]) {
            break;
          }
        }
        optionMenuEntries.push({ title:'CANCEL', exit:true });

        let optionMenu = new Menu( this.canvas, {
          name: entry.name,
          title: `${model.title}\n${entry.title}`,
          _currentIndex: currentIndex,
          select: model.select,
          get currentIndex() {
            return this._currentIndex;
          },
          set currentIndex( newIndex ) {
            if( this.select ) {
              this.select( entry, newIndex, this );
            }
            this._currentIndex = newIndex;
          },
          entries: optionMenuEntries,
          enter: ( select, selectedItem ) => {
            if( !selectedItem.exit ){
              entry.value = selectedItem;

              //Submenu set the selected value with parent's model.
              model.enter( select, entry );

            }
            // FIXME hackish, to turn sample music off on leaving the optionMenu.
            if( this.associatedButton == ODR.consoleButtons.CONSOLE_A ){
              Sound.inst.currentSong = null;
            }

            optionMenu.exit();
          },
        }, this.associatedButton, this, entry.muted  );

        // Exit to the created option optionMenu.
        this.exit( optionMenu );

      } else {
        model.enter( model.currentIndex, entry );
      }
    }

  }


}
