// Expression types for animated faces
export type ExpressionType =
  | 'neutral'
  | 'excited'
  | 'intense'
  | 'surprised'
  | 'suspicious'
  | 'curious'
  | 'content'
  | 'thoughtful';

// Shared expression state that React components and Canvas renderers can use
export interface ExpressionState {
  leftEyebrowAngle: number;    // -30 to 30 degrees
  rightEyebrowAngle: number;   // -30 to 30 degrees (independent for asymmetric)
  eyebrowOffset: number;       // vertical offset
  eyeSquint: number;           // 1.0 = normal, 0.5 = squinted
  mouthOpen: number;           // 5 = closed, 30 = wide open
  expressionType: ExpressionType;
}

// Default neutral expression
export const defaultExpression: ExpressionState = {
  leftEyebrowAngle: 0,
  rightEyebrowAngle: 0,
  eyebrowOffset: 0,
  eyeSquint: 1.0,
  mouthOpen: 5,
  expressionType: 'neutral',
};

// Factory function to create expression state for a given type and intensity
export function createExpression(type: ExpressionType, intensity: number = 0): ExpressionState {
  switch (type) {
    case 'neutral':
      return { ...defaultExpression };

    case 'excited':
      return {
        leftEyebrowAngle: 15,
        rightEyebrowAngle: 15,
        eyebrowOffset: -4,
        eyeSquint: 1.0,
        mouthOpen: 5 + intensity * 20,
        expressionType: 'excited',
      };

    case 'intense':
      return {
        leftEyebrowAngle: -25 * intensity,
        rightEyebrowAngle: -25 * intensity,
        eyebrowOffset: 6 * intensity,
        eyeSquint: 1.0 - intensity * 0.5,
        mouthOpen: 5 + intensity * 25,
        expressionType: 'intense',
      };

    case 'surprised':
      return {
        leftEyebrowAngle: 20,
        rightEyebrowAngle: 5,
        eyebrowOffset: -6,
        eyeSquint: 1.1,
        mouthOpen: 15 + intensity * 10,
        expressionType: 'surprised',
      };

    case 'suspicious':
      return {
        leftEyebrowAngle: 15,
        rightEyebrowAngle: -10,
        eyebrowOffset: 0,
        eyeSquint: 0.85,
        mouthOpen: 5,
        expressionType: 'suspicious',
      };

    case 'curious':
      return {
        leftEyebrowAngle: 10,
        rightEyebrowAngle: 10,
        eyebrowOffset: -3,
        eyeSquint: 1.0,
        mouthOpen: 5,
        expressionType: 'curious',
      };

    case 'content':
      return {
        leftEyebrowAngle: 5,
        rightEyebrowAngle: 5,
        eyebrowOffset: 0,
        eyeSquint: 0.95,
        mouthOpen: 5,
        expressionType: 'content',
      };

    case 'thoughtful':
      return {
        leftEyebrowAngle: -8,
        rightEyebrowAngle: -8,
        eyebrowOffset: 2,
        eyeSquint: 0.9,
        mouthOpen: 5,
        expressionType: 'thoughtful',
      };

    default:
      return { ...defaultExpression };
  }
}

// Interpolate between two states for smooth transitions
export function lerpExpression(
  a: ExpressionState,
  b: ExpressionState,
  t: number
): ExpressionState {
  return {
    leftEyebrowAngle: a.leftEyebrowAngle + (b.leftEyebrowAngle - a.leftEyebrowAngle) * t,
    rightEyebrowAngle: a.rightEyebrowAngle + (b.rightEyebrowAngle - a.rightEyebrowAngle) * t,
    eyebrowOffset: a.eyebrowOffset + (b.eyebrowOffset - a.eyebrowOffset) * t,
    eyeSquint: a.eyeSquint + (b.eyeSquint - a.eyeSquint) * t,
    mouthOpen: a.mouthOpen + (b.mouthOpen - a.mouthOpen) * t,
    expressionType: t < 0.5 ? a.expressionType : b.expressionType,
  };
}

