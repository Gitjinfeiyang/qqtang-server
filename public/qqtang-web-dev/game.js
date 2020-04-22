window.game={
    start
}


const Direction={
    UP:'up',
    DOWN:'down',
    LEFT:'left',
    Right:'right'
}
const PlayerState={
    TRANSPARENT:1, //透明状态
    NORMAL:2, //正常状态 
    FALL:3, //倒地状态 
    DIE:4 //死亡状态
}


const col=16;
const defaultProps={
    

    //Grid
    col,
    width:window.innerWidth,
    height:window.innerHeight,
    size:window.innerWidth/col,//pixel per col
    row:window.innerHeight/(window.innerWidth/col),
    



}


//不会动的物体
class Material {
    constructor(props){
        this.col=props.col;
        this.row=props.row;
        this.destructible=props.destructible;
        this.passable=props.passable;
        this.x=0;
        this.y=0;
        this.z=props.z||1;
        this.w=0;
        this.h=0;
        this.ele;
        this.grid;
    }

    addTo(grid){
        this.grid=grid;
        if(this instanceof Bubble){
            grid.bubbles.push(this);
        }else if(this instanceof Player){
            grid.players.push(this)
        }else{
            grid.materials.push(this)
        }
        this.y=this.row*grid.size;
        this.x=this.col*grid.size;
        this.w=grid.size;
        this.h=grid.size;
        this.ele=this.render();
        grid.add(this.ele)
    }

    render(){
        let g=new PIXI.Graphics();
        g.beginFill(0x2266cc);
        g.drawRect(0, 0,this.w,this.h);
        g.endFill();
        g.x=this.x;
        g.y=this.y;
        return g;
    }


}

class Player extends Material{
    constructor(props){
        const options=Object.assign(props,{
            //Player
            speed:4,
            direction:Direction.Down,
            maxBubbleCount:2,
            bubbleRadius:1,
            state:PlayerState.TRANSPARENT,
        })
        super(options)
        this.speed=options.speed;
        this.direction=options.direction;
        this.maxBubbleCount=options.maxBubbleCount;
        this.bubbleRadius=options.bubbleRadius;
        this.bubbles=[
            //Bubble
        ];
        this.state=options.state;
        this.id=props.id;
        this.isSelf=props.isSelf||false;

        this.moveLeft=this.moveLeft.bind(this)
        this.moveRight=this.moveRight.bind(this)
        this.moveUp=this.moveUp.bind(this)
        this.moveDown=this.moveDown.bind(this)
    }

    render(){
        let g=new PIXI.Graphics();
        g.beginFill(0x8855ff);
        g.drawCircle(this.w/2,this.w/2,this.w/2)
        g.endFill();
        g.x=this.x;
        g.y=this.y
        return g;
    }
    
    createBubble(){
        if(this.bubbles.length>= this.maxBubbleCount) return;
        let {col,row}=getColRow(this.x+this.w/2,this.y+this.w/2,this.grid.size)
        let b=new Bubble({col,row,player:this})
        this.bubbles.push(b);
        b.addTo(this.grid)
    }

    deleteBubble(bubble){
        this.bubbles.splice(this.bubbles.indexOf(bubble),1);
        this.grid.remove(bubble.ele);
        this.grid.bubbles.splice(this.grid.bubbles.indexOf(bubble),1)
    }

    faceTo(direction){
        this.direction=direction;
    }

    leftTest(){
        let {col,row}=getColRow(this.x+this.w/2,this.y+this.h/2,this.h);
        let m=this.grid.getMaterialByColRow(col-1,[row-1,row+1])
        return m.filter((item) => {
            return hitTestRectangle(item.ele,this.ele)
        })
    }
    rightTest(){
        let {col,row}=getColRow(this.x+this.w/2,this.y+this.h/2,this.h);
        let m=this.grid.getMaterialByColRow(col+1,[row-1,row+1])
        return m.filter((item) => {
            return hitTestRectangle(item.ele,this.ele)
        })
    }
    upTest(){
        let {col,row}=getColRow(this.x+this.w/2,this.y+this.h/2,this.h);
        let m=this.grid.getMaterialByColRow([col-1,col+1],row-1)
        return m.filter((item) => {
            return hitTestRectangle(item.ele,this.ele)
        })
    }
    downTest(){
        let {col,row}=getColRow(this.x+this.w/2,this.y+this.h/2,this.h);
        let m=this.grid.getMaterialByColRow([col-1,col+1],row+1)
        return m.filter((item) => {
            return hitTestRectangle(item.ele,this.ele)
        })
    }

    moveLeft(){
        let hit=this.leftTest();
        if(hit.some((item) => {
            return !(item instanceof Mask)
        })){
            return;
        }
        this.x-=this.speed;
        this.ele.x=this.x;
    }

    moveRight(){
        let hit=this.rightTest();
        if(hit.some((item) => {
            return !(item instanceof Mask)
        })){
            return;
        }
        this.x+=this.speed;
        this.ele.x=this.x;
    }

