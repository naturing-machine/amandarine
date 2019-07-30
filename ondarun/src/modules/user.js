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

import { LitElement, html, css } from 'lit-element';

// User as singleton and UserProfile as the element

export class User {
  static get inst(){
    return this.instance || new this();
  }

  allTasksSettled(){
    // Trying to deal with late-inserted tasks. May be finding out the
    // whole nested Promised.all() from start would be a better idea.
    let flushTasks = function( resolve, activeTasks ){
      if( activeTasks.size ){
        Promise.all( activeTasks ).then(() => {
          flushTasks( resolve, activeTasks );
        });
      } else {
        resolve( this.data );
      }
    }.bind(this);

    return new Promise( resolve => {
      flushTasks( resolve, this.activeTasks );
    });
  }

  setTask( aPromise, desc ){
    this.activeTasks.add( aPromise );
    aPromise.then(() => {
      this.activeTasks.delete( aPromise );
    });
    return aPromise;
  }

  __setUser( u, resolve ){
    this.provider = {
      displayName: u.displayName,
      providerId: u.providerData[0].providerId,
    };
    switch( this.provider.providerId ){
      case 'twitter.com':
        this.provider.photoURL = u.providerData[0].photoURL.split('_normal').join('');
      break;
      default:
        this.provider.photoURL = u.photoURL;
    }
    if( this.uidRef && this.uidRef.key != u.uid ){
        this.uidRef.off();
        this.odrRef = null;
        console.warn('re-sign-in');
    }
    if( !this.uidRef || this.uidRef.key != u.uid ){
      this.uidRef = firebase.database().ref(`users/${u.uid}`);
      this.odrRef = this.uidRef.child('odr');

      // Migrate old value if needed before starting the listener.
      this.odrRef.transaction( odr => {
        if( odr && odr.scores ){
          odr.distances = odr.scores;
        }
        return odr;
      }).then(() => {
          this.uidRef.on('value', snapshot => {
            this.__setData( snapshot );
            resolve();
          });
      });

    }
  }

  getProfilePhoto(){
    if( !this.provider || !this.provider.photoURL ) return Promise.resolve( null );

    if( !this.provider.__getProfilePhotoPromise ){
       this.__getProfilePhotoPromise = new Promise( resolve => {
          let profileImg = new Image();
          profileImg.onload = () => {
            resolve( profileImg );
          };
          profileImg.src = this.provider.photoURL;
       });
    }
    return this.__getProfilePhotoPromise;
  }

  __setData( snapshot ){
    let data = snapshot.val();
    let nickname;
    if( data ){
      //console.log('USER DATA');
      this.data = data;
      nickname = data.nickname;

      if( data.odr ){
        let odr = data.odr;

        if( odr.distances ){
          for( let modeKey in odr.distances ){
            let clientHigh = this.odrLongestDistanceList[ modeKey ] || 0;
            if( clientHigh < odr.distances[ modeKey ]){
              this.odrLongestDistanceList[ modeKey ] = odr.distances[ modeKey ];
            }
          }
        }

        // Update server distances.
        this.setTask( this.odrRef.child('distances').transaction( distances => {
          distances = distances || {};
          for( let modeKey in this.odrLongestDistanceList ){
            distances[ modeKey ] = Math.max( this.odrLongestDistanceList[ modeKey ], distances[ modeKey ] || 0 );
          }
          return distances;
        }),'distances task');
      }
    }

    // Generate a random nickname.
    if( !nickname ){
      this.setTask( this.setNickname( User.randomNickname(), true ),'nickname task');
    }
  }

  static randomNickname(){
    function randomInt( min, max ){
      return min+ (Math.random()*( max- min+ 1 ))|0;
    }

    let nname = ["Add","Bat","Cat","Dad","Hat","Has","Jaz","Kat","Lad",
      "Mat","Mad","Mas","Nat","Pat","Rat","Ras","Sat","Saz","Sad","Tat",
      "Vat","Wad","Yas","Zat"];
    let hname = ["ber","cur","der","eer","fur","ger","her","hur","jer",
      "kur","kir","ler","mer","mur","ner","ser","tur","ver","wer","yer",
      "zur","bar","car","dar","ear","far","gal","har","hor","jul","kel",
      "ker","lur","mir","mor","nir","sur","tar","ter","val","war","xir","you","zir"];
    let rname = ["been","cine","dine","dean","deen","fine","gene","hine",
      "jene","kine","line","mean","nene","pine","rine","sene","tine","wine","zine"];

    return nname[ randomInt( 0, nname.length- 1 )]
      + hname[ randomInt( 0, hname.length- 1 )]
      + rname[ randomInt( 0, rname.length- 1 )];
  }

  constructor(){
    if( User.instance ){
      return User.instance;
    }
    User.instance = this;

    this.odrLongestDistanceList = {};

    // The zero-size of activeTasks means either all tasks are resolved
    // or no user at all.
    this.activeTasks = new Set();

    // Here trying to keep onAuthStateChanged() out side of
    // The promise to aviod unsubscribing loop.

    let pendingForDataResolve;
    function dataPending( resolve ){
      pendingForDataResolve = resolve;
    }

    function dataReady(){
      pendingForDataResolve = null;
    }

    this.setTask( new Promise( dataPending )).then( dataReady );

    this.__AUTH_UNSUBSCRIBE = firebase.auth().onAuthStateChanged( u => {
      if( u ){
        this.__setUser( u, pendingForDataResolve );

        // Transfering scores from older locations.
      } else {
        if( pendingForDataResolve ){
          pendingForDataResolve();
        }

        this.allTasksSettled().then(() => {
          this.reset();
          this.setTask( new Promise( dataPending )).then( dataReady );
        });
        // Renew to wait for another sign-in.
      }
    });

  }

