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

var IS_SOUND_DISABLED = N7e.isSoundDisabled;

/**
 * +---------+   +-------+
 * |  Sound  |--♦| Songs |
 * +---------+   +-------+
 *      |            |
 *      ♦            ♦
 * +---------+   +-------+
 * | Effects |--♦| Audio |
 * +---------+   +-------+
 */

class AudioController{
  constructor( startTime, sourceNode ){
    this.startTime = startTime;
    this.sourceNode = sourceNode;
  }

  start( startTime = this.startTime ){
    this.startTime = startTime;
    this.sourceNode.start( startTime );
  }

  stop( time ){
    this.sourceNode.stop( time );
  }

  drop( volumeTransitionDuration ){
    let actx = Sound.inst.audioContext;
    this.sourceNode.stop( actx.currentTime+ volumeTransitionDuration );
    if( this.gainNode )
      this.gainNode.gain.exponentialRampToValueAtTime( 0.00001, actx.currentTime+ volumeTransitionDuration );
  }

  setVolume( newVolume, volumeTransitionDuration = 0 ){
    if( this.gainNode )
      this.gainNode.gain.exponentialRampToValueAtTime( Math.max( 0.00001, newVolume ), Sound.inst.audioContext.currentTime+ volumeTransitionDuration );
  }
}
/**
 * Audio class act like a generator, each play() streams and returns
 * a collection of audio nodes that can be used to control the on-going audio.
 */
export class Audio {
  decoded(){
    if( this.soundBuffer ){
      return Promise.solve( this );
    }

    function audioPending( resolve ){
      this.__pendingForAudioDecoded = resolve;
    }
    return new Promise( audioPending.bind( this ));
  }

  constructor( soundBufferOrURL, title ){
    if( typeof soundBufferOrURL === 'string'){
      fetch( soundBufferOrURL )
      .then( function( response ){
        if( response.ok ){
          return response.arrayBuffer();
        }
        throw new Error('Network response was not ok.');
      })
      .then( buffer => Sound.inst.contextReady()
        .then( audioContext => audioContext
          .decodeAudioData( buffer, audioData => {
            this.soundBuffer = audioData;
            if( this.__pendingForAudioDecoded ){
              this.__pendingForAudioDecoded( this );
              this.__pendingForAudioDecoded = null;
            }
          })
        ) // has context
      );
    } else {
      this.soundBuffer = soundBufferOrURL;
    }
    this.title = title;
    this.controller = null;
  }

  play( volume, delay = 0, pan = null, loop = false, offset = 0 /*,duration*/ ){

    let actx = Sound.inst.audioContext;
    let star
    if( !actx ){
      return;
    }

    let duration = Math.ceil( this.soundBuffer.duration + delay);
    let dest = actx.destination;
    let sourceNode = actx.createBufferSource();
    let controller = new AudioController( actx.currentTime + delay, sourceNode );

    sourceNode.buffer = this.soundBuffer;

    // gain(dest) -> destiation
    if( volume !== undefined ){
      let gainNode = actx.createGain();
      controller.gainNode = gainNode;
      //gainNode.gain.value = volume;
      gainNode.gain.setValueAtTime( Math.max( volume, 0.000001 ), controller.startTime );
      gainNode.connect( dest );
      dest = gainNode;
    }

    // pan(dest) -> gain -> destiation
    if( pan !== null ){
      /*
      let pannerNode = actx.createStereoPanner();
      pannerNode.pan.value = pan;
      pannerNode.pan.setValueAtTime( Math.max( pan, 0.000001 ), controller.startTime );
      pannerNode.connect(dest);
      */

      let pannerNode = actx.createPanner();
      pannerNode.panningModel = 'equalpower';
      pannerNode.setPosition(pan, 0, 1 - Math.abs(pan));
      pannerNode.connect(dest);

      controller.pannerNode = pannerNode;
      dest = pannerNode;
    }

    // source -> pan -> gain -> destiation
    sourceNode.connect( dest );
    if( loop ){
      sourceNode.loop = loop;
    }

    sourceNode.start( controller.startTime, offset );

    return controller;
  }
}

/**
 * Song wraps an Audio and used to control the progression of the stream.
 */
