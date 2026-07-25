/* ============================================================
   MATH ADVENTURE — game logic
   Organized into:
     1. CONFIG            — tunable numbers, copy, achievement list
     2. STATE             — the single source of truth for the game
     3. DOM REFS
     4. STORAGE            — localStorage read/write helpers
     5. AUDIO              — tiny Web Audio sound effects
     6. CONFETTI
     7. HELPERS
     8. QUESTION GENERATION
     9. TIMER
     10. HINTS
     11. XP & LEVELS
     12. STREAKS
     13. BADGES / ACHIEVEMENTS
     14. ANSWER CHECKING (attempts, feedback, advancing)
     15. ROUND SUMMARY
     16. STATS / UI REFRESH
     17. EVENT HANDLERS
     18. INIT
   ============================================================ */

/* ================= 1. CONFIG ================= */

const CONFIG = {
  QUESTIONS_PER_ROUND: 10,
  MAX_ATTEMPTS: 3,
  TIMED_SECONDS: 20,
  NEXT_QUESTION_DELAY_CORRECT: 1000,   // ms — auto-advance after a correct answer
  NEXT_QUESTION_DELAY_REVEAL: 2200,    // ms — auto-advance after the answer is revealed
  XP_BASE: 10,                          // XP for any correct answer
  XP_FIRST_TRY_BONUS: 5,                // extra XP for solving on the first attempt
  XP_STREAK_BONUS: 10,                  // extra XP every 5-streak
  SPEEDSTER_SECONDS: 5                  // answer with <=5s left (timed mode) to earn the Speedster badge
};

/* difficulty controls the size of the numbers used */
const DIFFICULTY_RANGES = {
  easy:   { max: 5  },
  medium: { max: 10 },
  hard:   { max: 20 }
};

/* two-stage hints that guide reasoning instead of giving the answer away */
const HINT_TIPS = {
  add: [
    "Start with the bigger number and count up from there.",
    "Try splitting the smaller number into tens and ones to make counting easier."
  ],
  sub: [
    "Count backwards from the first number, one step at a time.",
    "Try subtracting in two easy steps — take away a round number first, then the rest."
  ],
  mul: [
    "Multiplication is just repeated addition — add the number to itself that many times.",
    "Break one number into tens and ones, multiply each part, then add the results together."
  ],
  div: [
    "Ask yourself: how many times does the second number fit into the first?",
    "Try subtracting the second number over and over, and count how many times you did it."
  ]
};

/* Einstein's motivational messages — picked at random so it feels alive */
const MASCOT_MESSAGES = {
  welcome:  ["Hi, I'm Einstein! Let's do math!", "Ready to grow your brain today?", "Pick your challenge — I believe in you!"],
  generate: ["Here's your question!", "Let's see what you've got!", "Time to think like a genius!"],
  correct:  ["Yes! Brilliant work!", "You nailed it! 🎉", "Genius move!", "That's exactly right!", "Wow, super fast thinking!"],
  retry:    ["So close — give it another shot!", "Not quite, try again!", "Almost! One more try!"],
  wrong:    ["No worries, keep going!", "Every mistake helps you learn!", "Shake it off — next one's yours!"],
  streak:   ["You're on fire! 🔥", "Unstoppable streak!", "Keep that streak alive!"],
  levelup:  ["Level up! You're getting smarter every day!", "New level unlocked — amazing!"],
  timeup:   ["Time flew by! Let's try the next one.", "So close — quick, next question!"],
  badge:    ["New badge earned! You're a star!", "Achievement unlocked!"]
};

/* Achievement / badge definitions.
   `check(s)` receives the live state and returns true once earned. */
const ACHIEVEMENTS = [
  { id: 'first_correct', icon: '🌟', name: 'First Steps',    check: s => s.correctCount >= 1 },
  { id: 'streak5',       icon: '🔥', name: 'Hot Streak',     check: s => s.streak >= 5 },
  { id: 'streak10',      icon: '🚀', name: 'On Fire',        check: s => s.streak >= 10 },
  { id: 'streak25',      icon: '⚡', name: 'Unstoppable',    check: s => s.streak >= 25 },
  { id: 'level5',        icon: '🎓', name: 'Rising Star',    check: s => s.level >= 5 },
  { id: 'level10',       icon: '🧙', name: 'Math Wizard',    check: s => s.level >= 10 },
  { id: 'perfect_round', icon: '💯', name: 'Perfectionist',  check: s => s.perfectRound },
  { id: 'century',       icon: '🏛️', name: 'Century Club',   check: s => s.lifetimeCorrect >= 100 },
  { id: 'speedster',     icon: '💨', name: 'Speedster',      check: s => s.speedsterEarned }
];

