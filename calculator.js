(() => {
      const display = document.getElementById('display');
      const expression = document.getElementById('expression');
      const keypad = document.getElementById('keypad');
      const resonanceKey = document.getElementById('resonance-key');
      const holoStage = document.querySelector('.holo-stage');
      const status = document.querySelector('.status');
      const orbitAudio = document.getElementById('orbit-audio');
      const audioStatus = document.getElementById('audio-status');

      let currentValue = '0';
      let operands = [];
      let operators = [];
      let replaceCurrent = false;
      let expressionText = 'MATH MODE · READY';
      let pulseTimer;

      const operatorSymbols = {
        '+': '+',
        '-': '−',
        '*': '×',
        '/': '÷'
      };

      function updateDisplay() {
        display.textContent = currentValue;
        display.classList.toggle('is-long', currentValue.length > 11);
        expression.textContent = expressionText;
      }

      function formatNumber(value) {
        if (!Number.isFinite(value)) return null;
        const rounded = Number(value.toPrecision(12));
        return String(Object.is(rounded, -0) ? 0 : rounded);
      }

      function pendingExpression() {
        return operands
          .map((value, index) => `${formatNumber(value)} ${operatorSymbols[operators[index]]}`)
          .join(' ');
      }

      function showError(message) {
        currentValue = 'Error';
        operands = [];
        operators = [];
        replaceCurrent = true;
        expressionText = message;
        updateDisplay();
      }

      function inputDigit(digit) {
        if (currentValue === 'Error' || replaceCurrent) {
          currentValue = digit;
          replaceCurrent = false;
        } else if (currentValue.replace('-', '').replace('.', '').length < 15) {
          currentValue = currentValue === '0' ? digit : currentValue + digit;
        }
        expressionText = pendingExpression() || 'MATH MODE · READY';
        updateDisplay();
      }

      function inputDecimal() {
        if (currentValue === 'Error' || replaceCurrent) {
          currentValue = '0.';
          replaceCurrent = false;
        } else if (!currentValue.includes('.')) {
          currentValue += '.';
        }
        expressionText = pendingExpression() || 'MATH MODE · READY';
        updateDisplay();
      }

      function inputConstant(value) {
        const formatted = formatNumber(value);
        if (formatted === null) {
          showError('NUMBER OUT OF RANGE');
          return;
        }
        currentValue = formatted;
        replaceCurrent = false;
        expressionText = pendingExpression() || 'MATH MODE · READY';
        updateDisplay();
      }

      function triggerPulse() {
        window.clearTimeout(pulseTimer);
        holoStage.classList.remove('resonating');
        void holoStage.offsetWidth;
        holoStage.classList.add('resonating');
        status.textContent = 'HOLO PULSE / ACTIVE';
        pulseTimer = window.setTimeout(() => {
          holoStage.classList.remove('resonating');
          status.textContent = 'Synth interface / ready';
        }, 1100);
      }

      function clearAll() {
        currentValue = '0';
        operands = [];
        operators = [];
        replaceCurrent = false;
        expressionText = 'MATH MODE · READY';
        updateDisplay();
      }

      function deleteDigit() {
        if (currentValue === 'Error') {
          clearAll();
          return;
        }
        if (replaceCurrent) {
          currentValue = '0';
          replaceCurrent = false;
        } else if (currentValue.length > 1) {
          currentValue = currentValue.slice(0, -1);
          if (currentValue === '-') currentValue = '0';
        } else {
          currentValue = '0';
        }
        updateDisplay();
      }

      function applyUnary(action) {
        if (currentValue === 'Error') return;
        const value = Number(currentValue);
        const result = action === 'sign' ? -value : value / 100;
        const formatted = formatNumber(result);
        if (formatted === null) {
          showError('NUMBER OUT OF RANGE');
          return;
        }
        currentValue = formatted;
        replaceCurrent = false;
        updateDisplay();
      }

      function calculate(left, right, operator) {
        switch (operator) {
          case '+': return left + right;
          case '-': return left - right;
          case '*': return left * right;
          case '/': return right === 0 ? null : left / right;
          default: return right;
        }
      }

      function chooseOperator(nextOperator) {
        if (currentValue === 'Error') return;
        if (replaceCurrent && operators.length > 0) {
          operators[operators.length - 1] = nextOperator;
        } else {
          operands.push(Number(currentValue));
          operators.push(nextOperator);
        }

        replaceCurrent = true;
        expressionText = pendingExpression();
        updateDisplay();
      }

      function solve() {
        if (operators.length === 0 || currentValue === 'Error') return;

        const formula = `${pendingExpression()} ${currentValue} =`;
        const values = operands.concat(Number(currentValue));
        const remainingOperators = operators.slice();

        for (let index = 0; index < remainingOperators.length;) {
          const operator = remainingOperators[index];
          if (operator !== '*' && operator !== '/') {
            index += 1;
            continue;
          }

          const result = calculate(values[index], values[index + 1], operator);
          if (result === null) {
            showError('CANNOT DIVIDE BY ZERO');
            return;
          }
          const formatted = formatNumber(result);
          if (formatted === null) {
            showError('NUMBER OUT OF RANGE');
            return;
          }
          values.splice(index, 2, Number(formatted));
          remainingOperators.splice(index, 1);
        }

        let result = values[0];
        for (let index = 0; index < remainingOperators.length; index += 1) {
          result = calculate(result, values[index + 1], remainingOperators[index]);
          const formatted = formatNumber(result);
          if (formatted === null) {
            showError('NUMBER OUT OF RANGE');
            return;
          }
          result = Number(formatted);
        }

        expressionText = formula;
        currentValue = formatNumber(result);
        operands = [];
        operators = [];
        replaceCurrent = true;
        updateDisplay();
      }

      function handleAction(action) {
        if (action === 'clear') clearAll();
        if (action === 'delete') deleteDigit();
        if (action === 'decimal') inputDecimal();
        if (action === 'equals') solve();
        if (action === 'sign' || action === 'percent') applyUnary(action);
        if (action === 'pi') inputConstant(Math.PI);
        if (action === 'pulse') triggerPulse();
      }

      resonanceKey.addEventListener('click', () => handleAction('pulse'));

      orbitAudio.addEventListener('play', () => {
        holoStage.classList.add('is-playing');
        audioStatus.classList.add('is-playing');
        audioStatus.textContent = 'NOW PLAYING · HOLO ORBIT ACTIVE';
      });

      orbitAudio.addEventListener('pause', () => {
        holoStage.classList.remove('is-playing');
        audioStatus.classList.remove('is-playing');
        audioStatus.textContent = orbitAudio.ended ? 'TRACK COMPLETE' : 'PLAYBACK PAUSED';
      });

      orbitAudio.addEventListener('error', () => {
        holoStage.classList.remove('is-playing');
        audioStatus.classList.remove('is-playing');
        audioStatus.textContent = 'AUDIO FILE COULD NOT BE LOADED';
      });

      orbitAudio.addEventListener('ended', () => {
        holoStage.classList.remove('is-playing');
        audioStatus.classList.remove('is-playing');
        audioStatus.textContent = 'TRACK COMPLETE';
      });

      function attemptAudioPlayback() {
        const autoplayAttempt = orbitAudio.play();
        if (autoplayAttempt) {
          autoplayAttempt.catch((error) => {
            if (error.name === 'NotAllowedError') {
              audioStatus.textContent = 'AUTOPLAY BLOCKED · INTERACT TO START';
              document.addEventListener('pointerdown', retryAudioPlayback, { once: true });
              document.addEventListener('keydown', retryAudioPlayback, { once: true });
            } else {
              audioStatus.textContent = 'AUDIO COULD NOT START';
              console.error('Audio playback failed:', error);
            }
          });
        }
      }

      function retryAudioPlayback() {
        document.removeEventListener('pointerdown', retryAudioPlayback);
        document.removeEventListener('keydown', retryAudioPlayback);
        attemptAudioPlayback();
      }

      keypad.addEventListener('click', (event) => {
        const button = event.target.closest('button');
        if (!button) return;

        if (button.dataset.digit !== undefined) {
          inputDigit(button.dataset.digit);
        } else if (button.dataset.operator) {
          chooseOperator(button.dataset.operator);
        } else {
          handleAction(button.dataset.action);
        }
      });

      document.addEventListener('keydown', (event) => {
        if (event.ctrlKey || event.metaKey || event.altKey) return;

        if (/^\d$/.test(event.key)) {
          inputDigit(event.key);
        } else if (event.key === '.') {
          inputDecimal();
        } else if (['+', '-', '*', '/'].includes(event.key)) {
          chooseOperator(event.key);
        } else if (event.key === 'Enter' || event.key === '=') {
          solve();
        } else if (event.key === 'Backspace') {
          deleteDigit();
        } else if (event.key === 'Escape') {
          clearAll();
        } else if (event.key === '%') {
          applyUnary('percent');
        } else if (event.key.toLowerCase() === 'p') {
          inputConstant(Math.PI);
        } else {
          return;
        }
        event.preventDefault();
      });

      updateDisplay();
      attemptAudioPlayback();
    })();
