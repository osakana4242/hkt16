/// <reference path="../node_modules/phina.js.d.ts/globalized/index.d.ts" />
/// <reference path="./math.ts" />

phina.globalize();

var ASSETS = {
	image: {
		"obj": "./img/obj.png",
	},
	spritesheet: {
		"obj": "./img/obj.ss.json",
	},
};


class DF {
	static SC_W = 320;
	static SC_H = 240;
}

class Rotation {
	static RIGHT = 0;
	static DOWN = 90;
	static LEFT = 180;
	static UP = 270;
}

class Vector2Helper {
	static isZero(v: Vector2) {
		return v.x === 0 && v.y === 0;
	}
	static copyFrom(a: Vector2, b: Vector2) {
		a.x = b.x;
		a.y = b.y;
	}

	static add(a: Vector2, b: Vector2) {
		return Vector2(a.x + b.x, a.y + b.y);
	}
}

const StateId = {
	S1I: 10,
	S1: 11,
	S2: 20,
	S3I: 30,
	S3: 40,
	EXIT: 100,
}

interface EnterFrameEvent {
	app: phina.game.GameApp;
	target: DisplayScene;
}

class GameObjectType {
	static UNDEF = 0;
	static PLAYER = 1;
	static PLAYER_BULLET = 2;
	static ENEMY = 3;
	static EFFECT = 4;
	static STONE = 5;
}

class Player {
	freezeTime = 0;
	freezeDuration = 300;
}

class GameObject {
	name = '';
	type = GameObjectType.UNDEF;
	hasDelete = false;
	instanceId = 0;
	tr: Transform = new Transform();
	sprite: Sprite | null = null;
	life: Life = new Life();
	bullet: Bullet | null = null;
	effect: Effect | null = null;
	player: Player | null = null;
	enemy: Enemy | null = null;
	collider: Collider | null = null;
	anim: FrameAnimation | null = null;
	shaker: Shaker | null = null;
	static autoIncrement = 0;

	constructor() {
		GameObject.autoIncrement++;
		this.instanceId = GameObject.autoIncrement;
	}
}

class Life {
	hpMax = 1;
	hp = 1;
}

class Effect {
	duration = 1000;
	time = 0;
}

class Collider {
	sprite: Shape;
	constructor() {
		var rect = new RectangleShape();
		rect.width = 32;
		rect.height = 64;
		rect.alpha = 0.0;
		rect.fill = '#ff0000';
		rect.stroke = '#000000'
		this.sprite = rect;
	}
}

class Bullet {
	hitIdArr: number[] = [];
}

class Enemy {
	stoneId = 0;
	firstSpeed = 25;
	speed = 25;
	loopCount = 0;
	scoreScale = 1;
}

class Shaker {
	duration = 200;
	time = 0;
	power = 8;
	offset = Vector2(0, 0);

	constructor() {
		this.time = this.duration;
	}
}

class ShakerHelper {
	static shake(shaker: Shaker) {
		shaker.time = 0;
	}

	static update(shaker: Shaker, app: GameApp) {
		shaker.time = Math.min(shaker.time + app.deltaTime, shaker.duration);
		const progress = MathHelper.progress01(shaker.time, shaker.duration);
		const rotation = Math.random() * 360;
		shaker.offset.fromDegree(rotation);
		const power = LerpHelper.linear(shaker.power, 0, progress);
		shaker.offset.x *= power;
		shaker.offset.y *= power;
	}
}

class Transform {
	rotation = 0;
	position = Vector2(0, 0);

	getSpriteScale(): Vector2 {
		var v = Vector2(0, 0);
		v.fromDegree(this.rotation);
		var sx = 1;
		var sy = 1;
		if (v.x < 0) {
			sx = -1;
		}
		v.x = sx;
		v.y = sy;
		return v;
	}
}

class AsciiSprite {
	character = ' ';
	position = 0;
	priority = 0;
}

