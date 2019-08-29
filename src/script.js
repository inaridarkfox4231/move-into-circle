'use strict';
let tile;
let master;
const MAXSTAGENUMBER = 2;

function setup(){
	createCanvas(400, 450);
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
		this.y = constrain(this.y, 55, 445);
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

class key{
	constructor(x, y){
		this.x = x;
		this.y = y;
		this.count = 0;
		this.visible = true;
	}
	hide(){ this.visible = false; }
	update(){
		if(!this.visible){ return; }
		this.count++;
	}
	render(){
		if(!this.visible){ return; }
		push();
		let w = abs(this.count % 120 - 60) / 3;
		rect(this.x, this.y, w, 20);
		pop();
	}
}

// render命令で、ゲームオーバー時に画面を暗くして白文字でGAMEOVER...
// で、60フレーム後に再スタートする感じで。すべて再配置。
// updateをステージ数表示の時にやらなければOK.

class whole{
	constructor(){
		this.tile = new tiloid();
		this.obstacles = [];
		this.keys = []; // keyを放り込む。
		this.count = 0;
		this.state = 0;
		this.stageNumber = 0;
		this.goal = {x:0, y:0, w:0, h:0};
		this.key = {got:0, necessary:0, complete:false};
		// got:取得した。necessary:必要数。必要なだけ取るとcompleteがfalse→trueになる。
		// gotはいちいち0にリセットする。necessaryはステージにより異なる。settingで行う。
	}
	setCount(n){ this.count = n; }
	setObstacles(){
		// stageNumberで分岐
		if(this.stageNumber === 0){
			this.keys.push(new key(105, 200));
			this.keys.push(new key(220, 70));
			this.keys.push(new key(240, 435));
			this.key.necessary = 3;
			this.registObstacle({id:0, x:40, y:300, w:100, h:300});
			this.registObstacle({id:0, x:170, y:200, w:80, h:300});
			this.registObstacle({id:0, x:305, y:300, w:90, h:300});
		}else if(this.stageNumber === 1){
			this.keys.push(new key(200, 150));
			this.keys.push(new key(240, 250));
			this.keys.push(new key(160, 350));
			this.key.necessary = 3;
			this.registObstacle({id:1, x:200, y:150, w:60, h:60, ax:170, ay:0, period:160, phase:40});
			this.registObstacle({id:1, x:200, y:250, w:60, h:60, ax:170, ay:0, period:160, phase:120});
			this.registObstacle({id:1, x:200, y:350, w:60, h:60, ax:170, ay:0, period:160, phase:40});
		}
		this.setCount(60);
		this.tile.setPos(5, 55); // ステージにより異なる
		this.goalPos = {x:390, y:440}; // ステージにより異なる
		this.key.got = 0; // 常時処理
		this.key.complete = false; // 常時処理。共通処理はresetに書いた方がいいかも
	}
	collisionCheck(){
		if(this.state !== 1){ return; }
		let x = this.tile.x;
		let y = this.tile.y;
		// 障害物との当たり判定
	  for(let i = 0; i < this.obstacles.length; i++){
			let r = this.obstacles[i];
			// 当たったらfailure.
			if(abs(x - r.x) < (10 + r.w) / 2 && abs(y - r.y) < (10 + r.h) / 2){
				this.state = 2;
				this.setCount(60);
				break;
			}
		}
		if(this.key.complete){ return; }
		// キーとの当たり判定。一度に一つしか当たらない。当たったらkeyを隠してgotを増やす。
		for(let i = 0; i < this.keys.length; i++){
			let k = this.keys[i];
			// 取得したらgot.
			if(!k.visible){ continue; }
			if(abs(x - k.x) < 15 && abs(y - k.y) < 15){
				k.hide();
				this.key.got++;
				break;
			}
		}
	}
	clearCheck(){
		if(this.state !== 1){ return; }
		// ゴール出現判定はここで。
		if(!this.key.complete){
			if(this.key.got === this.key.necessary){ this.key.complete = true; }
			return; // ゴールがなければクリア処理は行わない
		}
		if(abs(this.tile.x - this.goalPos.x) < 15 && abs(this.tile.y - this.goalPos.y) < 15){
			// クリア処理
			this.state = 3;
			this.setCount(60);
		}
	}
	update(){
		if(this.state === 0){
			this.count--;
			if(this.count === 0){ this.state = 1; }
		}else if(this.state === 1){
			this.count++;
			if(this.count === 60000){ this.count = 0; }
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
		// 上部バー
		fill(0)
		rect(200, 25, 400, 50);
		fill(255);
		printText("STAGE " + (this.stageNumber + 1).toString(), 10, 40);
		printText((this.key.got).toString() + "/" + (this.key.necessary).toString(), 300, 40);
		// ゴール
		if(this.key.complete){
			let w = abs(this.count % 120 - 60) / 3;
			fill(65, 100, 100);
		  rect(this.goalPos.x, this.goalPos.y, w, 20);
	  }else{
			// クリアしてないのでキーを描画する
			fill(12, 100, 100);
			this.keys.forEach((k) => {k.update(); k.render();})
		}
		// プレイヤータイル
		this.tile.render();
		// 障害物
		this.obstacles.forEach((obs) => {obs.render();})
		// 操作円
	  fill(0, 0, 0, 30);
	  ellipse(mouseX, mouseY, 150, 150);
		// 文字関連
		fill(0, 0, 100);
		if(this.state === 0){
			printText("START!", 40, 110);
		}else if(this.state === 2){
			printText("FAILURE..", 40, 110);
		}else if(this.state === 3){
			printText("CLEAR!", 20, 130);
			if(this.stageNumber + 1 === MAXSTAGENUMBER){
				printText("STAGE ALL CLEAR!", 20, 175);
			}
		}
	}
	reset(){
		this.obstacles = [];
		this.keys = [];
		//this.tile.setPos(5, 5);
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

// 円の外側が時間経過で暗くなったり明るくなったりすると面白いかも
// アイテムを取って加速するとかしたら面白いかも
// 円が小さくなるアイテムとかあったら面白いかも

// 仕様変更して400x80のスペースを上部に。背景黒、文字は白で。
// ステージ番号と数（〇/〇）みたいなの
// キーを集めるとゴールが出現する仕組みにしたい。キーは横回転する逆三角形、ゴールは回転する正方形。
// 色はそれぞれ濃いオレンジと紺色にする。
