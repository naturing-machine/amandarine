/*+;+;+;+;+;+;+;+;+;+;+;+;+;+;+;+;+ki+;+;+;+;+;+;+;+;+;+;+;'''+,
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

/*
  N7e : global application service
  OnDaRun : the class of the runner game
  ODR : application instance of OnDaRun
*/

import { LitElement, html, css } from 'lit-element';

import { N7e } from '../n7e.js';
import { OnDaRun } from '../ondarun.js';
import { User } from '../modules/user.js';
import { Sound, Audio } from '../modules/sound.js';
import { ConsoleLeftButton, ConsoleRightButton, ConsoleAButton, ConsoleBButton, ConsoleCButton, ConsoleDButton, ConsoleN7EButton, ConsoleResetButton } from '../modules/ondarun/console-buttons.js';
import { Text } from '../modules/ondarun/text.js';
import { CollisionBox } from '../modules/collision-box.js';

import { Panel, NoPanel } from '../modules/ondarun/panels/panel.js';
import { TitlePanel } from '../modules/ondarun/panels/title-panel.js';
import { Menu } from '../modules/ondarun/panels/menu.js';
import { TextEditor } from '../modules/ondarun/panels/text-editor.js';
import { Greeter } from '../modules/ondarun/panels/greeter.js';
import { GameOver } from '../modules/ondarun/panels/game-over.js';
import { Wait } from '../modules/ondarun/panels/wait.js';
import { Pause } from '../modules/ondarun/panels/pause.js';

import { WormGame } from '../modules/ondarun/panels/worm-game.js';

import { Sequencer } from '../modules/ondarun/sequencer.js';
import { Space, Tangerine, SmallCactus, LargeCactus, Velota, Rotata, DuckType, Liver, Rubber } from '../modules/ondarun/entity.js';
import { A8e } from '../modules/ondarun/amandarine.js';
import { Scenery, Sky, Mountain } from '../modules/ondarun/scenery.js';
import { Terminal, Notifier, Scoreboard } from '../modules/ondarun/terminal.js';
import { DefaultAction, SlideAction, JumpAction } from '../modules/ondarun/actions.js';

var FPS = N7e.FPS;
var IS_MOBILE = N7e.isMobile;

class Figure {
  constructor( canvasOrImage, width, height ){

  }

  draw( x, y, frame ){
  }

}

class GameMode {
  constructor( config ){
    this.title = config.title;
    this.icon = config.icon;
    this.acceleration = config.acceleration;
    this.user = User.inst;
  }

  get distance(){
    return this.user.odrLongestDistanceList[ this.key ] || 0;
  }
  set distance( newDistance ){
    this.user.odrRegisterDistance( this.key, newDistance );
  }
}

class OnDaRunElement extends LitElement {
  static get styles() {
    return css`
    :host {
      display: block;
      position: fixed;
      top: 50%;
      left: 50%;
      margin-top: -400px;
      margin-left: -400px;
      width: 800px;
      height: 800px;
      padding: 0;
      opacity: 0;
      background-image: url(assets/console/console.png);
      pointer-events: none;
    }

    canvas {
      position: absolute;
      z-index: 2;
      pointer-events: auto;
      visibility: hidden;
    }

    #console-screen {
      left: 100px;
      top: 237px;
      width: 600px;
      height: 200px;
      border-radius: 4px;
    }

    #console-left {
      left: 104px;
      top: 495px;
      width: 100px;
      height: 100px;
      /*background-image: url(assets/console/console-left.png);*/
    }

    #console-right {
      left: 596px;
      top: 495px;
      width: 100px;
      height: 100px;
      /*background-image: url(assets/console/console-right.png);*/
    }

    #console-a {
      left: 233px;
      top: 495px;
      width: 66px;
      height: 50px;
      /*background-image: url(assets/console/console-a.png);*/
    }

    #console-b {
      left: 233px;
      top: 545px;
      width: 66px;
      height: 50px;
      /*background-image: url(assets/console/console-b.png);*/
    }

    #console-c {
      left: 501px;
      top: 495px;
      width: 66px;
      height: 50px;
      /*background-image: url(assets/console/console-c.png);*/
    }

    #console-d {
      left: 501px;
      top: 545px;
      width: 66px;
      height: 50px;
      /*background-image: url(assets/console/console-d.png);*/
    }

    #console-n7e {
      left: 357px;
      top: 628px;
      width: 18px;
      height: 18px;
      /*background-image: url(assets/console/console-n7e.png);*/
    }

    #console-reset {
      left: 424px;
      top: 628px;
      width: 18px;
      height: 18px;
      /*background-image: url(assets/console/console-reset.png);*/
    }

    `;
  }

  static get properties() {
    return {
      /*
      spriteScene: { type: Object },
      spriteGUI: { type: Object },
      */
    };
  }

  render(){
    return html`
      <canvas id="console-screen"></canvas>
      <canvas id="console-left"></canvas>
      <canvas id="console-right"></canvas>
      <canvas id="console-a"></canvas>
      <canvas id="console-b"></canvas>
      <canvas id="console-c"></canvas>
      <canvas id="console-d"></canvas>
      <canvas id="console-n7e"></canvas>
      <canvas id="console-reset"></canvas>
    `;
  }

  constructor(){
    super();

    //FIXME just replace
    this.config = JSON.parse(JSON.stringify(OnDaRun.Configurations));

    //ODR = this;
    window['ODR'] = this;
    //window['N7e'] = N7e;
    window['D4a'] = Sound.inst;
    //this.scene = null;

    this.canvas = null;
    this.canvasCtx = null;

    this.sky = null;
    this.scenery = null;
    this.sequencer = null;
    this.amandarine = null;

    this.soundEffects = {};

    this.time = 0;
    Tangerine.allDayMax = 0;

    this.gameModeList = {};

    for( const key in OnDaRun.gameModeConfiguration ) {
      let mode = new GameMode( OnDaRun.gameModeConfiguration[ key ]);
      this.gameModeList[ key ] = mode;
      mode.key = key;
      mode.distance = 0;
    }

    this.gameMode = null;

    this.achievements = [];
    this.msPerFrame = 1000/FPS;

    this.images = {};

    this.consoleButtonForKeyboardCodes = {};

    this.gameState = 0;

    this._passthroughPanel = new NoPanel();
  }

  /*
  let a = mode.ACCELERATION * FPS/1000 * 0.5;
  let b = this.config.SPEED * FPS/1000;
  let s = distances[ mode.key ] || 0;
  let t = ( Math.sqrt( b**2 - 4*a*-s )- b )/( 2*a );

  this.maxSpeed = {
    value: Math.min( this.config.MAX_SPEED, this.config.SPEED + t * mode.ACCELERATION ),
    time: 0
  };
  */

  /*
  get dailyTangerines(){
    return this._dailyTangerines;
  }

  set dailyTangerines( newDaily ){
    this._dailyTangerines = newDaily;
    if( this.scoreboard )
      this.scoreboard.minTangerines = newDaily;
  }
  */

  get gameState(){
    return this._gameState;
  }

  set gameState( newState ){

    switch( this._gameState ){
      case undefined:
        if( 0 === newState ){
          this._gameState = 0;
          this.stateResetProperties();
        }
        break;
      case 0: /* IDLE */
        if( 1 === newState ){
          this._gameState = 1;
          this.stateStart();
        } else if( 0 === newState ){
          this.stateResetProperties();
        }
        break;
      case 1: /* RUN */
        if( 2 === newState ){
          this._gameState = 2;
          this.stateCrash();
        } else if( 0 === newState ){
          this._gameState = 0;
          this.stateResetProperties();
        }
        break;
      case 2: /* CRASH */
        if( 0 === newState ){
          this._gameState = 0;
          this.stateResetProperties();
        } else if( 1 === newState ){
          this._gameState = 1;
          if( this.config.GAME_MODE_REPLAY ){
            let sequencer = ODR.sequencer;

            // Existing dejavus means the player restarted after
            // choosing to replay, so replay again.
            if( sequencer.dejavus ){
              let totalRecall = sequencer.totalRecall;
              let dejavus = totalRecall.slice();

              this.stateResetProperties();
              // TODO, passing a flag to prevent resetting sequencer
              this.stateRestart();

              sequencer.totalRecall = totalRecall;
              sequencer.dejavus = dejavus;

              //Just getting rid of the default clearZone
              //although it should be harmless.
              ODR.sequencer.entities = [];
            } else {
              this.stateResetProperties();
              this.stateRestart();
            }
          } else {
            this.stateResetProperties();
            this.stateRestart();
          }
        }
        break;
    }
    //console.log([ "IDLE", "PLAY", "CRASH" ][ this._gameState ]);
  }

