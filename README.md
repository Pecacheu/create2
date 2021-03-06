# Create2 Library
### Node.js API for Controlling Roomba 600 Series & Create 2

Install with `npm install create2`, then include with `create = require('create2')`

Check it out [on YouTube](http://youtu.be/lE6Q39KX6Ag)!

## Library Functions:

- **create.ports(callback)**

Lists all ports available on the computer. The only parameter to *callback* is an array of ports. If no ports were found, the array will be empty.

- **create.prompt(callback)**

Shows a dialogue listing available ports and asks the user to select one, before automatically calling **create.open**. While in the dialogue, the user can quit the application by typing `quit` or `exit`.

- **create.open(port, callback=null)**

Opens the port to a robot object. An optional *callback* will be called when the robot is ready to receive commands. The callback's parameter will be the new *Robot* object.

Optionally, the *port* argument can be Duplex node stream instead of a port, allowing you to use a custom library to communicate with the robot. If you need the Roomba's default serial settings, use the macro **create.serial**, which is initialized to `{baudRate:115200, dataBits:8, parity:'none', stopBits:1, flowControl:0}`

- **create.debug** and **create.inputMode**

These variables control the library's debugging mode. More info is available in the `test.js` example.

## Robot Control Functions:

For all functions with parameters, setting any parameter to `null` will use it's previous or default value. The variables that store these previous values are also accessible, and are listed next to each function. Furthermore, calling a function without supplying any parameters will re-send the command.

#### Status Control:

- **robot.reset()** Hard-resets the robot, as if the battery had been removed and replaced.
- **robot.start()** Starts communication or sets the mode back to *PASSIVE*. This command is called for you automatically in `create.open`.
- **robot.stop()** Stops communication with the robot. You'll have to send a `start` again to resume communication.
- **robot.safe()** Sets the mode to *SAFE*. You have complete control of the robot unless a safety sensor is triggered.
- **robot.full()** Sets the mode to *FULL*. You have complete control of the robot even if safety sensors are triggered.
- **robot.power()** This command powers down the Roomba, however it does not close the serial connection.
- **robot.close()** Close the serial connection to the robot. It is recommended to put the robot back in *PASSIVE* mode first.

**Note:** *SAFE* mode is identical to *FULL* mode, with the exception that if a safety sensor (such as a cliff sensor) is triggered, the robot reverts back to *PASSIVE* mode.

#### Passive Mode:

- **robot.clean()** Initiates a cleaning cycle, as if the `clean` button was pressed.
- **robot.max()** Initiates a max cleaning cycle, cleaning forever until the battery dies.
- **robot.spot()** Initiates a spot cleaning cycle, as if the `spot` button was pressed.
- **robot.autoDock()** Initiates automatic charger docking, as if the `dock` button was pressed.

**Note:** If any of these functions are called while the robot is not in *PASSIVE* mode, they will set the robot to *PASSIVE* mode automatically. Furthermore, they can be canceled by taking the robot out of *PASSIVE* mode.

#### Motor Control:

- **robot.drive(velocity, radius)** - Value Storage: **robot.motorVel**, **robot.motorRad**

Drives at velocity (`-500 to 500, mm/s`) with the given radius (`-2000 to 2000, mm`), measured from the center of the turning circle to the center of the robot. This means that a smaller radius will make Roomba turn more. `-1` will make Roomba turn-in-place to the left, while `1` will make Roomba turn-in-place to the right. A value of 32767 or 32768 will make Roomba drive straight.

- **robot.driveSpeed(left, right)** - Value Storage: **robot.motorLs**, **robot.motorRs**

Drives each motor at requested velocity (`-500 to 500, mm/s`).

- **robot.drivePower(left, right)** - Value Storage: **robot.motorL**, **robot.motorR**

Drives motors at requested power level (`-255 to 255, PWM`). This command drives the motors at a constant power instead of a constant speed. This means that the exact speed you're traveling could vary slightly depending on battery level and robot payload. If exact speed is not important, it's better to use this command.

- **robot.setMotor(motor, power)** - Value Storage: **robot.motorBrush**, **robot.motorSide**, **robot.motorBin**

Sets the power (`-255 to 255, PWM`) of the desired motor.

Here are the available motors on the Create 2:

| IDs     | Motor Description                   |
|:-------:|-------------------------------------|
| 'brush' | Main Brush                          |
| 'side'  | Side Brush                          |
| 'bin'   | Dust Bin Vacuum (can't be reversed) |

#### Lights & Sounds:

- **robot.setLeds(spot, dock, error, dirt, cleanColor, cleanIntensity)** - Value Storage: **robot.spotLed**, **robot.dockLed**, **robot.errorLed**, **robot.spotLed**, **robot.dockLed**, **robot.dirtLed**, **robot.cleanClr**, **robot.cleanInt**

Controls the Roomba's various face LEDs. On the Create 2, the error led is a red exclamation point **(!)**, the dirt led is a blue dot, and the button LEDs (spot and dock) are green. The clean button has a bicolor (red/green) LED, which is controlled with cleanColor (`0 to 255, Green to Red`) and cleanIntensity (`0 to 255, Brightness`). All other LEDs can only be turned on and off (`true or false`).

- **robot.setFaceLeds(sun, mon, tue, wed, thr, fri, sat, am, pm, colon)** - Value Storage: **robot.mon**, **robot.tue**, etc...

Sets the display's day-of-the-week, AM, PM, and colon LEDs (all red). LEDs can only be turned on and off (`true or false`).

- **robot.showText(text, interval, scrollIn=false, complete=null)** - Value Storage: **TBD**

Scroll any length of text across Roomba's 7-segment display, which can only show 4 characters at a time. Interval controls the delay, in milliseconds, between updates. **Text and interval are required parameters.**

If scrollIn is `true`, the text scrolls in and out until only the last character is visible.

For example, since the message length matches the length of the display, the following will show 'abcd' for 500ms then disappear: `robot.showText("abcd", 500)`

But setting scrollIn to `true` will make the message scroll fully in and out before disappearing: `robot.showText("abcd", 500, true)`

The optional complete callback is called when the text finishes scrolling, and has no parameters. Note that due to the nature of 7-segment displays, not all characters will display well. Characters are not case-sensitive.

- **robot.setDigitsRaw(d1, d2, d3, d4)** - Value Storage: **robot.d1**, **robot.d2**, **robot.d3**, **robot.d4**

Allows you to control the individual segments of Roomba's display. Each parameter is an array of 7 bits (`EX. [false,true,true,false,true,true,false]`), each of which represents a segment of the display as shown in this table:

|   | A |   |
|:-:|:-:|:-:|
| F |   | B |
|   | G |   |
| E |   | C |
|   | D |   |

- **robot.setSong(id, notes)** - Value Storage: **N/A**

Sets a song in the robot's memory with the given ID (`0 to 4, Song ID`) to be played later. Notes must be an array of the format: `[[note, duration],[note, duration],etc...]`

Each note is represented by it's MIDI note number (`31 to 127, MIDI Note`) and a duration (`0 to 255, 1/64s`). The maximum length of a song is 16 notes.

For example, the following will play C, E, G, then C again, holding each note for a 1/2 second:

`robot.setSong(0, [[72,32], [76,32], [79,32], [72,32]]); robot.play(0);`

- **robot.play(id)** - Value Storage: **robot.song**

Plays a song with the given song id.

#### Other:

- **robot.readEnable** The loop that reads and processes input from the robot's sensors can be disabled by setting this variable to `false`, saving resources and processing overhead. Note that disabling the read loop prevents all input from the robot from being updated.
- **robot.write(data)** Allows you to write various types of data, including bytes, byte arrays, and ASCII strings, directly to the robot's serial port. Note that sending mal-formatted OI commands can corrupt the serial stream.

## Robot Sensors:

There are several different ways for your code to respond to input from the robot. The best one to use varies depending on the application. The most common method is the onChange callback.

#### robot.onChange:

This callback is called whenever any input from the robot changes. It's only parameter, `changed`, is an object containing properties with the names of any sensor values that have changed. The values of theses properties are not important, and are always `true`, regardless of the actual value of the sensor. This allows you to do the following:

<pre>
//React to left bumper sensor:
robot.onChange = function(changed) {
  if(changed.bumpLeft && robot.data.bumpLeft == true) {
    //BumpLeft just changed, and the new value is true!
  }
};
</pre>

#### robot.data:

Now, here's where the real magic happens. This object contains up-to-date values of all available sensors, and can be read synchronously at any time. It's updated just before callbacks are called, so you can get current sensor values inside any callback.

#### robot.on:

This is an empty object that you can populate with callbacks. Each callback is called only when the value of it's sensor changes. The name of the callback determines what sensor it reacts to. These callbacks should have one parameter, `value`, which contains the current value of the sensor. Going back to our left bumper example:

<pre>
//React to left bumper sensor using robot.on:
robot.on.bumpLeft = function(value) {
  if(value == true) {
    //BumpLeft just changed, and the new value is true!
  }
};
</pre>

#### robot.onMotion:

This callback, which has no parameters, is for special sensors that output data differently. The values of these sensors is usually 0, but when action happens, they momentarily change to a positive or negative number, representing the relative *change* in value. Because of this, we call them **delta** properties. Delta properties need a different callback because when their value isn't 0, it represents change, even if the sensor's output hasn't changed since the last frame. Here's a simple example of how to keep track of a delta value:

<pre>
var angle = 0;
robot.onMotion = function() {
  angle += robot.delta.angle;
  console.log("Angle:", angle);
}
</pre>

#### robot.delta:

Similar to `robot.data`, but contains the current values of delta properties.

## List Of Sensors:

### Bump & Wheel Drop
- **bool** bumpLeft
- **bool** bumpRight
- **bool** dropLeft
- **bool** dropRight

### Cliff Sensors
- **bool** cliffLeft
- **bool** cliffFrontLeft
- **bool** cliffFrontRight
- **bool** cliffRight

###### Analog Signal (0-4095)
- **uint16** cliffLeftRaw
- **uint16** cliffFrontLeftRaw
- **uint16** cliffFrontRightRaw
- **uint16** cliffRightRaw

### IR Proximity Sensors
- **byte** irBump _(Full sensor array data)_
- **bool** irBumpLeft
- **bool** irBumpFrontLeft
- **bool** irBumpCenterLeft
- **bool** irBumpCenterRight
- **bool** irBumpFrontRight
- **bool** irBumpRight

###### Analog Signal (0-4095)
- **uint16** proxLeft
- **uint16** proxFrontLeft
- **uint16** proxCenterLeft
- **uint16** proxCenterRight
- **uint16** proxFrontRight
- **uint16** proxRight

### Other Sensors
- **bool** casterMotion
- **bool** wall _(Maybe for side brush?)_
- **bool** virtualWall _(Needs testing)_
- **uint16** wallRaw _(Usually from 0 to 150?)_
- **byte** airQuality _(Dirt sensor, normally 0)_

### Buttons
- **bool** clean
- **bool** spot
- **bool** dock
- **bool** day
- **bool** hour
- **bool** minute
- **bool** schedule _(Not working)_
- **bool** clock _(Not working)_

### Wheel Encoders
###### Encoder Clicks, 0-65535 (Overflows in both directions)
- **uint16** encoderLeft
- **uint16** encoderRight

### Motor Current
- **int16** currentLeft
- **int16** currentRight
- **int16** currentBrush
- **int16** currentSide

### Overcurrent
- **bool** overloadBrush
- **bool** overloadSide
- **bool** overloadLeft
- **bool** overloadRight

### IR Receivers
###### Uses proprietary protocol (0 when no IR signal)
- **byte** irOmni
- **byte** irLeft
- **byte** irRight

### Speaker
- **byte** songNumber
- **bool** playing

### Power Source
###### Indicates available power sources, not charging status.
- **bool** charger
- **bool** docked

### Battery
- **byte** chargeState _(0-5, see table)_
- **uint16** voltage _(mV, usually ~15000)_
- **int16** current _(mA, usually ~-200)_
- **int8** temperature _(°C)_
- **uint16** charge _(mAh)_
- **uint16** maxCharge _(mAh, should be ~2600)_

| # | Charge State |
|:-:|:-:|
| 0 | Not charging |
| 1 | Reconditioning Charging |
| 2 | Full charging |
| 3 | Trickle charging |
| 4 | Waiting |
| 5 | Charging Fault Condition |

### Open Interface Mode
- **byte** mode _(0-3, see table)_

| # | OI Mode |
|:-:|:-:|
| 0 | Off |
| 1 | Passive |
| 2 | Safe |
| 3 | Full |

## Examples:
To use examples, move them to an empty folder and install `create2` and `chalk` to `./node_modules`.
- `test.js` Allows you to send commands to the robot from your terminal.
- `dock.js` Example of sensor reading and autonomous control of Roomba.
- You can see `dock.js` in action [on YouTube](http://youtu.be/lE6Q39KX6Ag).