const $ = (id) => document.getElementById(id);
const screens = ["authScreen", "menuScreen", "howScreen", "gameScreen"];
const canvas = $("gameCanvas"), ctx = canvas.getContext("2d");
const W = canvas.width, H = canvas.height;
let state = "menu", paused = false, animationId = 0, lastTime = 0;
let crew = "Cadet", score = 0, energy = 100, hasKey = false, powerOn = false, hasData = false;
let currentRoom = "bridge", apiData = null, apiExpected = null, apiBusy = false;
let toastTimer = 0, interactNear = null, soundOn = false;
const keys = {};
const player = {x:90,y:280,r:15,speed:235,fireCooldown:0,invuln:0};
let bullets = [], enemies = [], particles = [], roomObjects = [];
const roomTitles = {bridge:"BRIDGE",power:"POWER CORE",lab:"RESEARCH LAB",pod:"ESCAPE BAY"};
const roomObjectsByName = {
  bridge:[{type:"key",x:270,y:280,label:"ACCESS KEY"}],
  power:[{type:"terminal",x:480,y:280,label:"SECURITY TERMINAL"}],
  lab:[{type:"data",x:490,y:280,label:"RESEARCH DATA"}],
  pod:[{type:"pod",x:500,y:280,label:"ESCAPE POD"}]
};

// Demo authentication: accounts are stored in this browser only (localStorage).
const USERS_KEY = "projectAetherUsers";
const SESSION_KEY = "projectAetherSession";
let activeUser = null;

function readUsers(){
  try { return JSON.parse(localStorage.getItem(USERS_KEY) || "[]"); }
  catch { return []; }
}
function showAuthForm(which){
  const login = which === "login";
  $("loginForm").classList.toggle("hidden", !login);
  $("registerForm").classList.toggle("hidden", login);
  $("loginTab").classList.toggle("active", login);
  $("registerTab").classList.toggle("active", !login);
  $("loginMessage").textContent = "";
  $("registerMessage").textContent = "";
}
function showAuth(){
  showScreen("authScreen");
  $("accountLabel").textContent = "";
  $("logoutBtn").classList.add("hidden");
}
function enterApp(user){
  activeUser = user;
  $("crewName").value = user.name;
  $("accountLabel").textContent = user.name.toUpperCase();
  $("logoutBtn").classList.remove("hidden");
  showScreen("menuScreen");
}
$("loginTab").addEventListener("click",()=>showAuthForm("login"));
$("registerTab").addEventListener("click",()=>showAuthForm("register"));
$("goRegister").addEventListener("click",()=>showAuthForm("register"));
$("goLogin").addEventListener("click",()=>showAuthForm("login"));

$("registerForm").addEventListener("submit",e=>{
  e.preventDefault();
  const name=$("registerName").value.trim();
  const email=$("registerEmail").value.trim().toLowerCase();
  const password=$("registerPassword").value;
  const confirm=$("confirmPassword").value;
  const users=readUsers();
  if(password.length<6){$("registerMessage").textContent="Password must contain at least 6 characters.";return;}
  if(password!==confirm){$("registerMessage").textContent="Passwords do not match.";return;}
  if(users.some(u=>u.email===email)){$("registerMessage").textContent="This email is already registered. Please login.";return;}
  users.push({name,email,password});
  localStorage.setItem(USERS_KEY,JSON.stringify(users));
  localStorage.setItem(SESSION_KEY,email);
  $("registerMessage").style.color="#63f3b0";
  $("registerMessage").textContent="Account created successfully!";
  setTimeout(()=>enterApp({name,email}),500);
});
$("loginForm").addEventListener("submit",e=>{
  e.preventDefault();
  const email=$("loginEmail").value.trim().toLowerCase();
  const password=$("loginPassword").value;
  const user=readUsers().find(u=>u.email===email&&u.password===password);
  if(!user){$("loginMessage").textContent="Invalid email or password.";return;}
  localStorage.setItem(SESSION_KEY,email);
  enterApp(user);
});
$("logoutBtn").addEventListener("click",()=>{
  localStorage.removeItem(SESSION_KEY);
  activeUser=null;
  showAuthForm("login");
  showAuth();
});
function restoreSession(){
  const email=localStorage.getItem(SESSION_KEY);
  if(!email){showAuth();return;}
  const user=readUsers().find(u=>u.email===email);
  if(user)enterApp(user);else showAuth();
}

