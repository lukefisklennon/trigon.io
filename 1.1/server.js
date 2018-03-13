/*
	DYGO.io (server)
	
	� & � iO Ninja
*/

//Setup socket.io and listen on port 3000
var express = require("express");
var app = express();
var server = require("http").Server(app);
var cors = require("cors");
server.listen(80);
app.use(cors());
app.use(express.static("public"));
app.get("/ping",function(request,response) {
	response.send("1");
});
var io = require("socket.io").listen(443);

var rooms = {};
//Players array (associative array)
//Width and height of world
var w = 3000;
var h = 3000;
var dss = 1500;
//Constant number of asteroids in world
var astNum = 20;
//Asteroid size minimum
var astRadiusMin = 40;
//Asteroid size maximum
var astRadiusMax = 150;
//Asteroid ID counter
var aidc = -1;

var ridc = -1;
var roomMax = 100;

var updateTick = 15;

//Class stats
var classes = [
	//Fighter
	{
		reloadTime: 400,
		bulletSpeed: 2,
		bulletRange: 600,
		bulletDamage: 4,
		boostPower: 2,
		mass: 0.02,
		maxHealth: 50,
		healthRegen: 0.01,
		crashDamage: 0.6,
		width: 60,
		height: 80,
		c1: "#0000FF",
		c2: "#0000CC"
	},
	//Tanky
	{
		reloadTime: 400,
		bulletSpeed: 2,
		bulletRange: 700,
		bulletDamage: 3.5,
		boostPower: 1.5,
		mass: 0.03,
		maxHealth: 80,
		healthRegen: 0.03,
		crashDamage: 0.7,
		width: 70,
		height: 90,
		c1: "#FF0000",
		c2: "#CC0000"
	},
	//Striker
	{
		reloadTime: 500,
		bulletSpeed: 3,
		bulletRange: 800,
		bulletDamage: 5,
		boostPower: 2,
		mass: 0.03,
		maxHealth: 40,
		healthRegen: 0.007,
		crashDamage: 0.5,
		width: 60,
		height: 90,
		c1: "#cc00cc",
		c2: "#990099"
	},
	//Speedy
	{
		reloadTime: 400,
		bulletSpeed: 3,
		bulletRange: 500,
		bulletDamage: 3,
		boostPower: 2,
		mass: 0.02,
		maxHealth: 30,
		healthRegen: 0.007,
		crashDamage: 0.2,
		width: 60,
		height: 80,
		c1: "#00FF00",
		c2: "#00CC00"
	},
	//Destroyer
	{
		reloadTime: 500,
		bulletSpeed: 2,
		bulletRange: 500,
		bulletDamage: 4,
		boostPower: 2,
		mass: 0.04,
		maxHealth: 60,
		healthRegen: 0.008,
		crashDamage: 1,
		width: 70,
		height: 60,
		c1: "#CCCCCC",
		c2: "#AAAAAA"
	}
];

//Ability prototypes
//reloadTime is ability cooldown peroid
//use is execute ability
var abilities = [
	{
		reloadTime: 8000,
		use: function(o) {
			ohr = o.stats.healthRegen;
			o.stats.healthRegen = 0.1;
			setTimeout(function() {
				o.stats.healthRegen = ohr;
			}.bind(o),200+o.ability.power*50);
		}
	},
	{
		reloadTime: 3000,
		use: function(o) {
			o.fire();
			velocity = pfa(0,0,o.rotation+Math.PI,2+o.ability.power*0.2);
			o.vx += velocity[0];
			o.vy += velocity[1];
		}
	},
	{
		reloadTime: 8000,
		use: function(o) {
			o.shield = 1;
			o.radius = o.stats.height+10;
			setTimeout(function() {
				o.shield = 0;
				o.radius = o.stats.width-40;
			}.bind(o),1500+o.ability.power*300);
		}
	},
	{
		reloadTime: 8000,
		use: function(o) {
			o.invis = 1;
			setTimeout(function() {
				o.invis = 0;
			}.bind(o),1400+o.ability.power*200);
		}
	}
];

//Function: angle from points
var afp = function(x1,y1,x2,y2) {
	return Math.atan2(y2-y1,x2-x1);
};

//Function: point from angle
var pfa = function(x,y,a,d) {
	return [Math.cos(a)*d+x,Math.sin(a)*d+y];
};

