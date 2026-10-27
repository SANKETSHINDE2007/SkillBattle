import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import http from 'http';
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';

import { connectDB } from './config/database.js';
import User from './models/user.js';
import BattleHistory from './models/BattleHistory.js';
import Question from './models/Question.js';
import { onlineUsers } from './services/presence.service.js';

import authRoutes from './routes/auth.routes.js';
import aiQuestionRoutes from './routes/aiQuestion.routes.js';
import questionRoutes from './routes/questions.routes.js';
import adminRoutes from './routes/admin.routes.js';
import battleHistoryRoutes from './routes/battleHistory.routes.js';
import skillsRoutes from './routes/skills.routes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// ==========================================
// HTTP SERVER
// ==========================================

const server = http.createServer(app);

// ==========================================
// SOCKET.IO
// ==========================================

const io = new Server(server, {
  cors: {
    origin:
      process.env.CLIENT_URL ||
      'http://localhost:5173',
    methods: ['GET', 'POST'],
  },
});

// ==========================================
// MIDDLEWARE
// ==========================================

app.use(
  cors({
    origin:
      process.env.CLIENT_URL ||
      'http://localhost:5173',
  })
);

app.use(express.json());

// ==========================================
// API ROUTES
// ==========================================

app.use('/api/auth', authRoutes);
app.use('/api/ai-questions', aiQuestionRoutes);
app.use('/api/questions', questionRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/battle-history', battleHistoryRoutes);
app.use('/api/skills', skillsRoutes);

// ==========================================
// HEALTH CHECK
// ==========================================

app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'SkillBattle API is running',
  });
});

// ==========================================
// MATCHMAKING QUEUE
// ==========================================

const matchmakingQueue = [];

// ==========================================
// ACTIVE BATTLES
// ==========================================

const activeBattles = new Map();

const syncActiveBattleCount = () => {
  globalThis.__skillBattleActiveBattles = activeBattles.size;
};

// ==========================================
// CONSTANTS
// ==========================================

const QUESTION_TIME = 15;

const BASE_POINTS = 100;
const TIME_BONUS_PER_SECOND = 5;

const XP_PER_CORRECT = 10;

const WIN_RATING = 25;
const LOSS_RATING = -15;

// ==========================================
// SOCKET CONNECTION
// ==========================================

