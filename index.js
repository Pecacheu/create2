/*<legalstuff> This work is licensed under a GNU General Public License, v3.0. Visit http://gnu.org/licenses/gpl-3.0-standalone.html for details. </legalstuff>*/
//Create2 Node.js Module. Copyright (©) 2016, Pecacheu (Bryce Peterson).

var chalk = require('chalk'),
Serial = require('serialport');

//----------- Helpful Functions -----------

function signedInt16(num) {
	var high = Math.abs(num)>>8&127, low = num&255;
	if(num<0) { high = 255-high; if(!low) { high++;
	if(high>255) high = 128; }} return [high, low];
}

function signedInt8(num) {
	var byte = Math.abs(num) & 127;
	if(num < 0) byte = 256 - byte;
	return (byte>255) ? 128 : byte;
}

function fromSignedInt16(high, low) {
	var num = ((high&127)<<8) + (low&255);
	return (high&128) ? num - 32768 : num;
}

function fromUnsignedInt16(high, low) {
	return ((high&255)<<8) + (low&255);
}

function fromSignedInt8(byte) {
	var num = byte & 127;
	return (byte&128) ? num - 128 : num;
}

//----------- Main Library Functions -----------

//Get A List Of Serial Ports:
exports.ports = function(callback) {
	Serial.list(function(err, ports) {
		callback(err?[]:ports);
	});
}

//Asks you to select a serial port:
exports.prompt = function(callback) {
	//List available ports in command line:
	Serial.list(function(err, ports) {
		console.log(chalk.yellow("--------- Available Ports ---------"));
		for(var i=0; i < ports.length; i++) {
			var commString = "["+(i+1)+"] "+ports[i].comName;
			if(ports[i].manufacturer) commString += (", Brand = '"+ports[i].manufacturer+"'");
			console.log(commString);
		}
		console.log(chalk.yellow("-----------------------------------\n"));
		console.log(chalk.cyan("Please enter the port you want to use:"));
		//Wait for user input:
		function onPortSelectInput(newPort) {
			newPort = newPort.replace(/\n/g, ""); newPort = newPort.replace(/\r/g, "");
			var portExists = false;
			for(var i=0; i < ports.length; i++) if(newPort == ports[i].comName) { portExists = true; break; }
			if(!portExists && Number(newPort) && ports[Number(newPort)-1]) {
				newPort = ports[Number(newPort)-1].comName; portExists = true;
			}
			if(portExists) {
				console.log(chalk.bgGreen.black("Listening on port \""+newPort+"\""));
				process.stdin.removeListener('data', onPortSelectInput);
				console.log(); callback(newPort);
			} else {
				console.log(chalk.bgRed.black("Port \""+newPort+"\" does not exist!"));
			}
		}
		process.stdin.resume();
		process.stdin.setEncoding('utf8');
		process.stdin.on('data', function(text) {
			if(text.search('\n') != -1) text = text.substring(0, text.search('\n'));
			if(text.search('\r') != -1) text = text.substring(0, text.search('\r'));
			if(text == "exit" || text == "quit") {
				console.log(chalk.magenta("Exiting..."));
				process.exit();
			}
		});
		process.stdin.on('data', onPortSelectInput);
	});
}

//Init iRobot Serial:
function initSerial(robot, port, callback) {
	serial = new Serial.SerialPort(port, {
		//Defaults for Roomba Open Interface:
		baudrate:115200, dataBits:8,
		parity:'none', stopBits:1,
		flowControl:false
	});
	serial.on('open', function() {
		//Send Start Command:
		serial.write(Buffer([128]));
		setSensorRead(true, robot);
		//Listen to Incoming Data:
		serial.on('data', function(data) {
			//Combine Previous Data:
			if(robot.inputBuffer) {
				robot.inputBuffer = Buffer.concat([robot.inputBuffer,
				data], robot.inputBuffer.length + data.length);
			} else robot.inputBuffer = data;
			//Data Parsing Timer:
			if(robot.inputTimer) clearTimeout(robot.inputTimer);
			robot.inputTimer = setTimeout(function() {
				if(robot.dataParser && robot.inputBuffer && robot.inputBuffer.length >= 80)
				{ robot.dataParser(robot.inputBuffer); robot.inputBuffer = robot.inputTimer = null; }
				if(exports.debug && robot.inputBuffer && robot.inputBuffer.length != 80)
				console.log(chalk.bold.green("Packet Miss ["+robot.inputBuffer.length+"]"));
			}, 5);
		});
		if(callback) callback(robot);
	});
	return serial;
}

