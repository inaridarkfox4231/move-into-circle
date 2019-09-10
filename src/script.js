'use strict';
let tile;
let master;
const MAXSTAGENUMBER = 3;
// 黒、赤、朱、緑、青、紫、黄色、水色
// 0:壁、1~5:敵、6:キー、7:ゴール
let pallete = [];

function setup(){
	createCanvas(400, 450);
	rectMode(CENTER);
	noStroke();
	pallete = [color(0), color(237, 28, 36), color(255, 127, 39), color(34, 177, 76), color(63, 72, 204), color(163, 73, 164), color(255, 242, 0), color(0, 162, 232)];
	master = new whole();
	master.setObstacles();
}

function draw(){
	background(200);
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
		fill(255);
		rect(this.x - 2, this.y - 2, 2, 4);
		rect(this.x + 2, this.y - 2, 2, 4);
		pop();
	}
}

class obstacle{
	constructor(level, w, h){
		this.x = 0;
		this.y = 0;
		this.w = w;
		this.h = h;
		this.count = 0;
		this.active = true;
		this.level = level;
		this.isEnemy = false;
	}
	setPos(x, y){
		this.x = x;
		this.y = y;
	}
	activate(){ this.active = true; }
	inActivate(){ this.active = false; }
	reShape(newW, newH){
		this.w = newW;
		this.h = newH;
	}
	update(){}
	render(){
		push();
		fill(pallete[this.level]);
		rect(this.x, this.y, this.w, this.h);
		pop();
	}
}

// いくつかの点集合の間を徘徊する。移動は直線とイージング。
class wanderer extends obstacle{
	constructor(level, w, h, pointList, fromId, toId, span = 100, easingId = 0, moveType = 0){
		super(level, w, h);
		this.isEnemy = true;
		this.points = pointList;
		this.fromId = fromId;
		this.toId = toId;
		this.span = span;
		this.easingId = easingId; // 0:通常。
		this.moveType = moveType; // 0:元来た道も選ぶ。1:後戻りしない。2:どこでもランダム 3:後戻りしない、かつどこでもランダム
	}
	changePoints(newPointList){
		this.points = newPointList;
	}
	update(){
		if(!this.active){ return; }
		let u = this.points[this.fromId];
		let v = this.points[this.toId];
		let prg = wanderer.easing(this.count / this.span, this.easingId);
		this.x = map(prg, 0, 1, u.x, v.x);
		this.y = map(prg, 0, 1, u.y, v.y);
		this.count++;
		if(this.count === this.span){
			// フラグ処理を挟むならここ。pointsを変えたりスピードを変えるなど。
			this.convert();
		}
	}
	convert(){
		let previousFromId = this.fromId;
		this.fromId = this.toId;
		switch(this.moveType){
			case 0: // 最も近くの点
				this.toId = getClosePointId(this.fromId, this.points, -1);
				break;
			case 1: // 元来た点以外で最も近くの点
				this.toId = getClosePointId(this.fromId, this.points, previousFromId);
				break;
			case 2: // どれかの点
				this.toId = getRandomPointId(this.fromId, this.points, -1);
				break;
			case 3: // 元来た点以外でどれかの点
				this.toId = getRandomPointId(this.fromId, this.points, previousFromId);
				break;
			case 4: // じゅんばん
			  let len = this.points.length;
				this.toId = (this.toId + 1) % len;
		}
		this.count = 0;
	}
	static easing(x, id){
		switch(id){
			case 0:
				return x; // normal.
			case 1:
				return (1 - cos(PI * x)) / 2; // slowin, slowout.
			case 2:
				return x * (2 * x - 1); // backin.
			case 3:
				return 1 - Math.sqrt(1 - x * x); // slowin, fastout.
		}
	}
}