  set pause( shouldPause ){
    let pauseTimeout = 300;
    if( shouldPause && !this._pause ){
      setTimeout( this.statePause.bind( this ), pauseTimeout );
      this._pause = true;
    } else if( !shouldPause && this._pause ){
      setTimeout( this.statePause.bind( this ), pauseTimeout );
      // Unpause
      this._pause = false;
      if( !this.raqId ){
        this.scheduleNextRepaint();
      }
    }
  }

  get pause(){
    return this._pause;
  }

  statePause(){
    if( this.pause ){
      if( !this.__gamePausePanel ) {
        this.__gamePausePanel = new Pause ( this.canvas, this.panel );
        if( this.panel && this.panel.constructor.name === "Wait" ){
          this.__gamePausePanel.previousPanel = this.panel.previousPanel;
          this.panel.previousPanel = this.__gamePausePanel;
        } else {
          this.panel = this.__gamePausePanel;
        }
      }
    } else if( this.__gamePausePanel ){
      this.__gamePausePanel.exit();
      this.__gamePausePanel = null;
    }
  }

  stateResetProperties(){
    this.runTime = 0;
    // Setting runTime will auto-set the currentSpeed
    // so a custom speed must be set after runtime.
    this.currentSpeed = 0;
    //this.distance = 0;

    this.inverted = false;
    this.invertTimer = 0;

    this.actions = [];
    this.consoleButtonActionMap = new Map();
    this.activeAction = null;
    this.playLyrics = false;

    this._HACC = 0.5*this.config.ACCELERATION *FPS/1000;
    this._HSPD = this.config.SPEED *FPS/1000;
  }

  statePrestart( musicDelay ){
    this.scoreboard.reset();
    this.scenery.reset();
    Sound.inst.loadSong('MUSIC_GAMEPLAY', this.config.PLAY_MUSIC, musicDelay );
    this.sky.setShade( Sky.config.DAY, 3000 );
    this.showGameModeInfo();
    this.invert( true );

    if( this.user.uidRef ){
      Tangerine.allDayMax = Math.max( 1, ~~( this.gameModeTotalScore/100 ));
      this.scoreboard.maxTangerines = Tangerine.allDayMax;
      Tangerine.increaseTangerine( 0 ).then( dayCount => this.scoreboard.minTangerines = dayCount );
    }

    this.runSession = {
      mode: this.gameMode.key,
      collected: {
        tangerines: 0,
      },
      hiscore: this.gameModeScore,
      allDayMax: Tangerine.allDayMax,
    };
    if( this.config.GAME_MODE_REPLAY && ODR.sequencer.dejavus ){
      this.scoreboard.replay = true;
    }
    this.scoreboard.existence = 1;

    // Rebuild achievement strings on each restart.
    let d0 = Math.round( this.gameMode.distance * this.config.TO_SCORE );
    let skipping;
    let d = d0/5 - d0/5%100;
    let lead = Text.c.natA + ' ';
    this.achievements = [
      Math.max( 200, d ), lead+ this.achievementPhrases[ skipping = N7e.randomInt( 0, 2 )],
      Math.max( 400, 2*d ), lead+ this.achievementPhrases[ skipping += N7e.randomInt( 1, 3 )],
      Math.max( 600, 3*d ), lead+ this.achievementPhrases[ skipping += N7e.randomInt( 1, 3 )],
      Math.max( 800, 4*d ), lead+ this.achievementPhrases[ skipping += N7e.randomInt( 1, 3 ) ],
      Math.max( 1000, d0 ), lead+ `This is a brand new high!!`,
    ];
  }

  stateStart(){
    this.statePrestart( 1 );

    this.scenery.addTREX();

    this.currentSpeed = this.config.SPEED;
    this.activeAction.speed = ODR.config.SPEED;
    this.activeAction.priority = 1;

    this.notifier.notify("go go go!!", 2000 );
    this.soundEffects.SOUND_GOGOGO.play( 0.8 * this.config.SOUND_EFFECTS_VOLUME/10, 0, -0.2);
  }

  stateCrash(){
    if( this.notifier.timer > 200 ) this.notifier.timer = 200;

    this.scoreboard.existence = 0;
    if( !this.sequencer.dejavus )
      this.updateScore();

    this.panel = null;
    N7e.vibrate(200);
    Sound.inst.currentSong = null;
    this.soundEffects.SOUND_OGGG.play( ODR.config.SOUND_EFFECTS_VOLUME/10, 0, -0.2 );
    this.sky.setShade( Sky.config.SUNSET, 3000 );

  }

