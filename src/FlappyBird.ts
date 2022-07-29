
/**
 * @author  raizensoft.com
 */
import {AnimatedSprite, Application, Container, settings, Sprite, Texture, TilingSprite} from "pixi.js";
import {Assets} from '@pixi/assets';
import { Howl } from "howler";
import {ShockwaveFilter} from '@pixi/filter-shockwave';
import anime from "animejs";

const APP_WIDTH = 1000;
const APP_HEIGHT = 800;
const GAME_SPEED = 380;
const GRAVITY = 25;
const BOOST = 10;
const BLOCK_DISTANCE = 380;
const BLOCK_OFFSET = 600;

/**
 * @class FlappyBird
 */
export default class FlappyBird {

  root:HTMLDivElement;
  pa:Application;
  container:Container;

  // Game objects
  bird:AnimatedSprite;
  vy:number; // Bird y velocity
  cloudList:Sprite[];
  grasses:Container;
  blockList:TilingSprite[];
  lastBlock:TilingSprite;
  isGameOver:boolean;
  sw:ShockwaveFilter;

  // Interface component
  score:HTMLDivElement;
  currentScore:number;
  scoreId:number;
  gover:HTMLDivElement;

  // Sound objects
  soundJump:Howl;
  soundFall:Howl;

  constructor(root:HTMLDivElement) {

    this.root = root;
    this.init();
  }

  private async init() {

    // Init Pixi Application
    const pa = this.pa = new Application({
      width:APP_WIDTH,
      height:APP_HEIGHT,
      backgroundColor:0x66d7ff,
      antialias:true
    });
    settings.ROUND_PIXELS = true;
    this.root.appendChild(pa.view);

    // Root container
    const c = this.container = new Container();
    c.buttonMode = true;
    pa.stage.addChild(c);

    // Init scores and panel
    this.initInterface();

    // Load spritesheet assets
    await Assets.load('assets/flappybird.json');
    this.initCloud();
    this.initBlocks();
    this.initGrasses();
    this.initBird();

    // Load sounds
    this.soundJump = new Howl({
      src:['/assets/Jump.mp3']
    });
    this.soundFall = new Howl({
      src:['/assets/Falling.mp3']
    });

    // Reset game state
    this.reset();

    // Add interaction
    pa.view.addEventListener('pointerdown', () => {

      if (this.isGameOver) return;
      this.vy = -BOOST;
      this.soundJump.play();
    });

    // Start Render loop
    pa.ticker.add(this.update.bind(this));
  }

  /**
   * Init interface
   */
  private initInterface() {

    // Score element
    this.score = document.createElement('div') as HTMLDivElement;
    this.score.innerHTML = 'Score:';
    this.score.className = 'absolute text-sm top-2 left-2 font-bold bg-gray-800 p-1 rounded'
    this.root.appendChild(this.score);

    // Game over panel
    this.gover = document.createElement('div') as HTMLDivElement;
    this.gover.className = 'absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center cursor-pointer';
    this.gover.onclick = () => {
      this.reset();
    };
    this.root.appendChild(this.gover);
  }

  /**
   * Make clouds
   */
  private initCloud() {

    this.cloudList = [];

    for (let i = 0; i < 3; i++) {

      const rand = Math.floor(Math.random() * 3);
      const c = new Sprite(Texture.from('Cloud' + rand));
      c.anchor.set(0.5);
      c.scale.set(0.75);
      c.position.x = i * APP_WIDTH / 3 + Math.random() * 100;
      c.position.y = Math.random() * 150;
      this.cloudList.push(c);
      this.container.addChild(c);
    }
  }

  /**
   * Make blocks
   */
  private initBlocks() {

    this.blockList = []
    for (let i = 0; i < 5; i++) {

      const rand = Math.floor(Math.random() * 2);
      const b = new TilingSprite(Texture.from('Block' + rand));
      b.anchor.set(0);
      b.width = 128;
      b.height = (Math.floor(Math.random() * 3) + 1) * 128;
      b.tileScale.set(0.5);
      b.position.x = i * BLOCK_DISTANCE + BLOCK_OFFSET;

      // Random top or bottom position
      b.position.y = Math.random() < 0.5 ? APP_HEIGHT - b.height : 0;
      this.container.addChild(b);
      this.blockList.push(b);
    }
    this.lastBlock = this.blockList[this.blockList.length - 1];
  }