    moveUp(){
        let hit=this.upTest();
        if(hit.some((item) => {
            return !(item instanceof Mask)
        })){
            return;
        }
        this.y-=this.speed;
        this.ele.y=this.y;
    }

    moveDown(){
        let hit=this.downTest();
        if(hit.some((item) => {
            return !(item instanceof Mask)
        })){
            return;
        }
        this.y+=this.speed;
        this.ele.y=this.y;
    }

}

class Grid {
    constructor(props){
        const options=Object.assign(props,defaultProps)
        this.self={}
        this.players=[
            //Player
        ]
        this.materials=[
            //Material
        ]
        this.bubbles=[
            //Bubble
        ]
        this.col=options.col;
        this.row=options.row;
        this.size=options.size;

        this.app=new PIXI.Application({
            width: options.width,         // default: 800
            height: options.height,        // default: 600
            antialias: true,    // default: false
            transparent: false, // default: false
            resolution: 1       // default: 1
          }
        );
        document.body.appendChild(this.app.view) 
        
        //draw the grid
        let grid=new PIXI.Graphics();
        grid.lineStyle(1,0x333333,1);
        for(let i=0; i<this.col; i++){
            grid.moveTo(i*this.size,0);
            grid.lineTo(i*this.size,window.innerHeight);
        }
        for(let i=0; i<this.row; i++){
            grid.moveTo(0,i*this.size);
            grid.lineTo(window.innerWidth,i*this.size);
        }
        this.add(grid)
        

        this.initController()
    }


    addSelf(){
        let player;
        player=new Player({id:Math.random(),isSelf:true,col:1,row:1})
        player.addTo(this)
        this.self=player;
    }



    add(pixi,index){
        if(index){
            this.app.stage.addChildAt(pixi,index)
        }else{
            this.app.stage.addChild(pixi)
        }
    }

    remove(pixi){
        this.app.stage.removeChild(pixi)
    }

    initController(){
        let move=null,currentDirection=Direction.LEFT;
        let ticker=new PIXI.ticker.Ticker();
        ticker.add((delta) => {
            move&&move()
        })
        ticker.start();

        window.addEventListener("keydown",(e) => {
            let keycode=e.code;
            switch(keycode){
                case 'ArrowLeft':
                    move=this.self.moveLeft;
                    currentDirection=Direction.LEFT
                    break;
                case 'ArrowRight':
                    move=this.self.moveRight;
                    currentDirection=Direction.RIGHT

                    break;
                case 'ArrowUp':
                    move=this.self.moveUp;
                    currentDirection=Direction.UP
                    break;
                case 'ArrowDown':
                    move=this.self.moveDown;
                    currentDirection=Direction.DOWN
                    break;
                case 'Space':
                    this.self.createBubble()
                    break;

            }
        })
        window.addEventListener("keyup",function(e){
            let keycode=e.code;
            switch(keycode){
                case 'Space':
                    break;
                case 'ArrowLeft':
                    if(currentDirection == Direction.LEFT){
                        move=null
                    }
                    break;
                case 'ArrowRight':
                    if(currentDirection == Direction.RIGHT){
                        move=null
                    }
                    break;
                case 'ArrowUp':
                    if(currentDirection == Direction.UP){
                        move=null
                    }
                    break;
                case 'ArrowDown':
                    if(currentDirection == Direction.DOWN){
                        move=null
                    }
                    break;           

            }
        })

    }

    getMaterialByColRow(col,row){
        let materials=[]
        for(let i=0,l=this.materials.length; i<l; i++){
            if(betweenRange(this.materials[i].col,col) && betweenRange(this.materials[i].row, row)){
                materials.push(this.materials[i])
            }
        }

        for(let i=0,l=this.bubbles.length; i<l; i++){
            if(betweenRange(this.bubbles[i].col,col) && betweenRange(this.bubbles[i].row, row)){
                materials.push(this.bubbles[i])
            }
        }

        return materials;
    }

}


//阻碍
class Stone extends Material{
    constructor(props){
        const options=Object.assign(props,{
            destructible:false, //可破坏
            passable:false,
        })
        super(options)
    }

    render(){
        let g=new PIXI.Graphics();
        g.beginFill(0x2266cc);
        g.drawRect(0, 0,this.w,this.h);
        g.endFill();
        g.x=this.x;
        g.y=this.y;
        return g;
    }
}

//遮挡物
class Mask extends Material{
    constructor(props){
        const options=Object.assign(props,{
            destructible:false,
            passable:true
        })
        super(options)
        
    }

    render(){
        let g=new PIXI.Graphics();
        g.beginFill(0xff0011);
        g.drawRect(0, 0,this.w,this.h);
        g.endFill();
        g.x=this.x;
        g.y=this.y;
        return g;
    }
}

