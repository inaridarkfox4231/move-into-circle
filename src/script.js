'use strict';
let tile;
let master;
const MAXSTAGENUMBER = 2;

function setup(){
	createCanvas(400, 400);
	colorMode(HSB, 100);
	rectMode(CENTER);
	noStroke();
	master = new whole();
	master.setObstacles();
}

function draw(){
	background(0, 0, 70);
  master.update();
	master.render();
	master.collisionCheck();
	master.clearCheck();
}

class tiloid{
	constructor(){
		this.x = 5;
		this.y = 5;
	}
	setPos(x, y){
		this.x = x;
		this.y = y;
	}
	update(){
		let vx = mouseX - this.x;
		let vy = mouseY - this.y;
		let angle = atan2(vy, vx);
		if(vx * vx + vy * vy < 5625){
			this.x += 1.5 * cos(angle);
			this.y += 1.5 * sin(angle);
		}else{
			this.x -= 1.5 * cos(angle);
			this.y -= 1.5 * sin(angle);
		}
		this.x = constrain(this.x, 5, 395);
		this.y = constrain(this.y, 5, 395);
	}
	render(){
		push();
		fill(0);
		rect(this.x, this.y, 10, 10);
		fill(0, 0, 100);
		rect(this.x - 2, this.y - 2, 2, 4);
		rect(this.x + 2, this.y - 2, 2, 4);
		pop();
	}
}

class obstacle{
  constructor(){
	}
	update(){}
}

// rectObstacleは長方形状の障害物です（他にも円を考えたいところ）
// flowに従って位置を変えます。flowは位置を制御するための命令です。
// flowのexecute命令の中で限界が来た場合に次のflowにセットします（同じflowを継続する場合もある）
// flowがないものは固定長方形、画面の端とかに用意、当たるとアウト。
class rectObstacle extends obstacle{
	constructor(x, y, w, h, hue){
		super();
		this.x = x;
		this.y = y;
		this.w = w;
		this.h = h;
		this.currentFlow = undefined;
		this.hue = hue;
	}
	setFlow(newFlow){
		this.count = 0;
		this.currentFlow = newFlow;
	}
	update(){
		if(this.currentFlow === undefined){ return; }
		this.currentFlow.execute(this);
	}
	render(){
		push();
		fill(this.hue, 100, 100);
		rect(this.x, this.y, this.w, this.h);
		pop();
	}
}

class flow{
	constructor(){
		this.nextFlow = undefined;
	}
	execute(_obstacle){}
}

class sineCurve extends flow{
	constructor(cx, cy, ax, ay, period, phase){
		super();
		this.cx = cx;
		this.cy = cy;
		this.ax = ax;
		this.ay = ay;
		this.period = period; // 周期、何フレームで往復完了するか
		this.phase = phase; // 初期位相（数で指定、200に対して68なら68からスタート）
	}
	execute(_obstacle){
		let angle = (this.phase + _obstacle.count) * 2 * PI / this.period;
		_obstacle.x = this.cx + this.ax * sin(angle);
		_obstacle.y = this.cy + this.ay * sin(angle);
		_obstacle.count++;
	}
}

// render命令で、ゲームオーバー時に画面を暗くして白文字でGAMEOVER...
// で、60フレーム後に再スタートする感じで。すべて再配置。
// updateをステージ数表示の時にやらなければOK.

