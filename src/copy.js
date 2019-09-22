let uSet = [];
function setup(){
	createCanvas(400, 400);
	noStroke();
	let h = [];
	for(let i = 0; i < 5; i++){
		h.push({x:sin(2 * Math.PI * i / 5), y:-cos(2 * Math.PI * i / 5)});
	}
	for(let i = 0; i < 100; i++){
		let r = i % 5;
		let q = Math.floor(i / 5);
	  let dataArray = [
			{patternId:1, id:1, param:{vx:0, vy:-6, ax:0, ay:0.1}, span:60},
			{patternId:1, id:1, param:{vx:4 * h[r].x, vy:4 * h[r].y, ax:-0.1 * h[r].x, ay:-0.1 * h[r].y}, span:40},
			{patternId:0, span:5 * (q + 1)},
			{patternId:1, id:0, param:{vx:3 * cos(2 * Math.PI * q / 20), vy:3 * sin(2 * Math.PI * q / 20)}, span:-1}
		];
		uSet.push(new unit(200, 300, dataArray));
	}
}

function draw(){
	background(220);
  uSet.forEach((u) => { u.update(); })
	uSet.forEach((u) => { u.render(); })
}

class unit{
	constructor(x, y, dataArray){
		this.id = unit.id; // idを付ける
		unit.id++;
		this.index = -1;
		this.p = {x:x, y:y};
		this.v = {x:0, y:0};
		this.t = 0;
		this.command = undefined;
		this.span = 0;
		this.active = true;
		this.commandArray = createCommandArray(dataArray);
		this.convert();
	}
	setCommand(){
		this.t = 0;
		this.index++;
		if(this.index === this.commandArray.length){ this.inActivate(); return; }
		this.command = this.commandArray[this.index].command;
		this.span = this.commandArray[this.index].span;
		this.command.setting(this);
	}
	inActivate(){ this.active = false; }
	update(){
		if(!this.active){ if(!this.activateCheck()){ return; } }
		this.command.execute(this);
		if(this.span > 0 && this.t >= this.span){ this.convert(); }
		if(this.inActivateCheck()){ this.inActivate(); }
	}
	activateCheck(){ return false; }
	inActivateCheck(){
		if(this.x < -10 || this.x > 410 || this.y < -10 || this.y > 410){ return true; }
		return false;
	}
	render(){
		fill(0);
		ellipse(this.p.x, this.p.y, 10, 10);
	}
	convert(){
    this.setCommand();
		while(this.span === 0){ // span0命令の場合はそれをすべて実行してから次のフェイズに移る
			this.command.execute(this);
			this.setCommand();
			if(this.span > 0 || !this.active){ break; }
		}
	}
}

// waitのときは止める・・posは位置指定。
class wait{
	constructor(){}
	setting(_bullet){ return; }
	execute(_bullet){ _bullet.t++; return; }
}

unit.id = 0;


// 位置固定
// 命令の中にindexの増加と次の命令を実行みたいなのを組み込めばいいと思う。
// 動きのパターンを変えるだけ。
class posFix{
	constructor(x, y){
		this.x = x;
		this.y = y;
	}
	setting(_bullet){ return; }
	execute(_bullet){ _bullet.p = {x:this.x, y:this.y}; }
}

// 他にもindex・・カウンタを0に戻すとかいくつか戻すとかあるといいかも。そういうの、クラスじゃなくてもできるよね・・
// クラスだと重くなっちゃう。どうしよ。

class move{
	constructor(id, param){
		this.id = id;
		this.param = param;
	}
	setting(_bullet){
		_bullet.v = {x:this.param.vx, y:this.param.vy};
	}
	execute(_bullet){
		let v = move.calcVelocity(this.id, _bullet.v, this.param);
		_bullet.v = v;
		_bullet.p.x += v.x;
		_bullet.p.y += v.y;
		_bullet.t++; // モジュールによってはt++しない場合もあるということを考慮
	}
	static calcVelocity(id, v, param){
		switch(id){
			case 0:
				return {x:v.x, y:v.y};
			case 1:
				return {x:v.x + param.ax, y:v.y + param.ay};
			case 2:
				return {x:v.x * param.a + v.y * param.b, y:v.x * param.c + v.y * param.d};
			case 3:
				return {x:v.x * Math.cos(param.t) - v.y * Math.sin(param.t), y:v.x * Math.sin(param.t) + v.y * Math.cos(param.t)}
		}
	}
}

function createCommandArray(dataArray){
	let commandArray = [];
	for(let i = 0; i < dataArray.length; i++){
		commandArray.push(interpret(dataArray[i]));
	}
	return commandArray;
}