  stateRestart(){
    this.statePrestart( 0.5 );

    this.sequencer.reset();

    this.soundEffects.SOUND_SCORE.play( ODR.config.SOUND_EFFECTS_VOLUME/10 );

    this.amandarine.reset();

    let startingSlide = new SlideAction( 7.2 );
    startingSlide.forward( -ODR.config.MAX_ACTION_PRESS );
    startingSlide.priority = 1;
    startingSlide.maxPressDuration = 1500;

    this.queueAction( startingSlide );
    let defaultAction = new DefaultAction( this.config.SPEED );
    defaultAction.priority = 1;
    this.queueAction( defaultAction );
  }

/** Class OnDarun
 * lithtml first update.
 * - Prepare the console graphics.
 * - Load image sprites.
 * @param {Map} changedProperties
 */
  firstUpdated( changedProperties ){
//    let natImgUrl = 'https://scontent.fbkk5-4.fna.fbcdn.net/v/t1.0-0/c0.0.200.200a/p200x200/65054160_2418918275098581_5937603192194859008_n.jpg?_nc_cat=103&_nc_oc=AQnvd5AaFFq4TRM-0kj-LiNT0AY1tcoMaGl_hO3DeCsk2GOu70lP3W5ga5MX0YaF-scCBFMouA-CYssu8aw2lwNe&_nc_ht=scontent.fbkk5-4.fna&oh=e9977f6d444f931c04db4aa9b8ee9dd9&oe=5DC119D4';
//    let natImgUrl = 'https://scontent.fbkk5-4.fna.fbcdn.net/v/t1.0-9/65054160_2418918275098581_5937603192194859008_n.jpg?_nc_cat=103&_nc_oc=AQln9fwCciCiy6gosrHzt0kVadWmaEASNIsC0VwgZpJoBHNodpoHqTT7sZTMqsT2ZhlHpMz6RYrjoGttVZTj3syA&_nc_ht=scontent.fbkk5-4.fna&oh=904fd5ba5537447d65106826ee988cd5&oe=5DB738CB';
    console.log(`\nAmandarine Frontier "On Da Run"\nVersion ${N7e.version}
%c
░░░░░░░░░░ Amandarine Frontier
░░░░██░░░░ aims to support The
░░██████░░ Thai Red Cross Society.
░░░░██░░░░ Please make a donation
░░░░░░░░░░ by this link below ✚✚✚✚
https://www.redcross.or.th/donate/`,'color:crimson');

    // Natherine BNK48 Magic!!
    let natImgUrl = 'https://graph.facebook.com/bnk48official.natherine/picture?type=large&width=200&height=200';
    let natImg = new Image();
    natImg.onload = () => {
      console.log("%c█",`border-radius:50%; border:5px solid orange;font-size: 0px; padding: 0px 50px; line-height:100px;background: url(${natImgUrl}); background-size:100px 100px; background-position: center center; color: red;`);
      console.log(`\nBuilt among the asleep newborns in Nagoya 🗾\nFrom the ground up overnight into the moonlit sky for Natherine BNK48 with all of my %c❤❤❤❤`,'color:crimson',"\nhttps://www.facebook.com/bnk48official.natherine/");
    };
    natImg.src = natImgUrl;

    document.querySelector('title').textContent += ` ${N7e.version}`;
    document.getElementById('version-banner').textContent = `Version ${N7e.version}`;
    this.consoleButtons = {
      CONSOLE_LEFT: new ConsoleLeftButton(104, 495, 100, 100),
      CONSOLE_RIGHT: new ConsoleRightButton(596, 495, 100, 100),
      CONSOLE_A: new ConsoleAButton(233, 495, 66, 50),
      CONSOLE_B: new ConsoleBButton(233, 545, 66, 50),
      CONSOLE_C: new ConsoleCButton(501, 495, 66, 50),
      CONSOLE_D: new ConsoleDButton(501, 545, 66, 50),
      CONSOLE_N7E: new ConsoleN7EButton(357, 628, 18, 18),
      CONSOLE_RESET: new ConsoleResetButton(424, 628, 18, 18),
    };

    this.consoleButtonForKeyboardCodes['Space'] = this.consoleButtons.CONSOLE_RIGHT;

    this.consoleButtonForKeyboardCodes['NumpadEnter'] = this.consoleButtons.CONSOLE_RIGHT;
    this.consoleButtonForKeyboardCodes['ArrowRight'] = this.consoleButtons.CONSOLE_RIGHT;
    this.consoleButtonForKeyboardCodes['Backslash'] = this.consoleButtons.CONSOLE_RIGHT;
    this.consoleButtonForKeyboardCodes['Backspace'] = this.consoleButtons.CONSOLE_RIGHT;
    this.consoleButtonForKeyboardCodes['NumpadAdd'] = this.consoleButtons.CONSOLE_RIGHT;
    this.consoleButtonForKeyboardCodes['NumpadSubstract'] = this.consoleButtons.CONSOLE_RIGHT;
    //this.consoleButtonForKeyboardCodes['ShiftRight'] = this.consoleButtons.CONSOLE_RIGHT;

    this.consoleButtonForKeyboardCodes['Numpad0'] = this.consoleButtons.CONSOLE_LEFT;
    this.consoleButtonForKeyboardCodes['ArrowLeft'] = this.consoleButtons.CONSOLE_LEFT;
    this.consoleButtonForKeyboardCodes['Backquote'] = this.consoleButtons.CONSOLE_LEFT;
    this.consoleButtonForKeyboardCodes['Tab'] = this.consoleButtons.CONSOLE_LEFT;
    //this.consoleButtonForKeyboardCodes['ShiftLeft'] = this.consoleButtons.CONSOLE_LEFT;

    this.consoleButtonForKeyboardCodes['KeyM'] = this.consoleButtons.CONSOLE_A;
    this.consoleButtonForKeyboardCodes['Digit5'] = this.consoleButtons.CONSOLE_B;

    /* Load and set console image */
    this.consoleImage = new Image();
    this.consoleImage.src = 'assets/console/console.png';
    this.style.backgroundImage = 'url('+this.consoleImage.src+')';

    let getRest = (...theArgs) => {
      return theArgs;
    };

    this.consoleImageArguments = getRest( this.consoleImage, 100, 237, 600, 200, 0, 0, 600, 200 );

    /* HACK prevent initial transition */
    this.consoleImage.addEventListener('load', (e) => {
      this.style.transition = 'opacity 1s';
      this.style.opacity = 1;
    });

    /* Listing & creating images for sprites */
    let loadingList = [];

    let addSprite = ( path ) => {
      let sprite = new Image();
      sprite.src = 'assets/'+path+'.png';
      loadingList.push(sprite);
      return sprite;
    };

    this.spriteGUI = addSprite('userinterface');
    this.spriteDef = OnDaRun.spriteDefinition;

    this.spriteScene = addSprite('scene');

    A8e.animFrames.WALKING.sprite = addSprite('nat/walking');
    A8e.animFrames.RUNNING.sprite = addSprite('nat/running');
    A8e.animFrames.SLIDING.sprite = addSprite('nat/sliding');
    A8e.animFrames.JUMPING.sprite = addSprite('nat/jumping');
    A8e.animFrames.WAITING.sprite = addSprite('nat/idle');
    A8e.animFrames.CEASING.sprite = addSprite('nat/crash');

    let bicyclesSprite = addSprite('biking');
    let ducksSprite = addSprite('ducks');

    SmallCactus.sprite = this.spriteScene;
    LargeCactus.sprite = this.spriteScene;
    Liver.sprite = ducksSprite;
    Rubber.sprite = ducksSprite;
    Rotata.sprite = bicyclesSprite;
    Velota.sprite = bicyclesSprite;
    Tangerine.sprite = this.spriteGUI;

    /* Make sure all sprites are ready then init() */
    let completion = 0;
    let checkReady = () => {
        completion++;
      if( completion < loadingList.length )
        return;

      this.init();
    };

    loadingList.forEach( sprite => {
      if( sprite.complete ){
        checkReady();
      } else {
        sprite.addEventListener('load', checkReady );
      }
    });

  }

/**
 * Load sound effects from the HTML.
 * @memberof OnDaRunElement
 */
  loadSoundResources(){

    let soundPath = N7e.storageReference.child(`sounds`);
    OnDaRun.effectNameList.forEach( name =>
      soundPath.child(`${name}.m4a`)
      .getDownloadURL()
      .then( url => new Audio( url, name ).decoded())
      .then( audio => this.soundEffects[ name ] = audio )
    );// name

              //audioData => this.soundEffects[ name ] = new Audio( audioData, name )
    /* Keep for file conversion.
    Sound.inst.contextReady().then( actx => {

      var resourceTemplate = document.getElementById( ODR.config.RESOURCE_TEMPLATE_ID ).content;

      let counter = 0;
      let entries = Object.entries( Sound.effectIds );
      let entriesLen = entries.length;

      entries.forEach(([ sound, id ]) => {
        var soundSrc =
          resourceTemplate.getElementById( id ).src;
        soundSrc = soundSrc.substr(soundSrc.indexOf(',') + 1);
        let len = (soundSrc.length / 4) * 3;
        let str = atob(soundSrc);
        let arrayBuffer = new ArrayBuffer(len);
        let bytes = new Uint8Array(arrayBuffer);

        for (let i = 0; i < len; i++) {
          bytes[i] = str.charCodeAt(i);
        }

        {
          let url = window.URL.createObjectURL(new Blob([bytes.buffer], {type: "octet/stream"}));
          console.log(sound,'normal')
          var a = document.createElement("a");
          a.href = url;
          a.download = sound;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
        }

      });// entries.forEach()
    });// contextReady()
    */
  }


/**
 * Initialize the game parameters & game-play graphics.
 * @memberof OnDaRunElement
 */
  init(){
    this.gameMode = this.gameModeList[ this.config.GAME_MODE ];

    this.canvas = this.shadowRoot.getElementById('console-screen');
    this.canvas.width = OnDaRun.DefaultWidth;
    this.canvas.height = OnDaRun.DefaultHeight;
    this.canvasCtx = this.canvas.getContext('2d');
    this.canvas.style.visibility = 'visible';

    //this.generateShadowCache();
    Mountain.generateMountainImages();

    // Sound system
    this.config.PLAY_MUSIC = true;
    this.loadSoundResources();
    Sound.inst.musicVolume = ODR.config.SOUND_MUSIC_VOLUME/10;
    Sound.inst.loadSong('MUSIC_INTRO', false );
    Sound.inst.loadSong('MUSIC_GAMEPLAY', false );

    this.sky = new Sky( this.canvas );
    this.sky.setShade( Sky.config.START, 0 );
    this.scenery = new Scenery( this.canvas );
    this.sequencer = new Sequencer( this.canvas );


    let titlePanel = this.panel = new TitlePanel( this.canvas );

    this.amandarine = new A8e( this.canvas );

    this.scoreboard = new Scoreboard( this.canvas );

    this.achievementPhrases = [
      "Keep running!",
      "There you go!",
      "Don't give up!",
      "Keep it up!",
      "Looking good!",
      "Good Job!",
      "I'm so proud of you!",
      "Great Job!",
      "Believe in yourself!",
      "Stay Strong!",
      "Just don't die!",
      "Do the impossible!",
    ];

    this.notifier = new Notifier( this.canvas );
    this.cc = new Terminal( this.canvas, 300, 180, 0 ); //Closed Caption

    this.actionIndex = 0;

    /* Set default custom mode to setting 0 */
    this.config.GRAPHICS_MODE_SETTINGS[ 3 ] = JSON.parse( JSON.stringify( OnDaRun.Configurations.GRAPHICS_MODE_SETTINGS[ 0 ]));
    this.setGraphicsMode( 3, false );
    this.scenery.horizonLine.generateGroundCache( ODR.config.GRAPHICS_GROUND_TYPE );

    this.style.opacity = 1;

    this.startListening();

    if( !window.location.hostname.startsWith('amandarine-frontier')){
        let banner = document.getElementById('message-banner');
        // This message is intended for enirehtan server. All accounts should work with localhost testing.
        banner.textContent = "Welcome to TESTING SERVER. Please visit the GitHub link for more information of the app. Only Google Account is enabled.";
        banner = document.getElementById('game-banner');
        banner.style.visibility = 'visible';
        banner.style.opacity = 1;
    }

    this.user = User.inst;
    this.user.signIn().then( data  => {

      if( !this.user.uidRef ){
        // No user
        let banner = document.getElementById('game-banner');
        banner.style.visibility = 'visible';
        banner.style.opacity = 1;
      } else {
        console.log(`Welcome back, "${this.user.nickname}"!`);

        //Make the TitlePanel bypass the button waiting time in case that
        //the AudioContext has already resumed.
        titlePanel.buttonBlockStopTime = titlePanel.timer + 1500;

        if( data.odr && data.odr.settings ){

          Object.assign( this.config.GRAPHICS_MODE_SETTINGS[ 3 ], data.odr.settings );

          if( this.config.GRAPHICS_MODE == 3 ){
            console.log('Applying custom graphics settings.')
            this.setGraphicsMode( 3, false );
            this.scenery.horizonLine.generateGroundCache( ODR.config.GRAPHICS_GROUND_TYPE );
          }

          if( this.config.GAME_MODE_REPLAY ){
            this.sequencer.reset();
          }
        }

      }
    });

    // Defer the horse for 1s to make sure the starting animation goes smoothly.
    setTimeout(() => this.scheduleNextRepaint(), 1000 );
  }