//Function: distance from points
var dfp = function(x1,y1,x2,y2) {
	return Math.sqrt((x1-x2)*(x1-x2)+(y1-y2)*(y1-y2));
};

//Function: return random number in range
var random = function(r) {
	return Math.floor(Math.random()*r);
};

var rtf = function(n,a) {
	return Number(parseFloat(n).toFixed(a));
};

//Function: return a non-reference clone
var copyObject = function(o) {
	o2 = {};
	for (k in o) {
		o2[k] = o[k];
	};
	return o2;
};

//Function: return if object 2 is in view of object 1
var inView = function(x1,y1,x2,y2) {
	if (x1 > x2-dss && x1 < x2+dss && y1 > y2-dss && y1 < y2+dss) {
		return true;
	} else {
		return false;
	};
};

//Function: check collision between two objects
var checkCollision = function(x1,y1,r1,x2,y2,r2) {
	return (dfp(x1,y1,x2,y2) < r1+r2);
};

//Function: bounce two objects using physics
var collide = function(o2,oo2,o1,oo1) {
	//Co-ordinate aliases
	o1x = o1.x;
	o1y = o1.y;
	o2x = o2.x;
	o2y = o2.y;
	
	//oo2 and oo1 instruct the function as to whether to offset o2 or o2 or both by half the width and height of those objects
	if (oo2) {
		o2x += o2.stats.width/2;
		o2y += o2.stats.height/2;
	};
	if (oo1) {
		o1x += o1.stats.width/2;
		o1y += o1.stats.height/2;
	};
	
	//Start by making sure that objects aren't overlapping
	
	//Angle between objects
	angle = afp(o1x,o1y,o2x,o2y);
	//Calculate new position
	point = pfa(o1x,o1y,angle,o1.radius+o2.radius);
	
	//Set new position
	if (oo2) {
		o2.x = point[0]-o2.stats.width/2;
		o2.y = point[1]-o2.stats.height/2;
	} else if (oo1) {
		o2.x = point[0]-o1.stats.width/2;
		o2.y = point[1]-o1.stats.height/2;
	} else {
		o2.x = point[0];
		o2.y = point[1];
	};
	
	//Total velocity
	distance = dfp(0,0,o2.vx,o2.vy) + dfp(0,0,o1.vx,o1.vy);
	//Angle of touching
	bounceAngle = afp(o1x,o1y,o2x,o2y)+Math.PI/2;
	//Angle of velocity
	velAngle = afp(0,0,o2.vx,o2.vy);
	//Angle of bouncing off
	newAngle = bounceAngle+(bounceAngle-velAngle);
	//New velocity
	point = pfa(0,0,newAngle,distance/2);
	o2.vx = point[0];
	o2.vy = point[1];
	
	//Angle for the other object to bounce of at (the opposite of the other angle)
	newAngle += Math.PI;
	point = pfa(0,0,newAngle,distance/2);
	o1.vx = point[0];
	o1.vy = point[1];
};

//Function: return an array with the uncommon elements between two arrays
function compareArray(a1,a2) {
	//Stuff
	var a = [], diff = [];
	for (var i = 0; i < a1.length; i++) {
		a[a1[i]] = true;
	};
	for (var i = 0; i < a2.length; i++) {
		if (a[a2[i]]) {
			delete a[a2[i]];
		} else {
			a[a2[i]] = true;
		};
	};
	for (k in a) {
		diff.push(k);
	};
	return diff;
};

//Apply friction to object with mass
var friction = function(o,m) {
	if (o.vx < 0) {
		o.vx += m;
		if (o.vx > 0) o.vx = 0;
	} else {
		o.vx -= m;
		if (o.vx < 0) o.vx = 0;
	};
	if (o.vy < 0) {
		o.vy += m;
		if (o.vy > 0) o.vy = 0;
	} else {
		o.vy -= m;
		if (o.vy < 0) o.vy = 0;
	};
};

