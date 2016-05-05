/*<legalstuff> This work is licensed under a GNU General Public License, v3.0. Visit http://gnu.org/licenses/gpl-3.0-standalone.html for details. </legalstuff>*/
//Create2 DOCK Demo. Copyright (©) 2016, Pecacheu (Bryce Peterson).

//NOTE: If you want to learn more about Roomba's modes, as well as the various
//commands and sensors, I reccomend reading the official OI docs available here:
//(http://www.irobotweb.com/~/media/MainSite/PDFs/About/STEM/Create/iRobot_Roomba_600_Open_Interface_Spec.pdf)

/*Demonstates how you can take control of Roomba, even in passive mode, and how to combine
user-control (in FULL mode) with built-in functions like autoDock (in PASSIVE mode).

The robot starts in full mode [LINE 68] and drives forward unless bumper, wheel drop,
or proximity sensors are triggered [LINE 112]. If the robot detects the home base
[LINE 90], it exits user-control, entering PASSIVE mode, and starts automatic docking.
(Screen should flash 'SEEK')

There are several problems with relying on PASSIVE mode, however:

1. We have no way of knowing if the docking procedure has stopped or encountered an error.
We solve this by restarting docking mode if the state of the wheel drop sensors changes
[LINE 102]. The bumper switches are ignored, as they don't interrupt the docking procedure.
(Screen should flash 'RST' when docking is restarted)

2. In PASSIVE mode, pressing the clean button starts the cleaning procedure (imagine that)
The solution to this can be found in the preventDefault function [LINE 155]. If clean is pressed
while docked, we allow clean to be enabled [LINE 95]. Otherwise, we call preventDefault to prevent
a clean cycle from starting.

When the robot detects power on docking contacks [LINE 98], we know we've docked successfully.
We change to FULL mode for a second to display a message on the screen, then back to PASSIVE,
since the robot won't charge in FULL mode. (Screen should quickly flash 'DOCK')

As previously mentioned, we usually cancel presses to the clean button in PASSIVE mode,
but when docked, we allow the robot to start a clean cycle. This is because when docked,
the robot backs out and turns around (while making a cute beeping noise) before cleaning.
From testing, this takes about 4.4 seconds, so as soon as the robot looses contact with
the dock [LINE 100], we call setUndock, which sets a timer for 4.4 seconds [LINE 120].
When the timer ends, it re-enables user-control, stopping the cleaning cycle
before the actaul cleaning starts. Of course, we also play song 0 again [LINE 122].
(Screen should scroll 'UNDOCK')

The robot will also turn around 180 degrees whenever you enter 't' into the terminal
[LINE 133], changing direction each time. If the function is called while a turn is
already in progress [LINE 129], the robot will return to it's original angle. The
angle is tracked with a variable that stores changes in angle delta [LINE 148].

The only other thing that might be worth mentioning is the seemingly odd 2nd onChange
callback at line 76. This function only runs once, the first time the onChange event
is fired, and simply checks if the robot is already docked when the program starts.
(Otherwise we'd start driving into the dock!)*/

//TL;DR...
//Robot moves, stops for obstacles, and auto-docks when it sees the base station.
//Enter 't' into terminal to make robot turn 180 degrees.
//Enter 's' into terminal to stop turning prematurely.

var create = require('create2');
var robot, turnRobot, stopTurn;

function start() {
	create.prompt(function(p){create.open(p,main)});
}