//Open iRobot Serial Port:
exports.open = function(port, callback) {
	var r = { get readEnable() { return r.readEn; },
	set readEnable(e) { setSensorRead(e, this); }};
	//Write Data to Port:
	r.write = function(data) {
		switch(typeof data) {
			case "string": r.port.write(data); break;
			case "number": r.port.write(Buffer([data])); break;
			case "object": for(var i=0,l=data.length; i<l; i++) r.write(data[i]); break;
			default: r.port.write(Buffer([0]));
		}
	};
	//Status Functions:
	r.reset = reset.bind(r); r.start = start.bind(r);
	r.stop = stop.bind(r); r.safe = safe.bind(r);
	r.full = full.bind(r); r.power = power.bind(r);
	//Passive Functions:
	r.clean = clean.bind(r); r.max = max.bind(r);
	r.spot = spot.bind(r); r.autoDock = autoDock.bind(r);
	//Motor Functions:
	r.drive = drive.bind(r); r.driveSpeed = driveSpeed.bind(r);
	r.drivePower = drivePower.bind(r); r.setMotor = setMotor.bind(r);
	//LED & Speaker Functions:
	r.setLeds = setLeds.bind(r); r.showText = showText.bind(r);
	r.setDigitsRaw = setDigitsRaw.bind(r); r.setTimeLeds = setTimeLeds.bind(r);
	r.setDayLeds = setDayLeds.bind(r); r.setSong = setSong.bind(r);
	r.play = play.bind(r);
	//Input Functions:
	r.data = {}; r.delta = {}; r.on = {};
	r.readEn = true; r.queryLoop = queryLoop.bind(r);
	//Initialize Serial Port:
	r.port = initSerial(r, port, callback);
	return r;
}

//----------- Create 2 Status Control -----------

function reset() { this.write(7); }
function start() { this.write(128); readEnable = true; }
function stop() { this.write(173); readEnable = false; }
function safe() { this.write(131); }
function full() { this.write(132); }
function power() { this.write(133); }

//----------- Create 2 Passive Mode -----------

function clean() { this.write(135); }
function max() { this.write(136); }
function spot() { this.write(134); }
function autoDock() { this.write(143); }

//----------- Create 2 Motor Control -----------

function drive(velocity, radius) {
	if(velocity!=null) this.motorVel = velocity;
	if(radius!=null) this.motorRad = radius;
	this.motorL = this.motorR = this.motorLs = this.motorRs = 0;
	this.write(137); this.write(signedInt16(this.motorVel));
	this.write(signedInt16(this.motorRad));
}

function driveSpeed(left, right) {
	if(left!=null) this.motorLs = left; if(right!=null) this.motorRs = right;
	this.motorVel = this.motorRad = this.motorL = this.motorR = 0;
	this.write(145); this.write(signedInt16(this.motorRs));
	this.write(signedInt16(this.motorLs));
}

function drivePower(left, right) {
	if(left!=null) this.motorL = left; if(right!=null) this.motorR = right;
	this.motorVel = this.motorRad = this.motorLs = this.motorRs = 0;
	this.write(146); this.write(signedInt16(this.motorR));
	this.write(signedInt16(this.motorL));
}