    /*
  generateShadowCache(){
    // Generate A8e shadows.

    let width = 0;

    //Amandarine shadow
    Object.entries(A8e.animFrames).forEach(([name,act]) => {
      let base = 0;
      ('SLIDING' == name
        ? A8e.collisionBoxes.SLIDING
        : A8e.collisionBoxes.RUNNING).forEach(box => base = Math.max(base,box.maxY()));

      act.shadow = document.createElement('canvas');
      act.shadow.width = act.sprite.width;
      act.shadow.height = 40; // Use 5px offset
      let shadowCtx = act.shadow.getContext('2d');
      shadowCtx.filter = `brightness(0)`;
      for( let i = 0; i < 40; i++ ) {
        //shadowCtx.filter = `blur(8px) brightness(0) opacity(${40*(20-i)/20}%)`;
        if( base - i < 0 ) break;
        shadowCtx.drawImage( act.sprite,
          0, base-i, act.shadow.width, 1,
          0, i/3, act.shadow.width, 1 );
      }

    });
    */

    // Entity shadows.
    /*
    XObstacle.typeList.forEach(type => {
      let base = 0;
      type.collisionBoxes.forEach(box => base = Math.max( base, box.maxY()));

      let def = OnDaRun.spriteDefinition[type.name];
      let frames = new Set( type.frames ? type.frames : [def.x]);

      type.shadow = document.createElement('canvas');
      type.shadow.width = type.width * frames.size;
      type.shadow.height = type.height;
      let shadowCtx = type.shadow.getContext('2d');

      frames.forEach(frameX => {
        let dx = frameX - def.x;
        for( let i = 0; i < type.shadow.height; i++ ) {
          if( base - i < 0 ) break;
          shadowCtx.filter = `brightness(0)`;
          shadowCtx.drawImage(type.sprite,
            def.x + dx, base - i, type.width, 1,
            dx, i/3, type.width, 1 );

        }

      });

    });
  }
    */


  get runTime(){
    return this._runTime;
  }

  set runTime( rt ){
    this._runTime = rt;
    this.currentSpeed = this.config.SPEED + rt * this.config.ACCELERATION;
    if( this.currentSpeed > this.config.MAX_SPEED )
      this.currentSpeed = this.config.MAX_SPEED;
  }

/** Class OnDarun
 * Amandarine walks into the scene.
 */
  start(){
    this.soundEffects.SOUND_SCORE.play( this.config.SOUND_SYSTEM_VOLUME/10 );

    let defaultAction = new DefaultAction( 1 );
    defaultAction.activate = function( action, a8e ){
      a8e.minX = -100;
      action.activate = null;
      return false;
    };
    this.queueAction( defaultAction );

    let greeter = new Greeter( this.canvas, this.notifier );
    // The zero-size of activeTasks means either all tasks are resolved
    // or no user at all.
    if( this.user.signInInProgress ){
      let waitPanel = new Wait( this.canvas, greeter, "signing in..please wait" );
      this.user.allTasksSettled().then(() => {
        Sound.inst.loadSong('MUSIC_INTRO', this.config.PLAY_MUSIC );
        waitPanel.exit();
      });
      return waitPanel;
    } else {
        Sound.inst.loadSong('MUSIC_INTRO', this.config.PLAY_MUSIC );
      return greeter;
    }

  }

  setMusicMode( mode ){
    if( this.config.PLAY_MUSIC ){
      Sound.inst.currentSong = null;
      this.config.PLAY_MUSIC = false;
      this.notifier.notify('♬ OFF', 2000 );
    } else {
      this.config.PLAY_MUSIC = true;

      if( 1 == this.gameState ){
        Sound.inst.loadSong('MUSIC_GAMEPLAY', this.config.PLAY_MUSIC );
      } else {
        Sound.inst.loadSong('MUSIC_INTRO', this.config.PLAY_MUSIC );
      }
      this.notifier.notify('♬ ON', 2000 );
    }
  }

  closePanelForButton( button ){
    if( this.panel.associatedButton == button ){
      this.panel = null;
      return true;
    }
    return false;
  }

  createSoundMenu(){
    //this.config.PLAY_MUSIC = true;
    Sound.inst.currentSong = null;
    let entries = [];
    let key;

    key = 'PLAY_MUSIC_VOLUME';
    entries.push({
      title: 'PLAY MUSIC',
      name: 'PLAY_MUSIC',
      options: ['YES','NO'],
      value: this.config.PLAY_MUSIC,
    });

    key = 'SOUND_MUSIC_VOLUME';
    entries.push({
      title: key.slice(6),
      name: key,
      options: this.config.SOUND_OPTIONS[ key ],
      value: this.config[ key ],
      muted: true,
    });

    key = 'SOUND_EFFECTS_VOLUME';
    entries.push({
      title: key.slice(6),
      name: key,
      options: this.config.SOUND_OPTIONS[ key ],
      value: this.config[ key ],
      muted: true,
    });

    key = 'SOUND_SYSTEM_VOLUME';
    entries.push({
      title: key.slice(6),
      name: key,
      options: this.config.SOUND_OPTIONS[ key ],
      value: this.config[ key ],
      muted: true,
    });

    entries.push({ title:'exit', exit: true });

    let mainMenu = new Menu( this.canvas, {
      title: 'sounds',
      entries: entries,
      select: ( entry, vol, model ) => {
        if( mainMenu.model === model || vol > 10) {
          if( model.name == 'SOUND_MUSIC_VOLUME' && vol == 11) {
            Sound.inst.musicVolume = ODR.config.SOUND_MUSIC_VOLUME/10;
          } else {
            this.soundEffects.SOUND_BLIP.play( ODR.config.SOUND_SYSTEM_VOLUME/10 );
          }
        } else {
          if( model.name == 'SOUND_SYSTEM_VOLUME' ) {
            this.soundEffects.SOUND_BLIP.play( vol/10 );
          } else if( model.name == 'SOUND_EFFECTS_VOLUME' ) {
            model.sampleNames = model.sampleNames || [
              'SOUND_QUACK',
              'SOUND_OGGG',
              'SOUND_GOGOGO',
              'SOUND_BICYCLE',
              'SOUND_JUMP',
              'SOUND_SLIDE',
              'SOUND_HIT',
              'SOUND_ERROR',
              'SOUND_BLIP',
              'SOUND_POP',
            ];
            this.soundEffects[ model.sampleNames[ 0 ]].play( vol/10 );
            model.sampleNames.push( model.sampleNames.shift());
          } else if( model.name == 'SOUND_MUSIC_VOLUME' ) {
            Sound.inst.musicVolume = vol/10;
          }
        }
      },
      enter: ( entryIndex, entry, expandingOptions ) => {
        if( entry.name == 'SOUND_MUSIC_VOLUME' && expandingOptions ){
          Sound.inst.loadSong('MUSIC_GAMEPLAY', true );
          return;
        }

        if( entry.value != this.config[ entry.name ] ) {
          this.config[ entry.name ] = entry.value;
          if( this.user.odrRef ){
            this.user.odrRef.child('settings/' + entry.name ).set( entry.value );
          }

          if( entry.name == 'PLAY_MUSIC' ) {
            ODR.notifier.notify( `♬ ${entry.value ? "ON" : "OFF"}`, 2000 );
          }
        }
      },
    }, this.consoleButtons.CONSOLE_A );

    return mainMenu;
  }

