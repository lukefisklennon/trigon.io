// Set up and join server
var lastRotation = 0;
var target;
var botEnabled = false;
var upgradeList = [5, 4, 8, 1, 5, 4, 8];
var requiredPoints = [10, 10, 10];
var curUpgrade = -1;
var noTarget = false;
var fromWall = false;
idd = Date.now();
socket.emit("ready","TrigonBOT "+idd,0,0,0);
setTimeout(function()
{
    socket.emit("mousedown",1);
},100);

// Add jQuery
var script = document.createElement('script');
script.src = 'http://code.jquery.com/jquery-1.11.0.min.js';
script.type = 'text/javascript';
document.getElementsByTagName('head')[0].appendChild(script);

function createUI()
{
    $(document).ready(function()
    {
        $("body").append('<div style="position:fixed;top:0;left:50%;transform:translateX(-50%);padding-right:5px;padding-top:10px;text-align:center;width:30%;height:200px;"><div style="background-color:rgba(0, 0, 0, 0.6);border-radius:5px;font-size:32px;padding:10px;" class="baloo">TrigonBOT Controls<br><button id="botToggle" class="mitem bot_disabled">Disabled</button></div></div><style>.bot_enabled { background-color: #00b300; -webkit-box-shadow: 0px 4px 0px 0px #008000; -moz-box-shadow: 0px 4px 0px 0px #008000; box-shadow: 0px 4px 0px 0px #008000;}.bot_enabled:hover { background-color: #00cc00;}.bot_enabled:active { background-color: #009900;}.bot_disabled {background-color: #e60000;-webkit-box-shadow: 0px 4px 0px 0px #b30000;-moz-box-shadow: 0px 4px 0px 0px #b30000;box-shadow: 0px 4px 0px 0px #b30000;}.bot_disabled:hover {background-color: #ff0000;}.bot_disabled:active {background-color: #cc0000;}</style><script>$("#botToggle").click(function(){botEnabled = !botEnabled;if (botEnabled){$(this).removeClass("bot_disabled");$(this).addClass("bot_enabled");$(this).html("Enabled");}else{$(this).removeClass("bot_enabled");$(this).addClass("bot_disabled");$(this).html("Disabled");}});</script>');
    });
}

function trigonBot()
{
    if (!botEnabled) {return;}
    noTarget = false;

    // Activate shield
    socket.emit("spacedown",1);

    // Check points and upgrade if possible
    if (curUpgrade == -1 && player.points >= 10)
    {
        socket.emit("upgrade",5);
        player.points -= 10;
        upgrades[5].level++;
        updateUpgrades();
        updatePoints();
        curUpgrade++;
    }
    else
    {
        if (player.points >= requiredPoints[curUpgrade])
        {
            socket.emit("upgrade",upgradeList[curUpgrade]);
            player.points -= upgrades[upgradeList[curUpgrade]].level*upgradeMult;
            upgrades[upgradeList[curUpgrade]].level++;
            requiredPoints[curUpgrade]+=10;
            curUpgrade++;
            if (curUpgrade == upgradeList.length) { curUpgrade = 0; }
            if (upgrades[upgradeList[curUpgrade]].level > 10)
            {
                document.getElementById("uc"+curUpgrade).innerHTML = "max";
            }
            else
            {
                document.getElementById("uc"+curUpgrade).innerHTML = upgrades[upgradeList[curUpgrade]].level*upgradeMult;
            };
            updateUpgrades();
            updatePoints();
        }
    }

    // Find target
    if (players[0]) {
        potentialTargets = players.sort(function(a,b){ return dfp(player.x,player.y,a.tx,a.ty) - dfp(player.x,player.y,b.tx,b.ty) });
        if (dfp(player.x,player.y,potentialTargets[0].tx,potentialTargets[0].ty) < (300 + (100 * upgrades[5].level)))
        {
            target = potentialTargets[0];
			fromWall = false;
        }
        else
        {
            noTarget = true;
        }
    }
    else
    {
        potentialTargets = ast.sort(function(a,b){ return dfp(player.x,player.y,a.tx,a.ty) - dfp(player.x,player.y,b.tx,b.ty) });
        if (dfp(player.x,player.y,potentialTargets[0].tx,potentialTargets[0].ty) < (300 + (100 * upgrades[5].level)) + potentialTargets[0].r)
        {
            target = potentialTargets[0];
			fromWall = false;
        }
        else
        {
            noTarget = true;
        }
    }

    // Rotate and fire
    if (noTarget)
    {
		if (player.x < 50) {
			rotation = Math.PI;
			lastRotation = rotation;
			fromWall = true;
		} else if (player.x > ww-100) {
			rotation = 0;
			lastRotation = rotation;
			fromWall = true;
		} else if (player.y < 50) {
			rotation = Math.PI+Math.PI/2;
			lastRotation = rotation;
			fromWall = true;
		} else if (player.y > ww-100) {
			rotation = Math.PI/2;
			lastRotation = rotation;
			fromWall = true;
		} else if (!fromWall) {
			rotation = lastRotation + Math.PI;
		};
    }
    else
    {
        rotation = afp(player.x,player.y,target.tx,target.ty);
        lastRotation = rotation;
    }
    socket.emit("mousemove",rotation);
}

// On die
socket.on("die",function()
{
    if (!botEnabled) {return;}
    setTimeout(function()
    {
        socket.emit("ready","TrigonBOT "+idd,0,0,0);
		socket.emit("mousedown",1);
    },500);
});

// Set bot update interval
setTimeout(function()
{
    createUI();
    var myInt = setInterval(trigonBot,20);
},500);