var findRoom = function() {
	freeRooms = [];
	for (k in rooms) {
		if (rooms[k] && Object.keys(rooms[k].players).length < roomMax) {
			freeRooms.push(k);
		};
	};
	if (freeRooms.length > 0) {
		freeRooms = freeRooms.sort(function(a,b) {
			return Object.keys(a.players).length - Object.keys(b.players).length;
		});
		return freeRooms[0];
	} else {
		ridc++;
		rooms[ridc] = new Room(ridc);
		//Setup world
		rooms[ridc].setup();
		//Set update timer
		rooms[ridc].updateInterval = setInterval((rooms[ridc].update).bind(rooms[ridc]),updateTick);
		rooms[ridc].checkNearAstInterval = setInterval((rooms[ridc].checkNearAst).bind(rooms[ridc]),1000);
		return ridc;
	};
};

var Room = function(id) {
	this.id = id;
	this.players = {};
	this.bullets = [];
	this.ast = {};
	this.aidc = -1;
};

//Function: spawn asteroid
Room.prototype.spawnAst = function() {
	this.aidc++;
	this.ast[this.aidc] = new Ast(this.aidc,random(w),random(h),random(astRadiusMax-astRadiusMin)+astRadiusMin,this.id);
};

//Function: setup (create asteroids on server creation)
Room.prototype.setup = function() {
	for (i=0;i<astNum;i++) {
		this.spawnAst();
	};
};

Room.prototype.shake = function(x,y) {
	a = this.getVisible(x,y,1000,true);
	for (k in a) {
		this.players[a[k]].io.emit("shake");
	};
};

//Function: emit the deletion of a bullet
Room.prototype.deleteBullet = function(index) {
	if (this.bullets[index]) {
		//Get nearby players
		a = this.getVisible(this.bullets[index].x,this.bullets[index].y,1000,false);
		for (k in a) {
			//Emit to them
			this.players[a[k]].io.emit("deleteBullet",this.bullets[index].id);
		};
		//Splice the bullet from the array
		this.bullets.splice(index,1);
	};
};

//Function: return visible players with the co-ordinates of an object
Room.prototype.getVisible = function(x,y,d,c) {
	a = [];
	//For each player...
	for (pid in this.players) {
		//c means if the player needs to be alive (false means yes, true means no)
		if (!c || this.players[pid].alive) {
			//If distance is less than d...
			if (inView(x,y,this.players[pid].x,this.players[pid].y)) {//dfp(x,y,players[pid].x,players[pid].y) < d) {
				//Add to temporary a
				a.push(pid);
			};
		};
	};
	//Return a
	return a;
};

//Function: get an array of objects with leaderboard data
Room.prototype.getLeaderboard = function() {
	a1 = [];
	//For each player...
	for (pid in this.players) {
		//If alive...
		if (this.players[pid].alive) {
			//Add to array
			a1.push([pid,this.players[pid].name,this.players[pid].score]);
		};
	};
	//Sort by score and return
	a1 = a1.sort(function(a,b) {
		return b[2] - a[2];
	});
	a2 = [];
	for (k in a1) {
		a2 = a2.concat([a1[k][0],a1[k][1],a1[k][2]]);
	};
	return a2;
};

//Function: emit leaderboard to everyone
Room.prototype.emitLeaderboard = function() {
	io.to(this.id).emit("board",this.getLeaderboard());
};

Room.prototype.die = function() {
	clearInterval(this.updateInterval);
	clearInterval(this.checkNearAstInterval);
	delete rooms[this.id];
};

//Bounce an object of a wall (if colliding with said wall)
var wallBounce = function(o,oo) {
	//Co-ordinate aliases
	ox = o.x;
	oy = o.y;
	offx = 0;
	offy = 0;
	//Calculate offset if oo
	if (oo) {
		offx = o.stats.width/2;
		offy = o.stats.height/2;
		ox += offx;
		oy += offy;
	};
	//Check and bounce off each wall
	if (ox < 0 + o.radius) {
		o.x = 0 + o.radius - offx;
		o.vx *= -0.5;
	};
	if (ox > w - o.radius) {
		o.x = w - o.radius - offx;
		o.vx *= -0.5;
	};
	if (oy < 0 + o.radius) {
		o.y = 0 + o.radius - offy;
		o.vy *= -0.5;
	};
	if (oy > h - o.radius) {
		o.y = h - o.radius - offy;
		o.vy *= -0.5;
	};
};

