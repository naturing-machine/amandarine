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

import { N7e } from './n7e.js';
import { Text } from './modules/text.js';

export class OnDaRun {
}

OnDaRun.DefaultWidth = 600;
OnDaRun.DefaultHeight = 200;

OnDaRun.classes = {
  INVERTED: 'inverted',
};

OnDaRun.events = {
  ANIM_END: 'webkitAnimationEnd',
  CLICK: 'click',
  KEYDOWN: 'keydown',
  KEYUP: 'keyup',
  MOUSEDOWN: 'mousedown',
  MOUSEUP: 'mouseup',
  MOUSEOUT: 'mouseout',
  RESIZE: 'resize',
  TOUCHSTART: 'touchstart',
  TOUCHEND: 'touchend',
  TOUCHMOVE: 'touchmove',
  TOUCHCANCEL: 'touchcancel',
  VISIBILITY: 'visibilitychange',
  BLUR: 'blur',
  FOCUS: 'focus',
  LOAD: 'load',
  CONSOLEDOWN: 'customconsoledown',
  CONSOLEUP: 'customconsoleup',
  NOTIFICATION: 'notification',
};

OnDaRun.spriteDefinition = {
  CRASH: { x: 37, y: 40},
  DUST: { x: 776, y: 2 },
  RESTART: { x: 0, y: 40 },
  TEXT_SPRITE: { x: 0, y: 0 },
};

OnDaRun.keycodes = {
  JUMP: { '38': 1, '32': 1, '39': 1 },  // Up, spacebar, Right
  SLIDE: { '37': 1, '40': 1 },  // Left, Down
  RESTART: { '13': 1 }  // Enter
};

class GameModeConfiguration {
  constructor( title, icon, acceleration ){
    this.title = title;
    this.icon = icon;
    this.acceleration = acceleration;
  }
}

OnDaRun.gameModeConfiguration = {
  GAME_A: new GameModeConfiguration('GAME A','gameA', 0.00050/16 ),
  GAME_B: new GameModeConfiguration('GAME B','gameB', 0.00050/4 ),
  GAME_S: new GameModeConfiguration('SITUATION HALL','gameS', 0.00050/16 ),
};

