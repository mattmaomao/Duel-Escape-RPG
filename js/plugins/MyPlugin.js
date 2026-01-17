(function () {
  // variables
  var crystalEvents = [];
  var spikeEvents = [];
  var spikeSwitchID = [21, 22, 23, 24, 25];
  var spikeSwitches = [false, false, false, false, false];

  // Plugin Command
  var _Game_Interpreter_pluginCommand =
    Game_Interpreter.prototype.pluginCommand;
  Game_Interpreter.prototype.pluginCommand = function (command, args) {
    _Game_Interpreter_pluginCommand.call(this, command, args);
    var eventId = this._eventId;

    if (command === "InitPuzzle") {
      initPuzzle();
    }
    if (command === "ResetPuzzle") {
      resetPuzzle();
    }
    if (command === "triggerCrystal") {
      triggerCrystal(eventId);
    }
    if (command === "triggerSpike") {
      triggerSpike();
    }
  };

  // initialize puzzle room
  function initPuzzle() {
    // set playing puzzle room switch
    $gameSwitches.setValue(18, true);
    // check puzzle room progress
    switch ($gameVariables.value(15)) {
      case 0:
        saveRocksPos();
        console.log("initialized rock puzzle");
        break;
      case 1:
        saveCrystalState();
        console.log("initialized crystal puzzle");
        break;
      case 2:
        saveSpikeEvents();
        console.log("initialized spike puzzle");
        break;
      case 3:
        // finished, do nothing
        break;
      default:
        break;
    }
  }

  // reset puzzle room
  function resetPuzzle() {
    // check puzzle room progress
    switch ($gameVariables.value(15)) {
      case 0:
        resetRocks();
        console.log("reset rock puzzle");
        break;
      case 1:
        resetCrystalState();
        console.log("reset crystal puzzle");
        break;
      case 2:
        resetSpikeSwitch();
        resetPlayerPos();
        console.log("reset spike puzzle");
        break;
      case 3:
        // finished, do nothing
        break;
      default:
        break;
    }
  }

  // return player to anchor
  function resetPlayerPos() {
    $gameMap.events().forEach(function (event) {
      if (event && event.event().meta.player_anchor) {
        $gamePlayer.locate(event._x, event._y);
        $gamePlayer.setDirection(8);
      }
    });
  }

  // store original position of rocks
  function saveRocksPos() {
    var rockEvents = [];
    $gameMap.events().forEach(function (event) {
      if (event && event.event().meta.rock) {
        rockEvents.push(event);
      }
    });

    rockEvents.forEach(function (rock) {
      rock._originalX = rock.x;
      rock._originalY = rock.y;
    });
  }

  // reset the position of rocks
  function resetRocks() {
    var rockEvents = [];
    $gameMap.events().forEach(function (event) {
      if (event && event.event().meta.rock) {
        rockEvents.push(event);
      }
    });

    rockEvents.forEach(function (rock) {
      rock.locate(rock._originalX, rock._originalY);
    });

    resetPlayerPos();
  }

  // store crystal self switch
  function saveCrystalState() {
    crystalEvents = [];
    $gameMap.events().forEach(function (event) {
      if (event && event.event().meta.crystal) {
        crystalEvents.push(event);
        var key = [event._mapId, event._eventId, "A"];
        $gameSelfSwitches.setValue(key, false);
      }
    });

    crystalEvents.forEach(function (event) {
      var key = [event._mapId, event._eventId, "A"];
      if (event && event.event().meta.green) {
        $gameSelfSwitches.setValue(key, true);
      }
    });
  }

  // reset crystal self switch
  function resetCrystalState() {
    crystalEvents.forEach(function (event) {
      var key = [event._mapId, event._eventId, "A"];
      if (event && event.event().meta.green) {
        $gameSelfSwitches.setValue(key, true);
      }
    });

    resetPlayerPos();
  }

  // touch a crystal
  function triggerCrystal(eventId) {
    // flip self switch of the crystal and other events next to it
    var crystalId = eventId;
    var crystal = $gameMap.event(crystalId);
    if (crystal) {
      var key = [crystal._mapId, crystal._eventId, "A"];
      $gameSelfSwitches.setValue(key, !$gameSelfSwitches.value(key));
      // flip self switch of adjacent events
      var adjacentOffsets = [
        { dx: 0, dy: -1 },
        { dx: 0, dy: 1 },
        { dx: -1, dy: 0 },
        { dx: 1, dy: 0 },
      ];
      adjacentOffsets.forEach(function (offset) {
        crystalEvents.forEach((event) => {
          if (
            event._eventId != crystalId &&
            event.x === crystal.x + offset.dx &&
            event.y === crystal.y + offset.dy
          ) {
            var key = [event._mapId, event._eventId, "A"];
            $gameSelfSwitches.setValue(key, !$gameSelfSwitches.value(key));
          }
        });
      });

      checkAllCrystalsActivated();
    }
  }

  // check if all crystals are activated
  function checkAllCrystalsActivated() {
    var allGreen = true;
    crystalEvents.forEach((crystal) => {
      var key = [crystal._mapId, crystal._eventId, "A"];
      if (!$gameSelfSwitches.value(key)) {
        allGreen = false;
      }
    });
    // all crystals are activated
    if (allGreen) {
      $gameTemp.reserveCommonEvent(11);
    }
  }

  // save spike events
  function saveSpikeEvents() {
    spikeEvents = [];
    $gameMap.events().forEach(function (event) {
      if (event && event.event().meta.spike) {
        spikeEvents.push(event);
      }
    });

    resetSpikeSwitch();
  }

  // reset spike switches
  function resetSpikeSwitch() {
    spikeSwitches = [false, false, false, false, false];
    spikeSwitchID.forEach((switchId) => {
      $gameSwitches.setValue(switchId, false);
    });
    triggerSpike();
  }

  // trigger spike base on switches
  function triggerSpike() {
    // check which switch changed
    var idx = -1;
    for (var i = 0; i < spikeSwitchID.length; i++) {
      if ($gameSwitches.value(spikeSwitchID[i]) != spikeSwitches[i]) {
        idx = i;
        spikeSwitches[i] = $gameSwitches.value(spikeSwitchID[i]);
        break;
      }
    }

    // toggle spikes accordingly
    if (idx != -1) {
      spikeEvents.forEach((spike) => {
        if (spike.event().meta["s" + (idx + 1).toString()]) {
          var key = [spike._mapId, spike._eventId, "A"];
          $gameSelfSwitches.setValue(key, !$gameSelfSwitches.value(key));
          $gameSelfSwitches.setValue([spike._mapId, spike._eventId, "B"], true);
        }
      });
    }
  }

  // Alias the update method of Scene_Map to check for key press
  var _Scene_Map_update = Scene_Map.prototype.update;
  Scene_Map.prototype.update = function () {
    _Scene_Map_update.call(this);
    // Check if 'R' key is pressed
    if (Input.isTriggered("reset")) {
      $gameTemp.reserveCommonEvent(9);
    }
  };
})();