type StateEvent = {
	app: GameApp,
	sm: StateMachine,
};
type StateFunc = (target: any, evt: StateEvent) => ((target: any, evt: StateEvent) => any) | null;

class StateMachine {
	time = 0;
	state: StateFunc = (_1, _2) => null;

	update(target: any, app: GameApp) {
		var nextState = this.state(target, { app: app, sm: this });
		if (nextState && this.state !== nextState) {
			this.state = nextState;
			this.time = 0;
		} else {
			this.time += app.deltaTime;
		}
	}
}

interface EnemyData {
	speed: number;
	scoreScale: number;
	hp: number;
}

class HogeScene {
	scene: phina.display.DisplayScene;
	lines: string[][] = [[], [], []];
	mainLabel: Label;
	centerTelop: Label;
	player: GameObject;
	goArr: GameObject[] = [];
	stageLeft = 0;
	enemyRect = new Rect(-64, -64, DF.SC_W + 160, DF.SC_H + 128);
	screenRect = new Rect(0, 0, DF.SC_W, DF.SC_H);
	stageRight = 32;
	isStarted = false;
	isEnd = false;
	sm = new StateMachine();


	enemyDataDict: { [index: string]: EnemyData } = {
		'enm_1': {
			speed: 25,
			scoreScale: 1,
			hp: 4
		},
		'enm_2': {
			speed: 15,
			scoreScale: 5,
			hp: 2
		},
	};

	waveDataDict: { [index: string]: { time: number, character: string }[] } = {
		'wave_1': [
			{ time: 1000, character: 'enm_1', },
			{ time: 2000, character: 'enm_1', },
		],
		'wave_2': [
			{ time: 1000, character: 'enm_2', },
			{ time: 3000, character: 'enm_1', },
			{ time: 4000, character: 'enm_1', },
		],
		'wave_3': [
			{ time: 1000, character: 'enm_1', },
			{ time: 2000, character: 'enm_1', },
			{ time: 3000, character: 'enm_2', },
			{ time: 4000, character: 'enm_2', },
			{ time: 5000, character: 'enm_2', },
			{ time: 6000, character: 'enm_1', },
		],
	};

	questData = {
		waveArr: [
			'wave_1',
			'wave_2',
			'wave_3',
		],
	};

	playerBulletSpeed = 8;

	questWaveIndex = 0;
	questWaveEnemyIndex = 0;
	questLoopCount = 0;
	questWaveTime = 0;
	questTime = 0;
	score = 0;
	questTimeDuration = 120 * 1000;
	hasPause = false;

	constructor(pScene: phina.display.DisplayScene) {
		this.scene = pScene;
		pScene.backgroundColor = '#dddd44';
		this.player = this.createPlayer();

		{
			var label = Label({
				text: 'hoge',
				fill: '#ffffff',
				fontSize: 16,
				fontFamily: 'monospaced',
				align: 'left',
			});
			label.x = 8;
			label.y = 40;
			label.addChildTo(pScene);
			this.mainLabel = label;
		}
		{
			var label = new Label({
				text: '',
				fill: '#ffffff',
				fontSize: 40,
				fontFamily: 'monospaced',
				align: 'center',
			});
			label.x = this.screenRect.centerX;
			label.y = this.screenRect.centerY;
			label.addChildTo(pScene);
			this.centerTelop = label;
		}
		this.sm.state = this.stateHoge;

		pScene.addEventListener('focus', (evt: EnterFrameEvent) => {
			this.hasPause = false;
		});

		pScene.addEventListener('blur', (evt: EnterFrameEvent) => {
			this.hasPause = true;
		});

		pScene.addEventListener('enterframe', (evt: EnterFrameEvent) => {
			if (this.hasPause) return;
			this.enterframe(evt);
		});
	}

	stateHoge(self: HogeScene, evt: StateEvent) {
		if (1000 <= evt.sm.time) {
			return self.state2;
		}
		return null;
	}