// ある点を中心とした周回軌道。円、楕円、リサージュetc...
// 円軌道の中に三角関数を入れて回転方向が変化するなど自由自在にできる。
// centerが移動する派生形を作っても面白そう。往復させればリフトになるし。
class circular extends obstacle{
	constructor(level, w, h, center, phase, period, params, moveType){
		super(level, w, h);
		this.isEnemy = true;
		this.center = center;
		this.phase = phase;
		this.period = period;
		this.params = params; // 長半径と短半径とか、リサージュのパラメータなど。
		this.moveType = moveType; // 0:楕円、1:リサージュ、2:ゆらゆら円軌道（半径摂動）、etc...
	}
	update(){
		if(!this.active){ return; }
		let angle = (this.phase + this.count) * 2 * PI / this.period;
		let newPos = circular.calcPos(angle, this.params, this.moveType);
		this.x = this.center.x + newPos.x;
		this.y = this.center.y + newPos.y;
		this.count++;
		if(this.count > this.period){ this.count -= this.period; }
	}
	static calcPos(angle, params, id){
		switch(id){
			case 0: // 通常の楕円軌道
				return {x:params[0] * cos(angle), y:params[1] * sin(angle)};
			case 1: // リサージュ
				return {x:params[0] * cos(params[2] * angle), y:params[1] * sin(params[3] * angle)};
			case 2: // 正葉曲線のようなもの
				return {
					x:(params[0] + params[1] * sin(params[2] * angle)) * cos(angle),
					y:(params[0] + params[1] * sin(params[2] * angle)) * sin(angle)
				};
		}
	}
}

// 一方向にぎゅーんってとんでいく。
// 画面外に出た後は元の場所に戻るか、消えるか考え中。とりあえず戻して。
// 差分を計算するようにしようかな・・
// 一応位置の情報も用意してバリエーション増やそうと試みる（うまくいくか知らんけど）
// pivotからの変位を情報として取り入れる。たとえば螺旋軌道とかに使えそう（要らなさそう）。
class bullet extends obstacle{
	constructor(level, w, h, pivot, params, moveType){
		super(level, w, h);
		this.isEnemy = true;
		this.vx = 0;
		this.vy = 0;
		this.pivot = pivot;
		this.x = this.pivot.x;
		this.y = this.pivot.y;
		this.params = params;
		this.moveType = moveType;
	}
	update(){
		let velocity = bullet.calcVelocity(this.count, this.params, this.vx, this.vy, this.moveType);
		this.vx = velocity.vx;
		this.vy = velocity.vy;
		this.x += this.vx;
		this.y += this.vy;
		this.count++;
		if(this.failed()){ this.reset(); }
	}
	failed(){
		if(this.x < 0 || this.y < 0 || this.x > 400 || this.y > 400){ return true; }
		return false;
	}
  reset(){
		this.x = this.pivot.x;
		this.y = this.pivot.y;
		this.vx = 0;
		this.vy = 0;
		this.count = 0;
  }
	static calcVelocity(count, params, vx, vy, id){
		switch(id){
			case 0:
				return {vx:params[0], vy:params[1]}; // 等速度直線
				case 1:
					if(count === 0){ return {vx:params[0], vy:params[1]}; }
					return {vx:vx + params[2], vy:vy + params[3]}; // 等加速度直線
			case 2:
				if(count < params[0]){ return {vx:params[1], vy:params[2]}; } // 一定フレームのあとに折れ曲がる感じ
				else{
					return {
						vx: params[1] * cos(params[3]) + params[2] * sin(params[3]),
						vy:-params[1] * sin(params[3]) + params[2] * cos(params[3])
					}
				}
			case 3:
				 // 一定フレームごとに右か左に折れ曲がる感じ。いわゆるランダムウォーク。
				if(count === 0){ return {vx:params[1], vy:params[2]}; }
				else if(count % params[0] === 0){
					let factor = random([-PI / 2, PI / 2]);
					return {
						vx: vx * cos(factor) + vy * sin(factor),
						vy:-vx * sin(factor) + vy * cos(factor)
					}
				}
				return {vx:vx, vy:vy};
			case 4:
				// 一定フレームのあと折れ曲がり、加速度バージョン（速度は一旦リセットする）
				if(count < params[0]){ return {vx:vx + params[1], vy:vy + params[2]}; }
				else if(count > params[0]){
					return {
						vx: vx + params[1] * cos(params[3]) + params[2] * sin(params[3]),
						vy: vy - params[1] * sin(params[3]) + params[2] * cos(params[3])
					}
				}
				return {vx:0, vy:0};
			case 5:
				// ランダムウォークのパラメータ版。たとえば5なら1/5, 2/5, 3/5, 4/5およびそのマイナスのPI倍。
				if(count === 0){ return {vx:params[1], vy:params[2]}; }
				else if(count % params[0] === 0){
					let angleList = [];
					for(let i = 1; i < params[3]; i++){
						angleList.push(i * PI / params[3]);
						angleList.push(-i * PI / params[3]);
					}
					let factor = random(angleList);
					return {
						vx: vx * cos(factor) + vy * sin(factor),
						vy:-vx * sin(factor) + vy * cos(factor)
					}
				}
				return {vx:vx, vy:vy};
			case 6:
				// らせん。params[1]はピッチ。
				let angle = count * 2 * PI / params[1];
				return {
					vx: params[0] * (cos(angle) - angle * sin(angle)),
					vy: params[0] * (sin(angle) + angle * cos(angle))
				}
			case 7:
				// 方向変化。とりあえず速度一定版。paramsは3n-1個の変数からなり、初めのn-1個で区切りを指定する（正の数）。
				// そして残りの2n個がx方向とy方向の成分になるわけね。
				// たとえば30, 60, 90, 120なら30フレームごとに違う方向に移動し最後は直進する。
				let n = floor(params.length / 3) + 1;
				if(count === 0){ return {vx:params[n - 1], vy:params[2 * n - 1]}; }
				else{
				  let k = 0;
					for(let m = 0; m < n - 1; m++){
						if(count < params[m]){ break; }
						k++;
					}
					return {vx:params[n - 1 + k], vy:params[2 * n - 1 + k]};
				}
				break;
			case 8:
				// 方向変化。加速度版。5h-1個。初めのh-1個が区切りで、残りの4h個は順に初速度x, 初速度y, 加速度x, 加速度y.
				// 加速度は0に指定することもできるのである意味究極形。
				let h = floor(params.length / 5) + 1;
				if(count === 0){ return {vx:params[h - 1], vy:params[2 * h - 1]}; }
				else{
					let k = 0;
					for(let m = 0; m < h - 1; m++){
						if(count < params[m]){ break; }
						k++;
					}
					if(k > 0 && count === params[k - 1]){ return {vx:params[h - 1 + k], vy:params[2 * h - 1 + k]}; }
					else{
						return {vx:vx + params[3 * h - 1 + k], vy:vy + params[4 * h - 1 + k]};
					}
				}
				break;
		}
	}
}