//ld = Date.now();
Room.prototype.update = function() {
	//Update players
	for (id in this.players) {
		if (this.players[id].alive) {
			this.players[id].update();
		};
	};
	//Emit to players
	for (id in this.players) {
		this.players[id].emit();
	};
	//Update asteroids
	for (i in this.ast) {
		this.ast[i].update();
	};
	//Update bullets
	for (i in this.bullets) {
		this.bullets[i].update();
	};
	//console.log(Date.now()-ld);
	//ld = Date.now();
};

Room.prototype.checkNearAst = function() {
	for (aid in this.ast) {
		this.ast[aid].checkNearAst();
	};
};

//Player prototype
var Player = function(id,client,room) {
	//Client socket.io object
	this.io = client;
	//ID
	this.id = id;
	this.room = room;
	this.io.join(this.room);
	//Name
	this.name = "Anonymous";
	//If alive
	this.alive = false;
	//X and Y (middle)
	this.x = w/2;
	this.y = h/2;
	//Visible players and asteroids ID arrays
	this.visiblePlayers = [];
	this.visibleAst = [];
	this.knownAst = [];
	//Initial class
	this.cls = 0;
	//Inital ability
	this.abilityIndex = 0;
	this.score = 0;
	//Check visible world on timer
	this.checkVisibleInterval = setInterval((this.checkVisible).bind(this),500);
	//Socket.io listeners
	this.io.on("mousemove",(this.mouseMoveEvent).bind(this));
	this.io.on("mousedown",(this.mouseDownEvent).bind(this));
	this.io.on("spacedown",(this.spaceDownEvent).bind(this));
	this.io.on("disconnect",(this.disconnect).bind(this));
	this.io.on("upgrade",(this.upgrade).bind(this));
	this.io.emit("self",{id:this.id,x:this.x,y:this.y});
	this.io.on("ready",(this.ready).bind(this));
	this.io.on("dev",function(m) {
		io.emit("notify","Developer message: "+m);
	});
	//Emit updated leaderboard to all
	rooms[this.room].emitLeaderboard();
};

//When the client is ready (when they hit "Play")
Player.prototype.ready = function(n,c,a) {
	this.alive = true;
	if (n == "") {
		this.name = "Anonymous";
	} else {
		this.name = n;
	};
	this.reset(c,a);
	this.io.emit("ready",this.name,this.points);
	rooms[this.room].emitLeaderboard();
};

//Reset player
Player.prototype.reset = function(n,a) {
	//Set random position
	this.x = random(w);
	this.y = random(h);
	//Mouse and spacebar activated booleans
	this.mouseDown = 0;
	this.spaceDown = 0;
	//Rotation
	this.rotation = 0;
	//Last times bullet fired and ability activated
	this.lastFired = 0;
	this.lastAbility = 0;
	//Velocity x and y
	this.vx = 0;
	this.vy = 0;
	//Shield and invisibility booleans
	this.shield = 0;
	this.invis = 0;
	//Set class and ability to those chosen by client
	this.cls = n;
	this.abilityIndex = a;
	//Transfer ability data and function from prototype array
	this.ability = {
		power: 1,
		reloadTime: abilities[a].reloadTime,
		use: abilities[a].use
	};
	//Clear visible players and asteroids ID arrays
	this.visiblePlayers = [];
	//this.visibleAst = [];
	//Get class stats for class ID supplied by client
	this.stats = copyObject(classes[n]);
	//Upgrade action data
	this.upgrades = [
		{
			name: "Max Health",
			level: 1,
			stat: "maxHealth",
			amount: 10
		},
		{
			name: "Health Regen",
			level: 1,
			stat: "healthRegen",
			amount: 0.005
		},
		{
			name: "Boost Power",
			level: 1,
			stat: "boostPower",
			amount: 0.5
		},
		{
			name: "Reload Speed",
			level: 1,
			stat: "reloadTime",
			amount: -10
		},
		{
			name: "Bullet Damage",
			level: 1,
			stat: "bulletDamage",
			amount: 2
		},
		{
			name: "Bullet Range",
			level: 1,
			stat: "bulletRange",
			amount: 100
		},
		{
			name: "Bullet Speed",
			level: 1,
			stat: "bulletSpeed",
			amount: 1
		},
		{
			name: "Crash Damage",
			level: 1,
			stat: "crashDamage",
			amount: 0.15
		},
		{
			name: "Ability",
			level: 1,
		}
	];
	//Radius
	this.radius = this.stats.width-40;
	//Health
	this.hp = this.stats.maxHealth;
	//Points and score
	this.points = Math.round(this.score/3);
	this.score = 0;
	//Check visible world
	this.checkVisible();
};