class Song {
  constructor( name, lyrics, autoload = true, decode = true, audioReadyCallback ){
    this.name = name;
    this.lyrics = lyrics;
    this.audio = undefined;
    this.controller = null;
    this._audioReadyCallback = audioReadyCallback;

    // a temporary blob for storing raw downloaded data if the audio context is not yet created.
    this.source = null;

    this.delayStart = 0; // For resuming calculation.
    this.startTime = Infinity;
    this.trueStartTime = 0;
    this.loadingProgress = null;
    this._volume = ODR.config.SOUND_MUSIC_VOLUME/10;

    if( autoload ){
      this.load( decode );
    }
  }

  play( delay, volume ){
    if( this.controller ){
      console.warn(this, ' is already playing.');
      return;
    }

    this._volume = volume;
    this.delayStart = delay;
    this.startTime = Sound.inst.audioContext.currentTime;
    if( this.audio ){
      this.controller = this.audio.play( volume, delay );
    } else if( this.source ){
      this._decodeAudioData( this.source );
      this.source = null;
    } else if( this.loadingProgress !== null ){
      console.log(this.name,'Loading');
    } else {
      console.log('FIXME');
    }
  }

  stop( volumeTransitionDuration = 0 ){
    if( this.controller ){
      this.controller.drop( volumeTransitionDuration );
      this.controller = null;
    }
    this.stopOffset = Sound.inst.audioContext.currentTime- this.startTime+ volumeTransitionDuration;
    this.startTime = Infinity;
  }

  resume( volumeTransitionDuration = 0){
    // wasMuted NYI, will try to continue as if the song was never stopped.
    if( !this.stopOffset || this.controller || !this.audio ){
      console.warn(this, ' Something wrong.');
      this.play( 0, this._volume );
      return;
    }

    this.startTime = Sound.inst.audioContext.currentTime- this.stopOffset- this.delayStart;
    this.controller = this.audio.play( 0, 0, null, false, this.stopOffset );
    this.controller.setVolume( 0 );
    this.controller.setVolume( this._volume, volumeTransitionDuration );

  }

  set volume( newVolume ){
    this._volume = newVolume;
    if( this.controller ){
      this.controller.setVolume( newVolume, 1.5 );
    }
  }

  //TODO
  /*
  pause(){

  }
  resume(){

  }
  */

  get playing(){
    return this.startTime != Infinity ? true : false;
  }


/** Class Song
 * Decode and play the song if startTime has been set.
 * @param {ArrayBuffer} src - loaded from XMLHttpRequest.
 */
  _decodeAudioData( src ){
    if( this.audio === undefined ){

      Sound.inst.contextReady().then( actx => {

        actx.decodeAudioData( src, buffer => {
          //console.log(this.name+': Song was successfully decoded.');
          this.audio = new Audio( buffer, this.name );
          if( this._audioReadyCallback ){
            this._audioReadyCallback( this.audio );
          }
          if( Infinity != this.startTime ){
            //auto-adjust the given delay with the loading time.
            let adjustedDelay = this.delayStart + this.startTime - Sound.inst.audioContext.currentTime;
            this.audio.play( this._volume, Math.max( 0, adjustedDelay ));
          }

          /* For testing
          if( this.name == "offline-play-music" ){
            console.log(name,'loaded 3')
            let con = this.audio.play( 1 );
            con.gainNode.gain.exponentialRampToValueAtTime( 0.00001, actx.currentTime+10 );
          }
          */
        });

      });

    }
  }

  load( decode ){
    if( this.loadingProgress != null ){
      return;
    }

    // Not sure why I spent an evening rewriting the perfectly working XMLHttpRequest with a fetch.
    this.loadingProgress = 0;
    let source, dataReceived, total, reader;
    let processData = function({ done, value }){
        if( done ){
          this.loadingProgress = 1.0;

          // Content-Length mismatched.
          if( total > dataReceived ){
            source = source.slice( 0, dataReceived );
          }

          if( decode ){
            // This actually should be
            // source.buffer.slice(source.byteOffset, source.byteLength + source.byteOffset);
            // but skipped since it should be already set at the allocation.
            this._decodeAudioData( source.buffer );
          } else {
            // Without an audio context, just keep the blob for later decoding.
            this.source = source.buffer ;
          }
          return;
        }

        // Content-Length mismatched.
        if( value.length + dataReceived > total ){
          total = value.length + dataReceived;
          let newSource = new Uint8Array( total );
          newSource.set( source );
          source = newSource;
        }
        // Copy all read data into a source
        source.set( value, dataReceived );

        this.loadingProgress = value.length/total;
        dataReceived+= value.length;

        return reader.read().then( processData );
      }.bind( this );

    fetch(
      document.getElementById( ODR.config.RESOURCE_TEMPLATE_ID )
      .content.getElementById( this.name ).src
    ).then( response => {
      let headers = response.headers;
      // Warning! Content-Length could be very misleading.
      // Even exists, it can be INCORRECT
      // But it will be used for guiding the allocation.
      total = Number( response.headers.get('Content-Length') || 0 );
      reader = response.body.getReader();
      dataReceived = 0;
      source = new Uint8Array( total );
      reader.read().then( processData );
    });


    //console.log('Downloading the requested song...',this.name);
    // Start loading the song.
    // TODO, option to load on playing.
    /*
    let resourceTemplate = document.getElementById( ODR.config.RESOURCE_TEMPLATE_ID ).content;
    let request = new XMLHttpRequest();
    request.open('GET', resourceTemplate.getElementById( this.name ).src, true);
    request.responseType = 'arraybuffer';
    request.onload = () => {

      this.loadingProgress = 1;

      if( decode ){
        //console.log('Decoding requested data...', this.name );
        this._decodeAudioData( request.response );
      } else {
        // Without an audio context, just keep the blob for later decoding.
        this.source = request.response;
      }

    }
    request.onprogress = (e) => {
      this.loadingProgress = e.loaded/e.total;
    }
    request.send();
    */

  }

}