	state2(self: HogeScene, evt: StateEvent) {
		if (evt.sm.time === 0) {
			self.isStarted = true;
		}
		const isTimeover = self.questTimeDuration <= self.questTime;
		if (isTimeover) {
			self.isEnd = true;
			return self.stateGameOver;
		}

		// リセット.
		if (evt.app.keyboard.getKeyDown('r')) {
			return self.stateExit;
		}
		// タイムオーバー.
		if (evt.app.keyboard.getKeyDown('t')) {
			self.questTime = self.questTimeDuration - 2000;
		}

		return null;
	}

	stateGameOver(self: HogeScene, evt: StateEvent) {
		if (evt.sm.time === 0) {
			self.centerTelop.text = 'TIME OVER';
		}
		if (2000 <= evt.sm.time) {
			return self.stateGameOver2;
		}
		return null;
	}

	stateGameOver2(self: HogeScene, evt: StateEvent) {
		if (evt.sm.time === 0) {
			self.centerTelop.text = `TIME OVER\nSCORE ${self.score}`;
		}
		if (3000 <= evt.sm.time) {
			if (evt.app.keyboard.getKeyDown('z')) {
				return self.stateExit;
			}
		}
		return null;
	}

	stateExit(self: HogeScene, evt: StateEvent) {
		if (evt.sm.time === 0) {
			self.scene.exit();
		}
		return null;
	}

	createSlash(position: Vector2) {
		const go = new GameObject();
		go.name = `bullet ${go.instanceId}`;
		go.type = GameObjectType.PLAYER_BULLET;
		go.tr.position.x = position.x;
		go.tr.position.y = position.y;

		go.collider = new Collider();
		go.collider.sprite.width = 16;
		go.collider.sprite.height = 48;
		go.collider.sprite.addChildTo(this.scene);

		go.effect = new Effect();
		go.effect.duration = 250;

		go.bullet = new Bullet();

		this.goArr.push(go);
		return go;
	}

	createPlayer() {
		const go = new GameObject();
		go.name = 'player';
		go.type = GameObjectType.PLAYER;
		go.tr.position.x = this.screenRect.centerX;
		go.tr.position.y = this.screenRect.centerY;

		go.player = new Player();

		const sprite = Sprite('obj', 96, 96);
		const anim = FrameAnimation("obj");
		anim.attachTo(sprite);
		anim.gotoAndPlay('chara_stand');
		sprite.addChildTo(this.scene);
		go.anim = anim;
		go.sprite = sprite;

		this.goArr.push(go);
		return go;
	}

	createStone(quest: HogeScene, app: GameApp) {
		const go = new GameObject();
		go.name = 'stone';
		go.type = GameObjectType.STONE;
		const sprite = Sprite('obj', 96, 96);
		const fa = FrameAnimation("obj");
		fa.attachTo(sprite);
		fa.gotoAndPlay('stone');
		sprite.addChildTo(this.scene);
		go.sprite = sprite;
		this.goArr.push(go);
		return go;
	}

	createEnemy(quest: HogeScene, app: GameApp, enemyId: string) {
		const stone = this.createStone(this, app);
		const enemyData = quest.enemyDataDict[enemyId];
		const go = new GameObject();
		go.name = `enemy${go.instanceId}`;
		go.type = GameObjectType.ENEMY;
		go.enemy = new Enemy();
		go.enemy.stoneId = stone.instanceId;
		go.enemy.scoreScale = enemyData.scoreScale;
		go.enemy.firstSpeed = enemyData.speed;
		const sprite = Sprite('obj', 96, 96);
		const fa = FrameAnimation("obj");
		fa.attachTo(sprite);
		fa.gotoAndPlay('chara_push');
		sprite.addChildTo(this.scene);
		go.sprite = sprite;

		go.life = new Life();
		go.life.hpMax = enemyData.hp;
		go.life.hp = go.life.hpMax;


		go.collider = new Collider();
		go.collider.sprite.height = 56;
		go.collider.sprite.addChildTo(this.scene);
		go.collider.sprite.setPosition(120, 120);

		go.shaker = new Shaker();
		this.resetEnemy(go);

		var scale = (1 + quest.questLoopCount * 0.5);
		this.goArr.push(go);
		return go;
	}

