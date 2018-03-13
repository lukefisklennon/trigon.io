/*
	DYGO.io (server)
	
	� & � iO Ninja
*/

//Setup socket.io and listen on port 3000
var io = require("socket.io").listen(3000);

//Players array (associative array)
var players = {};
//Bullets array
var bullets = [];
//Asteroids array (associative array)
var ast = {};
//var obj = [];
//Width and height of world
var w = 3000;
var h = 3000;
//Constant number of asteroids in world
var astNum = 20;
//Asteroid size minimum
var astRadiusMin = 40;
//Asteroid size maximum
var astRadiusMax = 150;
//Asteroid ID counter
var aidc = -1;

//Class stats
var classes = [
	//Fighter
	{
		reloadTime: 400,
		bulletSpeed: 1.5,
		bulletLife: 2000,
		bulletDamage: 5,
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
		bulletLife: 3000,
		bulletDamage: 5,
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
		bulletSpeed: 4,
		bulletLife: 3000,
		bulletDamage: 8,
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
		bulletLife: 1000,
		bulletDamage: 3,
		boostPower: 3,
		mass: 0.02,
		maxHealth: 30,
		healthRegen: 0.007,
		crashDamage: 0.5,
		width: 60,
		height: 80,
		c1: "#00FF00",
		c2: "#00CC00"
	},
	//Destroyer
	{
		reloadTime: 500,
		bulletSpeed: 2,
		bulletLife: 2000,
		bulletDamage: 4,
		boostPower: 2,
		mass: 0.04,
		maxHealth: 60,
		healthRegen: 0.008,
		crashDamage: 1,
		width: 90,
		height: 80,
		c1: "#CCCCCC",
		c2: "#AAAAAA"
	}
];

//Ability prototypes
//reloadTime is ability cooldown peroid
//use is execute ability
var abilities = [
	{
		reloadTime: 3000,
		use: function(o) {
			ohr = o.stats.healthRegen;
			o.stats.healthRegen = 0.3;
			setTimeout(function() {
				o.stats.healthRegen = ohr;
			}.bind(o),500+o.ability.power*200);
		}
	},
	{
		reloadTime: 3000,
		use: function(o) {
			o.fire();
			velocity = pfa(0,0,o.rotation+Math.PI,o.ability.power*8);
			o.vx += velocity[0];
			o.vy += velocity[1];
		}
	},
	{
		reloadTime: 8000,
		use: function(o) {
			o.shield = true;
			setTimeout(function() {
				o.shield = false;
			}.bind(o),1500+o.ability.power*300);
		}
	},
	{
		reloadTime: 8000,
		use: function(o) {
			o.invis = true;
			setTimeout(function() {
				o.invis = false;
			}.bind(o),1500+o.ability.power*300);
		}
	}
];

//Function: spawn asteroid
var spawnAst = function() {
	aidc++;
	ast[aidc] = new Ast(aidc,random(w),random(h),random(astRadiusMax-astRadiusMin)+astRadiusMin);
};

//Function: setup (create asteroids on server creation)
var setup = function() {
	for (i=0;i<astNum;i++) {
		spawnAst();
	};
};

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
	if (x1 > x2-1000 && x1 < x2+1000 && y1 > y2-1000 && y1 < y2+1000) {
		return true;
	} else {
		return false;
	};
};

//var checkCollision = function(x1,y1,w1,h1,x2,y2,w2,h2) {
//	return !(x2 > x1+w1 || x2+w2 < x1 || y2 > y1+h1 || y2+h2 < y1);
//};

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

//Function: emit the deletion of a bullet
var deleteBullet = function(index) {
	//Get nearby players
	a = getVisible(bullets[index].x,bullets[index].y,1000,false);
	for (k in a) {
		//Emit to them
		players[a[k]].io.emit("deleteBullet",bullets[index].id);
	};
	//Splice the bullet from the array
	bullets.splice(index,1);
};