class whole{
	constructor(){
		this.tile = new tiloid();
		this.obstacles = [];
		this.count = 0;
		this.state = 0;
		this.stageNumber = 0;
		this.goal = {x:0, y:0, w:0, h:0};
	}
	setCount(n){ this.count = n; }
	setObstacles(){
		// stageNumberで分岐
		if(this.stageNumber === 0){
			this.registObstacle({id:0, x:40, y:250, w:100, h:300});
			this.registObstacle({id:0, x:170, y:150, w:80, h:300});
			this.registObstacle({id:0, x:305, y:250, w:90, h:300});
		}else if(this.stageNumber === 1){
			this.registObstacle({id:1, x:200, y:100, w:60, h:60, ax:170, ay:0, period:160, phase:40});
			this.registObstacle({id:1, x:200, y:200, w:60, h:60, ax:170, ay:0, period:160, phase:120});
			this.registObstacle({id:1, x:200, y:300, w:60, h:60, ax:170, ay:0, period:160, phase:40});
		}
		this.setCount(60);
		this.goal = {x:390, y:390, w:20, h:20};
	}
	collisionCheck(){
		if(this.state !== 1){ return; }
		let x = this.tile.x;
		let y = this.tile.y;
	  for(let i = 0; i < this.obstacles.length; i++){
			let r = this.obstacles[i];
			if(abs(x - r.x) < (10 + r.w) / 2 && abs(y - r.y) < (10 + r.h) / 2){
				this.state = 2;
				this.setCount(60);
				break;
			}
		}
	}
	clearCheck(){
		if(this.state !== 1){ return; }
		if(abs(this.tile.x - this.goal.x) < (10 + this.goal.w) / 2 && abs(this.tile.y - this.goal.y) < (10 + this.goal.h) / 2){
			this.state = 3;
			this.setCount(60);
		}
	}
	update(){
		if(this.state === 0){
			this.count--;
			if(this.count === 0){ this.state = 1; }
		}else if(this.state === 1){
			this.tile.update();
		}else if(this.state === 2){
			this.count--;
			if(this.count === 0){
				this.reset();
				this.state = 0;
				this.setCount(60);
			}
		}else if(this.state === 3){
			this.count--;
			if(this.count === 0){
				this.stageNumber = (this.stageNumber + 1) % MAXSTAGENUMBER;
				this.reset();
				this.state = 0;
				this.setCount(60);
			}
		}
		if(this.state < 2){
		  this.obstacles.forEach((obs) => {obs.update();})
		}
	}
	render(){
		rect(this.goal.x, this.goal.y, this.goal.w, this.goal.h);
		this.tile.render();
		this.obstacles.forEach((obs) => {obs.render();})
	  fill(0, 0, 0, 30);
	  ellipse(mouseX, mouseY, 150, 150);
		fill(0, 0, 100);
		if(this.state === 0){
			printText("STAGE" + (this.stageNumber + 1).toString(), 20, 80);
		}else if(this.state === 2){
			printText("FAILURE", 20, 80);
		}else if(this.state === 3){
			printText("CLEAR!", 20, 80);
			if(this.stageNumber + 1 === MAXSTAGENUMBER){
				printText("STAGE ALL CLEAR!", 20, 125);
			}
		}
	}
	reset(){
		this.obstacles = [];
		this.tile.setPos(5, 5);
		this.setObstacles();
	}
	registObstacle(data){
		switch(data.id){
			case 0:
				this.obstacles.push(new rectObstacle(data.x, data.y, data.w, data.h, 0));
				break;
			case 1:
				let obs = new rectObstacle(data.x, data.y, data.w, data.h, 5);
				let f = new sineCurve(data.x, data.y, data.ax, data.ay, data.period, data.phase);
				obs.setFlow(f);
				this.obstacles.push(obs);
				break;
		}
	}
}

function printText(str, x, y){
	push();
	fill(255);
	textSize(40);
	text(str, x, y);
	pop();
}
// 一定時間透明になってその間は当たっても大丈夫な障害物とか
// 伸縮するとか。伸縮しつつ移動するとか。不規則に移動を繰り返すなど。分裂したりとか。

// コードにしてそれを読み取るたびに障害物が追加されるとかそんな感じのをjsonに放り込んで以下略

// type0:simple. 普通の障害物で、動かない。色は赤。
// type1:一定の方向に正弦振動。色はオレンジ。
// type2:楕円軌道。色は緑。
// type3:放物線みたいな軌道でぴょんぴょん。色はピンク。
// type4:tileにゆっくりと向かってくるホーミング。色は水色。
// type5:複数の場所を一定時間ごとにイージングで直線移動し続ける。規則的とランダムがある。色は青。
// type6:伸縮する。中心が動くものとそうでないものがある。色は黄色。