/* ================= 2. STATE ================= */

const state = {
  operator: 'add',          // add | sub | mul | div | random
  difficulty: 'easy',       // easy | medium | hard
  mode: 'timed',            // timed | practice

  score: 0,
  correctCount: 0,
  wrongCount: 0,

  streak: 0,
  bestStreak: Number(localStorage.getItem('mathAdventureBestStreak') || 0),
  bestScore: Number(localStorage.getItem('mathAdventureBestScore') || 0),
  lifetimeCorrect: Number(localStorage.getItem('mathAdventureLifetimeCorrect') || 0),

  level: 1,
  xp: 0,                    // xp earned inside the current level
  xpToNext: xpNeeded(1),

  unlockedBadges: JSON.parse(localStorage.getItem('mathAdventureBadges') || '[]'),
  newlyUnlocked: [],        // badges unlocked during the current question, for popups

  currentAnswer: null,
  currentOperatorUsed: null,
  attemptsLeft: CONFIG.MAX_ATTEMPTS,
  hintStage: 0,
  questionStartTime: null,

  timer: null,
  timeLeft: CONFIG.TIMED_SECONDS,

  questionsThisRound: 0,
  roundCorrect: 0,
  roundWrong: 0,
  perfectRound: false,
  speedsterEarned: false,

  advanceTimeout: null
};

/* XP required to clear a given level — grows gently so early levels feel quick */
function xpNeeded(level){
  return 80 + (level - 1) * 20;
}

/* ================= 3. DOM REFS ================= */

const $ = (id) => document.getElementById(id);

const operatorGrid   = $('operatorGrid');
const difficultyRow  = $('difficultyRow');
const modeRow        = $('modeRow');
const generateBtn    = $('generateBtn');
const questionArea   = $('questionArea');
const questionText   = $('questionText');
const answerInput    = $('answerInput');
const checkBtn       = $('checkBtn');
const hintBtn        = $('hintBtn');
const hintText       = $('hintText');
const feedback       = $('feedback');
const timerEl        = $('timer');
const progressBar    = $('progressBar');
const attemptsRow    = $('attemptsRow');
const scoreVal       = $('scoreVal');
const statScore      = $('statScore');
const statCorrect    = $('statCorrect');
const statWrong      = $('statWrong');
const statAccuracy   = $('statAccuracy');
const statBest       = $('statBest');
const statBestStreak = $('statBestStreak');
const resetBtn       = $('resetBtn');
const darkToggle     = $('darkToggle');
const mascotSpeech   = $('mascotSpeech');
const confettiCanvas = $('confettiCanvas');
const streakDisplay  = $('streakDisplay');
const streakVal      = $('streakVal');
const levelVal       = $('levelVal');
const xpFill         = $('xpFill');
const xpVal          = $('xpVal');
const xpNextVal      = $('xpNextVal');
const xpLevel        = $('xpLevel');
const badgesGrid     = $('badgesGrid');
const summaryOverlay = $('summaryOverlay');
const summaryStats   = $('summaryStats');
const summaryBadges  = $('summaryBadges');
const continueBtn    = $('continueBtn');

/* ================= 4. STORAGE ================= */

function saveProgress(){
  localStorage.setItem('mathAdventureBestScore', state.bestScore);
  localStorage.setItem('mathAdventureBestStreak', state.bestStreak);
  localStorage.setItem('mathAdventureLifetimeCorrect', state.lifetimeCorrect);
  localStorage.setItem('mathAdventureBadges', JSON.stringify(state.unlockedBadges));
}

/* ================= 5. SOUND EFFECTS (Web Audio, no files needed) ================= */

let audioCtx = null;
function ensureAudio(){
  if(!audioCtx){
    const AC = window.AudioContext || window.webkitAudioContext;
    if(AC) audioCtx = new AC();
  }
  return audioCtx;
}
function playTone(freqs, duration = 0.14){
  const ctx = ensureAudio();
  if(!ctx) return;
  freqs.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.15, ctx.currentTime + i * duration);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + (i + 1) * duration);
    osc.connect(gain).connect(ctx.destination);
    osc.start(ctx.currentTime + i * duration);
    osc.stop(ctx.currentTime + (i + 1) * duration);
  });
}
function playCorrectSound(){ playTone([523.25, 659.25, 783.99]); } // C-E-G happy chime
function playWrongSound(){ playTone([220, 180], 0.18); }           // low descending buzz
function playRetrySound(){ playTone([330, 294]); }                 // gentle "try again" blip
function playLevelUpSound(){ playTone([523.25, 659.25, 783.99, 1046.5], 0.12); }
function playBadgeSound(){ playTone([659.25, 880, 1174.66], 0.12); }