  createGraphicsMenu(){
    Sound.inst.currentSong = null;
    let entries = [];
    for (let key in this.config.GRAPHICS_MODE_OPTIONS) {
      let def = this.config.GRAPHICS_MODE_OPTIONS[key];
      entries.push({title:key.slice(9), name:key, options:def, value:this.config[key]});
    }

    entries.push({title:'exit', exit:true});

    return new Menu( this.canvas, {
      title: 'graphics',
      entries: entries,
      enter: ( entryIndex, entry ) => {
        if( entry.value ) {
          this.config.GRAPHICS_MODE_SETTINGS[ 3 ][ entry.name ] = entry.value;
          if( this.user.odrRef ){
            this.user.odrRef.child(`settings/${entry.name}`).set( entry.value );
          }
        }
        this.setGraphicsMode( 3 );
        return null;
      },
    }, this.consoleButtons.CONSOLE_B );
  }

  showGameModeInfo( duration = 3000, delay = 0 ){
    this.cc.append( `${this.gameMode.title}`+ ( this.gameModeScore ? ' '+Text.c.trophy+' '+this.gameModeScore : ''), duration, delay );
  }

  setGameMode( choice ){
    /* FIXME avoid modifying config */
    this.gameMode = choice;

    this.scoreboard.score = 0;

    this.config.ACCELERATION = choice.acceleration;

    this.gameState = 0;

    this.amandarine.reset();
    this.scenery.reset();
    this.sequencer.reset();

    this.invert(true);

    //FIXME dup screen forward
    Sound.inst.loadSong('MUSIC_INTRO', this.config.PLAY_MUSIC );

    let defaultAction = new DefaultAction( 1 );
    defaultAction.activate = function( action, a8e ){
      a8e.minX = -100;
      action.activate = null;
      return false;
    };
    this.queueAction( defaultAction );
    this.soundEffects.SOUND_SCORE.play( this.config.SOUND_SYSTEM_VOLUME/10 );
    this.sky.setShade( Sky.config.DAY, 0 );

    this.showGameModeInfo();
  }

  createGameMenu(){

    Sound.inst.currentSong = null;
    let entries = [];

    Object.values( this.gameModeList ).forEach( mode => {
      entries.push({
        title: `${mode.title} [${Math.round(mode.distance * this.config.TO_SCORE)}]${this.gameMode === mode ? ' '+ Text.c.true : ''}`,
        mode: mode,
      });
    });
    if( this.config.GAME_MODE_REPLAY ){
      entries.push({
        title:'REPLAY LAST GAME',
        disabled: ODR.sequencer.totalRecall.length < 2
      });
    }
    entries.push({ title:'EXIT', exit: true });

    let gameMenu = new Menu( this.canvas, {
      title: 'games',
      entries: entries,
      enter: ( entryIndex, choice ) => {
        if( choice.mode ){
          this.setGameMode(choice.mode);
        } else if ( !choice.exit ){
          //The Hidden Total Recall Menu
          let sequencer = ODR.sequencer;

          // For setting after callng setGameMode() as both props will be gone.
          let totalRecall = sequencer.totalRecall;
          let dejavus = totalRecall.slice();

          this.setGameMode( dejavus.shift());

          // For another replay
          sequencer.totalRecall = totalRecall;
          sequencer.dejavus = dejavus;
        }

        gameMenu.exit( null );
      }
    }, this.consoleButtons.CONSOLE_C );
    return gameMenu;
  }

  createUserMenu(){
    Sound.inst.currentSong = null;
    let user = this.user;
    let userMenu =
      user.uidRef
      ? new Menu( this.canvas, {
        title: `${{
          ['google.com']: ` ${Text.c.google}`,
          ['facebook.com']: ` ${Text.c.facebook}`,
          ['twitter.com']: ` ${Text.c.twitter}`,
        }[ user.provider.providerId ]} ${user.nickname}`,
        entries: [
          "SET NAME",
          /*"SET AVATAR : NYI",*/
          "SIGN OUT",
          {title:'EXIT',exit:true}
        ],
        user: user,
        enter: (entryIndex,choice) => {
          if (choice.exit) userMenu.exit();

          if( choice == "SET NAME"){
            let editor = userMenu.exit( new TextEditor( this.canvas, user.nickname || '', newNickname => {
              if( !newNickname ){
                this.soundEffects.SOUND_ERROR.play( ODR.config.SOUND_SYSTEM_VOLUME/10 );
              } else {
                this.soundEffects.SOUND_SCORE.play( ODR.config.SOUND_SYSTEM_VOLUME/10 );
                user.setNickname( newNickname );
                this.notifier.notify(`all hail ${newNickname.split(' ').join('_')}!`, 5000 );
                editor.exit( null );
                //userMenu.model.title = newNickname;
              }
            }, userMenu ));
          } else if( choice == "SIGN OUT"){
            let confirmMenu = userMenu.exit( new Menu( this.canvas, {
              title: 'DO YOU WANT TO SIGN OUT?',
              user: user,
              entries: [
                'YES',
                {title:'NO',exit:true}
              ],
              currentIndex: 1,
              enter: (confirm,confirmation) => {
                if( confirmation.exit ){
                  confirmMenu.exit();
                } else {
                  user.signOut();

                  this.runTime = 0;
                  //ODR.maxSpeed = null;

                  // Reset game score.
                  Object.values( this.gameModeList ).forEach( mode => mode.distance = 0 );
                  this.setGameMode( this.gameModeList.GAME_A );
                  confirmMenu.exit( null );
                }
              },
            }, this.consoleButtons.CONSOLE_D, userMenu ));
          }
        }
      }, this.consoleButtons.CONSOLE_D )
      /* No active user */
      : new Menu( this.canvas, {
        title: 'LINK PROFILE',
        entries: [
          `${Text.c.facebook} FACEBOOK`,
          `${Text.c.twitter} TWITTER`,
          `${Text.c.google} GOOGLE`,
          {title:'EXIT',exit:true}
        ],
        enter: ( entryIndex, choice ) => {
          if( choice.exit ) userMenu.exit();

          let confirmMenu = userMenu.exit( new Menu( this.canvas, {
            title: 'DO YOU WANT TO LINK ' + choice + '?',
            entries: [
              'YES',
              { title:'NO', exit: true },
            ],
            currentIndex: 1,
            enter: ( confirm, confirmation ) => {
              if( confirmation.exit ){
                confirmMenu.exit();
              } else {
                let waitPanel = new Wait( this.canvas, null, `signing with ${
                  ['facebook',
                   'twitter',
                   'google'][entryIndex]
                   }..please wait`);

                this.user.signIn([
                  'facebook.com',
                  'twitter.com',
                  'google.com',
                ][entryIndex], N7e.isMobile ) .then(() => {
                  this.setGameMode( this.gameModeList.GAME_A );
                  waitPanel.exit()
                });

                confirmMenu.exit( waitPanel );
              }
            },
          }, this.consoleButtons.CONSOLE_D, userMenu ));
        },
      }, this.consoleButtons.CONSOLE_D );

    return userMenu;
  }