function interpret(data){
	switch(data.patternId){
		case 0: // wait
			return {command:new wait(), span:data.span};
		case 1: // move
			return {command:new move(data.id, data.param), span:data.span};
	}
}

// spanを0にするのをやめて、-1で無限、0は続けて実行みたいな感じにするとか。

// ["wait", 60]で60フレームストップにしたい？
// ["move", 1, 0, -6, 0, 0.1, 60]で60フレームだけ（以下略）
// ["move", 0, 1, 0, -1]で速度(1, 0)のまま無限に進む（画面外に出たら消滅）とか？

// 0:最初に戻る。-1:画面外に出たら終了？んー・・
// 壁を用意してその壁に到達したらパターンが変わるとかでも面白そうね。

// 初速度6, 加速度-0.1
// 初速度3, 加速度-0.05
// 初速度は10等分して2周、それぞれスタートディレイ（適宜wait挟む）

// 初速度を決める、tを0にする、tがある程度の値になったら切り替える、
// 最後は画面外に出たら消滅、みたいな？

// なんか、かきたいよー
// シューティングのモデルのような何か（？？？
// 動くものがいろいろ動く
// 動くものが何か吐き出す。それも動く。動きと、モノを、分けたい。でもどっちも動く。うーん・・
// 前回作った時は、そこら辺をflowってのを使っていろいろやって最終的に疲れちゃってやめた。
// なんかもう全部「動くもの」扱いでいいんじゃないなんかめんどくさい
// 画像と移動モジュールを分けるとか？
// そりゃそうでしょ・・クラス？んーーーーーーーーーー
// まず、どう動くか。そこから始まったのです。
// で、攻撃パターンはそれとは別に用意するわけ。当たり前だけど。
// 画像の変化とか。そういうのは分けるのかなぁ・・あと当たり判定。
// ショットについては動きと・・全部か。で、それは事前に用意しておくのか、用意するよね普通。んー・・
// テンプレートを作るのか
// 細かいあれやこれを作って組み合わせて無限のバリエーション
// ひとつひとつは出来るだけシンプルに
// そういうのを目指したいけどやり方が分からなくてすごい困ってる感じ
// とりあえず直線移動からかな・・・
// 位置ベース移動するのが本体でショットはすべて速度ベース・・
// でも速度ベースで動く敵が速度ベースで動く弾丸みたいなのを出してもいいよね
// んー。画面外に消える。
// 下から中央に向かってslowOutで到達した後
// 20個ずつ5つの方向に向かってslowOutでとんでいって
// そこから螺旋を描くようにディレイで20発ずつぐるぐるーって飛んでいく感じのを
// 作ってみたいです（？？）
// 関数が2つあれば作れる？

// 速度上、時間、速度いろんな方向、時間、弾ごとにウェイト命令、そのまま直線
// ここは加速しないでゆっくり発射
// で、どう？（何が？？）
// 明日やること・・郵便局行って振り込み、セノバ行ってまほよめ、帰りにアイス買う。
// 9月30日歯医者。だから？
// ポイントごとに位置指定するとか？

// 命令に2つの種類を持たせるとか
// activeでも特定の条件を満たすまで動かないようにする・・spanを1にして0が1になったら次！みたいなの。
// それとは別に、位置を決めるだけとか、自分を排除するみたいなのはわざわざクラスを作らなくてもいいのでそこら辺。
// あと、まあいいや。
// 自分を排除は、spanが-1のときだけ、自分をカット、画面外処理とかで使う。
// いくつか分身を生み出してから自分を排除、こういうのは
// 色、サイズ、行動データ。それを指定する。
// 色とサイズは自分のコピーなら行動データだけで行けるけど色は別の方がいいよね多分。
// {colorData:[1,1,1,1], size:[2,3], actData:{てきとうに}}
// それを使ってジェネレータが作ってそれからconvertして・・
// 順序としては
// 弾丸の処理が終わる→ジェネレータにコンバート→それを受けてマスターが分身を作成→弾丸がkillにコンバート→それを受けてマスターが排除処理
// って感じ。
// いくつかパターンをあらかじめ用意しておいてそれらを切り貼りすればいいのか。だよね。
// もうちょっと考えよう・・

// 命令をspan0の実行して終わりのやつ（付加的命令）と継続的に実行するやつ（クラス命令）に分ける
// killは付加的命令で最後に・・んー。それ以外でも・・
// span0のは位置を固定するとか
// 要らない気がしてきた？？
// ジェネレートは行動タイプを見て"generate"なら作る、"kill"なら排除するみたいなそういう。
// 文字列データで行動タイプをetc
// span=0の命令要らない気がしてきた。使い道が無さそう。