	resetEnemy(go: GameObject) {
		if (!go.enemy) return;
		if (!go.life) return;
		go.tr.position.x = this.enemyRect.right;
		go.tr.position.y = this.enemyRect.centerY - 100 + Math.random() * 200;
		go.enemy.speed = go.enemy.firstSpeed;
		go.life.hp = go.life.hpMax;
	}

	updateQuest(myScene: HogeScene, app: GameApp) {
		if (!myScene.isStarted) return;
		const goArr = myScene.goArr;
		{
			const quest = myScene;
			const waveId = quest.questData.waveArr[quest.questWaveIndex];
			const enemyArr = quest.waveDataDict[waveId];
			if (quest.questWaveEnemyIndex < enemyArr.length) {
				const putData = enemyArr[quest.questWaveEnemyIndex];
				if (quest.questWaveTime < putData.time) {
					// skip.
				} else {
					myScene.createEnemy(quest, app, putData.character);
					quest.questWaveEnemyIndex += 1;
				}
			} else {
				const hasAliveEnemy = 0 <= goArr.findIndex((go) => {
					return go.enemy !== null && go.enemy.loopCount <= 0;
				});
				if (hasAliveEnemy) {
					// 残りの敵がいる.
				} else {
					// 敵がゼロなので、次に進む.
					quest.questWaveIndex += 1;
					quest.questWaveEnemyIndex = 0;
					quest.questWaveTime = 0;
					if (quest.questData.waveArr.length <= quest.questWaveIndex) {
						quest.questLoopCount += 1;
						quest.questWaveIndex = 0;
					}
				}
			}

			quest.questWaveTime += app.ticker.deltaTime;
			quest.questTime += app.ticker.deltaTime;
		}
	}

	static isHit(a: GameObject, b: GameObject) {
		const aCollider = a.collider;
		if (!aCollider) return false;
		const bCollider = b.collider;
		if (!bCollider) return false;
		return aCollider.sprite.hitTestElement(new Rect(
			bCollider.sprite.left,
			bCollider.sprite.top,
			bCollider.sprite.width,
			bCollider.sprite.height
		));
	}

	static hit(own: GameObject, other: GameObject) {
		if (own.bullet) {
			this.hitBullet(own, other);
		}
		if (other.bullet) {
			this.hitBullet(other, own);
		}
	}

	static hit2(own: GameObject, other: GameObject) {
		own.life.hp -= 1;
		if (own.life.hp < 0) {
			own.life.hp = 0;
		}
		if (own.enemy) {
			own.enemy.speed += 10;

		}
		if (own.shaker) {
			ShakerHelper.shake(own.shaker);
		}
	}

	static hitBullet(bullet: GameObject, other: GameObject) {
		if (!bullet.bullet) return;
		if (0 <= bullet.bullet.hitIdArr.indexOf(other.instanceId)) return;
		bullet.bullet.hitIdArr.push(other.instanceId);
		this.hit2(other, bullet);
		this.hit2(bullet, other);
	}

	updateHit(goArr: GameObject[], aFilter: (go: GameObject) => boolean, bFilter: (go: GameObject) => boolean) {
		for (var i = 0; i < goArr.length; i++) {
			const aGO = goArr[i];
			if (!aFilter(aGO)) continue;
			for (var j = 0; j < goArr.length; j++) {
				const bGO = goArr[j];
				if (!bFilter(bGO)) continue;
				if (!HogeScene.isHit(aGO, bGO)) continue;
				HogeScene.hit(aGO, bGO);
				HogeScene.hit(bGO, aGO);
			}
		}
	}