  createResetMenu(){
    Sound.inst.currentSong = null;
    return new Menu( this.canvas, {
      title: 'WHOA...DEJA VU?',
      entries: [
        { title:'YES, RED.', disabled:this.config.GAME_MODE_REPLAY },
        { title:'NO, BLUE.', disabled:!this.config.GAME_MODE_REPLAY},
        { title:"WORM...SOMETHING?" },
        { title:'CANCEL', exit:true }
      ],
      currentIndex: 1,
      enter: ( idx, confirmation ) => {
        if( idx === 2 ){
          this.createWormGame();
        } else if( !confirmation.exit ){
          this.config.GAME_MODE_REPLAY = [ true, false ][ idx ];
          this.setGameMode( this.gameMode );
          this.cc.append("REPLAY MODE ENABLED", 2000);
          this.cc.append("IN THE GAME MENU.", 2000,2000);
          if( this.user.odrRef ){
            this.user.odrRef.child('settings/GAME_MODE_REPLAY').set( this.config.GAME_MODE_REPLAY );
          }
        }
        return null;
      },
    }, this.consoleButtons.CONSOLE_RESET );
  }

  createWormGame(){
    Sound.inst.currentSong = null;
    this.panel = new WormGame( this.canvas, this.panel );
  }

  setGraphicsMode( mode, notify = true){

    if (mode == -1) {
      mode = ( this.config.GRAPHICS_MODE + 1 )%4;
    }

    Object.assign(this.config, this.config.GRAPHICS_MODE_SETTINGS[mode]);
    this.config.GRAPHICS_MODE = mode;
    this.canvasCtx.restore();
    this.canvasCtx.save();

    if( notify )
    switch( mode ){
      case 0:
        this.notifier.notify(`N${Text.c.a}TURING`, 5000 );
        break;
      case 1:
        this.notifier.notify('STRIPES', 5000 );
        break;
      case 2:
        this.notifier.notify('ROCK-BOTTOM', 5000 );
        break;
      case 3:
        this.notifier.notify('CUSTOM', 5000 );
      default:
        break;
    }

     if (this.config.GRAPHICS_DUST != 'DUST')
      this.amandarine.dust.reset();

    if (this.config.GRAPHICS_MOON == 'SHINE') {
      this.scenery.nightMode.generateMoonCache();
    } else {
      this.scenery.nightMode.moonCanvas = null;
    }
    this.canvas.style.opacity = 1 - this.config.GRAPHICS_DAY_LIGHT/5;

    //Generate caches
    //this.scenery.forward( 0, 0, 0, false, 0);
  }

  set panel( newPanel ){
    if(! newPanel )
      if( 0 == this.gameState ) this._panel = new Greeter( this.canvas, this.notifier );
      else if( 2 == this.gameState ) this._panel = new GameOver( this.canvas );
      else this._panel = this._passthroughPanel;
    else if( this._panel != newPanel ){
      this._panel = newPanel;
      newPanel.activate();
    }
  }