// Expression manager class for handling talking expressions, linger, and idle cycling
export class ExpressionManager {
  private currentState: ExpressionState = { ...defaultExpression };
  private lastTalkingTime: number | null = null;
  private lingerDuration: number = 0;
  private idleIntervalId: number | null = null;
  private currentIdleState: ExpressionState = { ...defaultExpression };
  private targetIdleState: ExpressionState = { ...defaultExpression };
  private idleTransitionProgress: number = 1.0;
  private lastTalkingExpression: ExpressionType = 'neutral';
  private listeners: ((state: ExpressionState) => void)[] = [];

  private readonly idleExpressions: ExpressionType[] = [
    'neutral', 'curious', 'suspicious', 'content', 'thoughtful'
  ];

  private readonly talkingExpressions: { threshold: number; types: ExpressionType[] }[] = [
    { threshold: 0.7, types: ['intense', 'excited'] },
    { threshold: 0.4, types: ['surprised', 'excited'] },
    { threshold: 0.0, types: ['neutral'] },
  ];

  subscribe(listener: (state: ExpressionState) => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notify() {
    this.listeners.forEach(l => l(this.currentState));
  }

  getCurrentState(): ExpressionState {
    return { ...this.currentState };
  }

  // Update expression based on amplitude and speaking state
  update(amplitude: number, isSpeaking: boolean) {
    if (isSpeaking && amplitude > 0.05) {
      // Talking - pick expression based on amplitude
      const type = this.talkingExpression(amplitude);
      this.currentState = createExpression(type, amplitude);
      this.lastTalkingTime = Date.now();
      this.lingerDuration = Math.random() * 1000; // 0-1 second in ms
      this.lastTalkingExpression = type;
      this.stopIdleCycle();
    } else if (this.lastTalkingTime !== null) {
      // Check linger period
      if (Date.now() - this.lastTalkingTime >= this.lingerDuration) {
        this.lastTalkingTime = null;
        this.startIdleCycle();
      }
      // Keep current expression during linger
    } else {
      // Idle - interpolate between expressions
      this.updateIdleTransition();
    }
    this.notify();
  }

  // Get expression state for a given amplitude (used for recording)
  expressionStateFor(amplitude: number, isSpeaking: boolean): ExpressionState {
    if (isSpeaking && amplitude > 0.05) {
      const type = this.talkingExpression(amplitude);
      return createExpression(type, amplitude);
    }
    return { ...this.currentState };
  }

  private talkingExpression(amplitude: number): ExpressionType {
    for (const { threshold, types } of this.talkingExpressions) {
      if (amplitude > threshold) {
        // 30% chance to pick a different expression than last time
        if (types.includes(this.lastTalkingExpression) && Math.random() < 0.3 && types.length > 1) {
          const otherTypes = types.filter(t => t !== this.lastTalkingExpression);
          return otherTypes[Math.floor(Math.random() * otherTypes.length)];
        }
        return types[Math.floor(Math.random() * types.length)];
      }
    }
    return 'neutral';
  }

  private startIdleCycle() {
    if (this.idleIntervalId !== null) return;
    this.pickNewIdleTarget();
    this.idleIntervalId = window.setInterval(() => {
      this.pickNewIdleTarget();
    }, 2000 + Math.random() * 2000); // 2-4 seconds
  }

  private stopIdleCycle() {
    if (this.idleIntervalId !== null) {
      clearInterval(this.idleIntervalId);
      this.idleIntervalId = null;
    }
    this.idleTransitionProgress = 1.0;
  }

  private pickNewIdleTarget() {
    this.currentIdleState = { ...this.targetIdleState };
    const newType = this.idleExpressions[Math.floor(Math.random() * this.idleExpressions.length)];
    this.targetIdleState = createExpression(newType);
    this.idleTransitionProgress = 0;
  }

  private updateIdleTransition() {
    this.idleTransitionProgress = Math.min(1.0, this.idleTransitionProgress + 0.02);
    this.currentState = lerpExpression(
      this.currentIdleState,
      this.targetIdleState,
      this.idleTransitionProgress
    );
  }

  destroy() {
    this.stopIdleCycle();
  }
}