function setMotor(motor, power) {
	switch(motor) {
		case 'brush': this.motorBrush = power; break;
		case 'side': this.motorSide = power; break;
		case 'bin': this.motorBin = Math.abs(power); break;
		default: return;
	}
	//this.write([138,parseInt("000"+(this.motorBrush<0?1:0)+(this.motorSide<0?
	//1:0)+(this.motorBrush?1:0)+(this.motorBin?1:0)+(this.motorSide?1:0),2)]);
	this.write([144,signedInt8(this.motorBrush||0),signedInt8
	(this.motorSide||0),signedInt8(this.motorBin||0)]);
}

//----------- Create 2 Lights & Sounds -----------

function setLeds(spot, dock, error, dirt, cleanColor, cleanIntensity) {
	if(spot!=null) this.spotLed = !!spot; if(dock!=null) this.dockLed = !!dock;
	if(error!=null) this.errorLed = !!error; if(dirt!=null) this.dirtLed = !!dirt;
	if(cleanColor!=null) this.cleanClr = cleanColor&255;
	if(cleanIntensity!=null) this.cleanInt = cleanIntensity&255;
	var data = parseInt("0000"+(this.errorLed?1:0)+(this
	.dockLed?1:0)+(this.spotLed?1:0)+(this.dirtLed?1:0),2);
	this.write([139,data,this.cleanClr||0,this.cleanInt||0]);
}

//TODO: Improve this function, add error checking.
//Other functions that affect the display should stop this function's setInterval loop.
function showText(text, interval, scrIn, complete) {
	var ind = scrIn?-3:0, write = this.write,
	tId = setInterval(timeFunc, interval);
	function timeFunc() { if(ind < 1) { write(164);
		for(var i=0,l=-ind; i<l; i++) write(0);
		write(text.substring(0,4-l));
	} else { var str = text.substr(ind,4); write([164,str]);
		for(var i=0,l=4-str.length; i<l; i++) write(0);
		if(!str.length || (!scrIn && str.length < 4)) {
		if(str.length) write([164,0,0,0,0]); clearTimeout(tId);
		if(typeof complete == "function") complete(); }
	} ind++; } timeFunc(); return tId;
}

function setDigitsRaw(d1, d2, d3, d4) {
	if(d1!=null) this.digit1 = arrToByte(d1);
	if(d2!=null) this.digit2 = arrToByte(d2);
	if(d3!=null) this.digit3 = arrToByte(d3);
	if(d4!=null) this.digit4 = arrToByte(d4);
	function arrToByte(a) {
		var str = "0"; for(var i=0; i<7; i++)
		str += (a[i]?1:0); return parseInt(str,2);
	}
	this.write([163,this.digit1||0,this.digit2||0,this.digit3||0,this.digit4||0]);
}

function setTimeLeds(am, pm, colon) {
	if(am!=null) this.amLed = !!am; if(pm!=null) this.pmLed = !!pm;
	if(colon!=null) this.colonLed = !!colon;
	var dataA = parseInt("0"+(this.sun?1:0)+(this.mon?1:0)+(this.tue?
	1:0)+(this.wed?1:0)+(this.thr?1:0)+(this.fri?1:0)+(this.sat?1:0),2);
	var dataB = parseInt("00000"+(this.amLed?1:0)+(this.pmLed?
	1:0)+(this.colonLed?1:0),2); this.write([162,dataA,dataB]);
}

function setDayLeds(sun, mon, tue, wed, thr, fri, sat) {
	if(sun!=null) this.sun = !!sun; if(mon!=null) this.mon = !!mon;
	if(tue!=null) this.tue = !!tue; if(wed!=null) this.wed = !!wed;
	if(thr!=null) this.thr = !!thr; if(fri!=null) this.fri = !!fri;
	if(sat!=null) this.sat = !!sat;
	var dataA = parseInt("0"+(this.sun?1:0)+(this.mon?1:0)+(this.tue?
	1:0)+(this.wed?1:0)+(this.thr?1:0)+(this.fri?1:0)+(this.sat?1:0),2);
	var dataB = parseInt("00000"+(this.amLed?1:0)+(this.pmLed?
	1:0)+(this.colonLed?1:0),2); this.write([162,dataA,dataB]);
}