  /**
   * Make grass
   */
  private initGrasses() {

    this.grasses = new Container();
    this.container.addChild(this.grasses);

    for (let i = 0; i < 3; i++) {

      const g = new Sprite(Texture.from('Grass'));
      g.position.y = APP_HEIGHT;
      g.position.x = i * 500;
      g.scale.set(0.65);
      g.anchor.set(0, 1);
      this.grasses.addChild(g);
    }
  }

  /**
   * Make bird
   */
  private initBird() {

    const b = this.bird = new AnimatedSprite([Texture.from('Bird0'), Texture.from('Bird1')]);
    b.animationSpeed = 0.2;

    // Center anchor
    b.anchor.set(0.5);

    // Play bird animation
    b.play(); 
    this.container.addChild(b);

    // Crash/shockwave filter animation
    this.sw = new ShockwaveFilter();
    this.sw.amplitude = 8;
  }

  /**
   * Render loop
   */
  update(delta:number) {

    const dtime = delta / 60;

    // Update cloud
    this.cloudList.forEach((it) => {
      it.position.x -= dtime * 20;
      if (it.position.x < -100) it.position.x = APP_WIDTH + 100;
    });

    // Update shockwave filter
    if (this.isGameOver)
      this.sw.time += dtime * 1.5;

    // Update bird position
    this.vy += GRAVITY * dtime;
    this.bird.position.y += this.vy;

    // Hit floor and ceiling
    if (this.isGameOver) return;
    if (this.bird.position.y < 0 || this.bird.position.y > APP_HEIGHT) 
      this.setGameOverState();

    const birdBound = this.bird.getBounds();

    // Update grasses
    this.grasses.position.x -= dtime * GAME_SPEED;
    if (this.grasses.position.x < -500)
      this.grasses.position.x = 0;

    // Update blocks
    this.blockList.forEach((it) => {

      it.position.x -= dtime * GAME_SPEED;
      if (it.position.x < -128) {

        it.position.x = this.lastBlock.position.x + BLOCK_DISTANCE;
        it.height = (Math.floor(Math.random() * 2) + 2) * 128;
        it.position.y = Math.random() < 0.5 ? APP_HEIGHT - it.height : 0;
        this.lastBlock = it;
      }

      // Hit detection
      if (it.getBounds().intersects(birdBound)) {

        this.setGameOverState();
      }
    });
  }

  private setGameOverState() {

    this.isGameOver = true;

    // Update shockwave position
    this.sw.center = [this.bird.position.x, this.bird.position.y];
    this.bird.stop();
    clearInterval(this.scoreId);
    anime({
      targets:this.bird,
      angle:Math.random() * 20 + 90,
      duration:500,
      easing:'linear'
    });
    this.root.appendChild(this.gover);
    this.gover.innerHTML = `
      <h1 class='text-4xl my-2 font-bold'>Game Over</h1>
      <div class='text-2xl'>Your Score: ${this.currentScore}</div>
      <div class='text-2xl'>Click to Restart</div>
    `;
    this.soundFall.play();

    // Apply filter
    this.container.filters = [this.sw];
  }

  /**
   * Reset game state
   */
  private reset() {

    // Reset bird
    this.bird.position.set(200, 100);
    this.vy = 0;
    this.bird.angle = 0;
    anime.remove(this.bird);
    this.bird.play();

    // Game state
    this.isGameOver = false;
    this.currentScore = 0;
    clearInterval(this.scoreId);
    this.score.innerHTML = 'Score: 0';
    this.scoreId = setInterval(() => {
      this.currentScore++;
      this.score.innerHTML = 'Score: ' + this.currentScore.toString();
    }, 1000);

    // Reset other components
    this.root.removeChild(this.gover);
    this.sw.time = 0;
    this.container.filters = [];
    this.grasses.position.x = 0;

    // Reset block
    this.blockList.forEach((it, index) => {
      it.position.x = index * BLOCK_DISTANCE + BLOCK_OFFSET;
    });
    this.lastBlock = this.blockList[this.blockList.length - 1];
  }
}