export class Sound {
  //Make sure not to call this before a gesture unlocking (eg. touchend)
  static get inst(){
    return this.instance || new this();
  }

  constructor( canvas ){
    if( Sound.instnce )
      return Sound.instance;
    Sound.instance = this;

    //console.log('Creating AudioContext');
    this.audioContext = new ( window.AudioContext || window.webkitAudioContext )();
    //console.log( 'AudioContext:',this.audioContext.state );

    this.musicVolume = 0.5;
    this.songs = {};
    this.currentSong = null;
  }

/** Class Sound
 * Wait until an event can resume the AudioContext state.
 * This must be called for the first time using the AudioContext.
 * @return {Promise} getting the AudioContext from the resolve.
 */
  contextReady(){
    if( this.__contextReady ) return this.__contextReady;
    return this.__contextReady = new Promise(( resolve, reject ) => {
      if( this.audioContext.state === 'suspended'){
        let resume = (e) => {

          if( this.audioContext.state === 'suspended' ){
            this.audioContext.resume().then(
              () => resolve( this.audioContext )
              , reason  => reject( reason ));
          } else {
            resolve( this.audioContext );
          }
        }

        [ OnDaRun.events.CONSOLEUP, OnDaRun.events.CONSOLEDOWN ].forEach( et => document.body.addEventListener( et, resume, { passive: true, once: true }));

      } else {
        resolve( this.audioContext );
      };
    });
  }

  updateLyricsIfNeeded( callback ){
    if( IS_SOUND_DISABLED ) return;
    if( this.currentSong
        && this.currentSong.lyrics
        && this.currentSong.lyrics.length
        && this.currentSong.controller ){
      let time = this.audioContext.currentTime- this.currentSong.controller.startTime;
      while( this.currentSong.lyrics.length && time >= this.currentSong.lyrics[0].info ){
        callback( this.currentSong.lyrics.shift());
      }
    }
  }

  set musicVolume( vol ) {
    this._musicVolume = vol;
    if( IS_SOUND_DISABLED ) return;
    if( this.currentSong ) {
      this.currentSong.volume = vol;
    }
  }

  get currentSong(){
    return this._currentSong;
  }

  set currentSong( song ){
    this.setCurrentSong( song );
  }

  setCurrentSong( song, delayStart ){
    if( this._currentSong ){
      this._currentSong.stop( 3 );
    }
    this._currentSong = song;
    if( song )
      song.play( delayStart, this._musicVolume );
  }

  get musicLoadingProgress(){
    return Object.entries( this.songs ).reduce(( acc, nameSong, index, array) => acc + (nameSong[1].loadingProgress || 0) /array.length, 0);
  }

  loadMusic( name, autoplay, delayStart = 0, lyrics = null ){
    if( IS_SOUND_DISABLED ) return;
    let song = this.songs[ name ] || ( this.songs[ name ] = new Song( name, lyrics, true ));
    song.lyrics = lyrics;

    if( this.currentSong == song ) return;

    /* Turn-off the others */
    if( autoplay ){
      this.setCurrentSong( song, delayStart );
    }

  }

  loadEffect( name ){
    if( IS_SOUND_DISABLED ) return;

    return new Promise(( resolve, reject ) => {

      new Song( name, null, true, true, audio => {
        resolve( audio );
      });

    });
  }

}