  reset(){
    // Cancel all pending tasks.
    this.activeTasks.clear();
    if( this.uidRef ){
      this.uidRef.off();
      this.uidRef = null;
      this.odrRef = null;
      this.data = null;
      this.provider = null;
    }
  }

  signOut(){
    this.reset();
    firebase.auth().signOut();
  }

  signIn( providerName, redirect = false ){

    if( providerName ){
      let authProvider;
      firebase.auth().setPersistence( firebase.auth.Auth.Persistence.LOCAL ).then(() => {
        switch( providerName ){
          case "google.com":
            authProvider = new firebase.auth.GoogleAuthProvider();
            break;
          case "facebook.com":
            authProvider = new firebase.auth.FacebookAuthProvider();
            break;
          case "twitter.com":
            authProvider = new firebase.auth.TwitterAuthProvider();
            break;
        }

        if( redirect ){
          firebase.auth().signInWithRedirect( authProvider )
        } else {
          firebase.auth().signInWithPopup( authProvider );
        }

      }).catch(function(error) {
        var errorCode = error.code;
        var errorMessage = error.message;
        console.log("Error", error);
        /* TODO should have this in ODR
        ODR.panel.exit();
        ODR.soundEffects.SOUND_ERROR.play( ODR.config.SOUND_SYSTEM_VOLUME/10 );
        ODR.cc.append('Error Linking; details in the console.', 5000 );
        */
      });
    }

    return this.allTasksSettled();
  }

  get nickname(){
    if( this.data && this.data.nickname ){
      return this.data.nickname
    }
    return null;
  }

  /*
  set nickname( newNickname ){
    if( this.uidRef ){
      this.uidRef.child('nickname').set( newNickname );
    }
  }
  */

  odrRegisterDistance( modeKey, newHigh, enforce = false /* NYI */ ){
    let currentHigh = this.odrLongestDistanceList[ modeKey ] || 0;
    if( currentHigh < newHigh ){
      this.odrLongestDistanceList[ modeKey ] = newHigh;
      if( this.odrRef ){
        return this.odrRef.child('distances').child( modeKey ).transaction( modeScore => {
          modeScore = Math.max( modeScore || 0, newHigh );
          this.odrLongestDistanceList[ modeKey ] = modeScore;
          return modeScore;
        });
      }
    }
    return Promise.resolve( true );
  }

  setNickname( newNickname, auto = false ){
    if( this.uidRef ){
      return new Promise( resolve => {
        this.uidRef.child('nickname').once('value', snapshot => {
          let nickname = snapshot.val();
          if( !auto || !nickname ){
            this.uidRef.child('nickname').set( newNickname ).then(() => resolve());
          }
        });
      });

      /* Firebase broken on transactions of string with a tangerine to anything else.
      return this.uidRef.child('nickname').transaction( nickname => {
        if( !auto || !nickname ){
          nickname = newNickname;
          return newNickname;
        }
        return nickname;
      });
      */
    }
    return Promise.resolve( true );
  }

  set maxSpeed( newMaxSpeed ){
    this._maxSpeed = this._maxSpeed || { value: 0, time: 0 };
    newMaxSpeed = newMaxSpeed || this._maxSpeed;

    if( newMaxSpeed.value > this.maxSpeed.value
      || newMaxSpeed.time > this.maxSpeed.time
         && newMaxSpeed.value == this.maxSpeed.value ){

      this._maxSpeed = newMaxSpeed;
      if( this.odrRef ){
        this.odrRef.child('maxSpeed')
        .transaction(( maxSpeed ) => {
          maxSpeed = maxSpeed || newMaxSpeed;

          if( newMaxSpeed.value > maxSpeed.value ){
            maxSpeed = newMaxSpeed;
          } else if( maxSpeed.value == newMaxSpeed.value ){
            maxSpeed.time = Math.max( newMaxSpeed.time, maxSpeed.time ) || 0;
          }

          this._maxSpeed = maxSpeed;

          return maxSpeed;
        });
      }

    }
  }
  get maxSpeed(){
    if( this.data && this.data.odr && this.data.odr.maxSpeed ){
      let maxSpeed = this.data.odr.maxSpeed || { value: 0, time: 0 };
      return maxSpeed;
    }
    return this._maxSpeed;
  }


  set totalTangerines( newTotalTangerines ){
    console.error('Read Only!')
  }
  get totalTangerines(){
    if( this.data && this.data.items && this.data.items.tangerines ){
      return this.data.items.tangerines.count || 0;
    }
    return 0;
  }

  get dailyTangerines(){
    if( this.data && this.data.odr && this.data.odr.items && this.data.odr.items.tangerines ){
      return this.data.odr.items.tangerines.dayCount || 0;
    }
    return 0;
  }

  addTangerines( number ){
    if( this.uidRef ){
      return this.uidRef.child('items/tangerines/count').transaction( tangCount => {
        tangCount = tangCount || 0;
        tangCount+= number
        return tangCount;
      });
    }
    return Promise.resolve( true );
  }
}
