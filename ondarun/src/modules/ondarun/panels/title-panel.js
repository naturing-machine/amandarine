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

import { A8e } from '../amandarine.js';
import { Sky } from '../scenery.js';
import { Tangerine } from '../entity.js';
import { Text } from '../text.js';

import { Panel } from './panel.js';

export class TitlePanel extends Panel {
  constructor( canvas ) {
    super( canvas );
    this.timer = 0;
    this.endTime = 0;

    this.waitingForAudioContext = true;

    //Set this true enforce the Donation page to always appear.
    this.waitingForButtonUp = true;
    //this.waitingForButtonUp = Sound.inst.audioContext.state === "suspended" ? true : false;

    // buttonBlockStopTime wlll automatically be set to the timer by a successful
    // user authentication and that will fade the donation messages out.
    this.buttonBlockStopTime = 15000;

    this.blackoutOpacity = 1;
    Sound.inst.contextReady().then( actx => {
      this.waitingForAudioContext = false;
      this.imagesLoadedTime -= this.timer;
      this.timer = 0;
    });

    // These 2 used for fast-forwarding the story while holdig both control buttons simultaneously.
    this.storyStartOffset = 18000;

    let glyphsForIndex = [
      Text.glyphMap.get(Text.c.slide.codePointAt( 0 )),
      Text.glyphMap.get( Text.c.jump.codePointAt( 0 )),
    ];
    function gd( x, y, text, ctx, gidx, cidx ){
      let glyph = glyphsForIndex[ cidx ];
      let math = Math.abs(Math.sin( ODR.time/200 ));

      let alphaRestore = ctx.globalAlpha;
        ctx.globalAlpha*= 1 - 0.3*math;
        ctx.drawImage( ODR.spriteGUI,
          glyph, 0, 14, 16,
          ~~x, ~~(y + 2 - 3*math), 14, 16 );
      ctx.globalAlpha = alphaRestore;
    }

    // The Redcross Donation Message.
    this.donationText = new Text().set
`${'redcross'}

Please support this project
by making a donation to
the thai redcross society


${'left'} to donate ${gd}                ${gd} to sprint ${'right'}
`;

    let heartGlyph = new Text().set`${'heart'}`.glyphs[0];
    let drawHeart = ( x, y, text, ctx ) => {

      let g = this.timer%400 > 200 ? 1092 : 0;

      let alphaRestore = this.canvasCtx.globalAlpha;
        ctx.globalAlpha*= Math.abs( Math.sin( this.timer/300 ));
        ctx.drawImage( ODR.spriteGUI,
          heartGlyph, 0, 14, 16,
          ~~x, ~~y, 14, 16 );
      ctx.globalAlpha = alphaRestore;
    };

    let drawIdle = ( x, y, text ) => {
      let l = A8e.animFrames.WAITING.frames.length;

      this.canvasCtx.drawImage( A8e.animFrames.WAITING.sprite,
        A8e.animFrames.WAITING.frames[ Math.floor(this.timer/1000*8)%l ], 0, 40, 40,
        ~~x-20, ~~y-20, 40, 40 );
    };

    // Main Amandarine story
    this.story = [
      new Text( 38, 37 ).set
`Friends, allow me to tell you a story, A tale of a young maiden named Amandarine, who was born in a small village called Mandarina.

In the unfortunate beginning, Amandarine was unhealthy from birth. Her family had been trying all kinds of treatments, but her condition didn't improve. She had to endure suffering from the cruel birth defect throughout her childhood. The doctor had warned that her condition would be life-threatening by anytime.

But despite her illness, the baby had still been growing and growing up, until the day of her 18th birthday...`,

      new Text( 38, 37 ).set
`That morning, Amandarine was having her custard bread. She then heard the sound of someone playing the ukulele while singing a song she had never heard before. She looked out the window and saw a man, a street performer, maybe; who was walking pass by until suddenly stumbled upon the rock and fell abjectly.

She hurried out to see him and found him cringing, rubbing his little toe. He was still groaning faintly in pain as he looked back at her. Or he didn't look at her actually, he looked at the half-eaten loaf of bread she took with her...`,

      new Text( 38, 37 ).set
`Warm sunlight was teasing the cold breeze that was blowing gently. The birds chirping in the morning reminded her that this man must definitely be hungry. She, therefore, gave him the remaining bread. He smiled with gratitude and started eating the bread happily.

Once finished, that was very soon after, he looked at Amandarine and said that telling from her facial skin and eye reflections, he could notice many signs of her dreadful health in which she nodded affirmatively.

...In fact, he continued, he was a doctor from China called Lu Ji. Then he asked for her wrist so he could make a further diagnosis.

After learning the pulses for a few breathes, Lu Ji told her that her disease, though very serious, had a cure.

That got all of her attention and she started listening to him intensely. He didn't say any more word but picked up a dried orange from his ragged bag; a dried tangerine would be more precise.`,

      new Text( 38, 37 ).set
`Saying that he must have fled his hometown, for he had stolen this very tangerine from a noble. The dried brownish fruit was called "The 8th Heaven Supremacy"; it could cure her illness, he explained and asked her to accept it.

He said that she should boil it in ginger juice to create one adequate medicine for living longer but for her to be fully recovered its seeds must be planted in eight continents and she should have kept eating each kind of them afterwards until cured.

Amandarine cried with tears of joy as she was thanking him. Lu Ji smiled, stood up and brushed the dust off his legs repeatedly. He didn't even say goodbye when he started playing the ukulele, singing this song, walking away.`,

      new Text().set
`♬ Natherine ♬
she is all they claim
With her eyes of night
and lips as bright as flame

Natherine
when she dances by
Senoritas stare
and caballeros sigh

And I've seen
toasts to Natherine
Raised in every bar
across the Argentine

Yes, she has them all on da run
And their hearts belong to just one
Their hearts belong to
♬ Natherine ♬`,

      new Text().set
`Credits

-Music-

The song "Natherine" based on
an old song "Tangerine"
written by Victor Schertzinger
and lyrics by Johnny Mercer.

The arrangement was adapted from
Guy Bergeron's MIDI file
without permission.


-Computer Graphics-

${'tangerine'}
Orange Groove Sororite

Which doesn't exist.


-Software Developments-

N${'a'}turing M${'a'}chine

Which also doesn't exist.


-Special Thanks-

${drawIdle}
${drawHeart} Dusita Kitisarakulchai ${drawHeart}
..as the inspiration..

and some of her particular
supporters / fanpages
for buzzing about it.

You can also support this project
by making a donation to
The Thai Redcross Society ${'redcross'}

`,
    ];

    this.storyPhotos = [];
    this.imagesLoadedTime = Infinity;

    this.msPerLine = 2150;

    let clock = 3000;

    this.photoTiming = [
    //  beginTime, endTime, will be calculated from number of lines.
    //  |    beginX,beginY, beginSize,
    //  |    |           endX,endY, endSize, textCenter
      [ 0,0, 30,33, 1,   215,411, 1.5, false ],
      [ 0,0, 27,355, 1,  73,151, 1.2, false ],
      [ 0,0, 29,26, 1,   26,358, 1.2, false ],
      [ 0,0, 23,350, 1,  27,24, 1, false ],
      [ 0,0, 62,244, 1,  12,160, 0.5, false ],
      [ 0,0, 100,237, 1, 100,237, 1.0, true ],
    ];
    for( let i = 0; i < this.story.length; i++) {
      this.photoTiming[i][0] = clock;
      clock += 20000 + this.story[i].numberOfLines * this.msPerLine;
      this.photoTiming[i][1] = clock;
    }
    this.storyEndTime = this.photoTiming[ this.story.length- 1][ 1 ];

    Sound.inst.loadEffect('amandarine-frontier').then( audio => {
      this.titleAmandarineFrontierAudio = audio;
    });

  }