OnDaRun.Configurations = {
  ACCELERATION: OnDaRun.gameModeConfiguration.GAME_A.acceleration,
  BG_CLOUD_SPEED: 0.2,
  BOTTOM_PAD: 10,
  CLEAR_TIME: 3000,
  CLOUD_FREQUENCY: 0.5,
  TO_SCORE: 0.025,
  CRASH_WIDTH: 32,
  CRASH_HEIGHT: 32,
  GAME_MODE: 'GAME_A',
  GAME_MODE_REPLAY: false,
  GAMEOVER_CLEAR_TIME: 1500,
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
  SPEED: 6,
  SHOW_COLLISION: false,
  GRAPHICS_MODE: 0,
  GRAPHICS_MODE_SETTINGS: [
    { /*0*/
      GRAPHICS_GROUND_TYPE: 'GRASS',
      GRAPHICS_DESKTOP_LIGHT: 'NONE',
      GRAPHICS_CLOUDS: 10,
      GRAPHICS_CLOUDS_TYPE: 'DEPTH',
      GRAPHICS_STARS: 10,
      GRAPHICS_STARS_TYPE: 'SHINE',
      GRAPHICS_MOUNTAINS: 10,
      GRAPHICS_MOUNTAINS_TYPE: 'NORMAL',
      GRAPHICS_MOON: 'SHINE',
      GRAPHICS_SKY_GRADIENT: 'GRADIENT',
      GRAPHICS_SKY_STEPS: 10,
      GRAPHICS_SLIDE_STEPS: 4,
      GRAPHICS_DAY_LIGHT: 0,
      GRAPHICS_DUST: 'DUST',
    },
    { /*1*/
      GRAPHICS_GROUND_TYPE: 'STRIPES',
      GRAPHICS_DESKTOP_LIGHT: 'NONE',
      GRAPHICS_CLOUDS: 8,
      GRAPHICS_CLOUDS_TYPE: 'DEPTH',
      GRAPHICS_STARS: 8,
      GRAPHICS_STARS_TYPE: 'SHINE',
      GRAPHICS_MOUNTAINS: 8,
      GRAPHICS_MOUNTAINS_TYPE: 'PLAIN',
      GRAPHICS_MOON: 'SHINE',
      GRAPHICS_SKY_GRADIENT: 'GRADIENT',
      GRAPHICS_SKY_STEPS: 10,
      GRAPHICS_SLIDE_STEPS: 4,
      GRAPHICS_DAY_LIGHT: 0,
      GRAPHICS_DUST: 'DUST',
    },
    { /*2*/
      GRAPHICS_GROUND_TYPE: 'DIRT',
      GRAPHICS_DESKTOP_LIGHT: 'NONE',
      GRAPHICS_CLOUDS: 0,
      GRAPHICS_CLOUDS_TYPE: 'NORMAL',
      GRAPHICS_STARS: 0,
      GRAPHICS_STARS_TYPE: 'NORMAL',
      GRAPHICS_MOUNTAINS: 4,
      GRAPHICS_MOUNTAINS_TYPE: 'PLAIN',
      GRAPHICS_MOON: 'NORMAL',
      GRAPHICS_SKY_GRADIENT: 'SOLID',
      GRAPHICS_SKY_STEPS: 5,
      GRAPHICS_SLIDE_STEPS: 1,
      GRAPHICS_DAY_LIGHT: 0,
      GRAPHICS_DUST: 'NONE',
    },
  ],
  GRAPHICS_DISPLAY_INFO: 'NO',
  GRAPHICS_SUBTITLES: 'YES',
  GRAPHICS_MODE_OPTIONS: {
    GRAPHICS_GROUND_TYPE: ['DIRT','STRIPES','GRASS'],
    GRAPHICS_DESKTOP_LIGHT: ['NONE','LIGHT'],
    GRAPHICS_CLOUDS: { min: 0, max: 10, step: 1 },
    GRAPHICS_CLOUDS_TYPE: ['NORMAL','DEPTH'],
    GRAPHICS_CLOUDS_TYPE: ['NORMAL','DEPTH'],
    GRAPHICS_STARS:  { min: 0, max: 10, step: 1 },
    GRAPHICS_STARS_TYPE: ['NONE','NORMAL','SHINE'],
    GRAPHICS_MOUNTAINS: { min: 0, max: 10, step: 1 },
    GRAPHICS_MOUNTAINS_TYPE: ['NONE','PLAIN','NORMAL'],
    GRAPHICS_MOON: ['NONE','NORMAL','SHINE'],
    GRAPHICS_SKY_GRADIENT: ['SINGLE','SOLID','GRADIENT'],
    GRAPHICS_SKY_STEPS: { min: 0, max: 10, step: 1 },
    GRAPHICS_SLIDE_STEPS: { min: 0, max: 6, step: 1 },
    GRAPHICS_DAY_LIGHT: { min: 0, max: 4, step: 1 },
    GRAPHICS_DUST: ['NONE','DUST'],
    GRAPHICS_SUBTITLES: ['YES','NO'],
    GRAPHICS_DISPLAY_INFO: ['YES','NO'],
  },
  SOUND_EFFECTS_VOLUME: 5,
  SOUND_MUSIC_VOLUME: 5,
  SOUND_SYSTEM_VOLUME: 10,
  SOUND_OPTIONS: {
    SOUND_EFFECTS_VOLUME: { min: 0, max: 10, step: 1 },
    SOUND_MUSIC_VOLUME: { min: 0, max: 10, step: 1 },
    SOUND_SYSTEM_VOLUME: { min: 0, max: 10, step: 1 },
  },
  NATHERINE_LYRICS: [
    0.7, "♬ Natherine ♬",
    3.3, "she is all they claim",
    6, "With her eyes of night",
    7.8, "and lips as bright as flame",
    11.4, "Natherine",
    13.6, "when she dances by",
    16.6, "Senoritas stare and caballeros sigh",
    22.0, "And I've seen",
    24.6, "toasts to Natherine",
    27.3, "Raised in every bar",
    29.2, "across the Argentine",
    32.7, "Yes, she has them all",
    34.3, Text.$`${'tangerine'} on da run ${'tangerine'}`,
    35.6, Text.$`And their ${'heart'}${'heart'}${'heart'}${'heart'} belong to just one`,
    38.4, Text.$`Their ${'heart'}${'heart'}${'heart'}${'heart'} belong to`,
    40, Text.$`${'natA'} Natherine ${'natB'}`,
    45, null,
  ],

};
