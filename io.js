var socketio = require('socket.io');

const grid={
	col:18,
	row:10
}

const PlayerState={
    TRANSPARENT:1, //透明状态
    NORMAL:2, //正常状态 
    FALL:3, //倒地状态 
    DIE:4 //死亡状态
}

const rooms=[];
const players={};





class Player {
	constructor(props){
		this.id=props.id;
		this.name=props.name;
		this.socket=props.socket;
		this.team=null;
		this.room=null;
		this.x=100;
		this.y=100;
		this.direction=null;
		this.bubbles=[];
		this.state=null;

		this.init()
	}

	init(){
		let s=this.socket;
		let self=this;
		s.on("search_room",(data) => {
			let joined=false;
			let emptyRoomIndexes=[]
			rooms.forEach((item,index) => {
				if(!item.full&& !item.playing && !joined){
					self.join(item)
					joined=true;
					if(item.full){
						self.socket.emit("game_start") 
						self.socket.broadcast.emit("game_start")
						item.playing=true;
					}
					
				}else{

					if(item.players.length<=0){
						emptyRoomIndexes.push(index)
					}

				}
			})


			if(!joined){
				let r=new Room({id:Math.random()})
				rooms.push(r)
				self.join(r)
			}

			
			//clean room
			for(let i=emptyRoomIndexes-1; i>=0; i--){
				rooms.splice(emptyRoomIndexes[i],1)
			}
		})

		s.on("join_room",(data) => {
			let joined=false;
			rooms.forEach((item) => {
				if(item.id == data.id && !item.full){
					this.join(item)
					joined=true;
					
					if(item.full){
						s.emit("game_start")
						s.broadcast.emit("game_start")
						item.playing=true;
					}
					
				}
			})
			if(!joined){
				s.emit("join_fail",{msg:"房间已满"})
			}
		})

		s.on("game_restart",(data) => {
			//此时room仍为playing ，其他player搜索不到该房间
			if(this.room.full){
				this.room.restart()
			}
					this.socket.emit("game_restart")
					// this.socket.broadcast.emit("game_restart",{roomId:this.room.id,id:data.id})

		})

		s.on("walk",(data) => {
			this.x=data.x;
			this.y=data.y;
			this.direction=data.direction;
			s.broadcast.emit("player_walk",this.getData())
		})
		s.on("stop_walk",(data) => {
			this.x=data.x;
			this.y=data.y;
			this.direction=data.direction;
			s.broadcast.emit("player_stop_walk",this.getData())
		})
		s.on("create_bubble",(data) => {
			this.bubbles.push({
				bubbleId:data.bubbleId,
				col:data.col,
				row:data.row
			})
			s.broadcast.emit("player_create_bubble",{id:this.id,bubbleId:data.bubbleId,col:data.col,row:data.row})
		})
		s.on("bubble_boom",(data) => {
			let bubble=this.bubbles.find((item) => {
				return item.bubbleId == data.bubbleId
			});
			if(!bubble) return;
			this.bubbles.splice(this.bubbles.indexOf(bubble),1);
			s.broadcast.emit("player_bubble_boom",{id:this.id,bubbleId:bubble.bubbleId})
		})
		s.on("kill_player",(data) => {
			let player=this.room.players.find((item) => {
				return item.id == data.playerId;
			})
			if(player){
				player.state=PlayerState.FALL
			}
			s.broadcast.emit("player_kill_player",data)
		})

		s.on("real_kill_player",(data) => {
			let player=this.room.players.find((item) => {
				return item.id == data.playerId;
			})
			if(player){
				player.state=PlayerState.DIE
			}
			let playersLive=this.room.players.filter((item) => {
				return item.state != PlayerState.DIE;
			})
			let team=playersLive[0].team;
			let gameover=true;
			playersLive.forEach((item) => {
				if(item.team!=team){
					gameover=false;
				}
			})
			let playersData=playersLive.map((item) => {
				return {...item.getData(),team:item.team}
			})
			if(gameover||playerLive.length<=0){
				s.emit("s_gameover",{winner:playersData})
				s.broadcast.emit("s_gameover",{winner:playersData})
			}else{
				s.broadcast.emit("player_real_kill_player",data)
			}
		})

		s.on("restart",(data) => {
			let player=this.room.players.find((item) => {
				return item.id == data.playerId;
			})
			if(player){
				player.state=PlayerState.NORMAL
			}
			s.broadcast.emit("player_restart",data)
		})

		s.on("eat_medicine",(data) => {
			let medicine=this.room.medicines.find((item) => {
				return item.id == data.medicineId
			})
			if(!medicine) return;
			medicine.eat=true;
			s.broadcast.emit("player_eat_medicine",data)

		})

		s.on("disconnect",() => {
			console.log(self.name+"断开链接")
			self.leaveRoom()
		})

		s.on("leave_room",() => {
			console.log(self.name+"离开")
			self.leaveRoom()
		})

	}

