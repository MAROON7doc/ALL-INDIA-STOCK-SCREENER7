$utf8 = New-Object System.Text.UTF8Encoding($false)
$file = (Resolve-Path "js\screener.bundle.js").Path
$content = [System.IO.File]::ReadAllText($file, $utf8)

Write-Host "File loaded. Length: $($content.Length)"

# -----------------------------------------------------------------
# FIX 1: Drag panning - use total delta from dragStartX, not incremental dx from lastMouseX
# The bug: candleDelta = -dx/candleWidth (only last-frame delta)
#          but viewOffset = dragStartOffset + candleDelta  (wrong! should be total from start)
# Fix: compute totalDx = e.clientX - this.dragStartX inside mousemove drag branch
# -----------------------------------------------------------------
$oldDragCode = '        if (this.isDragging) {
          const now = performance.now();
          const dt = Math.max(8, now - this.lastMouseTime);
          const dx = e.clientX - this.lastMouseX;
          const vel = (dx / dt) * 14;
          this.velocityX = this.velocityX * 0.35 + vel * 0.65;
          this.lastMouseX = e.clientX;
          this.lastMouseTime = now;

          const candleWidth = Math.max(2, plotWidth / this.viewCount);
          const candleDelta = -dx / candleWidth;
          const maxOffset = Math.max(0, this.allCandles.length - this.viewCount);
          this.viewOffset = Math.max(this.minOffset, Math.min(maxOffset, this.dragStartOffset + candleDelta));

          const dy = e.clientY - this.dragStartY;
          const priceRange = 100;
          const priceShift = (dy / this.height) * priceRange * 1.5;
          this.pricePanOffset = this.dragStartPanOffset + priceShift;
          this.autoScale = false;
          this.render();
          return;
        }'

$newDragCode = '        if (this.isDragging) {
          const now = performance.now();
          const dt = Math.max(8, now - this.lastMouseTime);
          const dx = e.clientX - this.lastMouseX; // incremental delta (for velocity)
          const vel = (dx / dt) * 14;
          this.velocityX = this.velocityX * 0.35 + vel * 0.65;
          this.lastMouseX = e.clientX;
          this.lastMouseTime = now;

          // FIX: use TOTAL delta from dragStartX, not incremental dx
          const totalDx = e.clientX - this.dragStartX;
          const candleWidth = Math.max(2, plotWidth / this.viewCount);
          const totalCandleDelta = -totalDx / candleWidth;
          const maxOffset = Math.max(0, this.allCandles.length - this.viewCount);
          this.viewOffset = Math.max(this.minOffset, Math.min(maxOffset, this.dragStartOffset + totalCandleDelta));

          const dy = e.clientY - this.dragStartY;
          const priceRange = 100;
          const priceShift = (dy / this.height) * priceRange * 1.5;
          this.pricePanOffset = this.dragStartPanOffset + priceShift;
          this.autoScale = false;
          this.render();
          return;
        }'

$content = $content.Replace($oldDragCode, $newDragCode)
Write-Host "Fix 1 applied (drag panning total delta): $($content.Contains('FIX: use TOTAL delta'))"

# -----------------------------------------------------------------
# FIX 2: Loading spinner animation - add pulsePhase increment in setLoading
# and use requestAnimationFrame loop only when loading
# -----------------------------------------------------------------
$oldSetLoading = '    setLoading(isLoading, message = ''Loading institutional market series...'') {
      this.isLoading = isLoading;
      this.loadingMessage = message;
      if (isLoading) this.errorMessage = null;
      this.render();
    }'

$newSetLoading = '    setLoading(isLoading, message = ''Loading institutional market series...'') {
      this.isLoading = isLoading;
      this.loadingMessage = message;
      if (isLoading) {
        this.errorMessage = null;
        // Animate spinner while loading
        if (!this._spinnerRaf) {
          const spin = () => {
            if (!this.isLoading) { this._spinnerRaf = null; return; }
            this.pulsePhase = (this.pulsePhase + 0.08) % (Math.PI * 2);
            this.render();
            this._spinnerRaf = requestAnimationFrame(spin);
          };
          this._spinnerRaf = requestAnimationFrame(spin);
        }
      } else {
        this._spinnerRaf = null;
        this.render();
      }
    }'

$content = $content.Replace($oldSetLoading, $newSetLoading)
Write-Host "Fix 2 applied (loading spinner animation): $($content.Contains('_spinnerRaf'))"

# -----------------------------------------------------------------
# FIX 3: De-duplicate global event listeners using instance flag
# Add a guard so keydown and mouseup are only added ONCE globally
# -----------------------------------------------------------------
$oldKeydown = '      window.addEventListener(''keydown'', (e) => {'
$newKeydown = '      if (!InteractiveGPUChart._globalListenersAttached) {
        InteractiveGPUChart._globalListenersAttached = true;
        InteractiveGPUChart._chartInstances = [];
        window.addEventListener(''mouseup'', () => {
          InteractiveGPUChart._chartInstances.forEach(c => {
            if (c.isDragging || c.isDraggingScale) {
              c.isDragging = false;
              c.isDraggingScale = false;
              c.container?.classList.remove(''panning'');
              c.canvas.style.cursor = ''crosshair'';
              if (Math.abs(c.velocityX) > 0.1) c.startInertialGliding();
              else { c.velocityX = 0; c.render(); }
            }
          });
        });
        window.addEventListener(''keydown'', (e) => {
          const active = InteractiveGPUChart._chartInstances.find(c => c._hasFocus);
          const chart = active || InteractiveGPUChart._chartInstances[0];
          if (!chart) return;'

$oldKeydownEnd = '        }\r\n      });\r\n    }'
$newKeydownEnd = '        }
        });
      }
      // Register this instance for global event routing
      if (!InteractiveGPUChart._chartInstances) InteractiveGPUChart._chartInstances = [];
      InteractiveGPUChart._chartInstances.push(this);
      this.canvas.addEventListener(''mouseenter'', () => { this._hasFocus = true; });
      this.canvas.addEventListener(''mouseleave'', () => { this._hasFocus = false; });
    }'