//Emit function
Player.prototype.emit = function() {
	if (this.alive) {
		ps = [rtf(this.x,1),rtf(this.y,1),rtf(this.hp/this.stats.maxHealth,2),this.shield,this.invis];
	} else {
		ps = [rtf(this.x,1),rtf(this.y,1)];
	};
	pa = [];
	aa = [];
	for (j in this.visiblePlayers) {
		//For visible players, compile data array
		pid = this.visiblePlayers[j];
		if (pid != this.id && rooms[this.room].players[pid].alive) {
			pa = pa.concat([pid,rtf(rooms[this.room].players[pid].x,1),rtf(rooms[this.room].players[pid].y,1),rtf(rooms[this.room].players[pid].rotation,2),rtf(rooms[this.room].players[pid].hp/rooms[this.room].players[pid].stats.maxHealth,2),rooms[this.room].players[pid].shield,rooms[this.room].players[pid].invis]);
		};
	};
	for (i in this.visibleAst) {
		//For visible asteroids, compile data array
		aid = this.visibleAst[i];
		aa = aa.concat([aid,rtf(rooms[this.room].ast[aid].x,1),rtf(rooms[this.room].ast[aid].y,1),rtf(rooms[this.room].ast[aid].radius,1),rtf(rooms[this.room].ast[aid].hp/rooms[this.room].ast[aid].maxHealth,1)]);
	};
	//Emit update event
	this.io.emit("update",ps,pa,aa);
};

//Check visible using getVisible and compareArray functions
Player.prototype.checkVisible = function() {
	oldArray = this.visiblePlayers;
	this.visiblePlayers = rooms[this.room].getVisible(this.x,this.y,1000,true);
	difference = compareArray(this.visiblePlayers,oldArray);
	for (i in difference) {
		if (this.visiblePlayers.indexOf(difference[i]) != -1) {
			this.io.emit("player",{id:difference[i],x:rooms[this.room].players[difference[i]].x,y:rooms[this.room].players[difference[i]].y,name:rooms[this.room].players[difference[i]].name,hp:rooms[this.room].players[difference[i]].hp/rooms[this.room].players[difference[i]].stats.maxHealth,cls:rooms[this.room].players[difference[i]].cls});
		};
	};
	this.visibleAst = [];
	for (aid in rooms[this.room].ast) {
		if (inView(this.x,this.y,rooms[this.room].ast[aid].x,rooms[this.room].ast[aid].y)) {
			this.visibleAst.push(aid);
		};
	};
};

//Fire bullet
Player.prototype.fire = function() {
	//New bullet ID
	bid = Date.now();
	//Create bullet origin point
	point = pfa(this.x,this.y,this.rotation,0);//this.radius+100);
	//Offset by player size
	point[0] += this.stats.width/2;
	point[1] += this.stats.height/2;
	//Add bullet to array
	rooms[this.room].bullets.push(new Bullet(this.id,bid,point[0],point[1],this.rotation,8+this.stats.bulletDamage*1,this.stats.bulletSpeed,this.stats.bulletRange,this.stats.bulletDamage,this.stats.boostPower,this.room));
	//Use bullet to push player
	velocity = pfa(0,0,this.rotation+Math.PI,this.stats.boostPower);
	this.vx += velocity[0];
	this.vy += velocity[1];
	//Emit fire event
	a = rooms[this.room].getVisible(this.x+this.stats.width/2,this.y+this.stats.height/2,this.stats.bulletRange,false);
	for (j in a) {
		rooms[this.room].players[a[j]].io.emit("fire",this.id,bid,point[0],point[1],this.rotation,this.stats.bulletSpeed,this.stats.bulletRange,8+this.stats.bulletDamage*1,this.cls);
	};
};

//Use ability function
Player.prototype.use = function() {
	this.ability.use(this);
	this.io.emit("use",this.ability.reloadTime);
};