function getClosePointId(id, pointList, avoid){
	// id番以外で最も近いのを・・
	// avoidが-1でないときは、その番号は除外するという意味。たとえば来た方向へは行かないとか。
	let len = pointList.length;
	let dist = 160000; // 最小距離
	let dList = [];
	let nextIdList = [];
  for(let i = 1; i < len; i++){
		let d = calcDist(pointList[id], pointList[(id + i) % len]);
		dList.push(d);
		if(dist > d){ dist = d; }
	}
	//console.log(dList);
	//console.log(dist);
	//console.log(avoid);
	for(let i = 1; i < len; i++){
		if((id + i) % len === avoid){ continue; }
		if(dist === dList[i - 1]){ nextIdList.push((id + i) % len); }
	}
	//console.log(nextIdList);
	if(nextIdList.length === 0){ return avoid; } // バグ回避
	return random(nextIdList);
}

function getRandomPointId(id, pointList, avoid){
	let len = pointList.length;
	let nextIdList = [];
	for(let i = 1; i < len; i++){
		if((id + i) % len === avoid){ continue; }
		nextIdList.push((id + i) % len);
	}
	if(nextIdList.length === 0){ return avoid; }
	return random(nextIdList);
}

function calcDist(p, q){
	return Math.pow(p.x - q.x, 2) + Math.pow(p.y - q.y, 2);
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
			this.registKeyPos([{x:120, y:320}, {x:200, y:320}, {x:200, y:80}, {x:280, y:80}]);
      // 書き直し
			this.registObstacle({kind:-1, level:0, w:400, h:40, x:200, y:20});
			this.registObstacle({kind:-1, level:0, w:40, h:400, x:20, y:200});
			this.registObstacle({kind:-1, level:0, w:400, h:40, x:200, y:380});
			this.registObstacle({kind:-1, level:0, w:40, h:400, x:380, y:200});
			this.registObstacle({kind:-1, level:0, w:80, h:240, x:120, y:160});
			this.registObstacle({kind:-1, level:0, w:80, h:240, x:280, y:240});
			this.tile.setPos(60, 60); // ステージにより異なる
			this.goalPos = {x:340, y:340}; // ステージにより異なる
		}else if(this.stageNumber === 1){
			this.registKeyPos([{x:120, y:260}, {x:280, y:260}]);
			this.registObstacle({kind:-1, level:0, w:400, h:80, x:200, y:40});
			this.registObstacle({kind:-1, level:0, w:60, h:400, x:30, y:200});
			this.registObstacle({kind:-1, level:0, w:400, h:80, x:200, y:360});
			this.registObstacle({kind:-1, level:0, w:60, h:400, x:370, y:200});
			this.registObstacle({kind:-1, level:0, w:40, h:200, x:200, y:180});
			this.registObstacle({kind:-1, level:0, w:80, h:40, x:100, y:180});
			this.registObstacle({kind:-1, level:0, w:80, h:40, x:300, y:180});
			let px = [120, 160, 160, 120, 80, 160, 160, 80, 320, 240, 240, 320, 280, 240, 240, 280];
			let py = [100, 100, 140, 140, 220, 220, 300, 300, 220, 220, 300, 300, 100, 100, 140, 140];
			let points = [];
			for(let i = 0; i < px.length; i++){ points.push({x:px[i], y:py[i]}); }
			this.registObstacle({kind:0, level:1, w:30, h:30, pList:points.slice(0, 4), from:0, to:1, span:60, easingId:0, moveType:4});
			this.registObstacle({kind:0, level:1, w:30, h:30, pList:points.slice(0, 4), from:2, to:3, span:60, easingId:0, moveType:4});
			this.registObstacle({kind:0, level:1, w:40, h:40, pList:points.slice(4, 8), from:0, to:1, span:60, easingId:0, moveType:4});
			this.registObstacle({kind:0, level:1, w:40, h:40, pList:points.slice(4, 8), from:2, to:3, span:60, easingId:0, moveType:4});
			console.log("kkkk");
			this.registObstacle({kind:0, level:1, w:40, h:40, pList:points.slice(8, 12), from:0, to:1, span:60, easingId:0, moveType:4});
			this.registObstacle({kind:0, level:1, w:40, h:40, pList:points.slice(8, 12), from:2, to:3, span:60, easingId:0, moveType:4});
			this.registObstacle({kind:0, level:1, w:30, h:30, pList:points.slice(12, 16), from:0, to:1, span:60, easingId:0, moveType:4});
			this.registObstacle({kind:0, level:1, w:30, h:30, pList:points.slice(12, 16), from:2, to:3, span:60, easingId:0, moveType:4});
			this.tile.setPos(80, 100); // ステージにより異なる
			this.goalPos = {x:320, y:100}; // ステージにより異なる
		}else if(this.stageNumber === 2){
			this.registKeyPos([{x:100, y:140}, {x:100, y:260}, {x:300, y:140}, {x:300, y:260}]);
			this.registObstacle({kind:-1, level:0, w:400, h:40, x:200, y:20});
			this.registObstacle({kind:-1, level:0, w:40, h:400, x:20, y:200});
			this.registObstacle({kind:-1, level:0, w:400, h:40, x:200, y:380});
			this.registObstacle({kind:-1, level:0, w:40, h:400, x:380, y:200});
			let points = [];
			for(let i = 0; i < 4; i++){
				for(let k = 0; k < 3; k++){
					points.push({x:60 + i * 40, y:100 + 40 * k});
				}
			}
			for(let j = 0; j < 12; j++){ points.push({x:points[j].x + 160, y:points[j].y}); }
			for(let j = 0; j < 12; j++){ points.push({x:points[j].x, y:points[j].y + 120}); }
			for(let j = 0; j < 12; j++){ points.push({x:points[j].x + 160, y:points[j].y + 120}); }
			this.registObstacle({kind:0, level:1, w:30, h:30, pList:points.slice(0, 12), from:11, to:10, span:20, easingId:0, moveType:0});
			this.registObstacle({kind:0, level:1, w:30, h:30, pList:points.slice(12, 24), from:8, to:9, span:20, easingId:0, moveType:0});
			this.registObstacle({kind:0, level:1, w:30, h:30, pList:points.slice(24, 36), from:3, to:2, span:20, easingId:0, moveType:0});
			this.registObstacle({kind:0, level:1, w:30, h:30, pList:points.slice(36, 48), from:0, to:1, span:20, easingId:0, moveType:0});
			this.tile.setPos(200, 60); // ステージにより異なる
			this.goalPos = {x:200, y:340}; // ステージにより異なる
		}
		this.setCount(60);
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
				if(r.isEnemy){
					this.state = 2;
				  this.setCount(60);
				  break;
				}else{
          if(x < r.x - r.w / 2 || x > r.x + r.w / 2){
						if(x < r.x){ this.tile.x = r.x - (10 + r.w) / 2; }else{ this.tile.x = r.x + (10 + r.w) / 2; }
					}
					if(y < r.y - r.h / 2 || y > r.y + r.h / 2){
						if(y < r.y){ this.tile.y = r.y - (10 + r.h) / 2; }else{ this.tile.y = r.y + (10 + r.h) / 2; }
					}
				}
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
		fill(128)
		rect(200, 425, 400, 50);
		fill(255);
		printText("STAGE " + (this.stageNumber + 1).toString(), 10, 440);
		printText((this.key.got).toString() + "/" + (this.key.necessary).toString(), 300, 440);
		// ゴール
		if(this.key.complete){
			fill(pallete[7]);
		  rect(this.goalPos.x, this.goalPos.y, 20, 20);
	  }else{
			// クリアしてないのでキーを描画する
			fill(pallete[6]);
			this.keys.forEach((k) => {k.update(); k.render();})
		}
		// プレイヤータイル
		this.tile.render();
		// 障害物
		this.obstacles.forEach((obs) => {obs.render();})
		// 操作円
	  fill(0, 0, 0, 75);
	  ellipse(mouseX, mouseY, 150, 150);
		// 文字関連
		fill(255);
		if(this.state === 0){
			printText("START!", 40, 60);
		}else if(this.state === 2){
			printText("FAILURE..", 40, 60);
		}else if(this.state === 3){
			printText("CLEAR!", 20, 80);
			if(this.stageNumber + 1 === MAXSTAGENUMBER){
				printText("STAGE ALL CLEAR!", 20, 125);
			}
		}
	}
	reset(){
		this.obstacles = [];
		this.keys = [];
		//this.tile.setPos(5, 5);
		this.setObstacles();
	}
	registKeyPos(posArray){
		posArray.forEach((p) => {
			this.keys.push(new key(p.x, p.y))
		})
		this.key.necessary = posArray.length;
	}
	registObstacle(data){
    // 書き直し
		switch(data.kind){
			case -1:
			  // simple.
				let obs = new obstacle(data.level, data.w, data.h);
				obs.setPos(data.x, data.y);
				this.obstacles.push(obs);
				break;
			case 0:
			  // wanderer.
				this.obstacles.push(new wanderer(data.level, data.w, data.h, data.pList, data.from, data.to, data.span, data.easingId, data.moveType));
				break;
			case 1:
			  // circular.
				this.obstacles.push(new circular(data.level, data.w, data.h, data.center, data.phase, data.period, data.params, data.moveType));
				break;
			case 2:
			  // bullet.
				this.obstacles.push(new bullet(data.level, data.w, data.h, data.pivot, data.params, data.moveType));
				break;
		}
	}
}