io.on('connection', async (socket) => {
  // ==========================================
  // PLAYER INFORMATION
  // ==========================================

  const playerName =
    socket.handshake.auth?.fullName ||
    'Player';

  const playerId =
    socket.handshake.auth?.userId;

  if (!playerId) {
    console.log(
      `❌ Missing MongoDB user ID for ${socket.id}`
    );

    socket.emit(
      'battle_error',
      'User authentication failed. Please login again.'
    );

    return;
  }

  let decodedSocketUser;
  try {
    decodedSocketUser = jwt.verify(
      socket.handshake.auth?.token || '',
      process.env.JWT_SECRET
    );
  } catch {
    socket.emit('battle_error', {
      message: 'Battle authentication failed. Please login again.',
    });
    socket.disconnect(true);
    return;
  }

  if (String(decodedSocketUser.userId) !== String(playerId)) {
    socket.emit('battle_error', {
      message: 'Battle authentication mismatch. Please login again.',
    });
    socket.disconnect(true);
    return;
  }

  const connectedUser = await User.findById(playerId).select(
    'isBanned banReason lastSeenAt'
  );

  if (!connectedUser || connectedUser.isBanned) {
    socket.emit('battle_error', {
      message: connectedUser?.banReason
        ? `Your account is banned: ${connectedUser.banReason}`
        : 'Your account is banned.',
    });
    socket.disconnect(true);
    return;
  }

  connectedUser.lastSeenAt = new Date();
  await connectedUser.save();

  onlineUsers.set(String(playerId), {
    socketId: socket.id,
    fullName: playerName,
    connectedAt: new Date(),
    socket,
  });

  console.log(
    `🔌 Player connected: ${playerName} (${socket.id})`
  );

  // ==========================================
  // FIND MATCH
  // ==========================================

  socket.on('find_match', async (matchData) => {
    try {
      const {
        skill,
        difficulty,
        count,
      } = matchData;

      const questionCount = Math.min(
        Number(count) || 5,
        20
      );

      console.log('🔎 Match request:', {
        player: playerName,
        playerId,
        skill,
        difficulty,
        count: questionCount,
      });

      // ========================================
      // PREVENT DUPLICATE QUEUE ENTRY
      // ========================================

      const alreadyWaiting =
        matchmakingQueue.some(
          (player) =>
            player.socketId === socket.id
        );

      if (alreadyWaiting) {
        return;
      }

      // ========================================
      // FIND COMPATIBLE OPPONENT
      // ========================================

      const opponentIndex =
        matchmakingQueue.findIndex(
          (player) =>
            player.skill === skill &&
            player.difficulty === difficulty &&
            player.count === questionCount
        );

      // ========================================
      // NO OPPONENT FOUND
      // ========================================

      if (opponentIndex === -1) {
        matchmakingQueue.push({
          socketId: socket.id,
          playerId,
          playerName,
          skill,
          difficulty,
          count: questionCount,
        });

        console.log(
          `⏳ ${playerName} is waiting for an opponent`
        );

        socket.emit(
          'waiting_for_opponent'
        );

        return;
      }

      // ========================================
      // OPPONENT FOUND
      // ========================================

      const opponent =
        matchmakingQueue[opponentIndex];

      matchmakingQueue.splice(
        opponentIndex,
        1
      );

      // ========================================
      // CHECK OPPONENT SOCKET
      // ========================================

      const opponentSocket =
        io.sockets.sockets.get(
          opponent.socketId
        );

      if (!opponentSocket) {
        console.log(
          '❌ Opponent disconnected before match'
        );

        socket.emit(
          'waiting_for_opponent'
        );

        return;
      }

      // ========================================
      // LOAD QUESTIONS
      // ========================================

      console.log(
        `📚 Loading ${questionCount} questions for battle...`
      );

      const questions =
        await Question.aggregate([
          {
            $match: {
              skill,
              difficulty,
            },
          },
          {
            $sample: {
              size: questionCount,
            },
          },
        ]);

      // ========================================
      // NOT ENOUGH QUESTIONS
      // ========================================

      if (
        !questions ||
        questions.length < questionCount
      ) {
        console.log(
          `❌ Not enough questions for ${skill} - ${difficulty}`
        );

        socket.emit(
          'battle_error',
          {
            message:
              `Not enough ${difficulty} questions available for ${skill}.`,
          }
        );

        opponentSocket.emit(
          'battle_error',
          {
            message:
              `Not enough ${difficulty} questions available for ${skill}.`,
          }
        );

        return;
      }

      // ========================================
      // CREATE ROOM
      // ========================================

      const roomId =
        `battle_${Date.now()}_${Math.random()
          .toString(36)
          .substring(2, 8)}`;

      // ========================================
      // JOIN SOCKET ROOM
      // ========================================

      socket.join(roomId);
      opponentSocket.join(roomId);

      console.log(
        `⚔️ Match found: ${playerName} vs ${opponent.playerName}`
      );

      console.log(
        `🏠 Battle room: ${roomId}`
      );

      // ========================================
      // CREATE BATTLE STATE
      // ========================================

      const battle = {
        roomId,

        skill,
        difficulty,

        players: [
          {
            socketId: socket.id,
            playerId,
            playerName,
          },
          {
            socketId: opponent.socketId,
            playerId: opponent.playerId,
            playerName:
              opponent.playerName,
          },
        ],

        questions,

        currentQuestion: 0,

        roundStartTime: null,

        answers: {
          [socket.id]: null,
          [opponent.socketId]: null,
        },

        scores: {
          [socket.id]: 0,
          [opponent.socketId]: 0,
        },

        correctCounts: {
          [socket.id]: 0,
          [opponent.socketId]: 0,
        },

        finished: false,

        timer: null,
      };

      activeBattles.set(
        roomId,
        battle
      );
      syncActiveBattleCount();

      // ========================================
      // MATCH DATA FOR PLAYER 1
      // ========================================

      socket.emit(
        'match_found',
        {
          roomId,

          playerName,

          opponentName:
            opponent.playerName,

          playerId,

          opponentId:
            opponent.playerId,

          skill,

          difficulty,

          count:
            questions.length,
        }
      );

      // ========================================
      // MATCH DATA FOR PLAYER 2
      // ========================================

      opponentSocket.emit(
        'match_found',
        {
          roomId,

          playerName:
            opponent.playerName,

          opponentName:
            playerName,

          playerId:
            opponent.playerId,

          opponentId:
            playerId,

          skill,

          difficulty,

          count:
            questions.length,
        }
      );

      // ========================================
      // START FIRST QUESTION
      // ========================================

      setTimeout(() => {
        startQuestion(roomId);
      }, 1000);

    } catch (error) {
      console.error(
        '❌ Matchmaking error:',
        error
      );

      socket.emit(
        'battle_error',
        {
          message:
            'Failed to create battle.',
        }
      );
    }
  });

  // ==========================================
  // SUBMIT ANSWER
  // ==========================================

  socket.on(
    'submit_answer',
    (data) => {
      handleSubmitAnswer(
        socket,
        data
      );
    }
  );

  // ==========================================
  // DISCONNECT
  // ==========================================

  socket.on('disconnect', async () => {
    // ========================================
    // REMOVE FROM MATCHMAKING QUEUE
    // ========================================

    const queueIndex =
      matchmakingQueue.findIndex(
        (player) =>
          player.socketId === socket.id
      );

    if (queueIndex !== -1) {
      matchmakingQueue.splice(
        queueIndex,
        1
      );
    }

    // ========================================
    // CHECK ACTIVE BATTLES
    // ========================================

    for (const [
      roomId,
      battle,
    ] of activeBattles.entries()) {

      const disconnectedPlayer =
        battle.players.find(
          (player) =>
            player.socketId === socket.id
        );

      if (!disconnectedPlayer) {
        continue;
      }

      console.log(
        `⚠️ ${disconnectedPlayer.playerName} disconnected from ${roomId}`
      );

      const opponent =
        battle.players.find(
          (player) =>
            player.socketId !== socket.id
        );

      if (opponent) {
        io.to(
          opponent.socketId
        ).emit(
          'opponent_disconnected',
          {
            opponentName:
              disconnectedPlayer.playerName,

            message:
              'Your opponent disconnected.',
          }
        );
      }

      if (battle.timer) {
        clearTimeout(
          battle.timer
        );
      }

      activeBattles.delete(
        roomId
      );
      syncActiveBattleCount();
    }

    const presence = onlineUsers.get(String(playerId));
    if (presence?.socketId === socket.id) {
      onlineUsers.delete(String(playerId));
    }

    const user = await User.findById(playerId).select('lastSeenAt');
    if (user) {
      user.lastSeenAt = new Date();
      await user.save();
    }

    console.log(
      `❌ Player disconnected: ${playerName} (${socket.id})`
    );
  });
});

