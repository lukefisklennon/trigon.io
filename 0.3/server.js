var io = require("socket.io").listen(3000);

var players = {};
var bullets = [];
var ast = {};
//var obj = [];
var w = 3000;
var h = 3000;
var astNum = 20;
var astRadiusMin = 40;
var astRadiusMax = 150;
var aidc = -1;

var classes = [
	//Fighter
	{
		reloadTime: 400,
		bulletSpeed: 1.5,
		bulletLife: 2000,
		bulletDamage: 5,
		boostPower: 2,
		mass: 50,
		maxHealth: 50,
		healthRegen: 0.01,
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
		width: 60,
		height: 80,
		c1: "#00FF00",
		c2: "#00CC00"
	},
	//Destroyer
	{
		reloadTime: 500,
		bulletSpeed: 1,
		bulletLife: 2000,
		bulletDamage: 4,
		boostPower: 2,
		mass: 0.04,
		maxHealth: 60,
		healthRegen: 0.008,
		width: 90,
		height: 80,
		c1: "#CCCCCC",
		c2: "#AAAAAA"
	}
];

var abilities = [
	{
		power: 20,
		reloadTime: 3000,
		upgradeTime: -50,
		upgradePower: 2,
		use: function(p) {
			p.hp += this.power;
		}
	}
];

var spawnAst = function() {
	aidc++;
	ast[aidc] = new Ast(aidc,random(w),random(h),random(astRadiusMax-astRadiusMin)+astRadiusMin);
};

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

var copyObject = function(o) {
	o2 = {};
	for (k in o) {
		o2[k] = o[k];
	};
	return o2;
};

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

var checkCollision = function(x1,y1,r1,x2,y2,r2) {
	return (dfp(x1,y1,x2,y2) < r1+r2);
};

var collide = function(o2,oo2,o1,oo1) {
	o1x = o1.x;
	o1y = o1.y;
	o2x = o2.x;
	o2y = o2.y;
	
	if (oo2) {
		o2x += o2.stats.width/2;
		o2y += o2.stats.height/2;
	};
	if (oo1) {
		o1x += o1.stats.width/2;
		o1y += o1.stats.height/2;
	};
	
	angle = afp(o1x,o1y,o2x,o2y);
	point = pfa(o1x,o1y,angle,o1.radius+o2.radius);
	
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
	
	distance = dfp(0,0,o2.vx,o2.vy) + dfp(0,0,o1.vx,o1.vy);
	bounceAngle = afp(o1x,o1y,o2x,o2y)+Math.PI/2;
	velAngle = afp(0,0,o2.vx,o2.vy);
	newAngle = bounceAngle+(bounceAngle-velAngle);
	point = pfa(0,0,newAngle,distance/2);
	o2.vx = point[0];
	o2.vy = point[1];
	
	newAngle += Math.PI;
	point = pfa(0,0,newAngle,distance/2);
	o1.vx = point[0];
	o1.vy = point[1];
};

var deleteBullet = function(index) {
	a = getVisible(bullets[index].x,bullets[index].y,1000,false);
	for (k in a) {
		players[a[k]].io.emit("deleteBullet",bullets[index].id);
	};
	bullets.splice(index,1);
};

var getVisible = function(x,y,d,c) {
	a = [];
	for (pid in players) {
		if (!c || players[pid].alive) {
			if (dfp(x,y,players[pid].x,players[pid].y) < d) {
				a.push(pid);
			};
		};
	};
	return a;
};

function compareArray(a1,a2) {
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

var getLeaderboard = function() {
	a = [];
	for (pid in players) {
		if (players[pid].alive) {
			a.push({id:pid,name:players[pid].name,score:players[pid].score});
		};
	};
	return a.sort(function(a,b) {
		return b.score - a.score;
	});
};

var emitLeaderboard = function() {
	io.emit("board",getLeaderboard());
};

var wallBounce = function(o,oo) {
	ox = o.x;
	oy = o.y;
	offx = 0;
	offy = 0;
	if (oo) {
		offx = o.stats.width/2;
		offy = o.stats.height/2;
		ox += offx;
		oy += offy;
	};
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

var Player = function(id,client) {
	this.io = client;
	this.id = id;
	this.name = "Anonymous";
	this.alive = false;
	this.x = w/2;
	this.y = h/2;
	this.visiblePlayers = [];
	this.visibleAst = [];
	this.cls = 0;
	this.connected = true;
	setInterval((this.checkVisible).bind(this),500);
	this.io.on("mousemove",(this.mouseMoveEvent).bind(this));
	this.io.on("mousedown",(this.mouseDownEvent).bind(this));
	this.io.on("spacedown",(this.spaceDownEvent).bind(this));
	this.io.on("disconnect",(this.disconnect).bind(this));
	this.io.on("upgrade",(this.upgrade).bind(this));
	this.io.emit("self",{id:this.id,x:this.x,y:this.y});
	this.io.on("ready",(this.ready).bind(this));
	emitLeaderboard();
};

Player.prototype.ready = function(n,c,a) {
	this.alive = true;
	this.name = n;
	this.reset(c,a);
	this.io.emit("ready",this.name);
	emitLeaderboard();
};

Player.prototype.reset = function(n,a) {
	this.x = random(w);
	this.y = random(h);
	this.mouseDown = 0;
	this.spaceDown = 0;
	this.rotation = 0;
	this.lastFired = 0;
	this.lastAbility = 0;
	this.vx = 0;
	this.vy = 0;
	this.cls = n;
	this.ability = a;
	this.visiblePlayers = [];
	this.stats = copyObject(classes[n]);
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
			name: "Ability",
			level: 1,
			stat: "ability",
			amount: 1
		}
	];
	this.radius = this.stats.width-20;
	this.hp = this.stats.maxHealth;
	this.points = 10;
	this.score = 0;
	this.checkVisible();
};