//Function: return visible players with the co-ordinates of an object
var getVisible = function(x,y,d,c) {
	a = [];
	//For each player...
	for (pid in players) {
		//c means if the player needs to be alive (false means yes, true means no)
		if (!c || players[pid].alive) {
			//If distance is less than d...
			if (dfp(x,y,players[pid].x,players[pid].y) < d) {
				//Add to temporary a
				a.push(pid);
			};
		};
	};
	//Return a
	return a;
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

//Function: get an array of objects with leaderboard data
var getLeaderboard = function() {
	a = [];
	//For each player...
	for (pid in players) {
		//If alive...
		if (players[pid].alive) {
			//Add to array
			a.push({id:pid,name:players[pid].name,score:players[pid].score});
		};
	};
	//Sort by score and return
	return a.sort(function(a,b) {
		return b.score - a.score;
	});
};

//Function: emit leaderboard to everyone
var emitLeaderboard = function() {
	io.emit("board",getLeaderboard());
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

//Player prototype
var Player = function(id,client) {
	//Client socket.io object
	this.io = client;
	//ID
	this.id = id;
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
	//Initial class
	this.cls = 0;
	//Inital ability
	this.abilityIndex = 0;
	//If client connected
	this.connected = true;
	//Check visible world on timer
	setInterval((this.checkVisible).bind(this),500);
	//Socket.io listeners
	this.io.on("mousemove",(this.mouseMoveEvent).bind(this));
	this.io.on("mousedown",(this.mouseDownEvent).bind(this));
	this.io.on("spacedown",(this.spaceDownEvent).bind(this));
	this.io.on("disconnect",(this.disconnect).bind(this));
	this.io.on("upgrade",(this.upgrade).bind(this));
	this.io.emit("self",{id:this.id,x:this.x,y:this.y});
	this.io.on("ready",(this.ready).bind(this));
	//Emit updated leaderboard to all
	emitLeaderboard();
};

//When the client is ready (when they hit "Play")
Player.prototype.ready = function(n,c,a) {
	this.alive = true;
	this.name = n;
	this.reset(c,a);
	this.io.emit("ready",this.name);
	emitLeaderboard();
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
	this.shield = false;
	this.invis = false;
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
			amount: 1
		},
		{
			name: "Reload Speed",
			level: 1,
			stat: "reloadTime",
			amount: -50
		},
		{
			name: "Bullet Damage",
			level: 1,
			stat: "bulletDamage",
			amount: 3
		},
		{
			name: "Bullet Range",
			level: 1,
			stat: "bulletLife",
			amount: 50
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
	this.points = 10;
	this.score = 0;
	//Check visible world
	this.checkVisible();
};

//Emit function
Player.prototype.emit = function() {
	pa = [];
	aa = [];
	for (j in this.visiblePlayers) {
		//For visible players, compile data array
		pid = this.visiblePlayers[j];
		if (players[pid].alive) {
			//pa.push({id:pid,x:players[pid].x,y:players[pid].y,a:players[pid].rotation,hp:players[pid].hp/players[pid].stats.maxHealth,shield:players[pid].shield,invis:players[pid].invis});
			pa = pa.concat([pid,players[pid].x,players[pid].y,players[pid].rotation,players[pid].hp/players[pid].stats.maxHealth,players[pid].shield,players[pid].invis]);
		};
	};
	for (i in this.visibleAst) {
		//For visible asteroids, compile data array
		aid = this.visibleAst[i];
		if (!ast[aid].sleeping) {
			//aa.push({id:id,x:ast[id].x,y:ast[id].y,r:ast[id].radius,hp:ast[id].hp/ast[id].maxHealth});
			aa = aa.concat([aid,ast[aid].x,ast[aid].y,ast[aid].radius,ast[aid].hp/ast[aid].maxHealth]);
		};
	};
	//Emit update event
	this.io.emit("update",pa,aa);
};

//Check visible using getVisible and compareArray functions
Player.prototype.checkVisible = function() {
	//this.visiblePlayers = [];
	/*for (id in players) {
		if (dfp(this.x,this.y,players[id].x,players[id].y) < 1000 && players[id].alive) {
			if (this.visiblePlayers.indexOf(id) < 0) {
				this.visiblePlayers.push(id);
				if (id != this.id) {
					this.io.emit("player",{id:id,x:players[id].x,y:players[id].y,name:players[id].name,hp:players[id].hp,cls:players[id].cls});
				};
			};
		};
	};*/
	/*for (j in this.visiblePlayers) {
		if (dfp(this.x,this.y,players[this.visiblePlayers[j]].x,players[this.visiblePlayers[j]].y) > 1000 || !players[id].alive) {
			this.visiblePlayers.splice(j,1);
		};
	};*/
	//------------------------------------------------------------------------------------------------------------------
	oldArray = this.visiblePlayers;
	this.visiblePlayers = getVisible(this.x,this.y,1000,true);
	difference = compareArray(this.visiblePlayers,oldArray);
	for (i in difference) {
		this.io.emit("player",{id:difference[i],x:players[difference[i]].x,y:players[difference[i]].y,name:players[difference[i]].name,hp:players[difference[i]].hp/players[difference[i]].stats.maxHealth,cls:players[difference[i]].cls});
	};
	/*oldArray = this.visibleAst;
	this.visibleAst = getNearAst(this.x,this.y,1000,true);
	difference = compareArray(this.visibleAst,oldArray);
	for (i in difference) {
		this.io.emit("asteroid",{id:ast[i].id,x:ast[i].x,y:ast[i].y,r:ast[i].radius,hp:ast[i].hp});
	};*/
	//------------------------------------------------------------------------------------------------------------------
	/*this.visibleAst = [];
	for (aid in ast) {
		//if (dfp(this.x,this.y,ast[j].x,ast[j].y) < 2000) {
		if (inView(this.x,this.y,ast[aid].x,ast[aid].y)) {
			//if (this.visibleAst.indexOf(j) < 0) {
				this.visibleAst.push(aid);
				this.io.emit("asteroid",{id:ast[aid].id,x:ast[aid].x,y:ast[aid].y,r:ast[aid].radius,hp:ast[aid].hp});
			//};
		};
	};
	for (aid in this.visibleAst) {
		//if (dfp(this.x,this.y,ast[this.visibleAst[j]].x,ast[this.visibleAst[j]].y) > 2000) {
		if (!inView(this.x,this.y,ast[aid].x,ast[aid].y)) {
			this.visibleAst.splice(aid,1);
		};
	};*/
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
	bullets.push(new Bullet(this.id,bid,point[0],point[1],this.rotation,this.stats.bulletSpeed,this.stats.bulletLife,this.stats.bulletDamage));
	//Use bullet to push player
	velocity = pfa(0,0,this.rotation+Math.PI,this.stats.boostPower);
	this.vx += velocity[0];
	this.vy += velocity[1];
	//Emit fire event
	a = getVisible(this.x+this.stats.width/2,this.y+this.stats.height/2,1000,false);
	for (j in a) {
		players[a[j]].io.emit("fire",this.id,bid,point[0],point[1],this.rotation,this.stats.bulletSpeed,this.stats.bulletLife,8+this.stats.bulletDamage*1,this.cls);
	};
};

//Use ability function
Player.prototype.use = function() {
	this.ability.use(this);
	this.io.emit("use",this.ability.reloadTime);
};

//Destruction and disconnection function for resetting player and notifiying all
Player.prototype.die = function() {
	this.alive = false;
	this.reset(this.cls,this.abilityIndex);
	this.io.broadcast.emit("death",this.id);
	this.io.emit("die");
	emitLeaderboard();
};

//On disconnect...
Player.prototype.disconnect = function() {
	this.die();
	this.connected = false;
};

//Upgrade function
Player.prototype.upgrade = function(id) {
	if (this.upgrades[id].level*10 <= this.points) {
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
Player.prototype.addPoints = function(n) {
	this.points += Math.round(n);
	this.score += Math.round(n);
	this.io.emit("points",this.points,this.score);
	emitLeaderboard();
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
	//Check collision with other players
	for (pid in players) {
		//If colliding...
		if (pid != this.id && checkCollision(this.x,this.y,this.radius,players[pid].x,players[pid].y,players[pid].radius)) {
			//Total velocity
			tv = dfp(0,0,this.vx,this.vy)+dfp(0,0,players[pid].vx,players[pid].vy);
			//Subtract hp
			if (!this.shield) {
				this.hp -= tv*players[pid].stats.crashDamage;
			};
			if (!players[pid].shield) {
				players[pid].hp -= tv*this.stats.crashDamage;
			};
			//Bounce!
			collide(this,true,players[pid],true);
		};
	};
	//Check bullet collision
	for (j in bullets) {
		if (this.id != bullets[j].owner || (Date.now()-bullets[j].created) > 500) {
			//if (checkCollision(this.x,this.y,this.stats.width,this.stats.height,bullets[j].x-5,bullets[j].y-5,10,10)) {
			//If colliding...
			if (checkCollision(this.x,this.y,this.radius,bullets[j].x,bullets[j].y,10)) {
				//Push self
				vector = pfa(0,0,bullets[j].angle,players[bullets[j].owner].stats.boostPower);
				this.vx += vector[0];
				this.vy += vector[1];
				//Subtract damage
				if (!this.shield) {
					this.hp -= bullets[j].damage;
				};
				//Delete bullet
				deleteBullet(j);
			};
		};
	};
	//Check asteroid collision (like for players)
	for (aid in ast) {
		if (checkCollision(this.x+this.stats.width/2,this.y+this.stats.height/2,this.radius,ast[aid].x,ast[aid].y,ast[aid].radius)) {
			tv = dfp(0,0,this.vx,this.vy)+dfp(0,0,ast[aid].vx,ast[aid].vy);
			this.hp -= tv*0.2;
			ast[aid].hp -= tv*this.stats.crashDamage;
			collide(this,true,ast[aid],false);
			if (ast[aid].hp < 0) {
				ast[aid].die();
			};
		};
	};
	//If less than zero hp, then die
	if (this.hp < 0) {
		//players[bullets[j].owner].points += this.score+10;
		//players[bullets[j].owner].score += this.score+10;
		//players[bullets[j].owner].io.emit("points",players[bullets[j].owner].points,players[bullets[j].owner].score);
		//Give points to the culprit
		players[bullets[j].owner].addPoints(this.score+10);
		this.die();
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
var Bullet = function(owner,id,x,y,a,s,l,d) {
	//ID
	this.id = id;
	//Bullet owner
	this.owner = owner;
	//X and Y
	this.x = x;
	this.y = y;
	//Angle
	this.angle = a;
	//Speed
	this.speed = s;
	//Damage
	this.damage = d;
	//Time created
	this.created = Date.now();
	//How long to last (lifetime)
	this.life = l;
	//Last updated for delta compensation
	this.lastUpdate = this.created;
};

//Update function
Bullet.prototype.update = function() {
	//Delta compensation multiplier
	m = (Date.now()-this.lastUpdate)/5;
	//If time exceeds lifetime, delete
	if ((Date.now()-this.created) > this.life) {
		bullets.splice(bullets.indexOf(this),1);
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
		if (f == 1) {
			this.angle = Math.PI-this.angle;
		} else {
			this.angle = 0-this.angle;
		};
	};
	this.lastUpdate = Date.now();
};

//Asteroid prototype
var Ast = function(id,x,y,r) {
	//ID
	this.id = id;
	//X and Y
	this.x = x;
	this.y = y;
	//Radius
	this.radius = r;
	//Health
	this.hp = r/2;
	//Maximum health
	this.maxHealth = this.hp;
	//Mass
	this.mass = this.radius/10000;
	//Velocity X and Y
	this.vx = 0;
	this.vy = 0;
	//Sleeping (not moving)
	this.sleeping = true;
	//Initial update
	this.update();
	//Inital wall bounce
	wallBounce(this,false);
};

//Emit self to nearby players
Ast.prototype.emit = function() {
	a = getVisible(this.x,this.y,1000,false);
	for (k in a) {
		if (players[a[k]].visibleAst.indexOf(this.id) == -1) {
			players[a[k]].visibleAst.push(this.id);
			players[a[k]].io.emit("asteroid",{id:this.id,x:this.x,y:this.y,r:this.radius,hp:this.hp/this.maxHealth});
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
	for (aid in ast) {
		if (aid != this.id && checkCollision(this.x,this.y,this.radius,ast[aid].x,ast[aid].y,ast[aid].radius)) {
			collide(this,false,ast[aid],false);
		};
	};
	//Detect collision with bullets and take damage (like players)
	for (j in bullets) {
		if (checkCollision(this.x,this.y,this.radius,bullets[j].x,bullets[j].y,10)) {
			this.hp -= bullets[j].damage;
			vector = pfa(0,0,bullets[j].angle,players[bullets[j].owner].stats.boostPower);
			this.vx += vector[0];
			this.vy += vector[1];
			if (this.hp < 0) {
				players[bullets[j].owner].addPoints(this.radius/50);
				this.die();
			};
			deleteBullet(j);
		};
	};
	//Wall bounce
	wallBounce(this,false);
};

//Destruction function
Ast.prototype.die = function() {
	//Notify players and remove self ID from their visibleAst arrays
	for (pid in players) {
		index = players[pid].visibleAst.indexOf(this.id);
		if (index != -1) {
			players[pid].visibleAst.splice(index,1);
			players[pid].io.emit("deleteAsteroid",this.id);
		};
	};
	//Spawn new asteroid
	spawnAst();
	//Delete self
	delete ast[this.id];
};

//ld = Date.now();
var update = function() {
	//Update players
	for (id in players) {
		if (players[id].alive && players[id].connected) {
			players[id].update();
		};
	};
	//Emit to players
	for (id in players) {
		if (players[id].connected) {
			players[id].emit();
		};
	};
	//Update asteroids
	for (i in ast) {
		ast[i].update();
	};
	//Emit asteroids
	for (i in ast) {
		ast[i].emit();
	};
	//Update bullets
	for (i in bullets) {
		bullets[i].update();
	};
	//console.log(Date.now()-ld);
	//ld = Date.now();
};

//Setup world
setup();
//Set update timer
setInterval(update,15);

//On connection
io.on("connection", function(client) {
	id = Date.now();
	//Create player with new ID
	players[id] = new Player(id,client);
});