// ==========================================
// START QUESTION
// ==========================================

function startQuestion(roomId) {
  const battle =
    activeBattles.get(roomId);

  if (!battle) {
    return;
  }

  if (battle.finished) {
    return;
  }

  const question =
    battle.questions[
      battle.currentQuestion
    ];

  if (!question) {
    finishBattle(roomId);
    return;
  }

  // ========================================
  // RESET ANSWERS
  // ========================================

  battle.answers = {};

  battle.roundStartTime =
    Date.now();

  // ========================================
  // SANITIZE QUESTION
  // ========================================

  const safeQuestion = {
    _id:
      question._id,

    questionText:
      question.questionText,

    options:
      question.options,

    difficulty:
      question.difficulty,

    xpReward:
      question.xpReward,
  };

  console.log(
    `❓ Question ${
      battle.currentQuestion + 1
    }/${battle.questions.length} started in ${roomId}`
  );

  // ========================================
  // SEND QUESTION
  // ========================================

  io.to(roomId).emit(
    'battle_question',
    {
      question:
        safeQuestion,

      questionIndex:
        battle.currentQuestion,

      totalQuestions:
        battle.questions.length,

      timeLimit:
        QUESTION_TIME,
    }
  );

  // ========================================
  // SERVER TIMER
  // ========================================

  battle.timer =
    setTimeout(() => {
      handleQuestionTimeout(
        roomId
      );
    }, QUESTION_TIME * 1000);
}