  loadImages(a,...theArgs){
    // Don't load last image.
    let imageLoadedCounter = this.story.length - 1;
    for( let i = 0; i < this.story.length - 1; i++  ) {
      this.storyPhotos[i] = new Image();
      this.storyPhotos[i].addEventListener('load', (e) => {
        imageLoadedCounter--;
        if( imageLoadedCounter == 0 ){
          this.imagesLoadedTime = this.timer;
        }
      });
      this.storyPhotos[i].src = `assets/story/amandarine-story-${i+1}.jpg`;
    }
  }

  stopWaitingForButtonUp(){
    this.imagesLoadedTime -= this.timer;
    this.timer = 0;
    this.waitingForButtonUp = false;
  }

  handleEvent( e ){
    super.handleEvent( e );

    switch( e.type ){
      case OnDaRun.events.CONSOLEDOWN:{
        return true;
      }
      case OnDaRun.events.CONSOLEUP:
        // Make sure all control buttons are released.
        if( this.waitingForButtonUp ){
          if( !this.__donateOnce && e.detail.consoleButton.id === 'console-left'){
            this.__donateOnce = true;
            window.open( "https://www.redcross.or.th/donate/", '_blank');
            //FIXME should just force PAUSE
            //FIXME impelmenet pause() toggler
            this.titleAmandarineFrontierAudio = null;
          }
          this.stopWaitingForButtonUp();
        } else if( !this.waitingForAudioContext
            && ( !this.dualReleased
               || e.detail.consoleButton.id != "console-left"
                  && e.detail.consoleButton.id != "console-right")
            && !this.rightPressed
            && !this.leftPressed
            && this.imagesLoadedTime < this.timer
            && !this.endTime ){

              /*
          if( this.fastForwarding ){
            this.fastForwarding = false;
            return true;
          }
          */

          this.endTime = this.timer;

          ODR.sky.setShade( Sky.config.DAY, 3000 );
        }
        return true;
      default:
        return false;
    }
  }

/**
 * TitlePanel repaint.
 * @param {number} deltaTime - duration since last call.
 * @return {Panel} - a subsitute or null.
 */
  repaint( deltaTime ) {

    //====== The Thai Redcross Society Advertisement ======//
    if( this.waitingForAudioContext || this.waitingForButtonUp ){
      this.canvasCtx.drawImage( ...ODR.consoleImageArguments );

      let e = () => this.donationText.draw( this.canvasCtx, 300, 30, 0 );

      if( !this.waitingForAudioContext && this.timer > this.buttonBlockStopTime ){
        let alphaRestore = this.canvasCtx.globalAlpha;
          this.canvasCtx.globalAlpha = 1 - Math.min( 2000, this.timer- this.buttonBlockStopTime )/2000;
          e();
        this.canvasCtx.globalAlpha = alphaRestore;
        if( this.timer > this.buttonBlockStopTime + 2500 ) this.stopWaitingForButtonUp();
      } else {
        e();
      }
      return;
    }

    //====== Logo Display ======//
    let endingTimer = 0;
    let endingOffset = 0;
    let endingOpacity = 1;

    if( this.endTime && Sound.inst.effectsLoadingProgress == 1 ){
      endingTimer = this.timer - this.endTime;

      if ( endingTimer > 863) { // -endingOffset > ~200
        this.exit( ODR.start());
      }
      endingOffset = ( 40000- ( 0.8*endingTimer - 200 )**2 )/1000 ;
      endingOpacity = 1 - Math.min( endingTimer, 400 )/400;
    }

    let dataDownloaded = N7e.isSoundDisabled ? 100 : Sound.inst.musicLoadingProgress * 100;

    if( this.timer <= 800 ){
      this.blackoutOpacity = 1 - Math.min(1, this.timer / 800);
    } else {
      this.blackoutOpacity = 0;
      if( this.titleAmandarineFrontierAudio && !this.waitingForButtonUp ){
        this.titleAmandarineFrontierAudio.play( ODR.config.SOUND_SYSTEM_VOLUME/10 );
        /*
        for( let i = 0, j = 1.5 ; i <= 1 ; i+=0.5,j+=0.1){
          Sound.inst.effects.SOUND_SCORE.play( ( 1 - i )*ODR.config.SOUND_SYSTEM_VOLUME/10, j, -i );
          Sound.inst.effects.SOUND_SCORE.play( ( 1 - i )*ODR.config.SOUND_SYSTEM_VOLUME/10, j, i );
        }
        */
        this.titleAmandarineFrontierAudio = null;
      }
    }

    let storyTimer = 0;
    let fadingDuration = 2000;

    //Fast-forward the story
    if( this.dualPressed ){
      this.storyStartOffset -= 300;
    }

    // Find the opaqueness of the dark screen to fake no display.
    if( this.timer - this.imagesLoadedTime > this.storyStartOffset ){
      storyTimer = this.timer - this.imagesLoadedTime - this.storyStartOffset;
      this.blackoutOpacity = N7e.clamp( storyTimer/2000, 0, 1 )
        * N7e.clamp(( this.storyEndTime+ 2000- storyTimer )/2000, 0, 1)
        * endingOpacity;
    }

    if( this.blackoutOpacity != 1 ){
      let factorA = Math.sin( this.timer/400 );
      let factorB = Math.sin( this.timer/300 );
      let factorC = Math.sin( this.timer/200 );

      ODR.sky.forward( deltaTime, this.canvasCtx );

      // Falling tangerines on Thursday.
      if( !this.__dayOfWeek ){
        this.__dayOfWeek = new Date().getDay() + 1;
        if( this.__dayOfWeek == 5 ){
          Tangerine.dropRate = 5;
        }
      }
      if( this.__dayOfWeek == 5 ){
        let manyTangs = 40;
        if( !this.__tangList ){
          this.__tangList = [];
          for( let i = 0 ; i < manyTangs; i++ ){
            this.__tangList.push({
              x: N7e.randomInt( -15, 595 ),
              y: N7e.randomInt( -20, 195 ),
              d: N7e.randomInt( 10000, 11000 ),
              s: N7e.randomInt( 4, 9 )/10,
              r: (Math.random()*0.5+0.5) * (N7e.randomInt(0,1)?1:-1),
            });
          }
        }
        if( this.__tangList.length < manyTangs && !endingTimer ){
          for( let i = 0 ; i < 5; i++ ){
            this.__tangList.push({
              x: N7e.randomInt( -15, 595 ),
              y: N7e.randomInt( -20, -200 ),
              d: N7e.randomInt( 10000, 11000 ),
              s: N7e.randomInt( 4, 9 )/10,
              r: (Math.random()*0.5+0.5) * (N7e.randomInt(0,1)?1:-1),
            });
          }
        }
        let alphaRestore = this.canvasCtx.globalAlpha;
        this.canvasCtx.globalAlpha = endingOpacity;
        this.__tangList.forEach( t => {
          t.d += deltaTime * t.r;
          t.y += deltaTime / 5 * t.s;

          this.canvasCtx.drawImage(ODR.spriteGUI,
            ~~Math.floor(t.d/1000*8)%6 * 20, 20, 20, 20,
            ~~t.x, ~~t.y+endingOffset, 20, 20 );
        });
        this.canvasCtx.globalAlpha = alphaRestore;
        this.__tangList = this.__tangList.filter( t => t.y < 220 );
      }

      /* A AMANDARINE FRONTIER */
      this.canvasCtx.drawImage(ODR.spriteGUI,
        148,15,208,85,
        300-120 + 21,
        ~~(3 + endingOffset * 1.1),
        208,85);
      /* BB REDHAND */
      this.canvasCtx.drawImage(ODR.spriteGUI,
        125,100,37,30,
        300-120 + 41 + Math.round(factorB),
        ~~(80 + 6 * factorB + endingOffset * 1.2),
        37,30);
      /* B AMANDARINE */
      this.canvasCtx.drawImage(ODR.spriteGUI,
        368,115,162,133,
        300-120 + 37 + Math.round(factorA),
        ~~(20 + 3 * factorB + endingOffset * 1.35),
        162,133);
      /* C ONDARUN */
      this.canvasCtx.drawImage(ODR.spriteGUI,
        127,175,241,75,
        300-120 + 0,
        Math.round(100 + endingOffset * 1.38),
        241,75);
      /* D TANGERINE */
      this.canvasCtx.drawImage(ODR.spriteGUI,
        368,16,99,97,
        300-120 + 121 - Math.round(2 * factorA),
        ~~(30 + 2 * factorC + endingOffset * 1.4),
        99,97);
    }

    if( dataDownloaded >= 100 ){
      new Text().set( this.timer < 15000
          ?`Amandarine Frontier: On Da Run [Ver.${N7e.version}]`
          :`press a button to continue.`
        ).draw( this.canvasCtx, 300, Math.max( 180, 180 - endingOffset ), 0 );
    }

    //====== Story Scene ======//

    // Dark out the logo scene.
    if( this.blackoutOpacity !==0 ){
      let alphaRestore = this.canvasCtx.globalAlpha;
      this.canvasCtx.globalAlpha = this.blackoutOpacity;
      this.canvasCtx.drawImage( ...ODR.consoleImageArguments );
      this.canvasCtx.globalAlpha = alphaRestore;
    }

    if( dataDownloaded < 100 ){
      this.__dataDownloadedText = this.__dataDownloadedText || new Text();
      this.__dataDownloadedText.setString(`loading: ${dataDownloaded|0}%`).draw( this.canvasCtx, 300, 180, 0 );
    } else {

      // Prepare images for the story
      if( !this.storyPhotos.length ){
        this.loadImages();
      }

      // Begin the story mode.

      if( this.timer - this.imagesLoadedTime > this.storyStartOffset ){
        let alphaRestore = this.canvasCtx.globalAlpha;

        //Providing smooth-out during story mode.
        this.canvasCtx.globalAlpha = this.blackoutOpacity;
        this.photoTiming.forEach(([ beginTime, endTime, beginX, beginY, beginSize, endX, endY, endSize, textCenter ], index ) => {
          if( storyTimer > beginTime && storyTimer < endTime ){

            if( index == 4 ){
              Sound.inst.loadMusic('offline-intro-music', true );
            }

            beginTime = storyTimer - beginTime;
            endTime = endTime - storyTimer;

            let ratio = beginTime / (beginTime + endTime);
            let offsetX = beginX + (endX - beginX) * ratio;
            let offsetY = beginY + (endY - beginY) * ratio;
            let size = beginSize + (endSize - beginSize) * ratio;

            // Zooming image.
            this.canvasCtx.save(); {

              if( this.storyPhotos[ index ]){
                this.canvasCtx.scale( size, size );
                this.canvasCtx.translate( -offsetX, -offsetY );
                this.canvasCtx.globalAlpha = 0.70 * endingOpacity
                  * N7e.clamp( beginTime/fadingDuration, 0, 1 )
                  * N7e.clamp( endTime/fadingDuration, 0, 1 );
                this.canvasCtx.drawImage(this.storyPhotos[ index ], 0, 0);
              }

            } this.canvasCtx.restore();

            this.canvasCtx.globalAlpha = endingOpacity
                * N7e.clamp( beginTime/fadingDuration, 0, 1 )
                * N7e.clamp( endTime/fadingDuration, 0, 1 );

            //20 is the default glyph height.
            let y = ~~( 200- 20*beginTime /this.msPerLine );
            if( textCenter ){
              this.story[ index ].draw( this.canvasCtx, 300, y, 0);
            } else {
              this.story[ index ].draw( this.canvasCtx, 25, y);
            }
          }
        });
        this.canvasCtx.globalAlpha = alphaRestore;

        if( this.dualPressed && this.timer%600 > 300 && this.storyEndTime > storyTimer ){
          this.__fastForwardingText = this.__fastForwardingText || new Text().set`${'right'}${'right'}`;
          this.__fastForwardingText.draw( this.canvasCtx, 600, 185, 1, 10 );
        }
      }
    }
  }
}