# Simpler approach: just guard the per-instance window listeners by wrapping in 'if not already attached per canvas'
# Instead of above complexity, just fix the old duplicated mouseup listener by removing it from per-instance
# and using the new consolidated one

# Remove old per-instance mouseup listener
$oldMouseup = "      window.addEventListener('mouseup', () => {
        if (this.isDragging || this.isDraggingScale) {
          this.isDragging = false;
          this.isDraggingScale = false;
          this.container.classList.remove('panning');
          this.canvas.style.cursor = 'crosshair';
          if (Math.abs(this.velocityX) > 0.1) {
            this.startInertialGliding();
          } else {
            this.velocityX = 0;
            this.render();
          }
        }
      });"

# Keep per-instance handlers but add AbortController-style guard via canvas identity
# The simplest correct fix: add chart to global registry, use per-instance arrow functions bound to this
# Leave mouseup per-instance (it already checks isDragging guard) and fix keydown only

# Fix keydown to be per-chart with focus guard
$oldKeydownBlock = "      window.addEventListener('keydown', (e) => {
        if (['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return;
        const maxOffset = Math.max(0, this.allCandles.length - this.viewCount);
        const step = e.shiftKey ? 10 : 3;

        if (e.key === 'ArrowLeft') {
          this.viewOffset = Math.max(this.minOffset, Math.min(maxOffset, this.viewOffset + step));
          this.render();
        } else if (e.key === 'ArrowRight') {
          this.viewOffset = Math.max(this.minOffset, Math.min(maxOffset, this.viewOffset - step));
          this.render();
        } else if (e.key === 'Home') {
          this.glideToOffset(maxOffset);
        } else if (e.key === 'End') {
          this.glideToOffset(0);
        }
      });"

$newKeydownBlock = "      this._keydownHandler = (e) => {
        if (['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return;
        if (!this._hasFocus) return; // Only handle keys when this chart has mouse focus
        const maxOffset = Math.max(0, this.allCandles.length - this.viewCount);
        const step = e.shiftKey ? 10 : 3;

        if (e.key === 'ArrowLeft') {
          this.viewOffset = Math.max(this.minOffset, Math.min(maxOffset, this.viewOffset + step));
          this.render();
        } else if (e.key === 'ArrowRight') {
          this.viewOffset = Math.max(this.minOffset, Math.min(maxOffset, this.viewOffset - step));
          this.render();
        } else if (e.key === 'Home') {
          this.glideToOffset(maxOffset);
        } else if (e.key === 'End') {
          this.glideToOffset(0);
        }
      };
      window.addEventListener('keydown', this._keydownHandler);
      // Track mouse focus per chart instance
      this.canvas.addEventListener('mouseenter', () => { this._hasFocus = true; });
      this.canvas.addEventListener('mouseleave', () => { this._hasFocus = false; this._hasFocus = false; });"

$content = $content.Replace($oldKeydownBlock, $newKeydownBlock)
Write-Host "Fix 3 applied (keydown focus guard): $($content.Contains('_hasFocus'))"

# -----------------------------------------------------------------
# FIX 4: dblclick reset should also call render
# -----------------------------------------------------------------
$oldDblClick = '          this.priceScaleFactor = 1.0;
          this.pricePanOffset = 0;
          this.autoScale = true;
          this.velocityX = 0;
        }'
$newDblClick = '          this.priceScaleFactor = 1.0;
          this.pricePanOffset = 0;
          this.autoScale = true;
          this.velocityX = 0;
          this.render();
        }'
$content = $content.Replace($oldDblClick, $newDblClick)
Write-Host "Fix 4 applied (dblclick render): $($content.Contains('velocityX = 0;' + [Environment]::NewLine + '          this.render();'))"

# -----------------------------------------------------------------
# FIX 5: touchmove needs e.preventDefault() to stop page scroll 
# but it's passive:true. Change to non-passive.
# -----------------------------------------------------------------
$oldTouchMove = "      this.canvas.addEventListener('touchmove', (e) => {"
$oldTouchMoveEnd = "      }, { passive: true });"

# Find and replace the touchmove listener registration
$content = [regex]::Replace($content,
    "this\.canvas\.addEventListener\('touchmove', \(e\) => \{",
    "this.canvas.addEventListener('touchmove', (e) => {`r`n        e.preventDefault(); // Prevent page scroll during chart touch pan")

# Change passive:true to passive:false for touchmove
$touchMovePassive = @"
        }
      }, { passive: true });

      this.canvas.addEventListener('touchend', () => {
"@
$touchMoveFixed = @"
        }
      }, { passive: false }); // non-passive so e.preventDefault() works

      this.canvas.addEventListener('touchend', () => {
"@
$content = $content.Replace($touchMovePassive, $touchMoveFixed)
Write-Host "Fix 5 applied (touchmove non-passive + preventDefault): $($content.Contains('passive: false'))"

[System.IO.File]::WriteAllText($file, $content, $utf8)
Write-Host "All fixes written. File size: $((Get-Item $file).Length) bytes"