// ==========================================
// SUBMIT ANSWER HANDLER
// ==========================================

function handleSubmitAnswer(
  socket,
  data
) {
  const {
    roomId,
    questionIndex,
    answerIndex,
  } = data || {};

  // ========================================
  // VALIDATION
  // ========================================

  if (
    !roomId ||
    questionIndex === undefined ||
    answerIndex === undefined
  ) {
    return;
  }

  const battle =
    activeBattles.get(roomId);

  if (!battle) {
    return;
  }

  if (battle.finished) {
    return;
  }

  // ========================================
  // MAKE SURE PLAYER IS IN BATTLE
  // ========================================

  const player =
    battle.players.find(
      (p) =>
        p.socketId === socket.id
    );

  if (!player) {
    return;
  }

  // ========================================
  // MAKE SURE QUESTION IS CURRENT
  // ========================================

  if (
    Number(questionIndex) !==
    battle.currentQuestion
  ) {
    return;
  }

  // ========================================
  // PREVENT DOUBLE SUBMISSION
  // ========================================

  if (
    battle.answers[socket.id]
  ) {
    return;
  }

  const question =
    battle.questions[
      battle.currentQuestion
    ];

  if (!question) {
    return;
  }

  // ========================================
  // CHECK ANSWER
  // ========================================

  const isCorrect =
    Number(answerIndex) ===
    Number(question.correctAnswer);

  // ========================================
  // CALCULATE RESPONSE TIME
  // ========================================

  const elapsedSeconds =
    Math.min(
      QUESTION_TIME,
      (Date.now() -
        battle.roundStartTime) /
        1000
    );

  const remainingSeconds =
    Math.max(
      0,
      QUESTION_TIME -
        elapsedSeconds
    );

  // ========================================
  // CALCULATE POINTS
  // ========================================

  let points = 0;

  if (isCorrect) {
    points =
      BASE_POINTS +
      Math.floor(
        remainingSeconds *
          TIME_BONUS_PER_SECOND
      );

    battle.correctCounts[
      socket.id
    ] += 1;
  }

  battle.scores[
    socket.id
  ] += points;

  // ========================================
  // SAVE ANSWER
  // ========================================

  battle.answers[
    socket.id
  ] = {
    answerIndex:
      Number(answerIndex),

    isCorrect,

    points,

    responseTime:
      elapsedSeconds,
  };

  console.log(
    `📝 ${player.playerName} answered Q${
      battle.currentQuestion + 1
    }: ${
      isCorrect
        ? 'CORRECT'
        : 'WRONG'
    } (+${points})`
  );

  // ========================================
  // SEND PRIVATE ANSWER RESULT
  // ========================================

  socket.emit(
    'answer_result',
    {
      isCorrect,

      points,

      correctAnswer:
        question.correctAnswer,
    }
  );

  // ========================================
  // CHECK IF BOTH PLAYERS ANSWERED
  // ========================================

  const answeredPlayers =
    Object.keys(
      battle.answers
    ).length;

  if (
    answeredPlayers >=
    battle.players.length
  ) {
    clearTimeout(
      battle.timer
    );

    moveToNextQuestion(
      roomId
    );
  }
}

// ==========================================
// QUESTION TIMEOUT
// ==========================================