  get panel(){
    return this._panel;
  }

/**
 * OnDarun main forwarding
 */
  forward( now ) {

    var deltaTime = now - (this.time || now);
    this.time = now;

    // Update button animations.
    for( let key in this.consoleButtons ){
      this.consoleButtons[ key ].forward( deltaTime );
    }

    if( !this.panel.passthrough ){
      this.panel = this.panel.forward( deltaTime );
      this.scheduleNextRepaint();
      return;
    }

    if( 1 == this.gameState ){

      if( this.config.GAME_MODE_REPLAY ){
        let dejavus = this.sequencer.dejavus;
        if( dejavus ){

          //Sync runTime with the next entity in the replay mode.
          if( dejavus.length ){
            if( dejavus[0].runTime < this.runTime + deltaTime ){
              let extra = this.runTime + deltaTime - dejavus[0].runTime;
              deltaTime -= extra;
            }
          } else {
            if( this.sequencer.numberOfEntities == 0 ){
              let liverOffset = 300*(( 1- Liver.speedFactor )/( 1- Rubber.speedFactor )- 2);

              [ ["  ##   ##",
                 "#    #    #",
                 "#         #",
                 " #       #",
                 "   #   #",
                 "     #"],
                ["#    #",
                 "##   #",
                 "# #  #",
                 "#  # #",
                 "#   ##",
                 "#    #"]].forEach(( kind, isRubber ) => kind.reverse().forEach(( line, elev ) => {

                   line.split('').forEach(( c, x ) => {
                     if( c == '#'){
                       let duckType = [ Liver , Rubber ][ isRubber ];
                       let duck = new duckType( this.canvasCtx,
                         this.currentSpeed * duckType.speedFactor, DuckType.elevationList[ elev ]);
                       duck.minX = OnDaRun.DefaultWidth + 50 + 20*x;
                       if( !isRubber ){
                         duck.minX += liverOffset;
                       }
                       this.sequencer.addEntity( duck );
                     }
                   });

                 }));
            }
          }

          this.runTime += deltaTime;
          this.scoreboard.score = this.score;
        } else {
          this.runTime += deltaTime;
          //this.distance += this.currentSpeed * deltaTime / this.msPerFrame;
        }
      } else {
        this.runTime += deltaTime;
        //this.distance += this.currentSpeed * deltaTime / this.msPerFrame;
      }

      this.scenery.forward( deltaTime, this.currentSpeed, this.inverted );
      this.sequencer.forward( deltaTime, this.currentSpeed, true );
      this.scoreboard.forward( deltaTime );

      let score = this.score;
      this.scoreboard.score = score;
      if( this.achievements.length && score >= this.achievements[ 0 ]){
        this.achievements.shift();
        this.notifier.notify( this.achievements.shift(), 6000, 18 );
      }

      // Night & Day FIXME use time instead of timer
      if (this.invertTimer > this.config.INVERT_FADE_DURATION) {
        this.invertTimer = 0;
        this.invertTrigger = false;
        this.invert();
      } else if( this.invertTimer ){
        this.invertTimer += deltaTime;
      } else {
        if( score > 0 ){
          this.invertTrigger = !( score % this.config.INVERT_DISTANCE );

          if (this.invertTrigger && this.invertTimer === 0) {
            this.invertTimer += deltaTime;
            this.invert();
          }
        }
      }

      let crashAction = this.sequencer.crashTest( this.amandarine );
      if( crashAction ){
        // The scheduler will set gameState to 2 that will call this.crash()
        this.queueAction( crashAction );
      }

    } else if( 2 == this.gameState ){
      //CEASING
      //Define existence as a timing ratio used to by the gameover animations.
      let existence = N7e.clamp(( this.config.GAMEOVER_CLEAR_TIME-
        this.activeAction.timer )/this.config.GAMEOVER_CLEAR_TIME, 0, 1 );

      this.scenery.forward( deltaTime, this.currentSpeed, this.inverted );
      this.sequencer.forward( deltaTime, this.currentSpeed, false, existence );
      this.scoreboard.forward( deltaTime );

      if (existence > 0.9) {
        let crashPoint = this.actions[0].crash.C.center();
        this.canvasCtx.drawImage( ODR.spriteGUI,
            OnDaRun.spriteDefinition.CRASH.x,
            OnDaRun.spriteDefinition.CRASH.y,
            this.config.CRASH_WIDTH, this.config.CRASH_HEIGHT,
            crashPoint.minX - this.config.CRASH_WIDTH/2, crashPoint.minY - this.config.CRASH_HEIGHT/2,
            this.config.CRASH_WIDTH, this.config.CRASH_HEIGHT);
        let dust = ODR.amandarine.dust;
        for( let i = 0; i < 2; i++ ){
          let yy = this.amandarine.minY - crashPoint.minY;
          dust.addPoint( 0, yy, 100 * Math.random() - 50, -40 * Math.random());
          dust.addPoint( 0, yy, 50 * Math.random() - 25, 40 * Math.random());
        }
      }

    } else {
      // 0 == this.gameState
      this.scenery.forward( deltaTime, 0, this.inverted );
      this.sequencer.forward( deltaTime, this.currentSpeed, false );
      //this.scoreboard.existence = 0;
    }

    let a = this.actions[0];
    this.activeAction = this.forwardActionQueue( deltaTime, this.currentSpeed, this.amandarine );
    this.notifier.forward( deltaTime );

    if( this.playLyrics ){
      Sound.inst.updateLyricsIfNeeded( m => this.cc.appendMessage( m ));
    }
    this.cc.forward( deltaTime );

    if( this.panel.passthrough ){
      this.panel = this.panel.forward( deltaTime );
    }

    if( this.config.GRAPHICS_DISPLAY_INFO == 'YES'){
      this.paintRound = this.paintRound || 0;
      this.paintCounter = this.paintCounter || 0;
      this.paintCounter++;
      this.paintRoundTimer = this.paintRoundTimer || 1000;
      this.paintRoundTimer -= deltaTime;
      if (this.paintRoundTimer < 0) {
        this.paintRoundTimer += 1000;
        this.paintRound = this.paintCounter;
        this.paintCounter = 0;
      }

      this.cc.append(`S:${this.currentSpeed.toFixed(3)} T:${(this.runTime/1000).toFixed(1)} FPS:${this.paintRound}`);
    }

    this.scheduleNextRepaint();
  }

/**
 * OnDarun Event handler interface
 * Menus or Panels may block the defualt behaviors by implementing
 * handleEvent(e) and return true; false will invoke the defaults.
 *
 * @param {Event} e application events.
 */
  handleEvent(e) {

    switch( e.type ){
      case OnDaRun.events.VISIBILITY:
        if( document.visibilityState != 'visible' ){
          this.pause = true;
          break;
        }
      case OnDaRun.events.FOCUS:
        this.pause = false;
        break;
      case OnDaRun.events.BLUR:
        this.pause = true;
        break;
      case OnDaRun.events.KEYDOWN:{
        if( !this.panel.handleEvent || !this.panel.handleEvent( e )){
          let button = this.consoleButtonForKeyboardCodes[ e.code ];
          if( button ){
            button.handleEvent( e );
          } else {
            this.onKeyDown( e );
          }
        }

      } break;

      case OnDaRun.events.KEYUP:
        if( !this.panel.handleEvent || !this.panel.handleEvent( e )){
          let button = this.consoleButtonForKeyboardCodes[ e.code ];
          if( button ){
              button.handleEvent( e );
          } else {
            this.onKeyUp( e );
          }
        }
        break;

      case OnDaRun.events.CONSOLEDOWN: {
        if( this.panel.handleEvent && this.panel.handleEvent( e )){
          return;
        }

        let button = e.detail.consoleButton;

        switch( button ){
          case this.consoleButtons.CONSOLE_LEFT:{
            let action = this.consoleButtonActionMap.get( button );
            if( !action || action.priority != 0 ){
              action = new SlideAction( this.time, this.currentSpeed );
              this.consoleButtonActionMap.set( button, action );
              this.queueAction( action );
            }
          } break;

          case this.consoleButtons.CONSOLE_RIGHT:{
            let action = this.consoleButtonActionMap.get( button );
            if( !action || action.priority != 0 ){
              action = new JumpAction( this.currentSpeed );
              this.consoleButtonActionMap.set( button, action );
              this.queueAction( action );
            }
          } break;

          default:
            this.soundEffects.SOUND_PRESS.play( this.config.SOUND_SYSTEM_VOLUME/10 );
        }

      } break;

      case OnDaRun.events.CONSOLEUP:{
        if( this.panel.handleEvent && this.panel.handleEvent( e )){
          return;
        }

        let button = e.detail.consoleButton;

        switch( button ){
          case this.consoleButtons.CONSOLE_LEFT:
          case this.consoleButtons.CONSOLE_RIGHT:{
            let action = this.consoleButtonActionMap.get( button );
            if( action && action.priority == 0 ){
              action.willEnd( this.currentSpeed );
              action.priority = 1;
              this.consoleButtonActionMap.delete( button );
            }
          } break;

          // Sound button
          case this.consoleButtons.CONSOLE_A:
            if( !N7e.isSoundDisabled ){
              if( e.detail.timeOut || !this.panel.passthrough ){
                if( !this.closePanelForButton( button ))
                  this.panel = this.createSoundMenu();
              } else {
                this.setMusicMode(-1 );
                this.cc.append("hold the button for settings.", 3000 );
              }
            } else {
              this.panel = null;
              this.cc.append("sounds currently disabled on ios.", 5000 );
            } break;

          // Graphics button
          case this.consoleButtons.CONSOLE_B:
            if( e.detail.timeOut || !this.panel.passthrough ){
              if( !this.closePanelForButton( button ))
                this.panel = this.createGraphicsMenu();
            } else {
              this.setGraphicsMode(-1 );
              this.cc.append("hold the button for settings.", 3000 );
            } break;

          case this.consoleButtons.CONSOLE_C:
            if( !this.closePanelForButton( button )){
              this.panel = this.createGameMenu();
            } break;

          case this.consoleButtons.CONSOLE_D:
            if( !this.closePanelForButton( button )){
              this.panel = this.createUserMenu();
            } break;

          case this.consoleButtons.CONSOLE_RESET:
            if( !this.closePanelForButton( button )){
              this.panel = this.createResetMenu();
            } break;

          case this.consoleButtons.CONSOLE_N7E:{
            this.__n7eUrlList = this.__n7eUrlList || [
              { name: 'FACEBOOK', url: 'https://www.facebook.com/bnk48official.natherine'},
              { name: 'IG', url: 'https://www.instagram.com/natherine.bnk48official'},
            ];
            window.open( this.__n7eUrlList[ 0 ].url, '_blank');
            this.__n7eUrlList.push( this.__n7eUrlList.shift());
          } break;
        }

      } break;
    }
  }

  startListening() {
    // Keys.
    this.consoleButtonActionMap = new Map();

    document.addEventListener( OnDaRun.events.KEYDOWN, this );
    document.addEventListener( OnDaRun.events.KEYUP, this );
    this.addEventListener( OnDaRun.events.CONSOLEDOWN, this );
    this.addEventListener( OnDaRun.events.CONSOLEUP, this );

    document.addEventListener(OnDaRun.events.VISIBILITY, this );
    window.addEventListener(OnDaRun.events.BLUR, this );
    window.addEventListener(OnDaRun.events.FOCUS, this );

    if (!IS_MOBILE) {
      /*
      document.addEventListener(OnDaRun.events.MOUSEDOWN, this);
      document.addEventListener(OnDaRun.events.MOUSEUP, this);
      */
    }
  }

  stopListening() {
    document.removeEventListener( OnDaRun.events.KEYDOWN, this );
    document.removeEventListener( OnDaRun.events.KEYUP, this );
    document.removeEventListener( OnDaRun.events.CONSOLEDOWN, this );
    document.removeEventListener( OnDaRun.events.CONSOLEUP, this );

    if (!IS_MOBILE) {
      /*
      document.removeEventListener(OnDaRun.events.MOUSEDOWN, this);
      document.removeEventListener(OnDaRun.events.MOUSEUP, this);
      */
    }
  }

  onKeyDown(e) {
    // Reject repeating key events.
    if (e.repeat) {
      return;
    }

    // Prevent native page scrolling whilst tapping on mobile.
    //if( IS_MOBILE && this.playing ){
      //e.preventDefault();
    //}
  }

  onKeyUp(e) {
    var keyCode = String(e.keyCode);

    if (keyCode <= 52 && keyCode >= 49) {
      /* Mapping 1,2,3,4 => 0,1,2,3 */
      this.setGraphicsMode(keyCode - 49);
      return;
    }

    if( e.code == 'Escape' ){
      this.panel.canEscape && this.panel.exit();
      this.soundEffects.SOUND_PRESS.play( this.config.SOUND_SYSTEM_VOLUME/10 );
      return;
    }

    if( e.code == 'KeyW' ){
      this.createWormGame();
      return;
    }
  }

  queueAction( action ){
    this.actionIndex++;
    action.index = this.actionIndex;
    this.actions.push( action );
  }

  scheduleNextRepaint() {
    if( this.pause ){
      if( this.raqId ){
        cancelAnimationFrame( this.raqId );
        this.raqId = 0;
      }
    } else {
      this.raqId = requestAnimationFrame((now) => this.forward( now ));
    }
  }

  /*
  isRunning() {
    return !!this.raqId;
  }
  */