//Destruction and disconnection function for resetting player and notifiying all
Player.prototype.die = function(id) {
	this.alive = false;
	if (rooms[this.room].players[id]) {
		diff = this.score-rooms[this.room].players[id].score;
		if (diff < 0) diff = 0;
		rooms[this.room].players[id].addPoints(diff,diff);
		//this.reset(this.cls,this.abilityIndex);
		if (id == this.id) {
			nt = this.name+" destroyed themself";
		} else {
			nt = rooms[this.room].players[id].name+" destroyed "+this.name;
		};
		//io.to(this.room).emit("notify",nt);
		rooms[this.room].players[id].io.broadcast.emit("notify",nt);
		noun = "points";
		if (diff == 1) noun = "point";
		rooms[this.room].players[id].io.emit("notify","+"+diff+" "+noun+"<br>You destroyed "+this.name);
	};
	this.io.emit("die");
	rooms[this.room].emitLeaderboard();
};

//On disconnect...
Player.prototype.disconnect = function() {
	clearInterval(this.checkVisibleInterval);
	rooms[this.room].emitLeaderboard();
	for (pid in rooms[this.room].players) {
		rooms[this.room].players[pid].visiblePlayers.splice(rooms[this.room].players[pid].visiblePlayers.indexOf(String(this.id)),1);
	};
	delete rooms[this.room].players[this.id];
	if (Object.keys(rooms[this.room].players).length < 1) {
		rooms[this.room].die();
	};
};

//Upgrade function
Player.prototype.upgrade = function(id) {
	if (this.upgrades[id].level*10 <= this.points && this.upgrades[id].level < 11) {
		this.points -= this.upgrades[id].level*10;	
		this.upgrades[id].level++;
		this.upgrades[id].cost = this.upgrades[id].level*10;
		//If upgrade is "ability", upgrade ability
		if (id == 8) {
			this.ability.power++;
		} else {
			this.stats[this.upgrades[id].stat] += this.upgrades[id].amount;
		};
	};
};

//Add points to player
Player.prototype.addPoints = function(p,s) {
	this.points += Math.round(p);
	this.score += Math.round(s);
	this.io.emit("points",this.points,this.score);
	rooms[this.room].emitLeaderboard();
};

//Update player
Player.prototype.update = function() {
	//If the mouse is being clicked, and cooldown is over, fire!
	if (this.mouseDown) {
		if ((Date.now()-this.lastFired) > this.stats.reloadTime) {
			this.lastFired = Date.now();
			this.fire();
		};
	};
	//If the spacebar is being pressed, and cooldown is over, use ability!
	if (this.spaceDown) {
		if ((Date.now()-this.lastAbility) > this.ability.reloadTime) {
			this.lastAbility = Date.now();
			this.use();
		};
	};
	//Regenerate health
	this.hp += this.stats.healthRegen;
	//maxHealth limit
	if (this.hp > this.stats.maxHealth) this.hp = this.stats.maxHealth;
	//Apply friction
	friction(this,this.stats.mass);
	//Move by acceleration
	this.x += this.vx;
	this.y += this.vy;
	
	culprit = this.id;
	//Check collision with other players
	for (pid in rooms[this.room].players) {
		//If colliding...
		if (pid != this.id && rooms[this.room].players[pid].alive && checkCollision(this.x,this.y,this.radius,rooms[this.room].players[pid].x,rooms[this.room].players[pid].y,rooms[this.room].players[pid].radius)) {
			//Total velocity
			tv = dfp(0,0,this.vx,this.vy)+dfp(0,0,rooms[this.room].players[pid].vx,rooms[this.room].players[pid].vy);
			//Subtract hp
			if (!this.shield) {
				this.hp -= tv*rooms[this.room].players[pid].stats.crashDamage;
			};
			if (!rooms[this.room].players[pid].shield) {
				rooms[this.room].players[pid].hp -= tv*this.stats.crashDamage;
			};
			culprit = pid;
			//Bounce!
			collide(this,true,rooms[this.room].players[pid],true);
		};
	};
	//Check bullet collision
	for (j in rooms[this.room].bullets) {
		if (this.id != rooms[this.room].bullets[j].owner || /*(Date.now()-rooms[this.room].bullets[j].created) > 500*/rooms[this.room].bullets[j].wallHit) {
			//if (checkCollision(this.x,this.y,this.stats.width,this.stats.height,bullets[j].x-5,bullets[j].y-5,10,10)) {
			//If colliding...
			if (checkCollision(this.x+this.stats.width/2,this.y+this.stats.height/2,this.radius+20,rooms[this.room].bullets[j].x,rooms[this.room].bullets[j].y,rooms[this.room].bullets[j].radius)) {
				//Push self
				vector = pfa(0,0,rooms[this.room].bullets[j].angle,rooms[this.room].bullets[j].push);//rooms[this.room].players[rooms[this.room].bullets[j].owner].stats.boostPower);
				this.vx += vector[0];
				this.vy += vector[1];
				//Subtract damage
				if (!this.shield) {
					this.hp -= rooms[this.room].bullets[j].damage;
				};
				culprit = rooms[this.room].bullets[j].owner;
				//Delete bullet
				rooms[this.room].deleteBullet(j);
				break;
			};
		};
	};
	//Check asteroid collision (like for players)
	for (aid in rooms[this.room].ast) {
		if (checkCollision(this.x+this.stats.width/2,this.y+this.stats.height/2,this.radius,rooms[this.room].ast[aid].x,rooms[this.room].ast[aid].y,rooms[this.room].ast[aid].radius)) {
			tv = dfp(0,0,this.vx,this.vy)+dfp(0,0,rooms[this.room].ast[aid].vx,rooms[this.room].ast[aid].vy);
			this.hp -= tv*0.2;
			rooms[this.room].ast[aid].hp -= tv*this.stats.crashDamage;
			collide(this,true,rooms[this.room].ast[aid],false);
			if (rooms[this.room].ast[aid].hp < 0) {
				rooms[this.room].ast[aid].die(this.id);
				rooms[this.room].spawnAst();
			};
		};
	};
	//If less than zero hp, then die
	if (this.hp < 0) {
		rooms[this.room].shake(this.x,this.y);
		this.die(culprit);
	};
	//Bounce of walls
	wallBounce(this,true);
};