function handleQuestionTimeout(
  roomId
) {
  const battle =
    activeBattles.get(roomId);

  if (!battle) {
    return;
  }

  if (battle.finished) {
    return;
  }

  console.log(
    `⏰ Question ${
      battle.currentQuestion + 1
    } timed out`
  );

  // ========================================
  // PLAYERS WHO DIDN'T ANSWER
  // ========================================

  battle.players.forEach(
    (player) => {
      if (
        !battle.answers[
          player.socketId
        ]
      ) {
        battle.answers[
          player.socketId
        ] = {
          answerIndex: null,

          isCorrect: false,

          points: 0,

          responseTime:
            QUESTION_TIME,
        };
      }
    }
  );

  moveToNextQuestion(
    roomId
  );
}

// ==========================================
// MOVE TO NEXT QUESTION
// ==========================================

function moveToNextQuestion(
  roomId
) {
  const battle =
    activeBattles.get(roomId);

  if (!battle) {
    return;
  }

  if (battle.timer) {
    clearTimeout(
      battle.timer
    );
  }

  // ========================================
  // CHECK LAST QUESTION
  // ========================================

  if (
    battle.currentQuestion + 1 >=
    battle.questions.length
  ) {
    finishBattle(roomId);
    return;
  }

  // ========================================
  // NEXT QUESTION
  // ========================================

  battle.currentQuestion += 1;

  setTimeout(() => {
    startQuestion(roomId);
  }, 1000);
}

// ==========================================
// FINISH BATTLE
// ==========================================