  updateScore(){
    this.user.maxSpeed = { value: this.runSession.crashSpeed, time: new Date().getTime()};

    let d = this.score;

    // Only play lyrics if reaching a half of hiscore and more than 1000.
    // FIXME Rethink for different difficulties.
    if( this.runSession.crashSpeed > 8 && this.distance > this.gameMode.distance / 2 ){
      this.playLyrics = true;
    }

    // Update the high score.
    this.gameMode.distance = this.distance;
    if( this.user.uidRef ){
      Tangerine.allDayMax = Math.max( 1, ~~( this.gameModeTotalScore/100 ));
    }
  }

  get gameModeTotalScore(){
    return Object.values( this.gameModeList ).reduce(( a, b ) => a+ Math.round( b.distance * this.config.TO_SCORE ), 0 );
  }

  get gameModeScore(){
    return Math.round( this.gameMode.distance * this.config.TO_SCORE );
  }

  get score(){
    return Math.round( this.distance * this.config.TO_SCORE );
  }

  get distance(){
    return (this._HSPD + this._HACC * this._runTime) * this._runTime;
  }

  invert(reset) {
    if (reset) {
      if (this.config.GRAPHICS_DESKTOP_LIGHT == 'LIGHT') {
        document.body.classList.toggle(OnDaRun.classes.INVERTED, false);
      }

      this.invertTimer = 0;
      this.inverted = false;
    } else {
      this.inverted = this.config.GRAPHICS_DESKTOP_LIGHT == 'LIGHT'
        ? document.body.classList.toggle(OnDaRun.classes.INVERTED, this.invertTrigger)
        : this.invertTrigger;
    }

    this.sky.setShade( this.inverted ? Sky.config.NIGHT : Sky.config.DAY, 3000 );
  }


  /* Phear the Scheduler. Cuz it's a fucking mess.
     Scheduler is for conducting all actions into their priority handlers,
     before activating them in forwardAction().

     *** Action Priority Definitions ***
      0: Either...
        a) Collecting active parameters (eg. weighting Jump & Slide)
        b) Suspended. Waiting to be updated into a background task.
      1: Either...
        a) Next action in the queue; will be activated once an active task has ended.
        b) Timeless background task. (eg. Wait, Run. Will never be active
          but will eventually be pushed back to 0).
      2: Active, will not be interrupted during game play. (eg. Jump, Slide)
      3: Interrupting. (eg. Crash, Pause)
     -1: Zombie, a released task.
  */
  forwardActionQueue( deltaTime, speed, amandarine ){
    let now = this.time; //FIXME should not use now but runTime after start.

    /* activeAction points to the current active action, drawings & tests
    such as collision checkings will be done with this action.
    */
    let activeAction = null;

    // Sort & filter main action queue.
    this.actions.sort(( a, b ) => a.priority == b.priority
      ? a.index - b.index
      : b.priority - a.priority);
    this.actions = this.actions.filter( action => {
      if( action.priority == -1 ) return false;
      action.forward( deltaTime );
      if( action.priority == 1
          && action.hasOwnProperty('duration')
          && action.end + action.duration < action.timer - 500 ){
        action.priority = -1;
        return false;
      }
      return true;
    });

    //Prevent modifications during traversing the queue.

    HANDLE_ACTION_QUEUE: {
      let actionQueue = this.actions.slice();
      for (let queueIndex = 0, action; action = actionQueue[queueIndex]; queueIndex++) {
        switch(action.priority) {
          case 0: { // Priority 0 : Preparing actions.

            switch(action.type) {
              case A8e.status.JUMPING:
              case A8e.status.SLIDING:
                action.drawGuide( this.canvasCtx, amandarine.minX, amandarine.groundMinY, speed );

                // Note: This is how serveral actions in the current implementation got "blended" altogether.
                // The priority-0 Jump/Slide got blended into the previously scheduled priority-2 RUNNING
                // and will also allow blending with another priority-0 Jump/Slide. ie. instead of breaking
                // the queue traversing, it continues to the lower priorities. This allows mixing guide drawings
                // and so all blended actions can process simultaneously.
                // This would allow mixing animations from different actions in future.
                continue;
              case A8e.status.RUNNING:

                action.priority = 1;
                activeAction = action;

                break;
              case A8e.status.WAITING:
                activeAction = action;
              default:;
            }

            break HANDLE_ACTION_QUEUE;
          }

          case 1:  // Priority 1 : Initialising actions.
            switch(action.type) {
              case A8e.status.JUMPING:
                activeAction = action;

                    if( 2 == this.gameState ) {
                      console.trace();
                      /* crash action should have locked the scheduler */
                      console.error('Shoud never be here.')
                      break HANDLE_ACTION_QUEUE;
                    }

                if (this.config.GRAPHICS_DUST != 'NONE') {
                  amandarine.dust.minX = amandarine.minX - 24;
                  amandarine.dust.addPoint(0, 0, -40, -10 * Math.random());
                }

                break;
              case A8e.status.SLIDING:
                activeAction = action;
                action.minX = amandarine.minX;
                break;

              case A8e.status.WAITING:
              //Not sure but... this should turn default waiting into running I guess?

              // These background-type actions (priority 1 without specific
              // duration) below will 'continue' through the action queue
              // to proceed with the active preparing action (priority 0).
              case A8e.status.RUNNING:
                activeAction = action;
                action.speed = speed;
                action.msPerFrame = 1000 /( 22+ speed );

                continue;

              case A8e.status.CEASING:
                // The priority-3 was demoted to 1

              default:
                break HANDLE_ACTION_QUEUE;
            }
            action.priority = 2;
            // All 1s will progress into 2s
          case 2: // Priority 2 : Concurrent actions.
            activeAction = action;
            if(/* action.type == A8e.status.SLIDING || */ action.type == A8e.status.JUMPING ){
              action.drawGuide( this.canvasCtx, amandarine.minX, amandarine.groundMinY, speed );
            }

            break HANDLE_ACTION_QUEUE;
          case 3: // Priority 3 : Immediate actions.
            activeAction = action;
            switch(action.type) {
              case A8e.status.RUNNING:

                /* Running into the scene
                  (A8e.config.START_X_POS + 200)*1000/FPS*/
                if( amandarine.minX > A8e.config.START_X_POS ) {
                  action.speed = 0;
                  amandarine.minX = A8e.config.START_X_POS;
                }
                // Don't proceed action while walking in.
                break HANDLE_ACTION_QUEUE;
              case A8e.status.PAUSED:
                //NYI
                break HANDLE_ACTION_QUEUE;
              case A8e.status.CEASING: {

                // Initialize the crashing process.
                if( 2 != this.gameState ){
                  //TOOD this.dispatchEvent(new CustomEvent('odr-crash', { bubbles: false, detail: { action: action } }));
                  if( action.crash ){
                    // Prepare crash animation.
                    let crashPoint = action.crash.C.center();

                    this.runSession.crashSpeed = speed;
                    this.runSession.crashPoint = crashPoint;
                    this.runSession.crashAction = action;

                    this.gameState = 2;

                    //TODO 4 dirs
                    if( crashPoint.minY - amandarine.minY < 20 ){
                      action.dir = -1;
                    } else {
                      action.dir = 1;
                    }

                    action.duration = 200;
                    action.top = action.duration / 1000;
                    action.halfTime = Math.sqrt( 2000 * action.duration / A8e.config.GRAVITY );
                    action.crashedMinY = amandarine.minY;
                    action.lagging = speed;

                  } else {
                    console.log('no crash');
                  }
                }
              } break HANDLE_ACTION_QUEUE;
              //break;
              case A8e.status.WAITING:
                /*
                if( amandarine.minX < A8e.config.START_X_POS ) {
                  action.speed = 1;
                }*/

                break HANDLE_ACTION_QUEUE;
              default:
              break;
            }
            break;

          default: /*priority*/
            console.error(action, action.priority);
            this.pause = true;
            /*
            amandarine.forwardAction(action, deltaTime, speed);
            break HANDLE_ACTION_QUEUE;
            */
        }
      }
    }

    if (activeAction)
      amandarine.forwardAction( activeAction, deltaTime, speed );
    else {
      console.warn('No active action for repainting.');
    }
    //amandarine.forward(deltaTime, speed, activeAction);

    return activeAction;
  }
}

customElements.define('n7e-ondarun-element', OnDaRunElement);