	updatePlayer(app: GameApp) {
		const scene = this;
		const playerIndex = scene.goArr.findIndex(go => go.type === GameObjectType.PLAYER);
		const player = scene.goArr[playerIndex];
		if (!player) return;
		if (!player.player) return;
		if (!player.anim) return;

		const dir = app.keyboard.getKeyDirection();

		var hasSlash = app.keyboard.getKeyDown('z');

		var hasFreeze = 0 < player.player.freezeTime;
		if (hasFreeze) {
			player.player.freezeTime -= app.ticker.deltaTime;
		}

		if (!Vector2Helper.isZero(dir)) {
			if (hasFreeze) {
			} else {
				const speed = 100 * app.deltaTime / 1000;
				var nextX = player.tr.position.x + dir.x * speed;
				var nextY = player.tr.position.y + dir.y * speed;
				nextX = MathHelper.clamp(nextX, scene.screenRect.left, scene.screenRect.right);
				nextY = MathHelper.clamp(nextY, scene.screenRect.top, scene.screenRect.bottom);
				player.tr.position.x = nextX;
				player.tr.position.y = nextY;


				if (dir.x !== 0) {
					player.tr.rotation = dir.toDegree();
				}
			}
		}

		if (hasSlash) {
			if (scene.isEnd) {

			} else if (hasFreeze) {

			} else {
				// 硬直してなければ斬撃.
				var slashPos = player.tr.position.clone();
				slashPos.x += player.tr.getSpriteScale().x * 32;
				scene.createSlash(slashPos);
				player.player.freezeTime = player.player.freezeDuration;
				player.anim.gotoAndPlay('chara_attack', false);
			}
		}
	}

	updateEnemy(myScene: HogeScene, app: GameApp) {
		const goArr = myScene.goArr;
		// Enemy.
		goArr.forEach(go => {
			const enemy = go.enemy;
			if (!enemy) return;
			if (!go.life) return;

			if (go.life.hp <= 0) {
				go.tr.rotation = Rotation.RIGHT;
				var dir = Vector2(1, 0);
				var speed = 200 * app.deltaTime / 1000;
				go.tr.position.x += dir.x * speed;
				go.tr.position.y += dir.y * speed;
				if (myScene.enemyRect.right < go.tr.position.x) {
					go.hasDelete = true;
				}
				return;
			}

			if (go.tr.position.x < myScene.enemyRect.left) {
				if (myScene.isEnd) {
					return;
				}
				const scoreScale = (1 + go.life.hpMax - go.life.hp) * enemy.scoreScale;
				myScene.score += 100 * scoreScale;
				enemy.loopCount += 1;
				this.resetEnemy(go);
				return;
			}

			var dir = Vector2(-1, 0);
			var speed = enemy.speed * app.deltaTime / 1000;
			go.tr.position.x += dir.x * speed;
			go.tr.position.y += dir.y * speed;
			go.tr.rotation = Rotation.LEFT;

			const stone = goArr.find(go => {
				return go.instanceId === enemy.stoneId;
			});
			if (!stone) return;
			stone.tr.position.x = go.tr.position.x - 48;
			stone.tr.position.y = go.tr.position.y - 8;

		});
	}

	updateShaker(myScene: HogeScene, app: GameApp) {
		const goArr = myScene.goArr;
		goArr.forEach(go => {
			const shaker = go.shaker;
			if (!shaker) return;
			ShakerHelper.update(shaker, app);
		});
	}

