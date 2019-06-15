/*<legalstuff> This work is licensed under a GNU General Public License, v3.0. Visit http://gnu.org/licenses/gpl-3.0-standalone.html for details. </legalstuff>*/
//Create2 TEST Demo. Copyright (©) 2016, Pecacheu (Bryce Peterson).

//Allows you to send commands over the OI.

//Send a command like this: driveSpeed,100,100
//Send a raw byte like this: 131
//Send multiple bytes like this: 146,127,255,127,255
//Send command byte then ASCII string like this: 164,abcd

//Use 'i' to switch input modes between ASCII, Binary, and Off.
//(Input means from Roomba -> Computer, binary is usually the best mode)

const SendRaw = 0; //Note: Set this to 1 to enable sending raw commands!

const create = require('create2'), chalk = require('chalk');
let robot, input = 0;

function start() {
	create.debug = true; //Data will be logged to terminal.
	create.inputMode = 0; //Only relevant when debug is on.
	create.prompt(main);
}

//todo dock.js: replace 'var' with 'let'; use '=>'

//Main Program:
function main(r) {
	r.safe(); robot = r;
	const rl = require('readline').createInterface({input:process.stdin, output:process.stdout});
	rl.on('line', (text) => {
		if(text == "exit" || text == "quit") {
			console.log(chalk.magenta("Exiting..."));
			robot.start(); setTimeout(() => {process.exit()},10);
		} else if(text == "i") { //Toggle Input Display Mode:
			if(++input == 3) console.log(chalk.red("Debug Binary Enabled"));
			else if(input == 2) console.log(chalk.red("Debug Enabled"));
			else if(input == 1) console.log(chalk.red("Input Enabled"));
			else { input = 0; console.log(chalk.red("Input Disabled")); }
			create.inputMode = input>1?input-1:0;
		} else {
			let args = text.split(','), rf = robot[args[0]];
			if(typeof rf == "function") { //Send function by name:
				args.shift(); if(rf.length != args.length) {
					console.log(chalk.red("Wrong args count "+args.length+" (requires "+rf.length+")")); return;
				}
				for(let i=0,l=args.length,a; i<l; i++) {
					a=args[i]; if(a == 'null') args[i] = null; else if(!isNaN(a)) args[i] = Number(a);
				}
				rf.apply(robot,Array.from(args));
			} else { //Send raw OI commands:
				if(!SendRaw) { console.log(chalk.red("No such command '"+args[0]+"'")); return; }
				for(let i=0,l=args.length,a; i<l; i++) {
					a=args[i]; if(!isNaN(a)) { //Checks if Number, HEX via '0x' works too!
						robot.write(Number(a)&0xFF);
					} else if(i > 0) { //You can use ASCII strings except on first bit of command.
						robot.write(a);
					}
				}
			}
		}
	});
	setInterval(() => {
		//Set LEDs based on battery level:
		let chg = robot.data.charge/robot.data.maxCharge;
		robot.setLeds(null,null,null,null,255-(chg*255),255);
		//Print sensor data:
		if(input != 1) return;
		let s = chalk.yellow("> Input {"), k = Object.keys(robot.data);
		for(let i=0,l=k.length,n; i<l; i++) {
			n=k[i]; s += (i?chalk.yellow(", "):'')+chalk.cyan(n+": ")+chalk.yellow(robot.data[n]);
		}
		console.log(s+chalk.yellow("}"));
	}, 500);
}

start();