	join(room){
		room.addPlayer(this)
		this.room=room;
		this.socket.join(this.room.id)
		this.socket.emit("join_success",{...this.getData(),
			col:this.col,row:this.row,
			roomId:this.room.id,
			team:this.team,
			players:this.room.getPlayersData(),
			medicines:this.room.medicines});
		this.socket.broadcast.emit("player_join",{...this.getData(),team:this.team})
	}

	leaveRoom(){
		if(!this.room) return;
		this.room.removePlayer(this)
		this.socket.leave(this.room.id)
		this.socket.broadcast.emit("player_leave",this.getData())
	}

	getData(){
		return {
			id:this.id,
			name:this.name,
			x:this.x,
			y:this.y,
			direction:this.direction
		}
	}
}

const teams={
	red:'red',
	blue:'blue',
	black:'black'
}
const room2Teams=[{color:teams.red,col:3,row:1},{color:teams.blue,col:14,row:1}]
class Room {
	constructor(props){
		this.id=props.id;
		this.players=[];
		this.materials=[];
		this.medicines=getMapMedicines(10,18)
		this.hasInit=false;
		this.playing=false;
		this.full=false;
	}

	init(){
		this.players=[];
		this.materials=[];
		this.medicines=getMapMedicines(10,18)
		this.hasInit=false;
		this.playing=false;
		this.full=false;
	}

	addPlayer(player){
	
		this.players.push(player)
		let teamData=room2Teams[this.players.length-1]
		player.team=teamData.color;
		player.col=teamData.col;
		player.row=teamData.row;


		if(this.players.length>=2){
			this.full=true;
		}
	}

	removePlayer(player){
		this.players.splice(this.players.indexOf(player))
		this.full=false;
		if(this.players.length<=0){
			this.playing=false;
		}
	}

	restart(){
		this.players=[];
		this.materials=[];
		this.full=false;
		this.medicines=getMapMedicines(10,18)
	}

	getPlayersData(){
		return this.players.map((item) => {
			return item.getData()
		})
	}
}

class Material {
	constructor(props){
		this.id=Math.random()
		this.col=props.col;
		this.row=props.row;
		this.type=props.type;
		this.texture=props.texture;
		this.destroyed=false;
		this.medicine=props.medicine||null;
	}
}

class Medicine {
	constructor(props){
		this.id=Math.random();
		this.col=props.col;
		this.type=props.type;
		this.player=null;
	}
}

let medicine=['add_speed','add_bubble','add_bubble_radius']
function getRandomMedicine(){
	let length=medicine.length; 
	let num=Math.floor(Math.random()*(length*2));
	return medicine[num]||null
}


function getMapMedicines(row,col){
	let count=row*col;
	let medicines=[]
	for(let i=0; i<count; i++){
		medicines.push({medicine:getRandomMedicine(),id:Math.random(),eat:false})
	}
	return medicines;
}






let io={};



const socketServer=function(server){
	io=socketio(server)

	io.on('connection', function(socket){

		socket.emit("connected")

		socket.on("join",function(data){
			let player=players[data.id]=new Player({...data,socket});
		})

	});

}


function getRooms(){
	return rooms
}

function createRoom(){
	
}




module.exports={
	socket:socketServer,
	getRooms
};