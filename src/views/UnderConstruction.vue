<template>
  <div class="under-construction-container">
    <!-- Animated Background Elements -->
    <div class="bg-element bg-element-1"></div>
    <div class="bg-element bg-element-2"></div>
    <div class="bg-element bg-element-3"></div>
    
    <!-- Main Content -->
    <div class="content-wrapper">
      <div class="icon-wrapper">
        <i class="el-icon-warning-outline main-icon"></i>
        <div class="tools-wrapper">
          <i class="el-icon-edit-outline tool-icon tool-1"></i>
          <i class="el-icon-setting tool-icon tool-2"></i>
          <i class="el-icon-refresh tool-icon tool-3"></i>
        </div>
      </div>
      
      <h1 class="main-title">Page Under Construction</h1>
      
      <p class="description">
        We're working hard to bring you this feature.<br>
        Please check back soon!
      </p>
      
      <!-- Progress Bar -->
      <div class="progress-container">
        <div class="progress-label">Development Progress</div>
        <div class="progress-bar" ref="progressBar">
          <div class="progress-fill" :style="{ width: progressWidth + '%' }" ref="progressFill"></div>
          <!-- Person/Hand that pushes back -->
          <div class="progress-pusher" :class="{ active: showPusher }" ref="pusher">
            <i class="el-icon-user-solid"></i>
            <div class="push-bubble">failed to allocate funds</div>
          </div>
        </div>
        <div class="progress-text">{{ Math.round(progressWidth) }}% Complete</div>
      </div>
      
      <!-- Action Button -->
      <div class="action-container">
        <el-button type="primary" class="notify-btn" @click="$router.go(-1)">
          <i class="el-icon-back"></i>
          Go Back
        </el-button>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'UnderConstruction',
  data() {
    return {
      progressWidth: 65,
      showPusher: false,
      animationTimeout: null,
      progressInterval: null
    };
  },
  mounted() {
    // Start the progress animation cycle after initial page load
    setTimeout(() => {
      this.startProgressCycle();
    }, 3000);
  },
  beforeDestroy() {
    // Clean up timers
    if (this.animationTimeout) {
      clearTimeout(this.animationTimeout);
    }
    if (this.progressInterval) {
      clearInterval(this.progressInterval);
    }
  },
  methods: {
    startProgressCycle() {
      // Phase 1: Progress moves from 65% to 92%
      this.animateProgress(65, 92, 2000, () => {
        // Phase 2: Show pusher after reaching 92%
        setTimeout(() => {
          this.showPusher = true;
          
          // Phase 3: Pusher pushes progress back to 65%
          setTimeout(() => {
            this.animateProgress(92, 65, 1500, () => {
              // Phase 4: Hide pusher and restart cycle
              setTimeout(() => {
                this.showPusher = false;
                // Restart the cycle after a pause
                this.animationTimeout = setTimeout(() => {
                  this.startProgressCycle();
                }, 4000);
              }, 500);
            });
          }, 1000);
        }, 500);
      });
    },
    
    animateProgress(from, to, duration, callback) {
      const startTime = Date.now();
      const difference = to - from;
      
      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Easing function for smooth animation
        const easeInOutQuad = t => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
        const easedProgress = easeInOutQuad(progress);
        
        this.progressWidth = from + (difference * easedProgress);
        
        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          this.progressWidth = to;
          if (callback) callback();
        }
      };
      
      animate();
    }
  }
};
</script>

<style scoped>
.under-construction-container {
  min-height: 90vh;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%);
  background-size: 400% 400%;
  animation: gradientShift 8s ease infinite;
}

/* Animated Background Elements */
.bg-element {
  position: absolute;
  border-radius: 50%;
  opacity: 0.1;
  animation: float 6s ease-in-out infinite;
}

.bg-element-1 {
  width: 200px;
  height: 200px;
  background: white;
  top: 10%;
  left: 10%;
  animation-delay: 0s;
}

.bg-element-2 {
  width: 150px;
  height: 150px;
  background: white;
  top: 60%;
  right: 15%;
  animation-delay: 2s;
}

.bg-element-3 {
  width: 100px;
  height: 100px;
  background: white;
  bottom: 20%;
  left: 20%;
  animation-delay: 4s;
}

/* Main Content Wrapper */
.content-wrapper {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  border-radius: 24px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
  padding: 60px 40px;
  text-align: center;
  max-width: 520px;
  width: 90%;
  position: relative;
  z-index: 10;
  animation: slideInUp 0.8s ease-out;
}

/* Icon Section */
.icon-wrapper {
  position: relative;
  margin-bottom: 32px;
  display: inline-block;
}

.main-icon {
  font-size: 80px;
  color: #f7ba2a;
  animation: pulse 2s ease-in-out infinite;
  display: block;
}

.tools-wrapper {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 140px;
  height: 140px;
  pointer-events: none;
}

.tool-icon {
  position: absolute;
  font-size: 20px;
  color: #667eea;
  animation: orbit 8s linear infinite;
}

.tool-1 {
  animation-delay: 0s;
}

.tool-2 {
  animation-delay: 2.67s;
}

.tool-3 {
  animation-delay: 5.33s;
}

/* Typography */
.main-title {
  font-size: 2.8rem;
  color: #2d3748;
  margin-bottom: 16px;
  font-weight: 800;
  letter-spacing: -0.5px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  animation: textShine 3s ease-in-out infinite;
}