Player.prototype.emit = function() {
	pa = [];
	aa = [];
	for (j in this.visiblePlayers) {
		pid = this.visiblePlayers[j];
		if (players[pid].alive) {
			pa.push({id:pid,x:players[pid].x,y:players[pid].y,a:players[pid].rotation,hp:players[pid].hp/players[pid].stats.maxHealth});
		};
	};
	for (i in this.visibleAst) {
		id = this.visibleAst[i];
		if (!ast[id].sleeping) {
			aa.push({id:id,x:ast[id].x,y:ast[id].y,r:ast[id].radius,hp:ast[id].hp/ast[id].maxHealth});
		};
	};
	this.io.emit("update",pa,aa);
};

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

Player.prototype.fire = function() {
	bid = Date.now();
	bullets.push(new Bullet(this.id,bid,this.x+this.stats.width/2,this.y+this.stats.height/2,this.rotation,this.stats.bulletSpeed,this.stats.bulletLife,this.stats.bulletDamage));
	velocity = pfa(0,0,this.rotation+Math.PI,this.stats.boostPower);
	this.vx += velocity[0];
	this.vy += velocity[1];
	a = getVisible(this.x+this.stats.width/2,this.y+this.stats.height/2,1000,false);
	for (j in a) {
		players[a[j]].io.emit("fire",this.id,bid,this.x+this.stats.width/2,this.y+this.stats.height/2,this.rotation,this.stats.bulletSpeed,this.stats.bulletLife,8+this.stats.bulletDamage*1,this.cls);
	};
};

Player.prototype.use = function() {
	abilities[this.ability].use(this);
};

Player.prototype.die = function() {
	this.alive = false;
	this.reset(this.cls);
	this.io.broadcast.emit("death",this.id);
	this.io.emit("die");
	emitLeaderboard();
};

Player.prototype.disconnect = function() {
	this.die();
	this.connected = false;
};

Player.prototype.upgrade = function(id) {
	if (this.upgrades[id].level*10 <= this.points) {
		this.points -= this.upgrades[id].level*10;	
		this.upgrades[id].level++;
		this.upgrades[id].cost = this.upgrades[id].level*10;
		this.stats[this.upgrades[id].stat] += this.upgrades[id].amount;
	};
};

Player.prototype.addPoints = function(n) {
	this.points += Math.round(n);
	this.score += Math.round(n);
	this.io.emit("points",this.points,this.score);
	emitLeaderboard();
};