//泡
class Bubble extends Material{
    constructor(props){
        const options=Object.assign(props,{
            destructible:false,
            passable:false,
            duration:3, //second
        })
        super(options)
        this.player=options.player;
        this.duration=options.duration;
        setTimeout(() => {
            this.boom()
        },this.duration*1000)
    }

    render(){
        let g=new PIXI.Graphics();
        g.beginFill(0xffff11);
        let r=parseInt(this.w/2);
        g.drawCircle(r,r,r*0.8);
        g.endFill();
        g.x=this.x;
        g.y=this.y;
        return g;
    }

    boom(){
        this.drawBoom();
        setTimeout(() => {
            this.player.deleteBubble(this); 
        },500)
    }

    drawBoom(){
        let g=this.ele;
        let bound=this.calcBoomBound();
        let tileSize=this.player.grid.size;
        g.clear();
        g.beginFill(0xffff11);
        g.drawRect(bound.col.x,bound.col.y,bound.col.w,bound.col.h)
        g.drawRect(bound.row.x,bound.row.y,bound.row.w,bound.row.h)
        g.endFill();
        g.x=this.x;
        g.y=this.y;
    }


    //计算遇到障碍物后气泡爆炸区域
    calcBoomBound(){
        let bubbleRadius=this.player.bubbleRadius;
        let tileSize=this.player.grid.size;
        let rowMaterial=this.player.grid.getMaterialByColRow([this.col-bubbleRadius,this.col+bubbleRadius],this.row);
        let colMaterial=this.player.grid.getMaterialByColRow(this.col,[this.row-bubbleRadius,this.row+bubbleRadius]);
        let left={col:this.col-bubbleRadius,row:this.row},
            right={col:this.col+bubbleRadius,row:this.row},
            up={col:this.col,row:this.row-bubbleRadius},
            down={col:this.col,row:this.row+bubbleRadius};
        rowMaterial.forEach((item) => {
            if(item.passable) return;
            if(item.col<this.col){
                if((left&&item.col>left.col)||!left){
                    left=item;
                }
            }else if(item.col>this.col){
                if((right&&item.col<right.col)||!right){
                    right=item;
                }
            }
        })
        colMaterial.forEach((item) => {
            if(item.passable) return;
            if(item.row<this.row){
                if((up&&item.row>up.row)||!up){
                    up=item;
                }
            }else if(item.row>this.row){
                if((down&&item.row<down.row)||!down){
                    down=item;
                }
            }
        })
        return {
            row:{
                x:(left.col-this.col)*tileSize,
                y:0,
                w:(right.col-left.col+1)*tileSize,
                h:tileSize
            },
            col:{
                x:0,
                y:(up.row-this.row)*tileSize,
                w:tileSize,
                h:(down.row-up.row+1)*tileSize 
            }
        }
    }
}

function hitTestRectangle(r1, r2) {

    //Define the variables we'll need to calculate
    let hit, combinedHalfWidths, combinedHalfHeights, vx, vy;
  
    //hit will determine whether there's a collision
    hit = false;
  
    //Find the center points of each sprite
    r1.centerX = r1.x + r1.width / 2;
    r1.centerY = r1.y + r1.height / 2;
    r2.centerX = r2.x + r2.width / 2;
    r2.centerY = r2.y + r2.height / 2;
  
    //Find the half-widths and half-heights of each sprite
    r1.halfWidth = r1.width / 2;
    r1.halfHeight = r1.height / 2;
    r2.halfWidth = r2.width / 2;
    r2.halfHeight = r2.height / 2;
  
    //Calculate the distance vector between the sprites
    vx = r1.centerX - r2.centerX;
    vy = r1.centerY - r2.centerY;
  
    //Figure out the combined half-widths and half-heights
    combinedHalfWidths = r1.halfWidth + r2.halfWidth;
    combinedHalfHeights = r1.halfHeight + r2.halfHeight;
  
    //Check for a collision on the x axis
    if (Math.abs(vx) < combinedHalfWidths) {
  
      //A collision might be occuring. Check for a collision on the y axis
      if (Math.abs(vy) < combinedHalfHeights) {
  
        //There's definitely a collision happening
        hit = true;
      } else {
  
        //There's no collision on the y axis
        hit = false;
      }
    } else {
  
      //There's no collision on the x axis
      hit = false;
    }
  
    //`hit` will be either `true` or `false`
    return hit;
  };

function getColRow(x,y,size){
    return {
        col:Math.floor(x/size),row:Math.floor(y/size)
    }
}

function betweenRange(value,range){
    if(Array.isArray(range)){
        if(value<=range[1]&&value>=range[0]){
            return true;
        }
    }else{
        if(value === range){
            return true;
        }
    }
    return false;
}


let g={}
let player={}
function start(){
    g=new Grid({})
    g.addSelf();
    new Stone({row:5,col:5}).addTo(g);
    new Mask({row:5,col:3}).addTo(g);
}