async function finishBattle(
  roomId
) {
  const battle =
    activeBattles.get(roomId);

  if (!battle) {
    return;
  }

  if (battle.finished) {
    return;
  }

  battle.finished = true;

  if (battle.timer) {
    clearTimeout(
      battle.timer
    );
  }

  const player1 =
    battle.players[0];

  const player2 =
    battle.players[1];

  const score1 =
    battle.scores[
      player1.socketId
    ];

  const score2 =
    battle.scores[
      player2.socketId
    ];

  const correct1 =
    battle.correctCounts[
      player1.socketId
    ];

  const correct2 =
    battle.correctCounts[
      player2.socketId
    ];

  // ========================================
  // DETERMINE WINNER
  // ========================================

  let winnerId = null;
  let loserId = null;

  let result1 = 'draw';
  let result2 = 'draw';

  if (score1 > score2) {
    winnerId =
      player1.playerId;

    loserId =
      player2.playerId;

    result1 = 'win';
    result2 = 'lose';

  } else if (score2 > score1) {
    winnerId =
      player2.playerId;

    loserId =
      player1.playerId;

    result1 = 'lose';
    result2 = 'win';
  }

  // ========================================
  // XP
  // ========================================

  const xp1 =
    correct1 * XP_PER_CORRECT;

  const xp2 =
    correct2 * XP_PER_CORRECT;

  // ========================================
  // UPDATE DATABASE
  // ========================================

  try {
    const user1 =
      await User.findById(
        player1.playerId
      );

    const user2 =
      await User.findById(
        player2.playerId
      );

    // ======================================
    // UPDATE PLAYER 1
    // ======================================

    if (user1) {
      user1.xp += xp1;

      if (result1 === 'win') {
        user1.wins += 1;

        user1.rating +=
          WIN_RATING;

      } else if (
        result1 === 'lose'
      ) {
        user1.losses += 1;

        user1.rating =
          Math.max(
            0,
            user1.rating +
              LOSS_RATING
          );
      }

      user1.level =
        Math.floor(
          user1.xp / 100
        ) + 1;

      await user1.save();
    }

    // ======================================
    // UPDATE PLAYER 2
    // ======================================

    if (user2) {
      user2.xp += xp2;

      if (result2 === 'win') {
        user2.wins += 1;

        user2.rating +=
          WIN_RATING;

      } else if (
        result2 === 'lose'
      ) {
        user2.losses += 1;

        user2.rating =
          Math.max(
            0,
            user2.rating +
              LOSS_RATING
          );
      }

      user2.level =
        Math.floor(
          user2.xp / 100
        ) + 1;

      await user2.save();
    }

    console.log(
      `🏆 Battle finished: ${
        player1.playerName
      } ${score1} vs ${score2} ${
        player2.playerName
      }`
    );

    // ======================================
    // SAVE BATTLE HISTORY
    // ======================================

    await BattleHistory.create([
      {
        userId:
          player1.playerId,

        opponentId:
          player2.playerId,

        opponentName:
          player2.playerName,

        result:
          result1,

        score:
          score1,

        opponentScore:
          score2,

        correct:
          correct1,

        opponentCorrect:
          correct2,

        xpEarned:
          xp1,

        ratingChange:
          result1 === 'win'
            ? WIN_RATING
            : result1 === 'lose'
            ? LOSS_RATING
            : 0,

        skill:
          battle.skill,

        difficulty:
          battle.difficulty,

        questionCount:
          battle.questions.length,
      },

      {
        userId:
          player2.playerId,

        opponentId:
          player1.playerId,

        opponentName:
          player1.playerName,

        result:
          result2,

        score:
          score2,

        opponentScore:
          score1,

        correct:
          correct2,

        opponentCorrect:
          correct1,

        xpEarned:
          xp2,

        ratingChange:
          result2 === 'win'
            ? WIN_RATING
            : result2 === 'lose'
            ? LOSS_RATING
            : 0,

        skill:
          battle.skill,

        difficulty:
          battle.difficulty,

        questionCount:
          battle.questions.length,
      },
    ]);

    console.log(
      '📜 Battle history saved successfully'
    );

    // ======================================
    // RESULT FOR PLAYER 1
    // ======================================

    io.to(
      player1.socketId
    ).emit(
      'battle_result',
      {
        result:
          result1,

        winnerId,

        loserId,

        player: {
          id:
            player1.playerId,

          name:
            player1.playerName,

          score:
            score1,

          correct:
            correct1,

          xpEarned:
            xp1,

          ratingChange:
            result1 === 'win'
              ? WIN_RATING
              : result1 === 'lose'
              ? LOSS_RATING
              : 0,
        },

        opponent: {
          id:
            player2.playerId,

          name:
            player2.playerName,

          score:
            score2,

          correct:
            correct2,
        },
      }
    );

    // ======================================
    // RESULT FOR PLAYER 2
    // ======================================

    io.to(
      player2.socketId
    ).emit(
      'battle_result',
      {
        result:
          result2,

        winnerId,

        loserId,

        player: {
          id:
            player2.playerId,

          name:
            player2.playerName,

          score:
            score2,

          correct:
            correct2,

          xpEarned:
            xp2,

          ratingChange:
            result2 === 'win'
              ? WIN_RATING
              : result2 === 'lose'
              ? LOSS_RATING
              : 0,
        },

        opponent: {
          id:
            player1.playerId,

          name:
            player1.playerName,

          score:
            score1,

          correct:
            correct1,
        },
      }
    );

  } catch (error) {
    console.error(
      '❌ Failed to update battle results:',
      error
    );

    io.to(roomId).emit(
      'battle_error',
      {
        message:
          'Battle finished, but result update failed.',
      }
    );
  }

  // ========================================
  // KEEP BATTLE FOR A SHORT TIME
  // ========================================

  setTimeout(() => {
    activeBattles.delete(
      roomId
    );
    syncActiveBattleCount();
  }, 30000);
}

// ==========================================
// START SERVER
// ==========================================

const startServer = async () => {
  try {
    await connectDB();

    server.listen(PORT, () => {
      console.log(
        `SkillBattle server running on http://localhost:${PORT}`
      );

      console.log(
        '⚔️ Socket.IO server is ready'
      );
    });

  } catch (error) {
    console.error(
      'Server startup failed:',
      error.message
    );

    process.exit(1);
  }
};

startServer();