.description {
  color: #4a5568;
  font-size: 1.2rem;
  line-height: 1.6;
  margin-bottom: 40px;
  opacity: 0;
  animation: fadeInUp 0.8s ease-out 0.3s forwards;
}

/* Progress Section */
.progress-container {
  margin-bottom: 40px;
  opacity: 0;
  animation: fadeInUp 0.8s ease-out 0.6s forwards;
}

.progress-label {
  font-size: 0.9rem;
  color: #718096;
  margin-bottom: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.progress-bar {
  position: relative;
  width: 100%;
  height: 8px;
  background: #e2e8f0;
  border-radius: 4px;
  overflow: visible;
  margin-bottom: 8px;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
  border-radius: 4px;
  transition: width 0.3s ease;
  transform-origin: left;
}

.progress-dots {
  display: flex;
  justify-content: space-between;
  margin-top: 16px;
  padding: 0 4px;
}

.dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #e2e8f0;
  transition: all 0.3s ease;
}

.dot.active {
  background: #667eea;
  animation: dotPulse 1s ease-in-out infinite alternate;
}

.dot.loading {
  background: #f7ba2a;
  animation: dotSpin 1s linear infinite;
}

.progress-text {
  font-size: 0.9rem;
  color: #667eea;
  font-weight: 700;
  margin-top: 8px;
}

/* Progress Pusher */
.progress-pusher {
  position: absolute;
  top: -40px;
  right: 8%;
  transform: translateX(50%);
  opacity: 0;
  transition: all 0.5s ease;
  pointer-events: none;
}

.progress-pusher.active {
  opacity: 1;
  animation: pusherAppear 0.5s ease-out, pusherPush 1.5s ease-in-out 0.5s;
}

.progress-pusher i {
  font-size: 24px;
  color: #e53e3e;
  display: block;
  animation: pusherBounce 0.3s ease-out 0.8s;
}

.push-bubble {
  position: absolute;
  top: -35px;
  left: 50%;
  transform: translateX(-50%);
  background: #fed7d7;
  color: #e53e3e;
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
  opacity: 0;
  animation: bubbleShow 0.8s ease-out 1s forwards;
}

.push-bubble::after {
  content: '';
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  border: 6px solid transparent;
  border-top-color: #fed7d7;
}

/* Action Section */
.action-container {
  opacity: 0;
  animation: fadeInUp 0.8s ease-out 0.9s forwards;
}

.notify-btn {
  padding: 12px 32px;
  font-size: 1rem;
  font-weight: 600;
  border-radius: 50px;
  transition: all 0.3s ease;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  box-shadow: 0 8px 20px rgba(102, 126, 234, 0.3);
}

.notify-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 28px rgba(102, 126, 234, 0.4);
  background: linear-gradient(135deg, #5a67d8 0%, #6b46c1 100%);
}

.notify-btn:active {
  transform: translateY(0);
}

/* Animations */
@keyframes gradientShift {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}

@keyframes float {
  0%, 100% { transform: translateY(0px) rotate(0deg); }
  33% { transform: translateY(-20px) rotate(120deg); }
  66% { transform: translateY(20px) rotate(240deg); }
}

@keyframes slideInUp {
  from {
    opacity: 0;
    transform: translateY(40px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.1); }
}

@keyframes orbit {
  0% {
    transform: rotate(0deg) translateX(60px) rotate(0deg);
  }
  100% {
    transform: rotate(360deg) translateX(60px) rotate(-360deg);
  }
}

@keyframes textShine {
  0%, 100% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes progressFill {
  from { transform: scaleX(0); }
  to { transform: scaleX(1); }
}

@keyframes dotPulse {
  0% { transform: scale(1); }
  100% { transform: scale(1.2); box-shadow: 0 0 10px rgba(102, 126, 234, 0.5); }
}

@keyframes dotSpin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

@keyframes pusherAppear {
  0% {
    opacity: 0;
    transform: translateX(50%) translateY(-10px);
  }
  100% {
    opacity: 1;
    transform: translateX(50%) translateY(0);
  }
}

@keyframes pusherPush {
  0% { transform: translateX(50%) translateY(0); }
  20% { transform: translateX(50%) translateY(-5px); }
  40% { transform: translateX(50%) translateY(2px); }
  60% { transform: translateX(50%) translateY(-2px); }
  80% { transform: translateX(50%) translateY(1px); }
  100% { transform: translateX(50%) translateY(0); }
}

@keyframes pusherBounce {
  0% { transform: scale(1); }
  50% { transform: scale(1.2); }
  100% { transform: scale(1); }
}

@keyframes bubbleShow {
  0% {
    opacity: 0;
    transform: translateX(-50%) scale(0.8);
  }
  100% {
    opacity: 1;
    transform: translateX(-50%) scale(1);
  }
}

/* Responsive Design */
@media (max-width: 768px) {
  .content-wrapper {
    padding: 40px 24px;
    margin: 20px;
  }
  
  .main-title {
    font-size: 2.2rem;
  }
  
  .main-icon {
    font-size: 64px;
  }
  
  .tools-wrapper {
    width: 100px;
    height: 100px;
  }
  
  .tool-icon {
    font-size: 16px;
  }
}

@media (max-width: 480px) {
  .content-wrapper {
    padding: 32px 20px;
  }
  
  .main-title {
    font-size: 1.8rem;
  }
  
  .description {
    font-size: 1rem;
  }
}
</style>
