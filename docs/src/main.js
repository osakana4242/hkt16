"use strict";
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
}
DF.SC_W = 320;
DF.SC_H = 240;
class Rotation {
}
Rotation.RIGHT = 0;
Rotation.DOWN = 90;
Rotation.LEFT = 180;
Rotation.UP = 270;
class Vector2Helper {
    static isZero(v) {
        return v.x === 0 && v.y === 0;
    }
    static copyFrom(a, b) {
        a.x = b.x;
        a.y = b.y;
    }
    static add(a, b) {
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
};
class GameObjectType {
}
GameObjectType.UNDEF = 0;
GameObjectType.PLAYER = 1;
GameObjectType.PLAYER_BULLET = 2;
GameObjectType.ENEMY = 3;
GameObjectType.EFFECT = 4;
GameObjectType.STONE = 5;
class Player {
    constructor() {
        this.freezeTime = 0;
        this.freezeDuration = 300;
    }
}
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
        this.player = null;
        this.enemy = null;
        this.collider = null;
        this.anim = null;
        this.shaker = null;
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
        rect.height = 64;
        rect.alpha = 0.0;
        rect.fill = '#ff0000';
        rect.stroke = '#000000';
        this.sprite = rect;
    }
}
class Bullet {
    constructor() {
        this.hitIdArr = [];
    }
}
class Enemy {
    constructor() {
        this.stoneId = 0;
        this.firstSpeed = 25;
        this.speed = 25;
        this.loopCount = 0;
        this.scoreScale = 1;
    }
}
class Shaker {
    constructor() {
        this.duration = 200;
        this.time = 0;
        this.power = 8;
        this.offset = Vector2(0, 0);
        this.time = this.duration;
    }
}
class ShakerHelper {
    static shake(shaker) {
        shaker.time = 0;
    }
    static update(shaker, app) {
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
    constructor() {
        this.rotation = 0;
        this.position = Vector2(0, 0);
    }
    getSpriteScale() {
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
        this.enemyRect = new Rect(-64, -64, DF.SC_W + 160, DF.SC_H + 128);
        this.screenRect = new Rect(0, 0, DF.SC_W, DF.SC_H);
        this.stageRight = 32;
        this.isStarted = false;
        this.isEnd = false;
        this.sm = new StateMachine();
        this.enemyDataDict = {
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
        this.waveDataDict = {
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
        this.questData = {
            waveArr: [
                'wave_1',
                'wave_2',
                'wave_3',
            ],
        };
        this.playerBulletSpeed = 8;
        this.questWaveIndex = 0;
        this.questWaveEnemyIndex = 0;
        this.questLoopCount = 0;
        this.questWaveTime = 0;
        this.questTime = 0;
        this.score = 0;
        this.questTimeDuration = 120 * 1000;
        this.hasPause = false;
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
        pScene.addEventListener('focus', (evt) => {
            this.hasPause = false;
        });
        pScene.addEventListener('blur', (evt) => {
            this.hasPause = true;
        });
        pScene.addEventListener('enterframe', (evt) => {
            if (this.hasPause)
                return;
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
    stateGameOver(self, evt) {
        if (evt.sm.time === 0) {
            self.centerTelop.text = 'TIME OVER';
        }
        if (2000 <= evt.sm.time) {
            return self.stateGameOver2;
        }
        return null;
    }
    stateGameOver2(self, evt) {
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
    stateExit(self, evt) {
        if (evt.sm.time === 0) {
            self.scene.exit();
        }
        return null;
    }
    createSlash(position) {
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
    createStone(quest, app) {
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
    createEnemy(quest, app, enemyId) {
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
    resetEnemy(go) {
        if (!go.enemy)
            return;
        if (!go.life)
            return;
        go.tr.position.x = this.enemyRect.right;
        go.tr.position.y = this.enemyRect.centerY - 100 + Math.random() * 200;
        go.enemy.speed = go.enemy.firstSpeed;
        go.life.hp = go.life.hpMax;
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
                if (quest.questWaveTime < putData.time) {
                    // skip.
                }
                else {
                    myScene.createEnemy(quest, app, putData.character);
                    quest.questWaveEnemyIndex += 1;
                }
            }
            else {
                const hasAliveEnemy = 0 <= goArr.findIndex((go) => {
                    return go.enemy !== null && go.enemy.loopCount <= 0;
                });
                if (hasAliveEnemy) {
                    // 残りの敵がいる.
                }
                else {
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
    static isHit(a, b) {
        const aCollider = a.collider;
        if (!aCollider)
            return false;
        const bCollider = b.collider;
        if (!bCollider)
            return false;
        return aCollider.sprite.hitTestElement(new Rect(bCollider.sprite.left, bCollider.sprite.top, bCollider.sprite.width, bCollider.sprite.height));
    }
    static hit(own, other) {
        if (own.bullet) {
            this.hitBullet(own, other);
        }
        if (other.bullet) {
            this.hitBullet(other, own);
        }
    }
    static hit2(own, other) {
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
    static hitBullet(bullet, other) {
        if (!bullet.bullet)
            return;
        if (0 <= bullet.bullet.hitIdArr.indexOf(other.instanceId))
            return;
        bullet.bullet.hitIdArr.push(other.instanceId);
        this.hit2(other, bullet);
        this.hit2(bullet, other);
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
        const scene = this;
        const playerIndex = scene.goArr.findIndex(go => go.type === GameObjectType.PLAYER);
        const player = scene.goArr[playerIndex];
        if (!player)
            return;
        if (!player.player)
            return;
        if (!player.anim)
            return;
        const dir = app.keyboard.getKeyDirection();
        var hasSlash = app.keyboard.getKeyDown('z');
        var hasFreeze = 0 < player.player.freezeTime;
        if (hasFreeze) {
            player.player.freezeTime -= app.ticker.deltaTime;
        }
        if (!Vector2Helper.isZero(dir)) {
            if (hasFreeze) {
            }
            else {
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
            }
            else if (hasFreeze) {
            }
            else {
                // 硬直してなければ斬撃.
                var slashPos = player.tr.position.clone();
                slashPos.x += player.tr.getSpriteScale().x * 32;
                scene.createSlash(slashPos);
                player.player.freezeTime = player.player.freezeDuration;
                player.anim.gotoAndPlay('chara_attack', false);
            }
        }
    }
    updateEnemy(myScene, app) {
        const goArr = myScene.goArr;
        // Enemy.
        goArr.forEach(go => {
            const enemy = go.enemy;
            if (!enemy)
                return;
            if (!go.life)
                return;
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
            if (!stone)
                return;
            stone.tr.position.x = go.tr.position.x - 48;
            stone.tr.position.y = go.tr.position.y - 8;
        });
    }
    updateShaker(myScene, app) {
        const goArr = myScene.goArr;
        goArr.forEach(go => {
            const shaker = go.shaker;
            if (!shaker)
                return;
            ShakerHelper.update(shaker, app);
        });
    }
    enterframe(evt) {
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
            if (!effect)
                return;
            effect.time += app.ticker.deltaTime;
            if (effect.time < effect.duration)
                return;
            go.hasDelete = true;
        });
        // collider 位置更新.
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
        // 衝突判定.
        //myScene.updateHit(goArr, go => go.type === GameObjectType.PLAYER, go => go.type === GameObjectType.ENEMY);
        myScene.updateHit(goArr, go => go.type === GameObjectType.PLAYER_BULLET, go => go.type === GameObjectType.ENEMY);
        // 掃除.
        for (var i = goArr.length - 1; 0 <= i; i--) {
            const go = goArr[i];
            if (!go.hasDelete)
                continue;
            myScene.destroyGameObject(go);
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
                if (go.shaker) {
                    sprite.x += go.shaker.offset.x;
                    sprite.y += go.shaker.offset.y;
                }
            });
        }
        var sprites = [];
        myScene.goArr.forEach((go) => {
            if (!go.sprite)
                return;
            sprites.push(go.sprite);
        });
        myScene.scene.children.sort((a, b) => {
            if (!(a instanceof DisplayElement))
                return 0;
            if (!(b instanceof DisplayElement))
                return 0;
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
    destroyGameObject(go) {
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