//Main Program:
function main(r) {
	robot = r; handleInput(robot);
	
	//Enter Full Mode:
	robot.full(); var run = 1;
	
	//setTimeout(function(){robot.showText("Hello World!", 500, true)}, 500);
	
	//We'll play this song whenever entering user-control:
	robot.setSong(0, [[72,32],[76,32],[79,32],[72,32]]);
	
	//Handle First onChange:
	robot.onChange = function() {
		if(robot.data.charger || robot.data.docked) { robot.start(); run = 0; }
		else { robot.play(0); driveLogic(); } robot.onChange = onchange;
	}
	
	//Handle onChange Events:
	function onchange(chg) {
		if(robot.data.mode == 3 && run == 1) { //FULL mode:
			//lightBumper is a macro for all light bump sensors (lightBumpLeft, lightBumpRight, etc)
			//Unfortunately, no similar macro exists for cliff sensors or bumper switches due to the way the data is delivered.
			if(chg.lightBumper || chg.bumpLeft || chg.bumpRight || chg.dropLeft || chg.dropRight || chg.clean || chg.docked) {
				driveLogic(); //Run drive logic only when sensor values change.
			}
			//Charging Station Detected! Since it's in front of the robot anyway... Start Auto-Docking!
			if(robot.data.irLeft == 172 || robot.data.irRight == 172) {
				robot.drive(0,0); run = -1; robot.showText("SEEK", 500, false, robot.autoDock);
			}
		} else if(robot.data.mode == 1) { //PASSIVE mode:
			if(chg.clean && robot.data.clean) { //Clean Pressed:
				if(robot.data.docked) robot.clean(); //Start backing up if clean pressed while docked.
				else preventDefault(function(){run = 1; driveLogic()}); //Prevent default.
			}
			if(chg.docked && robot.data.docked) { //Robot Docked:
				setUndock(0); robot.full(); robot.showText("DOCK", 500, false, robot.start);
			} else if(chg.docked/* && !robot.data.charger*/ && !robot.data.docked) { //Robot Undocked:
				setUndock(1);
			} else if(chg.dropLeft || chg.dropRight) { //Docking Interrupted:
				if(run == -1) {robot.full();robot.showText("RST", 500, false, robot.autoDock)}
				//else setUndock(1);
			}
		}
	}
	
	//Logic to Start and Stop Moving Robot:
	function driveLogic() {
		//We're in user-control (FULL mode) and can control the robot. (Your main program would be here!)
		if(robot.data.lightBumper || robot.data.bumpLeft || robot.data.bumpRight) robot.driveSpeed(0,0); //Disable motors.
		else robot.driveSpeed(robot.data.dropLeft?0:100,robot.data.dropRight?0:100); //Enable motors if wheels are up.
		if(robot.data.clean || robot.data.docked) {robot.driveSpeed(0,0);robot.start()} //Back to PASSIVE mode.
	}
	
	//Enable and disable undocking timer:
	var dTmr; function setUndock(e) {
		if(dTmr) clearTimeout(dTmr); //Cancel timer if already running.
		if(e) { run = 1; robot.start(); dTmr = setTimeout(function() {
			robot.full(); run = 1; dTmr = setTimeout(function(){robot.showText
			("UNDOCK", 250, true);robot.play(0);driveLogic();dTmr=null},250);
		}, 4400); } else run = 0;
	}
	
	//Turns robot when 't' is pressed:
	var drRun = 0, drAngle = 0;
	turnRobot = function() {
		if(robot.data.mode == 3 && drRun) { //If already turning:
			run = 0; if(drAngle) drAngle = 0; else //Set desired angle to original angle.
			drAngle = (robot.motorRad==1)?64:-64; //Continue in current motor direction.
			robot.drive(100, (drAngle-angle<0)?-1:1); drRun = 1;
		} else if(robot.data.mode == 3 && run == 1) { //Start new turn in opposite direction:
			run = 0; drAngle = drAngle<0?64:-64; angle = 0; drRun = 1;
			robot.drive(100, (drAngle-angle<0)?-1:1);
		}
	}
	
	//Stop turning when 's' is pressed:
	stopTurn = function() {
		if(robot.data.mode == 3 && drRun) { //If already turning:
			run = 1; drRun = 0; driveLogic(); //Stop turn.
		}
	}
	
	var angle = 0; //Count Angle Changes Using Encoders:
	robot.onMotion = function() {
		angle += robot.delta.angle; console.log("Angle:", angle);
		if(((drAngle >= 0 && angle >= drAngle) || (drAngle < 0 && angle
		<= drAngle)) && drRun) { drRun = 0; run = 1; driveLogic(); }
	}
	
	//Prevent Default Behavior of Buttons in Passive Mode:
	function preventDefault(func) {
		setTimeout(function(){robot.full();if(func)setTimeout(func,500)},1400);
	}
}

function handleInput(robot) {
	//Process user input, quit on 'exit'
	const rl = require('readline').createInterface
	({input:process.stdin, output:process.stdout});
	rl.on('line', function(text) {
		if(text == "exit" || text == "quit") {
			console.log("Exiting..."); process.exit();
		} else if(text == "t") {
			turnRobot(); //Turn Robot.
		} else if(text == "s") {
			stopTurn(); //Stop Turning.
		}
	});
}

start();