function setSong(id, notes) {
	var len = (notes.length < 16) ? notes.length : 16;
	this.write([140,id&255,len]); for(var i=0; i<len; i++) {
		this.write(notes[i][0]<255 ? notes[i][0] : 255);
		this.write(notes[i][1]<255 ? notes[i][1] : 255);
	}
}

function play(id) {
	if(id!=null) this.song = id&255;
	this.write([141,this.song||0]);
}

//----------- Create 2 Sensors -----------

function setSensorRead(en, r) {
	r.readEn = en; if(en) {
		if(r.readTmr) clearInterval(r.readTmr);
		r.dataParser = onSensorData.bind(r);
		r.readTmr = setInterval(r.queryLoop, 80);
		r.queryLoop();
	} else {
		if(r.readTmr) clearInterval(r.readTmr);
		r.dataParser = r.readTmr = null;
	}
}

function queryLoop() {
	this.inputBuffer = null; this.write([142, 100]);
}

function onSensorData(data) {
	var changed = {}, mTrig = false;
	//Parse Data:
	for(var i=0,l=dataKeys.length; i<l; i++) {
		var index = dataKeys[i], itm = dataParse[index], value = data[itm[0]];
		if(itm[1]) value = !!(value & itm[1]); else if(itm[2]) value = (itm[3]?
		fromSignedInt16:fromUnsignedInt16)(value, data[itm[2]]);
		else if(itm[3]) value = fromSignedInt8(value);
		if(this.data[index] != value) { this.data[index] = value; changed[index] = true; }
	}
	//Parse Motion Data:
	for(i=0,l=mKeys.length; i<l; i++) {
		var index = mKeys[i], itm = motionParse[index], value = data[itm[0]];
		if(itm[1]) value = !!(value & itm[1]); else if(itm[2]) value = (itm[3]?
		fromSignedInt16:fromUnsignedInt16)(value, data[itm[2]]);
		else if(itm[3]) value = fromSignedInt8(value);
		this.delta[index] = value; if(value) mTrig = true;
	}
	
	//* Fixed bug where not all robot.data values were up to date in robot.on callbacks.
	
	//Trigger Callbacks:
	if(this.onChange && Object.keys(changed).length) this.onChange(changed);
	if(this.onMotion && mTrig) this.onMotion(); var o = Object.keys(this.on);
	for(i=0,l=o.length; i<l; i++) if(changed[o[i]]) this.on[o[i]](this.data[o[i]]);
	
	//Debug Stuff:
	if(exports.debug) {
		if(exports.inputMode == 2 || exports.inputMode == null) {
			for(var i=0,l=data.length; i<l; i++) {
				console.log(chalk.yellow("["+i+"]")+chalk.cyan(" > "+data[i]));
			}
		} else if(exports.inputMode == 1) {
			data = chalk.cyan("> "+data.toString());
			data.replace(/\n/g, chalk.yellow.bold("\\n"));
			data.replace(/\r/g, chalk.yellow.bold("\\r"));
			console.log(data);
		}
	}
}

//Sensor data in the format:
//"NAME": [INDEX, (BIT), (INDEX2, SIGNED)]

