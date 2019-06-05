"use strict";
/// <reference path="../node_modules/phina.js.d.ts/globalized/index.d.ts" />
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
}
DF.SC_W = 320;
DF.SC_H = 240;
class Rotation {
}
Rotation.RIGHT = 0;
Rotation.DOWN = 90;
Rotation.LEFT = 180;
Rotation.UP = 270;
class LerpHelper {
    static linear(a, b, t) {
        return a + (b - a) * t;
    }
}
class MathHelper {
    static max(a, b) {
        return a < b ? b : a;
    }
    static min(a, b) {
        return a < b ? a : b;
    }
    static wrap(v, min, max) {
        const length = max - min;
        const v2 = v - min;
        if (0 <= v2) {
            return min + (Math.floor(v2) % Math.floor(length));
        }
        return min + (length + (v2 % length)) % length;
    }
    static clamp(v, min, max) {
        if (v < min)
            return min;
        if (max < v)
            return max;
        return v;
    }
    static clamp01(v) {
        return MathHelper.clamp(v, 0.0, 1.0);
    }
    static tForLerp(a, b) {
        if (b <= 0)
            return 1;
        return a / b;
    }
    static tForLerpClapmed(a, b) {
        if (b <= 0)
            return 1;
        return MathHelper.clamp01(a / b);
    }
    static isLerpEnd(t) {
        return 1 <= t;
    }
    /** [ min, max ) */
    static isInRange(v, min, max) {
        return min <= v && v < max;
    }
    static progress01(t, length) {
        if (length <= 0)
            return 1.0;
        return MathHelper.clamp01(t / length);
    }
}
function assertEq(a, b) {
    if (a === b)
        return;
    throw "assert " + a + " vs " + b;
}
assertEq(0, MathHelper.wrap(3, 0, 3));
assertEq(2, MathHelper.wrap(2, 0, 3));
assertEq(1, MathHelper.wrap(1, 0, 3));
assertEq(2, MathHelper.wrap(-1, 0, 3));
assertEq(1, MathHelper.wrap(-2, 0, 3));
assertEq(0, MathHelper.wrap(-3, 0, 3));
assertEq(2, MathHelper.wrap(-4, 0, 3));
assertEq(1, MathHelper.wrap(-5, 0, 3));
assertEq(0, MathHelper.clamp(-1, 0, 10));
assertEq(10, MathHelper.clamp(11, 0, 10));
assertEq(1, MathHelper.progress01(2, 0));
assertEq(1, MathHelper.progress01(2, -10));
assertEq(0, MathHelper.progress01(0, 10));
assertEq(0.5, MathHelper.progress01(5, 10));
assertEq(1, MathHelper.progress01(10, 10));
assertEq(1, MathHelper.progress01(11, 10));
class Vector2Helper {
    static isZero(v) {
        return v.x === 0 && v.y === 0;
    }
    static copyFrom(a, b) {
        a.x = b.x;
        a.y = b.y;
    }
}
const StateId = {
    S1I: 10,
    S1: 11,
    S2: 20,
    S3I: 30,
    S3: 40,
    EXIT: 100,
};
class GameObjectType {
}
GameObjectType.UNDEF = 0;
GameObjectType.PLAYER = 1;
GameObjectType.PLAYER_BULLET = 2;
GameObjectType.ENEMY = 3;
GameObjectType.EFFECT = 4;
GameObjectType.STONE = 5;
class GameObject {
    constructor() {
        this.name = '';
        this.type = GameObjectType.UNDEF;
        this.hasDelete = false;
        this.instanceId = 0;
        this.tr = new Transform();
        this.sprite = null;
        this.life = new Life();
        this.bullet = null;
        this.effect = null;
        this.enemy = null;
        this.collider = null;
        GameObject.autoIncrement++;
        this.instanceId = GameObject.autoIncrement;
    }
}
GameObject.autoIncrement = 0;
class Life {
    constructor() {
        this.hpMax = 1;
        this.hp = 1;
    }
}
class Effect {
    constructor() {
        this.duration = 1000;
        this.time = 0;
    }
}
class Collider {
    constructor() {
        var rect = new RectangleShape();
        rect.width = 32;
        rect.height = 32;
        rect.alpha = 0.5;
        rect.fill = '#ff0000';
        rect.stroke = '#000000';
        this.sprite = rect;
    }
}
class Bullet {
}
class Enemy {
    constructor() {
        this.stoneId = 0;
    }
}
class Transform {
    constructor() {
        this.rotation = 0;
        this.position = new Vector2(0, 0);
    }
    getSpriteScale() {
        var v = new Vector2(0, 0);
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
    constructor() {
        this.character = ' ';
        this.position = 0;
        this.priority = 0;
    }
}
class StateMachine {
    constructor() {
        this.time = 0;
        this.state = (_1, _2) => null;
    }
    update(target, app) {
        var nextState = this.state(target, { app: app, sm: this });
        if (nextState && this.state !== nextState) {
            this.state = nextState;
            this.time = 0;
        }
        else {
            this.time += app.deltaTime;
        }
    }
}
class HogeScene {
    constructor(pScene) {
        this.lines = [[], [], []];
        this.goArr = [];
        this.stageLeft = 0;
        this.enemyRect = new Rect(-16, -16, DF.SC_W + 32, DF.SC_H + 32);
        this.stageRight = 32;
        this.isStarted = false;
        this.isEnd = false;
        this.sm = new StateMachine();
        this.enemyDataDict = {
            'enm_1': {
                character: '-',
                speed: 8,
            },
            'enm_2': {
                character: '_',
                speed: 6,
            },
            'enm_3': {
                character: '^',
                speed: 10,
            },
            'enm_4': {
                character: '~',
                speed: 4,
            },
        };
        this.waveDataDict = {
            'wave_1': [
                { time: 1000, character: 'enm_1', },
                { time: 2000, character: 'enm_2', },
                { time: 3000, character: 'enm_3', },
            ],
            'wave_2': [
                { time: 1000, character: 'enm_1', },
                { time: 1500, character: 'enm_2', },
                { time: 2000, character: 'enm_3', },
                { time: 2500, character: 'enm_4', },
            ],
        };
        this.questData = {
            waveArr: [
                'wave_1',
                'wave_2',
            ],
        };
        this.playerBulletSpeed = 8;
        this.questWaveIndex = 0;
        this.questWaveEnemyIndex = 0;
        this.questLoopCount = 0;
        this.questTime = 0;
        this.score = 0;
        this.questTimeDuration = 60 * 1000;
        this.scene = pScene;
        pScene.backgroundColor = '#ff00ff';
        this.player = this.createPlayer();
        {
            var label = new phina.display.Label({
                text: 'hoge',
                fill: '#ffffff',
                fontSize: '16',
                fontFamily: 'monospaced',
                align: 'left',
            });
            label.x = 8;
            label.y = 24;
            label.addChildTo(pScene);
            this.mainLabel = label;
        }
        this.sm.state = this.stateHoge;
        pScene.addEventListener('enterframe', (evt) => {
            this.enterframe(evt);
        });
    }
    stateHoge(self, evt) {
        if (1000 <= evt.sm.time) {
            return self.state2;
        }
        return null;
    }
    state2(self, evt) {
        if (evt.sm.time === 0) {
            self.isStarted = true;
        }
        var playerIndex = self.goArr.findIndex(go => go.type === GameObjectType.PLAYER);
        if (playerIndex === -1) {
            self.isEnd = true;
            return self.stateGameOver;
        }
        // リセット.
        if (evt.app.keyboard.getKeyUp('r')) {
            return self.stateExit;
        }
        return null;
    }
    stateGameOver(self, evt) {
        if (evt.sm.time === 0) {
        }
        if (3000 <= evt.sm.time) {
            return self.stateExit;
        }
        return null;
    }
    stateExit(self, evt) {
        if (evt.sm.time === 0) {
            self.scene.exit();
        }
        return null;
    }
    createPlayer() {
        const go = new GameObject();
        go.name = 'player';
        go.type = GameObjectType.PLAYER;
        go.tr.position.x = this.enemyRect.centerX;
        go.tr.position.y = this.enemyRect.centerY;
        const sprite = Sprite('obj', 96, 96);
        const fa = FrameAnimation("obj");
        fa.attachTo(sprite);
        fa.gotoAndPlay('chara_stand');
        sprite.addChildTo(this.scene);
        go.sprite = sprite;
        this.goArr.push(go);
        return go;
    }
    createStone(quest, app) {
        const go = new GameObject();
        go.name = 'stone';
        go.type = GameObjectType.STONE;
        go.enemy = new Enemy();
        const sprite = Sprite('obj', 96, 96);
        const fa = FrameAnimation("obj");
        fa.attachTo(sprite);
        fa.gotoAndPlay('stone');
        sprite.addChildTo(this.scene);
        go.sprite = sprite;
        this.goArr.push(go);
        return go;
    }
    createEnemy(quest, app, enemyId) {
        const stone = this.createStone(this, app);
        const enemyData = quest.enemyDataDict[enemyId];
        const go = new GameObject();
        go.name = 'enemy';
        go.type = GameObjectType.ENEMY;
        go.enemy = new Enemy();
        go.enemy.stoneId = stone.instanceId;
        const sprite = Sprite('obj', 96, 96);
        const fa = FrameAnimation("obj");
        fa.attachTo(sprite);
        fa.gotoAndPlay('chara_push');
        sprite.addChildTo(this.scene);
        go.sprite = sprite;
        go.collider = new Collider();
        go.collider.sprite.addChildTo(this.scene);
        go.collider.sprite.setPosition(120, 120);
        go.tr.position.x = this.enemyRect.right;
        go.tr.position.y = this.enemyRect.centerY - 100 + Math.random() * 200;
        go.bullet = new Bullet();
        var scale = (1 + quest.questLoopCount * 0.5);
        this.goArr.push(go);
        return go;
    }
    updateQuest(myScene, app) {
        if (!myScene.isStarted)
            return;
        const goArr = myScene.goArr;
        {
            const quest = myScene;
            const waveId = quest.questData.waveArr[quest.questWaveIndex];
            const enemyArr = quest.waveDataDict[waveId];
            if (quest.questWaveEnemyIndex < enemyArr.length) {
                const putData = enemyArr[quest.questWaveEnemyIndex];
                if (quest.questTime < putData.time) {
                    // skip.
                }
                else {
                    myScene.createEnemy(quest, app, putData.character);
                    quest.questWaveEnemyIndex += 1;
                }
            }
            else {
                const hasAliveEnemy = 0 <= goArr.findIndex(go => {
                    return go.type === GameObjectType.ENEMY;
                });
                if (hasAliveEnemy) {
                    // 残りの敵がいる.
                }
                else {
                    // 敵がゼロなので、次に進む.
                    quest.questWaveIndex += 1;
                    quest.questWaveEnemyIndex = 0;
                    if (quest.questData.waveArr.length <= quest.questWaveIndex) {
                        quest.questLoopCount += 1;
                        quest.questWaveIndex = 0;
                    }
                }
            }
            quest.questTime += app.ticker.deltaTime;
        }
    }
    static isHit(a, b) {
        const apos = a.sprite.position;
        const bpos = b.sprite.position;
        const distance = apos < bpos ?
            bpos - apos :
            apos - bpos;
        if (1 < distance)
            return false;
        var aFlag = HogeScene.characterCollisionDict[a.sprite.character];
        if (!aFlag) {
            aFlag = (1 << 0) | (1 << 1) | (2 << 1);
        }
        var bFlag = HogeScene.characterCollisionDict[b.sprite.character];
        if (!bFlag) {
            bFlag = (1 << 0) | (1 << 1) | (2 << 1);
        }
        return (aFlag & bFlag) !== 0;
    }
    static hit(own, other) {
        own.life.hp -= 1;
        if (own.life.hp < 0) {
            own.life.hp = 0;
        }
    }
    updateHit(goArr, aFilter, bFilter) {
        for (var i = 0; i < goArr.length; i++) {
            const aGO = goArr[i];
            if (!aFilter(aGO))
                continue;
            for (var j = 0; j < goArr.length; j++) {
                const bGO = goArr[j];
                if (!bFilter(bGO))
                    continue;
                if (!HogeScene.isHit(aGO, bGO))
                    continue;
                HogeScene.hit(aGO, bGO);
                HogeScene.hit(bGO, aGO);
            }
        }
    }
    updatePlayer(app) {
        const playerIndex = this.goArr.findIndex(go => go.type === GameObjectType.PLAYER);
        const player = this.goArr[playerIndex];
        if (!player)
            return;
        // var vec = new Vector2(0, 0);
        // if (app.keyboard.getKey('left')) {
        // 	vec.x = -1;
        // } else if (app.keyboard.getKey('right')) {
        // 	vec.x = 1;
        // }
        // if (app.keyboard.getKey('up')) {
        // 	vec.y = -1;
        // } else if (app.keyboard.getKey('down')) {
        // 	vec.y = 1;
        // }
        const dir = app.keyboard.getKeyDirection();
        const speed = 100 * app.deltaTime / 1000;
        player.tr.position.x += dir.x * speed;
        player.tr.position.y += dir.y * speed;
        if (dir.x !== 0) {
            player.tr.rotation = dir.toDegree();
        }
    }
    enterframe(evt) {
        const app = evt.app;
        const myScene = this;
        myScene.sm.update(myScene, app);
        myScene.updatePlayer(app);
        myScene.updateQuest(myScene, app);
        const goArr = myScene.goArr;
        // Enemy.
        goArr.forEach(go => {
            const enemy = go.enemy;
            if (!enemy)
                return;
            if (go.tr.position.x < myScene.enemyRect.left) {
                go.tr.position.x = myScene.enemyRect.right;
                myScene.score += 1;
                return;
            }
            var dir = new Vector2(-1, 0);
            var speed = 25 * app.deltaTime / 1000;
            go.tr.position.x += dir.x * speed;
            go.tr.position.y += dir.y * speed;
            go.tr.rotation = Rotation.LEFT;
            const stone = goArr.find(go => {
                return go.instanceId === enemy.stoneId;
            });
            if (!stone)
                return;
            stone.tr.position.x = go.tr.position.x - 64;
            stone.tr.position.y = go.tr.position.y;
        });
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
        // 	{
        // 		const effect = new GameObject();
        // 		effect.name = 'effect';
        // 		effect.type = GameObjectType.EFFECT;
        // 		effect.sprite.character = '*';
        // 		effect.sprite.priority = 3;
        // 		effect.sprite.position = go.sprite.position;
        // 		effect.effect = new Effect();
        // 		effect.effect.duration = 500;
        // 		this.goArr.push(effect);
        // 	}
        // 	go.hasDelete = true;
        // });
        // Effect.
        goArr.forEach(go => {
            const effect = go.effect;
            if (!effect)
                return;
            effect.time += app.ticker.deltaTime;
            if (effect.time < effect.duration)
                return;
            go.hasDelete = true;
        });
        // 衝突判定.
        myScene.updateHit(goArr, go => go.type === GameObjectType.PLAYER, go => go.type === GameObjectType.ENEMY);
        myScene.updateHit(goArr, go => go.type === GameObjectType.PLAYER_BULLET, go => go.type === GameObjectType.ENEMY);
        // 掃除.
        for (var i = goArr.length - 1; 0 <= i; i--) {
            const go = goArr[i];
            if (!go.hasDelete)
                continue;
            goArr.splice(i, 1);
        }
        // 描画.
        {
            myScene.goArr.forEach((go) => {
                const sprite = go.sprite;
                if (sprite === null)
                    return;
                const sc = go.tr.getSpriteScale();
                sprite.scaleX = sc.x;
                sprite.scaleY = sc.y;
                sprite.x = go.tr.position.x;
                sprite.y = go.tr.position.y;
            });
            myScene.goArr.forEach((go) => {
                const collider = go.collider;
                if (!collider)
                    return;
                const sprite = collider.sprite;
                if (!sprite)
                    return;
                sprite.x = go.tr.position.x;
                sprite.y = go.tr.position.y;
            });
        }
        var sprites = [];
        myScene.goArr.forEach((go) => {
            if (!go.sprite)
                return;
            sprites.push(go.sprite);
        });
        // sprites.sort((a, b) => {
        // 	var cmp = a.priority - b.priority;
        // 	return cmp;
        // });
        // for (let i = 0; i < myScene.lines.length; i++) {
        // 	var line = myScene.lines[i];
        // 	for (let j = 0; j < 32; j++) {
        // 		line[j] = ' ';
        // 	}
        // }
        // sprites.forEach((sprite) => {
        // 	myScene.lines[0][Math.floor(sprite.position)] = sprite.character;
        // });
        var restTime = myScene.questTimeDuration - myScene.questTime;
        var text = '';
        text += 'score: ' + myScene.score;
        text += ' time: ' + restTime;
        text += '\nloop: ' + myScene.questLoopCount;
        myScene.mainLabel.text = text;
    }
}
HogeScene.characterCollisionDict = {
    'p': (1 << 0) | (1 << 1) | (1 << 2),
    '-': (0 << 0) | (1 << 1) | (0 << 2),
    '~': (0 << 0) | (1 << 1) | (0 << 2),
    '_': (0 << 0) | (0 << 1) | (1 << 2),
    '^': (0 << 1) | (0 << 0) | (1 << 0),
};
phina.define('MainScene', {
    superClass: 'DisplayScene',
    init: function (options) {
        this.superInit(options);
        this.myScene = new HogeScene(this);
        console.log('fuga');
    },
    update: function () {
        var scene = this.myScene;
    }
});
// メイン処理
phina.main(function () {
    // アプリケーション生成
    let app = GameApp({
        startLabel: 'main',
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