function showScreen(id){screens.forEach(s=>$(s).classList.toggle("hidden",s!==id));}
function notify(msg){$("toast").textContent=msg;$("toast").classList.remove("hidden");clearTimeout(toastTimer);toastTimer=setTimeout(()=>$("toast").classList.add("hidden"),2300);}
function setObjective(){let t=!hasKey?"OBJECTIVE: FIND THE ACCESS KEY":!powerOn?"OBJECTIVE: RESTORE STATION POWER":!hasData?"OBJECTIVE: RECOVER RESEARCH DATA":"OBJECTIVE: REACH THE ESCAPE POD";$("objective").textContent=t;}
function updateHud(){$("energyText").textContent=Math.max(0,Math.ceil(energy))+"%";$("energyBar").style.width=Math.max(0,energy)+"%";$("dataText").textContent=(hasData?1:0)+" / 1";$("scoreText").textContent=String(score).padStart(4,"0");$("roomName").textContent=roomTitles[currentRoom];$("hudCrew").textContent=crew.toUpperCase();setObjective();}
function resetGame(){
  score=0;energy=100;hasKey=false;powerOn=false;hasData=false;currentRoom="bridge";
  player.x=90;player.y=280;player.invuln=0;player.fireCooldown=0;
  bullets=[];particles=[];makeEnemies();roomObjects=roomObjectsByName.bridge.map(o=>({...o}));
  paused=false;state="playing";$("overlay").classList.add("hidden");$("apiModal").classList.add("hidden");updateHud();showScreen("gameScreen");lastTime=0;cancelAnimationFrame(animationId);animationId=requestAnimationFrame(gameLoop);
}
function makeEnemies(){enemies=[
 {x:680,y:160,r:17,hp:2,baseY:160,phase:0,speed:1.2},
 {x:760,y:410,r:17,hp:2,baseY:410,phase:2,speed:1.5}
];}
function loadRoom(name){currentRoom=name;player.x=75;player.y=280;bullets=[];roomObjects=roomObjectsByName[name].map(o=>({...o}));if(name==="bridge")roomObjects=hasKey?[]:roomObjects;if(name==="power")roomObjects=powerOn?[]:roomObjects;if(name==="lab")roomObjects=hasData?[]:roomObjects;updateHud();notify("ENTERED "+roomTitles[name]);}
function startMission(){crew=$("crewName").value.trim()||"Cadet";resetGame();}
$("startBtn").addEventListener("click",startMission);
$("howBtn").addEventListener("click",()=>showScreen("howScreen"));
$("backBtn").addEventListener("click",()=>showScreen("menuScreen"));
$("pauseBtn").addEventListener("click",()=>togglePause());
$("menuBtn").addEventListener("click",()=>{state="menu";$("overlay").classList.add("hidden");$("apiModal").classList.add("hidden");cancelAnimationFrame(animationId);showScreen("menuScreen");});
$("overlayBtn").addEventListener("click",()=>{if(state==="won"||state==="lost"){startMission();return;}togglePause(false);});
function togglePause(force){if(state!=="playing")return;paused=typeof force==="boolean"?!force:!paused;if(paused){$("overlayEyebrow").textContent="MISSION CONTROL";$("overlayTitle").textContent="MISSION PAUSED";$("overlayText").textContent="Take a breath, cadet. Your mission is waiting."; $("overlayBtn").textContent="RESUME";$("menuBtn").textContent="MAIN MENU";$("overlay").classList.remove("hidden");}else{$("overlay").classList.add("hidden");lastTime=0;}}
$("soundBtn").addEventListener("click",()=>{soundOn=!soundOn;$("soundBtn").textContent=soundOn?"♫ ON":"♫";notify(soundOn?"SOUND INDICATOR ON":"SOUND INDICATOR OFF");});
window.addEventListener("keydown",e=>{const k=e.key.toLowerCase();keys[k]=true;if([" ","arrowup","arrowdown","arrowleft","arrowright"].includes(k))e.preventDefault();if(k==="e")interact();if(k===" "&&state==="playing"&&!paused)shoot();if(k==="escape"&&state==="playing")togglePause();});
window.addEventListener("keyup",e=>keys[e.key.toLowerCase()]=false);

