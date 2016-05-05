# Create2 Library
### Node.js API for Controlling Roomba 600 Series & Create 2

Install with `npm install create2`, then include with `create = require('create2')`

## Library Functions:

- **create.ports(callback)**

Lists all ports available on the computer. The only parameter to the callback function is an array of ports. If no ports were found, the array will be empty.

- **create.prompt(callback)**

Shows a diologue listing available ports and asks the user to select one. While in the diologue, the user can quit the application by typing `quit` or `exit`.

- **robot = create.open(port, callback=null)**

Opens the port to a robot object. The optional callback will be called when the robot is ready to receive commands. The callback's parameter will be the robot object (which is also returned by the function).

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
- **robot.power()** This commnad fully powers down Roomba. Communication is no longer possible.

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

Drives motors at requested power level (`-255 to 255, PWM`). This commnad drives the motors at a constant power instead of a constant speed. This means that the exact speed you're traveling could vary slightly depending on battery level and robot payload. If exact speed is not important, it's better to use this commnad.

- **robot.setMotor(motor, power)** - Value Storage: **robot.motorBrush**, **robot.motorSide**, **robot.motorBin**

Sets the power (`-255 to 255, PWM`) of the desierd motor.

Here are the available motors on the Create 2:

| IDs     | Motor Description                   |
|:-------:|-------------------------------------|
| 'brush' | Main Brush                          |
| 'side'  | Side Brush                          |
| 'bin'   | Dust Bin Vacuum (can't be reversed) |

#### Lights & Sounds:

- **robot.setLeds(spot, dock, error, dirt, cleanColor, cleanIntensity)** - Value Storage: **robot.spotLed**, **robot.dockLed**, **robot.errorLed**, **robot.spotLed**, **robot.dockLed**, **robot.dirtLed**, **robot.cleanClr**, **robot.cleanInt**

Controls the Roomba's various face LEDs. On the Create 2, the error led is a red exclamation point **(!)**, the dirt led is a blue dot, and the button LEDs (spot and dock) are green. The clean button has a bicolor (red/green) LED, which is controlled with cleanColor (`0 to 255, Green to Red`) and cleanIntensity (`0 to 255, Brightness`). All other LEDs can only be turned on and off (`TRUE or FALSE`).

- **robot.showText(text, interval, scrollIn=false, complete=null)** - Value Storage: **TBD**

Scroll any length of text across Roomba's 7-segment display, which can only show 4 characters at a time. Interval controls the delay, in miliseconds, between updates. **Text and interval are required parameters.**

If scrollIn is `true`, the text scrolls in and out until only the last character is visible.

For example, since the message length matches the length of the display, the following will show 'abcd' for 500ms then disappear: `robot.showText("abcd", 500)`

But setting scrollIn to `true` will make the message scroll fully in and out before disappearing: `robot.showText("abcd", 500, true)`

The optional complete callback is called when the text finishes scrolling, and has no parameters. Note that due to the nature of 7-segment displays, not all characters will display well. Characters are not case-sensitive.

- **robot.setDigitsRaw(d1, d2, d3, d4)** - Value Storage: **robot.digit1**, **robot.digit2**, **robot.digit3**, **robot.digit4**

Allows you to control the individual segments of Roomba's display. Each parameter is an array of 7 bits (`EX. [false,true,true,false,true,true,false]`), each of which represents a segment of the display as shown in this table:

|   | A |   |
|:-:|:-:|:-:|
| F |   | B |
|   | G |   |
| E |   | C |
|   | D |   |

- **robot.setTimeLeds(am, pm, colon)** - Value Storage: **robot.amLed**, **robot.pmLed**, **robot.colonLed**

Sets the display's AM, PM, and colon LEDs (all red). LEDs can only be turned on and off (`TRUE or FALSE`).

- **robot.setDayLeds(sun, mon, tue, wed, thr, fri, sat)** - Value Storage: **robot.mon**, **robot.tue**, etc...

Sets the display's day-of-the-week LEDs (all red), which are positioned above the display in an arc-shape. LEDs can only be turned on and off (`TRUE or FALSE`).

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

###### Coming soon...

## Examples:
To use examples, move them to an empty folder and install `create2` and `chalk` to `./node_modules`.
- `test.js` Allows you to send commands to the robot from your terminal.
- `dock.js` Example of sensor reading and autonomous control of Roomba.