/*
	DYGO.socket (client)
	
	� & � iO Ninja
*/

//Connect to server
var socket = io.connect("http://localhost:443/");
//Width and height of world
var ww = 3000;
var wh = 3000;
//Initial player object
var player = {id:0,x:ww/2,y:wh/2,points:0,score:0};
//Players array
var players = [];
//Player permanent information (associative array)
var perm = {};
//Bullets array
var bullets = [];
//Asteroid array
var ast = [];

//Canvas element
var canvas = document.getElementById("canvas");
//Game context
var game = canvas.getContext("2d");

//Screen width and height
var w;
var h;

//Size of grid squares
var gridWidth = 40;
//Ship line thickness
var slw = 10;

//Name
var name;
//Class
var cls = 0;
//Ability
var ability = 0;
//Rotation
var rotation = 0;
//If ready (true after hitting "Play")
var ready = 0;

var dss = 1500;
var cs = 1;

var shaking = 0;
var shakeAmount = 0;
var shakeX = 0;
var shakeY = 0;

var spaceJustDown = 0;

//All the elements (see variable names)
var menuElement = document.getElementById("menu");
var menuContainer = document.getElementById("mcontainer");
var playButton = document.getElementById("play");
var aliasBox = document.getElementById("alias");
var classBox = document.getElementById("class");
var abilityBox = document.getElementById("ability");
var abilityNameElement = document.getElementById("aname");
var abilityFill = document.getElementById("afill");
var myShipHeading = document.getElementById("msheading");
var myShipClass = document.getElementById("msclass");
var myShipAbility = document.getElementById("msability");
var myShipStats = document.getElementById("msstats");
var myShipDescription = document.getElementById("msdescription");
var shareHeading = document.getElementById("siheading");
var shareText = document.getElementById("sitext");
var shareButtons = document.getElementsByClassName("sibutton");
var tipsElement = document.getElementById("tips");
var hudElement = document.getElementById("hud");
var pointsBox = document.getElementById("points");
var boardElement = document.getElementById("board");
var upgradesContainer = document.getElementById("upgrades");
var upgradeElements = [];
var bigNotification = document.getElementById("bnotification");

//Window resize handler
var resizeCanvas = function() {
	canvas.width = window.innerWidth;
	canvas.height = window.innerHeight;
	w = canvas.width;
	h = canvas.height;
	
	if (w > h) {
		rr = w/dss;
	} else {
		rr = h/dss;
	};
	cs = rr;
	
	slw = 10*cs;
	
	menuContainer.style.transform = "translateY(-50%) scale("+cs/1.5+")";
};

//Set handler and inital check
window.addEventListener("resize",resizeCanvas,false);
resizeCanvas();

var felix = function() {
	name = "FJ_";
	aliasBox.value = "FJ_";
	localStorage.alias = "FJ_";
	updateMyShip();
};

//Relevant class information (for rendering)
var classes = [
	//Fighter
	{
		width: 60,
		height: 80,
		c1: "#0000FF",
		c2: "#0000CC"
	},
	//Tanky
	{
		width: 70,
		height: 90,
		c1: "#FF0000",
		c2: "#CC0000"
	},
	//Striker
	{
		width: 60,
		height: 90,
		c1: "#cc00cc",
		c2: "#990099"
	},
	//Speedy
	{
		width: 60,
		height: 80,
		c1: "#00FF00",
		c2: "#00CC00"
	},
	//Destroyer
	{
		width: 90,
		height: 80,
		c1: "#CCCCCC",
		c2: "#AAAAAA"
	}
];

//To be gone
var menuClasses = [
	{
		name: "Fighter",
		description: "The basic design: good at everything, but not great at everything. The perfect class for those who are too busy to think too much.",
		stats: [3,3,2,2,3]
	},
	{
		name: "Tanky",
		description: "Tanky, hence the name: can take many a hit before feeling slightly irritated. Great if going fast makes you dizzy.",
		stats: [5,1,3,4,3]
	},
	{
		name: "Striker",
		description: "Mean and lean. Well not actually that lean. Can strike from afar, dealing a plethora of damage (look that one up on your favourite search engine).",
		stats: [2,2,5,3,4]
	},
	{
		name: "Speedy",
		description: "Fast, very fast. Sometimes, too fast. Speed is key, according those who play the class (they overlook getting destroyed all the time).",
		stats: [1,5,2,1,4]
	},
	{
		name: "Destroyer",
		description: "The embodiment of not being nice. Basically, destroy at all costs, by crashing into other ships. Prehaps it should be called 'The Battle Ram'.",
		stats: [3,2,4,5,1]
	}
];