function printText(str, x, y){
	textSize(40);
	text(str, x, y);
}
// 一定時間透明になってその間は当たっても大丈夫な障害物とか
// 伸縮するとか。伸縮しつつ移動するとか。不規則に移動を繰り返すなど。分裂したりとか。

// コードにしてそれを読み取るたびに障害物が追加されるとかそんな感じのをjsonに放り込んで以下略

// type0:simple. 普通の障害物で、動かない。色は赤。
// type1:一定の方向に正弦振動。色はオレンジ。
// type2:楕円軌道。色は緑。
// type3:放物線みたいな軌道でぴょんぴょん。色はピンク。
// type4:tileにゆっくりと向かってくるホーミング。色は水色。→やっぱ没
// type5:複数の場所を一定時間ごとにイージングで直線移動し続ける。規則的とランダムがある。色は青。
// type6:伸縮する。中心が動くものとそうでないものがある。色は黄色。

// 円の外側が時間経過で暗くなったり明るくなったりすると面白いかも
// アイテムを取って加速するとかしたら面白いかも
// 円が小さくなるアイテムとかあったら面白いかも

// 仕様変更して400x80のスペースを上部に。背景黒、文字は白で。
// ステージ番号と数（〇/〇）みたいなの
// キーを集めるとゴールが出現する仕組みにしたい。キーは横回転する逆三角形、ゴールは回転する正方形。
// 色はそれぞれ濃いオレンジと紺色にする。

// ワープするの作りたい。くるくる回るやつで別の色のものを作って・・紫とか。
// ワープ先には何も用意しない感じで。
// キーを取る順番で出現するゴールが変わったら面白そう。
// センサーを用意してレールが動いたり止まったりしたら面白そう。
// 例えばA地点からB地点にレールが敷かれているとき、ポイントPを通過するとレールがactivateされて、
// 対象がAからBまで動いたら自動的にinActivateされる。そしてポイントQを通過するとふたたびactivateされるとか
// なんかそんなような、エレベータみたいなやつ。

// constantFlowに関してはactivate変数を設けてそれがうーん難しいセンサーとの連携どうするかな

// 壁：黒
// 動く敵：赤、オレンジ、緑、青、紫
// キー：黄色
// ゴール：スカイブルー
