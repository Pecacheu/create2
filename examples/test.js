/*<legalstuff> This work is licensed under a GNU General Public License, v3.0. Visit http://gnu.org/licenses/gpl-3.0-standalone.html for details. </legalstuff>*/
//Create2 TEST Demo. Copyright (©) 2016, Pecacheu (Bryce Peterson).

//Allows you to send commands over the OI.

//Send a raw byte like this: 131
//Send multiple bytes like this: 146,127,255,127,255
//Send command byte then ASCII string like this: 164,abcd

//Use 'i' to switch input modes bewtween ASCII, Binary, and Off.
//(Input means from Roomba -> Computer, binary is usally the best mode)

var create = require('create2'),
chalk = require('chalk');

var robot, input = 1;

function start() {
	create.debug = true; //Data will be logged to terminal.
	create.inputMode = 1; //Only relevant when debug is on.
	create.prompt(function(p){create.open(p,main)});
}

//Main Program:
function main(r) {
	robot = r; const rl = require('readline').createInterface
	({input:process.stdin, output:process.stdout});
	rl.on('line', function(text) {
		if(text == "exit" || text == "quit") {
			console.log(chalk.magenta("Exiting..."));
			process.exit();
		} else if(text == "i") {
			input++; //Toggle Input Display Mode:
			if(input == 2) console.log(chalk.red("Input Binary Enabled"));
			else if(input == 1) console.log(chalk.red("Input Enabled"));
			else { input = 0; console.log(chalk.red("Input Disabled")); }
			create.inputMode = input;
		} else {
			//Send OI Commands:
			var args = text.split(',');
			for(var i=0,l=args.length; i<l; i++) {
				var str = args[i].trim();
				if(!isNaN(str)) { //Checks if Number, HEX via '0x' works too!
					robot.write(Number(str) & 0xFF);
				} else if(i > 0) { //You can use ASCII strings except on first bit of command.
					robot.write(str);
				}
			}
		}
	});
}

start();