	enterframe(evt: EnterFrameEvent) {
		const app = evt.app;
		const myScene = this;

		myScene.sm.update(myScene, app);

		myScene.updatePlayer(app);

		myScene.updateQuest(myScene, app);
		const goArr = myScene.goArr;

		myScene.updateEnemy(myScene, app);
		myScene.updateShaker(myScene, app);
		// // Bullet.
		// goArr.forEach(go => {
		// 	const bullet = go.bullet;
		// 	if (!bullet) return;
		// 	const vec = bullet.vec;
		// 	go.sprite.position += vec * app.ticker.deltaTime / 1000;
		// 	if (!MathHelper.isInRange(go.sprite.position, myScene.stageLeft, myScene.stageRight)) {
		// 		go.hasDelete = true;
		// 	}
		// });

		// // Life.
		// goArr.forEach(go => {
		// 	const life = go.life;
		// 	if (!life) return;
		// 	if (0 < life.hp) return;
		// 	go.hasDelete = true;
		// });

		// Effect.
		goArr.forEach(go => {
			const effect = go.effect;
			if (!effect) return;
			effect.time += app.ticker.deltaTime;
			if (effect.time < effect.duration) return;
			go.hasDelete = true;
		});


		// collider 位置更新.
		myScene.goArr.forEach((go) => {
			const collider = go.collider;
			if (!collider) return;
			const sprite = collider.sprite;
			if (!sprite) return;
			sprite.x = go.tr.position.x;
			sprite.y = go.tr.position.y;
		});

		// 衝突判定.
		//myScene.updateHit(goArr, go => go.type === GameObjectType.PLAYER, go => go.type === GameObjectType.ENEMY);
		myScene.updateHit(goArr, go => go.type === GameObjectType.PLAYER_BULLET, go => go.type === GameObjectType.ENEMY);

		// 掃除.
		for (var i = goArr.length - 1; 0 <= i; i--) {
			const go = goArr[i];
			if (!go.hasDelete) continue;
			myScene.destroyGameObject(go);
			goArr.splice(i, 1);
		}

		// 描画.
		{
			myScene.goArr.forEach((go) => {
				const sprite = go.sprite;
				if (sprite === null) return;
				const sc = go.tr.getSpriteScale();
				sprite.scaleX = sc.x;
				sprite.scaleY = sc.y;
				sprite.x = go.tr.position.x;
				sprite.y = go.tr.position.y;
				if (go.shaker) {
					sprite.x += go.shaker.offset.x;
					sprite.y += go.shaker.offset.y;
				}
			});
		}


		var sprites: Sprite[] = [];
		myScene.goArr.forEach((go) => {
			if (!go.sprite) return;
			sprites.push(go.sprite);
		});

		myScene.scene.children.sort((a, b) => {
			if (!(a instanceof DisplayElement)) return 0;
			if (!(b instanceof DisplayElement)) return 0;

			var aPriority = a.y;
			var bPriority = b.y;

			if (a instanceof Label) {
				aPriority = 1000;
			}
			if (b instanceof Label) {
				bPriority = 1000;
			}

			var cmp = aPriority - bPriority;
			return cmp;
		});

		var restTime = Math.max(0, myScene.questTimeDuration - myScene.questTime);
		restTime = Math.ceil(restTime / 1000);
		var text = '';
		text += 'SCORE: ' + myScene.score;
		text += ' TIME: ' + restTime;
//		text += '\nDEBUG LOOP: ' + myScene.questLoopCount + ` GO: ${goArr.length}`;
		myScene.mainLabel.text = text;

	}

	destroyGameObject(go: GameObject) {
		if (go.sprite) {
			go.sprite.remove();
		}
		if (go.collider) {
			go.collider.sprite.remove();
		}
	}
}

phina.define('MainScene', {
	superClass: 'DisplayScene',
	init: function (options: any) {
		this.superInit(options);
		this.myScene = new HogeScene(this as any);
		console.log('fuga');
	},

	update: function () {
		var scene = this.myScene as HogeScene;
	}
});

// メイン処理
phina.main(function () {
	// アプリケーション生成
	let app = GameApp({
		startLabel: 'main', // メインシーンから開始する
		fps: 60,
		width: DF.SC_W,
		height: DF.SC_H,
		assets: ASSETS,
		scenes: [
			{
				className: 'MainScene',
				label: 'main',
				nextLabel: 'main',
			},
		],
	});

	// アプリケーション実行
	app.run();
});