function shoot(){if(player.fireCooldown>0)return;player.fireCooldown=.28;bullets.push({x:player.x+18,y:player.y,vx:520,life:1.4});}
function interact(){if(state!=="playing"||paused||$("apiModal").classList.contains("hidden")===false)return;let obj=nearestObject();if(!obj){notify("NOTHING TO INTERACT WITH");return;}
 if(obj.type==="key"){hasKey=true;score+=100;roomObjects=roomObjects.filter(o=>o!==obj);notify("ACCESS KEY ACQUIRED +100");updateHud();}
 else if(obj.type==="terminal"){if(!hasKey){notify("ACCESS KEY REQUIRED");return;}openApi();}
 else if(obj.type==="data"){hasData=true;score+=250;roomObjects=roomObjects.filter(o=>o!==obj);notify("RESEARCH DATA RECOVERED +250");updateHud();}
 else if(obj.type==="pod"){if(!powerOn||!hasData){notify("ESCAPE POD LOCKED — COMPLETE ALL OBJECTIVES");return;}winGame();}
}
function nearestObject(){let best=null,dmin=55;for(const o of roomObjects){let d=Math.hypot(player.x-o.x,player.y-o.y);if(d<dmin){best=o;dmin=d;}}return best;}
function openApi(){$("apiModal").classList.remove("hidden");$("apiFeedback").textContent="";$("fishAnswer").value="";$("apiQuestion").innerHTML='<span class="loader"></span> Loading challenge…';apiData=null;apiExpected=null;apiBusy=true;fetch("https://marcconrad.com/uob/fish/api.php?out=json").then(r=>{if(!r.ok)throw Error("API request failed");return r.json();}).then(data=>{apiData=data;apiExpected=Number(data.fish);if(data.question){$("apiQuestion").innerHTML="";const img=document.createElement("img");img.src=data.question;img.alt="Fish game puzzle";img.onerror=()=>{$("apiQuestion").textContent="Puzzle image could not be loaded. Try refreshing the challenge.";};$("apiQuestion").appendChild(img);}else throw Error("Unexpected API response");}).catch(()=>{$("apiQuestion").innerHTML='<div style="padding:18px;text-align:center">Could not connect to the Fish Game API.<br><small>Check your internet connection or run through Live Server.</small></div>';apiExpected=null;}).finally(()=>apiBusy=false);}
$("closeApi").addEventListener("click",()=>{$("apiModal").classList.add("hidden");});
$("submitFish").addEventListener("click",()=>{if(apiBusy)return;const val=$("fishAnswer").value.trim();if(val===""){ $("apiFeedback").textContent="Enter your answer first.";return;}if(apiExpected===null){$("apiFeedback").textContent="Challenge is unavailable. Close and interact again to retry.";return;}if(Number(val)===apiExpected){powerOn=true;score+=300;energy=Math.min(100,energy+20);$("apiFeedback").textContent="ACCESS GRANTED — POWER RESTORED!";$("apiFeedback").style.color="#63f3b0";setTimeout(()=>{$("apiModal").classList.add("hidden");loadRoom("power");updateHud();notify("POWER RESTORED +300");},900);}else{$("apiFeedback").textContent="INCORRECT CODE — TRY AGAIN";$("apiFeedback").style.color="#ff648f";energy=Math.max(0,energy-8);updateHud();}});
function winGame(){state="won";$("overlayEyebrow").textContent="MISSION COMPLETE";$("overlayTitle").textContent="YOU ESCAPED";$("overlayText").textContent=`Excellent work, ${crew}. Final score: ${score}. The research data is safe.`;$("overlayBtn").textContent="PLAY AGAIN";$("menuBtn").textContent="MAIN MENU";$("overlay").classList.remove("hidden");}
function loseGame(){state="lost";$("overlayEyebrow").textContent="MISSION FAILED";$("overlayTitle").textContent="ENERGY DEPLETED";$("overlayText").textContent="Your suit energy reached zero. Try again, cadet.";$("overlayBtn").textContent="RETRY MISSION";$("menuBtn").textContent="MAIN MENU";$("overlay").classList.remove("hidden");}
function update(dt){
 if(paused||state!=="playing")return;
 const oldX=player.x,oldY=player.y;let dx=0,dy=0;
 if(keys.a||keys.arrowleft)dx--;if(keys.d||keys.arrowright)dx++;if(keys.w||keys.arrowup)dy--;if(keys.s||keys.arrowdown)dy++;
 if(dx&&dy){dx*=.707;dy*=.707;}player.x+=dx*player.speed*dt;player.y+=dy*player.speed*dt;
 player.x=Math.max(28,Math.min(W-28,player.x));player.y=Math.max(55,Math.min(H-35,player.y));
 player.fireCooldown=Math.max(0,player.fireCooldown-dt);player.invuln=Math.max(0,player.invuln-dt);
 // Room exits are deliberately placed at the right and left edges.
 if(player.x>W-40){if(currentRoom==="bridge"&&hasKey)loadRoom("power");else if(currentRoom==="power"&&powerOn)loadRoom("lab");else if(currentRoom==="lab"&&hasData)loadRoom("pod");else{player.x=W-42;notify("DOOR LOCKED — COMPLETE THE OBJECTIVE");}}
 if(player.x<40){if(currentRoom==="power")loadRoom("bridge");else if(currentRoom==="lab")loadRoom("power");else if(currentRoom==="pod")loadRoom("lab");else player.x=42;}
 bullets.forEach(b=>{b.x+=b.vx*dt;b.life-=dt;});
 bullets=bullets.filter(b=>b.life>0&&b.x<W+20);
 if(currentRoom==="bridge"||currentRoom==="power"){for(const en of enemies){en.phase+=dt*en.speed;en.y=en.baseY+Math.sin(en.phase*1.8)*48;}}
 for(const b of bullets){for(const en of enemies){if(en.hp>0&&Math.hypot(b.x-en.x,b.y-en.y)<en.r+5){en.hp=0;b.life=0;score+=50;notify("DRONE DISABLED +50");updateHud();}}}
 enemies=enemies.filter(e=>e.hp>0);
 for(const en of enemies){if(Math.hypot(player.x-en.x,player.y-en.y)<player.r+en.r&&player.invuln<=0){energy=Math.max(0,energy-15);player.invuln=1.1;player.x=Math.max(50,player.x-35);notify("DRONE HIT — ENERGY -15");updateHud();}}
 if(energy<=0)loseGame();
 const near=nearestObject();if(near){$("prompt").textContent="PRESS E — "+near.label;$("prompt").classList.remove("hidden");}else $("prompt").classList.add("hidden");
}
function drawBackground(){
 ctx.fillStyle="#080f20";ctx.fillRect(0,0,W,H);
 // stars
 for(let i=0;i<85;i++){const x=(i*137+37)%W,y=(i*83+19)%H;ctx.fillStyle=i%4===0?"#7fefff":"#53698d";ctx.globalAlpha=.22+(i%5)*.12;ctx.fillRect(x,y,i%7===0?3:1,i%7===0?3:1);}ctx.globalAlpha=1;
 // floor grid
 ctx.strokeStyle="#1b2b48";ctx.lineWidth=1;for(let x=0;x<W;x+=48){ctx.beginPath();ctx.moveTo(x,42);ctx.lineTo(x,H-20);ctx.stroke();}for(let y=42;y<H;y+=48){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();}
 // room frame and doors
 ctx.strokeStyle="#385273";ctx.lineWidth=5;ctx.strokeRect(15,35,W-30,H-55);
 ctx.fillStyle="#53e6ee";ctx.globalAlpha=.65;ctx.fillRect(W-20,245,8,70);ctx.fillRect(12,245,8,70);ctx.globalAlpha=1;
 ctx.fillStyle="#8196b6";ctx.font="12px Orbitron";ctx.fillText(roomTitles[currentRoom],34,25);
 // glowing consoles
 for(let i=0;i<4;i++){ctx.fillStyle=i===0?"#142b48":"#101d34";ctx.fillRect(45+i*225,52,130,24);ctx.strokeStyle="#2c5870";ctx.strokeRect(45+i*225,52,130,24);ctx.fillStyle="#53e6ee";ctx.fillRect(55+i*225,61,35+(i*11)%55,4);}
}
function drawObjects(){for(const o of roomObjects){ctx.save();ctx.translate(o.x,o.y);ctx.shadowBlur=20;ctx.shadowColor=o.type==="key"?"#f4d35e":o.type==="terminal"?"#53e6ee":o.type==="data"?"#9b8cff":"#62f5b1";
 if(o.type==="key"){ctx.fillStyle="#f4d35e";ctx.rotate(Math.PI/4);ctx.fillRect(-11,-11,22,22);ctx.fillRect(7,-4,15,8);ctx.fillRect(17,-4,5,15);}
 if(o.type==="terminal"){ctx.fillStyle="#173c57";ctx.fillRect(-22,-25,44,50);ctx.fillStyle="#53e6ee";ctx.fillRect(-15,-17,30,22);ctx.fillStyle="#a5faff";ctx.fillRect(-9,12,18,4);}
 if(o.type==="data"){ctx.fillStyle="#9b8cff";ctx.beginPath();ctx.moveTo(0,-24);ctx.lineTo(19,-12);ctx.lineTo(19,12);ctx.lineTo(0,24);ctx.lineTo(-19,12);ctx.lineTo(-19,-12);ctx.closePath();ctx.fill();ctx.fillStyle="#fff";ctx.fillRect(-3,-12,6,24);}
 if(o.type==="pod"){ctx.fillStyle="#1e806d";ctx.beginPath();ctx.roundRect(-25,-35,50,70,20);ctx.fill();ctx.fillStyle="#8ffff0";ctx.fillRect(-14,-17,28,22);ctx.fillStyle="#d7fff7";ctx.fillRect(-6,25,12,5);}
 ctx.restore();}}