/* ================= 6. CONFETTI ================= */

const ctx2d = confettiCanvas.getContext('2d');
let confettiPieces = [];
function resizeCanvas(){
  confettiCanvas.width = window.innerWidth;
  confettiCanvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

function launchConfetti(amount = 90){
  const colors = ['#FFD93D', '#6BCB77', '#FF6B6B', '#9D4EDD', '#87CEEB', '#FFA94D'];
  confettiPieces = Array.from({length: amount}, () => ({
    x: Math.random() * confettiCanvas.width,
    y: -20 - Math.random() * 100,
    size: 6 + Math.random() * 6,
    color: colors[Math.floor(Math.random() * colors.length)],
    speedY: 2 + Math.random() * 3,
    speedX: (Math.random() - 0.5) * 3,
    rotation: Math.random() * 360,
    spin: (Math.random() - 0.5) * 10
  }));
  requestAnimationFrame(animateConfetti);
}
function animateConfetti(){
  ctx2d.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
  let stillFalling = false;
  confettiPieces.forEach(p => {
    p.x += p.speedX;
    p.y += p.speedY;
    p.rotation += p.spin;
    if(p.y < confettiCanvas.height + 20) stillFalling = true;
    ctx2d.save();
    ctx2d.translate(p.x, p.y);
    ctx2d.rotate(p.rotation * Math.PI / 180);
    ctx2d.fillStyle = p.color;
    ctx2d.fillRect(-p.size/2, -p.size/2, p.size, p.size * 0.6);
    ctx2d.restore();
  });
  if(stillFalling) requestAnimationFrame(animateConfetti);
  else ctx2d.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
}

/* ================= 7. HELPERS ================= */

function randInt(min, max){
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function pick(arr){
  return arr[randInt(0, arr.length - 1)];
}
function setMascotSpeech(category){
  mascotSpeech.textContent = pick(MASCOT_MESSAGES[category] || MASCOT_MESSAGES.welcome);
}

/* ================= 8. QUESTION GENERATION ================= */

function pickOperator(){
  if(state.operator !== 'random') return state.operator;
  const ops = ['add', 'sub', 'mul', 'div'];
  return ops[randInt(0, ops.length - 1)];
}

function generateQuestion(){
  clearTimeout(state.advanceTimeout);

  const max = DIFFICULTY_RANGES[state.difficulty].max;
  const op = pickOperator();
  state.currentOperatorUsed = op;

  let a, b, answer, symbol;

  if(op === 'add'){
    a = randInt(0, max);
    b = randInt(0, max);
    answer = a + b;
    symbol = '+';
  } else if(op === 'sub'){
    let n1 = randInt(0, max);
    let n2 = randInt(0, max);
    // always place the larger number first so answers stay non-negative
    a = Math.max(n1, n2);
    b = Math.min(n1, n2);
    answer = a - b;
    symbol = '−';
  } else if(op === 'mul'){
    a = randInt(0, Math.min(max, 10));
    b = randInt(0, Math.min(max, 10));
    answer = a * b;
    symbol = '×';
  } else { // division — guarantee a whole-number answer, no remainders
    b = randInt(1, Math.min(max, 10));      // divisor, never zero
    answer = randInt(0, Math.min(max, 10)); // quotient
    a = b * answer;                          // dividend
    symbol = '÷';
  }

  state.currentAnswer = answer;
  questionText.textContent = `${a} ${symbol} ${b} = ?`;

  // reset per-question state
  state.attemptsLeft = CONFIG.MAX_ATTEMPTS;
  state.hintStage = 0;
  state.questionStartTime = Date.now();
  renderAttempts();

  // reset per-question UI
  answerInput.value = '';
  answerInput.disabled = false;
  answerInput.classList.remove('shake');
  checkBtn.disabled = false;
  hintText.textContent = '';
  hintBtn.disabled = false;
  feedback.classList.add('hidden');
  questionArea.classList.remove('hidden');
  answerInput.focus();

  if(state.mode === 'timed'){
    timerEl.classList.remove('hidden');
    startTimer();
  } else {
    timerEl.classList.add('hidden');
    clearInterval(state.timer);
  }
  updateProgressBar();
}

/* ================= 9. TIMER (Timed Mode only) ================= */

function startTimer(){
  clearInterval(state.timer);
  state.timeLeft = CONFIG.TIMED_SECONDS;
  renderTimer();

  state.timer = setInterval(() => {
    state.timeLeft--;
    renderTimer();
    if(state.timeLeft <= 0){
      clearInterval(state.timer);
      handleTimeUp();
    }
  }, 1000);
}

function renderTimer(){
  timerEl.textContent = `⏱ ${state.timeLeft}`;
  timerEl.classList.remove('low', 'mid');
  if(state.timeLeft <= 5) timerEl.classList.add('low');
  else if(state.timeLeft <= 10) timerEl.classList.add('mid');
}

function handleTimeUp(){
  setMascotSpeech('timeup');
  revealAnswer("Time's up!");
}

/* ================= 10. HINTS ================= */
/* Hints guide the child's thinking instead of revealing the number. */

function showHint(){
  const tips = HINT_TIPS[state.currentOperatorUsed] || [];
  if(state.hintStage < tips.length){
    hintText.textContent = `💡 ${tips[state.hintStage]}`;
    state.hintStage++;
  }
  if(state.hintStage >= tips.length){
    hintBtn.disabled = true;
    if(!hintText.textContent){
      hintText.textContent = "You've got this — give it your best guess!";
    }
  }
}

/* ================= 11. XP & LEVELS ================= */

function awardXP(amount){
  state.xp += amount;
  let leveledUp = false;
  while(state.xp >= state.xpToNext){
    state.xp -= state.xpToNext;
    state.level++;
    state.xpToNext = xpNeeded(state.level);
    leveledUp = true;
  }
  renderXP();
  if(leveledUp){
    xpLevel.classList.remove('levelup');
    void xpLevel.offsetWidth; // restart animation
    xpLevel.classList.add('levelup');
    setMascotSpeech('levelup');
    playLevelUpSound();
  }
  return leveledUp;
}

function renderXP(){
  levelVal.textContent = state.level;
  xpVal.textContent = state.xp;
  xpNextVal.textContent = state.xpToNext;
  const pct = Math.min(100, (state.xp / state.xpToNext) * 100);
  xpFill.style.width = pct + '%';
}

/* ================= 12. STREAKS ================= */

function incrementStreak(){
  state.streak++;
  if(state.streak > state.bestStreak){
    state.bestStreak = state.streak;
  }
  streakVal.textContent = state.streak;
  streakDisplay.classList.remove('pulse');
  void streakDisplay.offsetWidth;
  streakDisplay.classList.add('pulse');
  if(state.streak > 0 && state.streak % 5 === 0){
    setMascotSpeech('streak');
  }
}

function resetStreak(){
  state.streak = 0;
  streakVal.textContent = 0;
}

/* ================= 13. BADGES / ACHIEVEMENTS ================= */

function checkAchievements(){
  ACHIEVEMENTS.forEach(a => {
    if(!state.unlockedBadges.includes(a.id) && a.check(state)){
      state.unlockedBadges.push(a.id);
      state.newlyUnlocked.push(a);
    }
  });
  if(state.newlyUnlocked.length){
    saveProgress();
    playBadgeSound();
    setMascotSpeech('badge');
  }
  renderBadges();
}

function renderBadges(){
  badgesGrid.innerHTML = '';
  ACHIEVEMENTS.forEach(a => {
    const unlocked = state.unlockedBadges.includes(a.id);
    const isNew = state.newlyUnlocked.some(n => n.id === a.id);
    const div = document.createElement('div');
    div.className = 'badge-item' + (unlocked ? ' unlocked' : '') + (isNew ? ' new' : '');
    div.title = unlocked ? a.name : `Locked — ${a.name}`;
    div.innerHTML = `<span class="badge-icon">${a.icon}</span><span class="badge-name">${a.name}</span>`;
    badgesGrid.appendChild(div);
  });
}

/* ================= 14. ANSWER CHECKING ================= */

function checkAnswer(){
  if(questionArea.classList.contains('hidden')) return;
  const userVal = answerInput.value.trim();
  if(userVal === '') return;

  const isCorrect = Number(userVal) === state.currentAnswer;

  if(isCorrect){
    handleCorrect();
  } else {
    handleIncorrect();
  }
}

function handleCorrect(){
  clearInterval(state.timer);
  answerInput.disabled = true;
  checkBtn.disabled = true;
  hintBtn.disabled = true;

  const firstTry = state.attemptsLeft === CONFIG.MAX_ATTEMPTS;
  const secondsTaken = (Date.now() - state.questionStartTime) / 1000;

  state.score += 1;
  state.correctCount += 1;
  state.lifetimeCorrect += 1;
  state.roundCorrect += 1;
  incrementStreak();

  // speedster check: solved quickly (within a few seconds), in timed mode
  if(state.mode === 'timed' && secondsTaken <= CONFIG.SPEEDSTER_SECONDS){
    state.speedsterEarned = true;
  }

  // XP: base + first-try bonus + streak bonus
  let xpGain = CONFIG.XP_BASE;
  if(firstTry) xpGain += CONFIG.XP_FIRST_TRY_BONUS;
  if(state.streak > 0 && state.streak % 5 === 0) xpGain += CONFIG.XP_STREAK_BONUS;
  awardXP(xpGain);

  setMascotSpeech('correct');
  feedback.classList.remove('hidden', 'wrong', 'retry');
  feedback.classList.add('correct');
  feedback.innerHTML = `🎉 Correct! <span class="sub">Great job!</span><span class="xp-pop">+${xpGain} XP</span>`;
  launchConfetti();
  playCorrectSound();

  state.newlyUnlocked = [];
  checkAchievements();
  refreshStats();
  advanceOrSummarize();
}

function handleIncorrect(){
  state.attemptsLeft--;
  renderAttempts();
  answerInput.classList.remove('shake');
  void answerInput.offsetWidth; // restart shake animation
  answerInput.classList.add('shake');
  playWrongSound();

  if(state.attemptsLeft > 0){
    setMascotSpeech('retry');
    feedback.classList.remove('hidden', 'correct', 'wrong');
    feedback.classList.add('retry');
    const triesWord = state.attemptsLeft === 1 ? 'try' : 'tries';
    feedback.innerHTML = `🤔 Not quite! <span class="sub">${state.attemptsLeft} ${triesWord} left — you can do it!</span>`;
    answerInput.value = '';
    answerInput.focus();
    playRetrySound();
  } else {
    revealAnswer();
  }
}

/* Reveals the correct answer after attempts (or time) run out, then auto-advances. */
function revealAnswer(customPrefix){
  clearInterval(state.timer);
  answerInput.disabled = true;
  checkBtn.disabled = true;
  hintBtn.disabled = true;

  state.wrongCount += 1;
  state.roundWrong += 1;
  resetStreak();

  setMascotSpeech('wrong');
  feedback.classList.remove('hidden', 'correct', 'retry');
  feedback.classList.add('wrong');
  const prefix = customPrefix ? `${customPrefix} ` : '';
  feedback.innerHTML = `😢 ${prefix}<span class="sub">The answer was ${state.currentAnswer}.</span>`;
  playWrongSound();

  state.newlyUnlocked = [];
  checkAchievements();
  refreshStats();
  advanceOrSummarize();
}

/* Decides whether to auto-generate the next question or show the round summary. */
function advanceOrSummarize(){
  state.questionsThisRound++;
  updateProgressBar();

  const delay = feedback.classList.contains('correct')
    ? CONFIG.NEXT_QUESTION_DELAY_CORRECT
    : CONFIG.NEXT_QUESTION_DELAY_REVEAL;

  if(state.questionsThisRound >= CONFIG.QUESTIONS_PER_ROUND){
    state.perfectRound = state.roundWrong === 0;
    if(state.perfectRound) checkAchievements();
    state.advanceTimeout = setTimeout(showRoundSummary, delay);
  } else {
    state.advanceTimeout = setTimeout(generateQuestion, delay);
  }
}

/* ================= 15. ROUND SUMMARY ================= */

function showRoundSummary(){
  const attempted = state.roundCorrect + state.roundWrong;
  const accuracy = attempted ? Math.round((state.roundCorrect / attempted) * 100) : 0;

  summaryStats.innerHTML = `
    <div class="sum-item"><span class="sum-val">✔️ ${state.roundCorrect}</span><span class="sum-label">Correct</span></div>
    <div class="sum-item"><span class="sum-val">❌ ${state.roundWrong}</span><span class="sum-label">Wrong</span></div>
    <div class="sum-item"><span class="sum-val">🎯 ${accuracy}%</span><span class="sum-label">Accuracy</span></div>
    <div class="sum-item"><span class="sum-val">🔥 ${state.streak}</span><span class="sum-label">Current Streak</span></div>
  `;

  if(state.newlyUnlocked.length){
    summaryBadges.classList.remove('hidden');
    summaryBadges.innerHTML = state.newlyUnlocked
      .map(a => `<span class="badge-chip">${a.icon} ${a.name}</span>`)
      .join('');
  } else {
    summaryBadges.classList.add('hidden');
    summaryBadges.innerHTML = '';
  }

  summaryOverlay.classList.remove('hidden');
  questionArea.classList.add('hidden');
  feedback.classList.add('hidden');
}

function closeRoundSummary(){
  summaryOverlay.classList.add('hidden');
  state.questionsThisRound = 0;
  state.roundCorrect = 0;
  state.roundWrong = 0;
  state.perfectRound = false;
  state.newlyUnlocked = [];
  updateProgressBar();
  generateQuestion();
}

/* progress bar fills across the current 10-question round */
function updateProgressBar(){
  const pct = (state.questionsThisRound / CONFIG.QUESTIONS_PER_ROUND) * 100;
  progressBar.style.width = pct + '%';
}

/* attempt hearts: dim the ones already used */
function renderAttempts(){
  [...attemptsRow.children].forEach(heart => {
    const n = Number(heart.dataset.n);
    heart.classList.toggle('used', n > state.attemptsLeft);
  });
}

/* ================= 16. STATS / UI REFRESH ================= */

function refreshStats(){
  scoreVal.textContent = state.score;
  statScore.textContent = state.score;
  statCorrect.textContent = state.correctCount;
  statWrong.textContent = state.wrongCount;

  const attempted = state.correctCount + state.wrongCount;
  const accuracy = attempted ? Math.round((state.correctCount / attempted) * 100) : 0;
  statAccuracy.textContent = accuracy + '%';

  if(state.score > state.bestScore){
    state.bestScore = state.score;
  }
  statBest.textContent = state.bestScore;
  statBestStreak.textContent = state.bestStreak;

  saveProgress();
}

/* ================= 17. EVENT HANDLERS ================= */

// operator card selection
operatorGrid.addEventListener('click', (e) => {
  const card = e.target.closest('.op-card');
  if(!card) return;
  [...operatorGrid.children].forEach(c => c.classList.remove('selected'));
  card.classList.add('selected');
  state.operator = card.dataset.op;
});

// difficulty selection
difficultyRow.addEventListener('click', (e) => {
  const btn = e.target.closest('.diff-btn');
  if(!btn) return;
  [...difficultyRow.children].forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  state.difficulty = btn.dataset.diff;
});

// mode selection (Timed vs Practice)
modeRow.addEventListener('click', (e) => {
  const btn = e.target.closest('.mode-btn');
  if(!btn) return;
  [...modeRow.children].forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  state.mode = btn.dataset.mode;

  if(state.mode === 'practice'){
    clearInterval(state.timer);
    timerEl.classList.add('hidden');
  } else if(!questionArea.classList.contains('hidden')){
    timerEl.classList.remove('hidden');
    startTimer();
  }
});

// generate question
generateBtn.addEventListener('click', () => {
  generateBtn.classList.remove('bounce');
  void generateBtn.offsetWidth; // restart animation
  generateBtn.classList.add('bounce');
  setMascotSpeech('generate');
  generateQuestion();
});

// check answer
checkBtn.addEventListener('click', checkAnswer);
answerInput.addEventListener('keydown', (e) => {
  if(e.key === 'Enter') checkAnswer();
});

// hint
hintBtn.addEventListener('click', showHint);

// round summary continue
continueBtn.addEventListener('click', closeRoundSummary);

// reset score (keeps lifetime badges/best records intact — only resets this session)
resetBtn.addEventListener('click', () => {
  clearTimeout(state.advanceTimeout);
  state.score = 0;
  state.correctCount = 0;
  state.wrongCount = 0;
  state.streak = 0;
  state.questionsThisRound = 0;
  state.roundCorrect = 0;
  state.roundWrong = 0;
  streakVal.textContent = 0;
  refreshStats();
  updateProgressBar();
  feedback.classList.add('hidden');
  setMascotSpeech('welcome');
});

// dark mode toggle
darkToggle.addEventListener('click', () => {
  document.body.classList.toggle('dark');
  darkToggle.textContent = document.body.classList.contains('dark') ? '☀️' : '🌙';
});

/* ================= 18. INIT ================= */

function init(){
  timerEl.classList.remove('hidden');
  renderXP();
  renderBadges();
  refreshStats();
  setMascotSpeech('welcome');
}

init();