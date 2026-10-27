import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import '../styles.css';
import socket, {
  prepareSocketAuth,
} from '../socket';

function BattleRoom() {
  const location = useLocation();
  const navigate = useNavigate();

  const {
    skill = 'Programming',
    difficulty = 'Medium',
    count = 5,
  } = location.state || {};

  // ==========================================
  // MATCH STATE
  // ==========================================

  const [matchStatus, setMatchStatus] =
    useState('waiting');

  const [roomId, setRoomId] =
    useState(null);

  const [opponent, setOpponent] =
    useState(null);

  // ==========================================
  // QUESTION STATE
  // ==========================================

  const [question, setQuestion] =
    useState(null);

  const [questionIndex, setQuestionIndex] =
    useState(0);

  const [totalQuestions, setTotalQuestions] =
    useState(count);

  const [selectedAnswer, setSelectedAnswer] =
    useState(null);

  const [timeLeft, setTimeLeft] =
    useState(15);

  const [answerSubmitted, setAnswerSubmitted] =
    useState(false);

  const [answerResult, setAnswerResult] =
    useState(null);

  // ==========================================
  // RESULT STATE
  // ==========================================

  const [finished, setFinished] =
    useState(false);

  const [battleResult, setBattleResult] =
    useState(null);

  // ==========================================
  // ERROR
  // ==========================================

  const [error, setError] =
    useState('');

  // ==========================================
  // SOCKET EVENTS
  // ==========================================

  useEffect(() => {
    // ========================================
    // WAITING FOR OPPONENT
    // ========================================

    const handleWaiting = () => {
      console.log(
        '⏳ Waiting for opponent...'
      );

      setMatchStatus('waiting');
    };

    // ========================================
    // MATCH FOUND
    // ========================================

    const handleMatchFound = (data) => {
      console.log(
        '⚔️ Match found:',
        data
      );

      setRoomId(data.roomId);

      setOpponent({
        id: data.opponentId,
        name: data.opponentName,
      });

      setTotalQuestions(
        data.count || count
      );

      setMatchStatus('matched');

      console.log(
        `👤 Opponent: ${data.opponentName}`
      );
    };

    // ========================================
    // NEW BATTLE QUESTION
    // ========================================

    const handleBattleQuestion = (data) => {
      console.log(
        '❓ New battle question:',
        data
      );

      setQuestion(data.question);

      setQuestionIndex(
        data.questionIndex
      );

      setTotalQuestions(
        data.totalQuestions
      );

      setTimeLeft(
        data.timeLimit || 15
      );

      setSelectedAnswer(null);

      setAnswerSubmitted(false);

      setAnswerResult(null);

      setMatchStatus('battle');
    };

    // ========================================
    // ANSWER RESULT
    // ========================================

    const handleAnswerResult = (data) => {
      console.log(
        '📝 Answer result:',
        data
      );

      setAnswerResult(data);

      setAnswerSubmitted(true);
    };

    // ========================================
    // FINAL BATTLE RESULT
    // ========================================

    const handleBattleResult = (data) => {
      console.log(
        '🏆 FINAL BATTLE RESULT:',
        data
      );

      setBattleResult(data);

      setFinished(true);

      setMatchStatus('finished');
    };

    // ========================================
    // BATTLE ERROR
    // ========================================

    const handleBattleError = (data) => {
      console.error(
        '❌ Battle error:',
        data
      );

      setError(
        data?.message ||
          'Something went wrong with the battle.'
      );

      setMatchStatus('error');
    };

    // ========================================
    // OPPONENT DISCONNECTED
    // ========================================

    const handleAccountBanned = (data) => {
      setError(data?.message || 'Your account has been banned.');
      setMatchStatus('error');
    };

    socket.on(
      'account_banned',
      handleAccountBanned
    );

    const handleOpponentDisconnected = (
      data
    ) => {
      console.log(
        '⚠️ Opponent disconnected:',
        data
      );

      setError(
        `${data?.opponentName || 'Your opponent'} disconnected from the battle.`
      );

      setMatchStatus('error');
    };

    // ========================================
    // REGISTER EVENTS
    // ========================================

    socket.on(
      'waiting_for_opponent',
      handleWaiting
    );

    socket.on(
      'match_found',
      handleMatchFound
    );

    socket.on(
      'battle_question',
      handleBattleQuestion
    );

    socket.on(
      'answer_result',
      handleAnswerResult
    );

    socket.on(
      'battle_result',
      handleBattleResult
    );

    socket.on(
      'battle_error',
      handleBattleError
    );

    socket.on(
      'opponent_disconnected',
      handleOpponentDisconnected
    );

    // ========================================
    // SEND MATCH REQUEST
    // ========================================

    const requestMatch = () => {
      console.log(
        '🔎 Sending match request...'
      );

      socket.emit(
        'find_match',
        {
          skill,
          difficulty,
          count,
        }
      );
    };

// ========================================
// CONNECT SOCKET
// ========================================

prepareSocketAuth();

if (socket.connected) {
  requestMatch();
} else {
  socket.once(
    'connect',
    requestMatch
  );

  socket.connect();
}

    // ========================================
    // CLEANUP
    // ========================================

    return () => {
      socket.off(
        'waiting_for_opponent',
        handleWaiting
      );

      socket.off(
        'match_found',
        handleMatchFound
      );

      socket.off(
        'battle_question',
        handleBattleQuestion
      );

      socket.off(
        'answer_result',
        handleAnswerResult
      );

      socket.off(
        'battle_result',
        handleBattleResult
      );

      socket.off(
        'battle_error',
        handleBattleError
      );

      socket.off(
        'opponent_disconnected',
        handleOpponentDisconnected
      );

      socket.off(
        'account_banned',
        handleAccountBanned
      );

      socket.off(
        'connect',
        requestMatch
      );
    };
  }, [skill, difficulty, count]);

  // ==========================================
  // QUESTION TIMER
  // ==========================================

  useEffect(() => {
    if (
      matchStatus !== 'battle' ||
      !question ||
      answerSubmitted
    ) {
      return;
    }

    if (timeLeft <= 0) {
      submitAnswer(null);
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft(
        (previous) =>
          previous - 1
      );
    }, 1000);

    return () => {
      clearInterval(timer);
    };
  }, [
    timeLeft,
    matchStatus,
    question,
    answerSubmitted,
  ]);

  // ==========================================
  // SELECT ANSWER
  // ==========================================

  const handleAnswer = (
    answerIndex
  ) => {
    if (answerSubmitted) {
      return;
    }

    setSelectedAnswer(
      answerIndex
    );
  };

  // ==========================================
  // SUBMIT ANSWER
  // ==========================================

  const submitAnswer = (
    answerIndex = selectedAnswer
  ) => {
    if (
      answerSubmitted ||
      !roomId ||
      !question
    ) {
      return;
    }

    console.log(
      '📤 Sending answer:',
      answerIndex
    );

    setAnswerSubmitted(true);

    socket.emit(
      'submit_answer',
      {
        roomId,

        questionIndex,

        answerIndex:
          answerIndex === null
            ? -1
            : answerIndex,
      }
    );
  };

  // ==========================================
  // BACK TO BATTLE
  // ==========================================

  const goToBattle = () => {
    navigate('/battle');
  };

  // ==========================================
  // WAITING SCREEN
  // ==========================================

  if (
    matchStatus === 'waiting'
  ) {
    return (
      <div className="battle-room-page">
        <div className="battle-loading">
          <div className="loading-icon">
            ⚔️
          </div>

          <h1>
            Finding Opponent...
          </h1>

          <p>
            Waiting for another player
            to join your battle.
          </p>

          <div className="battle-search-info">
            <div>
              <span>
                🎯 Skill
              </span>

              <strong>
                {skill}
              </strong>
            </div>

            <div>
              <span>
                ⚡ Difficulty
              </span>

              <strong>
                {difficulty}
              </strong>
            </div>

            <div>
              <span>
                ❓ Questions
              </span>

              <strong>
                {count}
              </strong>
            </div>
          </div>

          <div className="searching-animation">
            <span></span>
            <span></span>
            <span></span>
          </div>

          <button
            className="back-button"
            onClick={goToBattle}
          >
            ← Cancel Search
          </button>
        </div>
      </div>
    );
  }

  // ==========================================
  // MATCHED SCREEN
  // ==========================================

  if (
    matchStatus === 'matched'
  ) {
    return (
      <div className="battle-room-page">
        <div className="battle-loading">
          <div className="loading-icon">
            ⚔️
          </div>

          <h1>
            Opponent Found!
          </h1>

          <p>
            Get ready for battle.
          </p>

          <div className="battle-search-info">
            <div>
              <span>
                🎯 Skill
              </span>

              <strong>
                {skill}
              </strong>
            </div>

            <div>
              <span>
                ⚡ Difficulty
              </span>

              <strong>
                {difficulty}
              </strong>
            </div>

            <div>
              <span>
                👤 Opponent
              </span>

              <strong>
                {opponent?.name ||
                  'Player'}
              </strong>
            </div>
          </div>

          <div className="searching-animation">
            <span></span>
            <span></span>
            <span></span>
          </div>

          <p>
            Preparing battle...
          </p>
        </div>
      </div>
    );
  }

  // ==========================================
  // ERROR SCREEN
  // ==========================================

  if (
    matchStatus === 'error'
  ) {
    return (
      <div className="battle-room-page">
        <div className="battle-error">
          <div className="error-icon">
            ⚠️
          </div>

          <h1>
            Battle Error
          </h1>

          <p>
            {error ||
              'Something went wrong.'}
          </p>

          <button
            className="battle-button"
            onClick={goToBattle}
          >
            ← Back to Battle
          </button>
        </div>
      </div>
    );
  }

  // ==========================================
  // FINAL RESULT SCREEN
  // ==========================================

  if (
    finished &&
    battleResult
  ) {
    const isWinner =
      battleResult.result ===
      'win';

    const isLoser =
      battleResult.result ===
      'lose';

    const isDraw =
      battleResult.result ===
      'draw';

    const player =
      battleResult.player;

    const opponentData =
      battleResult.opponent;

    return (
      <div className="battle-room-page">
        <div className="battle-result">

          {/* RESULT ICON */}

          <div className="result-icon">
            {isWinner
              ? '🏆'
              : isLoser
              ? '💀'
              : '🤝'}
          </div>

          {/* RESULT TITLE */}

          <h1>
            {isWinner
              ? 'YOU WON!'
              : isLoser
              ? 'YOU LOST'
              : 'DRAW'}
          </h1>

          <p>
            {isWinner
              ? 'Excellent battle! You defeated your opponent.'
              : isLoser
              ? 'Good battle! Keep practicing and come back stronger.'
              : 'Both players finished with the same score.'}
          </p>

          {/* PLAYER VS OPPONENT */}

          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'stretch',
              gap: '15px',
              margin:
                '25px 0',
              flexWrap: 'wrap',
            }}
          >

            {/* YOUR CARD */}

            <div
              style={{
                background:
                  'rgba(124, 58, 237, 0.15)',
                border:
                  '1px solid rgba(124, 58, 237, 0.35)',
                borderRadius:
                  '14px',
                padding:
                  '20px',
                minWidth:
                  '170px',
              }}
            >
              <div
                style={{
                  fontSize:
                    '13px',
                  color:
                    '#aaa9c5',
                  marginBottom:
                    '8px',
                }}
              >
                YOU
              </div>

              <strong
                style={{
                  fontSize:
                    '18px',
                }}
              >
                {player.name}
              </strong>

              <div
                style={{
                  fontSize:
                    '28px',
                  fontWeight:
                    '700',
                  marginTop:
                    '10px',
                }}
              >
                {player.correct}/
                {totalQuestions}
              </div>

              <div
                style={{
                  color:
                    '#aaa9c5',
                  fontSize:
                    '13px',
                }}
              >
                {player.score}{' '}
                points
              </div>
            </div>

            {/* VS */}

            <div
              style={{
                display:
                  'flex',
                alignItems:
                  'center',
                fontWeight:
                  '700',
                color:
                  '#a78bfa',
              }}
            >
              VS
            </div>

            {/* OPPONENT CARD */}

            <div
              style={{
                background:
                  'rgba(255, 255, 255, 0.04)',
                border:
                  '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius:
                  '14px',
                padding:
                  '20px',
                minWidth:
                  '170px',
              }}
            >
              <div
                style={{
                  fontSize:
                    '13px',
                  color:
                    '#aaa9c5',
                  marginBottom:
                    '8px',
                }}
              >
                OPPONENT
              </div>

              <strong
                style={{
                  fontSize:
                    '18px',
                }}
              >
                {opponentData.name}
              </strong>

              <div
                style={{
                  fontSize:
                    '28px',
                  fontWeight:
                    '700',
                  marginTop:
                    '10px',
                }}
              >
                {opponentData.correct}/
                {totalQuestions}
              </div>

              <div
                style={{
                  color:
                    '#aaa9c5',
                  fontSize:
                    '13px',
                }}
              >
                {opponentData.score}{' '}
                points
              </div>
            </div>
          </div>

          {/* RESULT STATS */}

          <div className="result-stats">

            <div className="result-stat">
              <span>
                Your Score
              </span>

              <strong>
                {player.score}{' '}
                pts
              </strong>
            </div>

            <div className="result-stat">
              <span>
                XP Earned
              </span>

              <strong>
                +{player.xpEarned}{' '}
                XP
              </strong>
            </div>

            <div className="result-stat">
              <span>
                Rating
              </span>

              <strong>
                {player.ratingChange >=
                0
                  ? '+'
                  : ''}
                {player.ratingChange}
              </strong>
            </div>

          </div>

          {/* BUTTONS */}

          <button
            className="battle-button"
            onClick={goToBattle}
          >
            ⚔️ Battle Again
          </button>

          <button
            className="back-button"
            onClick={() =>
              navigate(
                '/dashboard'
              )
            }
          >
            ← Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // ==========================================
  // WAITING FOR QUESTION
  // ==========================================

  if (
    !question
  ) {
    return (
      <div className="battle-room-page">
        <div className="battle-loading">
          <div className="loading-icon">
            ⚔️
          </div>

          <h1>
            Preparing Battle...
          </h1>

          <p>
            Waiting for the battle
            to start.
          </p>

          {opponent && (
            <p>
              Opponent:{' '}
              <strong>
                {opponent.name}
              </strong>
            </p>
          )}
        </div>
      </div>
    );
  }

  // ==========================================
  // BATTLE SCREEN
  // ==========================================

  const progress =
    ((questionIndex + 1) /
      totalQuestions) *
    100;

  return (
    <div className="battle-room-page">

      {/* ====================================
          TOP BAR
      ==================================== */}

      <div className="battle-topbar">

        <div>
          <span className="battle-label">
            ⚔️ 1V1 BATTLE
          </span>

          <h2>
            {skill}
          </h2>
        </div>

        <div className="battle-meta">

          <span>
            Question{' '}
            {questionIndex + 1}{' '}
            / {totalQuestions}
          </span>

          <span className="difficulty-badge">
            {difficulty}
          </span>

        </div>
      </div>

      {/* ====================================
          OPPONENT BAR
      ==================================== */}

      <div
        style={{
          display:
            'flex',
          justifyContent:
            'space-between',
          alignItems:
            'center',
          background:
            'rgba(124, 58, 237, 0.12)',
          border:
            '1px solid rgba(124, 58, 237, 0.25)',
          borderRadius:
            '12px',
          padding:
            '12px 18px',
          marginBottom:
            '15px',
        }}
      >

        <span>
          ⚔️ Battling against
        </span>

        <strong>
          {opponent?.name ||
            'Opponent'}
        </strong>

      </div>

      {/* ====================================
          PROGRESS
      ==================================== */}

      <div className="battle-progress">
        <div
          className="battle-progress-bar"
          style={{
            width: `${progress}%`,
          }}
        />
      </div>

      {/* ====================================
          TIMER
      ==================================== */}

      <div
        className={`battle-timer ${
          timeLeft <= 5
            ? 'timer-danger'
            : ''
        }`}
      >
        ⏱️ {timeLeft}s
      </div>

      {/* ====================================
          QUESTION CARD
      ==================================== */}

      <div className="battle-question-card">

        <div className="question-number">
          QUESTION{' '}
          {questionIndex + 1}
        </div>

        <h1>
          {question.questionText}
        </h1>

        {/* OPTIONS */}

        <div className="battle-options">

          {question.options.map(
            (
              option,
              index
            ) => {

              let optionClass =
                'battle-option';

              if (
                selectedAnswer ===
                index
              ) {
                optionClass +=
                  ' selected';
              }

              if (
                answerSubmitted &&
                selectedAnswer ===
                  index
              ) {
                optionClass +=
                  answerResult?.isCorrect
                    ? ' correct'
                    : ' wrong';
              }

              return (
                <button
                  key={index}
                  className={
                    optionClass
                  }
                  onClick={() =>
                    handleAnswer(
                      index
                    )
                  }
                  disabled={
                    answerSubmitted
                  }
                >
                  <span className="option-letter">
                    {String.fromCharCode(
                      65 + index
                    )}
                  </span>

                  <span>
                    {option}
                  </span>
                </button>
              );
            }
          )}

        </div>

        {/* ANSWER FEEDBACK */}

        {answerSubmitted &&
          answerResult && (
            <div
              style={{
                marginTop:
                  '18px',
                padding:
                  '12px',
                borderRadius:
                  '10px',
                textAlign:
                  'center',
                background:
                  answerResult.isCorrect
                    ? 'rgba(34, 197, 94, 0.12)'
                    : 'rgba(239, 68, 68, 0.12)',
              }}
            >
              {answerResult.isCorrect
                ? `✅ Correct! +${answerResult.points} points`
                : '❌ Incorrect'}
            </div>
          )}

        {/* NEXT / SUBMIT */}

        <button
          className="battle-next-button"
          onClick={() =>
            submitAnswer(
              selectedAnswer
            )
          }
          disabled={
            answerSubmitted ||
            selectedAnswer ===
              null
          }
        >
          {answerSubmitted
            ? 'Waiting for opponent...'
            : questionIndex + 1 ===
              totalQuestions
            ? 'Submit Answer 🏆'
            : 'Submit Answer →'}
        </button>

      </div>
    </div>
  );
}

export default BattleRoom;