//Display stat names
var menuClassesStats = ["Health","Speed","Damage","Weight","Range"];

//Ability names
var abilityNames = ["Repair","Super Boost","Shield","Invisibility"];

//Upgrade information and storage
var upgrades = [
	{
		name: "Maximum Health",
		level: 1
	},
	{
		name: "Health Regeneration",
		level: 1
	},
	{
		name: "Boost Power",
		level: 1
	},
	{
		name: "Reload Speed",
		level: 1
	},
	{
		name: "Bullet Damage",
		level: 1
	},
	{
		name: "Bullet Range",
		level: 1
	},
	{
		name: "Bullet Speed",
		level: 1
	},
	{
		name: "Collision Damage",
		level: 1
	},
	{
		name: "Ability",
		level: 1
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

//Function: return value compensating for player position (x)
var cx = function(n) {
	return (n-player.x)*cs+w/2-classes[cls].width/2*cs+shakeX;
};

//Function: return value compensating for player position (y)
var cy = function(n) {
	return (n-player.y)*cs+h/2-classes[cls].height/2*cs+shakeY;
};

var shake = function(t,a) {
	shaking = 1;
	shakeAmount = a;
	setTimeout(stopShake,t);
};

var stopShake = function() {
	shaking = 0;
};

var updateShake = function() {
	shakeX = random(shakeAmount*2)-shakeAmount;
	shakeY = random(shakeAmount*2)-shakeAmount;
};

//Function: check collision between two objects
var checkCollision = function(x1,y1,r1,x2,y2,r2) {
	return (dfp(x1,y1,x2,y2) < r1+r2);
};

var unlockClass = function() {
	localStorage.unlocked = "1";
	shareHeading.innerHTML = "Class unlocked";
	shareText.innerHTML = "New class coming soon...";
	//classBox.innerHTML += "<option value=\"5\">Hoarder</option>";
	//classBox.value = 5;
	//cls = 5;
};

//Rendering functions
var shapes = [
	function(width,height,c2) {
		game.moveTo(0,-height/2);
		game.lineTo(-width/2,height/2);
		game.lineTo(width/2,height/2);
		game.lineTo(0,-height/2);
		game.fill();
		drawLine(0,-height/2,-width/2,height/2,c2,slw,"round");
		drawLine(-width/2,height/2,width/2,height/2,c2,slw,"round");
		drawLine(width/2,height/2,0,-height/2,c2,slw,"round");
	},
	function(width,height,c2) {
		game.moveTo(-width/4,-height/2);
		game.lineTo(-width/2,height/2);
		game.lineTo(width/2,height/2);
		game.lineTo(width/4,-height/2);
		game.fill();
		drawLine(-width/4,-height/2,-width/2,height/2,c2,slw,"round");
		drawLine(-width/2,height/2,width/2,height/2,c2,slw,"round");
		drawLine(width/2,height/2,width/4,-height/2,c2,slw,"round");
		drawLine(-width/4,-height/2,width/4,-height/2,c2,slw,"round");
	},
	function(width,height,c2) {
		game.moveTo(0,-height/2);
		game.lineTo(width/2,0);
		game.lineTo(width/2,height/2);
		game.quadraticCurveTo(0,0,-width/2,height/2);
		game.lineTo(-width/2,0);
		game.fill();
		drawLine(0,-height/2,width/2,0,c2,slw,"round");
		drawLine(0,-height/2,-width/2,0,c2,slw,"round");
		drawLine(width/2,0,width/2,height/2,c2,slw,"round");
		drawLine(-width/2,0,-width/2,height/2,c2,slw,"round");
		drawCurve(-width/2,height/2,width/2,height/2,0,0,c2,slw,"round");
	},
	function(width,height,c2) {
		game.moveTo(0,-height/2);
		game.lineTo(width/2,height/2);
		game.lineTo(0,height/4);
		game.lineTo(-width/2,height/2);
		game.lineTo(0,-height/2);
		game.fill();
		drawLine(0,-height/2,width/2,height/2,c2,slw,"round");
		drawLine(width/2,height/2,0,height/4,c2,slw,"round");
		drawLine(0,height/4,-width/2,height/2,c2,slw,"round");
		drawLine(-width/2,height/2,0,-height/2,c2,slw,"round");
	},
	function(width,height,c2) {
		game.moveTo(width/4,-height/2);
		game.lineTo(width/2,height/2);
		game.quadraticCurveTo(width/4,height/4,0,height/2);
		game.quadraticCurveTo(-width/4,height/4,-width/2,height/2);
		game.lineTo(-width/4,-height/2);
		game.quadraticCurveTo(0,-height/1.5,width/4,-height/2);
		game.fill();
		drawLine(width/4,-height/2,width/2,height/2,c2,slw,"round");
		drawCurve(width/2,height/2,0,height/2,width/4,height/4,c2,slw,"round");
		drawCurve(0,height/2,-width/2,height/2,-width/4,height/4,c2,slw,"round");
		drawLine(-width/2,height/2,-width/4,-height/2,c2,slw,"round");
		drawCurve(-width/4,-height/2,width/4,-height/2,0,-height/1.5,c2,slw,"round");
	}
];

//Function: draw ship (s = shape)
var drawShip = function(x,y,width,height,r,s,c1,c2) {
	game.fillStyle = c1;
	game.save();
	game.beginPath();
	game.translate(x+width/2*cs,y+height/2*cs);
	game.rotate(r+Math.PI*1.5);
	shapes[s](width*cs,height*cs,c2);
	//game.fill();
	game.restore();
};

//Function: draw circle
var drawCircle = function(x,y,r,c1,c2,lw) {
	if (c2 && lw) {
		game.lineWidth = lw;
		game.strokeStyle = c2;
	};
	game.fillStyle = c1;
	game.beginPath();
	game.arc(x,y,r,0,2*Math.PI);
	game.closePath();
	game.fill();
	if (c2 && lw) {
		game.stroke();
	};
};

//Function: draw line
var drawLine = function(x1,y1,x2,y2,c,lw,b) {
	game.lineWidth = lw;
	game.lineCap = b;
	game.strokeStyle = c;
	game.beginPath();
	game.moveTo(x1,y1);
	game.lineTo(x2,y2);
	game.stroke();
	game.closePath();
};

//Function: draw curve
var drawCurve = function(x1,y1,x2,y2,xc,yc,c,lw,b) {
	game.lineWidth = lw;
	game.lineCap = b;
	game.strokeStyle = c;
	game.beginPath();
	game.moveTo(x1,y1);
	game.quadraticCurveTo(xc,yc,x2,y2);
	game.stroke();
	game.closePath();
};

//Function: draw rectangle
var drawRect = function(x,y,width,height,c,a) {
	game.fillStyle = c;
	game.globalAlpha = a;
	game.fillRect(x,y,width,height);
	game.globalAlpha = 1;
};

//Function: draw text
var drawText = function(t,s,a,x,y,c) {
	game.fillStyle = c;
	game.textAlign = a;
	game.font = s;
	game.fillText(t,x,y);
};

var drawHealthBar = function(x,y,p,width,height) {
	//Health bar
	p *= 70;
	color = "#00FF00";
	if (p < 30) {
		color = "#FF0000";
	};
	//drawLine(cx(o.x)+p*0.5,cy(o.y)+classes[c].height+30,cx(o.x)+classes[c].width-p*0.5,cy(o.y)+classes[c].height+30,color,12,"round");
	//drawLine(cx(o.x)+classes[c].width/2-70,cy(o.y)+classes[c].height+30,cx(o.x)+classes[c].width/2+70,cy(o.y)+classes[c].height+30,"#CCCCCC",12,"round");
	drawLine(cx(x)+width/2*cs-p*cs,cy(y)+height*cs+30*cs,cx(x)+width/2*cs+p*cs,cy(y)+height*cs+30*cs,color,slw*1.2,"round");
};

//Function: render asteroid
var renderAst = function(o) {
	//The actual shape
	drawCircle(cx(o.x),cy(o.y),o.r*cs-6,"#999999","#888888",slw);
	//Calculate hp bar and color
	drawHealthBar(o.x-o.r/2,o.y,o.hp,o.r,o.r);
};

//Function: render player
var renderPlayer = function(o) {
	//If self...
	if (o.id == player.id) {
		c = cls;
		r = rotation;
		n = name;
	} else {
		//Else...
		c = perm[o.id].cls;
		r = o.a;
		n = perm[o.id].name;
	};
	//If not invisible, draw ship
	if (!o.invis) {
		drawShip(cx(o.x),cy(o.y),classes[c].width,classes[c].height,r,c,classes[c].c1,classes[c].c2);
	};
	//If shield, draw shield
	if (o.shield) {
		game.globalAlpha = 0.2;
		drawCircle(cx(o.x+classes[c].width/2),cy(o.y+classes[c].height/2),classes[c].height+slw,"#000000");
		game.globalAlpha = 1;
	};
	//Health bar
	/*p = o.hp*70;
	color = "#00FF00";
	if (p < 30) {
		color = "#FF0000";
	};
	//drawLine(cx(o.x)+p*0.5,cy(o.y)+classes[c].height+30,cx(o.x)+classes[c].width-p*0.5,cy(o.y)+classes[c].height+30,color,12,"round");
	//drawLine(cx(o.x)+classes[c].width/2-70,cy(o.y)+classes[c].height+30,cx(o.x)+classes[c].width/2+70,cy(o.y)+classes[c].height+30,"#CCCCCC",12,"round");
	drawLine(cx(o.x)+classes[c].width/2*cs-p*cs,cy(o.y)+classes[c].height*cs+30*cs,cx(o.x)+classes[c].width/2*cs+p*cs,cy(o.y)+classes[c].height*cs+30*cs,color,slw*1.2,"round");*/
	drawHealthBar(o.x,o.y,o.hp,classes[c].width,classes[c].height);
	//Alias (name)
	drawText(n,"bold "+20*cs+"px Arial","center",cx(o.x)+classes[c].width/2*cs,cy(o.y)+classes[c].height*cs+60*cs,"#000000");
};

//Function: find in array by ID
var findById = function(a,id) {
	return a.indexOf(a.find(function(o){return o.id == id;}));
};

var notify = function(t) {
	bigNotification.innerHTML = t;
	bigNotification.style.bottom = "0px";
	setTimeout(function() {
		bigNotification.style.bottom = "-"+200*cs+"px";
	},2000);
};

var dev = function(m) {
	hudElement.innerHTML += "<input type=\"text\" id=\"dev\" style=\"position:fixed;top:100px;\"></input>";
	devElement = document.getElementById("dev");
	devElement.onkeyup = function(e) {
		if (e.keyCode == 13) {
			socket.emit("dev",devElement.value);
			devElement.value = "";
		};
	};
};

//Function: render bullet
var renderBullet = function(o) {
	drawCircle(cx(o.x),cy(o.y),o.r*cs,classes[o.cls].c1,classes[o.cls].c2,slw);
};

//Function update position of bullet (o)
var updateBullet = function(o) {
	m = (Date.now()-o.lastUpdate)/5;
	if (dfp(o.ox,o.oy,o.x,o.y) > o.range) {
		bullets.splice(bullets.indexOf(o),1);
	};
	//Calculate new position
	point = pfa(o.x,o.y,o.angle,o.speed*m);
	o.x = point[0];
	o.y = point[1];
	//Wall bounce
	f = 0;
	if (o.x < 0) {
		o.x = 0;
		f = 1;
	};
	if (o.x > ww) {
		o.x = ww;
		f = 1;
	};
	if (o.y < 0) {
		o.y = 0;
		f = 2;
	};
	if (o.y > wh) {
		o.y = wh;
		f = 2;
	};
	if (f > 0) {
		if (f == 1) {
			o.angle = Math.PI-o.angle;
		} else {
			o.angle = 0-o.angle;
		};
	};
	o.lastUpdate = Date.now();
};

var background = function() {
	//Draw grid stuff
	tx = (player.x/gridWidth-Math.floor(player.x/gridWidth))*gridWidth*cs;
	ty = (player.y/gridWidth-Math.floor(player.y/gridWidth))*gridWidth*cs;
	/*for (i=0;i<(w/gridWidth)+1;i++) {
		ttx = (i*gridWidth)-tx;
		drawLine(ttx+shakeX,0,ttx+shakeX,h,"#A3A3A3",1,"butt");
	};
	for (i=0;i<(h/gridWidth)+1;i++) {
		tty = (i*gridWidth)-ty;
		drawLine(0,tty+shakeY,w,tty+shakeY,"#A3A3A3",1,"butt");
	};*/
	ox = player.x;
	oy = player.y;
	for (i=0;i<(w/gridWidth/cs)+2;i++) {
		drawLine(cx(i*gridWidth+ox)-tx-w/2,0,cx(i*gridWidth+ox)-tx-w/2,h,"#A3A3A3",1*cs,"butt");
		//drawLine(cx(i*gridWidth+ox)-tx,0,cx(i*gridWidth+ox)-tx,h,"#A3A3A3",1,"butt");
	};
	for (i=0;i<(h/gridWidth/cs)+2;i++) {
		drawLine(0,cy(i*gridWidth+oy)-ty-h/2,w,cy(i*gridWidth+oy)-ty-h/2,"#A3A3A3",1*cs,"butt");
	};
	drawRect(cx(-w),cy(0),w*cs,wh*cs,"#000000",0.4);
	drawRect(cx(ww),cy(0),w*cs,wh*cs,"#000000",0.4);
	drawRect(cx(-w),cy(-h),(ww+w*2)*cs,h*cs,"#000000",0.4);
	drawRect(cx(-w),cy(wh),(ww+w*2)*cs,h*cs,"#000000",0.4);
};

var updateMyShip = function() {
	name = aliasBox.value;
	cls = Number(classBox.value);
	ability = Number(abilityBox.value);
	if (name == "") {
		myShipHeading.innerHTML = "My Ship";
	} else {
		myShipHeading.innerHTML = name+"'s Ship";
	};
	myShipClass.innerHTML = menuClasses[cls].name;
	myShipDescription.innerHTML = menuClasses[cls].description;
	myShipStats.innerHTML = "";
	for (i=0;i<menuClasses[cls].stats.length;i++) {
		myShipStats.innerHTML += menuClassesStats[i]+": "+"&#9609;".repeat(menuClasses[cls].stats[i]);
		if (i<menuClasses[cls].stats.length) myShipStats.innerHTML += "<br>";
	};
	myShipAbility.innerHTML = abilityNames[ability];
};

//Set points and score display to current
var updatePoints = function() {
	pointsBox.innerHTML = /*"Points: "+player.points+"<br>*/"Score: "+player.score;
	noun = "points";
	if (player.points == 1) noun = "point";
	document.getElementById("upoints").innerHTML = player.points+" <span style=\"font-weight:500\">"+noun+"</span>";
};

//Set the color of each upgrade cost element (red for can't afford)
var updateUpgrades = function() {
	for (j=0;j<upgrades.length;j++) {
		p = upgrades[j].level*10-10;
		document.getElementById("ub"+j).style.width = p+"%";
		if (upgrades[j].level*10 > player.points && upgrades[j].level < 11) {
			document.getElementById("uc"+j).style.color = "#FF0000";
		} else {
			document.getElementById("uc"+j).style.color = "#FFFFFF";
		};
	};
};

//On clicking an upgrade, change storage stuff, update stuff and emit stuff
var upgradeClick = function(e) {
	id = e.target.parentNode.getAttribute("id");
	if (id && id.length == 2) {
		id = Number(id.substr(1,1));
		if (upgrades[id].level*10 <= player.points && upgrades[id].level < 11) {
			socket.emit("upgrade",id);
			player.points -= upgrades[id].level*10;
			upgrades[id].level++;
			if (upgrades[id].level > 10) {
				document.getElementById("uc"+id).innerHTML = "max";
			} else {
				document.getElementById("uc"+id).innerHTML = upgrades[id].level*10;
			};
			updateUpgrades();
			updatePoints();
		};
	};
};

//Create upgrade elements
var setupUpgrades = function() {
	upgradesContainer.innerHTML = "<div class=\"upgrade round\" style=\"height:39px;cursor:default;\"><div id=\"uheading\" class=\"baloo\">Upgrades</div><div id=\"upoints\">10</div></div>";
	for (i=0;i<upgrades.length;i++) {
		upgradesContainer.innerHTML += "<div class=\"upgrade round\" id=\"u"+i+"\"><div class=\"uinner\">"+upgrades[i].name+"</div><div id=\"uc"+i+"\"class=\"ucost\">10</div><div class=\"ubar round\" id=\"ub"+i+"\"></div></div>";//<div class=\"ubar round\"></div>
		upgradeElements.push(document.getElementById("u"+i));
		upgradesContainer.onclick = upgradeClick;
	};
	updateUpgrades();
};

//Socket.socket on "ready" (spawned in)
socket.on("ready",function(n) {
	//Ready is true
	ready = 1;
	//Set name
	name = n;
	//Hide menu (with fancy transition)
	menuElement.style.opacity = "0";
	menuElement.style.transform = "scale(1.5)";
	setTimeout(function(){menuElement.style.visibility = "hidden";},250);
	//Show HUD (heads up display)
	hudElement.style.opacity = "1";
	//Set name of own ability
	abilityNameElement.innerHTML = abilityNames[ability];
	//Update and setup stuff
	setupUpgrades();
	updatePoints();
});

//Socket.socket on "die" (player destroyed)
var die = function() {
	//Basically reverse of "ready"
	ready = 0;
	menuElement.style.visibility = "visible";
	menuElement.style.opacity = "1";
	menuElement.style.transform = "scale(1)";
	hudElement.style.opacity = "0";
	//upgradesContainer.style.visibility = "hidden";
	//pointsBox.style.visibility = "hidden";
	player.points = 0;
	player.score = 0;
	for (i=0;i<upgrades.length;i++) {
		upgrades[i].level = 1;
	};
	updatePoints();
	updateMyShip();
};

//Set handler
socket.on("die",die);

//Socket.socket on "self" (spawning of self)
socket.on("self",function(object) {
	player = {id:object.id,x:object.x,y:object.y,points:0,score:0};
});

//Socket.socket on "player" (a new player being spawned in)
socket.on("player",function(object) {
	perm[object.id] = {name:object.name,cls:object.cls};
});

//Socket.socket on "deleteAsteroid" (asteroid destroyed)
socket.on("deleteAsteroid",function(id) {
	//shake(800,15);
});

//Socket.socket on "death" (death of another player)
socket.on("notify",function(t) {
	notify(t);
});

//Socket.socket on "fire" (spawn bullet)
socket.on("fire",function(owner,id,x,y,a,s,range,r,c) {
	bullets.push({id:id,owner:owner,x:x,y:y,ox:x,oy:y,angle:a,speed:s,range:range,lastUpdate:Date.now(),r:r,cls:c});
});

//Socket.socket on "deleteBullet" (bullet removed)
socket.on("deleteBullet",function(id) {
	for (i in bullets) {
		if (bullets[i].id == id) {
			bullets.splice(i,1);
		};
	};
});

//Socket.socket on "points" (update own points and score)
socket.on("points",function(p,s) {
	d = p-player.points;
	if (d == 1) {
		notify("+"+d+" point");
	} else {
		notify("+"+d+" points");
	};
	player.points = p;
	player.score = s;
	updatePoints();
	updateUpgrades();
});

//Socket.socket on "board" (update leaderboard)
socket.on("board",function(a) {
	html = "";
	for (i=0;i<a.length;i+=3) {
		bold = "";
		if (a[i] == player.id) {
			bold = " style=\"font-weight:bold;\"";
		};
		html += "<tr"+bold+"><td class=\"bname\">"+(Math.floor(i/3)+1)+". "+a[i+1]+"</td><td class=\"bscore\">"+a[i+2]+"</td></tr>";
	};
	boardElement.innerHTML = html;
});

//Socket.socket on "use" (own ability used)
socket.on("use",function(t) {
	//Cooldown animation based on t (time)
	abilityFill.style.opacity = "1";
	abilityFill.style.transition = "height "+t+"ms, opacity 1s";
	abilityFill.style.height = "120px";
	setTimeout(function() {
		abilityFill.style.transition = "height 0s, opacity 1s";
		abilityFill.style.opacity = "0";
		abilityFill.style.height = "0px";
	},t);
});

socket.on("shake",function() {
	//shake(300,10);
});

//Socket.socket on "update" (objects updated)
socket.on("update",function(pa,aa) {
	//Wipe players array
	players = [];
	ast = [];
	//If own player, set player variable
	//Else, add to players array
	for (i=0;i<pa.length;i+=7) {
		if (pa[i] == player.id) {
			player = {id:pa[i],x:pa[i+1],y:pa[i+2],a:pa[i+3],hp:pa[i+4],points:player.points,score:player.score,shield:pa[i+5],invis:pa[i+6]};
		} else {
			players.push({id:pa[i],x:pa[i+1],y:pa[i+2],a:pa[i+3],hp:pa[i+4],shield:pa[i+5],invis:pa[i+6]});
		};
	};
	//Update current asteroid in ast array
	for (i=0;i<aa.length;i+=5) {
		ast.push({id:aa[i],x:aa[i+1],y:aa[i+2],r:aa[i+3],hp:aa[i+4]});
	};
});

//Socket.socket on "connect" (wipe players and asteroids)
socket.on("connect",function() {
	players = [];
	ast = [];
});

//Socket.socket on "disconnect" (die - 1 meaning disconnected)
socket.on("disconnect",function() {
	die(1);
});

//On mousedown, emit
var mouseDown = function() {
	if (ready) {
		//setTimeout(function(){socket.emit("mousedown",1);},200);
		socket.emit("mousedown",1);
	};
};

//On mouseup, emit
var mouseUp = function() {
	if (ready) {
		//setTimeout(function(){socket.emit("mousedown",0);},200);
		socket.emit("mousedown",0);
	};
};

//On mousemove, emit
var mouseMove = function(e) {
	e.preventDefault();
	if (e.touches) {
		x = e.touches[0].pageX;
		y = e.touches[0].pageY;
	} else {
		x = e.pageX;
		y = e.pageY;
	};
	if (ready) {
		rotation = afp(w/2,h/2,x,y);
		//setTimeout(function(){socket.emit("mousemove",rotation);},200);
		socket.emit("mousemove",rotation);
	};
};
//Handlers
canvas.onmousedown = mouseDown;
canvas.onmouseup = mouseUp;
document.onmousemove = mouseMove;
window.addEventListener("touchstart",mouseDown,false);
window.addEventListener("touchend",mouseUp,false);
window.addEventListener("touchcancel",mouseUp,false);
window.addEventListener("touchmove",mouseMove,false);

aliasBox.onchange = updateMyShip;
classBox.onchange = updateMyShip;
abilityBox.onchange = updateMyShip;

//On keydown...
document.onkeydown = function(e) {
	if (ready) {
		//If spacebar, emit
		if (e.keyCode == 32) {
			if (!spaceJustDown) {
				socket.emit("spacedown",1);
				spaceJustDown = 1;
			};
		};
	};
};

//On keyup...
document.onkeyup = function(e) {
	if (ready) {
		//If spacebar, emit
		if (e.keyCode == 32) {
			socket.emit("spacedown",0);
			spaceJustDown = 0;
		};
	};
};

//On play button being clicked...
var play = function() {
	//Set class and ability based on dropdown vlaues
	cls = Number(classBox.value);
	ability = Number(abilityBox.value);
	//Store new values
	localStorage.alias = aliasBox.value;
	localStorage.cls = classBox.value;
	localStorage.ability = ability;
	//Emit!
	socket.emit("ready",aliasBox.value,cls,ability);
};

playButton.onclick = play;
aliasBox.onkeyup = function(e) {
	if (e.keyCode == 13) {
		play();
	};
};

//Render and update frame
var update = function() {
	//Clear window
	game.clearRect(0,0,w,h);
	//game.fillStyle = "#000000";
	//game.fillRect(0,0,w,h);
	if (shaking) {
		updateShake();
	};
	//Draw background
	//Render asteroids
	background();
	for (i=0;i<ast.length;i++) {
		renderAst(ast[i]);
	};
	//Update bullets
	for (i=0;i<bullets.length;i++) {
		updateBullet(bullets[i]);
	};
	//Render bullets
	for (i=0;i<bullets.length;i++) {
		renderBullet(bullets[i]);
	};
	//Render players (if visible)
	for (i=0;i<players.length;i++) {
		if (!players[i].invis) {
			renderPlayer(players[i]);
		};
	};
	//If ready, render player
	if (ready) {
		renderPlayer(player);
	};
	//hud();
	//Set to call update on next frame
	frame(update);
};

//Set animation frame caller
var frame = window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.msRequestAnimationFrame || window.mozRequestAnimationFrame;
//First update
update();

//Get storage values
if (localStorage.alias) {
	name = localStorage.alias;
	cls = localStorage.cls;
	ability = localStorage.ability;
	aliasBox.value = name;
	classBox.value = cls;
	abilityBox.value = ability;
	if (localStorage.unlocked == "1") {
		unlockClass();
	};
} else {
	name = "";
	cls = 0;
	ability = 0;
	localStorage.alias = "";
	localStorage.cls = "0";
	localStorage.ability = "0";
	localStorage.unlocked = "0";
};
updateMyShip();

for (i=0;i<shareButtons.length;i++) {
	shareButtons[i].onclick = unlockClass;
};

//Focus alias (name) box
aliasBox.focus();