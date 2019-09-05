'use strict';
let obstacles = [];
let loopOn = true;

function setup(){
	createCanvas(400, 400);
	colorMode(HSB, 100);
	rectMode(CENTER);
	noStroke();
	let pList = [];
	for(let i = 1; i <= 7; i++){
		for(let j = 1; j <= 7; j++){
			pList.push({x:50 * i, y:50 * j});
		}
	}
	obstacles.push(new wanderer(0, 20, 20, pList, 0, 1, 70, 2, 0));
	obstacles.push(new wanderer(7, 20, 20, pList, 0, 1, 65, 1, 1));
	obstacles.push(new wanderer(12, 20, 20, pList, 0, 1, 60, 0, 2));
	obstacles.push(new wanderer(45, 20, 20, pList, 0, 1, 55, 2, 4));
	obstacles.push(new wanderer(55, 20, 20, pList, 0, 1, 50, 2, 1));
	obstacles.push(new wanderer(65, 20, 20, pList, 0, 1, 45, 1, 1));
	obstacles.push(new wanderer(75, 20, 20, pList, 0, 1, 40, 1, 2));
	obstacles.push(new wanderer(81, 20, 20, pList, 0, 1, 35, 1, 3));
	obstacles.push(new circular(83, 20, 20, {x:200, y:200}, 0, 160, [100, 100], 0));
	obstacles.push(new circular(85, 20, 20, {x:200, y:200}, 20, 160, [100, 100], 0));
	obstacles.push(new circular(87, 20, 20, {x:200, y:200}, 40, 160, [100, 100], 0));
	obstacles.push(new circular(89, 20, 20, {x:200, y:200}, 60, 160, [100, 100], 0));
	obstacles.push(new circular(91, 20, 20, {x:200, y:200}, 80, 160, [100, 100], 0));
	obstacles.push(new circular(93, 20, 20, {x:200, y:200}, 100, 160, [100, 100], 0));
	obstacles.push(new circular(95, 20, 20, {x:200, y:200}, 120, 160, [100, 100], 0));
	obstacles.push(new circular(97, 20, 20, {x:200, y:200}, 140, 160, [100, 100], 0));
	obstacles.push(new circular(70, 20, 20, {x:200, y:200}, 0, 180, [150, 150, 3, 2], 1));
	obstacles.push(new circular(0, 20, 20, {x:200, y:200}, 0, 360, [150, 50, 6], 2));
	obstacles.push(new bullet(50, 20, 20, {x:200, y:200}, [0.04, -0.04], 1));
	obstacles.push(new bullet(50, 20, 20, {x:200, y:200}, [0.04, 0.04], 1));
	obstacles.push(new bullet(50, 20, 20, {x:200, y:200}, [-0.04, 0.04], 1));
	obstacles.push(new bullet(50, 20, 20, {x:200, y:200}, [-0.04, -0.04], 1));
	obstacles.push(new bullet(70, 20, 20, {x:100, y:200}, [30, 4, 0, PI / 9], 2));
	obstacles.push(new bullet(70, 20, 20, {x:100, y:200}, [30, 4, 0, 2 * PI / 9], 2));
	obstacles.push(new bullet(70, 20, 20, {x:100, y:200}, [30, 4, 0, 3 * PI / 9], 2));
	obstacles.push(new bullet(70, 20, 20, {x:100, y:200}, [30, 4, 0, -PI / 9], 2));
	obstacles.push(new bullet(70, 20, 20, {x:100, y:200}, [30, 4, 0, -2 * PI / 9], 2));
	obstacles.push(new bullet(70, 20, 20, {x:100, y:200}, [30, 4, 0, -3 * PI / 9], 2));
	obstacles.push(new bullet(65, 20, 20, {x:200, y:200}, [10, 2, 0], 3));
	obstacles.push(new bullet(54, 20, 20, {x:100, y:200}, [30, 0.2, 0, PI / 7], 4));
	obstacles.push(new bullet(54, 20, 20, {x:100, y:200}, [30, 0.2, 0, -PI / 7], 4));
	obstacles.push(new bullet(38, 20, 20, {x:200, y:200}, [20, 2, 0, 5], 5));
	obstacles.push(new bullet(38, 20, 20, {x:200, y:200}, [20, 2, 0, 5], 5));
	obstacles.push(new bullet(38, 20, 20, {x:200, y:200}, [20, 2, 0, 5], 5));
	obstacles.push(new bullet(0, 20, 20, {x:200, y:200}, [0.1, 180], 6));
	//noLoop();
}
function draw(){
	background(70, 30, 100);
	obstacles.forEach((o) => { o.update(); })
	obstacles.forEach((o) => { o.render(); })
}

class obstacle{
	constructor(hue, w, h){
		this.x = 0;
		this.y = 0;
		this.w = w;
		this.h = h;
		this.count = 0;
		this.active = true;
		this.hue = hue;
	}
	activate(){ this.active = true; }
	inActivate(){ this.active = false; }
	reShape(newW, newH){
		this.w = newW;
		this.h = newH;
	}
	render(){
		push();
		fill(this.hue, 100, 100);
		rect(this.x, this.y, this.w, this.h);
		pop();
	}
}

// いくつかの点集合の間を徘徊する。移動は直線とイージング。
class wanderer extends obstacle{
	constructor(hue, w, h, pointList, fromId, toId, span = 100, easingId = 0, moveType = 0){
		super(hue, w, h);
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
	constructor(hue, w, h, center, phase, period, params, moveType){
		super(hue, w, h);
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
	constructor(hue, w, h, pivot, params, moveType){
		super(hue, w, h);
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
				return {vx:vx + params[0], vy:vy + params[1]}; // 等加速度直線
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

function mouseClicked(){
  if(loopOn){ noLoop(); loopOn = false; return;}
	loop();
	loopOn = true;
}

// bulletは速度ベースにしよう。
// 速度を与える関数をstaticで用意して、パラメータでいろいろ変えられるようにしたい。
// できればwandererの方もイージングをパラメータでいじりたいけど今はそこまでしなくていい。

// フラグを用意する？
// フラグとはconvertの際に様々な効果が発動する仕掛けで、
// 元締めから命令が出される感じ。
// 命令はconvertの際に実行されて実行されると消える。
// たとえば特定の座標においてパターンが変わる、幅が変化する、spanが変化する、など。
// 例：何回かconvertするまでspanが2倍、もしくは2分の1. 何回かconvertするまで幅が変化（衝突判定に影響）、
// 特定の座標においてパターンチェンジとか。このフラグは一定確率で出現する。
// やり方としては、pointListに出てくる点にidを付与しておいてフラグ出現の足掛かりにするとか。
// んー・・
// 今からそこまで複雑にしなくてもいいやね