//Set rotation on mousemove
Player.prototype.mouseMoveEvent = function(a) {
	this.rotation = a;
};

//Set mouseDown on mousedown
Player.prototype.mouseDownEvent = function(v) {
	this.mouseDown = v;
};

//Set spaceDown on space press
Player.prototype.spaceDownEvent = function(v) {
	this.spaceDown = v;
};

//Bullet prototype
var Bullet = function(owner,id,x,y,a,r,s,range,d,push,room) {
	//ID
	this.id = id;
	this.room = room;
	//Bullet owner
	this.owner = owner;
	//X and Y
	this.x = x;
	this.y = y;
	this.radius = r;
	//Angle
	this.angle = a;
	//Speed
	this.speed = s;
	//Damage
	this.damage = d;
	this.push = push;
	this.wallHit = false;
	//Time created
	this.ox = x;
	this.oy = y;
	//Range
	this.range = range;
	//Last updated for delta compensation
	this.lastUpdate = Date.now();
};

//Update function
Bullet.prototype.update = function() {
	//Delta compensation multiplier
	m = (Date.now()-this.lastUpdate)/5;
	//If time exceeds lifetime, delete
	//if ((Date.now()-this.created) > this.range) {
	if (dfp(this.ox,this.oy,this.x,this.y) > this.range) {
		rooms[this.room].bullets.splice(rooms[this.room].bullets.indexOf(this),1);
		//rooms[this.room].deleteBullet(this.id);
	};
	//Move due to velocity
	point = pfa(this.x,this.y,this.angle,this.speed*m);
	this.x = point[0];
	this.y = point[1];
	//Wall bounce
	f = 0;
	if (this.x < 0) {
		this.x = 0;
		f = 1;
	};
	if (this.x > w) {
		this.x = w;
		f = 1;
	};
	if (this.y < 0) {
		this.y = 0;
		f = 2;
	};
	if (this.y > h) {
		this.y = h;
		f = 2;
	};
	if (f > 0) {
		this.wallHit = true;
		if (f == 1) {
			this.angle = Math.PI-this.angle;
		} else {
			this.angle = 0-this.angle;
		};
	};
	this.lastUpdate = Date.now();
};

