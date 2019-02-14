/* .............................................. B_Y */
/* .... ####| . BBBB\ . BB| SSSSSSSS| DDDDDDDD| . 0|G */
/* ... ##/##| . BB|BB\  BB| SS| . SS/ DD| ....... R|R */
/* .. ##/ ##| . BB| BB\ BB| ..  SS/ . DDDDDDD| .. A|0 */
/* . #########| BB|  BB\BB| .. SS| .. DD| ....... N|0 */
/* ...... ##| . BB| . BBBB| .. SS| .. DDDDDDDD| . G|V */
/* .............................................. E|E */

// Copyright (c) 2014 The Chromium Authors. All rights reserved.
// Copyright (c) 2019 0range Gr00ve Sorority. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file AND if possible, in the Public Domain.

(function () {
    'use strict';
    /**
     * Amandarine runner.
     * @param {string} outerContainerId Outer containing element id.
     * @param {Object} opt_config
     * @constructor
     * @export
     */
    function N7e(outerContainerId, opt_config) {
      // Singleton
      if (N7e.instance_) {
        return N7e.instance_;
      }
      N7e.instance_ = this;

      this.outerContainerEl = document.querySelector(outerContainerId);
      this.containerEl = null;

      this.config = opt_config || N7e.config;

      this.dimensions = N7e.defaultDimensions;

      this.canvas = null;
      this.canvasCtx = null;

      this.amdr = null;

      this.distanceMeter = null;
      this.distanceRan = 0;

      this.highestScore = 0;

      this.time = 0;
      this.runningTime = 0;
      this.msPerFrame = 1000 / FPS;
      this.currentSpeed = 0;

      this.obstacles = [];

      this.actions = [];

      this.activated = false;
      this.playing = false; // Whether the game is currently in play state.
      this.crashed = false;
      this.paused = false;
      this.inverted = false;
      this.invertTimer = 0;
      this.resizeTimerId_ = null;

      this.playCount = 0;

      // Sound FX.
      this.audioBuffer = null;
      this.soundFx = {};

      // Global web audio context for playing sounds.
      this.audioContext = null;

      // Images.
      this.images = {};
      this.imagesLoaded = 0;

      this.loadImages();
      this.config.PLAY_MUSIC = true;
      this.loadMusic('offline-intro-music', this.config.PLAY_MUSIC);
      this.loadMusic('offline-play-music', false);
    }

    window['N7e'] = N7e;


    /**
     * Default game width.
     * @const
     */
    var DEFAULT_WIDTH = 600;

    /**
     * Frames per second.
     * @const
     */
    var FPS = 60;

    /** @const */
    var IS_HIDPI = window.devicePixelRatio > 1;
    IS_HIDPI = true; // Force HIDPI for now.

    /** @const */
    var IS_IOS = /iPad|iPhone|iPod/.test(window.navigator.platform);

    /** @const */
    var IS_MOBILE = /Android/.test(window.navigator.userAgent) || IS_IOS;

    /** @const */
    var IS_TOUCH_ENABLED = 'ontouchstart' in window;

    /**
     * Default game configuration.
     * @enum {number}
     */
    N7e.config = {
      ACCELERATION: 0.0005,
      BG_CLOUD_SPEED: 0.2,
      BOTTOM_PAD: 10,
      CLEAR_TIME: 3000,
      CLOUD_FREQUENCY: 0.5,
      CRASH_WIDTH: 32,
      CRASH_HEIGHT: 32,
      GAMEOVER_CLEAR_TIME: 750,
      GAP_COEFFICIENT: 0.6,
      INVERT_FADE_DURATION: 12000,
      INVERT_DISTANCE: 700,
      SKY_SHADING_DURATION: 2000,
      MAX_BLINK_COUNT: 30,
      MAX_CLOUDS: 6,
      MAX_OBSTACLE_LENGTH: 3,
      MAX_OBSTACLE_DUPLICATION: 2,
      MAX_ACTION_PRESS: 700,
      MIN_ACTION_PRESS: 200,
      MIN_ACTION_PRESS_FACTOR: 5, // For increasing minimum press when moving faster.
      MAX_SPEED: 13,
      MIN_JUMP_HEIGHT: 35,
      MOBILE_SPEED_COEFFICIENT: 1.2,
      RESOURCE_TEMPLATE_ID: 'audio-resources',
      SCALE_FACTOR: 210,
      SLIDE_FACTOR: 1,
      SPEED: 6,
      SHOW_COLLISION: false,
      SHOW_SEPIA: 0,
      SKY: {
        DAY: [Math.floor(221*0.8), Math.floor(238*0.8), Math.floor(255*0.9), 238, 238, 255],
        //NIGHT: [68,136,170,102,153,187],
        NIGHT: [68,136,170,84,183,187],
        START: [255,255,255,255,255,255],
        SUNSET: [69,67,125,255,164,119],
      }
    };

    function shapeSpeedDuration(speed, duration) {
      let minPress = N7e.config.MIN_ACTION_PRESS + N7e.config.MIN_ACTION_PRESS_FACTOR*speed;
      return duration * (N7e.config.MAX_ACTION_PRESS - minPress)/N7e.config.MAX_ACTION_PRESS + minPress;
    }

    /**
     * Default dimensions.
     * @enum {string}
     */
    N7e.defaultDimensions = {
      WIDTH: DEFAULT_WIDTH,
      HEIGHT: 200
    };


    /**
     * CSS class names.
     * @enum {string}
     */
    N7e.classes = {
      CANVAS: 'runner-canvas',
      CONTAINER: 'runner-container',
      CRASHED: 'crashed',
      ICON: 'icon-offline',
      INVERTED: 'inverted',
      SNACKBAR: 'snackbar',
      SNACKBAR_SHOW: 'snackbar-show',
      TOUCH_CONTROLLER: 'controller'
    };


    /**
     * Sprite definition layout of the spritesheet.
     * @enum {Object}
     */
    N7e.spriteDefinition = {
      /*
      LDPI: {
      CACTUS_LARGE: { x: 332, y: 2 },
      CACTUS_SMALL: { x: 228, y: 2 },
      CLOUD: { x: 86, y: 2 },
      HORIZON: { x: 2, y: 54 },
      MOON: { x: 484, y: 2 },
      RED_DUCK: { x: 134, y: 2 },
      RESTART: { x: 2, y: 2 },
      TEXT_SPRITE: { x: 655, y: 2 },
      NATHERINE: { x: 848, y: 2 },
      STAR: { x: 645, y: 2 }
    },*/
      HDPI: {
        BICYCLE: { x: 0, y: 0 },
        CACTUS_LARGE: { x: 472, y: 2 },
        CACTUS_SMALL: { x: 266, y: 2 },
        CLOUD: { x: 166, y: [2,30,70] },
        CRASH: { x: 800, y: 35},
        DUST: { x: 776, y: 2 },
        HORIZON: { x: 2, y: 104 },
        MOON: { x: 954, y: 2 },
        NATHERINE: { x: 0, y: 0 },
        RED_DUCK: { x: 1537, y: 4 },
        RESTART: { x: 2, y: 2 },
        TEXT_SPRITE: { x: 1294, y: 2 },
        STAR: { x: 1276, y: 2 }
      }
    };


    /**
     * Sound FX. Reference to the ID of the audio tag on interstitial page.
     * @enum {string}
     */
    N7e.sounds = {
      BUTTON_PRESS: 'offline-sound-press',
      SOUND_HIT: 'offline-sound-hit',
      SOUND_SCORE: 'offline-sound-reached',
      SOUND_SLIDE: 'offline-sound-slide',
      SOUND_DROP: 'offline-sound-drop',
      SOUND_JUMP: 'offline-sound-piskup',
      SOUND_CRASH: 'offline-sound-crash',
      SOUND_OGGG: 'offline-sound-oggg',
      SOUND_QUACK: 'offline-sound-quack',
      SOUND_BICYCLE: 'offline-sound-bicycle',
    };


    /**
     * Key code mapping.
     * @enum {Object}
     */
    N7e.keycodes = {
      JUMP: { '38': 1, '32': 1 },  // Up, spacebar
      SLIDE: { '39': 1, '40': 1 },  // Right, Down
      RESTART: { '13': 1 }  // Enter
    };


    /**
     * N7e event names.
     * @enum {string}
     */
    N7e.events = {
      ANIM_END: 'webkitAnimationEnd',
      CLICK: 'click',
      KEYDOWN: 'keydown',
      KEYUP: 'keyup',
      MOUSEDOWN: 'mousedown',
      MOUSEUP: 'mouseup',
      RESIZE: 'resize',
      TOUCHEND: 'touchend',
      TOUCHSTART: 'touchstart',
      VISIBILITY: 'visibilitychange',
      BLUR: 'blur',
      FOCUS: 'focus',
      LOAD: 'load'
    };


    N7e.prototype = {

        /**
         * Cache the appropriate image sprite from the page and get the sprite sheet
         * definition.
         */
        loadImages: function () {

          if (IS_HIDPI) {
            N7e.imageSprite = document.getElementById('offline-resources-2x');
            N7e.imageSpriteAmdrRunning = document.getElementById('offline-resources-nat-running');
            N7e.imageSpriteAmdrSliding = document.getElementById('offline-resources-nat-sliding');
            N7e.imageSpriteAmdrJumping = document.getElementById('offline-resources-nat-jumping');
            N7e.imageSpriteAmdrIdling = document.getElementById('offline-resources-nat-idling');
            N7e.imageSpriteBicycle = document.getElementById('offline-resources-bicycle');
            N7e.imageSpriteAmdrCrashed = document.getElementById('offline-resources-nat-crash');
            N7e.imageKeysIntroduction = document.getElementById('offline-resources-keys');
            this.spriteDef = N7e.spriteDefinition.HDPI;

            Obstacle.types[0].mag = 2;
            Obstacle.types[1].mag = 2;
            Obstacle.types[2].mag = 2;
            Obstacle.types[3].mag = 1;

            Obstacle.types[3].sprite = N7e.imageSpriteBicycle;
            AMDR.animFrames.WAITING.sprite = N7e.imageSpriteAmdrIdling;
            AMDR.animFrames.JUMPING.sprite = N7e.imageSpriteAmdrJumping;
            AMDR.animFrames.SLIDING.sprite = N7e.imageSpriteAmdrSliding;
            AMDR.animFrames.RUNNING.sprite = N7e.imageSpriteAmdrRunning;
            AMDR.animFrames.CRASHED.sprite = N7e.imageSpriteAmdrCrashed;


          } else {
            //NYI
            console.error("NYI: 1x isn't supported ATM.");
            /*
            N7e.imageSprite = document.getElementById('offline-resources-1x');
            this.spriteDef = N7e.spriteDefinition.LDPI;
            */
          }

          var loader = {
            spriteList: [ N7e.imageSprite, N7e.imageSpriteAmdrIdling, N7e.imageSpriteAmdrRunning, N7e.imageSpriteAmdrSliding, N7e.imageSpriteAmdrCrashed, N7e.imageSpriteBicycle, ],
            runner: this,
            load: function() {

              let sprite;

              while (sprite = this.spriteList.shift()) {
                if (!sprite.complete) {
                  sprite.addEventListener(N7e.events.LOAD, this.load.bind(this));
                  return;
                }
                console.debug("Sprites loaded.", sprite);
              }

              this.runner.init();
            }

          }


          loader.load();

        },

        loadMusic: function(name, autoplay) {
          if (!IS_IOS) {
            let n7e = N7e();

            if (!n7e.musics) {
              n7e.musics = {
                songs: {},
                stop: function() {
                  for (let name in this.songs) {
                    if (this.songs[name].audio) {
                      this.songs[name].autoplay = false;
                      this.songs[name].audio.fade();
                      this.songs[name].audio = null;
                    }
                  }
                },
              };
            }

            let song = n7e.musics.songs[name];
            if (!song) {
              song = n7e.musics.songs[name] = {}
            }

            if (autoplay) {
              for (let name in n7e.musics.songs) {
                n7e.musics.songs[name].autoplay = false;
              }
            }

            song.autoplay = autoplay;

            if (song.data) {

              if (!song.audio && song.autoplay) {
                n7e.musics.stop();
                song.audio = this.playSound(song.data, 0.3);
              }

            } else if (!song.hasOwnProperty('progress')) {
              song.progress = 0;
              var resourceTemplate = document.getElementById(this.config.RESOURCE_TEMPLATE_ID).content;
              let request = new XMLHttpRequest();
              request.open('GET', resourceTemplate.getElementById(name).src, true);
              request.responseType = 'arraybuffer';
              request.onload = () => {
                song.progress = 1;
                if (!this.audioContext) {
                  this.audioContext = new AudioContext();
                }
                this.audioContext.decodeAudioData(request.response, audioData => {
                  song.data = audioData;
                  this.loadMusic(name, song.autoplay);
                });
              }
              request.onprogress = (e) => {
                song.progress = e.loaded/e.total;
              }
              request.send();

            }

          }
        },

        /**
         * Load and decode base 64 encoded sounds.
         */
        loadSounds: function () {
          if (!IS_IOS) {
            if (!this.audioContext) {
              this.audioContext = new AudioContext();
            }

            var resourceTemplate =
            document.getElementById(this.config.RESOURCE_TEMPLATE_ID).content;

            for (var sound in N7e.sounds) {
              var soundSrc =
              resourceTemplate.getElementById(N7e.sounds[sound]).src;
              soundSrc = soundSrc.substr(soundSrc.indexOf(',') + 1);
              var buffer = decodeBase64ToArrayBuffer(soundSrc);

              // Async, so no guarantee of order in array.
              this.audioContext.decodeAudioData(buffer, function (index, audioData) {
                this.soundFx[index] = audioData;
              }.bind(this, sound));

            }
          }
        },

        /**
         * Sets the game speed. Adjust the speed accordingly if on a smaller screen.
         * @param {number} opt_speed
         */
        setSpeed: function (opt_speed) {
          var speed = opt_speed || this.currentSpeed;

          // Reduce the speed on smaller mobile screens.
          if (this.dimensions.WIDTH < DEFAULT_WIDTH) {
            var mobileSpeed = speed * this.dimensions.WIDTH / DEFAULT_WIDTH *
            this.config.MOBILE_SPEED_COEFFICIENT;
            this.currentSpeed = mobileSpeed > speed ? speed : mobileSpeed;
          } else if (opt_speed) {
            this.currentSpeed = opt_speed;
          }
        },


        /**
         * Adjust sky light.
         */
        adjustSkyGradient: function(ratio) {

          if (N7e.config.SHOW_SEPIA == 1) {
            ratio = Math.floor(ratio*10)/10;
          } else {
            ratio = Math.floor(ratio*20)/20;
          }

          if (ratio == 0) {
            this.gradients.current = this.gradients.sky1;
          } else if (ratio == 1) {
            this.gradients.sky1 = this.gradients.current = this.gradients.sky2;
          } else {
            this.gradients.current = [];
            for(let i = 0; i < 6; i++) {
              this.gradients.current.push(Math.floor(this.gradients.sky1[i] - ratio * (this.gradients.sky1[i] - this.gradients.sky2[i])));
            }
          }

          let rgb0x1 = ((1 << 24) + (this.gradients.current[0] << 16) + (this.gradients.current[1] << 8) + this.gradients.current[2]).toString(16).slice(1);
          let rgb0x2 = ((1 << 24) + (this.gradients.current[3] << 16) + (this.gradients.current[4] << 8) + this.gradients.current[5]).toString(16).slice(1);

          if (N7e.config.SHOW_SEPIA == 1) {
            this.skyGradient = "#" + rgb0x1;
          } else if (this.gradients.rgb0x1 != rgb0x1 || this.gradients.rgb0x2 != rgb0x2) {
            this.skyGradient = this.canvasCtx.createLinearGradient(0, 0, 0, this.dimensions.HEIGHT);
            this.skyGradient.addColorStop(0, "#" + rgb0x1);
            this.skyGradient.addColorStop(1, "#" + rgb0x2);
            this.gradients.rgb0x1 = rgb0x1;
            this.gradients.rgb0x2 = rgb0x2;
          }
        },

        /**
         * Game initialiser.
         */
        init: function () {
          // Hide the static icon.
          document.querySelector('.' + N7e.classes.ICON).style.visibility =
          'hidden';

          this.adjustDimensions();
          this.setSpeed();

          this.actionIndex = 0;
          this.defaultAction = {
            type: AMDR.status.WAITING,
            priority: 0,
          };
          this.queueAction({
            type: AMDR.status.RUNNING,
            priority: 0,
            speed: 1,
            xPos: -80,
            duration: 1400,
            title: true,
          });
          this.queueAction(this.defaultAction);


          this.containerEl = document.createElement('div');
          this.containerEl.className = N7e.classes.CONTAINER;

          // Player canvas container.
          this.canvas = createCanvas(this.containerEl, this.dimensions.WIDTH,
            this.dimensions.HEIGHT, N7e.classes.PLAYER);

            // This or we won't recieve
          this.canvas.addEventListener('touchend',this.onKeyUp.bind(this), false);

          this.canvasCtx = this.canvas.getContext('2d');

          this.canvasCtx.fillStyle = '#f7f7f7';
          this.canvasCtx.fill();
          N7e.updateCanvasScaling(this.canvas);
          this.gradients = {};

          /* Will switch to gradient on starting */
          this.gradients.sky2 = this.gradients.sky1 = N7e.config.SKY.START;
          this.adjustSkyGradient(1);

          // Horizon contains clouds, obstacles and the ground.
          this.horizon = new Horizon(this.canvas, this.spriteDef, this.dimensions,
            this.config.GAP_COEFFICIENT);

          // Distance meter
          this.distanceMeter = new DistanceMeter(this.canvas,
            this.spriteDef.TEXT_SPRITE, this.dimensions.WIDTH);

          // Draw Amandarine
          this.amdr = new AMDR(this.canvas, this.spriteDef.NATHERINE);

          this.outerContainerEl.appendChild(this.containerEl);

          if (IS_MOBILE) {
            this.createTouchController();
          }

          this.startListening();
          this.update();

          window.addEventListener(N7e.events.RESIZE,
            this.debounceResize.bind(this));
        },

        /**
         * Create the touch controller. A div that covers whole screen.
         */
        createTouchController: function () {
          this.touchController = document.createElement('div');
          this.touchController.className = N7e.classes.TOUCH_CONTROLLER;
          this.outerContainerEl.appendChild(this.touchController);
        },

        /**
         * Debounce the resize event.
         */
        debounceResize: function () {
          if (!this.resizeTimerId_) {
            this.resizeTimerId_ =
            setInterval(this.adjustDimensions.bind(this), 250);
          }
        },

        /**
         * Adjust game space dimensions on resize.
         */
        adjustDimensions: function () {
          clearInterval(this.resizeTimerId_);
          this.resizeTimerId_ = null;

          var boxStyles = window.getComputedStyle(this.outerContainerEl);
          var padding = Number(boxStyles.paddingLeft.substr(0,
            boxStyles.paddingLeft.length - 2));

          this.dimensions.WIDTH = this.outerContainerEl.offsetWidth - padding * 2;

          // Redraw the elements back onto the canvas.
          if (this.canvas) {
            this.canvas.width = this.dimensions.WIDTH;
            this.canvas.height = this.dimensions.HEIGHT;

            N7e.updateCanvasScaling(this.canvas);

            this.distanceMeter.calcXPos(this.dimensions.WIDTH);
            this.clearCanvas();
            this.horizon.update(0, this.currentSpeed, true);
            this.amdr.update(this.currentSpeed, 0);

            // Outer container and distance meter.
            if (this.playing || this.crashed || this.paused) {
              this.distanceMeter.update(0, Math.ceil(this.distanceRan));
              this.stop();
            } else {
              this.amdr.draw(0, 0);
            }

          }
        },

        /**
         * Play the game intro.
         * Canvas container width expands out to the full width.
         */
        playIntro: function () {
          if (!this.activated && !this.crashed) {
            this.playingIntro = true;
            this.amdr.playingIntro = true;

            // CSS animation definition.

            // if (this.touchController) {
            //     this.outerContainerEl.appendChild(this.touchController);
            // }
            this.playing = true;
            this.activated = true;

          } else if (this.crashed) {
            this.restart();
          }
        },

        /**
         * Update the game status to started.
         */
        startGame: function () {
          this.runningTime = 0;
          this.playingIntro = false;
          this.amdr.playingIntro = false;
          this.playCount++;

          // Handle tabbing off the page. Pause the current game.
          document.addEventListener(N7e.events.VISIBILITY,
            this.onVisibilityChange.bind(this));

          window.addEventListener(N7e.events.BLUR,
            this.onVisibilityChange.bind(this));

          window.addEventListener(N7e.events.FOCUS,
            this.onVisibilityChange.bind(this));
        },

        clearCanvas: function () {
          this.canvasCtx.fillStyle = this.skyGradient;
          this.canvasCtx.fillRect(0, 0, this.dimensions.WIDTH, this.dimensions.HEIGHT);
        },

        /**
         * Update the game frame and schedules the next one.
         */
        update: function () {
          // Filter ended action(s).
          this.updatePending = false;

          /*
          if (this.playing)
            this.amdr.assignAction({
              type: AMDR.status.RUNNING,
              priority: 0,
            }, this.currentSpeed);
            */

          var now = getTimeStamp();
          var deltaTime = now - (this.time || now);
          this.time = now;

          if (this.skyFadingStartTime) {
            let delta = now - this.skyFadingStartTime;
            if (delta > N7e.config.SKY_SHADING_DURATION) {
              delete this.skyFadingStartTime;
              this.adjustSkyGradient(1);
              //this.sepia = 0;
              this.canvasCtx.flter = '';
            } else {
              this.adjustSkyGradient(delta/N7e.config.SKY_SHADING_DURATION);
            }
          }


          if (this.playing) {
            this.clearCanvas();
            this.runningTime += deltaTime;
            var hasObstacles = this.runningTime > this.config.CLEAR_TIME;

            if (this.crashed && this.gameOverPanel) {
              this.gameOverPanel.updateDimensions(this.dimensions.WIDTH);
              this.gameOverPanel.draw();

              let alpha = (3000-this.actions[0].timer)/3000;
              if (alpha < 0) alpha = 0;
              this.horizon.update(deltaTime, this.currentSpeed, hasObstacles, this.inverted, alpha);

              if (alpha > 0.95) {
                let crashPoint = this.actions[0].crashPoint;
                this.canvasCtx.drawImage(N7e.imageSprite,
                    N7e.spriteDefinition.HDPI.CRASH.x,
                    N7e.spriteDefinition.HDPI.CRASH.y,
                    this.config.CRASH_WIDTH, this.config.CRASH_HEIGHT,
                    crashPoint.x - this.config.CRASH_WIDTH/2, crashPoint.y - this.config.CRASH_HEIGHT/2,
                    this.config.CRASH_WIDTH, this.config.CRASH_HEIGHT);
              }

              this.gameOverPanel.draw();
            } else {
              this.horizon.update(deltaTime, this.currentSpeed, hasObstacles, this.inverted, 1);
            }

            // Check for collisions.
            let obstacle;

            if (hasObstacles) {
              for (let i = 0; obstacle = this.horizon.obstacles[i]; i++) {
                obstacle.crash = checkForCollision(obstacle, this.amdr, N7e.config.SHOW_COLLISION && this.canvasCtx);
                if (obstacle.crash) {
                  break;
                }
              }
            }

            if (!obstacle) {
              if (!this.crashed) {
                this.distanceRan += this.currentSpeed * deltaTime / this.msPerFrame;
              }

              if (this.currentSpeed < this.config.MAX_SPEED) {
                this.currentSpeed += this.config.ACCELERATION;
              }
            } else if (!this.crashed) {

              this.queueAction({
                type: AMDR.status.CRASHED,
                priority: 3,
                crashPoint: obstacle.crash[0].intersection(obstacle.crash[1]).center(),
              }, this.currentSpeed);

              this.gameOver(obstacle);
            }

            var playAchievementSound;
             playAchievementSound = this.distanceMeter.update(deltaTime,
              Math.ceil(this.distanceRan));

            if (playAchievementSound) {
              this.playSound(this.soundFx.SOUND_SCORE,0.2);
            }

            if (this.invertTimer > this.config.INVERT_FADE_DURATION) {
              this.invertTimer = 0;
              this.invertTrigger = false;
              this.invert();
            } else if (this.invertTimer) {
              this.invertTimer += deltaTime;
            } else {
              var actualDistance = this.distanceMeter.getActualDistance(Math.ceil(this.distanceRan));

              if (actualDistance > 0) {
                this.invertTrigger = !(actualDistance % this.config.INVERT_DISTANCE);

                if (this.invertTrigger && this.invertTimer === 0) {
                  this.invertTimer += deltaTime;
                  this.invert();
                }
              }
            }
          } else if (!this.crashed) {
            this.clearCanvas();
            this.horizon.update(0, 6, true);

            this.showKeyDelta = !!this.showKeyDelta ? this.showKeyDelta : 1;
            this.showKeyDelta += deltaTime;
            if (this.showKeyDelta > 2000){
              let xMap = [2,1,-2,-4,-2,1], yMap = [1,0,-2,-2,-2,0];
              this.canvasCtx.drawImage(N7e.imageKeysIntroduction,
                0, 0, 75, 54,
                this.amdr.xPos + 25 + xMap[this.amdr.currentFrame],
                this.amdr.yPos + yMap[this.amdr.currentFrame] - 50, 75, 54);
            }
          }

          let a = this.actions[0];
          this.amdr.updateActionQueue(this.actions, now, deltaTime, this.currentSpeed);

          this.amdr.update(0, this.currentSpeed);
          this.scheduleNextUpdate();
        },

        /**
         * Event handler.
         */
        handleEvent: function (e) {
          return (function (evtType, events) {
            switch (evtType) {
              case events.KEYDOWN:
              case events.TOUCHSTART:
              case events.MOUSEDOWN:
                this.onKeyDown(e);
                break;
              case events.KEYUP:
              case events.TOUCHEND:
              case events.MOUSEUP:
                this.onKeyUp(e);
              break;
            }
          }.bind(this))(e.type, N7e.events);
        },

        /**
         * Bind relevant key / mouse / touch listeners.
         */
        startListening: function () {
          // Keys.
          document.addEventListener(N7e.events.KEYDOWN, this);
          document.addEventListener(N7e.events.KEYUP, this);

          if (IS_MOBILE) {
            // Mobile only touch devices.
            this.touchController.addEventListener(N7e.events.TOUCHSTART, this);
            this.touchController.addEventListener(N7e.events.TOUCHEND, this);
            this.containerEl.addEventListener(N7e.events.TOUCHSTART, this);
          } else {
            // Mouse.
            document.addEventListener(N7e.events.MOUSEDOWN, this);
            document.addEventListener(N7e.events.MOUSEUP, this);
          }
        },

        /**
         * Remove all listeners.
         */
        stopListening: function () {
          document.removeEventListener(N7e.events.KEYDOWN, this);
          document.removeEventListener(N7e.events.KEYUP, this);

          if (IS_MOBILE) {
            this.touchController.removeEventListener(N7e.events.TOUCHSTART, this);
            this.touchController.removeEventListener(N7e.events.TOUCHEND, this);
            this.containerEl.removeEventListener(N7e.events.TOUCHSTART, this);
          } else {
            document.removeEventListener(N7e.events.MOUSEDOWN, this);
            document.removeEventListener(N7e.events.MOUSEUP, this);
          }
        },


        // TODO forward amdr-related events to amdr
        /**
         * Process keydown.
         * @param {Event} e
         */
        onKeyDown: function (e) {

          // Reject repeating key events.
          if (e.repeat) {
            return;
          }

          // Prevent native page scrolling whilst tapping on mobile.
          if (IS_MOBILE && this.playing) {
            e.preventDefault();
          }

          if (this.crashed && e.type == N7e.events.TOUCHSTART && e.currentTarget == this.containerEl) {
            this.restart();
          }

          let inputType;
          if (e.type == N7e.events.TOUCHSTART) {
            let clientWidth = N7e().touchController.offsetWidth;
            for (let i = 0, touch; touch = e.changedTouches[i]; i++) {
              if (touch.clientX > clientWidth/2) {
                inputType = AMDR.status.JUMPING;
              } else {
                inputType = AMDR.status.SLIDING;
              }
              break;
            }
          } else if (N7e.keycodes.JUMP[e.keyCode]) {
            inputType = AMDR.status.JUMPING;
          } else if (N7e.keycodes.SLIDE[e.keyCode]) {
            inputType = AMDR.status.SLIDING;
          }

          if (this.actions.length && this.actions[0].title) {
            inputType = null;
          }

          if (!this.crashed) {

            let action;
            if (inputType == AMDR.status.JUMPING) {

              action = this.amdr.newAction(this.actions, AMDR.status.JUMPING);
              action.begin = action.begin || e.timeStamp;

              if (!this.playing) {
                let n7e = N7e();

                action.first = true;
                this.loadSounds();
                this.gradients.sky2 = N7e.config.SKY.DAY;
                this.skyFadingStartTime = getTimeStamp();
                this.update();
                n7e.musics.stop();
                this.play();
              }

            } else if (this.playing && inputType == AMDR.status.SLIDING) {
              e.preventDefault(); //Test if this is needed.

              action = this.amdr.newAction(this.actions, AMDR.status.SLIDING);
              action.begin = action.begin || e.timeStamp;
            }

            if (action && !action.index) {
              this.queueAction(action);
            }

          }

        },

        /**
         * Process key up.
         * @param {Event} e
         */
        onKeyUp: function (e) {

          let n7e = N7e();

          var keyCode = String(e.keyCode);

          let inputType;
          if (e.type == N7e.events.TOUCHEND) {
            let clientWidth = N7e().touchController.offsetWidth;
            for (let i = 0, touch; touch = e.changedTouches[i]; i++) {
              if (touch.clientX > clientWidth/2) {
                inputType = AMDR.status.JUMPING;
              } else {
                inputType = AMDR.status.SLIDING;
              }
              break;
            } //FIXME MOUSE
          } else if (N7e.keycodes.JUMP[keyCode] || e.type == N7e.events.MOUSEUP) {
            inputType = AMDR.status.JUMPING;
          } else if (N7e.keycodes.SLIDE[keyCode]) {
            inputType = AMDR.status.SLIDING;
          }

          if (this.actions.length && this.actions[0].title) {
            inputType = null;
          }


          if (keyCode == '67') {
            n7e.config.SHOW_COLLISION = !n7e.config.SHOW_COLLISION;
          }

          if (keyCode == '77') {
            if (n7e.config.PLAY_MUSIC) {
              n7e.musics.stop();
              n7e.config.PLAY_MUSIC = false;
            } else {
              n7e.config.PLAY_MUSIC = true;
              n7e.loadMusic('offline-play-music', n7e.config.PLAY_MUSIC);
            }
          }

          if (keyCode == '83' || (keyCode <= 57 && keyCode >= 48)) {
            if (keyCode <= 57 && keyCode >= 48) {
              n7e.config.SHOW_SEPIA = keyCode - 48;
            } else {
              n7e.config.SHOW_SEPIA = (n7e.config.SHOW_SEPIA+1)%10;
            }

            this.canvasCtx.restore();
            this.canvasCtx.save();
            switch (n7e.config.SHOW_SEPIA) {
              case 0: // Normal
                break;
              case 1: // Low
                break;
              case 2: // Grayscale
                this.canvasCtx.filter = 'grayscale(1)';
                break;
              case 9: // Extreme
                break;
              default:
                this.canvasCtx.filter = 'sepia(1) hue-rotate('+Math.floor((n7e.config.SHOW_SEPIA - 3) * 60)+'deg)';
                break;
            }

            this.adjustSkyGradient(1);
            this.clearCanvas();
            this.horizon.horizonLine.draw();
            this.amdr.update(0, this.currentSpeed);
          }

          if (!this.crashed && this.isRunning() && inputType == AMDR.status.JUMPING) {
            this.playing = true;

            for (let i = 0, action; action = this.actions[i]; i++) {
              if (action.type == inputType && action.priority == 0) {
                action.end = e.timeStamp;
                action.pressDuration = action.end - action.begin;
                if (action.pressDuration > n7e.config.MAX_ACTION_PRESS) action.pressDuration = n7e.config.MAX_ACTION_PRESS;
                action.priority = 1;
                break;
              }
            }

          } else if (N7e.keycodes.SLIDE[keyCode] || inputType == AMDR.status.SLIDING) {
            for (let i = 0, action; action = this.actions[i]; i++) {
              if (action.type == inputType && action.priority == 0) {
                action.end = e.timeStamp;
                action.pressDuration = action.end - action.begin;
                if (action.pressDuration > n7e.config.MAX_ACTION_PRESS) action.pressDuration = n7e.config.MAX_ACTION_PRESS;
                action.priority = 1;
                break;
              }
            }
            //this.amdr.setDuck(false);
          } else if (this.crashed) {
            // Check that enough time has elapsed before allowing jump key to restart.
            var deltaTime = getTimeStamp() - this.crashedTime;

            if (N7e.keycodes.RESTART[keyCode] || this.isLeftClickOnCanvas(e) ||
            (deltaTime >= this.config.GAMEOVER_CLEAR_TIME &&
              inputType == AMDR.status.JUMPING)) {
                this.stop();
                this.restart();
              }
          } else if (this.paused && inputType == AMDR.status.JUMPING) {
            // Reset the jump state
            this.amdr.reset();
            this.play();
          }
        },

        queueAction: function (action) {
          this.actionIndex++;
          action.index = this.actionIndex;
          this.actions.push(action);
        },

        /**
         * Returns whether the event was a left click on canvas.
         * On Windows right click is registered as a click.
         * @param {Event} e
         * @return {boolean}
         */
        isLeftClickOnCanvas: function (e) {
          return e.button != null && e.button < 2 &&
            e.type == N7e.events.MOUSEUP && e.target == this.canvas;
        },

        /**
         * RequestAnimationFrame wrapper.
         */
        scheduleNextUpdate: function () {
          if (!this.updatePending) {
            this.updatePending = true;
            this.raqId = requestAnimationFrame(this.update.bind(this));
          }
        },

        /**
         * Whether the game is running.
         * @return {boolean}
         */
        isRunning: function () {
          return !!this.raqId;
        },

        /**
         * Game over state.
         * @param {Obstacle} obstacle
         */
        gameOver: function (obstacle) {
          //let crashPoint = obstacle.crash[0].intersection(obstacle.crash[1]).center();
          switch(obstacle.typeConfig.type) {
            case "RED_DUCK":
              this.playSound(this.soundFx.SOUND_QUACK, 0.2, false, 0.2);
              break;
            case  "BICYCLE":
              this.playSound(this.soundFx.SOUND_CRASH, 0.5);
              break;
            default:
              this.playSound(this.soundFx.SOUND_HIT, 1.0, false, 0.2);
          }
          vibrate(200);

          if (!N7e().config.SHOW_COLLISION) {
            /*
            this.canvasCtx.filter = 'sepia(1)';
            this.sepia = 1.0;
            */
            this.clearCanvas();
            this.horizon.update(0, 0, true);
          }

          //this.stop();
          this.crashed = true;
          this.distanceMeter.acheivement = false;

          /*
          this.canvasCtx.drawImage(N7e.imageSprite,
              N7e.spriteDefinition.HDPI.CRASH.x,
              N7e.spriteDefinition.HDPI.CRASH.y,
              this.config.CRASH_WIDTH, this.config.CRASH_HEIGHT,
              crashPoint.x - this.config.CRASH_WIDTH/2, crashPoint.y - this.config.CRASH_HEIGHT/2,
              this.config.CRASH_WIDTH, this.config.CRASH_HEIGHT);
              */

          this.amdr.update(100, this.currentSpeed, AMDR.status.CRASHED);

          if (!this.gameOverPanel) {
            this.gameOverPanel = new GameOverPanel(this.canvas,
              this.spriteDef.TEXT_SPRITE, this.spriteDef.RESTART,
              this.dimensions);
          }

          this.gameOverPanel.draw();


          // Update the high score.
          if (this.distanceRan > this.highestScore) {
              this.highestScore = Math.ceil(this.distanceRan);
              this.distanceMeter.setHighScore(this.highestScore);
          }

          // Reset the time clock.
          this.time = getTimeStamp();
          this.crashedTime = this.time;
        },

        stop: function () {
          this.playing = false;
          this.paused = true;
          cancelAnimationFrame(this.raqId);
          this.raqId = 0;
        },

        play: function () {
          if (!this.crashed) {
            this.playing = true;
            this.paused = false;
            this.time = getTimeStamp();
            this.update();
          }
        },

        restart: function () {
          if (!this.raqId) {
            this.actions = [];
            this.playCount++;
            this.runningTime = 0;
            this.playing = true;
            this.crashed = false;
            this.distanceRan = 0;
            this.setSpeed(this.config.SPEED);
            this.time = getTimeStamp();
            this.clearCanvas();
            this.distanceMeter.reset(this.highestScore);
            this.horizon.reset();
            this.amdr.reset();
            this.playSound(this.soundFx.SOUND_SCORE,0.2);
            this.invert(true);
            this.update();
          }
        },

        /**
         * Pause the game if the tab is not in focus.
         */
        onVisibilityChange: function (e) {
          if (document.hidden || document.webkitHidden || e.type == 'blur' || document.visibilityState != 'visible') {
            this.stop();
          } else if (!this.crashed) {
            this.amdr.reset();
            this.play();
          }
        },

        /**
         * Play a sound.
         * @param {SoundBuffer} soundBuffer
         * @param {number} volume
         * @param {boolean} loop
         * @param {number} delay
         */

        playSound: function (soundBuffer, volume, loop, delay, pan) {
          if (soundBuffer) {

            delay = delay || 0;
            let duration = Math.ceil(soundBuffer.duration + delay);
            let dest = this.audioContext.destination;
            var sourceNode;

            // FIXME Better reallocate on-load via configurations.
            /*
            if (delay) {
              let newBuffer = this.audioContext.createBuffer(2, soundBuffer.sampleRate * 2 * duration, soundBuffer.sampleRate);
              newBuffer.copyToChannel(soundBuffer.getChannelData(0), 0);
              newBuffer.copyToChannel(soundBuffer.getChannelData(soundBuffer.numberOfChannels == 2? 1:0), 1);
              soundBuffer = newBuffer;
            }
            */

            sourceNode = this.audioContext.createBufferSource();
            sourceNode.buffer = soundBuffer;
            let vnode, pnode;

            if (volume) {
              vnode = this.audioContext.createGain();
              vnode.gain.value = volume;
              vnode.connect(dest);
              dest = vnode;
            }

            if (pan) {
              pnode = this.audioContext.createStereoPanner();
              pnode.pan.value = pan;
              pnode.connect(dest);
              dest = pnode;
            }

            /*
            if (delay) {
              let dnode = this.audioContext.createDelay(duration);
              dnode.delayTime.value = delay;
              dnode.connect(dest);
              dest = dnode;
            }
            */

            sourceNode.connect(dest);

            if (loop) sourceNode.loop = true;

            sourceNode.start(this.audioContext.currentTime + delay);
            return {
              node: sourceNode,
              _gain: vnode,
              _pan: pnode,
              stop: function() {
                this.node.stop();
              },
              fadeCount: 10,
              fade: function() {
                if (this._gain.gain.value > 0) {
                  this._gain.gain.value -= 0.02;
                  if (this._gain.gain.value < 0) {
                    this.node.stop();
                    return;
                  }

                  setTimeout(() => { this.fade(); }, 50);
                  }

              },
            };
          }
        },

        /**
         * Inverts the current page / canvas colors.
         * @param {boolean} Whether to reset colors.
         */
        invert: function (reset) {
          if (reset) {
            document.body.classList.toggle(N7e.classes.INVERTED, false);
            this.invertTimer = 0;
            this.inverted = false;
          } else {
            this.inverted = document.body.classList.toggle(N7e.classes.INVERTED,
              this.invertTrigger);
            }

            //FIXME setting sky2 should actually set sky1 to current ratio.
            // setSky()
            this.setSky(this.inverted ? N7e().config.SKY.NIGHT : N7e().config.SKY.DAY);
        },


        setSky: function (gr) {
          let v1,v2;

          v1 = parseInt(this.gradients.rgb0x1, 16);
          v2 = parseInt(this.gradients.rgb0x2, 16);

          this.gradients.sky1 = [
            (v1 >> 16) & 0xFF,
            (v1 >> 8) & 0xFF,
            v1 & 0xFF,
            (v2 >> 16) & 0xFF,
            (v2 >> 8) & 0xFF,
            v2 & 0xFF
          ];
          this.gradients.sky2 = gr;

          this.skyFadingStartTime = getTimeStamp();
        }
    };


    /**
     * Updates the canvas size taking into
     * account the backing store pixel ratio and
     * the device pixel ratio.
     *
     * See article by Paul Lewis:
     * http://www.html5rocks.com/en/tutorials/canvas/hidpi/
     *
     * @param {HTMLCanvasElement} canvas
     * @param {number} opt_width
     * @param {number} opt_height
     * @return {boolean} Whether the canvas was scaled.
     */
    N7e.updateCanvasScaling = function (canvas, opt_width, opt_height) {
      var context = canvas.getContext('2d');

      // Query the various pixel ratios
      var devicePixelRatio = Math.floor(window.devicePixelRatio) || 1;
      var backingStoreRatio = Math.floor(context.webkitBackingStorePixelRatio) || 1;
      var ratio = devicePixelRatio / backingStoreRatio;

      // Upscale the canvas if the two ratios don't match
      if (devicePixelRatio !== backingStoreRatio) {
        var oldWidth = opt_width || canvas.width;
        var oldHeight = opt_height || canvas.height;

        canvas.width = oldWidth * ratio;
        canvas.height = oldHeight * ratio;

        canvas.style.width = oldWidth + 'px';
        canvas.style.height = oldHeight + 'px';

        // Scale the context to counter the fact that we've manually scaled
        // our canvas element.
        context.scale(ratio, ratio);
        return true;
      } else if (devicePixelRatio == 1) {
        // Reset the canvas width / height. Fixes scaling bug when the page is
        // zoomed and the devicePixelRatio changes accordingly.
        canvas.style.width = canvas.width + 'px';
        canvas.style.height = canvas.height + 'px';
      }
      return false;
    };


    /**
     * Get random number.
     * @param {number} min
     * @param {number} max
     * @param {number}
     */
    function getRandomNum(min, max) {
      return Math.floor(Math.random() * (max - min + 1)) + min;
    }


    /**
     * Vibrate on mobile devices.
     * @param {number} duration Duration of the vibration in milliseconds.
     */
    function vibrate(duration) {
      if (IS_MOBILE && window.navigator.vibrate) {
        window.navigator.vibrate(duration);
      }
    }


    /**
     * Create canvas element.
     * @param {HTMLElement} container Element to append canvas to.
     * @param {number} width
     * @param {number} height
     * @param {string} opt_classname
     * @return {HTMLCanvasElement}
     */
    function createCanvas(container, width, height, opt_classname) {
      var canvas = document.createElement('canvas');
      canvas.className = opt_classname ? N7e.classes.CANVAS + ' ' + opt_classname : N7e.classes.CANVAS;
      canvas.width = width;
      canvas.height = height;
      container.appendChild(canvas);

      return canvas;
    }


    /**
     * Decodes the base 64 audio to ArrayBuffer used by Web Audio.
     * @param {string} base64String
     */
    function decodeBase64ToArrayBuffer(base64String) {
      var len = (base64String.length / 4) * 3;
      var str = atob(base64String);
      var arrayBuffer = new ArrayBuffer(len);
      var bytes = new Uint8Array(arrayBuffer);

      for (var i = 0; i < len; i++) {
        bytes[i] = str.charCodeAt(i);
      }
      return bytes.buffer;
    }


    /**
     * Return the current timestamp.
     * @return {number}
     */
    function getTimeStamp() {
      return IS_IOS ? new Date().getTime() : performance.now();
    }


    //******************************************************************************


    /**
     * Game over panel.
     * @param {!HTMLCanvasElement} canvas
     * @param {Object} textImgPos
     * @param {Object} restartImgPos
     * @param {!Object} dimensions Canvas dimensions.
     * @constructor
     */
    function GameOverPanel(canvas, textImgPos, restartImgPos, dimensions) {
      this.canvas = canvas;
      this.canvasCtx = canvas.getContext('2d');
      this.canvasDimensions = dimensions;
      this.textImgPos = textImgPos;
      this.restartImgPos = restartImgPos;
      this.draw();
    };


    /**
     * Dimensions used in the panel.
     * @enum {number}
     */
    GameOverPanel.dimensions = {
      TEXT_X: 0,
      TEXT_Y: 13,
      TEXT_WIDTH: 90,
      TEXT_HEIGHT: 31,
      RESTART_WIDTH: 38,
      RESTART_HEIGHT: 34
    };


    GameOverPanel.prototype = {
        /**
         * Update the panel dimensions.
         * @param {number} width New canvas width.
         * @param {number} opt_height Optional new canvas height.
         */
        updateDimensions: function (width, opt_height) {
          this.canvasDimensions.WIDTH = width;
          if (opt_height) {
            this.canvasDimensions.HEIGHT = opt_height;
          }
        },

        /**
         * Draw the panel.
         */
        draw: function () {
          var dimensions = GameOverPanel.dimensions;

          var centerX = this.canvasDimensions.WIDTH / 2;

          // Game over text.
          var textSourceX = dimensions.TEXT_X;
          var textSourceY = dimensions.TEXT_Y;
          var textSourceWidth = dimensions.TEXT_WIDTH;
          var textSourceHeight = dimensions.TEXT_HEIGHT;

          var textTargetX = Math.round(centerX - (dimensions.TEXT_WIDTH / 2));
          var textTargetY = Math.round((this.canvasDimensions.HEIGHT - 25) / 3);
          var textTargetWidth = dimensions.TEXT_WIDTH;
          var textTargetHeight = dimensions.TEXT_HEIGHT;

          var restartSourceWidth = dimensions.RESTART_WIDTH;
          var restartSourceHeight = dimensions.RESTART_HEIGHT;
          var restartTargetX = centerX - (dimensions.RESTART_WIDTH / 2);
          var restartTargetY = this.canvasDimensions.HEIGHT / 2;

          if (IS_HIDPI) {
            textSourceY *= 2;
            textSourceX *= 2;
            textSourceWidth *= 2;
            textSourceHeight *= 2;
            /* Since we switched to use a smaller version of the button.
            restartSourceWidth *= 2;
            restartSourceHeight *= 2;
            */
          }

          textSourceX += this.textImgPos.x;
          textSourceY += this.textImgPos.y;

          // Game over text from sprite.
          this.canvasCtx.drawImage(N7e.imageSprite,
              textSourceX, textSourceY, textSourceWidth, textSourceHeight,
              textTargetX, textTargetY, textTargetWidth, textTargetHeight);

          // Restart button.
          this.canvasCtx.drawImage(N7e.imageSprite,
              this.restartImgPos.x, this.restartImgPos.y,
              restartSourceWidth, restartSourceHeight,
              restartTargetX, restartTargetY, dimensions.RESTART_WIDTH,
              dimensions.RESTART_HEIGHT);
        }
    };


    //******************************************************************************

    /**
     * Check for a collision.
     * @param {!Obstacle} obstacle
     * @param {!AMDR} amdr Amandarine object.
     * @param {HTMLCanvasContext} opt_canvasCtx Optional canvas context for drawing
     *    collision boxes.
     * @return {Array<CollisionBox>}
     */
    function checkForCollision(obstacle, amdr, opt_canvasCtx) {
      var obstacleBoxXPos = N7e.defaultDimensions.WIDTH + obstacle.xPos;

      // Adjustments are made to the bounding box as there is a 1 pixel white
      // border around Amandarine and obstacles.
      var amdrBox = new CollisionBox(
        amdr.xPos + 1,
        amdr.yPos + 1,
        amdr.config.WIDTH - 2,
        amdr.config.HEIGHT - 2);

      var obstacleBox = new CollisionBox(
        obstacle.xPos + 1,
        obstacle.yPos + 1,
        obstacle.typeConfig.width * obstacle.size - 2,
        obstacle.typeConfig.height - 2);

      // Debug outer box
      if (opt_canvasCtx) {
        drawCollisionBoxes(opt_canvasCtx, amdrBox, obstacleBox);
      }

      // Simple outer bounds check.
      if (amdrBox.intersects(obstacleBox)) {
        var collisionBoxes = obstacle.collisionBoxes;
        var amdrCollisionBoxes = amdr.getCollisionBoxes();

        // Detailed axis aligned box check.
        for (var t = 0; t < amdrCollisionBoxes.length; t++) {
          for (var i = 0; i < collisionBoxes.length; i++) {
            // Adjust the box to actual positions.
            var adjAmdrBox =
              createAdjustedCollisionBox(amdrCollisionBoxes[t], amdrBox);
            var adjObstacleBox =
              createAdjustedCollisionBox(collisionBoxes[i], obstacleBox);
            var crashed = adjAmdrBox.intersects(adjObstacleBox);

            // Draw boxes for debug.
            if (opt_canvasCtx) {
              drawCollisionBoxes(opt_canvasCtx, adjAmdrBox, adjObstacleBox);
            }

            if (crashed) {
              return [adjAmdrBox, adjObstacleBox];
            }
          }
        }
      }
      return false;
    };


    /**
     * Adjust the collision box.
     * @param {!CollisionBox} box The original box.
     * @param {!CollisionBox} adjustment Adjustment box.
     * @return {CollisionBox} The adjusted collision box object.
     */
    function createAdjustedCollisionBox(box, adjustment) {
      return new CollisionBox(
        box.x + adjustment.x,
        box.y + adjustment.y,
        box.width,
        box.height);
    };


    /**
     * Draw the collision boxes for debug.
     */
    function drawCollisionBoxes(canvasCtx, amdrBox, obstacleBox) {
      canvasCtx.save();
      canvasCtx.strokeStyle = '#f00';
      canvasCtx.strokeRect(amdrBox.x, amdrBox.y, amdrBox.width, amdrBox.height);

      canvasCtx.strokeStyle = '#0f0';
      canvasCtx.strokeRect(obstacleBox.x, obstacleBox.y,
        obstacleBox.width, obstacleBox.height);
      canvasCtx.restore();
    };


    /**
     * Compare two collision boxes for a collision.
     * @param {CollisionBox} amdrBox
     * @param {CollisionBox} obstacleBox
     * @return {boolean} Whether the boxes intersected.
     */
     /*
    function boxCompare(aRect, bRect) {

      var crashed = false;
      var amdrBoxX = amdrBox.x;
      var amdrBoxY = amdrBox.y;

      var obstacleBoxX = obstacleBox.x;
      var obstacleBoxY = obstacleBox.y;

      // Axis-Aligned Bounding Box method.
      if (amdrBox.x < obstacleBoxX + obstacleBox.width &&
        amdrBox.x + amdrBox.width > obstacleBoxX &&
        amdrBox.y < obstacleBox.y + obstacleBox.height &&
        amdrBox.height + amdrBox.y > obstacleBox.y) {
          crashed = true;
        }

        return crashed;
    };


    function boxIntersection(aBox, bBox) {

      let box = {x:0, y:0, width:0, height:0};

      if (aBox.x <= bBox.x) {
        box.x = bBox.x;
      } else {
        box.x = aBox.x;
      }

      if (aBox.y <= bBox.y) {
        box.y = bBox.y;
      } else {
        box.y = aBox.y;
      }

      if (aBox.x + aBox.width >= bBox.x + bBox.width) {
        box.width = bBox.x + bBox.width - box.x;
      } else {
        box.width = aBox.x + aBox.width - box.x;
      }

      if (aBox.y + aBox.height >= bBox.y + bBox.height) {
        box.height = bBox.y + bBox.height - box.y;
      } else {
        box.height = aBox.y + aBox.height - box.y;
      }

      return box;
    }*/


    //******************************************************************************

    /**
     * Collision box object.
     * @param {number} x X position.
     * @param {number} y Y Position.
     * @param {number} w Width.
     * @param {number} h Height.
     */
    function CollisionBox(x, y, w, h) {
      this.x = x;
      this.y = y;
      this.width = w;
      this.height = h;
    };

        CollisionBox.prototype = {
            maxX: function () {
              return this.x + this.width;
            },

            maxY: function () {
              return this.y + this.height;
            },

            center: function () {
              return {x: this.x + this.width/2, y: this.y + this.height/2};
            },

            intersects: function (aBox) {
              return (this.maxX() <= aBox.x || aBox.maxX() <= this.x ||
                this.maxY() <= aBox.y || aBox.maxY() <= this.y)
                ? false
                : true;
            },

            intersection: function (aBox) {

              let ret = new CollisionBox(0, 0, 0, 0);

              if (aBox.x <= this.x) {
                ret.x = this.x;
              } else {
                ret.x = aBox.x;
              }

              if (aBox.y <= this.y) {
                ret.y = this.y;
              } else {
                ret.y = aBox.y;
              }

              if (aBox.x + aBox.width >= this.x + this.width) {
                ret.width = this.x + this.width - ret.x;
              } else {
                ret.width = aBox.x + aBox.width - ret.x;
              }

              if (aBox.y + aBox.height >= this.y + this.height) {
                ret.height = this.y + this.height - ret.y;
              } else {
                ret.height = aBox.y + aBox.height - ret.y;
              }

              return ret;
            },
        }


    //******************************************************************************

    /**
     * Obstacle.
     * @param {HTMLCanvasCtx} canvasCtx
     * @param {Obstacle.type} type
     * @param {Object} spritePos Obstacle position in sprite.
     * @param {Object} dimensions
     * @param {number} gapCoefficient Mutipler in determining the gap.
     * @param {number} speed
     * @param {number} opt_xOffset
     */
    function Obstacle(canvasCtx, type, spriteImgPos, dimensions,
        gapCoefficient, speed, opt_xOffset) {

      this.canvasCtx = canvasCtx;
      this.spritePos = spriteImgPos;
      this.typeConfig = type;
      this.gapCoefficient = gapCoefficient;
      this.size = getRandomNum(1, Obstacle.MAX_OBSTACLE_LENGTH);
      this.dimensions = dimensions;
      this.remove = false;
      this.xPos = dimensions.WIDTH + (opt_xOffset || 0);
      this.yPos = 0;
      this.width = 0;
      this.collisionBoxes = [];
      this.gap = 0;
      this.speedOffset = 0;

      // For animated obstacles.
      this.currentFrame = 0;
      this.timer = 0;

      this.init(speed);
    };

    /**
     * Coefficient for calculating the maximum gap.
     * @const
     */
    Obstacle.MAX_GAP_COEFFICIENT = 1.5;

    /**
     * Maximum obstacle grouping count.
     * @const
     */
    Obstacle.MAX_OBSTACLE_LENGTH = 3,


        Obstacle.prototype = {
            /**
             * Initialise the DOM for the obstacle.
             * @param {number} speed
             */
            init: function (speed) {
              this.cloneCollisionBoxes();

              // Only allow sizing if we're at the right speed.
              if (this.size > 1 && this.typeConfig.multipleSpeed > speed) {
                this.size = 1;
              }

              this.width = this.typeConfig.width * this.size;

              // Check if obstacle can be positioned at various heights.
              if (Array.isArray(this.typeConfig.yPos)) {
//                var yPosConfig = IS_MOBILE ? this.typeConfig.yPosMobile :
                var yPosConfig = this.typeConfig.yPos;
                this.yPos = yPosConfig[getRandomNum(0, yPosConfig.length - 1)];
              } else {
                this.yPos = this.typeConfig.yPos;
              }

              this.draw();

              // Make collision box adjustments,
              // Central box is adjusted to the size as one box.
              //      ____        ______        ________
              //    _|   |-|    _|     |-|    _|       |-|
              //   | |<->| |   | |<--->| |   | |<----->| |
              //   | | 1 | |   | |  2  | |   | |   3   | |
              //   |_|___|_|   |_|_____|_|   |_|_______|_|
              //
              if (this.size > 1) {
                this.collisionBoxes[1].width = this.width - this.collisionBoxes[0].width -
                this.collisionBoxes[2].width;
                this.collisionBoxes[2].x = this.width - this.collisionBoxes[2].width;
              }

              // For obstacles that go at a different speed from the horizon.
              if (this.typeConfig.speedOffset) {
                this.speedOffset = getRandomNum(0,1)
                  ? this.typeConfig.speedOffset
                  : -this.typeConfig.speedOffset;
              }

              if (this.typeConfig.speedUp) {
                this.speedOffset += this.typeConfig.speedUp;
              }

              this.gap = this.getGap(this.gapCoefficient, speed);
            },

            /**
             * Draw and crop based on size.
             */
            draw: function () {
              var sourceWidth = this.typeConfig.width;
              var sourceHeight = this.typeConfig.height;

              if (IS_HIDPI) {
                sourceWidth = sourceWidth * this.typeConfig.mag;
                sourceHeight = sourceHeight * this.typeConfig.mag;
              }

              // X position in sprite.
              var sourceX = (sourceWidth * this.size) * (0.5 * (this.size - 1)) +
              this.spritePos.x;

              // Animation frames.
              if (this.currentFrame > 0) {
                sourceX += sourceWidth * this.currentFrame;
              }

              /*
              if (this.typeConfig.type == 'RED_DUCK' && this.speedOffset < 0) {
                this.canvasCtx.save();
                this.canvasCtx.filter = 'hue-rotate(20deg)';
                this.canvasCtx.drawImage(this.typeConfig.sprite || N7e.imageSprite,
                  sourceX, this.spritePos.y,
                  sourceWidth * this.size, sourceHeight,
                  this.xPos, this.yPos,
                  this.typeConfig.width * this.size, this.typeConfig.height);
                this.canvasCtx.restore();
              } else {
                this.canvasCtx.drawImage(this.typeConfig.sprite || N7e.imageSprite,
                  sourceX, this.spritePos.y,
                  sourceWidth * this.size, sourceHeight,
                  this.xPos, this.yPos,
                  this.typeConfig.width * this.size, this.typeConfig.height);
              }
              */
              this.canvasCtx.drawImage(this.typeConfig.sprite || N7e.imageSprite,
                sourceX, this.spritePos.y,
                sourceWidth * this.size, sourceHeight,
                Math.floor(this.xPos), this.yPos,
                this.typeConfig.width * this.size, this.typeConfig.height);
            },

            /**
             * Obstacle frame update.
             * @param {number} deltaTime
             * @param {number} speed
             */
            update: function (deltaTime, speed) {
              if (!this.remove) {
                if (this.typeConfig.speedOffset) {
                  speed += this.speedOffset;
                }
                this.xPos -= speed * FPS / 1000 * deltaTime;

                // Update frame
                if (this.typeConfig.numFrames) {
                  this.timer += deltaTime;
                  if (this.timer >= this.typeConfig.frameRate) {
                    this.currentFrame =
                    this.currentFrame == this.typeConfig.numFrames - 1 ?
                    0 : this.currentFrame + 1;
                    this.timer = 0;
                  }
                }
                this.draw();

                if (!this.isVisible()) {
                  this.remove = true;
                }
              }
            },

            /**
             * Calculate a random gap size.
             * - Minimum gap gets wider as speed increses
             * @param {number} gapCoefficient
             * @param {number} speed
             * @return {number} The gap size.
             */
            getGap: function (gapCoefficient, speed) {
              var minGap = Math.round(this.width * speed +
                this.typeConfig.minGap * gapCoefficient);
                var maxGap = Math.round(minGap * Obstacle.MAX_GAP_COEFFICIENT);
                return getRandomNum(minGap, maxGap);
            },

            /**
             * Check if obstacle is visible.
             * @return {boolean} Whether the obstacle is in the game area.
             */
            isVisible: function () {
              return this.xPos + this.width > 0;
            },

            /**
             * Make a copy of the collision boxes, since these will change based on
             * obstacle type and size.
             */
            cloneCollisionBoxes: function () {
              var collisionBoxes = this.typeConfig.collisionBoxes;

              for (var i = collisionBoxes.length - 1; i >= 0; i--) {
                this.collisionBoxes[i] = new CollisionBox(collisionBoxes[i].x,
                  collisionBoxes[i].y, collisionBoxes[i].width,
                  collisionBoxes[i].height);
              }
            }
        };


    /**
     * Obstacle definitions.
     * minGap: minimum pixel space betweeen obstacles.
     * multipleSpeed: Speed at which multiples are allowed.
     * speedOffset: speed faster / slower than the horizon.
     * minSpeed: Minimum speed which the obstacle can make an appearance.
     */
    Obstacle.types = [
      {
        type: 'CACTUS_SMALL',
        width: 17,
        height: 35,
        yPos: N7e.defaultDimensions.HEIGHT - 45,
        multipleSpeed: 4,
        minGap: 120,
        minSpeed: 0,
        collisionBoxes: [
          new CollisionBox(0, 7, 5, 27),
          new CollisionBox(4, 0, 6, 34),
          new CollisionBox(10, 4, 7, 14)
        ]
      },
      {
        type: 'CACTUS_LARGE',
        width: 25,
        height: 50,
        yPos: N7e.defaultDimensions.HEIGHT - 60,
        multipleSpeed: 7,
        minGap: 120,
        minSpeed: 0,
        collisionBoxes: [
          new CollisionBox(0, 12, 7, 38),
          new CollisionBox(8, 0, 7, 49),
          new CollisionBox(13, 10, 10, 38)
        ]
      },
      {
        type: 'RED_DUCK',
        width: 46,
        height: 40,
        yPos: [
          N7e.defaultDimensions.HEIGHT - 50,
          N7e.defaultDimensions.HEIGHT - 75,
          N7e.defaultDimensions.HEIGHT - 100
        ], // Variable height.
        yPosMobile: [100, 50], // Variable height mobile.
        multipleSpeed: 999,
        // minSpeed: 8.5,
        minSpeed: 0,
        minGap: 150,
        collisionBoxes: [
          new CollisionBox(15, 18, 16, 16),
          new CollisionBox(31, 24, 12, 8),
          new CollisionBox(1, 22, 13, 4)
        ],
        numFrames: 6,
        frameRate: 1000 / 18,
        speedOffset: .8
      },
      {
        type: 'BICYCLE',
        width: 52,
        height: 52,
        yPos: N7e.defaultDimensions.HEIGHT - 62,
        multipleSpeed: 999,
        minSpeed: 0,
        minGap: 150,
        collisionBoxes: [
          new CollisionBox(17, 3, 17, 20),
          new CollisionBox(4, 23, 20, 27),
          new CollisionBox(24, 30, 23, 20)
        ],
        numFrames: 8,
        frameRate: 1000 / 15,
        speedOffset: .3,
        speedUp: 2.5 //FUN FIXME Random a speed from a predefined range.
      }
    ];


    //******************************************************************************
    /**
     * Amandarine game character.
     * @param {HTMLCanvas} canvas
     * @param {Object} spritePos Positioning within image sprite.
     * @constructor
     */
    function AMDR(canvas, spritePos) {
      this.canvas = canvas;
      this.canvasCtx = canvas.getContext('2d');
      this.spritePos = spritePos;
      this.xPos = 0;
      this.yPos = 0;
      // Position when on the ground.
      this.groundYPos = 0;
      this.currentFrame = 0;
      this.currentAnimFrames = [];
      this.animStartTime = 0;
      this.timer = 0;
      this.msPerFrame = 1000 / FPS;
      this.config = AMDR.config;
      this.config.GRAVITY_FACTOR = 0.0000005 * AMDR.config.GRAVITY * N7e().config.SCALE_FACTOR;
      // Current status.
      //this.status = AMDR.status.WAITING;
      this.dust = new Particles(canvas, this.xPos, this.yPos, AMDR.config.DUST_DURATION);

      this.init();
    };


    /**
     * Amandarine player config.
     * @enum {number}
     */
    AMDR.config = {
      DUST_DURATION: 600,
      GRAVITY: 9.8,
      FRICTION: 9.8,
      HEIGHT: 40,
      HEIGHT_DUCK: 25,
      INTRO_DURATION: 400,
      MAX_JUMP_HEIGHT: 30,
      MIN_JUMP_HEIGHT: 30,
      SPRITE_WIDTH: 262,
      START_X_POS: 25,
      WIDTH: 40,
      WIDTH_DUCK: 40
    };


    /**
     * Used in collision detection.
     * @type {Array<CollisionBox>}
     */
    AMDR.collisionBoxes = {
      SLIDING: [
        new CollisionBox(11, 12, 15, 12),
        new CollisionBox(11, 25, 17, 12),
        new CollisionBox(28, 32, 5, 5)
      ],
      RUNNING: [
        /*
        new CollisionBox(22, 0, 17, 16),
        new CollisionBox(1, 18, 30, 9),
        new CollisionBox(10, 35, 14, 8),
        new CollisionBox(1, 24, 29, 5),
        new CollisionBox(5, 30, 21, 4),
        new CollisionBox(9, 34, 15, 4)
        */
        new CollisionBox(15, 4, 15, 19),
        new CollisionBox(12, 16, 16, 19)
      ]
    };


    /**
     * Animation states.
     * @enum {string}
     */
    AMDR.status = {
      CRASHED: 'CRASHED',
      SLIDING: 'SLIDING',
      JUMPING: 'JUMPING',
      RUNNING: 'RUNNING',
      WAITING: 'WAITING'
    };

    /**
     * Animation config for different states.
     * @enum {Object}
     */
    AMDR.animFrames = {
      WAITING: {
        frames: [0, 20, 40, 60, 80, 100],
        msPerFrame: 1000 / 6
      },
      RUNNING: {
        frames: [0, 20, 40, 60, 40, 20, 0, 80],
        msPerFrame: 1000 / 24
      },
      CRASHED: {
        frames: [0],
        msPerFrame: 1000
      },
      JUMPING: {
        frames: [0,20,40,40,40],
        msPerFrame: 1000 / 3
      },
      SLIDING: {
        frames: [0, 20, 40, 20],
        //frames: [264, 323],
        msPerFrame: 1000 / 24
      }
    };


    AMDR.prototype = {
        /**
         * Amandarine player initaliser.
         */
        init: function () {
          this.groundYPos = N7e.defaultDimensions.HEIGHT - this.config.HEIGHT -
            N7e().config.BOTTOM_PAD;
          this.yPos = this.groundYPos;
          this.minJumpHeight = this.groundYPos - this.config.MIN_JUMP_HEIGHT;

          this.currentAnimFrames = AMDR.animFrames.WAITING.frames;
          this.currentSprite = AMDR.animFrames.WAITING.sprite;
          this.currentFrame = 0;

          this.draw(0, 0);
        },


        getCollisionBoxes: function () {
          switch (this.status) {
            case AMDR.status.SLIDING:
              return AMDR.collisionBoxes.SLIDING

            case AMDR.status.RUNNING:
            default:
              return AMDR.collisionBoxes.RUNNING;
          }
        },

        /**
         * Set the animation status.
         * @param {!number} deltaTime
         * @param {AMDR.status} status Optional status to switch to.
         */
        update: function (deltaTime, speed, opt_status) {
          this.timer = (this.timer || 0) +  deltaTime;
          let n7e = N7e();

          // Update the status.
          if (opt_status) {
            this.status = opt_status;
            this.currentFrame = 0;
            this.msPerFrame = AMDR.animFrames[opt_status].msPerFrame;
            this.currentAnimFrames = AMDR.animFrames[opt_status].frames;

            this.currentSprite = AMDR.animFrames[opt_status].sprite;
          }

          // Game intro animation, Amandarine moves in from the left.
          /*
          if (this.playingIntro && this.xPos < this.config.START_X_POS) {
            this.xPos += (this.config.START_X_POS / this.config.INTRO_DURATION) * deltaTime;
          }
          */

          /* Don't draw crash state to observe the effective collision boxes */
          if (!n7e.config.SHOW_COLLISION || opt_status != AMDR.status.CRASHED ) {
            this.draw(this.currentAnimFrames[this.currentFrame], 0);
          }

          // Update the frame position.
          if (this.timer >= this.msPerFrame) {

            this.currentFrame = this.currentFrame ==
              this.currentAnimFrames.length - 1 ? 0 : this.currentFrame + 1;
            this.timer = 0;

          }
          if (n7e.config.SHOW_SEPIA != 1) this.dust.update(deltaTime);
        },

        /**
         * Draw Amandarine to a particular position.
         * @param {number} x
         * @param {number} y
         */
        draw: function (x, y) {
          var sourceX = x * 2;
          var sourceY = y * 2;

          // Adjustments for sprite sheet position.
          sourceX += this.spritePos.x;
          sourceY += this.spritePos.y;

          if (this.currentSprite) {
            this.canvasCtx.drawImage(this.currentSprite, sourceX, sourceY, 40, 40,
              Math.floor(this.xPos), Math.floor(this.yPos),
              this.config.WIDTH, this.config.HEIGHT);

              this.dust.draw();
          }
        },

      /*** Priority Definitions ***
        0: Either...
          a) Collecting active parameters (eg. weighting Jump & Slide)
          b) Suspended. Waiting to be updated into a background task.
        1: Either...
          a) Will be active once an active task has ended.
          b) Timeless background task. (eg. Wait, Run. Will never be active
            but will eventually be pushed back to 0).
        2: Active, will not be interrupted during game play. (eg. Jump, Slide)
        3: Interrupting. (eg. Crash, Pause)
       -1: Zombie, a released task.
       ***/

        newAction: function(actionQueue, type) {
          for (let i = 0, action; action = actionQueue[i]; i++){
            if (action.type == type && action.priority == 0) {
              return action;
            }
          }
          return {type:type, priority:0};
        },

        updateActionQueue: function (actionQueue, now, deltaTime, speed) {
          actionQueue.sort((a,b) => a.priority == b.priority
            ? a.index - b.index
            : b.priority - a.priority);
          actionQueue.splice(0, Infinity, ...actionQueue.filter( action => action.priority != -1 ));

          let n7e = N7e();

          UPDATE_ACTION_QUEUE: {
            for (let i = 0, action; action = actionQueue[i]; i++) {
              switch(action.priority) {
                case 0: { /* Prepare action */

                  switch(action.type) {
                    case AMDR.status.JUMPING:
                      this.drawJumpingGuide(action, now, speed);
                      break;
                    case AMDR.status.SLIDING:
                      this.drawSlidingGuide(action, now, speed);
                      break;
                    case AMDR.status.RUNNING:
                      if (action.hasOwnProperty('xPos')) {
                        this.xPos = action.xPos;
                      }
                    case AMDR.status.WAITING:
                      action.timer = 0;
                      action.priority = 1;
                      this.updateAction(action, deltaTime, speed);
                      this.update(deltaTime, speed, action.type);
                    default:;
                  }

                  break UPDATE_ACTION_QUEUE;
                }

                case 1:  /* Initialise action */
                  switch(action.type) {
                    case AMDR.status.JUMPING:
                      {
                        action.maxPressDuration = shapeSpeedDuration(speed, action.pressDuration);
                        // It seems more ergonomically natural to simply add the minimum than to clip the value.
                        action.top = action.maxPressDuration / 1000;
                        action.halfTime = Math.sqrt(2000 * action.maxPressDuration / AMDR.config.GRAVITY);

                        if (action.end + action.halfTime * 2 < now) {
                          action.priority = -1;
                          continue;
                        }

                        n7e.playSound(n7e.soundFx.SOUND_JUMP,0.4);
                        n7e.playSound(n7e.soundFx.SOUND_DROP,0.4 * action.pressDuration/n7e.config.MAX_ACTION_PRESS);
                        action.timer = 0;

                        if (n7e.config.SHOW_SEPIA != 1) {
                          this.dust.xPos = this.xPos - 24;
                          this.dust.addPoint(0, 0, -40, -10 * Math.random());
                        }

                        this.update(0, speed, action.type);
                      } break;
                    case AMDR.status.SLIDING:
                      {
                        let sp = action.speed || speed + 0.2;

                        if (!action.maxPressDuration) {
                          action.maxPressDuration = n7e.config.SLIDE_FACTOR * shapeSpeedDuration(sp, action.pressDuration);
                        }
                        // Sliding act pretty much like jumping, just going one way forward.
                        //action.pressDuration += N7e.config.MIN_ACTION_PRESS_FACTOR;

                        action.fullDistance = 1.5 * sp * 0.001 * FPS * action.maxPressDuration;
                        action.fullTime = action.fullDistance / (sp * FPS);

                        if (action.end + action.fullTime * 1000 < now) {
                          action.priority = -1;
                          continue;
                        }

                        n7e.playSound(n7e.soundFx.SOUND_SLIDE,0.6);

                        action.timer = 0;
                        action.distance = 0;
                        action.friction = 2 * action.fullDistance / (action.fullTime * action.fullTime);
                        action.xPos = this.xPos;

                        this.update(0, sp, action.type);
                      } break;
                    case AMDR.status.RUNNING:
                      if (action.speed) {
                        let sp = speed + action.speed;
                        let increment = sp * FPS / 1000 * deltaTime;
                        this.xPos += increment;
                      }

                      if (action.hasOwnProperty('duration') && action.duration > 0) {
                        action.duration -= deltaTime;
                        if (action.duration < 0) {
                          action.priority = -1;
                        }
                        this.updateAction(action, deltaTime, speed);
                        this.update(deltaTime, speed);
                        break UPDATE_ACTION_QUEUE;
                      }
                    case AMDR.status.WAITING:
                      this.updateAction(action, deltaTime, speed);
                      this.update(deltaTime, speed);
                      continue;
                    default:
                      break UPDATE_ACTION_QUEUE;
                  }
                  action.priority = 2;
                  // All 1s will progress into 2s
                case 2:
                  this.updateAction(action, deltaTime, speed);

                  if (action.priority == -1) {

                    // At the end of the first action, the actual game begins.
                    if (action.first) {
                      n7e.musics.stop(); // shouldn't need
                      n7e.loadMusic('offline-play-music', N7e.config.PLAY_MUSIC);
                      n7e.playIntro();
                      n7e.setSpeed(6);
                      n7e.defaultAction.type = AMDR.status.RUNNING;
                    }

                    // To get default action updated.
                    n7e.defaultAction.priority = 0;
                  }

                  this.update(deltaTime, speed);
                  break UPDATE_ACTION_QUEUE;
                case 3:
                  switch(action.type) {
                    case AMDR.status.PAUSED:
                      //NYI
                      break UPDATE_ACTION_QUEUE;
                    case AMDR.status.CRASHED: {
                      if (!action.updated) {
                        n7e.musics.stop();
                        n7e.playSound(N7e().soundFx.SOUND_OGGG,0.3);
                        n7e.setSky(n7e.config.SKY.SUNSET);

                        action.duration = 200;
                        action.top = action.duration / 1000;
                        action.halfTime = Math.sqrt(2000 * action.duration / AMDR.config.GRAVITY);
                        action.timer = 0;
                        action.yCrashed = this.yPos;
                        action.lagging = speed;
                        action.updated = true;
                        this.updateAction(action, deltaTime, speed);
                        this.update(deltaTime, speed, action.type);
                      } else {
                        this.updateAction(action, deltaTime, speed);
                        this.update(deltaTime, speed);
                      }

                      if (action.priority == -1) {
                        actionQueue.length = 0;
                      }
                    } break UPDATE_ACTION_QUEUE;
                    default:;
                  }

                default:
                  this.updateAction(action, deltaTime, speed);
                  break UPDATE_ACTION_QUEUE;
              }
            }
          }

          //this.updateAction(deltaTime, speed);

          //this.update(speed, deltaTime);
        },

        /**
         * Update current action.
         * @param {number} deltaTime
         * @param {number} speed
         */
        updateAction: function (action, deltaTime, speed) {
          if (!action || action.priority == -1) {
            console.log('something wrong');
            return false;
          }

          let n7e = N7e();

          action.timer += deltaTime;
          switch (action.type) {
            case AMDR.status.WAITING:
              break;
            case AMDR.status.RUNNING: {
              if (this.xPos < this.config.START_X_POS) {
                this.xPos += 0.2 * speed * (FPS / 1000) * deltaTime;
                if (this.xPos > this.config.START_X_POS) {
                  this.xPos = this.config.START_X_POS;
                }
              } else if (this.xPos > this.config.START_X_POS) {
                this.xPos -= 0.2 * speed * (FPS / 1000) * deltaTime;
                if (this.xPos < this.config.START_X_POS) {
                  this.xPos = this.config.START_X_POS;
                }
              }
            } break;
            case AMDR.status.JUMPING: {
              let timer = action.halfTime - action.timer;
              let dY = action.top * n7e.config.SCALE_FACTOR - this.config.GRAVITY_FACTOR * timer * timer;

              this.yPos = this.groundYPos - dY;

              if (timer < -action.halfTime) {
                n7e.playSound(n7e.soundFx.SOUND_DROP,0.6 * action.pressDuration/n7e.config.MAX_ACTION_PRESS);
                action.priority = -1;
                this.yPos = this.groundYPos;
                if (n7e.config.SHOW_SEPIA != 1) {
                  this.dust.xPos = this.xPos - 24;
                  this.dust.addPoint(0, 0, -40, -10 * Math.random());
                }
              }
            } break;
            case AMDR.status.SLIDING: {
              var increment = speed * FPS / 1000 * deltaTime;

              action.distance += increment;

              let it = action.fullTime - action.timer/1000;
              if (it < 0) it = 0;
              let distance = action.fullDistance - 1/2 * it * it * action.friction - action.distance;

              this.xPos = action.xPos + distance;
              //Sliding animation

              if (n7e.config.SHOW_SEPIA != 1
                  && this.status == AMDR.status.SLIDING
                  & this.dust.points.length < action.timer / 30) {
                this.dust.xPos = this.xPos - 24;
                let dsp = (action.speed ? action.speed : speed) / 6;
                this.dust.addPoint(-10, 0, dsp * -90, dsp * -15 * Math.random());
                this.dust.addPoint(5, 0, dsp * -75, dsp * -15 * Math.random());
              }

              if (action.timer >= action.fullTime * 1000) {
                action.priority = -1;
//                this.xPos = this.config.START_X_POS;
              }
            } break;
            case AMDR.status.CRASHED: {
              let timer = action.halfTime - action.timer;
              let dY = action.top * n7e.config.SCALE_FACTOR - this.config.GRAVITY_FACTOR/4 * timer * timer;

              this.yPos = action.yCrashed - dY;

              let lagging = action.lagging * (3000-action.timer)/3000;
              if (lagging < 0) {
                lagging = 0;
              }
              n7e.setSpeed(lagging);

              if (action.timer > 3000) {
                action.priority = -1;
                n7e.stop();
              }
            } break;
            default:;
          }

          if (!action || action.priority == -1) return false;

          return true;
        },

        /**
         * Draw jumping guide.
         * @param {Object} action object
         * @param {number} now
         */
        drawJumpingGuide: function (action, now, speed) {
          /* Draw jumping guide */

          let n7e = N7e();

          let pressDuration = action.maxPressDuration;

          if (!pressDuration) {
            // priority 0
            pressDuration = now - action.begin;
            if (pressDuration > n7e.config.MAX_ACTION_PRESS) {
              pressDuration = n7e.config.MAX_ACTION_PRESS;
            }

            pressDuration = shapeSpeedDuration(speed, pressDuration);
          }

          let fallDuration = Math.sqrt(2000 * pressDuration / AMDR.config.GRAVITY);

          let jumpTop = pressDuration / 1000;

          this.canvasCtx.save(); {
            this.canvasCtx.beginPath();
            this.canvasCtx.strokeStyle = "#000000";

            let baseX = this.xPos + 12;
            let baseY = this.groundYPos + 35;
            let shiftLeft = 0;
            let fadeOut = 1;
            let DRAW_STEP = 50;
            var increment = speed * 0.001 * FPS * DRAW_STEP;

            if (action.priority == 2) {
              let last = now - action.end;
              shiftLeft = increment * last / DRAW_STEP;
              fadeOut = (fallDuration - last) / fallDuration;
              if (fadeOut < 0) fadeOut = 0;
            }

            let unit = fallDuration * 2 / DRAW_STEP;
            let gravityFactor = 0.0000005 * AMDR.config.GRAVITY;
            this.canvasCtx.moveTo(
              baseX + unit*increment - shiftLeft,
              baseY - (jumpTop - (gravityFactor * fallDuration * fallDuration)) * n7e.config.SCALE_FACTOR
            );

            for (let timer = fallDuration; timer > - fallDuration - DRAW_STEP; timer-= DRAW_STEP, unit--) {
              let drawY = baseY - (jumpTop - (gravityFactor * timer * timer)) * n7e.config.SCALE_FACTOR;
              let drawX = baseX + unit*increment - shiftLeft;

              if (drawX < this.xPos + 20 && drawY > baseY - 60 ) {
                break;
              }

              this.canvasCtx.lineTo(drawX, drawY);
            }

            now = (now/10)%40;
            let alpha = fadeOut * (fallDuration-150)/200;
            if (alpha > 1) alpha = 1;

            this.canvasCtx.lineCap = 'round';
            this.canvasCtx.setLineDash([0,20]);

            /*
            this.canvasCtx.lineWidth = 1;
            this.canvasCtx.lineDashOffset = now+5;
            this.canvasCtx.strokeStyle = "rgba(255,255,255,"+alpha.toFixed(1)+")";
            this.canvasCtx.stroke();
            */

            this.canvasCtx.lineWidth = alpha*5;
            this.canvasCtx.lineDashOffset = now;
            this.canvasCtx.strokeStyle = "rgba(255,255,255,"+alpha.toFixed(1)+")";
            this.canvasCtx.stroke();
          } this.canvasCtx.restore();
        },

        /**
         * Draw sliding guide.
         * @param {Object} action object
         * @param {number} now
         */
        drawSlidingGuide: function (action, now, speed) {

          let n7e = N7e();

          let slideDuration;
          let alpha;
          let baseX = this.xPos;

          if (action.maxPressDuration) {
            slideDuration = action.maxPressDuration;
            baseX = n7e.config.START_X_POS - action.distance;
            alpha = (action.fullDistance - action.distance)/action.fullDistance;
            alpha *= alpha;
          } else {
            // priority 0
            slideDuration = now - action.begin;
            if (slideDuration > n7e.config.MAX_ACTION_PRESS) {
              slideDuration = n7e.config.MAX_ACTION_PRESS;
            }
            alpha = slideDuration/n7e.config.MAX_ACTION_PRESS;
            slideDuration = n7e.config.SLIDE_FACTOR * shapeSpeedDuration(speed, slideDuration);
          }

          //let distance = speed * 0.001 * FPS * slideDuration;
          let distance = 1.5 * speed * 0.001 * FPS * slideDuration;


          let frame = Math.floor(now / AMDR.animFrames.SLIDING.msPerFrame) % 4;

          this.canvasCtx.save();
          this.canvasCtx.globalAlpha = 0.50 * alpha;
          this.canvasCtx.filter = 'grayscale(1)';
          this.canvasCtx.globalCompositeOperation = 'hard-light';
          this.canvasCtx.drawImage(N7e.imageSpriteAmdrSliding,
              AMDR.animFrames.SLIDING.frames[frame]*2, 0, 40, 40,
              Math.floor(baseX + distance), this.groundYPos,
              this.config.WIDTH, this.config.HEIGHT);
          this.canvasCtx.restore();
        },

        /**
         * Reset Amandarine to running at start of game.
         */
        reset: function () {
          this.yPos = this.groundYPos;
          this.xPos = -120;// this.config.START_X_POS;
          this.update(0, 0, AMDR.status.RUNNING);
          this.dust.reset();
          this.action = null;
          N7e().queueAction({
            begin: getTimeStamp(),
            type: AMDR.status.SLIDING,
            pressDuration: N7e.config.MAX_ACTION_PRESS,
            priority: 1,
            first: true,
            speed: 7.2,
            maxPressDuration: 1500,
          });
          N7e().queueAction(N7e().defaultAction);

        }
    };


    //******************************************************************************

    /**
     * Handles displaying the distance meter.
     * @param {!HTMLCanvasElement} canvas
     * @param {Object} spritePos Image position in sprite.
     * @param {number} canvasWidth
     * @constructor
     */
    function DistanceMeter(canvas, spritePos, canvasWidth) {
      this.canvas = canvas;
      this.canvasCtx = canvas.getContext('2d');
      this.image = N7e.imageSprite;
      this.spritePos = spritePos;
      this.x = 0;
      this.y = 5;

      this.currentDistance = 0;
      this.maxScore = 0;
      this.highScore = 0;
      this.container = null;

      this.digits = [];
      this.acheivement = false;
      this.defaultString = '';
      this.flashTimer = 0;
      this.flashIterations = 0;
      this.invertTrigger = false;

      this.config = DistanceMeter.config;
      this.maxScoreUnits = this.config.MAX_DISTANCE_UNITS;
      this.init(canvasWidth);
    };


    /**
     * @enum {number}
     */
    DistanceMeter.dimensions = {
      WIDTH: 10,
      HEIGHT: 13,
      DEST_WIDTH: 11
    };


    /**
     * Y positioning of the digits in the sprite sheet.
     * X position is always 0.
     * @type {Array<number>}
     */
    DistanceMeter.yPos = [0, 13, 27, 40, 53, 67, 80, 93, 107, 120];


    /**
     * Distance meter config.
     * @enum {number}
     */
    DistanceMeter.config = {
      // Number of digits.
      MAX_DISTANCE_UNITS: 5,

      // Distance that causes achievement animation.
      ACHIEVEMENT_DISTANCE: 100,

      // Used for conversion from pixel distance to a scaled unit.
      COEFFICIENT: 0.025,

      // Flash duration in milliseconds.
      FLASH_DURATION: 1000 / 4,

      // Flash iterations for achievement animation.
      FLASH_ITERATIONS: 3
    };


    DistanceMeter.prototype = {
        /**
         * Initialise the distance meter to '00000'.
         * @param {number} width Canvas width in px.
         */
        init: function (width) {
          var maxDistanceStr = '';

          this.calcXPos(width);
          this.maxScore = this.maxScoreUnits;
          for (var i = 0; i < this.maxScoreUnits; i++) {
            this.draw(i, 0);
            this.defaultString += '0';
            maxDistanceStr += '9';
          }

          this.maxScore = parseInt(maxDistanceStr);
        },

        /**
         * Calculate the xPos in the canvas.
         * @param {number} canvasWidth
         */
        calcXPos: function (canvasWidth) {
          this.x = canvasWidth - (DistanceMeter.dimensions.DEST_WIDTH *
            (this.maxScoreUnits + 1));
        },

        /**
         * Draw a digit to canvas.
         * @param {number} digitPos Position of the digit.
         * @param {number} value Digit value 0-9.
         * @param {boolean} opt_highScore Whether drawing the high score.
         */
        draw: function (digitPos, value, opt_highScore) {
          var sourceWidth = DistanceMeter.dimensions.WIDTH;
          var sourceHeight = DistanceMeter.dimensions.HEIGHT;
          var sourceX = DistanceMeter.dimensions.WIDTH * value;
          var sourceY = 0;

          var targetX = digitPos * DistanceMeter.dimensions.DEST_WIDTH;
          var targetY = this.y;
          var targetWidth = DistanceMeter.dimensions.WIDTH;
          var targetHeight = DistanceMeter.dimensions.HEIGHT;

          // For high DPI we 2x source values.
          if (IS_HIDPI) {
            sourceWidth *= 2;
            sourceHeight *= 2;
            sourceX *= 2;
          }

          sourceX += this.spritePos.x;
          sourceY += this.spritePos.y;

          this.canvasCtx.save();
          //this.canvasCtx.globalCompositeOperation = 'difference';

          if (opt_highScore) {
            // Left of the current score.
            var highScoreX = this.x - (this.maxScoreUnits * 2) *
            DistanceMeter.dimensions.WIDTH;
            this.canvasCtx.translate(highScoreX, this.y);
          } else {
            this.canvasCtx.translate(this.x, this.y);
          }

          this.canvasCtx.drawImage(this.image, sourceX, sourceY,
            sourceWidth, sourceHeight,
            targetX, targetY,
            targetWidth, targetHeight
          );

          this.canvasCtx.restore();
        },

        /**
         * Covert pixel distance to a 'real' distance.
         * @param {number} distance Pixel distance ran.
         * @return {number} The 'real' distance ran.
         */
        getActualDistance: function (distance) {
          return distance ? Math.round(distance * this.config.COEFFICIENT) : 0;
        },

        /**
         * Update the distance meter.
         * @param {number} distance
         * @param {number} deltaTime
         * @return {boolean} Whether the acheivement sound fx should be played.
         */
        update: function (deltaTime, distance) {
          var paint = true;
          var playSound = false;

          if (!this.acheivement) {
            distance = this.getActualDistance(distance);
            // Score has gone beyond the initial digit count.
            if (distance > this.maxScore && this.maxScoreUnits ==
                this.config.MAX_DISTANCE_UNITS) {
              this.maxScoreUnits++;
              this.maxScore = parseInt(this.maxScore + '9');
            } else {
              this.distance = 0;
            }

            if (distance > 0) {
              // Acheivement unlocked
              if (distance % this.config.ACHIEVEMENT_DISTANCE == 0) {
                // Flash score and play sound.
                this.acheivement = true;
                this.flashTimer = 0;
                playSound = true;
              }

              // Create a string representation of the distance with leading 0.
              var distanceStr = (this.defaultString +
                distance).substr(-this.maxScoreUnits);

              this.digits = distanceStr.split('');
            } else {
              this.digits = this.defaultString.split('');
            }

          } else {
            // Control flashing of the score on reaching acheivement.
            if (this.flashIterations <= this.config.FLASH_ITERATIONS) {
              this.flashTimer += deltaTime;

              if (this.flashTimer < this.config.FLASH_DURATION) {
                paint = false;
              } else if (this.flashTimer >
                  this.config.FLASH_DURATION * 2) {
                this.flashTimer = 0;
                this.flashIterations++;
              }
            } else {
              this.acheivement = false;
              this.flashIterations = 0;
              this.flashTimer = 0;
            }
          }

          // Draw the digits if not flashing.
          if (paint) {
            for (var i = this.digits.length - 1; i >= 0; i--) {
              this.draw(i, parseInt(this.digits[i]));
            }
          }

          this.drawHighScore();
          return playSound;
        },

        /**
         * Draw the high score.
         */
        drawHighScore: function () {
          this.canvasCtx.save();
          this.canvasCtx.globalAlpha = .8;
          for (var i = this.highScore.length - 1; i >= 0; i--) {
            this.draw(i, parseInt(this.highScore[i], 10), true);
          }
          this.canvasCtx.restore();
        },

        /**
         * Set the highscore as a array string.
         * Position of char in the sprite: H - 10, I - 11.
         * @param {number} distance Distance ran in pixels.
         */
        setHighScore: function (distance) {
          distance = this.getActualDistance(distance);
          var highScoreStr = (this.defaultString +
            distance).substr(-this.maxScoreUnits);

          this.highScore = ['10', '11', ''].concat(highScoreStr.split(''));
        },

        /**
         * Reset the distance meter back to '00000'.
         */
        reset: function () {
          this.update(0);
          this.acheivement = false;
        }
    };

    //******************************************************************************

    /**
     * Particles (Very Experimental)
     */

    function Particles(canvas, x, y, life) {
      this.life = life; // Used for calculating sprite offset.
      this.canvas = canvas;
      this.canvasCtx = this.canvas.getContext('2d');
      this.xPos = x;
      this.yPos = y;
      this.points = [];
      this.init();
      this.tag = 0;
    };

    Particles.prototype = {
        init: function () {
        },

        draw: function () {
          for(let i = 0, point; point = this.points[i]; i++) {
            let ratio = (this.life - point.life) / this.life;
            let x = this.xPos + point.x + 40 + point.w * ratio;
            let y = this.yPos + point.y + N7e.defaultDimensions.HEIGHT-25 + point.h * ratio;
            this.canvasCtx.drawImage(N7e.imageSprite,
              776 + 22 * Math.floor(8 * ratio), 2,
              22, 22,
              Math.ceil(x), Math.ceil(y),
              22, 22);
          }
        },

        update: function (aging) {
          this.points = this.points.filter( point => {
            point.life -= aging;
            return point.life > 0;
          });
        },

        addPoint: function(x, y, w, h) {
          this.points.push({tag:this.tag++, x:x, y:y, w:w, h:h, life:this.life});
        },

        reset: function() {
          this.points = [];
        }
    };


    //******************************************************************************

    /**
     * Cloud background item.
     * Similar to an obstacle object but without collision boxes.
     * @param {HTMLCanvasElement} canvas Canvas element.
     * @param {Object} spritePos Position of image in sprite.
     * @param {number} containerWidth
     */
    function Cloud(canvas, spritePos, containerWidth, type) {
      this.canvas = canvas;
      this.canvasCtx = this.canvas.getContext('2d');
      this.type = type;
      this.spritePos = {
        x: spritePos.x,
        y: spritePos.y[type],
      };
      this.containerWidth = containerWidth;
      this.xPos = containerWidth;
      this.yPos = 0;
      this.remove = false;
      this.cloudGap = getRandomNum(Cloud.config.MIN_CLOUD_GAP,
        Cloud.config.MAX_CLOUD_GAP);

      this.init();
    };


    /**
     * Cloud object config.
     * @enum {number}
     */
    Cloud.config = {
      HEIGHTS: [14,20,8],
      MAX_CLOUD_GAP: 400,
      MAX_SKY_LEVEL: 30,
      MIN_CLOUD_GAP: 100,
      MIN_SKY_LEVEL: N7e.defaultDimensions.HEIGHT - 79,
      WIDTH: 46
    };


    Cloud.prototype = {
        /**
         * Initialise the cloud. Sets the Cloud height.
         */
        init: function () {
          this.yPos = getRandomNum(Cloud.config.MAX_SKY_LEVEL,
            Cloud.config.MIN_SKY_LEVEL);
          this.opacity = getRandomNum(2,4) / 5;
          this.draw();
        },

        /**
         * Draw the cloud.
         */
        draw: function () {
          this.canvasCtx.save(); {

            if (N7e.config.SHOW_SEPIA != 1) {
              this.canvasCtx.globalAlpha = this.opacity;
            }
            this.canvasCtx.globalCompositeOperation = 'luminosity';
            var sourceWidth = Cloud.config.WIDTH;
            var sourceHeight = Cloud.config.HEIGHTS[this.type];

            if (IS_HIDPI) {
              sourceWidth = sourceWidth * 2;
              sourceHeight = sourceHeight * 2;
            }

            this.canvasCtx.drawImage(N7e.imageSprite, this.spritePos.x,
              this.spritePos.y,
              sourceWidth, sourceHeight,
              Math.ceil(this.xPos), this.yPos,
              Cloud.config.WIDTH, Cloud.config.HEIGHTS[this.type]);

          } this.canvasCtx.restore();
        },

        /**
         * Update the cloud position.
         * @param {number} speed
         */
        update: function (speed) {
          if (!this.remove) {
            this.xPos -= speed;
            this.draw();

            // Mark as removeable if no longer in the canvas.
            if (!this.isVisible()) {
              this.remove = true;
            }
          }
        },

        /**
         * Check if the cloud is visible on the stage.
         * @return {boolean}
         */
        isVisible: function () {
          return this.xPos + Cloud.config.WIDTH > 0;
        }
    };

    // TODO mix with cloud so it can be multi-depth
    function Mountain(canvas, containerWidth,depth) {
      this.canvas = canvas;
      this.canvasCtx = this.canvas.getContext('2d');
      this.xPos = containerWidth;
      this.yPos = HorizonLine.dimensions.YPOS + 6;
      this.remove = false;
      this.depth = depth;
      this.mountainGap = getRandomNum(200, 500);

      this.init();
    };


    Mountain.prototype = {

        init: function () {
          this.height = getRandomNum(N7e.defaultDimensions.HEIGHT/8, N7e.defaultDimensions.HEIGHT/2);
          if (this.depth == 0) this.height * 0.7;

          this.width = this.height * (2 + Math.random() * 3);
          if (this.width > 200) this.width = 200;
          this.draw();
        },

        /**
         * Draw the mountain.
         */
        draw: function () {
          if (N7e.config.SHOW_SEPIA == 1) {
            return;
          }

          this.canvasCtx.save();
          let n7e = N7e();
          this.canvasCtx.fillStyle = '#' + (this.depth == 0 ? n7e.gradients.rgb0x2 : n7e.gradients.rgb0x1);
          this.canvasCtx.beginPath();
          let x = this.xPos;
          let y = this.yPos;
          this.canvasCtx.moveTo(x, y);
          /*
          canvasCtx.lineTo(x + this.width/2, y-this.height);
          canvasCtx.lineTo(x + this.width, y);
          */
          this.canvasCtx.bezierCurveTo(
            x + this.width/2, y-this.height,
            x + this.width/2, y-this.height,
          x + this.width, y);
          this.canvasCtx.closePath();
          if (N7e.config.SHOW_SEPIA == 0) {
            this.canvasCtx.filter = 'hue-rotate(-25deg)';
          }
          this.canvasCtx.fill();

          if (N7e.config.SHOW_SEPIA == 9) {
            let w = this.width * 0.8;
            this.canvasCtx.clip();
            this.canvasCtx.beginPath();
            x-=w/30;y+=this.height/10;
            this.canvasCtx.globalCompositeOperation = 'multiply';
            this.canvasCtx.globalAlpha = 0.5;
            this.canvasCtx.filter = 'blur(5px)';
            this.canvasCtx.moveTo(x, y);
            this.canvasCtx.bezierCurveTo(
              x + w/2, y - this.height,
              x + this.width/2, y-this.height,
              x + w, y);
            this.canvasCtx.closePath();
            this.canvasCtx.fill();
          }

          this.canvasCtx.restore();
        },

        /**
         * Update the mountain position.
         * @param {number} speed
         */
        update: function (speed) {
          if (!this.remove) {
            this.xPos -= speed;
            this.draw();

            // Mark as removeable if no longer in the canvas.
            if (!this.isVisible()) {
              this.remove = true;
            }
          }
        },

        /**
         * Check if the mountain is visible on the stage.
         * @return {boolean}
         */
        isVisible: function () {
          return this.xPos + this.width > 0;
        }
    };


    //******************************************************************************

    /**
     * Nightmode shows a moon and stars on the horizon.
     */
    function NightMode(canvas, spritePos, containerWidth) {
      this.spritePos = spritePos;
      this.canvas = canvas;
      this.canvasCtx = canvas.getContext('2d');
      this.xPos = containerWidth - 50;
      this.yPos = 50;
      this.nextPhase = NightMode.phases.length - 1;
      this.currentPhase = this.nextPhase;
      this.opacity = 0;
      this.containerWidth = containerWidth;
      this.stars = [];
      this.drawStars = false;
      this.placeStars();
    };

    /**
     * @enum {number}
     */
    NightMode.config = {
      FADE_SPEED: 0.035,
      HEIGHT: 40,
      MOON_SPEED: 0.25,
      NUM_STARS: 7,
      STAR_SIZE: 9,
      STAR_SPEED: 0.3,
      STAR_MAX_Y: N7e.defaultDimensions.HEIGHT - 50,
      WIDTH: 20
    };

    NightMode.phases = [140, 120, 100, 60, 40, 20, 0];

    NightMode.prototype = {
        /**
         * Update moving moon, changing phases.
         * @param {boolean} activated Whether night mode is activated.
         * @param {number} delta
         */
        update: function (activated, delta) {
          // Moon phase.
          if (activated && this.opacity == 0) {
            this.currentPhase = this.nextPhase;
            this.nextPhase++;

            if (this.nextPhase >= NightMode.phases.length) {
              this.nextPhase = 0;
            }
          }

          // Fade in / out.
          if (activated && (this.opacity < 1 || this.opacity == 0)) {
            this.opacity += NightMode.config.FADE_SPEED;
          } else if (this.opacity > 0) {
            this.opacity -= NightMode.config.FADE_SPEED;
          }

          // Set moon positioning.
          if (this.opacity > 0) {
            this.xPos = this.updateXPos(this.xPos, NightMode.config.MOON_SPEED);

            // Update stars.
            if (this.drawStars) {
              for (var i = 0, star; star = this.stars[i]; i++) {
                star.x = this.updateXPos(star.x, NightMode.config.STAR_SPEED);
              }
            }
            this.draw();
          } else {
            this.opacity = 0;
            this.placeStars();
          }
          this.drawStars = true;
        },

        updateXPos: function (currentPos, speed) {
          if (currentPos < -NightMode.config.WIDTH) {
            currentPos = this.containerWidth;
          } else {
            currentPos -= speed;
          }
          return currentPos;
        },

        draw: function () {
          let n7e = N7e();
          var moonSourceWidth = this.currentPhase == 3 ? NightMode.config.WIDTH * 2 :
          NightMode.config.WIDTH;
          var moonSourceHeight = NightMode.config.HEIGHT;
          var moonSourceX = this.spritePos.x + NightMode.phases[this.currentPhase];
          var moonOutputWidth = moonSourceWidth;
          var starSize = NightMode.config.STAR_SIZE;
          //var starSourceX = n7e.spriteDefinition.LDPI.STAR.x;
          var starSourceX = N7e.spriteDefinition.HDPI.STAR.x;

          if (IS_HIDPI) {
            moonSourceWidth *= 2;
            moonSourceHeight *= 2;
            moonSourceX = this.spritePos.x +
            (NightMode.phases[this.currentPhase] * 2);
            starSize *= 2;
            //starSourceX = n7e.spriteDefinition.HDPI.STAR.x;
          }

          this.canvasCtx.save();

          // Moon. Draw the moon first to prevent any flickering due to spending too much time drawing stars.
          this.canvasCtx.globalAlpha = this.opacity;
          this.canvasCtx.drawImage(N7e.imageSprite, moonSourceX,
            this.spritePos.y, moonSourceWidth, moonSourceHeight,
            Math.round(this.xPos), this.yPos,
            moonOutputWidth, NightMode.config.HEIGHT);

          this.canvasCtx.globalAlpha = 1;

          // Stars.
          if (this.drawStars) {
            for (var i = 0; i < NightMode.config.NUM_STARS; i++) {
              let alpha = this.opacity * this.stars[i].opacity;
              let mx = this.xPos + moonOutputWidth/2;
              let my = this.yPos + NightMode.config.HEIGHT/2;
              let dt = Math.abs(this.stars[i].x - mx) + Math.abs(this.stars[i].y - my) - 50;
              if (dt < 0) dt = 0; else if (dt > 50) dt = 50;

              this.canvasCtx.globalAlpha = alpha * dt/50;
              this.canvasCtx.drawImage(N7e.imageSprite,
                starSourceX, this.stars[i].sourceY, starSize, starSize,
                Math.round(this.stars[i].x), this.stars[i].y,
                NightMode.config.STAR_SIZE, NightMode.config.STAR_SIZE);
            }
          }

          if (N7e.config.SHOW_SEPIA == 9) {
            this.canvasCtx.filter = 'blur(6px)';

            this.canvasCtx.drawImage(N7e.imageSprite, moonSourceX,
              this.spritePos.y, moonSourceWidth, moonSourceHeight,
              Math.round(this.xPos), this.yPos,
              moonOutputWidth, NightMode.config.HEIGHT);

            this.canvasCtx.filter = 'blur(2px)';
            if (this.drawStars) {
              for (var i = 0; i < NightMode.config.NUM_STARS; i++) {
                let alpha = this.opacity * this.stars[i].opacity;
                let mx = this.xPos + moonOutputWidth/2;
                let my = this.yPos + NightMode.config.HEIGHT/2;
                let dt = Math.abs(this.stars[i].x - mx) + Math.abs(this.stars[i].y - my) - 50;
                if (dt < 0) dt = 0; else if (dt > 50) dt = 50;

                this.canvasCtx.globalAlpha = alpha * dt/50;
                this.canvasCtx.drawImage(N7e.imageSprite,
                  starSourceX, this.stars[i].sourceY, starSize, starSize,
                  Math.round(this.stars[i].x), this.stars[i].y,
                  NightMode.config.STAR_SIZE, NightMode.config.STAR_SIZE);
              }
            }
          }

          this.canvasCtx.restore();
        },

        // Do star placement.
        placeStars: function () {
          let n7e = N7e();
          var segmentSize = Math.round(this.containerWidth /
            NightMode.config.NUM_STARS);

          for (var i = 0; i < NightMode.config.NUM_STARS; i++) {
            this.stars[i] = {};
            this.stars[i].x = getRandomNum(segmentSize * i, segmentSize * (i + 1));
            this.stars[i].y = getRandomNum(0, NightMode.config.STAR_MAX_Y);
            this.stars[i].opacity = 0.5 + 0.5 * Math.random();

            let fading_range = 1/2 * NightMode.config.STAR_MAX_Y;
            if (this.stars[i].y > 1/2 * NightMode.config.STAR_MAX_Y) {
              this.stars[i].opacity *= 2 - this.stars[i].y/fading_range;
            }

            if (IS_HIDPI) {
              this.stars[i].sourceY = N7e.spriteDefinition.HDPI.STAR.y +
              NightMode.config.STAR_SIZE * 2 * getRandomNum(0, 3);
            }/* else {
              this.stars[i].sourceY = N7e.spriteDefinition.LDPI.STAR.y +
              NightMode.config.STAR_SIZE * i;
            }*/
          }
        },

        reset: function () {
          this.nextPhase = 0;
          this.update(false);
        }
    };


    //******************************************************************************

    /**
     * Horizon Line.
     * Consists of two connecting lines. Randomly assigns a flat / bumpy horizon.
     * @param {HTMLCanvasElement} canvas
     * @param {Object} spritePos Horizon position in sprite.
     * @constructor
     */
    function HorizonLine(canvas, spritePos) {
      this.spritePos = spritePos;
      this.canvas = canvas;
      this.canvasCtx = canvas.getContext('2d');
      this.sourceDimensions = {};
      this.dimensions = HorizonLine.dimensions;
      this.sourceXPos = [this.spritePos.x, this.spritePos.x +
        this.dimensions.WIDTH];
      this.xPos = [];
      this.yPos = 0;
      this.bumpThreshold = 0.5;

      this.setSourceDimensions();
      this.draw();
    };


    /**
     * Horizon line dimensions.
     * @enum {number}
     */
    HorizonLine.dimensions = {
      WIDTH: 600,
      HEIGHT: 23,
      YPOS: N7e.defaultDimensions.HEIGHT-23
    };


    HorizonLine.prototype = {
        /**
         * Set the source dimensions of the horizon line.
         */
        setSourceDimensions: function () {
          for (var dimension in HorizonLine.dimensions) {
            if (IS_HIDPI) {
              if (dimension != 'YPOS') {
                this.sourceDimensions[dimension] =
                  HorizonLine.dimensions[dimension] * 2;
              }
            } else {
              this.sourceDimensions[dimension] =
                HorizonLine.dimensions[dimension];
            }
            this.dimensions[dimension] = HorizonLine.dimensions[dimension];
          }

          this.xPos = [0, HorizonLine.dimensions.WIDTH];
          this.yPos = HorizonLine.dimensions.YPOS;
        },

        /**
         * Return the crop x position of a type.
         */
        getRandomType: function () {
            return Math.random() > this.bumpThreshold ? this.dimensions.WIDTH : 0;
        },

        generateGroundCache: function() {
          if (!this.groundCanvas) {
            this.groundCanvas = document.createElement('canvas');
            this.groundCanvas.width = N7e.defaultDimensions.WIDTH;
            this.groundCanvas.height = 25 * 200;
            this.grCtx = this.groundCanvas.getContext('2d');
          }

          this.grCtx.clearRect(0, 0, N7e.defaultDimensions.WIDTH, this.groundCanvas.height);
          this.grMode = N7e.config.SHOW_SEPIA;

          this.grCtx.save();
          this.grCtx.translate(0,25 - N7e.defaultDimensions.HEIGHT);
          for (let i = 0; i < 200; i++) {
              this.drawGround(this.grCtx, i);
              this.grCtx.translate(0,25);
          }
          this.grCtx.restore();
        },

        drawGround: function(canvasCtx, spinner) {
          canvasCtx.save();
          canvasCtx.lineWidth = 5;
          canvasCtx.lineCap = 'butt';
          for ( let
            scale = 1.02, //Perspective
            step = 2,
            pwStep = Math.pow(scale, step),
            y = this.yPos + 12,
            i = -8,
            alphaStep = 0.15 * step / (N7e.defaultDimensions.HEIGHT - y),
            pw = Math.pow(scale,i),
            width = HorizonLine.dimensions.WIDTH;

                y + i < N7e.defaultDimensions.HEIGHT + this.canvasCtx.lineWidth;

                    i += step, pw *= pwStep ) {

            let width = HorizonLine.dimensions.WIDTH / pw;

            canvasCtx.save();
            canvasCtx.scale(pw, 1);
//            this.canvasCtx.transform(pw,0,0,1,0,0);

            // Draw grasses
            if (N7e.config.SHOW_SEPIA == 9) {
              if (!this.grassMap) {
                this.grassMap = [];
                this.grassMapOffset = [];
                for(let g = 0; g<10; g++) {
                  let l = [];
                  let sum;
                  let n;
                  this.grassMapOffset.push(getRandomNum(0,4));
                  let gr = false;

                  sum = 100;
                  do {
                    n = gr ? getRandomNum(3,5) : getRandomNum(0,1);
                    gr = !gr;
                    if (sum < n) {
                      n = sum;
                    }
                    sum -= n;
                    l.push(n);
                  } while (sum > 0);

                  sum = 100;
                  do {
                    n = gr ? getRandomNum(2,8) : getRandomNum(1,2);
                    gr = !gr;
                    if (sum < n) {
                      n = sum;
                    }
                    sum -= n;
                    l.push(n);
                  } while (sum > 0);

                  if (l.length%2 != 0) l.push(0);

                  this.grassMap.push(l);
                }
              }

              canvasCtx.strokeStyle = "rgba(32,128,0,"+(alphaStep * (i+8))+")";
              let line;
              let grassH = 1+Math.ceil(1.2 * (i+8)/4);

              for (let r = 0; r < 5; r++,grassH *= 0.75) {
                line = (i+8+r)%10;
                canvasCtx.setLineDash(this.grassMap[line]);
                canvasCtx.lineWidth = grassH;
                canvasCtx.beginPath();
                canvasCtx.moveTo(0, y + i - grassH +3);
                canvasCtx.lineTo(width, y + i - grassH +3);
                canvasCtx.lineDashOffset = 2*(r-2) -spinner - width/2 + this.grassMapOffset[line];
                canvasCtx.stroke();
              }

            } else { // Draw stripes

  //            canvasCtx.setLineDash([45,55,35,65]);
              canvasCtx.setLineDash([70,30]);
              canvasCtx.lineWidth = step;
              canvasCtx.strokeStyle = "rgba(200,200,0,"+(alphaStep/2 * (i+8))+")";

              for (let s = 0; s <= 16; s+=2) {
                canvasCtx.beginPath();
                canvasCtx.moveTo(0, y + i);
                canvasCtx.lineTo(width, y + i);
                canvasCtx.lineDashOffset = -spinner + s + Math.floor(i*i/8) - width/2;
                canvasCtx.stroke();
              }
            }

            canvasCtx.restore();
          }
          canvasCtx.restore();
        },

        /**
         * Draw the horizon line.
         */
        draw: function () {
          this.canvasCtx.drawImage(N7e.imageSprite, this.sourceXPos[0],
            this.spritePos.y,
            this.sourceDimensions.WIDTH, this.sourceDimensions.HEIGHT,
            this.xPos[0], this.yPos,
            this.dimensions.WIDTH, this.dimensions.HEIGHT);

          this.canvasCtx.drawImage(N7e.imageSprite, this.sourceXPos[1],
            this.spritePos.y,
            this.sourceDimensions.WIDTH, this.sourceDimensions.HEIGHT,
            this.xPos[1], this.yPos,
            this.dimensions.WIDTH, this.dimensions.HEIGHT);

          if (N7e.config.SHOW_SEPIA == 1) return;

          if (N7e.config.SHOW_SEPIA != this.grMode) {
            this.generateGroundCache();
          }

          this.canvasCtx.save();
          if (N7e.config.SHOW_SEPIA == 0)
            this.canvasCtx.globalCompositeOperation = 'multiply';
          this.canvasCtx.drawImage(this.groundCanvas,
              0, (Math.floor(this.xPos[0] + 600) % 200) * 25 + 4,
              N7e.defaultDimensions.WIDTH, 22,
              0, N7e.defaultDimensions.HEIGHT - 21,
              N7e.defaultDimensions.WIDTH, 23);
          this.canvasCtx.restore();

        },

        /**
         * Update the x position of an indivdual piece of the line.
         * @param {number} pos Line position.
         * @param {number} increment
         */
        updateXPos: function (pos, increment) {
          var line1 = pos;
          var line2 = pos == 0 ? 1 : 0;

          this.xPos[line1] -= increment;
          this.xPos[line2] = this.xPos[line1] + this.dimensions.WIDTH;

          if (this.xPos[line1] <= -this.dimensions.WIDTH) {
            this.xPos[line1] += this.dimensions.WIDTH * 2;
            this.xPos[line2] = this.xPos[line1] - this.dimensions.WIDTH;
            this.sourceXPos[line1] = this.getRandomType() + this.spritePos.x;
          }
        },

        /**
         * Update the horizon line.
         * @param {number} deltaTime
         * @param {number} speed
         */
        update: function (deltaTime, speed) {
          var increment = speed * FPS / 1000 * deltaTime;

          if (this.xPos[0] <= 0) {
            this.updateXPos(0, increment);
          } else {
            this.updateXPos(1, increment);
          }
          this.draw();
        },

        /**
         * Reset horizon to the starting position.
         */
        reset: function () {
          this.xPos[0] = 0;
          this.xPos[1] = HorizonLine.dimensions.WIDTH;
        }
    };


    //******************************************************************************

    /**
     * Horizon background class.
     * @param {HTMLCanvasElement} canvas
     * @param {Object} spritePos Sprite positioning.
     * @param {Object} dimensions Canvas dimensions.
     * @param {number} gapCoefficient
     * @constructor
     */
    function Horizon(canvas, spritePos, dimensions, gapCoefficient) {
      this.canvas = canvas;
      this.canvasCtx = this.canvas.getContext('2d');
      this.config = Horizon.config;
      this.dimensions = dimensions;
      this.gapCoefficient = gapCoefficient;
      this.obstacles = [];
      this.obstacleHistory = [];
      this.horizonOffsets = [0, 0];
      this.cloudFrequency = this.config.CLOUD_FREQUENCY;
      this.spritePos = spritePos;
      this.nightMode = null;

      // Cloud
      this.clouds = [];
      this.cloudSpeed = this.config.BG_CLOUD_SPEED;

      this.mountains = [];
      this.mountainSpeed = 6;

      // Horizon
      this.horizonLine = null;
      this.init();
    };


    /**
     * Horizon config.
     * @enum {number}
     */
    Horizon.config = {
      BG_CLOUD_SPEED: 7,
      BUMPY_THRESHOLD: .3,
      CLOUD_FREQUENCY: .5,
      HORIZON_HEIGHT: 16,
      MAX_CLOUDS: 6
    };


    Horizon.prototype = {
        /**
         * Initialise the horizon. Just add the line and a cloud. No obstacles.
         */
        init: function () {
          this.addCloud();
          this.horizonLine = new HorizonLine(this.canvas, this.spritePos.HORIZON);
          this.nightMode = new NightMode(this.canvas, this.spritePos.MOON,
            this.dimensions.WIDTH);
        },

        /**
         * @param {number} deltaTime
         * @param {number} currentSpeed
         * @param {boolean} updateObstacles Used as an override to prevent
         *     the obstacles from being updated / added. This happens in the
         *     ease in section.
         * @param {boolean} showNightMode Night mode activated.
         */
        update: function (deltaTime, currentSpeed, updateObstacles, showNightMode, alpha) {
          this.runningTime += deltaTime;
          this.nightMode.update(showNightMode);
          this.updateMountains(deltaTime, currentSpeed);
          this.updateClouds(deltaTime, currentSpeed);
          this.horizonLine.update(deltaTime, currentSpeed);

          if (updateObstacles) {
            if (alpha == 1) {
              this.updateObstacles(deltaTime, currentSpeed);
            } else {
              this.canvasCtx.save();
              this.canvasCtx.globalAlpha = alpha;
              this.updateObstacles(deltaTime, currentSpeed);
              this.canvasCtx.restore();
            }
          }
        },

        /**
         * Update the cloud positions.
         * @param {number} deltaTime
         * @param {number} currentSpeed
         */
        updateClouds: function (deltaTime, speed) {
          var cloudSpeed = this.cloudSpeed / 1000 * deltaTime * speed;
          var numClouds = this.clouds.length;

          if (numClouds) {
            for (var i = numClouds - 1; i >= 0; i--) {
              this.clouds[i].update(cloudSpeed);
            }

            var lastCloud = this.clouds[numClouds - 1];

            // Check for adding a new cloud.
            if (numClouds < this.config.MAX_CLOUDS &&
                (this.dimensions.WIDTH - lastCloud.xPos) > lastCloud.cloudGap &&
                this.cloudFrequency > Math.random()) {
              this.addCloud();
            }

            // Remove expired clouds.
            this.clouds = this.clouds.filter(function (obj) {
              return !obj.remove;
            });
          } else {
            this.addCloud();
          }
        },

        updateMountains: function (deltaTime, speed) {
          var mountainSpeed = this.mountainSpeed / 1000 * deltaTime * speed;
          var numMountains = this.mountains.length;

          if (numMountains) {
            for (let j = 0; j < 2; j++) {
              for (let i = numMountains - 1; i >= 0; i--) {
                if (this.mountains[i].depth == j) {
                  this.mountains[i].update(mountainSpeed * (j ? 1.1 : 1));
                }
              }
            }

            var lastMountain = this.mountains[numMountains - 1];

            if (numMountains < 10 &&
                (this.dimensions.WIDTH - lastMountain.xPos) > lastMountain.mountainGap &&
                this.mountainFrequency > Math.random()) {
              this.addMountains();
            }

            this.mountains = this.mountains.filter(function (obj) {
              return !obj.remove;
            });
          } else {
            this.addMountains();
          }
        },

        /**
         * Update the obstacle positions.
         * @param {number} deltaTime
         * @param {number} currentSpeed
         */
        updateObstacles: function (deltaTime, currentSpeed) {
          // Obstacles, move to Horizon layer.
          for (var i = 0; i < this.obstacles.length; i++) {
            var obstacle = this.obstacles[i];
            obstacle.update(deltaTime, currentSpeed);
          }

          this.obstacles = this.obstacles.filter(obstacle => !obstacle.remove);

          if (this.obstacles.length > 0) {
            var lastObstacle = this.obstacles[this.obstacles.length - 1];

            if (lastObstacle && !lastObstacle.followingObstacleCreated &&
                lastObstacle.isVisible() &&
                (lastObstacle.xPos + lastObstacle.width + lastObstacle.gap) <
                this.dimensions.WIDTH) {
              this.addNewObstacle(currentSpeed);
              lastObstacle.followingObstacleCreated = true;
            }
          } else {
            // Create new obstacles.
            this.addNewObstacle(currentSpeed);
          }
        },

        removeFirstObstacle: function () {
          this.obstacles.shift();
        },

        /**
         * Add a new obstacle.
         * @param {number} currentSpeed
         */
        addNewObstacle: function (currentSpeed) {
          var obstacleTypeIndex = getRandomNum(0, Obstacle.types.length - 1);
          var obstacleType = Obstacle.types[obstacleTypeIndex];

          // Check for multiples of the same type of obstacle.
          // Also check obstacle is available at current speed.
          if (this.duplicateObstacleCheck(obstacleType.type) ||
          currentSpeed < obstacleType.minSpeed) {
            this.addNewObstacle(currentSpeed);
          } else {
            var obstacleSpritePos = this.spritePos[obstacleType.type];

            if (obstacleType.type == 'BICYCLE') {
              N7e().playSound(N7e().soundFx.SOUND_BICYCLE,0.5,false,0,1);
            }
            this.obstacles.push(new Obstacle(this.canvasCtx, obstacleType,
              obstacleSpritePos, this.dimensions,
              this.gapCoefficient, currentSpeed, obstacleType.width));

            this.obstacleHistory.unshift(obstacleType.type);

            if (this.obstacleHistory.length > 1) {
              this.obstacleHistory.splice(N7e.config.MAX_OBSTACLE_DUPLICATION);
            }
          }
        },

        /**
         * Returns whether the previous two obstacles are the same as the next one.
         * Maximum duplication is set in config value MAX_OBSTACLE_DUPLICATION.
         * @return {boolean}
         */
        duplicateObstacleCheck: function (nextObstacleType) {
          var duplicateCount = 0;

          for (var i = 0; i < this.obstacleHistory.length; i++) {
            duplicateCount = this.obstacleHistory[i] == nextObstacleType ?
              duplicateCount + 1 : 0;
          }
          return duplicateCount >= N7e.config.MAX_OBSTACLE_DUPLICATION;
        },

        /**
         * Reset the horizon layer.
         * Remove existing obstacles and reposition the horizon line.
         */
        reset: function () {
          this.obstacles = [];
          this.horizonLine.reset();
          this.nightMode.reset();
        },

        /**
         * Update the canvas width and scaling.
         * @param {number} width Canvas width.
         * @param {number} height Canvas height.
         */
        resize: function (width, height) {
          this.canvas.width = width;
          this.canvas.height = height;
        },

        /**
         * Add a new cloud to the horizon.
         */
        addCloud: function () {
          let type = getRandomNum(0,this.spritePos.CLOUD.y.length - 1);
          let len = this.clouds.length;
          if (len >= 2) {
            if (this.clouds[len-1].type == this.clouds[len-2].type && this.clouds[len-2].type == type) {
              type++;
              type %= this.spritePos.CLOUD.y.length;
            }
          }

          this.clouds.push(new Cloud(this.canvas, this.spritePos.CLOUD,
            this.dimensions.WIDTH, type));
        },

        addMountain: function(distance, level) {
          let mountain = new Mountain(this.canvas, distance, level);
          this.mountains.push(mountain);

          let adjusted;
          let mountains = this.mountains;
          do {
            adjusted = false;
            let untested = [];

            mountains.forEach(mnt => {
              if (mountain.xPos > mnt.xPos && mountain.xPos + mountain.width < mnt.xPos + mnt.width) {
                mountain.xPos +=  mnt.width - mountain.width/2 + getRandomNum(0,100);
                adjusted = true;
              } else {
                untested.push(mnt);
              }
            });
            mountains = untested;
          } while (adjusted);
        },

        addMountains: function () {
          this.addMountain(this.dimensions.WIDTH + getRandomNum(0,1000), 0);
          this.addMountain(this.dimensions.WIDTH + getRandomNum(100,900), 0);
          this.addMountain(this.dimensions.WIDTH + getRandomNum(200,800), 0);
          this.addMountain(this.dimensions.WIDTH + getRandomNum(0,1000), 0);
          this.addMountain(this.dimensions.WIDTH + getRandomNum(100,900), 1);
          this.addMountain(this.dimensions.WIDTH + getRandomNum(200,800), 1);
          this.addMountain(this.dimensions.WIDTH + getRandomNum(300,700), 1);
        },
    };
})();


function onDocumentLoad() {
  new N7e('.interstitial-wrapper');
}

document.addEventListener('DOMContentLoaded', onDocumentLoad);