function drawEnemies(){for(const en of enemies){ctx.save();ctx.translate(en.x,en.y);ctx.shadowBlur=18;ctx.shadowColor="#ff648f";ctx.fillStyle="#7d294d";ctx.beginPath();ctx.arc(0,0,en.r,0,Math.PI*2);ctx.fill();ctx.strokeStyle="#ff8bac";ctx.lineWidth=3;ctx.stroke();ctx.fillStyle="#ffb0c4";ctx.fillRect(-9,-4,18,6);ctx.fillStyle="#fff";ctx.fillRect(-6,-3,4,3);ctx.fillRect(3,-3,4,3);ctx.restore();}}
function drawPlayer(){ctx.save();ctx.translate(player.x,player.y);if(player.invuln>0&&Math.floor(performance.now()/90)%2===0)ctx.globalAlpha=.35;ctx.shadowBlur=18;ctx.shadowColor="#53e6ee";ctx.fillStyle="#d8faff";ctx.beginPath();ctx.arc(0,0,player.r,0,Math.PI*2);ctx.fill();ctx.fillStyle="#53e6ee";ctx.beginPath();ctx.arc(0,0,8,0,Math.PI*2);ctx.fill();ctx.fillStyle="#f6a96b";ctx.fillRect(8,-5,10,10);ctx.restore();}
function draw(){drawBackground();drawObjects();drawEnemies();for(const b of bullets){ctx.fillStyle="#8ffaff";ctx.shadowBlur=12;ctx.shadowColor="#53e6ee";ctx.fillRect(b.x,b.y-3,17,6);}ctx.shadowBlur=0;drawPlayer();ctx.fillStyle="#7f94b4";ctx.font="11px Rajdhani";ctx.fillText("MOVE  •  SHOOT  •  SURVIVE",W-190,H-14);}
function gameLoop(ts){if(state!=="playing")return;const dt=Math.min((ts-(lastTime||ts))/1000,.04);lastTime=ts;update(dt);draw();animationId=requestAnimationFrame(gameLoop);}
draw();
restoreSession();