//Asteroid prototype
var Ast = function(id,x,y,r,room) {
	//ID
	this.id = id;
	//X and Y
	this.x = x;
	this.y = y;
	//Radius
	this.radius = r;
	this.room = room;
	//Health
	this.hp = r/4;
	//Maximum health
	this.maxHealth = this.hp;
	//Mass
	this.mass = this.radius/10000;
	//Velocity X and Y
	this.vx = 0;
	this.vy = 0;
	this.nearAst = [];
	//Initial update
	this.update();
	this.checkNearAst();
	//Inital wall bounce
	wallBounce(this,false);
};

//Emit self to nearby players
Ast.prototype.emit = function() {
	a = rooms[this.room].getVisible(this.x,this.y,1000,false);
	for (k in a) {
		if (rooms[this.room].players[a[k]].visibleAst.indexOf(this.id) == -1) {
			rooms[this.room].players[a[k]].visibleAst.push(this.id);
			rooms[this.room].players[a[k]].io.emit("asteroid",{id:this.id,x:this.x,y:this.y,r:this.radius,hp:this.hp/this.maxHealth});
		};
	};
};

//Update function
Ast.prototype.update = function() {
	//Apply friction
	friction(this,this.mass*2);
	//If not moving, sleep
	if (this.vx == 0 && this.vy == 0) {
		this.sleeping = true;
	} else {
		//Else, move
		this.sleeping = false;
		this.x += this.vx;
		this.y += this.vy;
	};
	//Collide with asteroids
	//console.log(this.room);
	//console.log(Object.keys(rooms).length);
	if (rooms[this.room]) {
		for (aid in this.nearAst) {//rooms[this.room].ast) {
			aid = this.nearAst[aid];
			if (rooms[this.room].ast[aid]) {
				if (aid != this.id && checkCollision(this.x,this.y,this.radius,rooms[this.room].ast[aid].x,rooms[this.room].ast[aid].y,rooms[this.room].ast[aid].radius)) {
					collide(this,false,rooms[this.room].ast[aid],false);
				};
			};
		};
		//Detect collision with bullets and take damage (like players)
		for (j in rooms[this.room].bullets) {
			if (checkCollision(this.x,this.y,this.radius,rooms[this.room].bullets[j].x,rooms[this.room].bullets[j].y,rooms[this.room].bullets[j].radius)) {
				this.hp -= rooms[this.room].bullets[j].damage;
				vector = pfa(0,0,rooms[this.room].bullets[j].angle,rooms[this.room].bullets[j].push);//rooms[this.room].players[rooms[this.room].bullets[j].owner].stats.boostPower);
				this.vx += vector[0];
				this.vy += vector[1];
				if (this.hp < 0) {
					if (rooms[this.room].bullets[j] && rooms[this.room].players[rooms[this.room].bullets[j].owner]) {
						this.die(rooms[this.room].bullets[j].owner);
					};
					rooms[this.room].spawnAst();
				};
				rooms[this.room].deleteBullet(j);
			};
		};
	};
	//Wall bounce
	wallBounce(this,false);
};

Ast.prototype.checkNearAst = function() {
	this.nearAst = [];
	if (rooms[this.room].ast) {
		for (aid in rooms[this.room].ast) {
			if (dfp(this.x,this.y,rooms[this.room].ast[aid].x,rooms[this.room].ast[aid].y) < 2000) {
				this.nearAst.push(aid);
			};
		};
	};
};

//Destruction function
Ast.prototype.die = function(c) {
	//Notify players and remove self ID from their visibleAst arrays
	for (pid in rooms[this.room].players) {
		rooms[this.room].players[pid].visibleAst.splice(rooms[this.room].players[pid].visibleAst.indexOf(String(this.id)),1);
	};
	//Give points
	rooms[this.room].players[c].addPoints(this.radius/25,this.radius/25);
	rooms[this.room].shake(this.x,this.y);
	//Delete self
	delete rooms[this.room].ast[this.id];
};

ridc++;
rooms[ridc] = new Room(ridc);
//Setup world
rooms[ridc].setup();
//Set update timer
rooms[ridc].updateInterval = setInterval((rooms[ridc].update).bind(rooms[ridc]),updateTick);
rooms[ridc].checkNearAstInterval = setInterval((rooms[ridc].checkNearAst).bind(rooms[ridc]),1000);

//On connection
io.on("connection", function(client) {
	id = Date.now();
	//Create player with new ID
	r = findRoom();
	rooms[r].players[id] = new Player(id,client,r);
});