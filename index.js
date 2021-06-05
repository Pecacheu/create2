/*<legalstuff> This work is licensed under a GNU General Public License, v3.0. Visit http://gnu.org/licenses/gpl-3.0-standalone.html for details. </legalstuff>*/
//Create2 Node.js Module. Copyright (©) 2016, Pecacheu (Bryce Peterson).

"use strict";

const chalk = require('chalk'), Serial = require('serialport'), stream = require('stream');
exports.serial = {baudRate:115200, dataBits:8, parity:'none', stopBits:1, flowControl:0};

//----------- Helpful Functions -----------

function signedInt16(num) {
	let high = Math.abs(num)>>8&127, low = num&255;
	if(num<0) { high = 255-high; if(!low) { high++;
	if(high>255) high = 128; }} return [high, low];
}

function signedInt8(num) {
	let byte = Math.abs(num) & 127;
	if(num < 0) byte = 256 - byte;
	return (byte>255) ? 128 : byte;
}

function fromSignedInt16(high, low) {
	let num = ((high&127)<<8) + (low&255);
	return (high&128) ? num - 32768 : num;
}

function fromUnsignedInt16(high, low) {
	return ((high&255)<<8) + (low&255);
}

function fromSignedInt8(byte) {
	let num = byte & 127;
	return (byte&128) ? num - 128 : num;
}

//----------- Main Library Functions -----------

//Get A List Of Serial Ports:
exports.ports = (cb) => {
	Serial.list().then(ports => cb(ports), err => cb([]));
}

