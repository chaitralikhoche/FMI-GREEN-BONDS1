const express = require("express");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http, { cors: { origin: "*" } });
const PORT = process.env.PORT || 3000;

app.use(express.static("public")); // 👈 serves your index.html

// your existing full game logic:
const SECTORS = [
  {id:0,name:"Renewable Energy",roi:8,beta:0.9,esg:9,locked:false,desc:"Large-scale solar & wind",hiddenMult:1.40},
  {id:1,name:"Fossil Fuels",roi:12,beta:1.4,esg:2,locked:false,desc:"Coal & oil plants",hiddenMult:0.80},
  {id:2,name:"Electric Vehicles",roi:10,beta:1.2,esg:8,locked:true,desc:"EV manufacturing & infra",hiddenMult:1.25},
  {id:3,name:"Green Infrastructure",roi:6,beta:0.8,esg:7,locked:false,desc:"Public-private green projects",hiddenMult:1.10},
  {id:4,name:"Waste Management",roi:7,beta:0.7,esg:9,locked:true,desc:"Recycling & waste-to-energy",hiddenMult:1.30},
  {id:5,name:"Water Conservation",roi:9,beta:0.9,esg:8,locked:true,desc:"Water treatment & reuse",hiddenMult:1.15},
  {id:6,name:"Carbon Credits",roi:15,beta:1.5,esg:10,locked:true,desc:"Carbon trading instruments",hiddenMult:1.50},
  {id:7,name:"Green Buildings",roi:9,beta:1.1,esg:8,locked:false,desc:"Energy efficient constructions",hiddenMult:1.20},
  {id:8,name:"Sustainable Agriculture",roi:8,beta:1.0,esg:8,locked:false,desc:"Climate-smart farming",hiddenMult:1.15},
  {id:9,name:"Solar Manufacturing",roi:10,beta:1.3,esg:9,locked:true,desc:"Panel & cell manufacturing",hiddenMult:1.35},
  {id:10,name:"Hydrogen Energy",roi:18,beta:1.8,esg:9,locked:true,desc:"Early-stage hydrogen tech",hiddenMult:1.60},
  {id:11,name:"ESG Mutual Fund",roi:6,beta:0.7,esg:8,locked:false,desc:"Diversified ESG fund",hiddenMult:1.10}
];

let rooms = {};
function genCode(){ return Math.random().toString(36).slice(2,8).toUpperCase(); }

io.on("connection", socket => {
  console.log("connected", socket.id);

  socket.on("createRoom", (hostName, cb)=>{
    const code = genCode();
    rooms[code] = { hostId: socket.id, hostName, players:[], impostorId:null, gameStarted:false, sectorsUnlocked:SECTORS.filter(s=>!s.locked).length };
    socket.join(code);
    cb({ok:true, roomCode:code});
  });

  socket.on("joinRoom", ({roomCode,name,avatar}, cb)=>{
    const room = rooms[roomCode];
    if(!room) return cb({error:"room not found"});
    if(room.players.length >= 8) return cb({error:"room full"});
    const player = {id:socket.id,name,avatar,role:"investor",investments:{},remaining:100};
    room.players.push(player);
    socket.join(roomCode);
    io.to(roomCode).emit("playersUpdate", room.players);
    cb({ok:true,sectors:SECTORS});
  });

  socket.on("startGame", (roomCode, cb)=>{
    const room = rooms[roomCode];
    if(!room || socket.id !== room.hostId) return cb({error:"not host"});
    const imp = room.players[Math.floor(Math.random()*room.players.length)];
    room.impostorId = imp.id;
    room.players.forEach(p=>p.role=(p.id===imp.id)?"impostor":"investor");
    room.gameStarted = true;
    io.to(roomCode).emit("gameStarted", {players:room.players});
    cb({ok:true});
  });

  socket.on("submitInvestment", ({roomCode,investments},cb)=>{
    const room = rooms[roomCode];
    if(!room) return cb({error:"no room"});
    const p = room.players.find(x=>x.id===socket.id);
    if(!p) return cb({error:"no player"});
    let total = Object.values(investments).reduce((a,b)=>a+Number(b||0),0);
    if(total>100) return cb({error:"too much"});
    p.investments=investments; p.remaining=100-total;
    io.to(roomCode).emit("playersUpdate", room.players);
    cb({ok:true});
  });

  socket.on("endGame",(roomCode,cb)=>{
    const room = rooms[roomCode];
    if(!room) return cb({error:"no room"});
    const results = room.players.map(p=>{
      if(p.role==="impostor") return {name:p.name,role:p.role,total:null};
      let totalVal = 0;
      for(const [sid,amt] of Object.entries(p.investments)){
        totalVal += (amt||0)*SECTORS[+sid].hiddenMult;
      }
      totalVal += p.remaining;
      return {name:p.name,role:p.role,total:totalVal};
    }).sort((a,b)=>b.total - a.total);
    const winner = results.find(r=>r.role!=="impostor");
    io.to(roomCode).emit("gameEnded",{results,winner});
    cb({ok:true});
  });

  socket.on("disconnect",()=>{
    for(const code in rooms){
      const r = rooms[code];
      r.players = r.players.filter(p=>p.id!==socket.id);
      if(socket.id===r.hostId){ io.to(code).emit("hostDisconnected"); delete rooms[code]; }
    }
  });
});

http.listen(PORT, ()=>console.log("Server running on port",PORT));