Player.prototype.update = function() {
	if (this.mouseDown) {
		if ((Date.now()-this.lastFired) > this.stats.reloadTime) {
			this.lastFired = Date.now();
			this.fire();
		};
	};
	if (this.spaceDown) {
		if ((Date.now()-this.lastAbility) > abilities[this.ability].reloadTime) {
			this.lastAbility = Date.now();
			this.use();
		};
	};
	this.hp += this.stats.healthRegen;
	if (this.hp > this.stats.maxHealth) this.hp = this.stats.maxHealth;
	friction(this,this.stats.mass);
	this.x += this.vx;
	this.y += this.vy;
	for (pid in players) {
		if (pid != this.id && checkCollision(this.x,this.y,this.radius,players[pid].x,players[pid].y,players[pid].radius)) {
			collide(this,true,players[pid],true);
		};
	};
	for (j in bullets) {
		if (this.id != bullets[j].owner || (Date.now()-bullets[j].created) > 500) {
			//if (checkCollision(this.x,this.y,this.stats.width,this.stats.height,bullets[j].x-5,bullets[j].y-5,10,10)) {
			if (checkCollision(this.x,this.y,this.radius,bullets[j].x,bullets[j].y,10)) {
				vector = pfa(0,0,bullets[j].angle,players[bullets[j].owner].stats.boostPower);
				this.vx += vector[0];
				this.vy += vector[1];
				this.hp -= bullets[j].damage;
				if (this.hp < 0) {
					//players[bullets[j].owner].points += this.score+10;
					//players[bullets[j].owner].score += this.score+10;
					//players[bullets[j].owner].io.emit("points",players[bullets[j].owner].points,players[bullets[j].owner].score);
					players[bullets[j].owner].addPoints(this.score+10);
					this.die();
				};
				deleteBullet(j);
			};
		};
	};
	for (aid in ast) {
		if (checkCollision(this.x+this.stats.width/2,this.y+this.stats.height/2,this.radius,ast[aid].x,ast[aid].y,ast[aid].radius)) {
			collide(this,true,ast[aid],false);
		};
	};
	wallBounce(this,true);
};

Player.prototype.mouseMoveEvent = function(a) {
	this.rotation = a;
};

Player.prototype.mouseDownEvent = function(v) {
	this.mouseDown = v;
};

Player.prototype.spaceDownEvent = function(v) {
	this.spaceDown = v;
};

var Bullet = function(owner,id,x,y,a,s,l,d) {
	this.id = id;
	this.owner = owner;
	this.x = x;
	this.y = y;
	this.angle = a;
	this.speed = s;
	this.damage = d;
	this.created = Date.now();
	this.life = l;
	this.lastUpdate = this.created;
};

Bullet.prototype.update = function() {
	m = (Date.now()-this.lastUpdate)/5;
	if ((Date.now()-this.created) > this.life) {
		bullets.splice(bullets.indexOf(this),1);
	};
	point = pfa(this.x,this.y,this.angle,this.speed*m);
	this.x = point[0];
	this.y = point[1];
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

var Ast = function(id,x,y,r) {
	this.id = id;
	this.x = x;
	this.y = y;
	this.radius = r;
	this.hp = r/2;
	this.maxHealth = this.hp;
	this.mass = this.radius/10000;
	this.vx = 0;
	this.vy = 0;
	this.sleeping = true;
	wallBounce(this);
};

Ast.prototype.emit = function() {
	a = getVisible(this.x,this.y,1000,false);
	for (k in a) {
		if (players[a[k]].visibleAst.indexOf(this.id) == -1) {
			players[a[k]].visibleAst.push(this.id);
			players[a[k]].io.emit("asteroid",{id:this.id,x:this.x,y:this.y,r:this.radius,hp:this.hp/this.maxHealth});
		};
	};
};

Ast.prototype.update = function() {
	friction(this,this.mass*2);
	if (this.vx == 0 && this.vy == 0) {
		this.sleeping = true;
	} else {
		this.sleeping = false;
		this.x += this.vx;
		this.y += this.vy;
	};
	for (aid in ast) {
		if (aid != this.id && checkCollision(this.x,this.y,this.radius,ast[aid].x,ast[aid].y,ast[aid].radius)) {
			collide(this,false,ast[aid],false);
		};
	};
	for (j in bullets) {
		if (checkCollision(this.x,this.y,this.radius,bullets[j].x,bullets[j].y,10)) {
			this.hp -= bullets[j].damage;
			vector = pfa(0,0,bullets[j].angle,players[bullets[j].owner].stats.boostPower);
			this.vx += vector[0];
			this.vy += vector[1];
			if (this.hp < 0) {
				players[bullets[j].owner].addPoints(this.radius/50);
				for (pid in players) {
					index = players[pid].visibleAst.indexOf(this.id);
					if (index != -1) {
						players[pid].visibleAst.splice(index,1);
						players[pid].io.emit("deleteAsteroid",this.id);
					};
				};
				spawnAst();
				delete ast[this.id];
			};
			deleteBullet(j);
		};
	};
	wallBounce(this,false);
};

//ld = Date.now();
var update = function() {
	for (id in players) {
		if (players[id].alive && players[id].connected) {
			players[id].update();
		};
	};
	for (id in players) {
		if (players[id].connected) {
			players[id].emit();
		};
	};
	for (i in ast) {
		ast[i].update();
	};
	for (i in ast) {
		ast[i].emit();
	};
	for (i in bullets) {
		bullets[i].update();
	};
	//console.log(Date.now()-ld);
	//ld = Date.now();
};

setup();
setInterval(update,15);

io.on("connection", function(client) {
	id = Date.now();
	players[id] = new Player(id,client);
});