//Asks you to select a serial port:
exports.prompt = (cb) => {
	//List available ports in command line:
	Serial.list().then(ports => {
		console.log(chalk.yellow("--------- Available Ports ---------"));
		for(let i=0; i < ports.length; i++) {
			let commString = "["+(i+1)+"] "+ports[i].path;
			if(ports[i].manufacturer) commString += (", Brand = '"+ports[i].manufacturer+"'");
			console.log(commString);
		}
		console.log(chalk.yellow("-----------------------------------\n"));
		console.log(chalk.cyan("Please enter the port you want to use:"));
		//Wait for user input:
		function onPortSelectInput(port) {
			port=port.replace(/\n/g, "").replace(/\r/g, ""); let portExists=0;
			for(let i=0; i < ports.length; i++) if(port == ports[i].path) { portExists=1; break; }
			if(!portExists && Number(port) && ports[Number(port)-1]) {
				port = ports[Number(port)-1].path; portExists=1;
			}
			if(portExists) {
				console.log(chalk.bgGreen.black("Listening on port \""+port+"\"")+"\n");
				process.stdin.removeListener('data', onPortSelectInput); exports.open(port,cb);
			} else {
				console.log(chalk.bgRed.black("Port \""+port+"\" does not exist!"));
			}
		}
		process.stdin.resume();
		process.stdin.setEncoding('utf8');
		process.stdin.on('data', (text) => {
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

//Open iRobot Serial Port:
exports.open = (port, cb) => {
	let r = new Robot();
	if(typeof port == 'string') r.port = new Serial(port, exports.serial);
	else if(port instanceof stream.Duplex) r.port = port; else { cb(); return; }
	r.port.once('open', () => { r.start(); r.port.on('data', r.read); if(cb) cb(r); });
	r.port.on('error', () => {});
}

function Robot() { this.data = {}, this.delta = {}, this.on = {}; }
Object.defineProperty(Robot.prototype,'readEnable',{get(){return r._rEn},set(e){setSensorRead(e,this)}});
Robot.prototype.close = function() { setSensorRead(0,this); this.port.close(); }

Robot.prototype.write = function() {
	for(let i=0,l=arguments.length,a; i<l; i++) {
		switch(typeof (a=arguments[i])) {
			case "string": this.port.write(a); break;
			case "number": this.port.write(Buffer([a])); break;
			case "object": this.port.write(Buffer.from(a)); break;
			default: this.port.write(Buffer([0]));
		}
	}
}

Robot.prototype.read = function(data) {
	//Combine Previous Data:
	let r=this; if(r.inBuf) r.inBuf = Buffer.concat([r.inBuf,data]); else r.inBuf = data;
	//Data Parsing Timer:
	if(r.inTmr) clearTimeout(r.inTmr); r.inTmr = setTimeout(() => {
		if(r.dataParser && r.inBuf && r.inBuf.length >= 80) { r.dataParser(r.inBuf); r.inBuf = r.inTmr = null; }
		if(exports.debug && r.inBuf) console.log(chalk.bold.green("Packet Miss ["+r.inBuf.length+"]"));
	},8);
}

//----------- Create 2 Status Control -----------

Robot.prototype.reset = function() { this.write(7); }
Robot.prototype.start = function() { this.write(128); this.readEnable=1; }
Robot.prototype.stop = function() { this.write(173); this.readEnable=0; }
Robot.prototype.safe = function() { this.write(131); }
Robot.prototype.full = function() { this.write(132); }
Robot.prototype.power = function() { this.write(133); }

//----------- Create 2 Passive Mode -----------

Robot.prototype.clean = function() { this.write(135); }
Robot.prototype.max = function() { this.write(136); }
Robot.prototype.spot = function() { this.write(134); }
Robot.prototype.autoDock = function() { this.write(143); }

//----------- Create 2 Motor Control -----------

Robot.prototype.drive = function(velocity, radius) {
	if(velocity!=null) this.motorVel = velocity; if(radius!=null) this.motorRad = radius;
	this.motorL = this.motorR = this.motorLs = this.motorRs = 0;
	this.write(137,signedInt16(this.motorVel),signedInt16(this.motorRad));
}

Robot.prototype.driveSpeed = function(left, right) {
	if(left!=null) this.motorLs = left; if(right!=null) this.motorRs = right;
	this.motorL = this.motorR = this.motorVel = this.motorRad = 0;
	this.write(145,signedInt16(this.motorRs),signedInt16(this.motorLs));
}

Robot.prototype.drivePower = function(left, right) {
	if(left!=null) this.motorL = left; if(right!=null) this.motorR = right;
	this.motorVel = this.motorRad = this.motorLs = this.motorRs = 0;
	this.write(146,signedInt16(this.motorR),signedInt16(this.motorL));
}

Robot.prototype.setMotor = function(motor, power) {
	switch(motor) {
		case 'brush': this.motorBrush = power; break; case 'side': this.motorSide = power; break;
		case 'bin': this.motorBin = Math.abs(power); break; default: return;
	}
	this.write(144,signedInt8(this.motorBrush||0),signedInt8(this.motorSide||0),signedInt8(this.motorBin||0));
}

//----------- Create 2 Lights & Sounds -----------

Robot.prototype.setLeds = function(spot, dock, error, dirt, cleanColor, cleanIntensity) {
	if(spot!=null) this.spotLed = !!spot; if(dock!=null) this.dockLed = !!dock;
	if(error!=null) this.errorLed = !!error; if(dirt!=null) this.dirtLed = !!dirt;
	if(cleanColor!=null) this.cleanClr = cleanColor&255;
	if(cleanIntensity!=null) this.cleanInt = cleanIntensity&255;
	let data = parseInt("0000"+(this.errorLed?1:0)+(this.dockLed?1:0)+(this.spotLed?1:0)+(this.dirtLed?1:0),2);
	this.write(139,data,this.cleanClr||0,this.cleanInt||0);
}

Robot.prototype.setFaceLeds = function(sun, mon, tue, wed, thr, fri, sat, am, pm, colon) {
	if(sun!=null) this.sun = !!sun; if(mon!=null) this.mon = !!mon; if(tue!=null) this.tue = !!tue;
	if(wed!=null) this.wed = !!wed; if(thr!=null) this.thr = !!thr; if(fri!=null) this.fri = !!fri;
	if(sat!=null) this.sat = !!sat; if(am!=null) this.amLed = !!am; if(pm!=null) this.pmLed = !!pm;
	if(colon!=null) this.colonLed = !!colon;
	let dataA = parseInt("0"+(this.sun?1:0)+(this.mon?1:0)+(this.tue?1:0)
	+(this.wed?1:0)+(this.thr?1:0)+(this.fri?1:0)+(this.sat?1:0),2),
	dataB = parseInt("00000"+(this.amLed?1:0)+(this.pmLed?1:0)+(this.colonLed?1:0),2);
	this.write(162,dataA,dataB);
}

//TODO: Improve this function, add error checking.
//Other functions that affect the display should stop this function's setInterval loop.
Robot.prototype.showText = function(text, interval, scrIn, complete) {
	let ind = scrIn?-3:0, tId = setInterval(timeFunc, interval);
	function timeFunc() {
		if(ind < 1) {
			this.write(164);
			for(let i=0,l=-ind; i<l; i++) this.write(0);
			this.write(text.substring(0,4-l));
		} else {
			let str = text.substr(ind,4); this.write(164,str);
			for(let i=0,l=4-str.length; i<l; i++) this.write(0);
			if(!str.length || (!scrIn && str.length < 4)) {
			if(str.length) this.write(164,0,0,0,0); clearTimeout(tId);
			if(typeof complete == "function") complete(); }
		}
		ind++;
	}
	timeFunc(); return tId;
}

function arrToByte(a) {
	if(typeof a == "number") return a&255;
	let s=''; for(let i=7,l=a.length; i>=0; i--) s+=(i>=l?0:(a[i]?1:0)); return parseInt(s+'0',2);
}
Robot.prototype.setDigitsRaw = function(d1, d2, d3, d4) {
	if(d1!=null) this.d1 = arrToByte(d1); if(d2!=null) this.d2 = arrToByte(d2);
	if(d3!=null) this.d3 = arrToByte(d3); if(d4!=null) this.d4 = arrToByte(d4);
	this.write(163,this.d1||0,this.d2||0,this.d3||0,this.d4||0);
}

Robot.prototype.setSong = function(id, notes) {
	let len = (notes.length<16)?notes.length:16; this.write(140,id&255,len);
	for(let i=0; i<len; i++) this.write(notes[i][0]<255?notes[i][0]:255, notes[i][1]<255?notes[i][1]:255);
}

Robot.prototype.play = function(id) {
	this.song = id&255; this.write(141,this.song||0);
}

//----------- Create 2 Sensors -----------

function setSensorRead(en,r) {
	if(r._rEn=!!en) {
		if(r.readTmr) clearInterval(r.readTmr);
		r.dataParser = onSensorData.bind(r);
		r.readTmr = setInterval(r.queryLoop.bind(r),80);
		r.queryLoop();
	} else {
		if(r.readTmr) clearInterval(r.readTmr);
		r.dataParser = r.readTmr = null;
	}
}

Robot.prototype.queryLoop = function() {
	this.inBuf = null; this.write(142,100);
}

function onSensorData(data) {
	let changed={}, mTrig=0;
	//Parse Data:
	for(let i=0,l=dataKeys.length; i<l; i++) {
		let index = dataKeys[i], itm = dataParse[index], value = data[itm[0]];
		if(itm[1]) value = !!(value & itm[1]); else if(itm[2]) value = (itm[3]?
		fromSignedInt16:fromUnsignedInt16)(value, data[itm[2]]);
		else if(itm[3]) value = fromSignedInt8(value);
		if(this.data[index] != value) { this.data[index] = value; changed[index]=1; }
	}
	//Parse Motion Data:
	for(let i=0,l=mKeys.length; i<l; i++) {
		let index = mKeys[i], itm = motionParse[index], value = data[itm[0]];
		if(itm[1]) value = !!(value & itm[1]); else if(itm[2]) value = (itm[3]?
		fromSignedInt16:fromUnsignedInt16)(value, data[itm[2]]);
		else if(itm[3]) value = fromSignedInt8(value);
		this.delta[index] = value; if(value) mTrig=1;
	}

	//Trigger Callbacks:
	if(this.onChange && Object.keys(changed).length) this.onChange(changed);
	if(this.onMotion && mTrig) this.onMotion(); let o = Object.keys(this.on);
	for(let i=0,l=o.length; i<l; i++) if(changed[o[i]]) this.on[o[i]](this.data[o[i]]);

	//Debug Stuff:
	if(exports.debug) {
		if(exports.inputMode == 2 || exports.inputMode == null) {
			for(let i=0,l=data.length; i<l; i++) {
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
	bumpLeft:[0,2], bumpRight:[0,1], dropLeft:[0,8], dropRight:[0,4],
	wall:[1,1], cliffLeft:[2,1], cliffFrontLeft:[3,1], cliffFrontRight:[4,1], cliffRight:[5,1],
	virtualWall:[6,1], overloadBrush:[7,4], overloadSide:[7,1], overloadLeft:[7,16], overloadRight:[7,8],
	airQuality:[8], irOmni:[10], irLeft:[69], irRight:[70], clean:[11,1], spot:[11,2], dock:[11,4],
	day:[11,32], hour:[11,16], minute:[11,8], //schedule:[11,64], clock:[11,128], //NOT WORKING?
	chargeState:[16], voltage:[17,null,18,0], current:[19,null,20,1],
	temperature:[21,null,null,1], charge:[22,null,23,0], maxCharge:[24,null,25,0],
	wallRaw:[26,null,27,0], cliffLeftRaw:[28,null,29,0], cliffFrontLeftRaw:[30,null,31,0],
	cliffFrontRightRaw:[32,null,33,0], cliffRightRaw:[34,null,35,0],
	charger:[39,1], docked:[39,2], mode:[40], songNumber:[41], playing:[42,1],
	encoderLeft:[52,null,53,0], encoderRight:[54,null,55,0],
	irBump:[56], irBumpLeft:[56,1], irBumpFrontLeft:[56,2], irBumpCenterLeft:[56,4],
	irBumpCenterRight:[56,8], irBumpFrontRight:[56,16], irBumpRight:[56,32],
	proxLeft:[57,null,58,0], proxFrontLeft:[59,null,60,0],
	proxCenterLeft:[61,null,62,0], proxCenterRight:[63,null,64,0],
	proxFrontRight:[65,null,66,0], proxRight:[67,null,68,0],
	currentLeft:[71,null,72,1], currentRight:[73,null,74,1],
	currentBrush:[75,null,76,1], currentSide:[77,null,78,1],
	casterMotion:[79,1]
}, dataKeys = Object.keys(dataParse);

//Special motion data with different callback:
const motionParse = {
	distance:[12,null,13,1], angle:[14,null,15,1]
}, mKeys = Object.keys(motionParse);