const dataParse = {
	//Bump & Wheel Drop:
	"bumpLeft": [0, 2], "bumpRight": [0, 1], //true&false
	"dropLeft": [0, 8], "dropRight": [0, 4], //true&false //or maybe wheelDropLeft
	//Wall:
	"wall": [1, 1], //????????? (maybe for side brush?)
	//Cliff Sensors:
	"cliffLeft": [2, 1], "cliffFrontLeft": [3, 1], //true&false
	"cliffFrontRight": [4, 1], "cliffRight": [5, 1], //true&false
	//Virtual Wall:
	"virtualWall": [6, 1], //TEST (with home base)
	//Overcurrent:
	"overloadBrush": [7, 4], "overloadSide": [7, 1], //TEST
	"overloadLeft": [7, 16], "overloadRight": [7, 8], //TEST
	//Dirt Sensor:
	"airQuality": [8], //TEST
	//IR Receivers://0-255, currently detected IR ID, uses special protocol (0 when no IR signal)
	"irOmni": [10], "irLeft": [69], "irRight": [70], //TEST
	//Buttons:
	"clean": [11, 1], "spot": [11, 2], "dock": [11, 4], //true&false
	"day": [11, 32], "hour": [11, 16], "minute": [11, 8], //true&false
	//"schedule": [11, 64], "clock": [11, 128], //NOT WORKING?
	//Battery:
	"chargeState": [16], "voltage": [17, null, 18, false], //CHARGE STATE: 0 - 5 (see table), VOLTS: mV, 0 - 65535 (usually ~15000)
	"current": [19, null, 20, true], "temperature": [21, null, null, true], //CURRENT: mA, -32768 - 32767 (usually ~ -200), TEMP: C, -128 - 127 (usually ~35)
	"charge": [22, null, 23, false], "maxCharge": [24, null, 25, false], //CHARGE: mAh, 0 - 65535, MAX CHARGE: mAh, 0 - 65535 (should always be ~2600)
	//Wall Signal Analog:
	"wallRaw": [26, null, 27, false], //????????? (maybe for side brush?) (usually from 0 to 150)
	//Cliff Sensors Analog:
	"cliffLeftRaw": [28, null, 29, false], "cliffFrontLeftRaw": [30, null, 31, false], //0 - 4095 (usually from 0 to ~2500)
	"cliffFrontRightRaw": [32, null, 33, false], "cliffRightRaw": [34, null, 35, false], //0 - 4095 (usually from 0 to ~2500)
	//Power Sources:
	"charger": [39, 1], "docked": [39, 2], //true&false, based on power sources available. Can both be on. Doesn't nessicarilly mean roomba is charging.
	//Open Interface Mode:
	"mode": [40], //0 - 3 (see table)
	//Speaker:
	"songNumber": [41], "playing": [42, 1], //Fairly self-explanitory. Works.
	//Wheel Encoders:
	"encoderLeft": [52, null, 53, false], "encoderRight": [54, null, 55, false], //Encoder Clicks, 0 - 65535 (overflows in both directions)
	//Bumper Proximity Sensors:
	"lightBumper": [56],
	"lightBumpLeft": [56, 1], "lightBumpFrontLeft": [56, 2], "lightBumpCenterLeft": [56, 4], //true&false, light-based proximity sensors.
	"lightBumpCenterRight": [56, 8], "lightBumpFrontRight": [56, 16], "lightBumpRight": [56, 32], //true&false, light-based proximity sensors.
	//Proximity Sensors Analog:
	"proxLeft": [57, null, 58, false], "proxFrontLeft": [59, null, 60, false], //0 - 4095 (usually from 0 to ~1000)
	"proxCenterLeft": [61, null, 62, false], "proxCenterRight": [63, null, 64, false], //0 - 4095 (usually from 0 to ~1000)
	"proxFrontRight": [65, null, 66, false], "proxRight": [67, null, 68, false], //0 - 4095 (usually from 0 to ~1000)
	//Motor Current Sensors:
	"currentLeft": [71, null, 72, true], "currentRight": [73, null, 74, true], //TEST
	"currentBrush": [75, null, 76, true], "currentSide": [77, null, 78, true], //TEST
	//Caster Motion Sensor:
	"casterMotion": [79, 1], //true&false (only works when driving forward)
}, dataKeys = Object.keys(dataParse);

//chargeState:
//0. Not charging
//1. Reconditioning Charging
//2. Full Charging
//3. Trickle Charging
//4. Waiting
//5. Charging Fault Condition

//OI Mode:
//0. Off
//1. Passive
//2. Safe
//3. Full

//Special motion data with different callback:
const motionParse = {
	//Distance:
	"distance": [12, null, 13, true], //TEST //-32768 - 32767. NOT WORKING?
	//Angle:
	"angle": [14, null, 15, true], //TEST  //-32768 - 32767. NOT WORKING?
}, mKeys = Object.keys(motionParse);